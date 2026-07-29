/* The cold open — the first eight seconds, which decide the rest.

   The episode's own opening line comes from the source project and is written to introduce
   a story, not to stop a scroll. Sometimes that is the same thing: episode one opens
   "Kusumapura, 499 CE ... a young Aryabhata dares to say: the Earth turns", which is a
   place, a date and a man saying something outrageous. Often it is not: the zero episode
   opened on a subordinate clause, delayed its subject, and gave away its own ending.

   Across a hundred and ninety-nine stories that is not a thing to fix by hand. So the
   channel writes its own first line — one claim, in the narrator's voice, before anything
   else — and the source narration continues untouched behind it.

   Two things make this more than a louder sentence:

   - **It is spoken by the same narrator at the same rate**, from tools/voice.mjs, so it
     does not sound bolted on.
   - **It plays over the thumbnail's own artwork.** A viewer who clicked a picture of a man
     holding a glowing disc lands on that picture, moving. The join between what was
     promised and what arrives is where attention is usually lost.

     node tools/hook.mjs --slug zero --dry     # write the candidates, synthesise nothing
     node tools/hook.mjs --slug zero
     node tools/hook.mjs --slug zero --pick 3  # use a different candidate
*/
import { readFile, writeFile, mkdir, stat, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { chatJson } from './llm.mjs';
import { synth, seconds, foldToWritten } from './voice.mjs';
import { speakYears } from './years.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const SLUG = arg('slug', null);
const PICK = arg('pick', null);
const DRY = argv.includes('--dry');
const FORCE = argv.includes('--force');

if (!SLUG) { console.error('usage: node tools/hook.mjs --slug <episode-slug>'); process.exit(1); }

const EP = path.join('episodes', SLUG);
const OUT = path.join(EP, 'hook');
const FILE = path.join(OUT, 'hook.json');
const ep = JSON.parse(await readFile(path.join(EP, 'episode.json'), 'utf8'));
const meta = await readFile(path.join(EP, 'publish.json'), 'utf8').then(JSON.parse).catch(() => ({}));

if (!FORCE && !PICK && await stat(FILE).then(() => true, () => false)) {
  console.log(`${FILE} already exists — pass --force to rewrite`);
  process.exit(0);
}

const SYSTEM = `You write the opening line of a YouTube history documentary.

It is the first thing said, over a single held image, before any titles. It has one job: to
make stopping cheaper than scrolling. Everything after it is already written and good; this
line only has to earn the next ten seconds.

You will be given the episode's full narration. Return JSON only:

{
  "hooks": [
    { "text": "...", "why": "...", "risk": "none|mild|overclaim" }
  ]
}

Five candidates, ranked best first. Each one:

- **12 to 26 words.** It is spoken aloud in about 6-9 seconds. Longer and the titles arrive
  after the viewer has already decided.
- **Opens on something concrete** — a place, a year, a person, an object, a number. Never on
  a subordinate clause ("In the age after...", "At a time when..."), which delays the subject
  past the point where anyone is still listening.
- **States a claim, and stops on the sharp part of it.** The last three words are the ones
  that are remembered, so the startling thing goes at the end, not in the middle.
- **Asserts something.** This is the whole job. Somebody *did* something, *said* something,
  *proved* something — or a flat astonishing fact is stated outright. The line must contain
  something a viewer could disagree with.

  What is withheld is the **how and the why**, never the what. "He said the Earth turns" is
  a hook: you have the claim and not the argument. "He wondered what would happen if the
  Earth turned" is not — nothing has been asserted, so there is nothing to resist and
  nothing to resolve.

  Banned constructions, because they describe a person having a thought rather than making
  a claim: *wondering*, *pondering*, *asks himself*, *sets out to discover*, *begins the
  long journey*, *would one day*, *little did he know*. If the main verb of your line is
  "stands", "sits", "watches" or "wonders", rewrite it.
- **Is true.** Every fact must be supported by the narration, or be uncontroversial general
  knowledge a historian would not dispute. Mark anything you are stretching as "overclaim"
  rather than quietly shipping it — a history channel pays twice for a click it has to
  defend in the comments.
- **Contains no numerals.** Write years as words ("four ninety-nine", not "499"), because
  this is read by a speech synthesiser.
- Plain prose. No rhetorical questions to camera, no "imagine if", no second person.

A line that works, for reference: "Kusumapura, four ninety-nine. Under the quiet stars of
Gupta Magadha, a young Aryabhata dares to say: the Earth turns." Place, date, person, and an
assertion that lands on its last three words.

Vary the five: at least one that leads with a date and place, one that leads with the
person, one that leads with the object, and one built on a comparison to something the
viewer already knows. All five must still assert something.`;

const user = `TITLE: ${ep.title}
FIGURE: ${ep.figure || '—'}
ERA: ${ep.era || '—'}
MORAL: ${ep.moral || '—'}
CHOSEN YOUTUBE TITLE: ${meta.title || '—'}
THUMBNAIL SAYS: ${(meta.thumb?.lines || []).join(' ') || '—'}

The thumbnail and the title are read before this line is heard. Say a third thing.

NARRATION
${ep.panels.map((p) => p.text.en).join('\n')}`;

let doc = await readFile(FILE, 'utf8').then(JSON.parse).catch(() => null);

if (!doc || FORCE) {
  console.log(`writing the cold open for ${SLUG}...`);
  const got = await chatJson(SYSTEM, user, { maxTokens: 3000 });
  doc = { candidates: got.hooks || [], chosen: 0 };
  await mkdir(OUT, { recursive: true });
  await writeFile(FILE, `${JSON.stringify(doc, null, 2)}\n`);
}

console.log('\nCANDIDATES');
/* The prompt bans these; the model produces them anyway often enough to be worth catching.
   A line whose main verb is inert describes a person having a thought instead of making a
   claim, and there is nothing in it for a viewer to resist or resolve. */
const INERT = /\bwonder(s|ing|ed)?\b|\bponder|\basks? himself\b|\bsets? out to\b|\bbegins? the long\b|\bwould one day\b|\blittle did\b|\b(stands?|sits?|watch(es)?|gazes?|stares?) \b/i;
const OPENER = /^(in|at|during|after|before|when|while|amid|throughout|as) /i;

for (const [i, h] of doc.candidates.entries()) {
  const words = h.text.trim().split(/\s+/).length;
  const flags = [];
  if (INERT.test(h.text)) flags.push('inert verb — describes, does not assert');
  if (OPENER.test(h.text)) flags.push('opens on a subordinate clause');
  if (words < 12 || words > 26) flags.push(`${words} words, outside 12-26`);
  if (/\d/.test(h.text)) flags.push('contains a numeral — will be read as a quantity');
  console.log(`  ${i + 1}. ${h.text}`);
  console.log(`     ${words} words${h.risk && h.risk !== 'none' ? `  [${h.risk}]` : ''} — ${h.why}`);
  for (const f of flags) console.log(`     ! ${f}`);
}

if (PICK) doc.chosen = Number(PICK) - 1;
const chosen = doc.candidates[doc.chosen];
if (!chosen) { console.error(`no candidate ${doc.chosen + 1}`); process.exit(1); }

/* A numeral here would be read as a quantity — the same bug the year fix exists for. The
   model is told not to write one; this catches it when it does anyway. */
const written = chosen.text.trim();
const { text: spoken, changed } = speakYears(written);
if (/\d/.test(spoken)) {
  console.log(`\n  note: the line still contains digits — "${spoken.match(/\S*\d\S*/)[0]}" will be read as a quantity`);
}

if (DRY) {
  console.log(`\n--dry: chose #${doc.chosen + 1}, synthesised nothing`);
  process.exit(0);
}

console.log(`\nspeaking #${doc.chosen + 1}...`);
const { audio, words, voice } = await synth(spoken, { role: 'narrator', mood: 'suspense' });
await writeFile(path.join(OUT, 'hook.mp3'), audio);
const dur = await seconds(path.join(OUT, 'hook.mp3'));

/* The picture is the thumbnail's own plate, so the frame a viewer clicked is the frame they
   arrive on. Falling back to the cover's art keeps this working before a thumbnail has been
   picked, at the cost of that continuity. */
const plate = meta.thumb?.art
  || (await stat(path.join(EP, 'thumb-art', 'hold-r1.png')).then(() => 'thumb-art/hold-r1.png', () => null));
let art = null;
if (plate) {
  await copyFile(path.join(EP, plate), path.join(OUT, 'hook.png'));
  art = '../hook/hook.png';
} else {
  art = ep.panels.find((p) => p.id === 'cover')?.art || ep.panels[0].art;
  console.log('  no thumbnail plate — falling back to the cover art');
}

doc.line = written;
doc.spoken = spoken;
doc.dur = +dur.toFixed(3);
doc.voice = voice;
doc.art = art;
doc.words = foldToWritten(written, spoken, words);
await writeFile(FILE, `${JSON.stringify(doc, null, 2)}\n`);

console.log(`  "${written}"`);
console.log(`  ${dur.toFixed(1)}s · ${doc.words.length} caption tokens · ${voice}`);
if (changed.length) console.log(`  years spoken as years: ${changed.map((c) => `${c.from} -> ${c.to}`).join(', ')}`);
console.log(`\n-> ${FILE}`);
console.log('run build-episode.mjs to fold it into the episode');
