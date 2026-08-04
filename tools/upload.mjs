/* Upload a finished episode to YouTube through the local yt-agent.

   The agent drives a signed-in Edge profile. This never drives a browser itself, and it never
   runs two uploads at once: only one process may hold
   C:\Users\navg\.copilot\playwright-youtube-profile, so a series that uploaded in parallel would
   corrupt the profile rather than go faster.

   The safeguard that matters is idempotence. Everything else in this pipeline is safe to re-run —
   a stage whose output exists is skipped, a failed story is retried, a render is redone. An
   upload is the one step that is not: running it twice does not produce the same result twice,
   it produces two videos on a public channel. So every upload is recorded against the master's
   own content hash, and a second attempt refuses.

     node tools/upload.mjs --dir dist/gupta/zero_v5 --dry
     node tools/upload.mjs --dir dist/gupta/zero_v5
     node tools/upload.mjs --dir dist/gupta/zero_v5 --visibility public --ab
*/
import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileP = promisify(execFile);
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const AGENT = arg('agent', 'C:/Users/navg/DailyApps/yt-agent');
const DIR = arg('dir', null);
const DRY = has('dry');
const AB = has('ab');
const TIMEOUT = arg('timeout', '1800');
/* Private unless told otherwise. The agent's own documentation shows --visibility public, and
   that is right for one video a person is watching go up; it is not right as the default of an
   unattended thirteen-story run, which would publish an unreviewed series to subscribers. */
const VISIBILITY = arg('visibility', 'private');

if (!DIR) { console.error('usage: node tools/upload.mjs --dir dist/<era>/<slug>_<version>'); process.exit(1); }

const LEDGER = path.join('dist', 'uploads.json');

/** The master's content hash — the identity an upload is recorded against. */
async function sha(file) {
  const h = createHash('sha256');
  for await (const c of createReadStream(file)) h.update(c);
  return h.digest('hex');
}

const files = await readdir(DIR).catch(() => null);
if (!files) { console.error(`no such folder: ${DIR}`); process.exit(1); }

/* The master is the biggest mp4 that is not the intro or the outro. Choosing by size rather than
   by name because the name is the slug and the slug is not known here. */
const mp4s = [];
for (const f of files.filter((f) => f.endsWith('.mp4'))) {
  mp4s.push({ f, size: (await stat(path.join(DIR, f))).size });
}
const master = mp4s.filter((m) => !/-intro\.mp4$|-outro\.mp4$/.test(m.f))
  .sort((a, b) => b.size - a.size)[0];
if (!master) { console.error(`no master mp4 in ${DIR}`); process.exit(1); }

const read = async (name) => (await readFile(path.join(DIR, name), 'utf8').catch(() => '')).trim();
const title = await read('title.txt');
const descFile = path.join(DIR, 'description.txt');
const thumb = files.find((f) => /-thumb\.png$/.test(f)) || files.find((f) => /-thumb\.jpg$/.test(f));

const problems = [];
if (!title) problems.push('title.txt is empty');
if (title.length > 100) problems.push(`title is ${title.length} chars, over YouTube's 100`);
if (!(await readFile(descFile, 'utf8').catch(() => ''))) problems.push('description.txt is empty');
if (!thumb) problems.push('no <slug>-thumb.png');
if (problems.length) {
  console.error(`${DIR} is not ready to upload:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

/* A/B challengers: the second-ranked title and a genuinely different thumbnail. Both optional,
   both capped at two by the agent. The B plate is a different concept, not a recolour — that is
   what ab/ holds, one file per thumbnail concept. */
let titleVariants = null;
let thumbVariants = null;
if (AB) {
  const abDir = path.join(DIR, 'ab');
  const abFiles = await readdir(abDir).catch(() => []);
  const alt = (await readFile(path.join(abDir, 'titles.txt'), 'utf8').catch(() => ''))
    .split('\n').map((l) => l.match(/^\s*B\.\s*(.+)$/)).filter(Boolean).map((m) => m[1].trim());
  if (alt.length && alt[0] !== title) titleVariants = alt[0];
  const plates = abFiles.filter((f) => /\.(jpg|png)$/i.test(f) && !/-feed\./.test(f)).sort();
  const b = plates.find((f) => f.startsWith('B-'));
  if (b) thumbVariants = path.resolve(abDir, b);
}

const abs = (f) => path.resolve(DIR, f);
const videoPath = abs(master.f);
const digest = await sha(videoPath);

const ledger = await readFile(LEDGER, 'utf8').then(JSON.parse).catch(() => ({ uploads: {} }));
const already = Object.values(ledger.uploads).find((u) => u.sha === digest);
if (already && !has('again')) {
  /* Only a *successful* previous upload means "nothing to do here".

     This matched on the hash alone, so a failed attempt counted as done: `the-grammar` was
     accepted by YouTube and then left as an unpublished draft, exit 1, and the next run would
     have printed "already uploaded", exited 0, and let the factory record the episode as
     published. The same false-ok that shipped a clipping master.

     Re-sending is not the answer either — the file did reach YouTube, so a second send leaves two
     copies. The only honest move is to stop and say what is there. */
  if (already.exit === 0) {
    console.log(`${DIR} was already uploaded on ${already.at}`);
    console.log(`  ${already.url || '(no url recorded)'}`);
    console.log('  Same video content, byte for byte. Pass --again only if a second copy is meant.');
    process.exit(0);
  }
  console.error(`${DIR} was already sent on ${already.at} and did not finish (exit ${already.exit}):`);
  console.error(`  ${already.url || '(no url recorded)'}`);
  console.error('  The file reached YouTube but the upload was left unfinished, usually as a draft,');
  console.error('  so sending it again would leave two copies. Publish or delete that one in');
  console.error('  YouTube Studio, then re-run this with --again.');
  process.exit(1);
}

const args = [
  path.join(AGENT, 'submit.mjs'),
  '--video', videoPath,
  '--title', title,
  '--desc-file', path.resolve(descFile),
  '--visibility', VISIBILITY,
  '--thumbnail', abs(thumb),
  ...(titleVariants ? ['--title-variants', titleVariants] : []),
  ...(thumbVariants ? ['--thumbnail-variants', thumbVariants] : []),
  '--wait', '--timeout', TIMEOUT,
];

console.log(`${DIR}`);
console.log(`  video      ${master.f}  ${(master.size / 1024 / 1024).toFixed(0)} MB`);
console.log(`  title      ${title}  (${title.length} chars)`);
console.log(`  thumbnail  ${thumb}`);
console.log(`  visibility ${VISIBILITY}`);
if (titleVariants) console.log(`  A/B title  ${titleVariants}`);
if (thumbVariants) console.log(`  A/B thumb  ${path.basename(thumbVariants)}`);
if (!AB) console.log('  A/B        off (pass --ab)');

if (DRY) {
  console.log(`\n  node ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`);
  console.log('\n--dry: nothing submitted');
  process.exit(0);
}

/* Idempotent by the agent's own design, so it is simply called rather than checked for. */
console.log('\n  starting the agent...');
await execFileP('powershell', ['-File', path.join(AGENT, 'start-agent.ps1')], { timeout: 120000 })
  .catch((e) => { console.error(`  could not start the agent: ${String(e.message || e).slice(0, 200)}`); process.exit(1); });

console.log('  submitting, and waiting for the upload to finish...');
const code = await new Promise((resolve) => {
  const p = spawn(process.execPath, args, { stdio: 'inherit' });
  p.on('close', resolve);
});

/* Recorded whatever the outcome, because a timeout is not a failure to upload — exit 3 means the
   video is still processing on YouTube's side, and re-submitting it would be the second copy this
   whole file exists to prevent. */
const outbox = path.join(AGENT, 'outbox');
const outs = (await readdir(outbox).catch(() => [])).filter((f) => f.endsWith('.json'));
let result = null;
let newest = 0;
for (const f of outs) {
  const s = await stat(path.join(outbox, f));
  if (s.mtimeMs > newest) { newest = s.mtimeMs; result = JSON.parse(await readFile(path.join(outbox, f), 'utf8')); }
}

await mkdir(path.dirname(LEDGER), { recursive: true });
ledger.uploads[DIR.replace(/\\/g, '/')] = {
  sha: digest, title, visibility: VISIBILITY, exit: code,
  url: result?.youtube_url || null, ab: !!result?.ab,
  thumbnailLimited: !!result?.thumbnail_limited,
  at: new Date().toISOString(),
};
await writeFile(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);

if (code === 0) {
  console.log(`\n  done -> ${result?.youtube_url || '(no url in the result)'}`);
  if (result?.ab) console.log('  A/B test running');
  if (result?.thumbnail_limited) console.log('  ! thumbnail hit the daily cap — add it tomorrow');
} else if (code === 3) {
  console.log('\n  timed out, still processing on YouTube. Recorded, so it will not be sent twice.');
} else {
  console.error('\n  upload failed. SIGNED_OUT means signing in once in the Edge profile.');
}
process.exit(code === 0 ? 0 : code);
