import React from 'react';
import { Box, Text, useInput } from 'ink';
import { MatchState } from '../../types';

interface Props {
  state: MatchState;
  onBack: () => void;
}

export default function Partnership({ state, onBack }: Props) {
  useInput((_, key) => { if (key.escape) onBack(); });

  const p = state.partnership;

  return (
    <Box flexDirection="column">
      <Text dimColor>partnership</Text>
      <Box marginTop={1} flexDirection="column">
        {!p && <Text dimColor>no partnership data</Text>}
        {p && (
          <>
            <Text>current stand: {p.runs} runs off {p.balls} balls</Text>
            <Box marginTop={1} flexDirection="column">
              <Text>  {p.batsman1.padEnd(24)} {p.batsman1Runs} runs</Text>
              <Text>  {p.batsman2.padEnd(24)} {p.batsman2Runs} runs</Text>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
