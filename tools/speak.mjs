/* Re-synthesise one narration line, with years spoken as years.

   The narration for these episodes is generated in the IndianHistory project by
   tools/voice.py. That project is busy generating other stories, so the fix lives here
   and writes an override that build-episode.mjs prefers over the source audio. Nothing
   in IndianHistory is read/write — it is still read-only from this repo.

   Everything about the voice is copied from voice.py so a re-synthesised line is
   indistinguishable from its neighbours: same voice, same base rate, same per-mood
   pitch and express-as style, same 24 kHz 96 kbps mono MP3. If those drift in the source
   project, they have to be updated here too — the constants below name the file they
   came from for exactly that reason.

   Word boundaries come back from the synthesiser and are folded from the spoken form
   back onto the written tokens, so the caption still highlights "499" as one word even
   though the voice said three.

     node tools/speak.mjs --panel cover
     node tools/speak.mjs --panel cover --dry        # show the rewrite, synthesise nothing
     node tools/speak.mjs --all --dry                # audit every panel
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

const SLUG = arg('slug', 'aryabhata');
const PANEL = arg('panel', null);
const LANG = arg('lang', 'en');
const DRY = has('dry');
const ALL = has('all');

const EP = path.join('episodes', SLUG);
const OUT = path.join(EP, 'voice-fix');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

const fmtRate = (n) => (n > 0 ? `+${n}%` : `${n}%`);

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

function ssml(text, voice, rate, style, pitch) {
  let body = `<prosody rate="${rate}" pitch="${pitch}">${esc(text.trim())}</prosody>`;
  if (style) body = `<mstts:express-as style="${style}" styledegree="1.8">${body}</mstts:express-as>`;
  const lang = (voice.match(/^([a-z]{2,3}-[A-Z]{2})/) || [, 'en-IN'])[1];
  return `<speak version="1.0" xmlns:mstts="https://www.w3.org/2001/mstts" `
    + `xml:lang="${lang}"><voice name="${voice}">${body}</voice></speak>`;
}

/** Synthesise, returning the mp3 bytes and the word boundaries the voice reported. */
async function synth(text, { role, mood }) {
  const [voice, base] = voiceFor(role);
  const e = EMO[mood] || EMO.calm;
  const style = voice.includes('MAI-Voice') ? null : (role === 'narrator' ? e.nstyle : e.dstyle);
  const rate = fmtRate(base + e.rate);

  const cfg = sdk.SpeechConfig.fromAuthorizationToken(`aad#${RID}#${await token()}`, REGION);
  cfg.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3;

  const words = [];
  const synthesizer = new sdk.SpeechSynthesizer(cfg, null);
  synthesizer.wordBoundary = (_s, ev) => {
    // punctuation boundaries carry no spoken duration and would desync the merge
    if (ev.boundaryType === sdk.SpeechSynthesisBoundaryType.Punctuation) return;
    words.push({
      w: ev.text,
      t: Math.round(ev.audioOffset / 10000),
      d: Math.round(ev.duration / 10000),
    });
  };

  const doc = ssml(text, voice, rate, style, e.pitch);
  const result = await new Promise((res, rej) => {
    synthesizer.speakSsmlAsync(doc, (r) => { synthesizer.close(); res(r); },
      (err) => { synthesizer.close(); rej(new Error(err)); });
  });
  if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
    const d = sdk.CancellationDetails.fromResult(result);
    throw new Error(`TTS ${sdk.ResultReason[result.reason]}: ${d?.errorDetails || d?.reason || '?'}`);
  }
  return { audio: Buffer.from(result.audioData), words, voice, rate, style, pitch: e.pitch };
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
    if (!group.length) { out.push([tok, out.length ? out[out.length - 1][1] + out[out.length - 1][2] : 0, 0]); continue; }
    const t = group[0].t;
    const d = group[group.length - 1].t + group[group.length - 1].d - t;
    out.push([tok, t, Math.max(1, d)]);
  }
  return out;
}

// ── main ──────────────────────────────────────────────────────────────────
const ep = JSON.parse(await readFile(path.join(EP, 'episode.json'), 'utf8'));
const targets = ALL ? ep.panels : ep.panels.filter((p) => p.id === PANEL);
if (!targets.length) {
  console.error(`no panel ${PANEL} in ${SLUG} — use --all to audit, or one of:\n  `
    + ep.panels.map((p) => p.id).join(' '));
  process.exit(1);
}

let touched = 0;
const overrides = {};
try { Object.assign(overrides, JSON.parse(await readFile(path.join(OUT, 'index.json'), 'utf8'))); } catch { /* first run */ }

for (const p of targets) {
  const written = (p.text?.[LANG] || p.text?.en || '').trim();
  const { text: spoken, changed } = speakYears(written);
  if (!changed.length) { if (ALL) console.log(`  ok   ${p.id}`); continue; }

  touched++;
  console.log(`\n${p.id}  [${p.role || 'narrator'}/${p.mood || 'calm'}]`);
  for (const [from, to] of changed) console.log(`   "${from}"  ->  "${to}"`);
  if (DRY) continue;

  const r = await synth(spoken, { role: p.role || 'narrator', mood: p.mood || 'calm' });
  await mkdir(OUT, { recursive: true });
  const mp3 = path.join(OUT, `${LANG}_${p.id}_0.mp3`);
  await writeFile(mp3, r.audio);

  const words = foldToWritten(written, spoken, r.words);
  if (words.length !== written.split(/\s+/).filter(Boolean).length) {
    throw new Error(`fold produced ${words.length} caption tokens for ${written.split(/\s+/).length} written`);
  }
  overrides[`${LANG}_${p.id}_0`] = { mp3: path.basename(mp3), words, spoken, written };

  const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', mp3]);
  console.log(`   voice ${r.voice} rate ${r.rate} pitch ${r.pitch}${r.style ? ` style ${r.style}` : ''}`);
  console.log(`   ${r.words.length} spoken words -> ${words.length} caption tokens, `
    + `${Number(stdout.trim()).toFixed(2)}s -> ${path.relative('.', mp3)}`);
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
