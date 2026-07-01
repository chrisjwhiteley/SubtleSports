// Tennis-specific data models for the live-scores MVP.

export interface SetScore {
  games: number;  // games won in this set
  won: boolean;   // true if this player won the set (ESPN linescore `winner`)
}

export interface TennisPlayer {
  name: string;
  seed?: string;             // e.g. "3" or "#1"; undefined when unseeded/unknown
  sets: SetScore[];          // games per set so far, e.g. [{6,won},{4},{2}]
  currentGameScore: string;  // in-progress game points, e.g. "40"; "" when unavailable
  isServing: boolean;
  setsWon: number;
  isWinner: boolean;
}

export interface TennisMatchState {
  matchId: string;
  tournament: string;
  round: string;    // e.g. "Round 2"
  status: string;   // e.g. "In Progress", "2nd Set"
  players: [TennisPlayer, TennisPlayer];
  lastUpdated: Date;
}
