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
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import sdk from 'microsoft-cognitiveservices-speech-sdk';
import { speakYears, spokenSpans } from './years.mjs';

const execFileP = promisify(execFile);

// ── copied from IndianHistory/tools/voice.py — keep in step ────────────────
const REGION = 'eastus2';
const RID = '/subscriptions/e839ff0f-532b-4828-a2b3-8c9a1b719d85/resourceGroups/rg-contosohub/'
  + 'providers/Microsoft.CognitiveServices/accounts/ai-contosohub530569751908';
const CS_SCOPE = 'https://cognitiveservices.azure.com';

const NARR = { en: 'en-IN-Arjun:DragonHDLatestNeural' };
const MALE = { en: 'en-IN-PrabhatNeural' };
const FEMALE = { en: 'en-IN-NeerjaNeural' };
const RATE = { narrator: -6, male: 2, female: 0 };
const EMO = {
  battle: { nstyle: 'excited', dstyle: 'angry', pitch: '+8%', rate: 6 },
  suspense: { nstyle: 'sad', dstyle: 'sad', pitch: '-7%', rate: -7 },
  triumph: { nstyle: 'hopeful', dstyle: 'hopeful', pitch: '+6%', rate: 2 },
  spirit: { nstyle: 'hopeful', dstyle: 'hopeful', pitch: '+3%', rate: -4 },
  calm: { nstyle: 'friendly', dstyle: 'friendly', pitch: '+2%', rate: 0 },
};
// ───────────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const SRC = arg('src', 'C:/Users/navg/DailyApps/IndianHistory');
const STORY = arg('story', 'aryabhata_turns_the_earth');
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

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

const fmtRate = (n) => {
  const r = Math.round(n * 10) / 10;
  return r > 0 ? `+${r}%` : `${r}%`;
};

function voiceFor(role) {
  const table = { narrator: NARR, male: MALE, female: FEMALE }[role] || NARR;
  return [table[LANG] || table.en, RATE[role] ?? RATE.narrator];
}

async function token() {
  const { stdout } = await execFileP('az', ['account', 'get-access-token',
    '--resource', CS_SCOPE, '--query', 'accessToken', '-o', 'tsv'], { shell: true, timeout: 120000 });
  const t = stdout.trim();
  if (!t) throw new Error('no AAD token — run `az login`');
  return t;
}

async function seconds(file) {
  const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', file]);
  return Number(stdout.trim());
}

function ssml(text, voice, rate, style, pitch) {
  let body = `<prosody rate="${rate}" pitch="${pitch}">${esc(text.trim())}</prosody>`;
  if (style) body = `<mstts:express-as style="${style}" styledegree="1.8">${body}</mstts:express-as>`;
  const lang = (voice.match(/^([a-z]{2,3}-[A-Z]{2})/) || [, 'en-IN'])[1];
  return `<speak version="1.0" xmlns:mstts="https://www.w3.org/2001/mstts" `
    + `xml:lang="${lang}"><voice name="${voice}">${body}</voice></speak>`;
}

/** One synthesis at an explicit rate. Returns the mp3 bytes and the word boundaries. */
async function synth(text, { role, mood, ratePct }) {
  const [voice] = voiceFor(role);
  const e = EMO[mood] || EMO.calm;
  const style = voice.includes('MAI-Voice') ? null : (role === 'narrator' ? e.nstyle : e.dstyle);

  const cfg = sdk.SpeechConfig.fromAuthorizationToken(`aad#${RID}#${await token()}`, REGION);
  cfg.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3;

  const words = [];
  const synthesizer = new sdk.SpeechSynthesizer(cfg, null);
  synthesizer.wordBoundary = (_s, ev) => {
    // punctuation boundaries carry no spoken duration and would desync the merge
    if (ev.boundaryType === sdk.SpeechSynthesisBoundaryType.Punctuation) return;
    words.push({ w: ev.text, t: Math.round(ev.audioOffset / 10000), d: Math.round(ev.duration / 10000) });
  };

  const result = await new Promise((res, rej) => {
    synthesizer.speakSsmlAsync(ssml(text, voice, fmtRate(ratePct), style, e.pitch),
      (r) => { synthesizer.close(); res(r); },
      (err) => { synthesizer.close(); rej(new Error(err)); });
  });
  if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
    const d = sdk.CancellationDetails.fromResult(result);
    throw new Error(`TTS ${sdk.ResultReason[result.reason]}: ${d?.errorDetails || d?.reason || '?'}`);
  }
  return { audio: Buffer.from(result.audioData), words, voice, style, pitch: e.pitch };
}

/* The synthesiser reports one boundary per spoken word. The caption shows the written
   line. Where a written token was rewritten into several spoken ones, their spans are
   merged back into a single entry so the highlight tracks what is actually on screen. */
function foldToWritten(written, spoken, boundaries) {
  const spans = spokenSpans(written, spoken);
  const out = [];
  let k = 0;
  for (const [i, tok] of written.split(/\s+/).filter(Boolean).entries()) {
    const n = spans[i] ?? 1;
    const group = boundaries.slice(k, k + n);
    k += n;
    if (!group.length) {
      const prev = out[out.length - 1];
      out.push([tok, prev ? prev[1] + prev[2] : 0, 0]);
      continue;
    }
    const t = group[0].t;
    const d = group[group.length - 1].t + group[group.length - 1].d - t;
    out.push([tok, t, Math.max(1, d)]);
  }
  return out;
}

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

if (!DRY && touched) {
  await writeFile(path.join(OUT, 'index.json'), JSON.stringify(overrides, null, 2));
  console.log(`\n${touched} line(s) re-synthesised -> ${OUT}/index.json`);
  console.log('run `node tools/build-episode.mjs` to pick them up');
} else if (DRY) {
  console.log(`\n${touched} line(s) would change (dry run)`);
} else {
  console.log('\nnothing to do — no years needed rewriting');
}
