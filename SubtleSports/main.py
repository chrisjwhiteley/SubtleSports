import os
from Cricket.cricketLauncher import cricket_launcher

def printLogo():
    print("   _____       __    __  __        _____                  __")
    print("  / ___/__  __/ /_  / /_/ /__     / ___/____  ____  _____/ /______")
    print("  \__ \/ / / / __ \/ __/ / _ \    \__ \/ __ \/ __ \/ ___/ __/ ___/")
    print(" ___/ / /_/ / /_/ / /_/ /  __/   ___/ / /_/ / /_/ / /  / /_(__  )")
    print("/____/\__,_/_.___/\__/_/\___/   /____/ .___/\____/_/   \__/____/")
    print("                                    /_/                               ")

if __name__ == "__main__":

    menuOption = ''
    messageToDisplay = ''

    while menuOption.upper() not in ('E', 'EXIT'):
        os.system('cls')
        printLogo()
        print("The following sports are currently available")
        print("1. Cricket")
        print("2. Football")
        print("3. Tennis")
        print("")
        print("E. Exit")

        if messageToDisplay != '':
            print(messageToDisplay)
        errorMessage = ''


        menuOption = input("Select a sport: ")

        if menuOption == "1":
            cricket_launcher()
        elif menuOption == "2":
            messageToDisplay = "TODO: Add Football Module"
        elif menuOption == "3":
            messageToDisplay = "TODO: Add Tennis Module"
        elif menuOption.upper() in ('E', 'EXIT'):
            print("Exiting...")
        else:
            messageToDisplay = 'Invalid option. Try again.'