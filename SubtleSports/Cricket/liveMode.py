from pycricbuzz import Cricbuzz
import os
import threading
import time
import json
import tabulate
import pandas as pd

class StreamScore(threading.Thread):
    def __init__(self, cricbuzz, matchID):
        threading.Thread.__init__(self)
        self.event = threading.Event()
        self.c = cricbuzz
        self.matchID = matchID
        self.lastActive = time.time()
        self.inactivityThreshold = 10
    def run(self):
        while not self.event.is_set():
            # TODO: Cache the output so that we only clear the screen if something has changed. This helps avoid flickering.
            # TODO: Try/catch, gracefully exit.
            # Clear the screen
            os.system('cls')
            # Get updated match info
            matchInfo = self.c.matchinfo(self.matchID)
            lscore = self.c.livescore(self.matchID)

            print(matchInfo['srs'] + ' - ' + matchInfo['mnum'])

            if matchInfo['mchstate'] in ['inprogress','stumps']:
                # Print the live score
                battingTeam = lscore['batting']
                # print(battingTeam['score'])
                print(battingTeam['team'] + ' ' + battingTeam['score'][0]['runs'] + '-' + battingTeam['score'][0][
                    'wickets'] + ' from ' + battingTeam['score'][0]['overs'] + ' overs')
                print(matchInfo['status'])
            else:
                print(matchInfo['status'])
            print(input_text())

            # If no user input has been received in longer then refresh, otherwise let them continue.
            while int(time.time() - self.lastActive) < self.inactivityThreshold:
                self.event.wait(1)
            self.resetLastActive()
    def stop(self):
        self.event.set()
    def resetLastActive(self):
        self.lastActive = time.time()

def input_text():
    return "Enter an option (or help): "

def match_selector(c):
    matches = c.matches()
    os.system('cls')
    print("The following series are currently available to view:")

    series = []
    for match in matches:
        if not match['srs'] in series:
            series.append(match['srs'])

    for position, item in enumerate(series):
        print (str(position + 1) + '. ' + item)

    selectedSeriesNum = input("Select a series to view matches: ")
    matchesInSeries = [x for x in matches if x['srs'] == series[int(selectedSeriesNum) - 1]]
    if len(matchesInSeries) == 1:
        return matchesInSeries[0]['id']
    else:
        os.system('cls')
        print("The following matches are currently available to view:")
        for position, item in enumerate(matchesInSeries):
            print(str(position + 1) + '. ' + item['team1']['name'] + ' vs ' + item['team2']['name'])
        selectedMatchID = input("Select a match: ")
        return matchesInSeries[int(selectedMatchID) - 1]['id']


def printScoreCard(c,matchID):
    try:
        scorecard = c.scorecard(matchID)
        for innings in scorecard['scorecard']:
            inningstext = {
                1: "1st",
                2: "2nd"
            }
            headerText = (innings['batteam'] + " - " + inningstext.get(int(innings['inng_num'])) + " innings")
            print("-" * (len(headerText) + 4))
            print("| " + headerText + " |")
            print("-" * (len(headerText) + 4))
            batcard = innings['batcard']
            batcardDF = pd.DataFrame(batcard)

            batcardDF['strike rate'] = pd.to_numeric(batcardDF.runs) / pd.to_numeric(batcardDF.balls) * 100
            print(tabulate.tabulate(batcardDF, headers='keys', showindex=False, floatfmt='.2f'))
            print("")
    except:
        print("Unable to fetch scorecard for this match.")


def printHelpMenu():
    print("Cricket LiveScore help")
    print("----------------------")
    print("The following options are available:")
    print("s  / scorecard      show the current scorecard in full")
    print("b  / batsmen        show the current batsman with statistics")
    # print("w  / worm           show the worm graphic")
    print("r  / runs           show the ball by ball scores from the past 5 overs")
    print("fw / fallwicket     show the fall of each wicket")
    print(" ")
    print("e  / exit           exit the cricket feature and go back to the main menu")
    # TODO: Add 'launch BBC cricket' option

def printBatsmen(c, matchID):
    try:
        lscore = c.livescore(matchID)['batting']['batsman']
        test = c.livescore(matchID)
        lscoreDF = pd.DataFrame(lscore)
        lscoreDF['strike rate'] = pd.to_numeric(lscoreDF.runs) / pd.to_numeric(lscoreDF.balls) * 100
        print(tabulate.tabulate(lscoreDF, headers='keys', showindex=False, floatfmt='.2f'))
    except:
        print("Unable to show current batsmen for this match")


def printRuns(c, matchID):
    print("To do...")
    # TODO: Print last 5 overs, ball by ball. Not sure this is possible using the current library.


def printFallWicket(c, matchID):
    try:
        scard = c.scorecard(matchID)
        header = scard['scorecard'][0]['fall_wickets'][0].keys()
        rows = [x.values() for x in scard['scorecard'][0]['fall_wickets']]
        print(tabulate.tabulate(rows, header))
    except:
        print("Unable to show fall of wickets for this match")


def cricketLiveMode():
    os.system('cls')
    print("Loading available matches...")
    c = Cricbuzz()
    selectedMatchID = match_selector(c)

    ss = StreamScore(c, selectedMatchID)
    ss.start()
    command = ''
    while command not in ['e', 'exit']:
        command = input()
        if command.upper() in ['H', 'HELP']:
            ss.resetLastActive()
            printHelpMenu()
        elif command.upper() in ['S', 'SCORECARD']:
            ss.resetLastActive()
            printScoreCard(c, selectedMatchID)
        elif command.upper() in ['B', 'BATSMEN']:
            ss.resetLastActive()
            printBatsmen(c, selectedMatchID)
        # elif command.upper() in ['W', 'WORM']:
        #     ss.resetLastActive()
        #     # TODO: Add worm graphic
        elif command.upper() in ['R', 'RUNS']:
            ss.resetLastActive()
            printRuns(c, selectedMatchID)
        elif command.upper() in ['FW', 'FALLWICKET']:
            ss.resetLastActive()
            printFallWicket(c, selectedMatchID)
        elif command.upper() in ['E', 'EXIT']:
            ss.stop() # Stop the score streamer
            return
        else:
            ss.resetLastActive()
            print("Not a valid option.")
            print(input_text())