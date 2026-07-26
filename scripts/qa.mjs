/* qa.mjs — plays the piece in real time and measures what actually happens.

   A title sequence is judged on whether it *runs*, so this watches a live playthrough
   rather than a synthetic idle scene: per-frame deltas tagged with timeline position,
   overall and 1%-low frame rate, the worst window, DOM weight, and every console,
   page and network error. Also checks the reduced-motion path lands on the final frame.

   node scripts/qa.mjs [url] */
import { launch } from './browser.mjs';

const URL = process.argv[2] || 'http://localhost:4321/index.html';
const browser = await launch();

async function session(opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, ...opts });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push('CONSOLE ' + m.text()));
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('requestfailed', (r) => errors.push('REQFAIL ' + r.url()));
  return { page, errors };
}

/* ── 1. live playthrough ─────────────────────────────────────────────────── */
const { page, errors } = await session();
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.__intro?.duration > 0, null, { timeout: 30000 });

const meta = await page.evaluate(() => ({
  duration: window.__intro.duration,
  paths: document.querySelectorAll('path').length,
  cues: window.__intro.cues.length,
}));

await page.evaluate(() => {
  window.__samples = [];
  window.__intro.tl.restart();
  let last = performance.now();
  const step = (now) => {
    window.__samples.push([window.__intro.tl.time(), now - last]);
    last = now;
    if (window.__intro.tl.time() < window.__intro.duration - 0.05) requestAnimationFrame(step);
    else window.__done = true;
  };
  requestAnimationFrame(step);
});
await page.waitForFunction(() => window.__done, null, { timeout: 90000 });
const samples = await page.evaluate(() => window.__samples);

const deltas = samples.map((s) => s[1]).filter((d) => d > 0 && d < 500).slice(2);
deltas.sort((a, b) => a - b);
const pct = (p) => deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * p))];
const fps = (ms) => (1000 / ms).toFixed(1);

// worst 1-second window of the timeline
const buckets = new Map();
for (const [t, d] of samples) {
  const k = Math.floor(t);
  if (!buckets.has(k)) buckets.set(k, []);
  buckets.get(k).push(d);
}
const worst = [...buckets.entries()]
  .map(([k, ds]) => [k, 1000 / (ds.reduce((a, b) => a + b, 0) / ds.length)])
  .filter(([, f]) => isFinite(f))
  .sort((a, b) => a[1] - b[1])
  .slice(0, 4);

/* ── 2. reduced motion ───────────────────────────────────────────────────── */
const { page: rmPage, errors: rmErrors } = await session({ reducedMotion: 'reduce' });
await rmPage.goto(URL, { waitUntil: 'load' });
await rmPage.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 30000 });
const rm = await rmPage.evaluate(() => ({
  progress: window.__intro.tl.progress(),
  paused: window.__intro.tl.paused(),
  lockupVisible: Number(getComputedStyle(document.querySelector('#lockup')).opacity) > 0.9,
}));
await rmPage.screenshot({ path: 'qa/reduced-motion.png' });

/* ── 3. deep-link scrub sanity: every second must render without throwing ── */
await page.evaluate(async (d) => {
  for (let t = 0; t <= d; t += 0.5) window.__intro.seek(t);
  window.__intro.seek(d);
}, meta.duration);

await browser.close();

const line = (k, v, flag = '') => console.log(`  ${k.padEnd(18)}${String(v).padEnd(28)}${flag}`);
console.log(`\nITIHĀSA INTRO — QA  ${URL}\n${'-'.repeat(62)}`);
line('duration', `${meta.duration.toFixed(2)} s`);
line('svg paths', meta.paths, meta.paths > 4000 ? '<-- heavy' : '');
line('audio cues', meta.cues);
line('frames sampled', deltas.length);
line('median fps', fps(pct(0.5)), 1000 / pct(0.5) < 55 ? '<-- investigate' : 'ok');
line('5% low fps', fps(pct(0.95)), 1000 / pct(0.95) < 40 ? '<-- investigate' : 'ok');
line('1% low fps', fps(pct(0.99)), 1000 / pct(0.99) < 24 ? '<-- investigate' : 'ok');
console.log('  worst seconds     ' + worst.map(([k, f]) => `t=${k}s:${f.toFixed(0)}fps`).join('  '));
line('console/page/net', errors.length, errors.length ? '<-- FAIL' : 'ok');
line('reduced motion', `progress ${rm.progress.toFixed(2)} paused=${rm.paused} lockup=${rm.lockupVisible}`,
  rm.progress === 1 && rm.lockupVisible ? 'ok' : '<-- FAIL');
line('reduced-motion errs', rmErrors.length, rmErrors.length ? '<-- FAIL' : 'ok');
if (errors.length) console.log('\n' + errors.join('\n'));
if (rmErrors.length) console.log('\n' + rmErrors.join('\n'));
console.log('-'.repeat(62));

const pass = errors.length === 0 && rmErrors.length === 0 && rm.progress === 1 && 1000 / pct(0.5) >= 55;
console.log(pass ? 'PASS' : 'REVIEW NEEDED');
process.exit(pass ? 0 : 1);
