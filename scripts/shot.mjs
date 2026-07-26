/* Screenshot helper used while iterating on the artwork.
   node scripts/shot.mjs <url> <out.png> [w] [h] [waitMs] */
import { launch } from './browser.mjs';

const [url, out, w = '1920', h = '1080', wait = '1200'] = process.argv.slice(2);
if (!url || !out) { console.error('usage: shot.mjs <url> <out.png> [w] [h] [waitMs]'); process.exit(1); }

const browser = await launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', (r) => errors.push('REQFAIL ' + r.url()));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(+wait);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'clean');
console.log('wrote ' + out);
