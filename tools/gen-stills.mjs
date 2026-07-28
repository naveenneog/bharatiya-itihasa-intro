/* Generate still frames for every art direction with gpt-image-2.
   Nothing is ever overwritten: each run writes a new revision (-r1, -r2, ...) so every
   version stays on disk to review later.

   node tools/gen-stills.mjs                 # all directions
   node tools/gen-stills.mjs v2a v2c         # only matching directions
*/
import { genImage, pool } from './azure.mjs';
import { DIRECTIONS, buildPrompt } from './directions.mjs';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'versions';
const argv = process.argv.slice(2);
const beatArg = argv.indexOf('--beat');
// comma list, e.g. --beat 00-itihasa,08-vijayanagara
const BEATS = beatArg >= 0 ? argv[beatArg + 1].split(',').map((s) => s.trim()) : null;
/* Guard the -1: without it, `beatArg + 1` is 0 when --beat is absent and the first
   positional argument — the direction filter — is silently dropped, which quietly
   regenerates every direction in the repo instead of the one asked for. */
const skip = beatArg >= 0 ? beatArg + 1 : -1;
const filter = argv.filter((a, i) => !a.startsWith('--') && i !== skip);
const dirs = filter.length
  ? DIRECTIONS.filter((d) => filter.some((f) => d.id.includes(f)))
  : DIRECTIONS;

if (!dirs.length) {
  console.error(`no direction matched ${filter.join(', ')}`);
  process.exit(1);
}

async function nextRev(dir, beatId) {
  const stills = path.join(ROOT, dir.id, 'stills');
  await mkdir(stills, { recursive: true });
  const existing = await readdir(stills).catch(() => []);
  const re = new RegExp(`^${beatId}-r(\\d+)\\.png$`);
  const max = existing.reduce((m, f) => {
    const g = f.match(re);
    return g ? Math.max(m, Number(g[1])) : m;
  }, 0);
  return path.join(stills, `${beatId}-r${max + 1}.png`);
}

const jobs = [];
for (const dir of dirs) {
  for (const beat of dir.beats) {
    if (BEATS && !BEATS.some((f) => beat.id.includes(f))) continue;
    jobs.push({
      label: `${dir.id}/${beat.id}`,
      dir,
      beat,
      run: async () => {
        const out = await nextRev(dir, beat.id);
        const prompt = buildPrompt(dir, beat);
        await genImage(prompt, out, { size: '1536x1024', quality: 'high' });
        await writeFile(out.replace(/\.png$/, '.txt'), prompt);
        return out;
      },
    });
  }
}

console.log(`generating ${jobs.length} stills across ${dirs.length} direction(s), 4 at a time\n`);
const t0 = Date.now();
let done = 0;

const results = await pool(jobs, 4, (job, res) => {
  done++;
  const el = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(res.ok
    ? `  [${done}/${jobs.length}] ${el}s  ok   ${job.label} -> ${path.basename(res.value)}`
    : `  [${done}/${jobs.length}] ${el}s  FAIL ${job.label}: ${res.error.slice(0, 160)}`);
});

// Record what each direction is, next to its output, so a version is self-describing.
for (const dir of dirs) {
  await writeFile(path.join(ROOT, dir.id, 'direction.json'), JSON.stringify({
    id: dir.id, name: dir.name, pitch: dir.pitch, motion: dir.motion, style: dir.style,
    beats: dir.beats, generated: new Date().toISOString(),
  }, null, 2));
}

const bad = results.filter((r) => !r.ok).length;
console.log(`\n${jobs.length - bad}/${jobs.length} stills in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${ROOT}/`);
process.exit(bad ? 1 : 0);
