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

// Each match renders as 3 text lines + 1 blank separator.
const MATCH_LINES = 4;

export default function MatchList({ matches, config, onSelect, error, loading }: Props) {
  const [cursor, setCursor] = useState(0);
  const offsetRef = useRef(0);
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;

  // Preferred teams float to the top (existing behaviour).
  const prioritised = [...matches].sort((a, b) => {
    const aP = config.preferredTeams.some(t => a.teams.toLowerCase().includes(t.toLowerCase()));
    const bP = config.preferredTeams.some(t => b.teams.toLowerCase().includes(t.toLowerCase()));
    if (aP && !bP) return -1;
    if (!aP && bP) return 1;
    return 0;
  });

  // Cluster into sections by `group` (draw type) when present, preserving the
  // first-appearance order of groups. Sports without groups render a flat list.
  const grouped = prioritised.some(m => m.group);
  const order: string[] = [];
  const byGroup = new Map<string, LiveMatch[]>();
  for (const m of prioritised) {
    const g = grouped ? (m.group ?? 'Other') : '';
    if (!byGroup.has(g)) { byGroup.set(g, []); order.push(g); }
    byGroup.get(g)!.push(m);
  }
  const flat: LiveMatch[] = order.flatMap(g => byGroup.get(g)!);

  useInput((input, key) => {
    if (key.upArrow) setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(flat.length - 1, c + 1));
    if (key.return && flat.length > 0) onSelect(flat[cursor]!);
    if (input === 'o' && flat.length > 0) openUrl(flat[cursor]?.url ?? '');
  });

  if (loading) return <Text>fetching live matches...</Text>;
  if (error) return <Text>error: {error}</Text>;
  if (flat.length === 0) return <Text>no live matches found</Text>;

  const clampedCursor = Math.min(cursor, flat.length - 1);

  // Build the list as one element per terminal line, tagging the first line of
  // each match with its match index so the cursor can track it through scroll.
  type Line = { key: string; el: React.ReactNode; matchIndex?: number };
  const lines: Line[] = [];
  let mi = 0;
  order.forEach((g, gi) => {
    if (grouped) {
      if (gi > 0) lines.push({ key: `gap-${gi}`, el: <Text> </Text> });
      lines.push({ key: `hdr-${gi}`, el: <Text bold>{g}</Text> });
    }
    for (const m of byGroup.get(g)!) {
      const idx = mi++;
      const selected = idx === clampedCursor;
      lines.push({
        key: `${m.id}-teams`,
        matchIndex: idx,
        el: <Text inverse={selected}>{selected ? '> ' : '  '}{m.teams}</Text>,
      });
      lines.push({ key: `${m.id}-meta`, el: <Text dimColor>  {[m.matchType, m.series].filter(Boolean).join('  ')}</Text> });
      lines.push({ key: `${m.id}-status`, el: <Text dimColor>  {m.status}</Text> });
      lines.push({ key: `${m.id}-sep`, el: <Text> </Text> });
    }
  });

  // Window the lines to fit the terminal, keeping the selected match's whole
  // block visible. Reserve 1 row for the title and 2 for the Layout footer.
  const contentHeight = Math.max(MATCH_LINES, rows - 3);
  const selStart = lines.findIndex(l => l.matchIndex === clampedCursor);
  const selEnd = selStart + MATCH_LINES - 1;
  let offset = offsetRef.current;
  if (selStart < offset) offset = selStart;
  if (selEnd >= offset + contentHeight) offset = selEnd - contentHeight + 1;
  offset = Math.max(0, Math.min(offset, Math.max(0, lines.length - contentHeight)));
  offsetRef.current = offset;
  const visible = lines.slice(offset, offset + contentHeight);

  return (
    <Box flexDirection="column">
      <Text dimColor>select a match  ({clampedCursor + 1}/{flat.length})</Text>
      <Box flexDirection="column">
        {visible.map(l => <Box key={l.key}>{l.el}</Box>)}
      </Box>
    </Box>
  );
}
