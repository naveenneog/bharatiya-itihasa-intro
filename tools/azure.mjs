/* Azure AI client for gpt-image-2 (stills) and sora-2 (motion).
   Auth, endpoint and retry behaviour mirror IndianHistory/tools/aiclient.py, which is
   the shape already proven against this resource.

   API shapes below were probed against the live service, not taken from docs:
     images  POST /openai/deployments/gpt-image-2/images/generations?api-version=2025-04-01-preview
     video   POST /openai/v1/videos?api-version=preview          -> { id, status }
             GET  /openai/v1/videos/{id}?api-version=preview     -> { status, progress }
             GET  /openai/v1/videos/{id}/content?api-version=preview -> video/mp4

   sora-2 limits (probed by sending invalid values and reading the validation error):
     size    720x1280 | 1280x720 only. The request schema also advertises 1024x1792
             and 1792x1024 and they pass validation, but the model then rejects the
             job — 720p is the real ceiling, so masters upscale at assembly.
     seconds 4 | 8 | 12
   Image-to-video works: POST multipart with an `input_reference` file part. The
   reference MUST be exactly the requested width x height or you get
   "Inpaint image must match the requested width and height".
   Moderation refuses reference images containing people ("people-in-user-uploads");
   text-to-video of people is fine, so portrait beats fall back to that.
*/
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const execFileP = promisify(execFile);

export const ENDPOINT = 'https://ai-contosohub530569751908.cognitiveservices.azure.com';
const IMG_DEPLOY = 'gpt-image-2';
const IMG_APIV = '2025-04-01-preview';
const VID_APIV = 'preview';
const SCOPE = 'https://cognitiveservices.azure.com';

let _tok = null;
let _tokAt = 0;

export async function token(force = false) {
  // Tokens last ~1h; refresh at 45min or on demand.
  if (!force && _tok && Date.now() - _tokAt < 45 * 60 * 1000) return _tok;
  const { stdout } = await execFileP('az',
    ['account', 'get-access-token', '--resource', SCOPE, '--query', 'accessToken', '-o', 'tsv'],
    { shell: true, maxBuffer: 1 << 20 });
  _tok = stdout.trim();
  _tokAt = Date.now();
  if (!_tok) throw new Error('no AAD token — run `az login`');
  return _tok;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Sora's concurrency cap is a property of the account's current capacity, not a constant, and
   the account has more than one Sora deployment. Both facts are load-bearing:

   1. The cap per deployment was 2 when this was written and is still 2, measured — but it is
      measured, not assumed, because a hardcoded 2 wastes any headroom that appears and a
      hardcoded 8 stalls the run the moment capacity tightens.
   2. `sora-2` and `sora-2b` are separate deployments of the same model version. The running-task
      cap is enforced per deployment, so dispatching across both doubles throughput for free.
      (`sora` is a third, but it is Disabled and on the 2025-05-02 model — deployments must be
      checked for state and version, not just listed.)

   The control law is AIMD, as TCP uses, for the same reasons: the ceiling is unknown, it moves,
   probing it costs one rejected request, and overshooting it costs a stalled run.
     - a 429 "too many running tasks" backs that lane off by a third   (multiplicative decrease)
     - CLEAR consecutive clean finishes on a lane add one              (additive increase)

   The cap is on *running* tasks, not on request rate, so a slot is held for the whole poll loop
   rather than just the create call. Holding it across a 429 backoff is deliberate: the job that
   was rejected is the one that should wait, and everything queued behind it should stay queued. */

/* Two wall-clock ceilings, both learned from one 980-minute row.

   A single job was already "bounded" at 240 polls — but 240 polls is a count, not a time, and
   each poll is itself a retrying `call()`. When the upstream turns flaky, every poll can spend
   minutes backing off, and 240 of those compound into the better part of a day. Bounding the
   *elapsed* time is the only bound that holds regardless of how slow a poll gets.

   And a job that never ends never releases its slot, so the queue behind it needs its own
   ceiling. Both are set far above anything healthy — the median job is about four minutes — so
   they are never reached by a slow run, only by a stopped one. */
const JOB_BUDGET_MS = Number(process.env.SORA_JOB_MINUTES || 45) * 60_000;
const LANE_WAIT_MS = Number(process.env.SORA_WAIT_MINUTES || 90) * 60_000;

class Lane {
  constructor(name, limit, { min = 1, max = 12, clear = 5 } = {}) {
    this.name = name;
    this.limit = limit;
    this.min = min;
    this.max = max;
    this.clear = clear;
    this.active = 0;
    this.clean = 0;
    this.peak = limit;
    this.throttles = 0;
    this.done = 0;
  }

  get room() { return this.active < this.limit; }
  get load() { return this.active / Math.max(1, this.limit); }
}

class Fleet {
  #waiters = [];

  constructor(lanes) { this.lanes = lanes; this.quiet = false; }

  #say(msg) { if (!this.quiet) console.log(`    [sora] ${msg}`); }

  /* Least-loaded lane with room, so a lane that has been backed off is not handed work while a
     healthy one idles. */
  #free() {
    let best = null;
    for (const l of this.lanes) if (l.room && (!best || l.load < best.load)) best = l;
    return best;
  }

  /* `want` pins the lane. Without it a job could be dispatched to one deployment while holding a
     slot on another, which mis-attributes both the load and any throttle it causes — the probe,
     whose whole job is to attribute throttles to deployments, would have been measuring noise.
     A name with no lane gets one: naming a deployment is asking for it, and if it does not exist
     the service says so far more clearly than a lookup here could. */
  lane(name) {
    let l = this.lanes.find((x) => x.name === name);
    if (!l) { l = new Lane(name, 2); this.lanes.push(l); }
    return l;
  }

  async acquire(want = null, { deadline = LANE_WAIT_MS } = {}) {
    const named = want ? this.lane(want) : null;
    const l = named ? (named.room ? named : null) : this.#free();
    if (l) { l.active++; return l; }
    /* A waiter with no deadline is the 15.7-hour wait: when the upstream dies, in-flight jobs
       stop finishing, no slot is ever released, and everything queued behind them sits on the
       API all night. Against a median job of about four minutes, a wait this long is not a busy
       lane — it is a dead one, and saying so ends the run in minutes instead of by morning. */
    return new Promise((r, fail) => {
      const w = { want, r, fail, done: false };
      /* Deliberately not unref'd. An unref'd deadline lets the process exit while this promise
         is still unsettled — the run ends with no error and no clip, which is the silent version
         of the same bug. A waiter that is genuinely pending should keep the loop alive until
         something settles it; being served clears the timer, so it holds nothing open. */
      w.timer = deadline > 0 && setTimeout(() => {
        if (w.done) return;
        w.done = true;
        const i = this.#waiters.indexOf(w);
        if (i >= 0) this.#waiters.splice(i, 1);
        fail(new Error(`no ${want || 'sora'} slot in ${Math.round(deadline / 60000)} min — treating the lane as dead, not slow`));
      }, deadline);
      this.#waiters.push(w);
    });
  }

  release(lane) {
    lane.active--;
    this.#pump();
  }

  /* Claims the slot on the waiter's behalf, before resolving, so two waiters woken in the same
     turn cannot both decide the same lane had room for them. Walks the queue rather than only
     its head, because a waiter pinned to a busy lane must not block one that would run now.
     A waiter whose deadline has already fired is dropped without being handed a slot — claiming
     first and resolving second is what makes that safe, since the slot is only ever taken for a
     waiter that is still live. */
  #pump() {
    for (let i = 0; i < this.#waiters.length;) {
      const w = this.#waiters[i];
      if (w.done) { this.#waiters.splice(i, 1); continue; }
      const l = w.want ? this.lanes.find((x) => x.name === w.want && x.room) : this.#free();
      if (!l) { i++; continue; }
      l.active++;
      this.#waiters.splice(i, 1);
      w.done = true;
      if (w.timer) clearTimeout(w.timer);
      w.r(l);
    }
  }

  /* Backing off by a third rather than halving, because halving overshot: measured against a real
     cap of 2, 6 -> 3 -> 1 undershot in two steps, both taken before any job had finished, and then
     cost five clean runs to climb back. A third converges 6 -> 4 -> 3 -> 2 and stops on the truth.
     Multiplicative decrease is right when the ceiling could be anywhere; when it is known to be
     small, the step has to be smaller than the thing being measured. */
  throttled(lane, why) {
    lane.throttles++;
    lane.clean = 0;
    const was = lane.limit;
    lane.limit = Math.max(lane.min, lane.limit - Math.max(1, Math.round(lane.limit / 3)));
    if (lane.limit !== was) this.#say(`${lane.name} ${was} -> ${lane.limit} (${why})`);
  }

  finished(lane) {
    lane.done++;
    if (++lane.clean < lane.clear) return;
    lane.clean = 0;
    if (lane.limit >= lane.max) return;
    lane.limit++;
    lane.peak = Math.max(lane.peak, lane.limit);
    this.#say(`${lane.name} -> ${lane.limit} (${lane.clear} clean)`);
    this.#pump();
  }

  get limit() { return this.lanes.reduce((n, l) => n + l.limit, 0); }
  get peak() { return this.lanes.reduce((n, l) => n + l.peak, 0); }
  get throttles() { return this.lanes.reduce((n, l) => n + l.throttles, 0); }
  get max() { return this.lanes.reduce((n, l) => n + l.max, 0); }
  report() {
    return this.lanes.map((l) => `${l.name} ${l.limit} (${l.done} done, ${l.throttles} throttled)`).join(', ');
  }
}

/* What the last run settled on per lane, so the probe is paid once rather than every run. Starting
   one above it re-probes for new capacity cheaply — if the ceiling has risen the lane climbs, and
   if it has not the cost is a single rejected request. Account state, not source: gitignored. */
const CONC_MEMO = path.join('dist', '.sora-conc.json');

async function recallConc() {
  try {
    const j = JSON.parse(await readFile(CONC_MEMO, 'utf8'));
    return j && typeof j.lanes === 'object' && j.lanes ? j.lanes : {};
  } catch { return {}; }
}

export async function rememberConc() {
  if (pinnedConc) return;
  try {
    await mkdir(path.dirname(CONC_MEMO), { recursive: true });
    const lanes = Object.fromEntries(soraFleet.lanes.map((l) => [l.name, l.limit]));
    await writeFile(CONC_MEMO, `${JSON.stringify({ lanes, at: new Date().toISOString() }, null, 2)}\n`);
  } catch { /* a lost memo costs one probe, never a run */ }
}

/* Both live deployments of sora-2. SORA_DEPLOYMENTS overrides the list; SORA_CONC pins each lane
   outright when a run has to be predictable rather than fast. */
export const SORA_LANES = (process.env.SORA_DEPLOYMENTS || 'sora-2,sora-2b')
  .split(',').map((s) => s.trim()).filter(Boolean);
const pinnedConc = Number(process.env.SORA_CONC || 0);
const learnedConc = pinnedConc ? {} : await recallConc();
export const soraFleet = new Fleet(SORA_LANES.map((name) => {
  const was = Number(learnedConc[name] || 0);
  /* Start at what has been measured, not at what would be nice. Starting each lane at 4 was
     optimism with no evidence behind it: against a real cap of 2 it put eight jobs at a service
     that would take four, and the resulting throttle storm cost two clips. Additive increase is
     cheap and safe — a lane that has headroom finds it within five clean finishes. */
  return new Lane(name, pinnedConc || (was ? was + 1 : 2),
    pinnedConc ? { min: pinnedConc, max: pinnedConc } : { min: 1, max: 12 });
}));

/* How many workers a caller should spawn. The fleet is the throttle, so workers only need to be
   numerous enough that no lane ever sits idle waiting for someone to hand it a job. */
export function soraWorkers(n = Infinity) {
  return Math.max(1, Math.min(n, soraFleet.lanes.length * 6));
}


async function call(url, init, tries = 10, onThrottle = null) {
  let last;
  /* Backpressure is counted separately from failure. "Too many running tasks" is not an error —
     it is the service saying "not yet", and the slot it waits for is guaranteed to free when some
     job finishes. Spending the error budget on it means the faster the backoff, the sooner a
     healthy job is abandoned: making the retry cheaper in wall-clock time silently cut the
     patience from 450 s to 225 s, and two clips out of seven died of it. */
  let waits = 0;
  const MAX_WAITS = 40;
  for (let i = 1; i <= tries;) {
    const tok = await token();
    const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${tok}`, ...(init.headers || {}) } });
    if (r.ok) return r;
    const body = await r.text().catch(() => '');
    /* The body is pretty-printed JSON, so a plain slice of it is mostly newlines and indentation
       and ends before the reason begins: every moderation refusal read exactly
       `HTTP 400 { "error": { "message": "Your request wa`, which cost a separate probe to
       resolve twice. Collapsing the whitespace first spends the budget on content. */
    last = `HTTP ${r.status} ${body.replace(/\s+/g, ' ').trim().slice(0, 600)}`;
    if (r.status === 401 || r.status === 403) { await token(true); await sleep(2000); i++; continue; }
    if (r.status === 429) {
      const ra = parseInt(r.headers.get('retry-after') || '', 10);
      /* A running-task cap and a token-rate limit are both 429 and want opposite things. The cap
         says "run fewer at once", and once the fleet has shrunk the pressure is already relieved
         — a slot frees the moment any job finishes, so waiting a flat 45 s throws away most of
         what the second deployment bought. A rate limit says "wait", and no amount of shrinking
         fixes it. So concurrency 429s back off briefly, escalate, and draw on their own budget;
         rate limits keep the long wait and count as attempts. */
      const concurrency = /too many running|concurren|active task/i.test(body);
      if (concurrency) {
        onThrottle?.('too many running tasks');
        if (++waits > MAX_WAITS) throw new Error(`still throttled after ${MAX_WAITS} waits\n  ${last}`);
        await sleep((Number.isFinite(ra) ? ra + 3 : Math.min(30, 5 * waits)) * 1000);
        continue;
      }
      await sleep((Number.isFinite(ra) ? ra + 3 : 45) * 1000);
      i++;
      continue;
    }
    if (r.status >= 500) { await sleep(12000 * i); i++; continue; }
    /* Azure returns 400 for a reference-image upload that timed out server-side.
       It is transient despite the 4xx, and it is the only 400 worth retrying. */
    if (r.status === 400 && /upload timed out/i.test(body)) { await sleep(6000 * i); i++; continue; }
    throw new Error(`${url}\n  ${last}`);
  }
  throw new Error(`gave up after ${tries}\n  ${last}`);
}

/** Text -> still. Writes `out`, returns its path. */
export async function genImage(prompt, out, { size = '1536x1024', quality = 'high' } = {}) {
  const url = `${ENDPOINT}/openai/deployments/${IMG_DEPLOY}/images/generations?api-version=${IMG_APIV}`;
  const r = await call(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, size, n: 1, quality }),
  });
  const j = await r.json();
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) throw new Error(`no image in response: ${JSON.stringify(j).slice(0, 300)}`);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(b64, 'base64'));
  return out;
}

/** Pixel size of an image, so a reference can be checked rather than assumed. */
async function pixels(file) {
  const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]);
  const [w, h] = stdout.trim().split(',').map(Number);
  return { w, h };
}

/* Fit a reference image to exactly the requested size.

   Sora rejects any mismatch with "Inpaint image must match the requested width and height".
   The stills are 3:2 and the video is 16:9, so this centre-crops — trimming top and bottom
   only, which preserves both the composed empty left third and the subject placement — and
   then scales to exact pixels.

   It lives here rather than in each caller because it is a property of *this API*, not of
   any one generator. gen-clips.mjs had it and gen-era.mjs did not, with a comment claiming
   the client handled it; the client did not, and every era clip failed. */
async function fitRef(ref, size) {
  const [W, H] = size.split('x').map(Number);
  const { w, h } = await pixels(ref);
  if (w === W && h === H) return ref;
  const out = path.join(os.tmpdir(), `soraref-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`);
  await execFileP('ffmpeg', ['-y', '-loglevel', 'error', '-i', ref,
    '-vf', `crop='min(iw,ih*${W}/${H})':'min(ih,iw*${H}/${W})',scale=${W}:${H}:flags=lanczos`,
    '-frames:v', '1', out]);
  return out;
}

/** Text -> video, or image -> video when `ref` is a still. A reference of any size works —
    it is centre-cropped and scaled to `size` first, because sora requires an exact match. */
export async function genVideo(prompt, out, { seconds = '4', size = '1280x720', model = null, ref = null, onTick } = {}) {
  /* A named model pins the lane, so the slot is held on the deployment the job actually runs on. */
  const lane = await soraFleet.acquire(model);
  try {
    return await runVideo(prompt, out, { seconds, size, model: lane.name, lane, ref, onTick });
  } finally {
    soraFleet.release(lane);
  }
}

async function runVideo(prompt, out, { seconds, size, model, lane, ref, onTick }) {
  let init;
  let tmpRef = null;
  if (ref) {
    const fitted = await fitRef(ref, size);
    if (fitted !== ref) tmpRef = fitted;
    const png = await readFile(fitted);
    const fd = new FormData();
    fd.set('model', model);
    fd.set('prompt', prompt);
    fd.set('seconds', String(seconds));
    fd.set('size', size);
    fd.set('input_reference', new Blob([png], { type: 'image/png' }), 'ref.png');
    init = { method: 'POST', body: fd };
  } else {
    init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, seconds: String(seconds), size }),
    };
  }
  let create;
  try {
    create = await call(`${ENDPOINT}/openai/v1/videos?api-version=${VID_APIV}`, init, 10,
      (why) => soraFleet.throttled(lane, why));
  } finally {
    /* The fitted copy is only needed for the upload. Cleaning up here rather than after
       the poll loop keeps 170 of them out of the temp directory, and the finally matters
       because a rejected request is exactly when they would otherwise accumulate. */
    if (tmpRef) await rm(tmpRef, { force: true });
  }
  const job = await create.json();
  if (!job.id) throw new Error(`no job id: ${JSON.stringify(job).slice(0, 300)}`);

  /* Elapsed time, not iterations. 240 polls looked like a 40-minute cap and was not: each poll
     is a retrying `call()`, so a flaky upstream stretches every one of them and the "40 minutes"
     becomes however long 240 slow polls take. */
  const until = Date.now() + JOB_BUDGET_MS;
  for (let i = 0; Date.now() < until; i++) {
    await sleep(i === 0 ? 5000 : 10000);
    const s = await call(`${ENDPOINT}/openai/v1/videos/${job.id}?api-version=${VID_APIV}`, {});
    const j = await s.json();
    onTick?.(j);
    if (j.status === 'completed') {
      const c = await call(`${ENDPOINT}/openai/v1/videos/${job.id}/content?api-version=${VID_APIV}`, {});
      await mkdir(path.dirname(out), { recursive: true });
      await writeFile(out, Buffer.from(await c.arrayBuffer()));
      soraFleet.finished(lane);
      return { out, id: job.id, seconds: j.seconds, size: j.size, lane: lane.name };
    }
    if (j.status === 'failed') throw new Error(`sora failed: ${JSON.stringify(j.error)}`);
  }
  throw new Error(`sora job ${job.id} did not finish in ${Math.round(JOB_BUDGET_MS / 60000)} min`);
}

/** Run `jobs` with bounded concurrency; never rejects — returns per-job {ok,value|error}. */
export async function pool(jobs, limit, onDone) {
  const results = new Array(jobs.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= jobs.length) return;
      try {
        results[i] = { ok: true, value: await jobs[i].run() };
      } catch (e) {
        results[i] = { ok: false, error: String(e.message || e) };
      }
      onDone?.(jobs[i], results[i], i);
    }
  }));
  return results;
}
