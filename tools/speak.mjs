/* Re-synthesise one narration line, with years spoken as years — at the pace of the line
   it replaces.

   The narration for these episodes is generated upstream by IndianHistory/tools/voice.py.
   That project is busy generating other stories, so the fix lives here and writes an
   override that build-episode.mjs prefers over the source audio. Nothing in IndianHistory
   is written to — it is still read-only from this repo.

   Two things have to match, not one.

   The voice. Voice name, base rate, per-mood pitch and express-as style, and the 24 kHz
   96 kbps mono MP3 format are all copied from voice.py so a corrected line is
   indistinguishable from its neighbours. If they drift upstream they must be updated here.

   The pace. `en-IN-Arjun:DragonHDLatestNeural` is a *Latest* alias, and Azure moves it.
   At the identical -6% rate it now speaks measurably faster than it did when this story
   was generated: the cover line ran 11.99 s then and 9.95 s now, for the same words. A
   line that lands two seconds short does not merely sound hurried on its own — it drags
   the whole episode forward, moves the title splice and shifts every chapter after it.

   So the rate is not taken on faith. Each line is synthesised, measured against the file
   it replaces, and re-synthesised at a corrected rate until it fits the same slot. The
   approved episode keeps its timing exactly; only the words inside the slot change.

     node tools/speak.mjs --all --dry     # audit every panel, synthesise nothing
     node tools/speak.mjs --all           # fix them, matching the original durations
     node tools/speak.mjs --panel cover --no-match   # keep the model's natural pace
*/
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { speakYears } from './years.mjs';
import { synth, seconds, foldToWritten, fmtRate, voiceFor, RATE, EMO } from './voice.mjs';

/* The voice, the rates and the emotional styles now live in tools/voice.mjs, because the
   cold-open hook has to be spoken by the same narrator at the same rate and a second copy
   of these constants is a channel whose opening line does not match its own episode. */

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const SRC = arg('src', 'C:/Users/navg/DailyApps/IndianHistory');
const SLUG = arg('slug', 'aryabhata');
const PANEL = arg('panel', null);
const LANG = arg('lang', 'en');
const DRY = has('dry');
const ALL = has('all');
const MATCH = !has('no-match');
const TOL = Number(arg('tol', '0.025'));   // fraction of the original duration
const TRIES = Number(arg('tries', '4'));

const EP = path.join('episodes', SLUG);
const OUT = path.join(EP, 'voice-fix');

/* The story key comes from the built episode, not from a default. When it defaulted to
   aryabhata, `--slug zero` read one story's narration and wrote the fixes into another
   episode's folder — a mismatch nothing downstream would have caught. */
const STORY = arg('story', null)
  || await readFile(path.join(EP, 'episode.json'), 'utf8')
    .then((s) => JSON.parse(s).id)
    .catch(() => {
      console.error(`no episodes/${SLUG}/episode.json — run build-episode.mjs first, or pass --story`);
      process.exit(1);
    });


// ── main ──────────────────────────────────────────────────────────────────
/* Read the story from the source project rather than from the built episode.json, so the
   original audio — and therefore the original pace — is still available after a previous
   run has already overridden it. */
const story = JSON.parse(await readFile(path.join(SRC, 'app', 'data', `${STORY}.player.json`), 'utf8'));
const srcAsset = (p) => path.join(SRC, 'app', p.replace(/^assets\//, 'assets/'));

const targets = ALL ? story.panels : story.panels.filter((p) => p.id === PANEL);
if (!targets.length) {
  console.error(`no panel ${PANEL} in ${STORY} — use --all to audit, or one of:\n  `
    + story.panels.map((p) => p.id).join(' '));
  process.exit(1);
}

const overrides = {};
try { Object.assign(overrides, JSON.parse(await readFile(path.join(OUT, 'index.json'), 'utf8'))); } catch { /* first run */ }

let touched = 0;
for (const p of targets) {
  const line = p.lines?.[0];
  if (!line) continue;
  const written = (line.text?.[LANG] || line.text?.en || '').trim();
  const { text: spoken, changed } = speakYears(written);
  if (!changed.length) { if (ALL) console.log(`  ok   ${p.id}`); continue; }

  touched++;
  const role = line.role || 'narrator';
  const mood = p.mood || 'calm';
  console.log(`\n${p.id}  [${role}/${mood}]`);
  for (const [from, to] of changed) console.log(`   "${from}"  ->  "${to}"`);
  if (DRY) continue;

  const srcRel = line.audio?.[LANG] || line.audio?.en;
  const target = srcRel ? await seconds(srcAsset(srcRel)) : null;
  const key = srcRel.replace(/^.*\/audio\//, '').replace(/\//g, '_').replace(/\.[^.]+$/, '');

  await mkdir(OUT, { recursive: true });

  /* Iterate the rate until the line fits the slot it is replacing. Duration is inversely
     proportional to speaking speed, so a line that came back 20% short needs its speed
     multiplied by got/target — one correction usually lands it, and the loop exists only
     because the relationship is not perfectly linear at the extremes.

     Every attempt is kept on disk under its own -tN name. Generated audio is never
     overwritten, so a take can always be gone back to. */
  const [, base] = voiceFor(role);
  let ratePct = base + (EMO[mood] || EMO.calm).rate;
  let best = null;
  const maxTries = MATCH && target ? TRIES : 1;
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    const r = await synth(spoken, { role, mood, ratePct });
    const mp3 = path.join(OUT, `${key}-t${attempt}.mp3`);
    await writeFile(mp3, r.audio);
    const got = await seconds(mp3);
    const off = target ? (got - target) / target : 0;
    const fit = Math.abs(off) <= TOL;
    console.log(`   try ${attempt}  rate ${fmtRate(ratePct).padStart(6)}  ${got.toFixed(2)}s`
      + (target ? `  vs ${target.toFixed(2)}s  ${off >= 0 ? '+' : ''}${(off * 100).toFixed(1)}%${fit ? '   fit' : ''}` : ''));

    if (!best || Math.abs(off) < Math.abs(best.off)) best = { ...r, mp3, got, off, ratePct };
    if (!MATCH || !target || fit) break;

    // speed is (1 + rate/100); scale it by got/target to stretch or compress
    const speed = (1 + ratePct / 100) * (got / target);
    ratePct = Math.max(-45, Math.min(30, (speed - 1) * 100));
  }

  const words = foldToWritten(written, spoken, best.words);
  const expect = written.split(/\s+/).filter(Boolean).length;
  if (words.length !== expect) {
    throw new Error(`${p.id}: fold produced ${words.length} caption tokens for ${expect} written words`);
  }

  overrides[key] = {
    mp3: path.basename(best.mp3),
    words,
    spoken,
    written,
    rate: fmtRate(best.ratePct),
    seconds: +best.got.toFixed(3),
    replaced: target ? +target.toFixed(3) : null,
    drift: target ? `${best.off >= 0 ? '+' : ''}${(best.off * 100).toFixed(1)}%` : null,
  };
  console.log(`   voice ${best.voice} rate ${fmtRate(best.ratePct)} pitch ${best.pitch}`
    + `${best.style ? ` style ${best.style}` : ''}`);
  console.log(`   ${best.words.length} spoken words -> ${words.length} caption tokens`
    + `  -> ${path.relative('.', best.mp3)}`);
}

if (!DRY) {
  /* Written even when nothing changed. The file is the record that this story's narration
     was audited, not just that something was wrong with it — and a stage that produces
     nothing on a clean story is indistinguishable, to anything downstream, from a stage
     that failed. */
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, 'index.json'), JSON.stringify(overrides, null, 2));
}

if (!DRY && touched) {
  console.log(`\n${touched} line(s) re-synthesised -> ${OUT}/index.json`);
  console.log('run `node tools/build-episode.mjs` to pick them up');
} else if (DRY) {
  console.log(`\n${touched} line(s) would change (dry run)`);
} else {
  console.log(`\nnothing to do — no years needed rewriting (audit recorded in ${OUT}/index.json)`);
}
