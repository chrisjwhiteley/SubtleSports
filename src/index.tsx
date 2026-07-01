#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import App from './App';
import { loadConfig } from './config';

// Enter the alternate screen + hide the cursor on startup, and guarantee we undo
// both on the way out — however we exit. Relying on a single 'exit' handler is
// fragile: if the process ends via a signal the restore never runs and the user
// is left staring at a blank alt-screen with no cursor (looks like a dead term).
const ENTER_ALT = '\x1b[?1049h\x1b[H\x1b[?25l'; // alt screen, home, hide cursor
const LEAVE_ALT = '\x1b[?25h\x1b[?1049l';        // show cursor, leave alt screen

let restored = false;
function restoreTerminal() {
  if (restored) return;
  restored = true;
  process.stdout.write(LEAVE_ALT);
}

process.stdout.write(ENTER_ALT);
process.on('exit', restoreTerminal);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(sig, () => { restoreTerminal(); process.exit(0); });
}

const config = loadConfig();
const app = render(<App config={config} />);

// When Ink unmounts (q / Ctrl+C / Esc-out), restore the terminal and exit cleanly
// so control returns to the shell instead of leaving a hung or blank terminal.
app.waitUntilExit()
  .catch(() => {})
  .finally(() => {
    restoreTerminal();
    process.exit(0);
  });
