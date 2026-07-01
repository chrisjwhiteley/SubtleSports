import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { LiveMatch, Config } from '../types';

interface Props {
  matches: LiveMatch[];
  config: Config;
  onSelect: (match: LiveMatch) => void;
  error: string | null;
  loading: boolean;
}

export default function MatchList({ matches, config, onSelect, error, loading }: Props) {
  const [cursor, setCursor] = useState(0);

  const sorted = [...matches].sort((a, b) => {
    const aP = config.preferredTeams.some(t => a.teams.toLowerCase().includes(t.toLowerCase()));
    const bP = config.preferredTeams.some(t => b.teams.toLowerCase().includes(t.toLowerCase()));
    if (aP && !bP) return -1;
    if (!aP && bP) return 1;
    return 0;
  });

  useInput((input, key) => {
    if (key.upArrow) setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(sorted.length - 1, c + 1));
    if (key.return && sorted.length > 0) onSelect(sorted[cursor]!);
  });

  if (loading) return <Text>fetching live matches...</Text>;
  if (error) return <Text>error: {error}</Text>;
  if (sorted.length === 0) return <Text>no live matches found</Text>;

  return (
    <Box flexDirection="column">
      <Text dimColor>select a match</Text>
      <Box marginTop={1} flexDirection="column">
        {sorted.map((m, i) => (
          <Box key={m.id} flexDirection="column" marginBottom={1}>
            <Text inverse={i === cursor}>
              {i === cursor ? '> ' : '  '}
              {m.teams}
            </Text>
            <Text dimColor>  {m.matchType}  {m.series}</Text>
            <Text dimColor>  {m.status}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
