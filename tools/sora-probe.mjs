/* Does a deployment actually take work, and how many jobs will it run at once?

   Deployment lists lie by omission: `sora` is listed, provisioned, and Disabled, on a model
   version seven months older than the other two. Listing is not availability. This sends real
   jobs — the smallest ones the service offers — and reports what came back.

   node tools/sora-probe.mjs                     one job on each configured lane
   node tools/sora-probe.mjs --burst 4           four at once per lane, to find the cap
   node tools/sora-probe.mjs --lanes sora,sora-2b
*/
import { rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { genVideo, SORA_LANES, soraFleet } from './azure.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };

const LANES = (arg('lanes', '') || SORA_LANES.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const BURST = Number(arg('burst', 1));
const OUT = path.join('dist', '.sora-probe');
const PROMPT = 'A single smooth river stone rests on wet black slate, one hard rim light from '
  + 'the upper right, faint gold dust drifting past it. Static camera.';

await mkdir(OUT, { recursive: true });
console.log(`probing ${LANES.length} deployment(s), ${BURST} job(s) each, 4s 720x1280\n`);

const jobs = [];
for (const lane of LANES) {
  for (let i = 0; i < BURST; i++) jobs.push({ lane, i });
}

const t0 = Date.now();
const at = () => ((Date.now() - t0) / 1000).toFixed(0).padStart(4);

/* Every job is launched at once and the fleet is bypassed, because the point is to find out what
   the service refuses — a gate that prevents the refusal would prevent the measurement. */
for (const l of soraFleet.lanes) { l.limit = 99; l.max = 99; l.min = 99; }
soraFleet.quiet = true;

const results = await Promise.all(jobs.map(async ({ lane, i }) => {
  const out = path.join(OUT, `${lane}-${i}.mp4`);
  const started = Date.now();
  try {
    const r = await genVideo(PROMPT, out, { seconds: '4', size: '720x1280', model: lane });
    const secs = ((Date.now() - started) / 1000).toFixed(0);
    console.log(`  ${at()}s  ok    ${lane} #${i}  in ${secs}s`);
    return { lane, i, ok: true, secs: Number(secs), size: r.size };
  } catch (e) {
    const msg = String(e.message || e).replace(/\s+/g, ' ').slice(0, 200);
    console.log(`  ${at()}s  FAIL  ${lane} #${i}`);
    console.log(`        ${msg}`);
    return { lane, i, ok: false, err: msg };
  }
}));

console.log('');
for (const lane of LANES) {
  const mine = results.filter((r) => r.lane === lane);
  const ok = mine.filter((r) => r.ok);
  const throttled = mine.filter((r) => !r.ok && /429|too many/i.test(r.err || ''));
  const times = ok.map((r) => r.secs).sort((a, b) => a - b);
  console.log(`  ${lane.padEnd(10)} ${ok.length}/${mine.length} ok`
    + (throttled.length ? `, ${throttled.length} throttled` : '')
    + (times.length ? `, ${times[0]}-${times[times.length - 1]}s` : ''));
}
console.log(`\n  ${((Date.now() - t0) / 1000).toFixed(0)}s total`);
await rm(OUT, { recursive: true, force: true });
