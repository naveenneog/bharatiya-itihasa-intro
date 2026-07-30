/* Which shots have a prompt newer than their newest still?

   Regenerating 163 stills to fix 53 of them costs seventy-seven minutes and three quarters of
   it is waste. The prompt is written beside every generated plate, so the two can simply be
   compared: if the text file next to the newest revision no longer matches the film's current
   prompt, that shot is stale and only that shot needs generating.

     node tools/stale.mjs --all            # list them
     node tools/stale.mjs --all --ids      # comma-separated, to paste into film-gen
*/
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { listFilms, loadFilm, ROOT } from './films.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);
const WHAT = arg('what', 'stills');
const EXT = WHAT === 'stills' ? 'png' : 'mp4';

const ids = has('all') ? await listFilms() : (arg('id', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!ids.length) { console.error('usage: --all | --id <film-id>'); process.exit(1); }

const out = [];
for (const id of ids) {
  const film = await loadFilm(id);
  const dir = path.join(ROOT, id, WHAT);
  const files = await readdir(dir).catch(() => []);
  const stale = [];
  for (const s of film.shots) {
    let best = null; let n = 0;
    for (const f of files) {
      const g = f.match(new RegExp(`^${s.id}-r(\\d+)\\.${EXT}$`));
      if (g && Number(g[1]) > n) { n = Number(g[1]); best = f; }
    }
    if (!best) { stale.push(s.id); continue; }
    const was = await readFile(path.join(dir, best.replace(new RegExp(`\\.${EXT}$`), '.txt')), 'utf8').catch(() => '');
    if (was.trim() !== s.fullPrompt.trim()) stale.push(s.id);
  }
  out.push([id, stale]);
}

if (has('ids')) {
  console.log(out.flatMap(([, s]) => s).join(','));
} else {
  let total = 0;
  for (const [id, stale] of out) {
    console.log(`  ${id.padEnd(18)} ${stale.length} stale`);
    total += stale.length;
  }
  console.log(`\n${total} shot(s) need regenerating`);
}
