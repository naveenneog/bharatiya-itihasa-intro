/* Cross-engine smoke test.
   The sequence is authored in Chromium; this checks it also composes correctly in
   WebKit (the engine behind Safari) and Firefox, when those builds are available.
   It loads the page, seeks to a set of timeline positions and screenshots each one,
   while collecting console/page errors. Missing engines are skipped, not failed. */
import { webkit, firefox, chromium } from 'playwright';
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const URL = process.argv[2] || 'http://localhost:4321/';
const OUT = process.argv[3] || 'qa/xb';
const CACHE = process.env.PLAYWRIGHT_BROWSERS_PATH
  || path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
const STOPS = [0, 4.2, 12.0, 21.0, 25.4, 28.6];

function find(prefix, subs, exes) {
  if (!existsSync(CACHE)) return null;
  const dirs = readdirSync(CACHE)
    .filter((d) => d.startsWith(prefix))
    .sort((a, b) => (Number(b.split('-').pop()) || 0) - (Number(a.split('-').pop()) || 0));
  for (const d of dirs) {
    for (const sub of subs) {
      for (const exe of exes) {
        const p = path.join(CACHE, d, sub, exe);
        if (existsSync(p)) return p;
      }
    }
  }
  return null;
}

const ENGINES = [
  { name: 'chromium', type: chromium, exe: find('chromium-', ['chrome-win64', 'chrome-win', 'chrome-linux', 'chrome-mac'], ['chrome.exe', 'chrome']) },
  { name: 'webkit', type: webkit, exe: find('webkit-', ['', 'pw_run.sh'], ['Playwright.exe', 'pw_run.sh']) },
  { name: 'firefox', type: firefox, exe: find('firefox-', ['firefox'], ['firefox.exe', 'firefox']) },
];

mkdirSync(OUT, { recursive: true });
let failures = 0;

for (const eng of ENGINES) {
  if (!eng.exe) { console.log(`- ${eng.name.padEnd(9)} not installed, skipped`); continue; }
  let browser;
  try {
    browser = await eng.type.launch({ executablePath: eng.exe });
  } catch (e) {
    console.log(`- ${eng.name.padEnd(9)} failed to launch: ${String(e).split('\n')[0]}`);
    continue;
  }
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errs.push(`net: ${r.url()}`));

  try {
    await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__intro?.duration > 0, null, { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);

    const info = await page.evaluate(() => ({
      duration: +window.__intro.duration.toFixed(2),
      paths: document.querySelectorAll('svg path').length,
      cues: window.__intro.cues.length,
    }));

    for (let i = 0; i < STOPS.length; i++) {
      await page.evaluate((t) => window.__intro.seek(t), STOPS[i]);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: path.join(OUT, `${eng.name}-${i}.png`) });
    }

    // Nothing that is actually painted may spill outside the 1920x1080 frame.
    // #frame is overflow:hidden and #grain is deliberately inset -8px to kill the
    // tile seam, so scrollWidth is not a usable signal — walk the tree instead and
    // fold in ancestor opacity/visibility so hidden scenes are not counted.
    const spill = await page.evaluate((stops) => {
      const worst = [];
      const fr = document.querySelector('#frame').getBoundingClientRect();
      const effective = (el) => {
        let o = 1;
        for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.visibility === 'hidden' || cs.display === 'none') return 0;
          o *= parseFloat(cs.opacity);
          if (o < 0.02) return 0;
          if (n.id === 'frame') break;
        }
        return o;
      };
      for (const t of stops) {
        window.__intro.seek(t);
        for (const el of document.querySelectorAll('#frame *')) {
          if (el.id === 'grain') continue;
          if (effective(el) < 0.02) continue;
          const r = el.getBoundingClientRect();
          if (!r.width && !r.height) continue;
          const d = Math.max(fr.left - r.left, r.right - fr.right, fr.top - r.top, r.bottom - fr.bottom);
          if (d > 2) worst.push({ t, tag: el.tagName, id: el.id, cls: (el.getAttribute('class') || '').slice(0, 24), px: Math.round(d) });
        }
      }
      return worst;
    }, STOPS);

    const bad = errs.length > 0 || spill.length > 0;
    if (bad) failures++;
    console.log(`${bad ? 'x ' : 'ok'} ${eng.name.padEnd(9)} ${info.duration}s · ${info.paths} paths · ${info.cues} cues · ${errs.length} errors · ${spill.length} spills`);
    errs.slice(0, 5).forEach((e) => console.log(`     ${e}`));
    spill.slice(0, 5).forEach((s) => console.log(`     spill t=${s.t}s ${s.tag}${s.id ? '#' + s.id : ''}${s.cls ? '.' + s.cls : ''} by ${s.px}px`));
  } catch (e) {
    failures++;
    console.log(`x  ${eng.name.padEnd(9)} ${String(e).split('\n')[0]}`);
  }
  await browser.close();
}

console.log(failures ? `\n${failures} engine(s) with problems -> ${OUT}/` : `\nall available engines clean -> ${OUT}/`);
process.exit(failures ? 1 : 0);
