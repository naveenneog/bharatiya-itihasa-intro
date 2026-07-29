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
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
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

Pick the two that belong to THIS episode. Return JSON only:

{
  "beats": ["<id>", "<id>"],
  "why": "one sentence on why these two, in this order",
  "rejected": "one sentence on the strongest beat you did not pick, and why not"
}

How to choose:

- **The second beat is the episode's own subject.** If the era has a beat that is literally
  what this story is about, it must be one of the two, and it goes last — the sequence ends
  on the thing the viewer is about to watch, and the story begins.
- **The first beat sets the world the story happens in.** It should be the widest or most
  familiar of the era's beats: the thing that says which century and which civilisation.
  It must not be the same beat as the second.
- If no beat is literally the story's subject, pick the one whose meaning is closest, and
  say so in "why" rather than pretending.
- Order matters: wide, then narrow. Never narrow then wide.

Use only ids from the list you are given. Two ids, never one, never three.`;

const user = `EPISODE: ${ep.title}
FIGURE: ${ep.figure || '—'}
ERA: ${ep.era || '—'}
WHAT IT IS ABOUT: ${ep.moral || ep.hero || '—'}

OPENING NARRATION
${ep.panels.slice(0, 6).map((p) => p.text.en).join('\n')}

THE "${era.name}" SEQUENCE — available beats:
${catalogue}`;

if (DRY) {
  console.log(`${SLUG} <- ${ERA}: ${era.beats.length} beats to choose from; nothing sent\n`);
  console.log(catalogue);
  process.exit(0);
}

let chosen;
let why = 'chosen by hand';
let rejected = null;

if (MANUAL) {
  chosen = MANUAL.split(',').map((s) => s.trim());
} else {
  console.log(`choosing the ${ERA} beats for ${SLUG}...`);
  const got = await chatJson(SYSTEM, user, { maxTokens: 1200 });
  chosen = got.beats || [];
  why = got.why || '';
  rejected = got.rejected || null;
}

/* The model is given the ids and still occasionally invents one, or picks the same beat
   twice. Both would render — build-version would just quietly produce a one-beat stinger —
   so they are caught here. */
const have = new Map(era.beats.map((b) => [b.id, b]));
const bad = chosen.filter((id) => !have.has(id));
if (bad.length) { console.error(`not beats of ${ERA}: ${bad.join(', ')}`); process.exit(1); }
if (new Set(chosen).size !== 2) { console.error(`need two distinct beats, got: ${chosen.join(', ')}`); process.exit(1); }

/* Keep them in the era's own order. The sequence accelerates, and a stinger that plays
   beat 7 before beat 2 plays a short beat before a long one — backwards. */
const order = era.beats.map((b) => b.id);
chosen.sort((a, b) => order.indexOf(a) - order.indexOf(b));

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
