import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { MatchState, ScorecardInnings, MatchInfo } from '../../types';
import { fetchScorecard } from '../../api';

interface Props {
  state: MatchState;
  onBack: () => void;
  onScorecardLoaded: (innings: ScorecardInnings[], info: MatchInfo) => void;
}

function ordinal(n: number): string {
  return ['1st', '2nd', '3rd', '4th'][n - 1] ?? `${n}th`;
}

// Build tab label: "England 1st" only when a team bats more than once (Test matches).
// For ODI/T20 each team bats once so just show the team name.
function tabLabel(inn: ScorecardInnings, allInnings: ScorecardInnings[]): string {
  const teamInnings = allInnings.filter(i => i.teamName === inn.teamName);
  if (teamInnings.length <= 1) return inn.teamName;
  const teamOrdinal = teamInnings.findIndex(i => i.inningNumber === inn.inningNumber) + 1;
  return `${inn.teamName} ${ordinal(teamOrdinal)}`;
}

export default function Scorecard({ state, onBack, onScorecardLoaded }: Props) {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;
  const termHeight = stdout?.rows ?? 24;

  const [tab, setTab] = useState(state.currentInnings);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [loading, setLoading] = useState(state.scorecardInnings === null);
  const [error, setError] = useState<string | null>(null);

  const innings = state.scorecardInnings;
  const info = state.matchInfo;

  // Reset scroll when tab changes
  useEffect(() => { setScrollOffset(0); }, [tab]);

  useEffect(() => {
    if (innings !== null) return;
    fetchScorecard(state.matchId)
      .then(({ innings: sc, info: mi }) => {
        onScorecardLoaded(sc, mi);
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [state.matchId]);

  useInput((_, key) => {
    if (key.escape) { onBack(); return; }
    if (key.leftArrow && innings) { setTab(t => Math.max(0, t - 1)); return; }
    if (key.rightArrow && innings) { setTab(t => Math.min((innings.length - 1), t + 1)); return; }
    if (key.upArrow) setScrollOffset(o => Math.max(0, o - 1));
    if (key.downArrow) setScrollOffset(o => o + 1);
  });

  if (loading) return <Text dimColor>loading scorecard...</Text>;
  if (error) return <Text dimColor>error: {error}</Text>;
  if (!innings || innings.length === 0) return <Text dimColor>no scorecard data</Text>;

  const inn = innings[Math.min(tab, innings.length - 1)]!;
  const suffix = inn.declared ? 'd' : inn.allOut ? '' : '*';
  const scoreStr = `${inn.runs}/${inn.wickets}${suffix}  (${inn.overs} ov)`;

  const nameW = Math.min(24, Math.floor(termWidth * 0.3));

  // Build all content lines as an array of JSX elements
  type Line = { key: string; el: React.ReactNode };
  const lines: Line[] = [];

  // Match info header (always rendered, not scrollable — 2 lines)
  lines.push({ key: 'score', el: <Text>{inn.teamName}  {scoreStr}</Text> });
  if (info) {
    lines.push({
      key: 'info',
      el: <Text dimColor>{[info.matchTitle, info.matchType, info.series, info.ground].filter(Boolean).join('  ·  ')}</Text>,
    });
  }

  // Batting
  lines.push({ key: 'bat-hdr', el: <Box marginTop={1}><Text dimColor>batting</Text></Box> });
  for (const [i, b] of inn.batsmen.filter(b => b.didBat).entries()) {
    const statsLine = `${b.name}  ${b.runs} (${b.balls}b  ${b.fours}x4  ${b.sixes}x6  sr ${b.strikeRate.toFixed(1)})`;
    lines.push({
      key: `bat-${i}`,
      el: (
        <Box flexDirection="column">
          <Text bold={b.onStrike} wrap="wrap">{statsLine}</Text>
          <Text dimColor wrap="wrap">  {b.dismissal}</Text>
        </Box>
      ),
    });
  }
  if (inn.batsmen.some(b => !b.didBat)) {
    const names = inn.batsmen.filter(b => !b.didBat).map(b => b.name).join(', ');
    lines.push({ key: 'dnb', el: <Text dimColor>did not bat: {names}</Text> });
  }
  if (inn.extras > 0) {
    lines.push({ key: 'extras', el: <Text dimColor>{'extras'.padEnd(nameW)}{'   '}{inn.extras}</Text> });
  }
  // Total
  lines.push({
    key: 'total',
    el: <Text>{'total'.padEnd(nameW)}{'   '}{inn.runs}/{inn.wickets}{inn.declared ? 'd' : ''}</Text>,
  });

  // Bowling
  lines.push({ key: 'bowl-hdr', el: <Box marginTop={1}><Text dimColor>bowling</Text></Box> });
  for (const [i, b] of inn.bowlers.entries()) {
    lines.push({
      key: `bowl-${i}`,
      el: (
        <Text>
          {b.name.padEnd(nameW)}{String(b.overs).padStart(5)}  {b.maidens}m  {b.runs}r  {b.wickets}w  econ {b.economy.toFixed(2)}
        </Text>
      ),
    });
  }

  // Fall of wickets
  if (inn.fallOfWickets.length > 0) {
    lines.push({ key: 'fow-hdr', el: <Box marginTop={1}><Text dimColor>fall of wickets</Text></Box> });
    lines.push({
      key: 'fow',
      el: (
        <Text>
          {inn.fallOfWickets.map(f => `${f.wicketNum}-${f.runs} (${f.batsmanName}, ${f.overs} ov)`).join('  ')}
        </Text>
      ),
    });
  }

  // Fixed rows: tab bar (1) + blank gap (1) = 2; footer handled by Layout (2)
  const fixedRows = 2;
  const contentHeight = termHeight - fixedRows - 2; // 2 for Layout footer
  const maxOffset = Math.max(0, lines.length - contentHeight);
  const clampedOffset = Math.min(scrollOffset, maxOffset);
  const visibleLines = lines.slice(clampedOffset, clampedOffset + contentHeight);

  return (
    <Box flexDirection="column">
      {/* Tab bar — fixed, not scrollable */}
      <Box gap={2}>
        {innings.map((inn, i) => (
          <Text key={i} bold={i === tab} dimColor={i !== tab}>
            {i === tab ? `[${tabLabel(inn, innings)}]` : tabLabel(inn, innings)}
          </Text>
        ))}
      </Box>

      {/* Scrollable content */}
      <Box flexDirection="column">
        {visibleLines.map(line => (
          <Box key={line.key}>{line.el}</Box>
        ))}
      </Box>
    </Box>
  );
}
