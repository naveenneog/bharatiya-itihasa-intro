/* Contact sheet of the timeline: scrubs to N evenly-spaced times and tiles the frames.
   node scripts/frames.mjs [count] [out.png] */
import { launch } from './browser.mjs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const count = Number(process.argv[2] || 12);
const out = process.argv[3] || 'qa/frames';
const url = process.argv[4] || 'http://localhost:4321/index.html';

await mkdir(path.dirname(out) || '.', { recursive: true });
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', (r) => errors.push('REQFAIL ' + r.url() + ' ' + (r.failure()?.errorText || '')));

await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__intro?.duration > 0, null, { timeout: 20000 });
const dur = await page.evaluate(() => window.__intro.duration);
console.log('timeline duration:', dur.toFixed(2), 's');

for (let i = 0; i < count; i++) {
  const t = (dur * (i + 0.5)) / count;
  await page.evaluate((tt) => window.__intro.seek(tt), t);
  await page.waitForTimeout(140);
  await page.screenshot({ path: `${out}-${String(i).padStart(2, '0')}.png` });
}
await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'clean — 0 console/page/request errors');
