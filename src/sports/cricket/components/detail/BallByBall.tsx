import React, { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { MatchState } from '../../types';

interface Props {
  state: MatchState;
  onBack: () => void;
}

const PAGE_SIZE = 15;

export default function BallByBall({ state, onBack }: Props) {
  const [offset, setOffset] = useState(0);
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;

  const balls = state.ballByBall;
  const page = balls.slice(offset, offset + PAGE_SIZE);

  useInput((_, key) => {
    if (key.escape) { onBack(); return; }
    if (key.downArrow) setOffset(o => Math.min(o + 1, Math.max(0, balls.length - PAGE_SIZE)));
    if (key.upArrow) setOffset(o => Math.max(0, o - 1));
  });

  function label(b: typeof balls[0]): string {
    if (b.isWicket) return 'W';
    if (b.isSix) return '6';
    if (b.isFour) return '4';
    if (b.runs === 0) return '.';
    return String(b.runs);
  }

  // Wrap description text to terminal width, accounting for the prefix
  function wrapText(text: string, prefixLen: number): string[] {
    const maxWidth = termWidth - prefixLen;
    if (!text || maxWidth <= 0) return [text ?? ''];
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if (current.length === 0) {
        current = word;
      } else if (current.length + 1 + word.length <= maxWidth) {
        current += ' ' + word;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [''];
  }

  return (
    <Box flexDirection="column">
      <Text dimColor>ball by ball</Text>
      <Box marginTop={1} flexDirection="column">
        {page.map((b, i) => {
          const prefix = `${String(b.over).padStart(2)}.${b.ball}  [${label(b)}]  `;
          const descLines = wrapText(b.description, prefix.length);
          return (
            <Box key={i} flexDirection="column" marginBottom={1}>
              <Text bold={b.isWicket}>
                {prefix}{descLines[0]}
              </Text>
              {descLines.slice(1).map((line, j) => (
                <Text key={j} bold={b.isWicket}>
                  {' '.repeat(prefix.length)}{line}
                </Text>
              ))}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
