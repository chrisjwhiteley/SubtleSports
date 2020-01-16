import os
from Cricket.liveMode import cricketLiveMode



def cricket_launcher():
    selection = ""
    while selection.upper() not in ("E", "EXIT"):
        os.system('cls')
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
