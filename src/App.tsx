import React, { useState, useEffect } from 'react';
import { useApp, useInput } from 'ink';
import { LiveMatch, Config } from './types';
import { SPORTS, SportModule } from './sports';
import Layout from './components/Layout';
import Splash from './components/Splash';
import SportPicker from './components/SportPicker';
import MatchList from './components/MatchList';

interface Props {
  config: Config;
}

export default function App({ config }: Props) {
  const { exit } = useApp();

  const [showSplash, setShowSplash] = useState(config.showSplash);
  const [sport, setSport] = useState<SportModule | null>(null);
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<LiveMatch | null>(null);

  // Global quit works from any screen.
  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) exit();
    // Esc on the match list → back to the sport picker.
    if (key.escape && sport && !selectedMatch) {
      setSport(null);
      setMatches([]);
      setMatchesError(null);
    }
  });

  // Load the chosen sport's live matches.
  useEffect(() => {
    if (!sport) return;
    let cancelled = false;
    setMatchesLoading(true);
    setMatchesError(null);
    setMatches([]);
    sport.fetchLiveMatches()
      .then(m => { if (!cancelled) setMatches(m); })
      .catch(e => { if (!cancelled) setMatchesError(String(e)); })
      .finally(() => { if (!cancelled) setMatchesLoading(false); });
    return () => { cancelled = true; };
  }, [sport]);

  if (showSplash) {
    return <Splash onDone={() => setShowSplash(false)} />;
  }

  if (!sport) {
    return (
      <Layout footer="↑↓ navigate  enter select  q quit">
        <SportPicker sports={SPORTS} onSelect={setSport} />
      </Layout>
    );
  }

  if (!selectedMatch) {
    return (
      <Layout footer="↑↓ navigate  enter select  o open in browser  esc sports  q quit">
        <MatchList
          matches={matches}
          config={config}
          onSelect={setSelectedMatch}
          error={matchesError}
          loading={matchesLoading}
        />
      </Layout>
    );
  }

  const MatchView = sport.MatchView;
  return (
    <MatchView
      key={selectedMatch.id}
      match={selectedMatch}
      config={config}
      onExit={() => setSelectedMatch(null)}
    />
  );
}
