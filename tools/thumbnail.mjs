/* Thumbnail candidates, composed in a page and judged at the size they are seen.

   A thumbnail is not a small poster. It is decided at roughly 320px wide, in a column of
   competing rectangles, in well under a second. Three things follow, and all three are
   enforced here rather than left to taste:

     the words must be few          three or four, never a sentence
     the type must be enormous      the headline's cap height is a fraction of frame
                                    height, not a point size — it survives the downscale
                                    or it does not
     the corners are not yours      YouTube lays a duration badge over the bottom right
                                    and a progress bar across the bottom on replay, so
                                    nothing that matters goes there

   Every candidate is rendered at 1280x720 *and* at 320x180, and the small one is what to
   look at. A layout that only works large is a layout that does not work.

     node tools/thumbnail.mjs                 # every candidate + contact sheet
     node tools/thumbnail.mjs --only defiant-hook
     node tools/thumbnail.mjs --pick defiant-hook   # promote one into publish.json
*/
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { launch } from '../scripts/browser.mjs';

const execFileP = promisify(execFile);

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };

const SLUG = arg('slug', 'aryabhata');
const PORT = Number(arg('port', 4421));
const ONLY = arg('only', null);
const PICK = arg('pick', null);
const EP = path.join('episodes', SLUG);
const ART = path.join(EP, 'thumb-art');
const OUT = path.join('dist', `thumbs-${SLUG}`);

const W = 1280;
const H = 720;

/* Headlines. Kept separate from layout so the same words can be tried against different
   pictures — which of the two is doing the work is otherwise impossible to tell.

   Aryabhata's set was written by hand before the packaging author existed, and is kept
   verbatim so episode one can still be rebuilt exactly as it shipped. Every other episode
   gets its headlines from `publish.json`, where tools/pack.mjs writes five ranked options
   with the overclaims marked.

   "1,000 years before Copernicus" is a hook, not a stretch: the Aryabhatiya is 499 CE and
   De revolutionibus is 1543, so the gap is 1,044 years. Everything here has to survive
   someone checking it, or the channel pays for the click twice. */
const ARYABHATA_HEADLINES = {
  turns: { kicker: '499 CE', l1: 'THE EARTH', l2: 'TURNS', foot: 'BHĀRATĪYA ITIHĀSA · EP 01' },
  hook: { kicker: '1,000 YEARS EARLY', l1: 'HE SAID THE', l2: 'EARTH TURNS', foot: 'INDIA, 499 CE' },
  before: { kicker: 'INDIA, 499 CE', l1: '1,000 YEARS', l2: 'BEFORE COPERNICUS', foot: 'BHĀRATĪYA ITIHĀSA · EP 01', tight: true },
  who: { kicker: '499 CE', l1: 'WHO MOVED', l2: 'THE EARTH?', foot: 'BHĀRATĪYA ITIHĀSA · EP 01' },

  /* Loud. The elegant set is brand-correct and, at 320px, quiet — the kicker and the
     footer are texture rather than information, and the headline is polite next to what
     it competes with in a feed.

     These drop everything that is not the claim, put the claim at nearly a fifth of the
     frame height, and give the date a solid gold chip that survives the downscale as a
     shape even when the letters inside it stop being letters. Same typeface, same two
     colours — it is louder, not different. */
  turnsLoud: { kicker: '499 CE', l1: 'THE EARTH', l2: 'TURNS', loud: true },
  beforeLoud: { kicker: 'INDIA · 499 CE', l1: '1,000 YEARS', l2: 'BEFORE', l3: 'COPERNICUS', loud: true },
  whoLoud: { kicker: '499 CE', l1: 'WHO MOVED', l2: 'THE EARTH?', loud: true },

  /* The strongest hook that is also airtight.

     "1,000 years before Copernicus" on its own invites the reading that Aryabhata beat
     him to heliocentrism. He did not — he argued the Earth *rotates on its axis*, which
     is why the stars appear to sweep west. That is a real part of what Copernicus later
     asserted, and Aryabhata wrote it in 499 against De revolutionibus in 1543, a gap of
     1,044 years. So the claim goes in the headline and the comparison goes in the chip:
     the viewer reads what he actually said first, and what it is worth second. A history
     channel pays twice for a click it has to defend in the comments. */
  turnsCop: { kicker: '1,000 YEARS BEFORE COPERNICUS', l1: 'THE EARTH', l2: 'TURNS', loud: true },
};

/* Layouts. `art` names a plate from gen-thumb-art.mjs; `pos` is its object-position,
   because each plate puts the face somewhere different and a fixed crop decapitates one
   of them. `side` says which half the type takes — the art was generated with the left
   third empty, but the eye plate reads better with the words on the right. */
const ARYABHATA_CANDIDATES = [
  { id: 'defiant-turns', art: 'defiant-r1', pos: '62% 38%', side: 'left', head: 'turns' },
  { id: 'defiant-hook', art: 'defiant-r1', pos: '62% 38%', side: 'left', head: 'hook' },
  { id: 'defiant-before', art: 'defiant-r1', pos: '62% 38%', side: 'left', head: 'before' },
  { id: 'hold-turns', art: 'hold-r1', pos: '50% 42%', side: 'left', head: 'turns' },
  { id: 'hold-hook', art: 'hold-r1', pos: '50% 42%', side: 'left', head: 'hook' },
  { id: 'gaze-hook', art: 'gaze-r1', pos: '58% 40%', side: 'left', head: 'hook' },
  { id: 'eye-who', art: 'eye-r1', pos: '58% 50%', side: 'left', head: 'who' },
  { id: 'eye-before', art: 'eye-r1', pos: '58% 50%', side: 'left', head: 'before' },

  // the loud set — same pictures, the claim at full volume
  { id: 'LOUD-defiant', art: 'defiant-r1', pos: '62% 38%', side: 'left', head: 'turnsLoud' },
  { id: 'LOUD-hold', art: 'hold-r1', pos: '50% 42%', side: 'left', head: 'turnsLoud' },
  { id: 'LOUD-defiant-cop', art: 'defiant-r1', pos: '62% 38%', side: 'left', head: 'beforeLoud' },
  { id: 'LOUD-hold-cop', art: 'hold-r1', pos: '50% 42%', side: 'left', head: 'beforeLoud' },
  { id: 'LOUD-eye', art: 'eye-r1', pos: '58% 50%', side: 'left', head: 'whoLoud' },
  { id: 'LOUD-gaze', art: 'gaze-r1', pos: '58% 40%', side: 'left', head: 'turnsLoud' },
  // claim in the headline, comparison in the chip — the hook without the overclaim
  { id: 'BEST-hold', art: 'hold-r1', pos: '50% 42%', side: 'left', head: 'turnsCop' },
  { id: 'BEST-defiant', art: 'defiant-r1', pos: '62% 38%', side: 'left', head: 'turnsCop' },
  { id: 'BEST-gaze', art: 'gaze-r1', pos: '58% 40%', side: 'left', head: 'turnsCop' },
];

/* Where each plate's subject sits, so the 16:9 crop does not take the top of a head off.
   The four concepts are the same for every episode, so these are too. */
const PLATES = [
  { art: 'defiant', pos: '62% 38%' },
  { art: 'hold', pos: '50% 42%' },
  { art: 'gaze', pos: '58% 40%' },
  { art: 'eye', pos: '58% 50%' },
];

/* Plates are never overwritten, so re-generating a subject writes -r2 beside -r1. Naming
   the revision here would have quietly gone on composing thumbnails from the old figure —
   which is exactly the run that produced a bearded elder for an episode whose art shows a
   moustached man in his twenties. */
const plateFiles = await readdir(ART).catch(() => []);
const newestPlate = (name) => {
  let best = null; let n = 0;
  for (const f of plateFiles) {
    const g = f.match(new RegExp(`^${name}-r(\\d+)\\.png$`));
    if (g && Number(g[1]) >= n) { n = Number(g[1]); best = f.replace(/\.png$/, ''); }
  }
  return best || `${name}-r1`;
};

/**
 * Cross this episode's authored headlines with the four plates.
 *
 * Three headlines against four pictures is twelve candidates, which is as many as can
 * usefully be compared on one contact sheet; the top headline also gets the quiet
 * treatment on the two strongest plates, so the choice between loud and elegant is
 * available rather than assumed.
 */
function fromPackaging(meta) {
  const opts = (meta.options?.thumb_headlines || []).filter((h) => h.lines?.length);
  if (!opts.length) return null;
  const kicker = meta.thumb?.kicker || '';
  const heads = {};
  const cands = [];

  opts.slice(0, 3).forEach((h, i) => {
    const lines = h.lines.map((s) => String(s).toUpperCase());
    const key = `h${i + 1}`;
    heads[`${key}Loud`] = { kicker, l1: lines[0], l2: lines[1] || '', l3: lines[2] || null, loud: true };
    /* The quiet treatment cannot hold three lines at its size, and the second line is set
       in gold — a headline whose second line is a preposition reads as an error. */
    heads[key] = {
      kicker,
      l1: lines.slice(0, -1).join(' ') || lines[0],
      l2: lines[lines.length - 1],
      foot: 'BHĀRATĪYA ITIHĀSA',
      tight: lines.join(' ').length > 22,
    };
    for (const p of PLATES) {
      cands.push({ id: `LOUD-${p.art}-${key}`, art: newestPlate(p.art), pos: p.pos, side: 'left', head: `${key}Loud` });
    }
    if (i === 0) {
      for (const p of PLATES.slice(0, 2)) {
        cands.push({ id: `quiet-${p.art}-${key}`, art: newestPlate(p.art), pos: p.pos, side: 'left', head: key });
      }
    }
  });
  return { heads, cands };
}

const meta = await readFile(path.join(EP, 'publish.json'), 'utf8').then(JSON.parse).catch(() => ({}));
const authored = SLUG === 'aryabhata' ? null : fromPackaging(meta);
if (!authored && SLUG !== 'aryabhata') {
  console.error(`no thumbnail headlines for ${SLUG} — run: node tools/pack.mjs --slug ${SLUG}`);
  process.exit(1);
}
const HEADLINES = authored?.heads || ARYABHATA_HEADLINES;
const CANDIDATES = authored?.cands || ARYABHATA_CANDIDATES;

const chosen = ONLY ? CANDIDATES.filter((c) => c.id === ONLY) : CANDIDATES;
if (!chosen.length) {
  console.error(`no candidate "${ONLY}" — one of:\n  ${CANDIDATES.map((c) => c.id).join('\n  ')}`);
  process.exit(1);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function page(c) {
  const h = HEADLINES[c.head];
  const right = c.side === 'right';
  /* Cap height as a share of frame height. 8.6% survives 320px; the long
     "BEFORE COPERNICUS" line gets 7.2% so it still fits the column. The loud set runs at
     a fifth of frame height, which is where a thumbnail actually competes. */
  const size = h.loud ? (h.l3 ? 0.128 : 0.152) : (h.tight ? 0.072 : 0.086);
  const width = h.loud ? 58 : 52;
  /* A Marcellus capital advances about 0.62em, and the chip adds 0.18em of tracking, so
     a character costs roughly 0.8em. Solve for the size that fits the column and cap it
     at the size a short chip looks right at. */
  const chipSize = Math.min(0.046, ((width / 100) * W) / (h.kicker.length * 0.8) / H);
  return `<!doctype html><meta charset="utf-8">
<style>
  @font-face{font-family:"Marcellus";src:url("/vendor/fonts/marcellus-latin-1.woff2") format("woff2");font-display:block}
  @font-face{font-family:"Marcellus";src:url("/vendor/fonts/marcellus-latin-ext-0.woff2") format("woff2");font-display:block}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0d0b09}
  #t{position:relative;width:${W}px;height:${H}px;overflow:hidden;
     font-family:"Marcellus",Georgia,serif}
  img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${h.pos || c.pos}}

  /* The art is already black on the type side; this only deepens it enough that thin
     serif strokes keep their contrast when the whole thing is 320px wide. The loud set
     needs more, because the type runs further across the picture. */
  #scrim{position:absolute;inset:0;background:
    linear-gradient(${right ? 270 : 90}deg,rgba(6,5,4,${h.loud ? '.985' : '.96'}) 0%,
      rgba(6,5,4,${h.loud ? '.95' : '.9'}) ${h.loud ? 38 : 30}%,
      rgba(6,5,4,${h.loud ? '.55' : '.46'}) ${h.loud ? 60 : 54}%,rgba(6,5,4,0) 86%)}
  /* A warm bloom behind the subject. At feed size mid-tones collapse toward the
     background; this keeps the figure separated from the black. */
  #glow{position:absolute;${right ? 'left' : 'right'}:-8%;top:-12%;width:72%;height:124%;
    background:radial-gradient(ellipse at 48% 48%,rgba(232,182,74,.20),rgba(232,182,74,0) 62%);
    mix-blend-mode:screen}
  #vig{position:absolute;inset:0;box-shadow:inset 0 0 200px 54px rgba(0,0,0,.72)}

  #copy{position:absolute;${right ? 'right' : 'left'}:5.4%;top:50%;transform:translateY(-50%);
    width:${width}%;text-align:${right ? 'right' : 'left'}}
  .kick{font-size:${Math.round(H * 0.042)}px;letter-spacing:.34em;color:#e8b64a;
    margin-bottom:${Math.round(H * 0.026)}px;white-space:nowrap}
  /* The loud kicker is a solid chip, not letterspaced text: at 320px the letters inside
     it stop resolving, but the gold block still reads as a date badge. Its size is driven
     by how many characters it has to hold — "499 CE" and "1,000 YEARS BEFORE COPERNICUS"
     cannot share one font size inside a column 58% of the frame wide, and the long one
     silently overflowed at the short one's size. */
  .kick.chip{display:inline-block;background:#e8b64a;color:#120d06;
    padding:${Math.round(H * 0.012)}px ${Math.round(H * 0.024)}px;letter-spacing:.18em;
    font-size:${Math.round(H * chipSize)}px;border-radius:2px;
    margin-bottom:${Math.round(H * 0.032)}px;white-space:nowrap}
  .rule{width:${Math.round(W * 0.075)}px;height:2px;margin-bottom:${Math.round(H * 0.034)}px;
    background:linear-gradient(${right ? 270 : 90}deg,#e8b64a,rgba(232,182,74,0));
    ${right ? 'margin-left:auto;' : ''}}
  h1{font-weight:400;font-size:${Math.round(H * size)}px;line-height:${h.loud ? '.9' : '.96'};
     color:#f6ecd8;letter-spacing:${h.loud ? '-.008em' : '.004em'};
     /* a hard shadow, not a soft one — soft glow disappears at 320px */
     text-shadow:0 3px 0 rgba(0,0,0,.55), 0 8px 44px rgba(0,0,0,.95)}
  h1 em{font-style:normal;color:#e8b64a}
  .foot{margin-top:${Math.round(H * 0.042)}px;font-size:${Math.round(H * 0.029)}px;
    letter-spacing:.3em;color:rgba(183,166,132,.85);white-space:nowrap}

  /* Where YouTube puts its own furniture. Never drawn — only used to prove nothing of
     ours is underneath, by screenshotting with ?guides=1. */
  #guides{display:none;position:absolute;inset:0}
  #guides .badge{position:absolute;right:2%;bottom:7%;width:15%;height:9%;
    outline:2px dashed rgba(255,64,64,.9)}
  #guides .bar{position:absolute;left:0;right:0;bottom:0;height:5%;
    outline:2px dashed rgba(255,64,64,.9)}
  #guides .safe{position:absolute;inset:5%;outline:2px dashed rgba(64,160,255,.8)}
</style>
<div id="t">
  <img src="/${ART.replace(/\\/g, '/')}/${c.art}.png">
  <div id="glow"></div>
  <div id="scrim"></div>
  <div id="copy">
    <div class="kick${h.loud ? ' chip' : ''}">${esc(h.kicker)}</div>
    ${h.loud ? '' : '<div class="rule"></div>'}
    <h1>${esc(h.l1)}<br><em>${esc(h.l2)}</em>${h.l3 ? `<br><em>${esc(h.l3)}</em>` : ''}</h1>
    ${h.foot ? `<div class="foot">${esc(h.foot)}</div>` : ''}
  </div>
  <div id="vig"></div>
  <div id="guides"><i class="badge"></i><i class="bar"></i><i class="safe"></i></div>
</div>
<script>
  if (new URLSearchParams(location.search).has('guides')) document.querySelector('#guides').style.display='block';
</script>`;
}

// ── render ────────────────────────────────────────────────────────────────
const have = new Set(await readdir(ART).catch(() => []));
for (const c of chosen) {
  if (!have.has(`${c.art}.png`)) {
    console.error(`missing plate ${c.art}.png — run: node tools/gen-thumb-art.mjs`);
    process.exit(1);
  }
}

await mkdir(OUT, { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* gone */ } };
process.on('exit', stop);

try {
  await new Promise((r) => setTimeout(r, 700));
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  for (const c of chosen) {
    const html = path.join(OUT, `.${c.id}.html`);
    await writeFile(html, page(c));
    await p.goto(`http://localhost:${PORT}/${OUT.replace(/\\/g, '/')}/.${c.id}.html`, { waitUntil: 'load' });

    const ok = await p.evaluate(() => {
      const im = document.querySelector('#t img');
      return !!im && im.complete && im.naturalWidth > 0;
    });
    if (!ok) throw new Error(`plate did not load for ${c.id}`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(250);

    /* Type that runs past its column is not visibly broken in a 1280px screenshot — it
       just sits closer to the face than intended — and at 320px it reads as clutter.
       Measure it instead of trusting the arithmetic. */
    const over = await p.evaluate(() => {
      const box = document.querySelector('#copy').getBoundingClientRect();
      const bad = [];
      for (const el of document.querySelectorAll('#copy .kick, #copy h1, #copy .foot')) {
        const r = el.getBoundingClientRect();
        if (r.right > box.right + 1) bad.push(`${el.className || el.tagName} +${Math.round(r.right - box.right)}px`);
      }
      return { bad, bottom: box.bottom, top: box.top };
    });
    if (over.bad.length) throw new Error(`${c.id}: type overflows its column — ${over.bad.join(', ')}`);
    if (over.top < H * 0.05 || over.bottom > H * 0.93) {
      throw new Error(`${c.id}: type leaves the safe area (top ${Math.round(over.top)}, bottom ${Math.round(over.bottom)})`);
    }

    const png = path.join(OUT, `${c.id}.png`);
    await p.locator('#t').screenshot({ path: png });
    await execFileP('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '2',
      path.join(OUT, `${c.id}.jpg`)]);
    // the size it is actually judged at
    await execFileP('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', 'scale=320:180',
      path.join(OUT, `${c.id}-feed.png`)]);
    const kb = (await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=size',
      '-of', 'default=nw=1:nk=1', path.join(OUT, `${c.id}.jpg`)])).stdout.trim();
    console.log(`  ok   ${c.id.padEnd(16)} ${HEADLINES[c.head].l1} ${HEADLINES[c.head].l2}`
      + `  (${(Number(kb) / 1024).toFixed(0)} KB)`);
  }
  await browser.close();
} finally {
  stop();
}

// ── contact sheets ────────────────────────────────────────────────────────
/* Two sheets: one at full size to check the craft, one at feed size to make the
   decision. They are looked at in that order and decided in the opposite one. */
async function sheet(suffix, scale, cols, out) {
  const tmp = path.join(OUT, '.sheet');
  await mkdir(tmp, { recursive: true });
  let i = 1;
  for (const c of chosen) {
    await execFileP('ffmpeg', ['-y', '-loglevel', 'error',
      '-i', path.join(OUT, `${c.id}${suffix}.png`), '-vf', `scale=${scale}`,
      path.join(tmp, `s${String(i).padStart(2, '0')}.png`)]);
    i++;
  }
  const rows = Math.ceil(chosen.length / cols);
  await execFileP('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(tmp, 's%02d.png'),
    '-filter_complex', `tile=${cols}x${rows}:padding=6:margin=6:color=0x1a1512`,
    '-frames:v', '1', out]);
}

await sheet('', '480:270', 2, path.join(OUT, 'sheet-full.png'));
await sheet('-feed', '320:180', 3, path.join(OUT, 'sheet-feed.png'));

console.log(`\n${chosen.length} candidate(s) -> ${OUT}/`);
console.log('  sheet-full.png   craft check');
console.log('  sheet-feed.png   the decision — 320px, the size it is seen at');
console.log(`\norder: ${chosen.map((c) => c.id).join(', ')}`);

// ── promote a winner ──────────────────────────────────────────────────────
/* `--pick first` takes the top-ranked candidate: the highest-rated headline pack.mjs wrote,
   on the first plate, in the loud treatment. It exists so a series can be produced without a
   human at every fourteenth stage — the whole run used to stop here, having already spent
   forty minutes rendering a master it could not publish.

   It is a default, not a judgement. The contact sheet is still written, and re-picking is one
   command and one re-publish rather than a re-render. */
const PICKID = PICK === 'first' ? CANDIDATES[0]?.id : PICK;
if (PICKID) {
  const c = CANDIDATES.find((x) => x.id === PICKID);
  if (!c) { console.error(`\nno candidate ${PICKID}`); process.exit(1); }
  const h = HEADLINES[c.head];
  const pubPath = path.join(EP, 'publish.json');
  const pub = JSON.parse(await readFile(pubPath, 'utf8'));
  /* Recorded for the record rather than for rendering — publish.mjs collects the rendered
     candidate now, it does not re-compose it. Keeping the words here means publish.json
     still says what the thumbnail actually claims, which is the thing worth auditing. */
  pub.thumb = {
    candidate: c.id,
    art: `thumb-art/${c.art}.png`,
    pos: h.pos || c.pos,
    kicker: h.kicker,
    headline: [h.l1, h.l2, h.l3].filter(Boolean).join(' '),
    lines: [h.l1, h.l2, h.l3].filter(Boolean),
    foot: h.foot || null,
  };
  await writeFile(pubPath, `${JSON.stringify(pub, null, 2)}\n`);
  /* The stage's real output is the pick, not the contact sheet.
     Keyed on the sheet, a resumed run skipped this stage because the sheet was already there
     from a run made before there was a pick at all — and then failed at publish, which is the
     stage that needs it. What a stage `makes` has to be the thing the next stage reads. */
  await writeFile(path.join(OUT, 'picked.json'), `${JSON.stringify({ candidate: PICKID }, null, 2)}\n`);
  console.log(`\npicked ${PICKID}${PICK === 'first' ? ' (top-ranked; review sheet-feed.png and --pick to change)' : ''} -> ${pubPath}`);
}
