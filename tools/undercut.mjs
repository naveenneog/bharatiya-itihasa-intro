/* Which shots have a take too short to cover them?

   The renderer refuses to build a film with one, and prints the list — but it stops at the
   first film. This asks all three at once and prints the ids in the form film-gen wants, so
   the regeneration is one command rather than three rounds of copying.

     node tools/undercut.mjs --all
     node tools/undercut.mjs --all --ids
*/
import { readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { listFilms, loadFilm, ROOT } from './films.mjs';

const execFileP = promisify(execFile);
const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const XF = 0.34;

async function seconds(file) {
  const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', file]);
  return Number(stdout.trim());
}

const out = [];
for (const id of await listFilms()) {
  const film = await loadFilm(id);
  const dir = path.join(ROOT, id, 'clips');
  const files = await readdir(dir).catch(() => []);
  for (const s of film.shots) {
    let best = null; let n = 0;
    for (const f of files) {
      const g = f.match(new RegExp(`^${s.id}-r(\\d+)\\.mp4$`));
      if (g && Number(g[1]) > n) { n = Number(g[1]); best = f; }
    }
    if (!best) { out.push([id, s.id, 0, s.dur + XF]); continue; }
    const len = await seconds(path.join(dir, best));
    if (len < s.dur + XF - 0.05) out.push([id, s.id, len, s.dur + XF]);
  }
}

if (has('ids')) {
  console.log([...new Set(out.map(([, sid]) => sid))].join(','));
} else {
  const byFilm = {};
  for (const [f] of out) byFilm[f] = (byFilm[f] || 0) + 1;
  for (const [f, n] of Object.entries(byFilm)) console.log(`  ${f.padEnd(18)} ${n}`);
  console.log(`\n${out.length} take(s) too short`);
}
