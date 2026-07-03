// Shared types used across the app shell and every sport module.
// Sport-specific models live in src/sports/<sport>/types.ts.

// A single live match as shown in the match picker. Deliberately sport-agnostic:
// `series` carries the competition/tournament, `matchType` the format or round.
export interface LiveMatch {
  id: string;
  description: string;
  teams: string;
  status: string;
  series: string;
  matchType: string;
  url?: string;   // canonical match page, opened via the "o" hotkey
  group?: string; // optional section header for the match list (e.g. tennis draw type)
}

export interface Config {
  pollIntervalSeconds: number;
  preferredTeams: string[];
  /** Set false to skip the launch splash screen. */
  showSplash: boolean;
}
