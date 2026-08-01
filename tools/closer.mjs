/* The closing cards: what the episode said, in its own terms, with no voice over it.

   The film ends on one held abstract take with four lines of type over it and then the
   wordmark. Nothing is spoken there, which changes what may be written: **a card with no
   narration over it is read as fact.** So the lines are not new claims. They are the
   episode's own findings restated, and every one of them has to be traceable to something
   the narration actually says.

   For the first episode these were quotations from Brahmagupta's own treatise, which I could
   write by hand because I knew them. Fifteen stories cannot be hand-written that way without
   inventing quotations, which is the one failure mode this file exists to avoid — so the
   lines are derived from the narration and then checked against it.

     node tools/closer.mjs --slug zero
     node tools/closer.mjs --slug nalanda --force

   Writes episodes/<slug>/closer.json, which tools/make-outro.mjs prefers over its own table.
*/
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chatJson } from './llm.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const SLUG = arg('slug', null);
if (!SLUG) { console.error('usage: node tools/closer.mjs --slug <slug>'); process.exit(1); }
const EP = path.join('episodes', SLUG);
const OUT = path.join(EP, 'closer.json');

if (!has('force')) {
  const already = await readFile(OUT, 'utf8').then(JSON.parse).catch(() => null);
  if (already) {
    console.log(`${OUT} exists — ${already.cards.length} cards. --force to rewrite.`);
    for (const c of already.cards) console.log(`  ${c.en}${c.when ? `  · ${c.when}` : ''}`);
    process.exit(0);
  }
}

const ep = JSON.parse(await readFile(path.join(EP, 'episode.json'), 'utf8'));
const narration = ep.panels.map((p) => p.text?.en).filter(Boolean).join('\n');

const SYSTEM = `You write the closing type for an episode of a documentary series on Indian history.

The close is one held abstract image with FOUR short lines over it and then a fifth card
naming the source and its date. Nothing is spoken. The viewer reads it.

WHAT THE FOUR LINES ARE
They are the episode's findings, stated plainly — the thing a viewer should be able to
repeat afterwards. Concrete results, rules, methods or consequences. Not a moral, not a
summary sentence, not praise.

HARD RULES
1. Every line must be supported by the narration you are given. Do not add facts, dates,
   names or numbers that are not in it. You are restating, not researching.
2. Because nothing is spoken over these, a line that needs context to be true is false.
   Never write a claim the figure got wrong, or a disputed attribution, unless the line
   itself says it is disputed.
3. Maximum 8 words per line. They are set large and must not wrap to three lines.
4. Use figures, not words, for numbers: "628 CE", "300 years", "8 planets". These are read,
   not spoken, so the no-numerals rule for narration does not apply.
5. No trailing ellipses, no rhetorical questions, no second person.
6. Plain declaratives. Prefer the concrete: what was measured, written, built or changed.

THE FIFTH CARD
Names the source the episode rests on and its date — a treatise, an inscription, a
chronicle, an excavation. Set as the title of the work in capitals, with the date in the
"when" field. If the narration names no single source, use the place and the period instead
(e.g. "NALANDA MAHAVIHARA" / "5th–12th century"). Never invent a title.

Return JSON:
{
  "cards": [
    {"en": "..."}, {"en": "..."}, {"en": "..."}, {"en": "..."},
    {"en": "TITLE OF THE SOURCE", "when": "628 CE"}
  ],
  "grounding": ["for each of the first four lines, the phrase from the narration it rests on"]
}`;

const user = `Episode: ${ep.title}
Figure: ${ep.figure || '(none named)'}
Era: ${ep.era || ''}

NARRATION
${narration}`;

const got = await chatJson(SYSTEM, user, { maxTokens: 3000 });

/* Checked, not trusted. The point of the file is that these lines are safe to put on screen
   without a voice explaining them, so the constraints that make them safe are enforced here
   rather than hoped for. */
const problems = [];
const cards = Array.isArray(got.cards) ? got.cards : [];
if (cards.length !== 5) problems.push(`${cards.length} cards, expected 5`);
for (const [i, c] of cards.entries()) {
  const en = String(c?.en || '').trim();
  if (!en) { problems.push(`card ${i + 1} is empty`); continue; }
  const words = en.split(/\s+/).length;
  if (words > 8) problems.push(`card ${i + 1} is ${words} words: "${en}"`);
  if (/\?$|\.\.\.$|…$/.test(en)) problems.push(`card ${i + 1} trails off or asks: "${en}"`);
  if (/\byou\b|\byour\b/i.test(en)) problems.push(`card ${i + 1} addresses the viewer: "${en}"`);
  if (i === 4 && !c.when) problems.push('the fifth card has no date');
  if (i < 4 && c.when) problems.push(`card ${i + 1} is a line, not a citation — it should have no date`);
}
/* Spot-check the grounding rather than take it on faith: a distinctive word from each line
   should appear somewhere in the narration. It does not prove the claim, but it catches a
   line that was invented wholesale, which is the failure that matters. */
const hay = narration.toLowerCase();
const STOP = new Set(['the', 'and', 'that', 'with', 'from', 'into', 'this', 'their', 'were', 'was',
  'for', 'his', 'her', 'its', 'are', 'has', 'had', 'not', 'but', 'all', 'one', 'two', 'first']);
for (const [i, c] of cards.slice(0, 4).entries()) {
  const words = String(c?.en || '').toLowerCase().match(/[a-z]{4,}/g) || [];
  const known = words.filter((w) => !STOP.has(w) && hay.includes(w));
  if (words.length && !known.length) {
    problems.push(`card ${i + 1} shares no vocabulary with the narration: "${c.en}"`);
  }
}

if (problems.length) {
  console.error(`closing cards for ${SLUG} did not pass:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

await mkdir(EP, { recursive: true });
await writeFile(OUT, `${JSON.stringify({ slug: SLUG, cards, grounding: got.grounding || [] }, null, 2)}\n`);
console.log(`${SLUG} -> ${OUT}`);
for (const c of cards) console.log(`  ${c.en}${c.when ? `  · ${c.when}` : ''}`);
