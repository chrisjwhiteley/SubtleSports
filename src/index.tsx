#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import App from './App';
import { loadConfig } from './config';

// Enter alternate screen, hide cursor — restores on exit
process.stdout.write('\x1b[?1049h\x1b[H\x1b[?25l');
process.on('exit', () => process.stdout.write('\x1b[?25h\x1b[?1049l'));

const config = loadConfig();
render(<App config={config} />);
