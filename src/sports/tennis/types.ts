// Tennis-specific data models for the live-scores MVP.

export interface TennisPlayer {
  name: string;
  seed?: string;             // e.g. "3" or "#1"; undefined when unseeded/unknown
  sets: number[];            // games won in each set so far, e.g. [6, 4, 2]
  currentGameScore: string;  // in-progress game points, e.g. "40", "AD"; "" if unknown
  isServing: boolean;
  setsWon: number;
  isWinner: boolean;
}

export interface TennisMatchState {
  matchId: string;
  tournament: string;
  round: string;
  status: string;   // e.g. "In Progress", "Final", "3rd Set"
  players: [TennisPlayer, TennisPlayer];
  lastUpdated: Date;
}
