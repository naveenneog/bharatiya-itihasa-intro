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

/* Chromium suspends requestAnimationFrame outright in a renderer it considers backgrounded or
   occluded. Every capture loop here advances a frame by waiting on rAF, so a suspended renderer
   does not slow the capture down — it stops it dead, and page.evaluate has no timeout of its own
   to end the wait. muhammad_bin_tughlaq_tests sat in exactly that state for seven hours with a
   live browser and no frame written. */
const NO_THROTTLE = [
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
];

export async function launch(opts = {}) {
  const args = ['--force-color-profile=srgb', '--font-render-hinting=none',
    ...NO_THROTTLE, ...(opts.args || [])];
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

/** Reject rather than wait forever. Playwright's page.evaluate has no timeout at all. */
export function withTimeout(p, ms, what) {
  let t;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`${what} timed out after ${ms}ms`)), ms); }),
  ]);
}

/** Seek a capture page to `t` and wait for the frame to be painted, bounded on both sides.
 *
 *  The in-page wait races rAF against a timer because a backgrounded renderer suspends rAF
 *  completely while it only clamps timers; the outer bound catches a renderer that has stopped
 *  answering at all. A stall then costs a minute and a recorded failure instead of a night.
 */
export function seekSettle(page, globalName, t, ms = 60000) {
  return withTimeout(page.evaluate(({ g, at }) => {
    window[g].seek(at);
    return new Promise((r) => {
      let done = false;
      const fin = () => { if (!done) { done = true; r(); } };
      requestAnimationFrame(() => requestAnimationFrame(fin));
      setTimeout(fin, 1000);
    });
  }, { g: globalName, at: t }), ms, `seek to ${t.toFixed(2)}s`);
}
