/* Put figures back on the cards.

   The film author is told never to write a numeral, because a speech synthesiser reads a bare
   integer as a quantity — "628 CE" comes back as "six hundred and twenty-eight". That rule is
   correct for narration and was wrongly applied to the cards, which are read rather than
   spoken. Three films shipped cards saying "about six twenty-eight CE", which on screen looks
   exactly like the mistake it is.

   The same pass fixes two other things the author got wrong on cards: a stray space inside a
   word, and "when" fields that are not dates at all.

     node tools/fix-cards.mjs --all --dry
     node tools/fix-cards.mjs --all
*/
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chatJson } from './llm.mjs';
import { listFilms, ROOT } from './films.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);
const DRY = has('dry');

const ids = has('all') ? await listFilms() : (arg('id', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!ids.length) { console.error('usage: --all | --id <film-id>'); process.exit(1); }

const SYSTEM = `You are correcting on-screen title cards for a history film.

Return JSON only: { "cards": [ { "id": "...", "en": "...", "when": "..." } ] }
One entry per card given, same order, same meaning.

Fix exactly these things and change nothing else:

1. **Dates must use figures.** These cards are read on screen, not spoken. "about six
   twenty-eight CE" becomes "c. 628 CE". "eight seventy-six CE" becomes "876 CE".
   "sixth-seventh century CE" becomes "6th-7th century CE".
2. **"when" must be a date.** If it currently says something like "Across centuries",
   "A layered manuscript" or "Walking back in time", replace it with the actual period the
   card refers to, taken from the film's own narration. If the card genuinely has no date —
   a card reading NOW, for instance — use "present day".
3. **Fix broken words.** A card reading "BRAHMASP HUTASIDDHANTA" has a stray space in it.
4. Keep the card's own case. If it is upper case, leave it upper case.
5. Keep "en" to at most four words. Do not rewrite it unless it is broken.

Use "c." for approximate dates and leave certain ones bare.`;

for (const id of ids) {
  const f = path.join(ROOT, id, 'film.json');
  const film = JSON.parse(await readFile(f, 'utf8'));
  const cards = film.shots.filter((s) => s.type);
  if (!cards.length) continue;

  console.log(`\n  ${id}: ${cards.length} card(s)`);
  for (const s of cards) console.log(`    ${s.id.padEnd(24)} ${JSON.stringify(s.type.en)}  ${s.type.when || ''}`);
  if (DRY) continue;

  const user = `FILM: ${film.title} — ${film.spine}

CARDS
${cards.map((s) => `${s.id}\n  en: ${s.type.en}\n  when: ${s.type.when || '(none)'}`).join('\n\n')}

NARRATION, for the dates
${film.shots.filter((s) => s.say).map((s) => s.say).join('\n')}`;

  const got = await chatJson(SYSTEM, user, { maxTokens: 3000 });
  const by = new Map((got.cards || []).map((c) => [c.id, c]));
  let n = 0;
  for (const s of cards) {
    const g = by.get(s.id);
    if (!g) continue;
    if (g.en) s.type.en = g.en;
    if (g.when) s.type.when = g.when;
    n++;
  }
  await writeFile(f, `${JSON.stringify(film, null, 2)}\n`);
  console.log(`    -> ${n} corrected`);
  for (const s of cards) console.log(`    ${s.id.padEnd(24)} ${JSON.stringify(s.type.en)}  ${s.type.when || ''}`);
}
