/* Which two beats of an era introduce *this* story.

   An era's stinger defaults to its first and third beats. That is a reasonable era-level
   answer and a bad episode-level one: the Gupta default is a gold coin and the turning
   Earth, so an episode about zero opened on Aryabhata's beat. Every episode in the series
   played the same fifteen seconds, and one of them was about a different story.

   So the beats are chosen per episode, from that era's own set, by what the story is
   actually about. The era stays the era — same language, same lamp, same cards — and the
   two beats in front of each episode are the two that belong to it.

     node tools/stinger.mjs --slug zero --era gupta
     node tools/stinger.mjs --slug zero --era gupta --dry
     node tools/stinger.mjs --slug zero --era gupta --beats 02-shunya,01-dinara
*/
import { readFile, writeFile, mkdir, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { chatJson } from './llm.mjs';
import { loadEra } from './eras.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const SLUG = arg('slug', null);
const ERA = arg('era', 'gupta');
const MANUAL = arg('beats', null);
const DRY = argv.includes('--dry');
const FORCE = argv.includes('--force');

if (!SLUG) { console.error('usage: node tools/stinger.mjs --slug <episode-slug> --era <era>'); process.exit(1); }

const EP = path.join('episodes', SLUG);
const FILE = path.join(EP, 'stinger.json');
const ep = JSON.parse(await readFile(path.join(EP, 'episode.json'), 'utf8'));
const era = await loadEra(ERA);

if (!FORCE && !MANUAL && await stat(FILE).then(() => true, () => false)) {
  const have = JSON.parse(await readFile(FILE, 'utf8'));
  console.log(`${FILE} already exists: ${have.beats.join(', ')} — pass --force to rechoose`);
  process.exit(0);
}

const catalogue = era.beats.map((b) => `${b.id}  ${b.era.en}  (${b.era.when || '—'})  — ${b.era.line || ''}`).join('\n');

const SYSTEM = `You choose which two beats of a title sequence introduce a specific episode.

The title sequence is a procession of an era's defining objects, one per beat. Every episode
in the series is introduced by two of them, played back to back for about fifteen seconds
before the story begins.

Pick the beats that belong to THIS episode. Return JSON only:

{
  "subject": "<id>",
  "openers": ["<id>", "<id>", "<id>"],
  "why": "one sentence on why the subject beat, and what the first opener sets up",
  "rejected": "one sentence on the strongest beat you did not pick, and why not"
}

How to choose:

- **"subject" is the episode's own beat.** If the era has a beat that is literally what this
  story is about, that is it. It plays last — the sequence ends on the thing the viewer is
  about to watch, and the story begins. If no beat is literally the subject, pick the one
  whose meaning is closest, and say so in "why" rather than pretending.
- **"openers" is three beats, ranked, that could set the world this story happens in** — the
  thing that says which century and which civilisation. Give three, best first, all of them
  defensible. None may be the subject beat.

  Three, and not one, because the obvious answer — the widest and most familiar object of the
  era — has exactly one right answer, so every episode opened on the same beat and the channel
  had a single title sequence with a different second half. Which of your three is used is
  decided outside this prompt, by what the rest of the series has already opened on.
- Order matters in the final pair: wide, then narrow. Never narrow then wide.

Use only ids from the list you are given.`;

/* What the rest of the series already opens on.

   Without this the model cannot avoid a collision it cannot see, and the instruction above is
   unenforceable. Read from the siblings' own stinger.json rather than kept in a table, so it
   is true of what was actually built. */
const siblings = [];
for (const d of await readdir('episodes').catch(() => [])) {
  if (d === SLUG) continue;
  const j = await readFile(path.join('episodes', d, 'stinger.json'), 'utf8')
    .then(JSON.parse).catch(() => null);
  if (j?.era === ERA && j.beats?.length) siblings.push({ slug: d, beats: j.beats });
}
const openerCount = new Map();
const usedPairs = new Set();
for (const s of siblings) {
  openerCount.set(s.beats[0], (openerCount.get(s.beats[0]) || 0) + 1);
  usedPairs.add(s.beats.join('>'));
}
const usage = era.beats.map((b) => {
  const n = openerCount.get(b.id) || 0;
  return `${b.id}  — opens ${n} episode(s)${n ? `: ${siblings.filter((s) => s.beats[0] === b.id).map((s) => s.slug).join(', ')}` : ''}`;
}).join('\n');

/* The model is told the ids and returns them without their numeric prefix often enough to
   matter — "kavya" for "08-kavya" — which failed validation and lost the whole choice. The
   prefix is ours, not the model's, so resolving a bare name to it is reading the answer given
   rather than insisting on the format asked for. Ambiguity is still an error. */
function resolveBeat(raw) {
  const id = String(raw || '').trim();
  if (!id) return null;
  const ids = era.beats.map((b) => b.id);
  if (ids.includes(id)) return id;
  const hits = ids.filter((x) => x === id || x.replace(/^\d+-/, '') === id.replace(/^\d+-/, ''));
  return hits.length === 1 ? hits[0] : null;
}

const user = `EPISODE: ${ep.title}
FIGURE: ${ep.figure || '—'}
ERA: ${ep.era || '—'}
WHAT IT IS ABOUT: ${ep.moral || ep.hero || '—'}

OPENING NARRATION
${ep.panels.slice(0, 6).map((p) => p.text.en).join('\n')}

THE "${era.name}" SEQUENCE — available beats:
${catalogue}

ALREADY USED as the opening beat elsewhere in this series:
${usage}`;

if (DRY) {
  console.log(`${SLUG} <- ${ERA}: ${era.beats.length} beats to choose from; nothing sent\n`);
  console.log(catalogue);
  process.exit(0);
}

let chosen;
let why = 'chosen by hand';
let rejected = null;
let opener = null;

if (MANUAL) {
  chosen = MANUAL.split(',').map((s) => s.trim());
} else {
  console.log(`choosing the ${ERA} beats for ${SLUG}...`);
  const got = await chatJson(SYSTEM, user, { maxTokens: 1200 });
  const subject = resolveBeat(got.subject);
  if (!subject) { console.error(`not a beat of ${ERA}: ${got.subject}`); process.exit(1); }
  const openers = (Array.isArray(got.openers) ? got.openers : [])
    .map(resolveBeat).filter((id) => id && id !== subject);
  why = got.why || '';
  rejected = got.rejected || null;

  /* The spread is decided here, not asked for.

     Told to "prefer an unused beat", the model still opened eight of thirteen episodes on the
     same one: the widest object of an era is a single right answer and a preference does not
     outweigh it. So the model supplies three defensible openers and this picks between them.

     What must not repeat is the *pair*, not the opener. Two episodes sharing an opening beat
     but ending on different subjects are two different sequences; two episodes with the same
     pair are the same fifteen seconds twice, which is what chandragupta-i and chandragupta-ii
     became when only the opener was balanced. */
  if (!openers.length) { console.error('no usable openers returned'); process.exit(1); }

  /* The opener should also precede the subject in the era's own order.

     Two rules were quietly fighting. The sequence accelerates, so the pair is sorted into era
     order — a short beat must not play before a long one. But the subject has to play last,
     because the sequence ends on the thing the viewer is about to watch. When the subject is an
     early beat, sorting puts it first and the episode about zero opened on zero and ended on
     the Huns. Preferring an opener that already precedes the subject satisfies both. */
  const order = era.beats.map((b) => b.id);
  const score = (id) => [
    usedPairs.has(`${id}>${subject}`) ? 1 : 0,               // never repeat a pair
    order.indexOf(id) < order.indexOf(subject) ? 0 : 1,      // then keep the acceleration
    openerCount.get(id) || 0,                                // then spread the openers
    openers.indexOf(id),                                     // then the model's own ranking
  ];
  opener = [...openers].sort((a, b) => {
    const sa = score(a); const sb = score(b);
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] - sb[i];
    return 0;
  })[0];
  if (usedPairs.has(`${opener}>${subject}`)) {
    console.warn(`  ! every candidate pair is already used in this era; ${opener} -> ${subject} repeats one`);
  } else if (opener !== openers[0]) {
    console.log(`  opener: ${openers[0]} ranked first but ${opener} spreads the series better`);
  }
  chosen = [opener, subject];
}

/* The model is given the ids and still occasionally invents one, or picks the same beat
   twice. Both would render — build-version would just quietly produce a one-beat stinger —
   so they are caught here. */
const have = new Map(era.beats.map((b) => [b.id, b]));
const bad = chosen.filter((id) => !have.has(id));
if (bad.length) { console.error(`not beats of ${ERA}: ${bad.join(', ')}`); process.exit(1); }
if (new Set(chosen).size !== 2) { console.error(`need two distinct beats, got: ${chosen.join(', ')}`); process.exit(1); }

/* Era order is the tie-break, not the rule.

   The sequence accelerates, so playing beat 7 before beat 2 plays a short beat before a long
   one. That was written as an unconditional sort, and it silently outranked the thing it was
   supposed to serve: the sequence must END on the story's own subject, because that is the
   thing the viewer is about to watch. For the zero episode the model chose to open on the Huns
   — Brahmagupta wrote in the post-Gupta north-west, and its reasoning said so — and the sort
   turned that into an episode that opened on zero and ended on an invasion.

   So a hand-picked pair and a chosen opener-then-subject pair are left alone. Only the manual
   path, where nothing has declared which beat is the subject, is sorted. */
if (MANUAL) {
  const order = era.beats.map((b) => b.id);
  chosen.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

await mkdir(EP, { recursive: true });
await writeFile(FILE, `${JSON.stringify({ era: ERA, beats: chosen, why, rejected }, null, 2)}\n`);

console.log('');
for (const id of chosen) {
  const b = have.get(id);
  console.log(`  ${id.padEnd(20)} ${b.era.en}`);
  console.log(`  ${' '.repeat(20)} ${b.era.line || ''}`);
}
console.log(`\n  why       ${why}`);
if (rejected) console.log(`  not used  ${rejected}`);
console.log(`\n-> ${FILE}`);
