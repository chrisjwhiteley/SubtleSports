from pycricbuzz import Cricbuzz
import os
import threading
import time
import json
import tabulate
def input_text():
    return "Enter an option (or help): "
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
            if matchInfo['mchstate'] == 'inprogress':
                # Print the live score
                battingTeam = lscore['batting']
                # print(battingTeam['score'])
                print(battingTeam['team'] + ' ' + battingTeam['score'][0]['runs'] + '-' + battingTeam['score'][0][
                    'wickets'] + ' from ' + battingTeam['score'][0]['overs'] + ' overs')
            # Print match status - this is valid regardless of whether match in progress or not.
            print(matchInfo['status'])
            # print the input text prompt.
            print(input_text())
            # If no user input has been received in longer then refresh, otherwise let them continue.
            # This avoids overwriting recently retrieved scorecards etc
            while int(time.time() - self.lastActive) < self.inactivityThreshold:
                self.event.wait(1)
            self.resetLastActive()
    def stop(self):
        self.event.set()
    def resetLastActive(self):
        self.lastActive = time.time()
def match_selector(c):
    matches = c.matches()
    os.system('cls')
    print("The following series are currently available to view:")
    series = list()
    for match in matches:
        if not match['srs'] in series:
            series.append(match['srs'])
    counter = 1
    for srs in series:
        print(str(counter) + '. ' + srs)
        counter += 1
    selectedSeriesNum = input("Select a series to view matches: ")
    selectedSeries = series[int(selectedSeriesNum) - 1]
    os.system('cls')
    print("The following matches are currently available to view:")
    for match in matches:
        if match['srs'] == selectedSeries:
            print(match['id'] + '. ' + match['team1']['name'] + ' vs ' + match['team2']['name'])
    _selectedMatchID = input("Select a match: ")
    return _selectedMatchID
def printScoreCard(c,matchID):
    # Get latest scorecard
    scorecard = c.scorecard(matchID)
    # Output scorecard
    # print(scorecard)
    print(json.dumps(scorecard, indent=4))
    # TODO: Format scorecard nicely.
def printHelpMenu():
    print("Cricket LiveScore help")
    print("----------------------")
    print("The following options are available:")
    print("s  / scorecard      show the current scorecard in full")
    print("b  / batsmen        show the current batsman with statistics")
    print("w  / worm           show the worm graphic")
    print("r  / runs           show the ball by ball scores from the past 5 overs")
    print("fw / fallwicket     show the fall of each wicket")
    print(" ")
    print("e  / exit           exit the cricket feature and go back to the main menu")
    # TODO: Add 'launch BBC cricket' option
def printWormGraphic(c, matchID):
    print("To do...")
    # TODO: Add worm graphic generator. How do we get over by over score?
def printBatsmen(c, matchID):
    lscore = c.livescore(matchID)
    header = lscore['batting']['batsman'][0].keys()
    rows = [x.values() for x in lscore['batting']['batsman']]
    print(tabulate.tabulate(rows, header))
def printRuns(c, matchID):
    print("To do...")
    # TODO: Print last 5 overs, ball by ball. Not sure this is possible using the current library.
def printFallWicket(c, matchID):
    #minfo = c.matchinfo(c,matchID)
    scard = c.scorecard(matchID)
    header = scard['scorecard'][0]['fall_wickets'][0].keys()
    rows = [x.values() for x in scard['scorecard'][0]['fall_wickets']]
    print(tabulate.tabulate(rows, header))

def cricketLiveMode():
    os.system('cls')
    print("Loading available matches...")
    c = Cricbuzz()
    selectedMatchID = match_selector(c)
    # matchInfo = c.matchinfo(selectedMatchID)
    # print(json.dumps(matchInfo, indent=4, sort_keys=True))
    comm = c.commentary(selectedMatchID)
    print(json.dumps(comm, indent=4, sort_keys=True))
    print("")
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
        elif command.upper() in ['W', 'WORM']:
            ss.resetLastActive()
            printWormGraphic(c, selectedMatchID)
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

def cricket_launcher():
    os.system('cls')
    selection = ""

    while selection.upper() not in ("E", "EXIT"):
        print("CRICKET")
        print("-------")
        print("")
        print("1. Live Scores")
        print("2. Recent Results")
        print("E. Exit")
        print("")
        selection = input("Select an option: ")

        if selection.upper() == "1":
            cricketLiveMode()
