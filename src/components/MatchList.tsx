import React, { useState, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { LiveMatch, Config } from '../types';
import { openUrl } from '../util/openUrl';

interface Props {
  matches: LiveMatch[];
  config: Config;
  onSelect: (match: LiveMatch) => void;
  error: string | null;
  loading: boolean;
}

// Each rendered match occupies 3 text lines + 1 blank margin.
const ITEM_ROWS = 4;

export default function MatchList({ matches, config, onSelect, error, loading }: Props) {
  const [cursor, setCursor] = useState(0);
  const offsetRef = useRef(0);
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;

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
    if (input === 'o' && sorted.length > 0) openUrl(sorted[cursor]?.url ?? '');
  });

  if (loading) return <Text>fetching live matches...</Text>;
  if (error) return <Text>error: {error}</Text>;
  if (sorted.length === 0) return <Text>no live matches found</Text>;

  const clampedCursor = Math.min(cursor, sorted.length - 1);

  // Window the list so it fits the terminal, keeping the cursor in view.
  // Reserve 2 rows for the header and 2 for the Layout footer.
  const visibleCount = Math.max(1, Math.floor((rows - 4) / ITEM_ROWS));
  const maxOffset = Math.max(0, sorted.length - visibleCount);
  let offset = offsetRef.current;
  if (clampedCursor < offset) offset = clampedCursor;
  if (clampedCursor >= offset + visibleCount) offset = clampedCursor - visibleCount + 1;
  offset = Math.max(0, Math.min(offset, maxOffset));
  offsetRef.current = offset;

  const visible = sorted.slice(offset, offset + visibleCount);
  const counter = sorted.length > visibleCount
    ? `  (${offset + 1}-${offset + visible.length} of ${sorted.length})`
    : '';

  return (
    <Box flexDirection="column">
      <Text dimColor>select a match{counter}</Text>
      <Box marginTop={1} flexDirection="column">
        {visible.map((m, i) => {
          const idx = offset + i;
          return (
            <Box key={m.id} flexDirection="column" marginBottom={1}>
              <Text inverse={idx === clampedCursor}>
                {idx === clampedCursor ? '> ' : '  '}
                {m.teams}
              </Text>
              <Text dimColor>  {m.matchType}  {m.series}</Text>
              <Text dimColor>  {m.status}</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
