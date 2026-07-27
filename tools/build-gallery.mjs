/* Build gallery.html — a single page indexing every version, every direction, every
   revision and every clip that exists on disk. Nothing is curated away: if it was
   generated, it shows up here, so old versions stay reviewable.

   node tools/build-gallery.mjs
*/
import { readdir, stat, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'versions';

const ls = async (p) => readdir(p).catch(() => []);
const isDir = async (p) => (await stat(p).catch(() => null))?.isDirectory() ?? false;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const versions = [];

/* v1 goes in first so the AI directions are reviewed against what they replace,
   not in isolation. It has no direction.json — its metadata is stated here. */
try {
  await stat('dist/itihasa-intro.mp4');
  versions.push({
    id: 'v1-one-line',
    dir: '.',
    play: 'index.html',
    meta: {
      name: 'v1 — One Line, Five Thousand Years',
      pitch: 'The original: a single drawn line that travels through five eras, rendered procedurally '
        + 'in SVG. Fully offline, deterministic, 60fps, no AI in the pipeline.',
      motion: 'One continuous nib stroke morphs from one monument into the next without ever lifting.',
    },
    beats: new Map(),
    clips: [],
    builds: ['../dist/itihasa-intro.mp4'],
  });
} catch { /* v1 not rendered */ }

for (const id of (await ls(ROOT)).sort()) {
  const dir = path.join(ROOT, id);
  if (!(await isDir(dir))) continue;

  let meta = {};
  try { meta = JSON.parse(await readFile(path.join(dir, 'direction.json'), 'utf8')); } catch { /* v1 has none */ }

  const stills = (await ls(path.join(dir, 'stills'))).filter((f) => f.endsWith('.png')).sort();
  const clips = (await ls(path.join(dir, 'clips'))).filter((f) => f.endsWith('.mp4')).sort();
  const builds = (await ls(path.join(dir, 'build'))).filter((f) => f.endsWith('.mp4')).sort();
  const hasPlayer = (await ls(path.join(dir, 'build'))).includes('index.html');

  // Group stills by beat so revisions of the same beat sit together.
  const beats = new Map();
  for (const f of stills) {
    const key = f.replace(/-r\d+\.png$/, '');
    if (!beats.has(key)) beats.set(key, []);
    beats.get(key).push(f);
  }
  versions.push({
    id, meta, beats, clips, builds, dir,
    play: hasPlayer ? `${dir.replace(/\\/g, '/')}/build/index.html` : null,
  });
}

const card = (v) => `
<section class="ver" id="${esc(v.id)}">
  <header>
    <h2>${esc(v.meta.name || v.id)}</h2>
    <code>${esc(v.id)}</code>
  </header>
  ${v.meta.pitch ? `<p class="pitch">${esc(v.meta.pitch)}</p>` : ''}
  ${v.meta.motion ? `<p class="motion"><b>Motion:</b> ${esc(v.meta.motion)}</p>` : ''}
  ${v.play ? `<p><a class="play" href="${esc(v.play)}" target="_blank">▶ Play the sequence</a></p>` : ''}

  ${v.builds.length ? `<div class="row builds">${v.builds.map((f) => `
    <figure class="wide"><video src="${esc(f.startsWith('..') ? f.slice(3) : `${v.dir}/build/${f}`)}" controls preload="metadata"></video>
    <figcaption>${esc(path.basename(f))} — assembled sequence</figcaption></figure>`).join('')}</div>` : ''}

  ${v.clips.length ? `<h3>Sora clips</h3><div class="row">${v.clips.map((f) => `
    <figure><video src="${esc(v.dir)}/clips/${esc(f)}" controls loop muted preload="metadata"></video>
    <figcaption>${esc(f)}</figcaption></figure>`).join('')}</div>` : ''}

  ${v.beats.size ? `<h3>Stills</h3>${[...v.beats.entries()].map(([beat, files]) => `
    <div class="beat"><div class="beatname">${esc(beat)}${files.length > 1 ? ` <span class="revs">${files.length} revisions</span>` : ''}</div>
    <div class="row">${files.map((f) => `
      <figure><a href="${esc(v.dir)}/stills/${esc(f)}" target="_blank">
      <img loading="lazy" src="${esc(v.dir)}/stills/${esc(f)}" alt="${esc(f)}"></a>
      <figcaption>${esc(f.match(/-r(\d+)\.png$/)?.[0].slice(1, -4) || f)}</figcaption></figure>`).join('')}</div></div>`).join('')}` : ''}
</section>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bhāratīya Itihāsa — intro versions</title>
<style>
  :root{--bg:#0d0b09;--ink:#f3e7d0;--dim:#b7a684;--gold:#e8b64a}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:15px/1.6 "Segoe UI",system-ui,sans-serif;padding:48px 40px 120px}
  h1{font-size:30px;font-weight:500;letter-spacing:.02em;margin:0 0 6px}
  .sub{color:var(--dim);margin:0 0 14px}
  nav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 44px;padding-bottom:22px;
    border-bottom:1px solid rgba(232,182,74,.16)}
  nav a{color:var(--gold);text-decoration:none;border:1px solid rgba(232,182,74,.3);
    border-radius:999px;padding:6px 15px;font-size:13px}
  nav a:hover{background:rgba(232,182,74,.12)}
  .ver{margin:0 0 68px;padding:0 0 40px;border-bottom:1px solid rgba(232,182,74,.12)}
  .ver header{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
  h2{font-size:23px;font-weight:500;margin:0;color:var(--gold)}
  code{color:var(--dim);font-size:12px}
  .pitch{max-width:74ch;color:var(--ink);margin:10px 0 4px}
  .motion{max-width:74ch;color:var(--dim);margin:0 0 20px;font-size:14px}
  .motion b{color:var(--dim);font-weight:600}
  .play{display:inline-block;margin:2px 0 20px;color:var(--bg);background:var(--gold);
    text-decoration:none;border-radius:999px;padding:9px 22px;font-size:13.5px;font-weight:600;
    letter-spacing:.04em}
  .play:hover{background:#f6dc9a}
  h3{font-size:12px;text-transform:uppercase;letter-spacing:.2em;color:var(--dim);
    margin:26px 0 12px;font-weight:600}
  .row{display:flex;flex-wrap:wrap;gap:14px}
  figure{margin:0;width:340px}
  figure.wide{width:min(760px,100%)}
  img,video{width:100%;border-radius:7px;display:block;background:#000;
    border:1px solid rgba(232,182,74,.18)}
  img:hover{border-color:rgba(232,182,74,.65)}
  figcaption{font-size:11.5px;color:var(--dim);margin-top:6px;letter-spacing:.04em}
  .beat{margin:0 0 20px}
  .beatname{font-size:13px;color:var(--ink);margin:0 0 8px;letter-spacing:.05em}
  .revs{color:var(--gold);font-size:11px;margin-left:6px}
  .empty{color:var(--dim);font-style:italic}
</style></head><body>
<h1>Bhāratīya Itihāsa — intro versions</h1>
<p class="sub">Every generated version, kept intact. Click a still to open it full size.
Generated ${new Date().toLocaleString()}.</p>
<nav>${versions.map((v) => `<a href="#${esc(v.id)}">${esc(v.meta.name || v.id)}</a>`).join('')}</nav>
${versions.length ? versions.map(card).join('\n') : '<p class="empty">Nothing generated yet.</p>'}
</body></html>`;

await writeFile('gallery.html', html);
console.log(`gallery.html — ${versions.length} versions, ` +
  `${versions.reduce((n, v) => n + [...v.beats.values()].flat().length, 0)} stills, ` +
  `${versions.reduce((n, v) => n + v.clips.length, 0)} clips`);
