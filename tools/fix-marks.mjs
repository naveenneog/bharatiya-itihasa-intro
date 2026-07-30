/* Repair prompts that ask for writing without saying it is worn.

   The image model renders requested text as gibberish glyphs. The film author is told this and
   mostly obeys, but a handful slip through per film, and re-rolling a whole film to fix five
   shots throws away forty-seven good ones. So the qualifier is appended in place.

     node tools/fix-marks.mjs --id zero-objection
     node tools/fix-marks.mjs --all
*/
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { listFilms, ROOT } from './films.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const ids = argv.includes('--all') ? await listFilms() : [arg('id', null)].filter(Boolean);
if (!ids.length) { console.error('usage: node tools/fix-marks.mjs --id <film> | --all'); process.exit(1); }

const ASKS = /\binscription\b|\bwriting\b|\bletters\b|\bnumerals?\b|\btext\b/i;
const SAFE = /incised|unreadable|indistinct|worn|eroded/i;
const QUALIFY = ' The marks are worn, eroded and completely indistinct — no legible letter, digit or word anywhere.';

let total = 0;
for (const id of ids) {
  const f = path.join(ROOT, id, 'film.json');
  const film = JSON.parse(await readFile(f, 'utf8'));
  let n = 0;
  for (const s of film.shots || []) {
    if (ASKS.test(s.prompt) && !SAFE.test(s.prompt)) {
      s.prompt = s.prompt.trimEnd().replace(/\.?$/, '.') + QUALIFY;
      n++;
    }
  }
  if (n) await writeFile(f, `${JSON.stringify(film, null, 2)}\n`);
  console.log(`  ${id.padEnd(18)} ${n} prompt(s) qualified`);
  total += n;
}
console.log(`\n${total} repaired`);
