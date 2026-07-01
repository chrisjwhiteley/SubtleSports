import React from 'react';
import { Box, Text, useInput } from 'ink';
import { LiveMatch, Config } from '../../types';
import { fetchMatchState } from './api';
import { useMatchPolling } from '../../hooks/useMatchPolling';
import Layout from '../../components/Layout';
import TennisStreamView from './TennisStreamView';

interface Props {
  match: LiveMatch;
  config: Config;
  onExit: () => void;
}

// Tennis match experience (live-scores MVP): poll the scoreboard and render the
// live set/game stream. No detail views yet.
export default function TennisMatchView({ match, config, onExit }: Props) {
  const { state, error } = useMatchPolling(
    () => fetchMatchState(match.id),
    config.pollIntervalSeconds,
  );

  useInput((_, key) => {
    if (key.escape) onExit();
  });

  if (!state) {
    return (
      <Layout footer="esc match list  q quit">
        <Text dimColor>loading match data...</Text>
      </Layout>
    );
  }

  return (
    <Layout footer="esc match list  q quit">
      <Box flexDirection="column">
        {error && <Text dimColor>poll error: {error}</Text>}
        <TennisStreamView state={state} />
      </Box>
    </Layout>
  );
}
