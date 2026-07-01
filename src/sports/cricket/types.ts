// Cricket-specific data models. Previously in src/types.ts; moved here as part
// of modularising the app into per-sport modules.

export interface Batsman {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  onStrike: boolean;
  dismissal: string;   // e.g. "c †Smith b Stokes" or "not out"
  didBat: boolean;
}

export interface Bowler {
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface FallOfWicket {
  wicketNum: number;
  runs: number;
  overs: number;
  batsmanName: string;
}

export interface ScorecardInnings {
  inningNumber: number;
  teamName: string;
  runs: number;
  wickets: number;
  overs: number;
  declared: boolean;
  allOut: boolean;
  extras: number;
  batsmen: Batsman[];
  bowlers: Bowler[];
  fallOfWickets: FallOfWicket[];
}

export interface MatchInfo {
  ground: string;
  series: string;
  matchTitle: string;
  matchType: string;
}

export interface InningsSummary {
  teamName: string;
  score: number;
  wickets: number;
  overs: number;
  declared: boolean;
  allOut: boolean;
}

export interface BallEvent {
  over: number;
  ball: number;
  description: string;
  runs: number;
  isWicket: boolean;
  isFour: boolean;
  isSix: boolean;
}

export interface Partnership {
  runs: number;
  balls: number;
  batsman1: string;
  batsman1Runs: number;
  batsman2: string;
  batsman2Runs: number;
}

export interface MatchState {
  matchId: string;
  teams: string;
  status: string;
  matchType: string;
  currentInnings: number;
  innings: InningsSummary[];
  currentScore: InningsSummary | null;
  batsmen: Batsman[];
  bowler: Bowler | null;
  lastBall: BallEvent | null;
  currentOverBalls: BallEvent[];
  recentBalls: BallEvent[];
  partnership: Partnership | null;
  ballByBall: BallEvent[];
  ground: string;          // venue name
  session: string;         // e.g. "Day 2 - Session 3", empty when not applicable
  lead: number;            // negative = batting team trailing, positive = leading
  target: number;          // runs needed to win (0 if not chasing)
  remainingBalls: number;  // 0 in Test matches
  requiredRunRate: number | null;
  lastUpdated: Date;
  // Full scorecard — fetched separately, null until loaded
  scorecardInnings: ScorecardInnings[] | null;
  matchInfo: MatchInfo | null;
}

export type DetailView = 'scorecard' | 'ballbyball' | 'partnership';
