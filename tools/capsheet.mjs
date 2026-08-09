/* A contact sheet of any cut at chosen panels — for judging a caption, not a page turn.

   turnsheet.mjs samples inside one page turn at millisecond spacing. Judging typography needs
   the opposite: one frame per panel, spread across the episode, at full size. Devanagari fails
   in ways a thumbnail hides — a missing glyph renders as a box, a wrong font silently
   substitutes, and a conjunct that does not form looks like ordinary text to anyone not reading
   it. So the frames are written full size as well as tiled.

     node tools/capsheet.mjs --slug zero-hi --cut cut-k-page --n 8
     node tools/capsheet.mjs --slug zero-hi --panels 1,4,9,14 --scale 0.5
*/
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launch } from '../scripts/browser.mjs';
import { runDir } from './keep.mjs';
import { startServer } from './local-server.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };

const SLUG = arg('slug', 'zero');
const CUT = arg('cut', 'cut-k-page');
const N = Number(arg('n', '8'));
const PANELS = (arg('panels', '') || '').split(',').map((s) => s.trim()).filter(Boolean).map(Number);
const SCALE = Number(arg('scale', '0.5'));
const AT = Number(arg('at', '0.55'));   // where inside a panel to sample, as a fraction
const OUT = arg('out', null) || runDir(`capsheet/${SLUG}-${CUT}`);
const PORT = Number(arg('port', '4463'));
const W = 1920; const H = 1080;

await mkdir(OUT, { recursive: true });

const server = await startServer();
await new Promise((r) => setTimeout(r, 700));

const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const problems = [];
page.on('pageerror', (e) => problems.push('PAGEERROR ' + e.message));
page.on('requestfailed', (r) => problems.push('REQFAIL ' + r.url()));
await page.goto(`${server.base}/episodes/${SLUG}/${CUT}/index.html?export=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__epReady === true, null, { timeout: 30000 });

const tl = await page.evaluate(() => window.__ep.timeline());
const pick = PANELS.length
  ? PANELS.filter((i) => i >= 0 && i < tl.length)
  : Array.from({ length: Math.min(N, tl.length) }, (_, k) => Math.round((k * (tl.length - 1)) / Math.max(1, Math.min(N, tl.length) - 1)));

console.log(`${SLUG} / ${CUT} — ${tl.length} panels, sampling ${pick.length}\n`);

const shots = [];
for (const i of pick) {
  const t = tl[i].start + tl[i].dur * AT;
  await page.evaluate((tt) => {
    window.__ep.seek(Math.max(0, tt));
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, t);
  /* Read the caption back off the page rather than out of episode.json: the question is what
     was drawn, and a font that failed to load still leaves the right characters in the DOM. */
  const seen = await page.evaluate(() => {
    const c = document.getElementById('cap');
    const wrap = document.getElementById('capwrap');
    const cs = c ? getComputedStyle(c) : null;
    const r = c?.getBoundingClientRect();
    const wr = wrap?.getBoundingClientRect();
    return {
      text: (c?.textContent || '').trim(),
      font: cs ? cs.fontFamily.split(',')[0].replace(/["']/g, '') : '',
      size: cs ? cs.fontSize : '',
      plain: !!c?.classList.contains('plain'),
      /* Overflow is the thing a screenshot shows and a DOM dump hides. The caption column ends
         at the crease; anything drawn past it is under the picture. */
      capRight: r ? Math.round(r.right) : 0,
      wrapRight: wr ? Math.round(wr.right) : 0,
      scrollW: c ? c.scrollWidth : 0,
      clientW: c ? c.clientWidth : 0,
    };
  });
  const file = path.join(OUT, `p${String(i).padStart(2, '0')}.png`);
  await page.screenshot({ path: file });
  shots.push({ i, id: tl[i].id, t, file: path.basename(file), ...seen });
  console.log(`  ${String(i).padStart(2)} ${tl[i].id.padEnd(12)} ${t.toFixed(1)}s  ${seen.font} ${seen.size}`
    + `  cap ${seen.clientW}/${seen.scrollW}px right@${seen.capRight} wrap@${seen.wrapRight}`
    + `${seen.scrollW > seen.clientW + 1 ? '  <-- OVERFLOWS' : ''}`);
}

await browser.close();
await server.stop();

const cols = Math.min(4, shots.length);
await writeFile(path.join(OUT, 'sheet.html'), `<!doctype html><meta charset="utf-8">
<title>${SLUG} ${CUT}</title>
<style>body{background:#111;color:#b7a684;font:12px system-ui;margin:16px}
 .g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px}
 figure{margin:0}img{width:100%;display:block;border:1px solid #333}
 figcaption{padding:4px 2px;font-size:11px;line-height:1.4}
 b{color:#f6dc9a;font-weight:400}</style>
<h1 style="font-weight:400;color:#f6dc9a">${SLUG} · ${CUT}</h1>
<div class="g">${shots.map((s) => `<figure><img src="${s.file}">
 <figcaption><b>${s.i} ${s.id}</b> · ${s.font} ${s.size}<br>${s.text.slice(0, 120)}</figcaption></figure>`).join('')}</div>`);

if (problems.length) {
  console.log(`\n  ${problems.length} page problem(s):`);
  for (const p of [...new Set(problems)].slice(0, 8)) console.log(`    ${p}`);
}
console.log(`\n  -> ${OUT}/sheet.html`);
