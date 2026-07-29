/* Bring the already-approved Gupta sequence into the era system.

   `eras/gupta/era.json` was drafted by the seeder like every other era. But Gupta is not
   like every other era: its ten beats were hand-authored, fact-checked against a research
   agent, generated, chosen from two candidates each, rendered, scored and **approved by the
   user**. That work outranks a fresh draft.

   So the approved beats are imported and the draft is kept beside them as
   `era-draft.json` — nothing generated is thrown away, and the alternative stays readable
   if a beat from it is ever wanted.

   This runs once. It exists as a file rather than as a command I typed because the next
   era to be approved will need the same treatment, and because the reason for it should be
   written down.

     node tools/import-gupta.mjs
*/
import { readFile, writeFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { DIRECTIONS } from './directions.mjs';
import { ROOT } from './eras.mjs';

const GUPTA = DIRECTIONS.find((d) => d.id === 'v7-gupta-ink');
if (!GUPTA) throw new Error('v7-gupta-ink is not in directions.mjs');

const dir = path.join(ROOT, 'gupta');
const target = path.join(dir, 'era.json');
const draft = path.join(dir, 'era-draft.json');

if (await stat(draft).then(() => true, () => false)) {
  console.log('already imported — era-draft.json exists');
  process.exit(0);
}

// keep the seeded draft
await rename(target, draft);

/* The prompts in directions.mjs end with the RIGHT placement string, because that file
   composed it per beat. ink.mjs applies placement globally now, so it is stripped here or
   every Gupta prompt would state it twice. */
const RIGHT_RE = /\s*The subject stands in the right half of the frame\.[\s\S]*$/;

const era = {
  id: 'gupta',
  name: GUPTA.name,
  tagline: GUPTA.tagline,
  pitch: GUPTA.pitch,
  motion: GUPTA.motion,
  draft: false,
  approved: true,
  approvedNote: 'Hand-authored, fact-checked, generated, chosen from two candidates per beat, '
    + 'rendered as dist/v7-gupta-ink.mp4 and dist/v7-gupta-stinger.mp4, and approved by the user. '
    + 'The seeded draft is kept as era-draft.json.',
  source: 'tools/directions.mjs :: GUPTA (v7-gupta-ink)',
  beats: GUPTA.beats.map((b) => ({
    id: b.id,
    prompt: b.prompt.replace(RIGHT_RE, '').replace(/\s+/g, ' ').trim(),
    era: { hi: b.era.hi, en: b.era.en, when: b.era.when, line: b.era.line },
  })),
};

await writeFile(target, `${JSON.stringify(era, null, 2)}\n`);
console.log(`imported ${era.beats.length} approved beats -> ${target}`);
console.log(`seeded draft kept at ${draft}`);
