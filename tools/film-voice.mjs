/* Record a film's narration, and let it set the timing.

   The author writes an *intended* hold for every speaking shot. This measures what the line
   actually takes when spoken and writes it back as `said`, so the cut is timed to the voice
   rather than to an estimate.

   That is the inversion the whole format rests on. In the episode pipeline the narration was
   recorded first and the picture had to last exactly as long as it — one image, thirteen
   seconds, no choice. Here the shot list is written first, the voice is measured into it, and
   the silences between shots stay exactly as long as the author asked for.

   Years are spoken as years, through the same normaliser the episodes use, because the film
   author writes "six twenty-eight" but nothing stops a stray numeral getting through.

     node tools/film-voice.mjs --id zero-ascent --dry
     node tools/film-voice.mjs --id zero-ascent
     node tools/film-voice.mjs --all --missing
*/
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { synth, seconds, foldToWritten } from './voice.mjs';
import { speakYears } from './years.mjs';
import { listFilms, loadFilm, ROOT } from './films.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);
const DRY = has('dry');
const MISSING = has('missing');
const CONC = Number(arg('conc', '3'));

const ids = has('all') ? await listFilms() : (arg('id', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!ids.length) { console.error('usage: --all | --id <film-id>'); process.exit(1); }

/* One mood for the whole film would flatten it, and the author does not choose moods. The
   narration's own register does: an objection is suspense, an arrival is triumph, a plain
   statement of fact is calm. Cheap, and it stops five minutes of identical delivery. */
function moodFor(say) {
  const t = say.toLowerCase();
  if (/\bnot\b|\bcannot\b|\bimpossible\b|\bnothing\b.*\bnot\b|\bobjection\b|\bwrong\b|\bfail/.test(t)) return 'suspense';
  if (/\bfirst\b|\bnever\b|\bstill\b|\bevery\b|\bworld\b|\bchanged?\b|\bbecame\b/.test(t)) return 'triumph';
  if (/\bwar\b|\bstorm\b|\bbroke\b|\bfell\b|\bburn/.test(t)) return 'battle';
  return 'calm';
}

for (const id of ids) {
  const film = await loadFilm(id);
  const out = path.join(ROOT, id, 'audio');
  await mkdir(out, { recursive: true });

  const todo = [];
  for (const s of film.shots) {
    if (!s.say) continue;
    const mp3 = path.join(out, `${s.id}.mp3`);
    if (MISSING && s.said && await stat(mp3).then(() => true, () => false)) continue;
    todo.push({ s, mp3 });
  }

  console.log(`\n  ${id}: ${todo.length} line(s) to record of ${film.shots.filter((x) => x.say).length}`);
  if (DRY) {
    for (const { s } of todo.slice(0, 6)) console.log(`    ${s.id.padEnd(24)} [${moodFor(s.say)}] "${s.say.slice(0, 60)}"`);
    continue;
  }
  if (!todo.length) continue;

  const raw = JSON.parse(await readFile(path.join(ROOT, id, 'film.json'), 'utf8'));
  const byId = new Map(raw.shots.map((s) => [s.id, s]));

  let n = 0;
  let next = 0;
  const t0 = Date.now();
  const worker = async () => {
    for (;;) {
      const job = todo[next++];
      if (!job) return;
      const { s, mp3 } = job;
      const written = s.say.trim();
      const { text: spoken, changed } = speakYears(written);
      const mood = moodFor(written);
      try {
        const { audio, words } = await synth(spoken, { role: 'narrator', mood });
        await writeFile(mp3, audio);
        const said = await seconds(mp3);
        const tgt = byId.get(s.id);
        tgt.said = +said.toFixed(3);
        tgt.mood = mood;
        /* Word timings are kept even though this format burns no captions, because they are
           what a later pass would need to cut the picture on the speaker's own pauses. */
        tgt.words = foldToWritten(written, spoken, words);
        n++;
        console.log(`  [${n}/${todo.length}] ${s.id.padEnd(24)} ${said.toFixed(1)}s  [${mood}]`
          + (changed.length ? `  years: ${changed.map((c) => c.from).join(',')}` : ''));
      } catch (e) {
        console.log(`  [${n}/${todo.length}] ${s.id.padEnd(24)} FAIL ${String(e.message).slice(0, 120)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, worker));

  await writeFile(path.join(ROOT, id, 'film.json'), `${JSON.stringify(raw, null, 2)}\n`);
  const after = await loadFilm(id);
  const est = film.runtime;
  console.log(`  ${n} recorded in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  console.log(`  runtime ${Math.floor(after.runtime / 60)}:${String(Math.round(after.runtime % 60)).padStart(2, '0')}`
    + `  (estimated ${Math.floor(est / 60)}:${String(Math.round(est % 60)).padStart(2, '0')})`);
}
