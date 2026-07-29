/* Draft an era's beats from its own stories.

   Nineteen eras at ten beats each is a hundred and ninety beats, every one of which needs a
   concrete object, a Devanagari title, an English title, a date and a line of copy — and
   needs to be *true*. Hand-writing that is where this project would stop.

   So the beats are drafted from the era's real stories: the model is given the actual
   titles, eras, legends and morals from IndianHistory, plus the approved Gupta sequence as
   the worked example, and asked to choose the objects. It is grounded rather than
   imaginative on purpose — the failure mode here is confident invention, and an invented
   artefact survives all the way to a rendered frame.

   A draft is not a sequence. Every seeded era is written with `"draft": true` and must be
   read, corrected and fact-checked before generation. `tools/check-era.mjs` does the
   accuracy pass; `validateEra` catches the structural mistakes.

     node tools/seed-era.mjs gupta            # draft one
     node tools/seed-era.mjs --all            # draft every era that has none
     node tools/seed-era.mjs chola --beats 12
*/
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { loadStories, ERAS } from './stories.mjs';
import { chatJson } from './llm.mjs';
import { saveEra, validateEra, listEras, ROOT } from './eras.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);
const ALL = has('all');
const FORCE = has('force');
const NBEATS = Number(arg('beats', '10'));
const CONC = Number(arg('conc', '4'));

/* Positional arguments are era names. A flag that takes a value consumes the token after
   it, so those indices are excluded — otherwise `--conc 5` is read as an era called "5"
   and the actual request is silently dropped. */
const VALUE_FLAGS = new Set(['beats', 'conc']);
const consumed = new Set();
argv.forEach((a, i) => { if (a.startsWith('--') && VALUE_FLAGS.has(a.slice(2))) consumed.add(i + 1); });
const targets = argv.filter((a, i) => !a.startsWith('--') && !consumed.has(i));

/* The worked example. Showing the model what "good" looks like in this exact language is
   worth more than any amount of description — these are the beats the user approved. */
const EXAMPLE = `{
  "id": "01-dinara",
  "prompt": "A thick Gupta gold coin half-submerged in black water, its struck relief of a seated king with a lyre catching the light, black ink curling off its milled edge, flakes of gold leaf settling on its face.",
  "era": { "hi": "स्वर्ण युग", "en": "THE GOLDEN AGE", "when": "c. 320 – 550 CE",
           "line": "Two hundred years. Almost everything you think of as classical India." }
},
{
  "id": "04-vritta",
  "prompt": "A perfect circle drawn in liquid gold suspended in black water, with faint gold construction lines and a chord across it, the gold still bleeding softly outward at the edges of the stroke.",
  "era": { "hi": "वृत्त", "en": "THE CIRCLE", "when": "π ≈ 3.1416",
           "line": "62,832 to 20,000. Four decimal places, fifteen centuries ago." }
}`;

const SYSTEM = `You author beats for a title sequence called "Ink and Light", for a history channel
about India. You are precise, sceptical, and you never invent an artefact.

THE FORM
Each beat is ONE object, photographed as high-speed macro photography: ink and liquid gold
blooming through black water against pure black. The object surfaces out of the ink. A beat
is a *thing you could hold*, not a scene, not a battle, not a landscape, and never a crowd.

WHY OBJECTS: the sequence must survive a one-second glance on a phone. A single lit object
against black reads instantly. A scene does not.

RULES FOR THE PROMPT FIELD
- Name one object and describe how ink and gold interact with it. 25-45 words.
- Physical and specific: material, surface, edge, what the light catches.
- NEVER describe lighting, camera, aspect ratio, colour palette or background — those are
  applied globally and restating them is an error.
- Avoid asking for readable writing. If an object carries script, say it is "worn",
  "incised" or "indistinct", or the render produces gibberish glyphs.
- No living people unless the beat is genuinely about a person's face; prefer their objects.

RULES FOR THE CARD
- "hi": a real Devanagari word or short phrase naming the beat. Correct Devanagari only.
- "en": 1-3 words, UPPERCASE.
- "when": a date, a range, or a short attribution. Use "c." for approximate.
- "line": ONE sentence, max 14 words, that makes the viewer want the next beat. Concrete.
  A number, a comparison, or a consequence. Never a generality.

ACCURACY IS THE HARD CONSTRAINT
- Only claim what is actually attested. If a claim is contested, hedge it in the line
  itself ("most scholars place him here"), do not state it flatly.
- If an object is associated with a *neighbouring* dynasty rather than this one, either
  drop it or say whose it is.
- Prefer the specific and checkable ("62,832 to 20,000") over the grand ("a golden age").

STRUCTURE
- Beat 1 establishes the era: its dates and what it is.
- The middle beats are its achievements, its objects, its people's work — most striking first.
- The last beat is its ending. Be honest about how it ended.
- ids are "NN-word" where word is a short transliterated Sanskrit/regional term, lowercase.

Return JSON only: { "tagline": string, "pitch": string, "motion": string, "beats": [...] }
tagline: 6-9 words, the era in one line, for the closing card.
pitch: 2 sentences on what this sequence is.
motion: 1 sentence on how the objects move.`;

async function seed(bucket, stories) {
  const list = stories.map((s) => `- ${s.title}\n    era: ${s.era}\n    legend: ${s.legend}\n    moral: ${s.moral}`).join('\n');
  const user = `Author a ${NBEATS}-beat Ink and Light sequence for the **${bucket}** series.

These are the real stories this series covers. Draw the beats from what these stories are
actually about — their objects, their claims, their people's work. Do not introduce
material from outside them unless it is a famous, well-attested object of this same era
that the stories clearly assume.

STORIES
${list}

Here are two beats from the approved Gupta sequence, so you can see the exact register:

${EXAMPLE}

Now write ${NBEATS} beats for **${bucket}**.`;

  const out = await chatJson(SYSTEM, user, { maxTokens: 9000 });
  const beats = (out.beats || []).map((b, i) => ({
    id: b.id && /^\d{2}-/.test(b.id) ? b.id : `${String(i + 1).padStart(2, '0')}-${(b.id || 'beat').replace(/^\d+-/, '')}`,
    prompt: b.prompt,
    era: { hi: b.era?.hi || '', en: b.era?.en || '', when: b.era?.when || '', line: b.era?.line || '' },
  }));
  return {
    id: bucket,
    name: out.name || `Ink and Light — ${bucket[0].toUpperCase()}${bucket.slice(1)}`,
    tagline: out.tagline || '',
    pitch: out.pitch || '',
    motion: out.motion || '',
    draft: true,
    seededFrom: stories.map((s) => s.id),
    seededAt: new Date().toISOString(),
    beats,
  };
}

// ── main ──────────────────────────────────────────────────────────────────
const all = await loadStories();
const buckets = new Map();
for (const s of all) buckets.set(s.bucket, [...(buckets.get(s.bucket) || []), s]);

const existing = new Set(await listEras());
let want = targets.length ? targets : [...buckets.keys()].filter((b) => b !== 'other');
if (ALL && !targets.length) want = want.filter((b) => !existing.has(b) || FORCE);
if (!ALL && !targets.length) {
  console.error(`usage: node tools/seed-era.mjs <era>... | --all\nknown: ${[...buckets.keys()].join(', ')}`);
  process.exit(1);
}

console.log(`\nseeding ${want.length} era(s) at ${NBEATS} beats each\n`);

/* Seeded in parallel — they are independent language calls and eighteen of them one after
   another is twenty minutes of waiting. Concurrency is capped because the deployment is
   shared with the image and video generation this pipeline also runs. */
const CONC_N = Math.min(CONC, want.length);
const queue = want.slice();
const results = [];

async function worker() {
  for (;;) {
    const b = queue.shift();
    if (!b) return;
    const stories = buckets.get(b);
    if (!stories?.length) { results.push({ b, msg: 'no stories' }); continue; }
    if (existing.has(b) && !FORCE) { results.push({ b, msg: 'already seeded (use --force)' }); continue; }
    try {
      const era = await seed(b, stories);
      const v = validateEra(era);
      await mkdir(path.join(ROOT, b), { recursive: true });
      await saveEra(b, era);
      results.push({
        b,
        msg: `${era.beats.length} beats  ${v.ok ? 'valid' : `${v.problems.length} PROBLEM(S)`}`,
        problems: v.problems,
        warn: v.warn,
      });
    } catch (e) {
      results.push({ b, msg: `FAILED: ${String(e.message).slice(0, 160)}` });
    }
    console.log(`  done ${b} (${results.length}/${want.length})`);
  }
}
await Promise.all(Array.from({ length: Math.max(1, CONC_N) }, worker));

console.log('');
for (const r of results.sort((x, y) => x.b.localeCompare(y.b))) {
  console.log(`  ${r.b.padEnd(18)} ${r.msg}`);
  for (const p of (r.problems || [])) console.log(`      ! ${p}`);
  for (const w of (r.warn || []).slice(0, 3)) console.log(`      · ${w}`);
}

console.log(`\ndrafts written to ${ROOT}/<era>/era.json`);
console.log('every one is marked "draft": true — read and fact-check before generating:');
console.log('  node tools/check-era.mjs <era>\n');
