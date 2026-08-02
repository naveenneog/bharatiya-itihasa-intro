/* Generate Sora motion for every art direction, style-locked to the approved stills.

   Each clip is image-to-video: the latest still revision for a beat is cropped and
   scaled to exactly the video size (sora rejects any mismatch) and passed as
   `input_reference`, so the footage inherits the palette, composition and the empty
   left third the stills were composed with. Text-to-video alone drifts off-look.

   Nothing is ever overwritten — each run writes a new revision (-r1, -r2, ...).

   node tools/gen-clips.mjs                    # all directions
   node tools/gen-clips.mjs v2c v2d            # only matching directions
   node tools/gen-clips.mjs --seconds 8        # longer takes
   node tools/gen-clips.mjs v3 --beat 05-gupta # one beat, to redo a bad take
*/
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { genVideo, pool, soraWorkers, rememberConc } from './azure.mjs';
import { DIRECTIONS } from './directions.mjs';
import { picks, choose } from './picks.mjs';

const execFileP = promisify(execFile);
const ROOT = 'versions';

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : dflt;
};
const SECONDS = flag('seconds', '4');
const MODEL = flag('model', 'sora-2');
const SIZE = flag('size', '1280x720');   // all sora-2 offers in landscape; upscaled at assembly
const CONC = Number(flag('conc', 0)) || soraWorkers();  // real cap is soraFleet, per deployment
/* Sora moderation refuses reference images containing people
   ("people-in-user-uploads"), so portrait directions have to fall back to
   text-to-video and carry their look in the prompt instead. */
const NOREF = argv.includes('--no-ref');
const MISSING = argv.includes('--missing');   // only generate beats that have no clip yet
const BEATS = (() => { const v = flag('beat', null); return v ? v.split(',').map((s) => s.trim()) : null; })();
const [W, H] = SIZE.split('x').map(Number);

// Drop flags and their values, keep bare direction filters.
const flagIdx = new Set();
argv.forEach((a, i) => { if (a.startsWith('--')) { flagIdx.add(i); flagIdx.add(i + 1); } });
const filter = argv.filter((_, i) => !flagIdx.has(i));

const dirs = filter.length
  ? DIRECTIONS.filter((d) => filter.some((f) => d.id.includes(f)))
  : DIRECTIONS;

if (!dirs.length) {
  console.error(`no direction matched ${filter.join(', ')}`);
  process.exit(1);
}

/** The chosen still for a beat — the picked revision if picks.json names one, else newest. */
async function latestStill(dirId, beatId) {
  const stills = path.join(ROOT, dirId, 'stills');
  const files = await readdir(stills).catch(() => []);
  const p = await picks(ROOT, dirId);
  const f = choose(files, beatId, 'png', p[beatId]);
  return f ? path.join(stills, f) : null;
}

/** Newest clip revision for a beat, or null — used by --missing to resume a partial run. */
async function latestClip(dirId, beatId) {
  const files = await readdir(path.join(ROOT, dirId, 'clips')).catch(() => []);
  return files.find((f) => new RegExp(`^${beatId}-r\\d+\\.mp4$`).test(f)) || null;
}

async function nextRev(dirId, beatId, ext) {
  const clips = path.join(ROOT, dirId, 'clips');
  await mkdir(clips, { recursive: true });
  const files = await readdir(clips).catch(() => []);
  const re = new RegExp(`^${beatId}-r(\\d+)\\.${ext}$`);
  const max = files.reduce((m, f) => {
    const g = f.match(re);
    return g ? Math.max(m, Number(g[1])) : m;
  }, 0);
  return path.join(clips, `${beatId}-r${max + 1}.${ext}`);
}

/* Centre-crop to the video aspect, then scale to exact pixels. The stills are 3:2 and
   sora wants 16:9, so this trims top and bottom only — the composed left-third
   negative space and the subject placement both survive. */
async function makeRef(still, out) {
  await mkdir(path.dirname(out), { recursive: true });
  await execFileP('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', still,
    '-vf', `crop='min(iw,ih*${W}/${H})':'min(ih,iw*${H}/${W})',scale=${W}:${H}:flags=lanczos`,
    '-frames:v', '1', out,
  ]);
  return out;
}

const jobs = [];
for (const dir of dirs) {
  for (const beat of dir.beats) {
    if (BEATS && !BEATS.some((f) => beat.id.includes(f))) continue;
    if (MISSING && await latestClip(dir.id, beat.id)) continue;
    jobs.push({
      label: `${dir.id}/${beat.id}`,
      run: async () => {
        const out = await nextRev(dir.id, beat.id, 'mp4');
        let ref = null;

        if (!NOREF) {
          const still = await latestStill(dir.id, beat.id);
          if (!still) throw new Error('no still to lock to — run gen-stills first');
          ref = out.replace(/\.mp4$/, '-ref.png');
          await makeRef(still, ref);
        }

        // With a reference, hold the established frame and describe only what moves.
        // Without one, the prompt has to carry the whole look as well as the motion.
        // A beat may override the direction's motion: sora holds a single hero object
        // well but invents repeating texture over broad fields, so those beats need
        // an explicit instruction to keep the scene solid.
        const motion = beat.motion || dir.motion;
        const prompt = ref
          ? `${beat.prompt}\n\nCamera and composition stay as established. ${motion} `
            + 'Motion is slow, deliberate and cinematic. The dark empty left third of the frame stays '
            + 'dark and empty throughout. No text, letters or captions appear at any point.'
          : `${beat.prompt}\n\n${dir.style}\n\n${motion} Motion is slow, deliberate and cinematic. `
            + 'Cinematic 16:9 widescreen. Deep near-black background. Warm antique gold and saffron are '
            + 'the only strong colours. The left third of the frame stays dark and empty throughout, for titles. '
            + 'No text, letters or captions appear at any point.';

        await genVideo(prompt, out, { seconds: SECONDS, size: SIZE, model: MODEL, ref });
        await writeFile(out.replace(/\.mp4$/, '.txt'), prompt);
        return out;
      },
    });
  }
}

if (!jobs.length) {
  console.error(BEATS ? `no beat matched --beat ${BEATS.join(',')}` : 'nothing to generate');
  process.exit(1);
}

console.log(`generating ${jobs.length} clips (${SECONDS}s, ${SIZE}${NOREF ? ', text-to-video' : ', locked to stills'}) across ${dirs.length} direction(s), ${CONC} at a time\n`);const t0 = Date.now();
let done = 0;

const results = await pool(jobs, CONC, (job, res) => {
  done++;
  const el = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(res.ok
    ? `  [${done}/${jobs.length}] ${el}s  ok   ${job.label} -> ${path.basename(res.value)}`
    : `  [${done}/${jobs.length}] ${el}s  FAIL ${job.label}: ${res.error.slice(0, 200)}`);
});

const bad = results.filter((r) => !r.ok).length;
console.log(`\n${jobs.length - bad}/${jobs.length} clips in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${ROOT}/`);
await rememberConc();
process.exit(bad ? 1 : 0);
