/* The vertical cut, rewritten for a feed rather than a lecture.

   The old format asked for "exactly 7 lines, each a separate fact", sayable in about 45
   seconds. Measured, that loses the viewer at second seven — the best-performing Shorts on the
   channel hold 0:07 and 0:08 of a 45-60 second runtime, roughly 15% watched.

   Seven parallel facts give a viewer no reason to stay for the second one. Nothing is open. A
   feed rewards an unresolved question, and a list has none.

   So this writes a different shape:

     HOOK     one concrete, strange image or claim, landing inside 1.5 seconds
     TURN     why that is strange — the thing that should not be true
     BODY     three beats, each adding one new concrete detail, escalating
     PAYOFF   resolves the hook with the fact that recontextualises it
     LOOP     the payoff should make the hook land harder on a rewatch

   Script only. No video, no Azure image or Sora spend — the writing is what failed, and it
   costs a fraction of a cent to check, so it gets checked first.

     node tools/hook-script.mjs --slug aryabhata
     node tools/hook-script.mjs --slug aryabhata --print   # don't write, just show
*/
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chatJson } from './llm.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const SLUG = arg('slug', null);
if (!SLUG) { console.error('usage: node tools/hook-script.mjs --slug <slug>'); process.exit(1); }
const EP = path.join('episodes', SLUG);
const OUT = path.join(EP, 'hook-script.json');

const ep = JSON.parse(await readFile(path.join(EP, 'episode.json'), 'utf8'));
const body = (ep.panels || []).map((p) => p?.text?.en || '').filter(Boolean).join('\n');

const SYSTEM = `You write 30-second vertical video scripts about Indian history for a feed where
the viewer's thumb is already moving. You are not writing a summary and not writing a lecture.

THE ONLY THING THAT MATTERS is that the viewer does not leave. They will leave in under two
seconds unless something is unresolved. So the first line opens a loop and the last line closes
it. Everything between raises the stakes.

SHAPE — exactly 6 lines:
  1. HOOK    5-11 words. One concrete, physical, strange image or claim. It must be sayable in
             under 1.5 seconds and must leave something unexplained.
  2. TURN    8-16 words. Why that is strange. What should not be possible about it.
  3-5. BODY  8-16 words each. One new concrete detail each, escalating. Each line must make the
             previous one MORE surprising, not merely add to it.
  6. PAYOFF  8-18 words. Resolves the hook. It should make line 1 land harder on a rewatch.

HARD RULES
- The hook is never a generic question. Never "Did you know", never "What if", never "Imagine".
  Open on the object, the number, or the act. "A clerk in Kerala wrote calculus in verse."
- THE HOOK MUST BE UNDERSTOOD WITHOUT KNOWING ANYTHING. No proper noun in line 1 that a
  stranger would not recognise — no place names, no Sanskrit titles, no dynasty names. "A young
  scholar says the Earth spins" survives a feed; "In Kusumapura's moonlight, a scholar..." makes
  the viewer parse an unknown word at the exact moment they decide whether to stay. Famous names
  a general audience knows (Ashoka, Taj Mahal, the Ganges) are allowed.
- Concrete nouns and active verbs. No abstractions where an object will do.
- No grand vague flourishes — nothing "commands the heavens", nothing is "lost to time", nothing
  "changes everything". If a line could sit in any other video, it is wrong.
- Present tense throughout. It is happening now, not in 499 CE.
- No connective tissue: never open a line with and, so, then, but, meanwhile, however.
- Nothing may be claimed that the source text does not claim. No invented numbers, no invented
  quotations. If the source hedges, hedge.
- Do not name the same proper noun in two consecutive lines.
- Total 55-95 words. It must be sayable, unhurried, in 28-34 seconds.
- Plain modern English. A fifteen-year-old must follow every line on first hearing.

Also return:
  "title"  under 60 characters, the curiosity in the hook made searchable. No clickbait that
           the script does not pay off.
  "why"    one sentence: what the open loop is, and what closes it.

Each line also gets "kick": a two or three word label in plain words, set above the line on
screen. It names what the line is about — not the role it plays. "THE BOAT", "SAND TABLE",
"121 VERSES". Never "HOOK", never "PAYOFF".

Return JSON only:
{"title":"...","lines":[{"role":"hook","kick":"...","text":"..."},{"role":"turn","kick":"...","text":"..."},
 {"role":"body","kick":"...","text":"..."},{"role":"body","kick":"...","text":"..."},
 {"role":"body","kick":"...","text":"..."},{"role":"payoff","kick":"...","text":"..."}],"why":"..."}`;

const USER = `Story: ${ep.title}
Figure: ${ep.figure || '(none)'}
Era: ${ep.era || ''}

THE SOURCE. Claim nothing this does not claim:
${body.slice(0, 6000)}`;

const ROLES = ['hook', 'turn', 'body', 'body', 'body', 'payoff'];
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/* Checked rather than trusted, and re-rolled by naming the specific line that is wrong — the
   same loop the old script generator learned to use, because asking for the whole thing again
   makes the model rewrite lines that were already right. */
function faults(got) {
  const bad = [];
  const lines = Array.isArray(got?.lines) ? got.lines : [];
  if (lines.length !== 6) return [`there must be exactly 6 lines, you returned ${lines.length}`];
  lines.forEach((l, i) => {
    const n = words(l?.text);
    const role = ROLES[i];
    if (l?.role !== role) bad.push(`line ${i + 1} must have role "${role}"`);
    if (i === 0 && (n < 5 || n > 11)) bad.push(`line 1 (hook) is ${n} words, needs 5-11`);
    if (i > 0 && (n < 8 || n > 18)) bad.push(`line ${i + 1} is ${n} words, needs 8-18`);
    if (/^(and|so|then|but|meanwhile|however|yet|thus)\b/i.test(String(l?.text || '').trim())) {
      bad.push(`line ${i + 1} opens with connective tissue — start on the thing itself`);
    }
    if (i === 0 && /^(did you know|what if|imagine|have you)/i.test(String(l?.text || '').trim())) {
      bad.push('line 1 uses a generic hook opener — open on the object, number or act');
    }
    const k = String(l?.kick || '').trim();
    if (!k || k.split(/\s+/).length > 3) bad.push(`line ${i + 1} needs a kicker of 1-3 words`);
    if (/^(hook|turn|body|payoff|the claim)$/i.test(k)) bad.push(`line ${i + 1} kicker names its role, not its content`);
  });
  const total = lines.reduce((a, l) => a + words(l?.text), 0);
  if (total < 55 || total > 95) bad.push(`the whole script is ${total} words, needs 55-95`);
  if (!got?.title || got.title.length > 60) bad.push('title must be present and under 60 characters');
  return bad;
}

let got = null; let bad = [];
for (let attempt = 1; attempt <= 4; attempt++) {
  const user = attempt === 1 ? USER
    : `${USER}\n\nYour previous answer was:\n${JSON.stringify(got, null, 2)}\n\n`
      + `These lines are wrong:\n${bad.map((b) => `- ${b}`).join('\n')}\n\n`
      + 'Return all six lines again. Change ONLY the lines named above; copy every other line exactly.';
  got = await chatJson(SYSTEM, user, { maxTokens: 1400 });
  bad = faults(got);
  if (!bad.length) break;
  console.log(`  attempt ${attempt}: ${bad.length} fault(s)\n${bad.map((b) => `    - ${b}`).join('\n')}`);
}
if (bad.length) { console.error(`\n  gave up after 4 attempts:\n${bad.map((b) => `    - ${b}`).join('\n')}`); process.exit(1); }

const total = got.lines.reduce((a, l) => a + words(l.text), 0);
console.log(`\n  ${ep.title}`);
console.log(`  title: ${got.title}\n`);
for (const [i, l] of got.lines.entries()) {
  console.log(`  ${String(i + 1).padStart(2)}. ${l.role.toUpperCase().padEnd(7)} ${l.text}`);
}
console.log(`\n  ${total} words — about ${(total / 2.6).toFixed(0)}s spoken`);
console.log(`  loop: ${got.why}`);

if (!has('print')) {
  await writeFile(OUT, `${JSON.stringify({ ...got, slug: SLUG, at: new Date().toISOString() }, null, 2)}\n`);
  console.log(`\n  -> ${OUT}`);

  /* Written in short.json's shape as well, so tools/short.mjs picks it up unchanged and the
     whole proven chain — voice, type capture, picture, loudness — runs without a fork. The
     only difference downstream is six beats instead of seven, which also means six Sora
     clips rather than seven. */
  const asShort = {
    lines: got.lines.map((l) => ({ text: l.text, kick: String(l.kick).toUpperCase(), beat: l.role })),
    why: got.why,
    title: got.title,
    format: 'hook-v1',
  };
  const SHORT = path.join(EP, 'short.json');
  await writeFile(SHORT, `${JSON.stringify(asShort, null, 2)}\n`);
  console.log(`  -> ${SHORT}  (replaces the 7-fact script)`);
}
