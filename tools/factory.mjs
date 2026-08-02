/* One story in, one uploadable folder out — twice.

   Every stage of this already existed as its own tool, and running them by hand for one
   episode was fine. Eleven Gupta stories at two versions each is twenty-two runs of a
   fourteen-stage sequence, and the stages that cost an hour are at the end, which is the
   worst possible place to discover that stage three was skipped.

   So: the sequence is written down once, every stage declares what it produces, and a stage
   whose output already exists is skipped. A run that dies at the render can be restarted and
   will pick up where it stopped rather than regenerating four dollars of images.

   The two versions differ by **one thing only** — how the caption behaves — so a comparison
   between them is a comparison of that and nothing else. Everything upstream (narration,
   art, packaging, thumbnail, title sequence) is generated once and shared.

     node tools/factory.mjs --story the_dot_that_became_zero --slug zero --era gupta --plan
     node tools/factory.mjs --story the_dot_that_became_zero --slug zero --era gupta
     node tools/factory.mjs --slug zero --from render          # resume
     node tools/factory.mjs --slug zero --only pack --force    # redo one stage
     node tools/factory.mjs --slug zero --draft                # 40s, half scale, for a look
*/
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const SLUG = arg('slug', null);
const ERA = arg('era', 'gupta');
const PLAN = has('plan');
const FORCE = has('force');
const DRAFT = has('draft');
const FROM = arg('from', null);
const UNTIL = arg('until', null);
const ONLY = arg('only', null);
const CONC = Number(arg('conc', '1'));

if (!SLUG) {
  console.error('usage: node tools/factory.mjs --story <story_key> --slug <slug> --era <era>');
  process.exit(1);
}

/* The story key is only needed the first time. After that it is in the built episode, and
   asking for it again is a chance to pass a different one by mistake. */
const STORY = arg('story', null)
  || await readFile(path.join('episodes', SLUG, 'episode.json'), 'utf8')
    .then((s) => JSON.parse(s).id)
    .catch(() => null);
if (!STORY) {
  console.error(`no --story and no built episode at episodes/${SLUG} — pass --story <story_key>`);
  process.exit(1);
}

/* The version this produces.

   It was three, differing only in the caption, because the point was to learn which caption
   treatment holds. That question has been answered by looking at them: the book — the framed
   layout with the crease at the caption boundary, the recto turning over to reveal the next
   panel — with v1's settled caption under it. A scrolling caption beneath a turning page is a
   second thing moving, and two competing motions read as instability rather than as either
   effect.

   The others are still cuts and still render; `--versions v1,v2,v3` brings them back for a
   story where the comparison is worth another two hours. */
const ALL_VERSIONS = {
  book: { id: 'book', cut: 'cut-k-page', what: 'the book — settled caption, the page turns' },
  v1: { id: 'v1', cut: 'cut-e-framed', what: 'settle — the line is present, the spoken word is lit' },
  v2: { id: 'v2', cut: 'cut-h-card', what: 'card — a few words at a time, set large' },
  v3: { id: 'v3', cut: 'cut-i-flow', what: 'flow — the caption scrolls so the spoken word never moves' },
};
const VERSIONS = (arg('versions', 'book')).split(',').map((s) => s.trim()).filter(Boolean)
  .map((k) => {
    if (!ALL_VERSIONS[k]) {
      console.error(`no version "${k}" — one of: ${Object.keys(ALL_VERSIONS).join(', ')}`);
      process.exit(1);
    }
    return ALL_VERSIONS[k];
  });

const EP = path.join('episodes', SLUG);
/* One stinger per episode, not one per era. The era's default beats are a reasonable
   era-level answer and a bad episode-level one — every episode of a series would open on
   the same two objects, and for one of them those objects belong to a different story. */
const INTRO = path.join('dist', `${ERA}-${SLUG}-stinger.mp4`);
const OUTRO = path.join('dist', `${SLUG}-outro.mp4`);
const BUILDDIR = `build-stinger-${SLUG}`;
const THUMBS = path.join('dist', `thumbs-${SLUG}`);
const master = (v) => path.join('dist', `${SLUG}-${v.id}-${v.cut}.mp4`);
/* Grouped by era, because nineteen series at two versions each is four hundred folders in
   one directory otherwise. */
const upload = (v) => path.join('dist', ERA, `${SLUG}_${v.id}`);

const draftArgs = DRAFT ? ['--limit', '40', '--scale', '0.5', '--fps', '12'] : ['--fps', '25'];

/* Read at run time, not at plan time: the stinger stage writes this file, and the stages
   that consume it run after. Reading it up front would bake in whatever was there before. */
function beats() {
  try {
    return JSON.parse(readFileSync(path.join(EP, 'stinger.json'), 'utf8')).beats.join(',');
  } catch {
    console.error(`no ${EP}/stinger.json — the stinger stage must run first`);
    process.exit(1);
  }
}

/* Every stage: what it is, what it produces, and how to make it. `makes` is what lets a
   stage be skipped; a stage with no `makes` always runs. `each` fans a stage out over the
   two versions. */
const STAGES = [
  {
    id: 'episode',
    what: 'build the episode from IndianHistory (art, audio, timings)',
    makes: () => path.join(EP, 'episode.json'),
    run: () => ['tools/build-episode.mjs', '--story', STORY, '--slug', SLUG],
  },
  {
    id: 'voice',
    what: 'say years as years — re-synthesise any line the source reads as a quantity',
    makes: () => path.join(EP, 'voice-fix', 'index.json'),
    run: () => ['tools/speak.mjs', '--slug', SLUG, '--all'],
  },
  {
    id: 'rebuild',
    what: 'rebuild the episode so it picks the corrected lines up',
    run: () => ['tools/build-episode.mjs', '--story', STORY, '--slug', SLUG],
  },
  {
    id: 'subject',
    what: 'who the thumbnail is of, and what they hold',
    makes: () => path.join(EP, 'thumb-art', 'subject.json'),
    run: () => ['tools/subject.mjs', '--slug', SLUG],
  },
  {
    id: 'pack',
    what: 'title, hook, chapters, tags, thumbnail headlines — from the narration',
    makes: () => path.join(EP, 'publish.json'),
    run: () => ['tools/pack.mjs', '--slug', SLUG],
  },
  {
    id: 'thumb-art',
    what: 'four thumbnail plates in the Ink and Light language',
    makes: () => path.join(EP, 'thumb-art', 'hold-r1.png'),
    run: () => ['tools/gen-thumb-art.mjs', '--slug', SLUG],
  },
  {
    id: 'hook',
    what: 'the cold open — one claim, in the narrator\'s voice, over the thumbnail art',
    makes: () => path.join(EP, 'hook', 'hook.mp3'),
    run: () => ['tools/hook.mjs', '--slug', SLUG],
  },
  {
    id: 'refold',
    what: 'rebuild so the cold open becomes the episode\'s first panel',
    run: () => ['tools/build-episode.mjs', '--story', STORY, '--slug', SLUG],
  },
  {
    id: 'thumbs',
    what: 'thumbnail candidates, rendered at feed size as well as full, top one promoted',
    makes: () => path.join(THUMBS, 'picked.json'),
    run: () => ['tools/thumbnail.mjs', '--slug', SLUG, '--pick', 'first'],
  },
  {
    id: 'stinger',
    what: `which two ${ERA} beats belong to this story`,
    makes: () => path.join(EP, 'stinger.json'),
    run: () => ['tools/stinger.mjs', '--slug', SLUG, '--era', ERA],
  },
  {
    id: 'intro-build',
    what: `assemble this episode's ${ERA} stinger page`,
    run: () => ['tools/build-version.mjs', '--era', ERA, '--variant', 'stinger',
      '--beats', beats(), '--build', BUILDDIR],
  },
  {
    id: 'intro',
    what: `render this episode's ${ERA} stinger with its score`,
    makes: () => INTRO,
    run: () => ['tools/render-master.mjs', '--era', ERA, '--variant', 'stinger',
      '--beats', beats(), '--build', BUILDDIR, '--score', '--out', INTRO],
  },
  {
    id: 'closer',
    what: 'the four closing lines and their source, from the episode\'s own narration',
    makes: () => path.join(EP, 'closer.json'),
    run: () => ['tools/closer.mjs', '--slug', SLUG],
  },
  {
    id: 'outro-build',
    what: 'assemble the closing movement — one held abstract take, the lines over it',
    run: () => ['tools/make-outro.mjs', '--slug', SLUG, '--era', ERA],
  },
  {
    id: 'outro',
    what: 'render the close with its bed and the wordmark',
    makes: () => OUTRO,
    run: () => ['tools/film-render.mjs', '--id', `${SLUG}-outro`, '--lift', '0.5'],
  },
  {
    id: 'render',
    what: 'render the master — frame capture, mix, loudness',
    each: true,
    makes: (v) => master(v),
    run: (v) => ['tools/render-episode.mjs', '--slug', SLUG, '--cut', v.cut,
      '--intro', INTRO, '--outro', OUTRO, '--out', master(v), ...draftArgs],
  },
  {
    id: 'publish',
    what: 'captions, chapters, description, thumbnail, video — the upload folder',
    each: true,
    makes: (v) => path.join(upload(v), 'UPLOAD.md'),
    run: (v) => ['tools/publish.mjs', '--slug', SLUG, '--cut', v.cut, '--intro', INTRO,
      '--outro', OUTRO, '--master', master(v), '--out', upload(v)],
  },
  {
    id: 'short-script',
    what: 'the seven claims the vertical cut says',
    makes: () => path.join(EP, 'short.json'),
    run: () => ['tools/short.mjs', '--slug', SLUG, '--era', ERA, '--script-only'],
  },
  {
    id: 'short-shots',
    what: 'seven takes of this story\'s own, so two Shorts are not the same film',
    makes: () => path.join(EP, 'short-shots.json'),
    run: () => ['tools/short-shots.mjs', '--slug', SLUG],
  },
  {
    id: 'short',
    what: 'the vertical cut — the claims, over ink and light, under a minute',
    makes: () => path.join('dist', ERA, `${SLUG}_short`, 'UPLOAD.md'),
    run: () => ['tools/short.mjs', '--slug', SLUG, '--era', ERA,
      '--out', path.join('dist', ERA, `${SLUG}_short`)],
  },
  {
    id: 'score',
    what: 'measure it against what YouTube actually rewards',
    each: true,
    run: (v) => ['tools/retention.mjs', '--slug', SLUG, '--cut', v.cut,
      '--intro', INTRO, '--master', master(v), '--kit', upload(v)],
  },
];

// ── planning ─────────────────────────────────────────────────────────────
const from = FROM ? STAGES.findIndex((s) => s.id === FROM) : 0;
const until = UNTIL ? STAGES.findIndex((s) => s.id === UNTIL) : STAGES.length - 1;
for (const [name, i] of [[FROM, from], [UNTIL, until], [ONLY, ONLY ? STAGES.findIndex((s) => s.id === ONLY) : 0]]) {
  if (name && i < 0) {
    console.error(`no stage "${name}" — one of: ${STAGES.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }
}

const jobs = [];
for (const [i, s] of STAGES.entries()) {
  if (ONLY ? s.id !== ONLY : (i < from || i > until)) continue;
  for (const v of (s.each ? VERSIONS : [null])) {
    const out = s.makes?.(v);
    const done = out && existsSync(out) && !FORCE;
    jobs.push({ stage: s, v, out, done });
  }
}

const label = (j) => `${j.stage.id}${j.v ? ` ${j.v.id}` : ''}`;

console.log(`\n  ${SLUG}  <-  ${STORY}   era: ${ERA}${DRAFT ? '   [draft]' : ''}`);
console.log(`  ${VERSIONS.length} version(s):`);
for (const v of VERSIONS) console.log(`    ${v.id}  ${v.cut.padEnd(14)} ${v.what}`);
console.log('');
for (const j of jobs) {
  const mark = j.done ? 'skip' : ' run';
  console.log(`  ${mark}  ${label(j).padEnd(12)} ${j.stage.what}`);
  if (j.done) console.log(`        ${j.out} exists`);
}
const todo = jobs.filter((j) => !j.done);
console.log(`\n  ${todo.length} stage(s) to run, ${jobs.length - todo.length} already done`);
if (PLAN) { console.log('\n  --plan: nothing run\n'); process.exit(0); }
if (!todo.length) { console.log('\n  nothing to do — pass --force to redo a stage\n'); process.exit(0); }

// ── running ──────────────────────────────────────────────────────────────
/* Output is streamed rather than captured. These stages take tens of minutes and a silent
   terminal for an hour is indistinguishable from a hang. */
function run(args, tag) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const line = (buf) => String(buf).split('\n').filter(Boolean)
      .forEach((l) => console.log(`  ${tag} | ${l}`));
    p.stdout.on('data', line);
    p.stderr.on('data', line);
    p.on('close', (code) => resolve(code === 0));
  });
}

const t0 = Date.now();
const failed = [];
let n = 0;

for (const j of todo) {
  n++;
  const el = () => `${((Date.now() - t0) / 60000).toFixed(1)}m`;
  console.log(`\n${'─'.repeat(72)}\n  [${n}/${todo.length}] ${label(j)}  ${j.stage.what}   (${el()} in)\n`);
  const ok = await run(j.stage.run(j.v), label(j));
  if (!ok) {
    failed.push(label(j));
    /* A failed stage stops the run. The stages are a chain — rendering a master from an
       episode whose narration stage failed produces a file that looks fine and says the
       wrong thing. */
    console.log(`\n  ${label(j)} FAILED — stopping. Fix it, then: --from ${j.stage.id}\n`);
    break;
  }
  if (j.out && !existsSync(j.out)) {
    failed.push(`${label(j)} (claimed success but ${j.out} is missing)`);
    console.log(`\n  ${label(j)} reported success but did not write ${j.out} — stopping\n`);
    break;
  }
}

console.log(`\n${'═'.repeat(72)}`);
console.log(`  ${SLUG}: ${n - failed.length}/${todo.length} stage(s) in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
if (failed.length) {
  console.log(`  failed: ${failed.join(', ')}`);
  process.exit(1);
}
for (const v of VERSIONS) console.log(`  ${v.id}  ${master(v)}   ${upload(v)}/`);
console.log('');
