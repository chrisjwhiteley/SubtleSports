import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { LiveMatch, Config } from '../../types';
import { DetailView, ScorecardInnings, MatchInfo } from './types';
import { fetchMatchState, fetchScorecard } from './api';
import { useMatchPolling } from '../../hooks/useMatchPolling';
import Layout from '../../components/Layout';
import StreamView from './components/StreamView';
import Scorecard from './components/detail/Scorecard';
import BallByBall from './components/detail/BallByBall';
import Partnership from './components/detail/Partnership';

interface Props {
  match: LiveMatch;
  config: Config;
  onExit: () => void;
}

type View = 'stream' | DetailView;

// Owns the full cricket match experience below the match list: live polling,
// the stream view, and the scorecard / ball-by-ball / partnership detail views.
export default function CricketMatchView({ match, config, onExit }: Props) {
  const [view, setView] = useState<View>('stream');
  // Scorecard is fetched separately (lazily by the Scorecard view, then refreshed
  // in the background) so we keep it beside the polled live state.
  const [scorecard, setScorecard] = useState<{ innings: ScorecardInnings[]; info: MatchInfo } | null>(null);

  const { state: rawState, error: pollError } = useMatchPolling(
    () => fetchMatchState(match.id),
    config.pollIntervalSeconds,
  );

  // Merge the separately-fetched scorecard into the live state for rendering.
  const state = rawState
    ? { ...rawState, scorecardInnings: scorecard?.innings ?? null, matchInfo: scorecard?.info ?? null }
    : null;

  // While the scorecard is on screen, silently refresh it whenever a poll lands.
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => {
    if (viewRef.current !== 'scorecard' || scorecard === null) return;
    let cancelled = false;
    fetchScorecard(match.id)
      .then(({ innings, info }) => { if (!cancelled) setScorecard({ innings, info }); })
      .catch(() => {}); // silent — stale scorecard data remains on failure
    return () => { cancelled = true; };
  }, [rawState?.lastUpdated]);

  // Esc from the stream returns to the match list; detail views handle their own Esc.
  useInput((_, key) => {
    if (key.escape && view === 'stream') onExit();
  });

  if (!state) {
    return (
      <Layout footer="esc match list  q quit">
        <Text dimColor>loading match data...</Text>
      </Layout>
    );
  }

  if (view === 'stream') {
    return (
      <Layout footer="s scorecard  b ball-by-ball  p partnership  esc match list  q quit">
        <Box flexDirection="column">
          {pollError && <Text dimColor>poll error: {pollError}</Text>}
          <StreamView state={state} config={config} onDetail={v => setView(v)} />
        </Box>
      </Layout>
    );
  }

  if (view === 'scorecard') return (
    <Layout footer="←→ innings  ↑↓ scroll  esc back  q quit">
      <Scorecard
        state={state}
        onBack={() => setView('stream')}
        onScorecardLoaded={(innings, info) => setScorecard({ innings, info })}
      />
    </Layout>
  );
  if (view === 'ballbyball') return (
    <Layout footer="↑↓ scroll  esc back  q quit">
      <BallByBall state={state} onBack={() => setView('stream')} />
    </Layout>
  );
  if (view === 'partnership') return (
    <Layout footer="esc back  q quit">
      <Partnership state={state} onBack={() => setView('stream')} />
    </Layout>
  );

  return null;
}
