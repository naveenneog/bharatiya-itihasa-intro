/* Who the thumbnail is of, and what they are holding.

   The four thumbnail concepts (gaze, defiant, hold, eye) are the same for every episode —
   they are compositions, and which one wins in a feed is a question about the shape, not
   the story. What changes per episode is the subject: a person, and one object that carries
   the claim.

   Writing that by hand is fine for one episode and impossible for a hundred and ninety-nine,
   and getting it wrong is expensive in a specific way: a thumbnail of a man in Mughal dress
   for a Gupta story is worse than no thumbnail, because it is confidently wrong.

   So it is written from the episode's own narration, with three constraints that exist
   because the obvious prompt gets each of them wrong:

   - **Period-specific dress.** "An Indian man in robes" produces a generic sadhu for every
     century of Indian history. The description must name the century and what people
     actually wore in it.
   - **One object, physically real.** An abstraction ("the concept of zero") cannot be
     photographed. The object has to be a thing that could sit on a table.
   - **No text on the object.** The image model renders inscriptions as gibberish glyphs,
     and a thumbnail is looked at closely enough for that to show.

     node tools/subject.mjs --slug zero
     node tools/subject.mjs --slug zero --dry
*/
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { chatJson, withImages } from './llm.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const SLUG = arg('slug', null);
const DRY = argv.includes('--dry');
const FORCE = argv.includes('--force');

if (!SLUG) { console.error('usage: node tools/subject.mjs --slug <episode-slug>'); process.exit(1); }

const EP = path.join('episodes', SLUG);
const OUT = path.join(EP, 'thumb-art');
const FILE = path.join(OUT, 'subject.json');
const ep = JSON.parse(await readFile(path.join(EP, 'episode.json'), 'utf8'));

if (!FORCE && await stat(FILE).then(() => true, () => false)) {
  console.log(`${FILE} already exists — pass --force to overwrite`);
  process.exit(0);
}

const SYSTEM = `You write art direction for photographic thumbnails of Indian history episodes.

You will be given an episode's narration AND images of the episode's own artwork, which is
painted in a bright illustrated style. Your job is to describe the SAME PERSON as a
photograph, so that a photoreal portrait of them and the episode's own art are recognisably
the same human being.

This is the whole point. A viewer clicks the thumbnail and then watches the episode. If the
thumbnail shows a bearded elder in a turban and the episode shows a moustached man in his
twenties, the viewer has been shown two different people and the join is obvious.

**Read the faces in the images, not the narration, for anything physical.** The narration
will not tell you whether he has a beard. The pictures will. Match, specifically:

- apparent age
- facial hair — a moustache alone, a full beard, or clean-shaven, and its colour
- hair — length, whether it is loose, tied, shaven, or covered
- headwear — a turban, a draped cloth, a bare head. These are not interchangeable.
- clothing — the garment, how it is draped, and its actual colours including any border
- jewellery actually shown — armlets, bracelets, earrings, a forehead mark
- build and skin tone

Return JSON only:

{
  "who": "the person's name, or a short description if the episode has no single figure",
  "matches": "one sentence naming the specific features you took from the artwork",
  "figure": "...",
  "object": "...",
  "held": "...",
  "why": "one sentence on why this object carries the episode's claim"
}

"figure" — 45-70 words. A physical description for a photographer, in the third person and
starting with an indefinite article ("A man in his late twenties, 7th-century Gujarat: ...").
Name the century and the region. Then describe the person **as the artwork shows them**,
using the list above. Say explicitly whether there is a beard, because leaving it out is how
a young man becomes an old one. Do not describe emotion, pose, lighting or background: those
belong to the composition, not the subject.

"object" — 15-30 words. One physical object the episode is actually about, described as it
would sit lit in the dark: material, age, form. It is seen *behind or above* the figure, so
it should read at a distance. Never an abstraction. Never anything with legible writing on
it; if the real object is inscribed, say the marks are worn and indistinct.

It must be **specific to this episode's claim**. If the same object could plausibly appear
on any other episode about a scholar or a king — an armillary sphere, a generic palm-leaf
scroll, an astrolabe, an unmarked sword, a crown — it is the wrong object, and two episodes
of this channel will end up wearing the same picture. Choose something the narration itself
names.

"held" — 10-25 words. Small enough to be cupped in two hands and glowing as the only light
source in the frame. This is the hardest of the three and the one that decides whether the
thumbnail works: it is seen at 320x180 pixels, so a viewer must be able to name its
silhouette in a quarter of a second. Favour a strong simple shape — a sphere, a ring, a
blade, a flame, a seal, a coin. Reject anything flat, fibrous, or shapeless (a page, a
cloth, a heap) even when it is the most literal object in the story: prefer the object that
*symbolises* the claim over the one that documents it. It must carry NO writing, marks or
numerals of any kind.

Rules:
- Physical detail comes from the images. Period, place and significance come from the text.
- If the episode's figure is a woman, the description must say so; do not default to a man.
- If the episode has no single human figure, describe the person the artwork actually shows
  doing the work the episode is about, and say so in "who".
- No text, letters, numerals or inscriptions anywhere in any description. If the real object
  is inscribed, say the marks are worn and indistinct.`;

/* The artwork is the reference, so it has to be in the message. The hero panel is the
   character sheet — it is drawn to establish who this is — and the cover backs it up. */
const refs = ['intro_hero', 'cover', 'p01']
  .map((id) => ep.panels.find((p) => p.id === id)?.art)
  .filter(Boolean)
  .map((rel) => path.join(EP, rel.replace('../', '')))
  .slice(0, 3);

const text = `TITLE: ${ep.title}
FIGURE: ${ep.figure || '—'}
ERA: ${ep.era || '—'}

The attached images are this episode's own artwork. Describe the person they show.

NARRATION
${ep.panels.map((p) => p.text.en).join('\n')}`;

if (DRY) {
  console.log(`${SLUG}: ${text.length} chars + ${refs.length} reference image(s); nothing sent`);
  for (const r of refs) console.log(`  ${r}`);
  process.exit(0);
}

console.log(`subject for ${SLUG} — reading ${refs.length} reference image(s)...`);
for (const r of refs) console.log(`  ${path.basename(r)}`);
const user = await withImages(text, refs);
const got = await chatJson(SYSTEM, user, { maxTokens: 2000 });

const problems = [];
for (const k of ['figure', 'object', 'held']) {
  if (!got[k] || got[k].length < 30) problems.push(`${k} is too thin to produce a consistent image`);
  /* The model is told not to ask for writing; it sometimes does anyway, and the result is
     always gibberish glyphs on an object the viewer is looking straight at. */
  if (/\binscri|\bletter|\bscript\b|\bwriting\b|\bnumeral|\btext\b/i.test(got[k] || '')
    && !/worn|indistinct|unreadable|illegible/i.test(got[k])) {
    problems.push(`${k} asks for writing without saying it is worn — expect gibberish glyphs`);
  }
}

await mkdir(OUT, { recursive: true });
await writeFile(FILE, `${JSON.stringify(got, null, 2)}\n`);

console.log(`\nWHO     ${got.who}`);
if (got.matches) console.log(`MATCHES ${got.matches}`);
console.log(`FIGURE  ${got.figure}`);
console.log(`OBJECT  ${got.object}`);
console.log(`HELD    ${got.held}`);
console.log(`WHY     ${got.why}`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s) — edit ${FILE} before generating:`);
  for (const p of problems) console.log(`  - ${p}`);
}
console.log(`\n-> ${FILE}`);
