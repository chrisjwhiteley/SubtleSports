import React, { useState, useEffect } from 'react';
import { Box, Text, useStdout } from 'ink';

import pkg from '../../package.json';

const VERSION = `SubtleSports v${pkg.version}`;

interface Props {
  footer: string;
  children: React.ReactNode;
}

export default function Layout({ footer, children }: Props) {
  const { stdout } = useStdout();
  const [, setTick] = useState(0);

  useEffect(() => {
    const onResize = () => setTick(t => t + 1);
    stdout?.on('resize', onResize);
    return () => { stdout?.off('resize', onResize); };
  }, [stdout]);

  const rows = stdout?.rows ?? 24;
  const cols = stdout?.columns ?? 80;

  const contentHeight = rows - 2;

  // Pad the footer text so the version sits at the right edge
  const gap = Math.max(1, cols - footer.length - VERSION.length - 2); // -2 for paddingX
  const paddedFooter = footer + ' '.repeat(gap) + VERSION;

  return (
    <Box flexDirection="column" height={rows}>
      <Box flexDirection="column" height={contentHeight} overflow="hidden">
        {children}
      </Box>
      <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} paddingX={1}>
        <Text dimColor>{paddedFooter}</Text>
      </Box>
    </Box>
  );
}
