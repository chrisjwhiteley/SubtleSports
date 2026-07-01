import React from 'react';
import { LiveMatch, Config } from '../types';

// A pluggable sport. Each module owns its own data source and the entire match
// experience below the shared match list. The app shell only knows about this
// interface plus the sport-agnostic LiveMatch / Config types.
export interface SportModule {
  id: string;           // stable key, e.g. 'cricket' | 'tennis'
  label: string;        // shown in the sport picker
  description: string;  // one-line blurb in the sport picker

  // Live matches for the picker. Ordering is preserved by the shell, so a sport
  // may return its most important matches (e.g. Grand Slams) first.
  fetchLiveMatches(): Promise<LiveMatch[]>;

  // Fully owns the selected match: live polling, stream view, any detail views.
  MatchView: React.ComponentType<{ match: LiveMatch; config: Config; onExit: () => void }>;
}
