/* Find shots whose prompt still invites gibberish, and rewrite just those.

   The image model renders any requested writing as fake glyphs. Saying "worn, eroded and
   indistinct" reduces it and does not stop it — a sampled contact sheet still had legible-
   looking script in two shots of eight, which at fifty-seven shots is a dozen frames a viewer
   will notice.

   The only reliable rule is: **do not mention writing at all.** Where a mark is essential to
   the meaning, ask for geometry — one incised dot, one carved ring, one drilled circle. Those
   render perfectly, and in this film they are the subject anyway.

   Anachronisms get the same treatment. A previous pass produced an astrolabe and a book on a
   reading stand for a seventh-century Indian scene.

   Only the flagged shots are rewritten, and they are regenerated as a new revision, so nothing
   already good is touched or lost.

     node tools/degibber.mjs --all --dry
     node tools/degibber.mjs --all
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

/* Anything that asks the model to draw language, however hedged, plus the objects that came
   back anachronistic. "marks" and "notations" are included because the hedge itself is the
   tell: a prompt that says "worn indistinct marks" is still a prompt asking for marks.

   `\bwriting\b` rather than `\bwrit`, because "the writer's hand" asks for a hand. Matching the
   stem flagged three innocent shots and sent them round the rewriter twice for nothing. */
const RISK = /\binscri|\bwriting\b|\bletter|\bglyph|\bscript\b|\bnumeral|\btext\b|\bcharacters\b|\bmarks\b|\bnotation|\bsymbols\b|\bverse|\bmanuscript page|\bastrolabe|\bglobe\b|\btelescope|\bspectacle|\bprinted\b/i;

const SYSTEM = `You are fixing camera directions that will make an image model draw fake writing.

You will be given shot descriptions that mention writing, marks, symbols, inscriptions or
period-wrong objects. Rewrite each so it says the same thing about the story WITHOUT asking for
any language to be drawn.

Return JSON only: { "shots": [ { "id": "...", "prompt": "..." } ] }

The rules:

1. **Never mention writing, letters, script, numerals, symbols, marks, characters, text or an
   inscription.** Not even as "worn" or "indistinct" — the hedge does not work, the model draws
   glyphs anyway.
2. **Where a mark carries the meaning, ask for geometry instead**: a single incised dot, one
   drilled circle, a carved ring, a shallow round depression, a row of identical small pits.
   Geometry renders perfectly and in this film it is literally the subject.
3. **Otherwise move the camera off the writing**: the edge of a leaf rather than its face, the
   pen rather than the page, the hand rather than what it wrote, the stone's broken corner
   rather than its panel.
4. **No anachronisms.** Nothing later than the shot's own period — no astrolabe, no globe, no
   telescope, no spectacles, no printed book, no bound codex on a stand for an Indian scene of
   this age. Palm leaf, birch bark, cloth, stone, metal, clay.
5. Describe only the subject. Never the lighting, the lens or the colour — those are applied
   automatically. Do not use the words orange, saffron, amber or golden.

Keep each prompt roughly the same length and the same subject matter. You are changing what the
camera points at, not what the film is about.`;

let flagged = 0;
let fixed = 0;

for (const id of ids) {
  const f = path.join(ROOT, id, 'film.json');
  const film = JSON.parse(await readFile(f, 'utf8'));
  const bad = film.shots.filter((s) => RISK.test(s.prompt));
  flagged += bad.length;
  console.log(`\n  ${id}: ${bad.length}/${film.shots.length} shot(s) at risk`);
  if (!bad.length) continue;
  for (const s of bad.slice(0, 4)) console.log(`    ${s.id.padEnd(26)} ${s.prompt.slice(0, 88)}…`);
  if (bad.length > 4) console.log(`    … and ${bad.length - 4} more`);
  if (DRY) continue;

  const got = await chatJson(SYSTEM, `${bad.map((s) => `${s.id}\n  ${s.prompt}`).join('\n\n')}`, { maxTokens: 12000 });
  const by = new Map((got.shots || []).map((s) => [s.id, s.prompt]));
  let n = 0;
  for (const s of bad) {
    const p = by.get(s.id);
    if (!p) continue;
    if (RISK.test(p)) { console.log(`    ! ${s.id} still risky after rewrite — left alone`); continue; }
    s.prompt = p;
    n++;
  }
  await writeFile(f, `${JSON.stringify(film, null, 2)}\n`);
  fixed += n;
  console.log(`    ${n} rewritten`);
}

console.log(`\n${flagged} flagged, ${fixed} rewritten`);
if (fixed) console.log(`regenerate just those:  node tools/film-gen.mjs --all --what stills --shots <ids>`);
