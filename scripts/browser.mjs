/* Shared browser launcher.
   The Playwright cache on this machine has partially-downloaded browser folders,
   so rather than failing we discover any complete Chromium build and use it. */
import { chromium } from 'playwright';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CACHE = process.env.PLAYWRIGHT_BROWSERS_PATH
  || path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');

function findChromium() {
  if (!existsSync(CACHE)) return null;
  const dirs = readdirSync(CACHE)
    .filter((d) => d.startsWith('chromium'))
    .sort((a, b) => (Number(b.split('-').pop()) || 0) - (Number(a.split('-').pop()) || 0));
  for (const d of dirs) {
    for (const sub of ['chrome-win64', 'chrome-win', 'chrome-linux', 'chrome-mac']) {
      for (const exe of ['chrome.exe', 'headless_shell.exe', 'chrome', 'headless_shell']) {
        const p = path.join(CACHE, d, sub, exe);
        if (existsSync(p)) return p;
      }
    }
  }
  return null;
}

export async function launch(opts = {}) {
  const args = ['--force-color-profile=srgb', '--font-render-hinting=none', ...(opts.args || [])];
  try {
    return await chromium.launch({ ...opts, args });
  } catch (e) {
    if (!/Executable doesn't exist/i.test(String(e))) throw e;
    const exe = findChromium();
    if (!exe) throw e;
    console.warn(`[browser] using cached chromium: ${exe}`);
    return await chromium.launch({ ...opts, executablePath: exe, args });
  }
}
