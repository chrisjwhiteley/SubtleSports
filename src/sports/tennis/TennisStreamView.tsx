import React from 'react';
import { Box, Text } from 'ink';
import { TennisMatchState, TennisPlayer } from './types';

interface Props {
  state: TennisMatchState;
}

const NAME_W = 24;

function nameLabel(p: TennisPlayer): string {
  return p.seed ? `${p.name} (${p.seed})` : p.name;
}

function PlayerRow({ p }: { p: TennisPlayer }) {
  return (
    <Box>
      <Text>{p.isServing ? '● ' : '  '}</Text>
      <Text bold={p.isWinner}>{nameLabel(p).padEnd(NAME_W)}</Text>
      {p.sets.map((s, i) => (
        <Text key={i} bold={s.won}>{String(s.games).padStart(2)} </Text>
      ))}
      {p.currentGameScore !== '' && <Text color="yellow">{'  '}{p.currentGameScore}</Text>}
    </Box>
  );
}

export default function TennisStreamView({ state }: Props) {
  const { tournament, round, status, summary, players } = state;
  const header = [tournament, round].filter(Boolean).join('  ·  ');

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        {header !== '' && <Text>{header}</Text>}
        {status !== '' && <Text dimColor>{status}</Text>}
      </Box>

      <Box flexDirection="column">
        <PlayerRow p={players[0]} />
        <PlayerRow p={players[1]} />
      </Box>

      {summary !== '' && <Text dimColor>{summary}</Text>}
    </Box>
  );
}
