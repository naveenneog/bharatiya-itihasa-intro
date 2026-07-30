/* Generate a film's pictures.

   163 shots across three films, each needing a still and then a Sora take built from it. That
   is several hours of API time, so the shape of this matters more than it did for the eras:

   - **One global queue across all films.** A queue per film finishes film one before film two
     starts, so a failure at hour three leaves two films untouched. One queue leaves all three
     evenly advanced, and a partial result is still watchable.
   - **--missing is the normal way to run it**, not the recovery path.
   - **--dry first, always.** It prints the job count before any of it is spent.

     node tools/film-gen.mjs --all --what stills --dry
     node tools/film-gen.mjs --all --what stills --missing --conc 4
     node tools/film-gen.mjs --all --what clips  --missing --conc 2
     node tools/film-gen.mjs --id zero-ascent --what clips --shot 010-ink-bloom
*/
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { genImage, genVideo } from './azure.mjs';
import { listFilms, loadFilm, validateFilm, ROOT } from './films.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const VALUE = new Set(['what', 'conc', 'id', 'shot', 'shots', 'rounds']);
const BOOL = new Set(['all', 'dry', 'missing']);
const unknown = argv.filter((a) => a.startsWith('--') && !VALUE.has(a.slice(2)) && !BOOL.has(a.slice(2)));
if (unknown.length) {
  console.error(`unknown flag(s): ${unknown.join(', ')}`);
  console.error(`known: ${[...VALUE].map((f) => `--${f} <v>`).join(', ')}, ${[...BOOL].map((f) => `--${f}`).join(', ')}`);
  process.exit(1);
}

const WHAT = arg('what', 'stills');
const ROUNDS = Number(arg('rounds', '1'));
const DRY = has('dry');
const MISSING = has('missing');
const CONC = Number(arg('conc', WHAT === 'clips' ? '2' : '4'));
const FILTER = [arg('shot', ''), arg('shots', '')].join(',').split(',').map((s) => s.trim()).filter(Boolean);

if (!['stills', 'clips'].includes(WHAT)) { console.error('--what must be stills or clips'); process.exit(1); }

const ids = has('all') ? await listFilms() : (arg('id', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!ids.length) { console.error('usage: --all | --id <film-id>'); process.exit(1); }

/** Never overwrite: every take stays on disk to compare. */
async function nextRev(dir, id, ext) {
  await mkdir(dir, { recursive: true });
  const files = await readdir(dir).catch(() => []);
  const re = new RegExp(`^${id}-r(\\d+)\\.${ext}$`);
  const max = files.reduce((m, f) => { const g = f.match(re); return g ? Math.max(m, Number(g[1])) : m; }, 0);
  return { file: path.join(dir, `${id}-r${max + 1}.${ext}`), have: max };
}

/** The chosen still for a shot: highest revision on disk. */
async function stillFor(filmId, shotId) {
  const dir = path.join(ROOT, filmId, 'stills');
  const files = await readdir(dir).catch(() => []);
  let best = null; let n = 0;
  for (const f of files) {
    const g = f.match(new RegExp(`^${shotId}-r(\\d+)\\.png$`));
    if (g && Number(g[1]) > n) { n = Number(g[1]); best = path.join(dir, f); }
  }
  return best;
}

const queue = [];
const byFilm = new Map();
for (const id of ids) {
  const film = await loadFilm(id);
  const v = validateFilm(film);
  if (!v.ok) {
    console.error(`\n${id} does not validate — not generating:`);
    for (const p of v.problems) console.error(`   ! ${p}`);
    process.exit(1);
  }
  const dir = path.join(ROOT, id, WHAT);
  const ext = WHAT === 'stills' ? 'png' : 'mp4';
  for (const s of film.shots) {
    if (FILTER.length && !FILTER.some((f) => s.id.includes(f))) continue;
    const { have } = await nextRev(dir, s.id, ext);
    if (MISSING && have > 0) continue;
    for (let r = 0; r < ROUNDS; r++) {
      queue.push({ film: id, shot: s, dir, ext });
      byFilm.set(id, (byFilm.get(id) || 0) + 1);
    }
  }
}

const per = WHAT === 'clips' ? 120 : 29;
console.log(`\n  ${WHAT}: ${queue.length} job(s) across ${byFilm.size} film(s), ${CONC} at a time\n`);
for (const [k, n] of byFilm) console.log(`    ${k.padEnd(18)} ${n}`);
console.log(`\n  estimated ${Math.round((queue.length * per) / CONC / 60)} min\n`);
if (DRY) { console.log('  --dry: nothing generated\n'); process.exit(0); }
if (!queue.length) { console.log('  nothing to do\n'); process.exit(0); }

const t0 = Date.now();
let done = 0;
let failed = 0;
let noref = 0;
let next = 0;

async function worker() {
  for (;;) {
    const j = queue[next++];
    if (!j) return;
    const { file } = await nextRev(j.dir, j.shot.id, j.ext);
    const label = `${j.film}/${j.shot.id}`;
    try {
      if (WHAT === 'stills') {
        await genImage(j.shot.fullPrompt, file, { size: '1536x1024', quality: 'high' });
        await writeFile(file.replace(/\.png$/, '.txt'), j.shot.fullPrompt);
      } else {
        const ref = await stillFor(j.film, j.shot.id);
        if (!ref) throw new Error('no still to build from — generate stills first');
        /* Eight seconds for every shot regardless of how long it is held. The assembly trims
           to the shot's own duration and seeks to the middle of the take, where the ink is
           actually moving rather than still leaving the reference frame. */
        try {
          await genVideo(j.shot.fullPrompt, file, { seconds: '8', size: '1280x720', ref });
        } catch (e) {
          /* Sora's moderation refuses a reference image with a person in it, while
             text-to-video of a person is fine. Every `face` and `hand` shot therefore fails
             on its first attempt, which is a known failure with a known remedy — so it is
             retried without the reference rather than reported.

             The take loses its style lock, so the prompt has to carry the look alone. It
             already does: fullPrompt contains the whole visual language, and the reference
             was reinforcement rather than the only source of it. */
          if (!/moderation_blocked|people-in-user-uploads/i.test(String(e.message))) throw e;
          noref++;
          await genVideo(j.shot.fullPrompt, file, { seconds: '8', size: '1280x720' });
        }
        await writeFile(file.replace(/\.mp4$/, '.txt'), j.shot.fullPrompt);
      }
      done++;
      console.log(`  [${done + failed}/${queue.length}] ${((Date.now() - t0) / 1000).toFixed(0)}s  ok   ${label} -> ${path.basename(file)}`);
    } catch (e) {
      failed++;
      const msg = String(e.message).replace(/\s+/g, ' ').trim();
      const short = msg.length > 200 ? `${msg.slice(0, 110)} … ${msg.slice(-80)}` : msg;
      console.log(`  [${done + failed}/${queue.length}] ${((Date.now() - t0) / 1000).toFixed(0)}s  FAIL ${label}: ${short}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.max(1, Math.min(CONC, queue.length)) }, worker));
console.log(`\n  ${done}/${queue.length} ${WHAT} in ${((Date.now() - t0) / 60000).toFixed(1)} min`
  + (noref ? `, ${noref} fell back to text-to-video (a person in the reference)` : '')
  + (failed ? `, ${failed} failed — re-run with --missing` : ''));
process.exit(failed ? 1 : 0);
