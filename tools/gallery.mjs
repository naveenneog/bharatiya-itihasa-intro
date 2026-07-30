/* One page that plays everything finished.

   There are now four kinds of deliverable in `dist/` — the episode in four caption treatments,
   three films, the era title sequences, and episode one — and opening them one at a time in a
   file browser is a bad way to compare things that are meant to be compared.

   The page reads what is actually on disk rather than a list kept by hand, so it cannot claim
   something exists that does not.

     node tools/gallery.mjs && start dist/index.html
*/
import { readdir, writeFile, stat, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileP = promisify(execFile);

async function probe(file) {
  try {
    const { stdout } = await execFileP('ffprobe', ['-v', 'error',
      '-show_entries', 'format=duration:stream=width,height', '-of', 'default=nw=1:nk=1', file]);
    const n = stdout.trim().split('\n').map((s) => Number(s));
    const dur = n.find((x) => x > 20) ?? 0;
    return { dur, w: n[0], h: n[1], size: (await stat(file)).size };
  } catch { return null; }
}

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const mb = (b) => `${(b / 1024 / 1024).toFixed(0)} MB`;

const SECTIONS = [
  {
    id: 'films',
    title: 'The films',
    blurb: 'Rebuilt from the shot up. The shot list is written first and the narration recorded '
      + 'into it, so silence is a decision rather than an accident of the audio. Three different '
      + 'structures, not three edits of one.',
    items: [
      ['zero-ascent.mp4', 'Ascent', 'Chronological. The shots shorten as the idea gathers force — patience, then inevitability.'],
      ['zero-reverse.mp4', 'Reverse', 'Opens on a number you read this morning and peels back, ending on one dot of ink on bark. Nothing is explained after it.'],
      ['zero-objection.mp4', 'Objection', 'An argument, not a chronicle. Ends on division by zero — the thing Brahmagupta got wrong that nobody fixed for a thousand years.'],
    ],
  },
  {
    id: 'versions',
    title: 'The episode, four ways',
    blurb: 'Same story, same art, same narration. Each differs from the next by exactly one thing, '
      + 'so a comparison between any two is a comparison of that thing.',
    items: [
      ['zero-v1-cut-e-framed.mp4', 'v1 · settle', 'The whole line is present; the spoken word is lit.'],
      ['zero-v2-cut-h-card.mp4', 'v2 · card', 'A few words at a time, set large.'],
      ['zero-v3-cut-i-flow.mp4', 'v3 · flow', 'The caption scrolls so the spoken word never leaves the centre line. The eye never has to search.'],
      ['zero-v4-cut-j-shots.mp4', 'v4 · flow + cuts', 'As v3, and the picture cuts to a new framing on the speaker\u2019s own pauses.'],
    ],
  },
  {
    id: 'sequences',
    title: 'Title sequences',
    blurb: 'Eighteen eras are seeded, fact-checked and generated; each assembles at exactly 47.9s '
      + 'from the same derived curve. Two are rendered here.',
    items: [
      ['chola-kingdom.mp4', 'Chola \u00b7 full', 'Ten beats of one kingdom, accelerating.'],
      ['gupta-zero-stinger.mp4', 'Gupta \u00b7 this episode\u2019s stinger', 'The golden age, then place value \u2014 chosen for this story rather than shared across the series.'],
    ],
  },
  {
    id: 'ep01',
    title: 'Episode one',
    blurb: 'The first finished episode, for reference.',
    items: [['ep01-aryabhata-youtube.mp4', 'Aryabhata Turns the Earth', 'Scored 83/100 on the retention scorecard.']],
  },
];

const rows = [];
for (const s of SECTIONS) {
  const items = [];
  for (const [file, name, note] of s.items) {
    const p = await probe(path.join('dist', file));
    if (p) items.push({ file, name, note, ...p });
  }
  if (items.length) rows.push({ ...s, items });
}

const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bhāratīya Itihāsa — what is finished</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="../vendor/fonts/fonts.css">
<style>
  :root{--paper:#0d0b09;--ink:#e8b64a;--hi:#f6dc9a;--saffron:#e07b2a;--dim:#b7a684}
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--paper);color:var(--dim);font-family:"Marcellus",Georgia,serif;
    -webkit-font-smoothing:antialiased;padding:5vw 5vw 12vw;max-width:1500px;margin:0 auto}
  h1{font-family:"Tiro Devanagari Hindi",serif;font-size:clamp(28px,4vw,58px);color:var(--hi);line-height:1.15}
  .sub{margin-top:.7em;font-size:clamp(11px,1.1vw,15px);letter-spacing:.42em;color:var(--dim)}
  .lede{margin-top:1.6em;max-width:62ch;font-family:"Cormorant Garamond",Georgia,serif;
    font-style:italic;font-size:clamp(16px,1.5vw,23px);line-height:1.5;color:var(--dim)}
  section{margin-top:5.5rem}
  h2{font-size:clamp(15px,1.5vw,22px);letter-spacing:.34em;text-transform:uppercase;color:var(--ink)}
  h2::after{content:"";display:block;width:4.5rem;height:1px;margin-top:.9rem;
    background:linear-gradient(90deg,var(--ink),transparent)}
  .blurb{margin-top:1.1rem;max-width:70ch;font-family:"Cormorant Garamond",Georgia,serif;
    font-size:clamp(15px,1.28vw,19px);line-height:1.55}
  .grid{margin-top:2.2rem;display:grid;gap:2.4rem;
    grid-template-columns:repeat(auto-fit,minmax(430px,1fr))}
  figure{background:#000;border:1px solid rgba(232,182,74,.14);border-radius:2px;overflow:hidden}
  video{display:block;width:100%;aspect-ratio:16/9;background:#000;cursor:pointer}
  figcaption{padding:1.1rem 1.2rem 1.3rem}
  .name{font-size:clamp(14px,1.15vw,18px);letter-spacing:.2em;color:var(--hi)}
  .meta{margin-top:.5rem;font-family:"Cormorant Garamond",Georgia,serif;font-variant-numeric:lining-nums;
    font-size:13px;letter-spacing:.16em;color:var(--saffron)}
  .note{margin-top:.75rem;font-family:"Cormorant Garamond",Georgia,serif;font-size:15px;
    line-height:1.5;color:var(--dim)}
  footer{margin-top:6rem;padding-top:2rem;border-top:1px solid rgba(232,182,74,.14);
    font-family:"Cormorant Garamond",Georgia,serif;font-size:15px;line-height:1.6;max-width:70ch}
  kbd{font-family:ui-monospace,monospace;font-size:12px;color:var(--hi);
    border:1px solid rgba(232,182,74,.3);border-radius:2px;padding:1px 5px}
</style>
</head>
<body>
<h1>भारतीय<br>इतिहास</h1>
<div class="sub">BHĀRATĪYA ITIHĀSA</div>
<p class="lede">Everything finished, in one place. Click any frame to play it; only one plays at a time.</p>

${rows.map((s) => `<section id="${s.id}">
  <h2>${esc(s.title)}</h2>
  <p class="blurb">${esc(s.blurb)}</p>
  <div class="grid">
${s.items.map((it) => `    <figure>
      <video src="${esc(it.file)}" preload="metadata" controls playsinline></video>
      <figcaption>
        <div class="name">${esc(it.name)}</div>
        <div class="meta">${clock(it.dur)} &nbsp;·&nbsp; ${it.w}×${it.h} &nbsp;·&nbsp; ${mb(it.size)}</div>
        <div class="note">${esc(it.note)}</div>
      </figcaption>
    </figure>`).join('\n')}
  </div>
</section>`).join('\n')}

<footer>
  Upload folders are beside this file in <kbd>dist/gupta/</kbd> — each carries the video,
  captions, chapters, description and title, plus an <kbd>UPLOAD.md</kbd> checklist. The
  episode versions also carry an <kbd>ab/</kbd> set: three thumbnails from different concepts
  and five ranked titles.
</footer>

<script>
  /* One at a time. Four six-minute films playing at once is not a comparison. */
  const vids = [...document.querySelectorAll('video')];
  for (const v of vids) v.addEventListener('play', () => vids.forEach((o) => { if (o !== v) o.pause(); }));
</script>
</body>
</html>
`;

await writeFile(path.join('dist', 'index.html'), html);
const n = rows.reduce((a, s) => a + s.items.length, 0);
console.log(`${n} finished piece(s) across ${rows.length} section(s) -> dist/index.html`);
for (const s of rows) console.log(`  ${s.title.padEnd(26)} ${s.items.length}`);
