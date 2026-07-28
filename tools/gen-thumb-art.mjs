/* Thumbnail art — Aryabhata inside the Ink and Light world.

   The episode's own art is bright painted comic work on daylight backgrounds. Cutting a
   figure out of that and dropping it onto a black ink-and-gold plate reads as exactly
   what it is: two pictures, pasted. A thumbnail is judged in under a second and that
   join is the first thing the eye finds.

   So the figure is generated *in* the language instead — the same black water, the same
   single hard rim light from the upper right, the same suspended gold. It sits beside the
   turning-Earth beat because it was lit by the same lamp.

   The concepts are deliberately different bets rather than variations on one, because
   which of them survives at 320px in a feed is not something to be reasoned about:

     gaze    a face looking up at the armillary sphere — awe, and a clear subject
     defiant a face straight down the lens — confrontation, the strongest CTR shape
     hold    the whole figure holding the turning Earth — the claim, made literal
     eye     macro on the eye with the sphere reflected in it — pure curiosity gap

     node tools/gen-thumb-art.mjs                # all concepts, one revision each
     node tools/gen-thumb-art.mjs --only eye     # one concept
     node tools/gen-thumb-art.mjs --n 2          # two revisions of each
*/
import { genImage, pool } from './azure.mjs';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

/* Lifted verbatim from the GUPTA direction so the plates cannot drift from the sequence
   they sit next to. If the look changes there, it changes here. */
const INK_STYLE = 'Photorealistic high-speed macro photography against pure black. Indian ink and liquid gold pigment '
  + 'blooming and diffusing through clear water in delicate tendrils, suspended gold leaf flakes catching light, '
  + 'shot with a macro probe lens, razor-thin depth of field, dramatic single-source rim light, pin-sharp detail.';
const INK_LIGHT = 'A single hard rim light from the upper right; everything it does not touch falls to '
  + 'pure black. Shot on a macro probe lens at f/2, razor-thin plane of focus, no fill light, no ambient haze.';

/* The type lives in the left third of every layout, so the art must leave it empty. The
   empires set taught that subjects drift left unless told twice. */
const RIGHT = 'The subject is composed in the right two-thirds of the frame. The entire left third is '
  + 'empty black water and nothing else — no face, no object, no highlight, no tendril enters it.';

/* The figure, described once. Repeating it per concept is how two plates end up with two
   different men in them. */
const FIGURE = 'A young Indian man in his early twenties, 5th-century Gupta India: warm brown skin, '
  + 'sharp calm features, dark hair drawn into a topknot, a plain undyed cotton upper cloth over one '
  + 'shoulder, a small dark red tilak on the forehead. Serious, intelligent, unornamented.';

const NOTYPE = 'No text, no lettering, no numbers, no watermark, no logo, no signature anywhere in the image.';

export const CONCEPTS = [
  {
    id: 'gaze',
    what: 'looking up at the sphere — awe, and an unmistakable subject',
    prompt: `${FIGURE} He is turned three-quarters away from camera and looking upward and to the right,
      lit only by a hard gold rim light that catches the edge of his cheekbone, jaw and shoulder while the
      rest of him falls into pure black. Above and to the right of him hangs a large antique bronze
      armillary sphere of nested engraved rings with a single burning point of gold light at its centre,
      black ink streaming off its meridians and flakes of gold leaf drifting between him and it. ${RIGHT}`,
  },
  {
    id: 'defiant',
    what: 'straight down the lens — confrontation, historically the strongest thumbnail shape',
    prompt: `${FIGURE} A tight portrait: he faces the camera directly, chin level, absolutely still,
      one side of his face carved out by a hard gold rim light and the other side lost entirely to black.
      Behind his shoulder, slightly out of focus, the glowing nested rings of a bronze armillary sphere
      burn gold in the dark, with black ink curling upward through water across the background. ${RIGHT}`,
  },
  {
    id: 'hold',
    what: 'the claim made literal — a man holding the turning Earth',
    prompt: `${FIGURE} He stands half-submerged to the waist in still black water, seen from the chest up,
      holding a glowing golden sphere the size of a melon in both cupped hands at chest height. The sphere
      is the only real light in the frame and throws hard gold up onto the underside of his face and hands.
      Black ink pours off his forearms into the water and gold leaf flakes hang in the air around the
      sphere. Faint engraved bronze rings orbit it. ${RIGHT}`,
  },
  {
    id: 'eye',
    what: 'macro on the eye with the sphere in it — pure curiosity gap',
    prompt: `Extreme macro photograph of a single human eye of a young 5th-century Indian man, warm brown
      skin, dark lashes, the iris deep brown and lit by one hard gold rim light from the upper right.
      Reflected sharply on the wet surface of the eye is a small bronze armillary sphere of nested rings
      with a burning gold centre. Everything outside the eye falls to pure black; fine threads of black ink
      and single flakes of gold leaf drift across the frame in front of it. ${RIGHT}`,
  },
];

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const ONLY = arg('only', null);
const N = Number(arg('n', '1'));
const SLUG = arg('slug', 'aryabhata');
const OUT = path.join('episodes', SLUG, 'thumb-art');

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
  console.log(res.ok
    ? `  [${done}/${jobs.length}] ${el}s  ok   ${job.label} -> ${path.basename(res.value)}`
    : `  [${done}/${jobs.length}] ${el}s  FAIL ${job.label}: ${res.error.slice(0, 200)}`);
});

const bad = results.filter((r) => !r.ok).length;
console.log(`\n${jobs.length - bad}/${jobs.length} plates in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${OUT}/`);
process.exit(bad ? 1 : 0);
