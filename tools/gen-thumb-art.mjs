/* Thumbnail art — the episode's subject, generated inside the Ink and Light world.

   The episode's own art is bright painted comic work on daylight backgrounds. Cutting a
   figure out of that and dropping it onto a black ink-and-gold plate reads as exactly
   what it is: two pictures, pasted. A thumbnail is judged in under a second and that
   join is the first thing the eye finds.

   So the figure is generated *in* the language instead — the same black water, the same
   single hard rim light from the upper right, the same suspended gold. It sits beside the
   title sequence because it was lit by the same lamp.

   The four concepts are deliberately different bets rather than variations on one, because
   which of them survives at 320px in a feed is not something to be reasoned about:

     gaze    a face looking up at the object — awe, and a clear subject
     defiant a face straight down the lens — confrontation, the strongest CTR shape
     hold    the whole figure holding the object — the claim, made literal
     eye     macro on the eye with the object reflected in it — pure curiosity gap

   **The concepts are the same for every episode; only the subject changes.** Who the figure
   is and what object they are holding comes from `subject.json`, written by
   `tools/subject.mjs` from the episode's own narration. Describing the figure once, in one
   place, is what stops two plates of the same episode containing two different men.

     node tools/gen-thumb-art.mjs --slug zero      # all concepts, one revision each
     node tools/gen-thumb-art.mjs --only eye       # one concept
     node tools/gen-thumb-art.mjs --n 2            # two revisions of each
*/
import { genImage, pool } from './azure.mjs';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { INK_STYLE, INK_LIGHT, RIGHT, NOTYPE } from './ink.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const ONLY = arg('only', null);
const N = Number(arg('n', '1'));
const SLUG = arg('slug', 'aryabhata');
const OUT = path.join('episodes', SLUG, 'thumb-art');

/* The subject, described once. Aryabhata's plates were written before this file was
   generalised, so his description is the fallback — an episode without a subject.json
   gets a clear error rather than a picture of the wrong person. */
const ARYABHATA = {
  figure: 'A young Indian man in his early twenties, 5th-century Gupta India: warm brown skin, '
    + 'sharp calm features, dark hair drawn into a topknot, a plain undyed cotton upper cloth over one '
    + 'shoulder, a small dark red tilak on the forehead. Serious, intelligent, unornamented.',
  object: 'a large antique bronze armillary sphere of nested engraved rings with a single burning point '
    + 'of gold light at its centre',
  held: 'a glowing golden sphere the size of a melon',
};

const subject = await readFile(path.join(OUT, 'subject.json'), 'utf8')
  .then(JSON.parse)
  .catch(() => {
    if (SLUG === 'aryabhata') return ARYABHATA;
    console.error(`no ${OUT}/subject.json — run: node tools/subject.mjs --slug ${SLUG}`);
    return process.exit(1);
  });

const { figure: FIGURE, object: OBJECT, held: HELD } = subject;

export const CONCEPTS = [
  {
    id: 'gaze',
    what: 'looking up at the object — awe, and an unmistakable subject',
    prompt: `${FIGURE} Turned three-quarters away from camera and looking upward and to the right,
      lit only by a hard gold rim light that catches the edge of the cheekbone, jaw and shoulder while the
      rest falls into pure black. Above and to the right hangs ${OBJECT},
      black ink streaming off it and flakes of gold leaf drifting between the figure and it. ${RIGHT}`,
  },
  {
    id: 'defiant',
    what: 'straight down the lens — confrontation, historically the strongest thumbnail shape',
    prompt: `${FIGURE} A tight portrait: facing the camera directly, chin level, absolutely still,
      one side of the face carved out by a hard gold rim light and the other side lost entirely to black.
      Behind the shoulder, slightly out of focus, ${OBJECT}
      burns gold in the dark, with black ink curling upward through water across the background. ${RIGHT}`,
  },
  {
    id: 'hold',
    what: 'the claim made literal — the subject holding the thing the episode is about',
    prompt: `${FIGURE} Standing half-submerged to the waist in still black water, seen from the chest up,
      holding ${HELD} in both cupped hands at chest height. It
      is the only real light in the frame and throws hard gold up onto the underside of the face and hands.
      Black ink pours off the forearms into the water and gold leaf flakes hang in the air around it. ${RIGHT}`,
  },
  {
    id: 'eye',
    what: 'macro on the eye with the object in it — pure curiosity gap',
    prompt: `Extreme macro photograph of a single human eye. ${FIGURE} Only the eye is in frame:
      dark lashes, the iris deep brown and lit by one hard gold rim light from the upper right.
      Reflected sharply on the wet surface of the eye is a small ${OBJECT}.
      Everything outside the eye falls to pure black; fine threads of black ink
      and single flakes of gold leaf drift across the frame in front of it. ${RIGHT}`,
  },
];

const chosen = ONLY ? CONCEPTS.filter((c) => c.id === ONLY) : CONCEPTS;
if (!chosen.length) {
  console.error(`no concept "${ONLY}" — one of: ${CONCEPTS.map((c) => c.id).join(', ')}`);
  process.exit(1);
}

/** Never overwrite: every take stays on disk to compare later. */
async function nextRev(id) {
  await mkdir(OUT, { recursive: true });
  const existing = await readdir(OUT).catch(() => []);
  const re = new RegExp(`^${id}-r(\\d+)\\.png$`);
  const max = existing.reduce((m, f) => {
    const g = f.match(re);
    return g ? Math.max(m, Number(g[1])) : m;
  }, 0);
  return path.join(OUT, `${id}-r${max + 1}.png`);
}

const jobs = [];
for (const c of chosen) {
  for (let k = 0; k < N; k++) {
    jobs.push({
      label: c.id,
      run: async () => {
        const out = await nextRev(c.id);
        const prompt = `${c.prompt.replace(/\s+/g, ' ').trim()} ${INK_STYLE} ${INK_LIGHT} ${NOTYPE}`;
        await genImage(prompt, out, { size: '1536x1024', quality: 'high' });
        await writeFile(out.replace(/\.png$/, '.txt'), prompt);
        return out;
      },
    });
  }
}

console.log(`generating ${jobs.length} thumbnail plate(s), 4 at a time\n`);
for (const c of chosen) console.log(`  ${c.id.padEnd(9)} ${c.what}`);
console.log('');

const t0 = Date.now();
let done = 0;
const results = await pool(jobs, 4, (job, res) => {
  done++;
  const el = ((Date.now() - t0) / 1000).toFixed(0);
  /* The endpoint URL is ~150 characters, identical on every call, and used to consume the whole
     error budget — which is why a moderation refusal only ever showed as "Your request wa".

     Stripping the URL bought room, but a head-only slice still loses the one part worth having:
     the refusal reads "Your request was rejected by the safety system ..." for hundreds of
     characters of boilerplate and puts the actual reason — safety_violations=[sexual] — at the
     very end. badami cost a separate probe to learn that. Keep both ends, as gen-era and
     film-gen already do, and the reason survives the truncation. */
  const why = String(res.error || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  const brief = why.length > 400 ? `${why.slice(0, 260)} … ${why.slice(-140)}` : why;
  console.log(res.ok
    ? `  [${done}/${jobs.length}] ${el}s  ok   ${job.label} -> ${path.basename(res.value)}`
    : `  [${done}/${jobs.length}] ${el}s  FAIL ${job.label}: ${brief}`);
});

const bad = results.filter((r) => !r.ok).length;
console.log(`\n${jobs.length - bad}/${jobs.length} plates in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${OUT}/`);
process.exit(bad ? 1 : 0);
