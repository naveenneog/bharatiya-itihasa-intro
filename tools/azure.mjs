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
import { writeFile, mkdir, readFile } from 'node:fs/promises';
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

/* Shared retry policy: refresh on 401/403, honour Retry-After on 429,
   back off harder on 5xx (Azure image endpoints throw transient 500s).
   429 here is usually "Too many running tasks" — a concurrency cap, not a rate
   limit — so it needs patience rather than a smaller batch. */
async function call(url, init, tries = 10) {
  let last;
  for (let i = 1; i <= tries; i++) {
    const tok = await token();
    const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${tok}`, ...(init.headers || {}) } });
    if (r.ok) return r;
    const body = await r.text().catch(() => '');
    last = `HTTP ${r.status} ${body.slice(0, 300)}`;
    if (r.status === 401 || r.status === 403) { await token(true); await sleep(2000); continue; }
    if (r.status === 429) {
      const ra = parseInt(r.headers.get('retry-after') || '', 10);
      await sleep((Number.isFinite(ra) ? ra + 3 : 45) * 1000);
      continue;
    }
    if (r.status >= 500) { await sleep(12000 * i); continue; }
    /* Azure returns 400 for a reference-image upload that timed out server-side.
       It is transient despite the 4xx, and it is the only 400 worth retrying. */
    if (r.status === 400 && /upload timed out/i.test(body)) { await sleep(6000 * i); continue; }
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

/** Text -> video, or image -> video when `ref` is a PNG path whose pixel size is
    exactly `size`. Polls to completion and writes the mp4. */
export async function genVideo(prompt, out, { seconds = '4', size = '1792x1024', model = 'sora-2', ref = null, onTick } = {}) {
  let init;
  if (ref) {
    const png = await readFile(ref);
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
  const create = await call(`${ENDPOINT}/openai/v1/videos?api-version=${VID_APIV}`, init);
  const job = await create.json();
  if (!job.id) throw new Error(`no job id: ${JSON.stringify(job).slice(0, 300)}`);

  for (let i = 0; i < 240; i++) {
    await sleep(i === 0 ? 5000 : 10000);
    const s = await call(`${ENDPOINT}/openai/v1/videos/${job.id}?api-version=${VID_APIV}`, {});
    const j = await s.json();
    onTick?.(j);
    if (j.status === 'completed') {
      const c = await call(`${ENDPOINT}/openai/v1/videos/${job.id}/content?api-version=${VID_APIV}`, {});
      await mkdir(path.dirname(out), { recursive: true });
      await writeFile(out, Buffer.from(await c.arrayBuffer()));
      return { out, id: job.id, seconds: j.seconds, size: j.size };
    }
    if (j.status === 'failed') throw new Error(`sora failed: ${JSON.stringify(j.error)}`);
  }
  throw new Error(`sora job ${job.id} did not finish in time`);
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
