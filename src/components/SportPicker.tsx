import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { SportModule } from '../sports';

interface Props {
  sports: SportModule[];
  onSelect: (sport: SportModule) => void;
}

// First screen on every launch. Reuses the cursor/highlight pattern from MatchList.
export default function SportPicker({ sports, onSelect }: Props) {
  const [cursor, setCursor] = useState(0);

  useInput((_, key) => {
    if (key.upArrow) setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(sports.length - 1, c + 1));
    if (key.return && sports.length > 0) onSelect(sports[cursor]!);
  });

  return (
    <Box flexDirection="column">
      <Text dimColor>pick a sport</Text>
      <Box marginTop={1} flexDirection="column">
        {sports.map((s, i) => (
          <Box key={s.id} flexDirection="column" marginBottom={1}>
            <Text inverse={i === cursor}>
              {i === cursor ? '> ' : '  '}
              {s.label}
            </Text>
            <Text dimColor>  {s.description}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
