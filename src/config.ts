import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Config } from './types';

const CONFIG_DIR = path.join(os.homedir(), '.subtlesports');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULTS: Config = {
  pollIntervalSeconds: 30,
  preferredTeams: [],
  showSplash: true,
};

export function loadConfig(): Config {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULTS, null, 2));
      return DEFAULTS;
    }
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}
