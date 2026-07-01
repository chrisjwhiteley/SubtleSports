import { spawn } from 'child_process';

// Open a URL in the user's default browser, cross-platform. Fire-and-forget:
// failures (no browser, headless box) are swallowed so the TUI never crashes.
export function openUrl(url: string): void {
  if (!url) return;
  const cmd = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'cmd'
      : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {}); // e.g. xdg-open not installed
    child.unref();
  } catch {
    // ignore
  }
}
