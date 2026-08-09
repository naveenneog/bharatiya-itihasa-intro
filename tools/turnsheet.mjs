/* turnsheet — look at one page turn, frame by frame, at full size.

   A page turn lasts a second and a quarter. In a finished master that is thirty frames
   buried in six minutes, and the only way I had been judging it was a downscaled contact
   sheet of a draft render — which is how a turn that hinged at the wrong edge, and a
   back face that was invisible for the whole second half, both survived several passes.

   This scrubs the player itself to instants inside a chosen turn and writes full-size
   frames plus a labelled sheet. It costs seconds rather than the forty minutes a master
   costs, so the turn can be judged before it is committed to a render.

     node tools/turnsheet.mjs --slug zero --cut cut-k-page --panel 3
     node tools/turnsheet.mjs --slug zero --cut cut-k-page --panel 3 --steps 12 --scale 0.5

   --panel is the panel being turned *to*; the turn runs over the first 1.25s of it. */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { runDir } from './keep.mjs';
import { launch } from '../scripts/browser.mjs';
import { startServer } from './local-server.mjs';

const execFileP = promisify(execFile);
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };

const SLUG = arg('slug', 'zero');
const CUT = arg('cut', 'cut-k-page');
const PANEL = Number(arg('panel', 3));
const STEPS = Number(arg('steps', 9));
const SCALE = Number(arg('scale', 1));
const PORT = Number(arg('port', 4419));
const TURN = Number(arg('turn', 1.25));
/* The turn is not over when the rotation is: the leaf lies on the left page for a fifth of
   a second and dissolves while the new words come up through it. Sampling only as far as
   the rotation is how a landed page that popped went unseen. */
const SPAN = Number(arg('span', TURN + 0.35));
const OUT = path.resolve(arg('out', null) || runDir(`turnsheet/${SLUG}-${CUT}-p${PANEL}`));

const W = Math.round(1920 * SCALE);
const H = Math.round(1080 * SCALE);

await mkdir(OUT, { recursive: true });

const server = await startServer();
await new Promise((r) => setTimeout(r, 700));

const url = `${server.base}/episodes/${SLUG}/${CUT}/index.html?export=1`;
const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__epReady === true, null, { timeout: 30000 });

const tl = await page.evaluate(() => window.__ep.timeline());
if (PANEL < 1 || PANEL >= tl.length) throw new Error(`panel ${PANEL} outside 1..${tl.length - 1}`);
const start = tl[PANEL].start;
console.log(`${CUT} panel ${PANEL} (${tl[PANEL].id}) starts at ${start.toFixed(2)}s; turn ${TURN}s, sampling ${SPAN}s`);

/* A frame before the turn and one after it, so the sheet shows what the turn moved
   between and not only the middle of the move. */
const times = [start - 0.30];
for (let s = 0; s <= STEPS; s++) times.push(start + (SPAN * s) / STEPS);
times.push(start + SPAN + 0.40);

const shots = [];
for (const [k, t] of times.entries()) {
  await page.evaluate((tt) => {
    window.__ep.seek(Math.max(0, tt));
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, t);
  /* The angle is read back off the live element rather than recomputed here, so the sheet
     labels what the page is actually doing and would disagree loudly if the two drifted. */
  const state = await page.evaluate(() => {
    const leaf = document.querySelector('#art .scene.turning');
    const wrap = document.getElementById('capwrap');
    const gs = (el, p) => (el ? getComputedStyle(el).getPropertyValue(p).trim() : '');
    return {
      turn: gs(leaf, '--turn') || 'none',
      lift: gs(leaf, '--lift') || '',
      leaf: gs(leaf, '--leaf') || '',
      shade: gs(wrap, '--shade') || '',
      reveal: gs(wrap, '--reveal') || '',
    };
  });
  const rel = t - start;
  const file = path.join(OUT, `t${String(k).padStart(2, '0')}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 94 });
  shots.push({ file, rel, ...state });
  console.log(`  ${rel >= 0 ? '+' : ''}${rel.toFixed(3)}s  turn ${state.turn.padStart(9)}  `
    + `lift ${state.lift.padStart(8)}  leaf ${state.leaf.padStart(5)}  `
    + `shade ${state.shade.padStart(5)}  reveal ${state.reveal.padStart(5)}`);
}
await browser.close();

/* No drawtext: this machine's ffmpeg has no fontconfig, and a sheet that fails to build
   is worse than an unlabelled one. The frames are in time order and the angles are in the
   log and in state.json, which is enough to say which frame is which. */
const cols = Math.ceil(Math.sqrt(shots.length));
const rows = Math.ceil(shots.length / cols);
const sheet = path.resolve(`${OUT}.png`);
await execFileP('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
  '-i', path.join(OUT, 't%02d.jpg'),
  '-vf', `scale=520:-1,tile=${cols}x${rows}:margin=6:padding=6`,
  '-frames:v', '1', sheet]);
await writeFile(path.join(OUT, 'state.json'), JSON.stringify(shots, null, 2));
console.log(`\nsheet: ${sheet}`);
console.log(`frames: ${OUT}`);

/* Explicit, not only from the exit handler: a spawned child keeps the event loop referenced,
   so a server cleaned up solely on 'exit' deadlocks the process that is waiting to exit. One
   turnsheet sat like that for two days holding port 4419. */
await server.stop();
