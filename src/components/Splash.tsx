import React, { useMemo, useState, useEffect } from 'react';
import { Box, Text, useStdout } from 'ink';

// "SUBTLE" / "SPORTS" in the figlet "ANSI Shadow" font.
const GLYPHS: Record<string, string[]> = {
  S: ['███████╗', '██╔════╝', '███████╗', '╚════██║', '███████║', '╚══════╝'],
  U: ['██╗   ██╗', '██║   ██║', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  B: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██████╔╝', '╚═════╝ '],
  T: ['████████╗', '╚══██╔══╝', '   ██║   ', '   ██║   ', '   ██║   ', '   ╚═╝   '],
  L: ['██╗     ', '██║     ', '██║     ', '██║     ', '███████╗', '╚══════╝'],
  E: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '███████╗', '╚══════╝'],
  P: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔═══╝ ', '██║     ', '╚═╝     '],
  O: [' ██████╗ ', '██╔═══██╗', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  R: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██║  ██║', '╚═╝  ╚═╝'],
};
function word(w: string): string[] {
  const rows = Array(6).fill('');
  for (const ch of w) GLYPHS[ch]!.forEach((g, i) => (rows[i] += g));
  return rows;
}
const ART = [...word('SUBTLE'), '', ...word('SPORTS')];

// The wordmark's footprint. Below this the art wraps and looks broken, so we skip
// the whole flourish rather than render a mangled logo.
const ART_WIDTH = Math.max(...ART.map(l => [...l].length));
const ART_HEIGHT = ART.length;

const HOLD_MS = 1700; // hold the full wordmark before it dissolves
const STEP_MS = 55;   // per-frame cadence while dissolving
const FRAMES = 24;    // rough number of erosion steps (higher = more gradual)

interface Props {
  onDone: () => void;
}

// Every non-space cell in the art, as [row, col] pairs, shuffled into a random
// erosion order. Fisher–Yates so each launch dissolves in a different pattern.
function buildErosionOrder(): [number, number][] {
  const cells: [number, number][] = [];
  ART.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch !== ' ') cells.push([r, c]);
    });
  });
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j]!, cells[i]!];
  }
  return cells;
}

// Self-clearing launch flourish: the wordmark dissolves to blank, then onDone.
export default function Splash({ onDone }: Props) {
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const cols = stdout?.columns ?? 80;

  // Only run the sequence when the wordmark actually fits on screen.
  const fits = cols >= ART_WIDTH && rows >= ART_HEIGHT;

  const order = useMemo(buildErosionOrder, []);
  const step = Math.max(1, Math.ceil(order.length / FRAMES));

  const [hidden, setHidden] = useState(0);

  useEffect(() => {
    if (!fits || hidden >= order.length) {
      onDone();
      return;
    }
    const delay = hidden === 0 ? HOLD_MS : STEP_MS;
    const t = setTimeout(() => setHidden(h => h + step), delay);
    return () => clearTimeout(t);
  }, [fits, hidden, order.length, step, onDone]);

  if (!fits) return null;

  // Rebuild the art with the first `hidden` cells (in erosion order) blanked out.
  const grid = ART.map(line => [...line]);
  for (let i = 0; i < hidden && i < order.length; i++) {
    const [r, c] = order[i]!;
    grid[r]![c] = ' ';
  }
  const lines = grid.map(row => row.join(''));

  return (
    <Box height={rows} flexDirection="column" alignItems="center" justifyContent="center">
      <Box flexDirection="column">
        {lines.map((line, i) => (
          <Text key={i} color="cyan" bold>{line.length ? line : ' '}</Text>
        ))}
      </Box>
    </Box>
  );
}
