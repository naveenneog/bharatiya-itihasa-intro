/* Shorten the lines that outgrew their format.

   A shot longer than about eleven and a half seconds cannot be covered by any Sora take, and
   at that length it is a panel again — one image held while a long sentence plays, which is
   exactly what this format exists to stop being.

   The line is shortened rather than the shot being split, because the shot list is an edit and
   inserting shots into it changes the rhythm the author decided. Only the over-long lines are
   touched, and only they are re-recorded.

     node tools/shorten.mjs --all --dry
     node tools/shorten.mjs --all
*/
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chatJson } from './llm.mjs';
import { listFilms, loadFilm, ROOT } from './films.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);
const DRY = has('dry');
const MAX = Number(arg('max', '10.5'));

const ids = has('all') ? await listFilms() : (arg('id', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!ids.length) { console.error('usage: --all | --id <film-id>'); process.exit(1); }

const SYSTEM = `You are tightening narration for a documentary film. Each line is spoken over one
held image, and these particular lines run too long for the shot.

Return JSON only: { "lines": [ { "id": "...", "say": "..." } ] }

For each line, cut it to AT MOST 16 words while keeping every fact in it. If a fact will not
survive the cut, drop the least important one rather than cramming — a line that has to be
rushed is worse than a line that says less.

Rules:
- Never write a numeral. Write "six twenty-eight", not "628".
- Keep the register: plain, declarative, no rhetorical flourish.
- Keep the last two or three words strong; that is what a viewer remembers.
- Do not merge two lines or invent a fact that was not there.`;

let total = 0;
for (const id of ids) {
  const film = await loadFilm(id);
  const over = film.shots.filter((s) => s.say && s.dur > MAX);
  console.log(`\n  ${id}: ${over.length} line(s) over ${MAX}s`);
  for (const s of over) console.log(`    ${s.id.padEnd(24)} ${s.dur.toFixed(1)}s  ${s.say.split(/\s+/).length}w`);
  if (DRY || !over.length) continue;

  const got = await chatJson(SYSTEM,
    over.map((s) => `${s.id}  (currently ${s.say.split(/\s+/).length} words)\n  ${s.say}`).join('\n\n'),
    { maxTokens: 4000 });
  const by = new Map((got.lines || []).map((l) => [l.id, l.say]));

  const raw = JSON.parse(await readFile(path.join(ROOT, id, 'film.json'), 'utf8'));
  let n = 0;
  for (const s of over) {
    const line = by.get(s.id);
    if (!line) continue;
    const tgt = raw.shots.find((x) => x.id === s.id);
    console.log(`    ${s.id}`);
    console.log(`      was  ${s.say}`);
    console.log(`      now  ${line}`);
    tgt.say = line;
    /* The measurement belongs to the old line. Clearing it makes film-voice re-record this
       shot and nothing else. */
    delete tgt.said;
    delete tgt.words;
    n++;
  }
  await writeFile(path.join(ROOT, id, 'film.json'), `${JSON.stringify(raw, null, 2)}\n`);
  total += n;
}
console.log(`\n${total} line(s) shortened — re-record with: node tools/film-voice.mjs --all --missing`);
