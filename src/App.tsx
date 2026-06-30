import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { AppView, DetailView, LiveMatch, MatchState, Config, ScorecardInnings, MatchInfo } from './types';
import { fetchLiveMatches, fetchMatchState, fetchScorecard } from './api/cricinfo';
import Layout from './components/Layout';
import MatchList from './components/MatchList';
import StreamView from './components/StreamView';
import Scorecard from './components/detail/Scorecard';
import BallByBall from './components/detail/BallByBall';
import Partnership from './components/detail/Partnership';

interface Props {
  config: Config;
}

export default function App({ config }: Props) {
  const { exit } = useApp();

  const [view, setView] = useState<AppView>('matchlist');
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<LiveMatch | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  // Track view in a ref so the polling closure can read the latest value
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) exit();
    // Esc on stream → back to match picker
    if (key.escape && viewRef.current === 'stream') {
      setSelectedMatch(null);
      setMatchState(null);
      setView('matchlist');
    }
  });

  useEffect(() => {
    fetchLiveMatches()
      .then(setMatches)
      .catch(e => setMatchesError(String(e)))
      .finally(() => setMatchesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedMatch) return;

    let cancelled = false;

    async function poll() {
      if (cancelled || !selectedMatch) return;
      try {
        const state = await fetchMatchState(selectedMatch.id);
        if (cancelled) return;
        // Preserve scorecard data fetched separately
        setMatchState(prev => ({
          ...state,
          scorecardInnings: prev?.scorecardInnings ?? null,
          matchInfo: prev?.matchInfo ?? null,
        }));
        setPollError(null);
        // If viewing the scorecard, silently refresh it in the background
        if (viewRef.current === 'scorecard') {
          fetchScorecard(selectedMatch.id)
            .then(({ innings: sc, info: mi }) => {
              if (!cancelled) {
                setMatchState(prev => prev ? { ...prev, scorecardInnings: sc, matchInfo: mi } : prev);
              }
            })
            .catch(() => {}); // silent — stale scorecard data remains on failure
        }
      } catch (e) {
        if (!cancelled) setPollError(String(e));
      }
    }

    poll();
    const interval = global.setInterval(poll, config.pollIntervalSeconds * 1000);
    return () => { cancelled = true; global.clearInterval(interval); };
  }, [selectedMatch, config.pollIntervalSeconds]);

  if (view === 'matchlist') {
    return (
      <Layout footer="↑↓ navigate  enter select  q quit">
        <MatchList
          matches={matches}
          config={config}
          onSelect={match => { setSelectedMatch(match); setView('stream'); }}
          error={matchesError}
          loading={matchesLoading}
        />
      </Layout>
    );
  }

  if (!matchState) {
    return (
      <Layout footer="q quit">
        <Text dimColor>loading match data...</Text>
      </Layout>
    );
  }

  function handleScorecardLoaded(sc: ScorecardInnings[], mi: MatchInfo) {
    setMatchState(prev => prev ? { ...prev, scorecardInnings: sc, matchInfo: mi } : prev);
  }

  const detailFooter = 'esc back  q quit';

  if (view === 'stream') {
    return (
      <Layout footer="s scorecard  b ball-by-ball  p partnership  esc match list  q quit">
        <Box flexDirection="column">
          {pollError && <Text dimColor>poll error: {pollError}</Text>}
          <StreamView
            state={matchState}
            config={config}
            onDetail={v => setView(v)}
          />
        </Box>
      </Layout>
    );
  }

  if (view === 'scorecard') return (
    <Layout footer="←→ innings  ↑↓ scroll  esc back  q quit">
      <Scorecard state={matchState} onBack={() => setView('stream')} onScorecardLoaded={handleScorecardLoaded} />
    </Layout>
  );
  if (view === 'ballbyball') return <Layout footer="↑↓ scroll  esc back  q quit"><BallByBall state={matchState} onBack={() => setView('stream')} /></Layout>;
  if (view === 'partnership') return <Layout footer={detailFooter}><Partnership state={matchState} onBack={() => setView('stream')} /></Layout>;

  return null;
}
