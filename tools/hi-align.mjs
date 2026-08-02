/* Can the existing upstream Hindi audio be aligned to its own text?

   Three ways to get Hindi word timings, and they are not equal:
     1. Re-synthesise with a standard neural voice. True timings, but it replaces the voice the
        source project deliberately chose (MAI-Voice-2 is its most native Hindi).
     2. Keep MAI-Voice-2 and caption whole-line. Keeps the voice, loses the channel's signature.
     3. Align the audio that already exists. Keeps both — if it works.

   Pronunciation assessment is forced alignment with a score attached: given the audio and the
   text that was spoken, it returns per-word offsets. This asks whether it does that well enough
   on Devanagari to drive a caption.

     node tools/hi-align.mjs --slug zero --panel cover
*/
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sdk from 'microsoft-cognitiveservices-speech-sdk';
import { REGION, RID, token, seconds } from './voice.mjs';

const execFileP = promisify(execFile);
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };

const SLUG = arg('slug', 'zero');
const PANEL = arg('panel', 'cover');

const ep = JSON.parse(await readFile(path.join('episodes', SLUG, 'episode.json'), 'utf8'));
const panel = ep.panels.find((p) => p.id === PANEL) || ep.panels[1];
const text = panel.text?.hi;
const mp3 = path.join('episodes', SLUG, panel.audio.hi.replace(/^\.\.\//, ''));
if (!text) { console.error(`panel ${panel.id} has no Hindi text`); process.exit(1); }

console.log(`  ${SLUG} / ${panel.id}`);
console.log(`  ${text.slice(0, 90)}...`);
const dur = await seconds(mp3);
console.log(`  audio ${mp3}  ${dur.toFixed(2)}s\n`);

/* The SDK reads PCM, not mp3. 16 kHz mono is what the assessment endpoint expects. */
const wav = path.join(os.tmpdir(), `align-${process.pid}.wav`);
await execFileP('ffmpeg', ['-y', '-v', 'error', '-i', mp3, '-ar', '16000', '-ac', '1', wav]);

const cfg = sdk.SpeechConfig.fromAuthorizationToken(`aad#${RID}#${await token()}`, REGION);
cfg.speechRecognitionLanguage = 'hi-IN';
const audio = sdk.AudioConfig.fromWavFileInput(await readFile(wav));
const pa = new sdk.PronunciationAssessmentConfig(text,
  sdk.PronunciationAssessmentGradingSystem.HundredMark, sdk.PronunciationAssessmentGranularity.Word, true);

const rec = new sdk.SpeechRecognizer(cfg, audio);
pa.applyTo(rec);

const words = [];
const t0 = Date.now();
await new Promise((res) => {
  rec.recognized = (_s, ev) => {
    if (ev.result.reason !== sdk.ResultReason.RecognizedSpeech) {
      console.log(`  [recognized] reason=${sdk.ResultReason[ev.result.reason]}`);
      return;
    }
    const j = JSON.parse(ev.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult));
    for (const w of j.NBest?.[0]?.Words || []) {
      words.push({ w: w.Word, t: Math.round(w.Offset / 10000), d: Math.round(w.Duration / 10000) });
    }
  };
  rec.sessionStopped = () => { rec.stopContinuousRecognitionAsync(); res(); };
  rec.canceled = (_s, ev) => {
    const d = ev.errorDetails || sdk.CancellationReason[ev.reason];
    if (ev.reason !== sdk.CancellationReason.EndOfStream) console.log(`  [canceled] ${d}`);
    rec.stopContinuousRecognitionAsync(); res();
  };
  rec.startContinuousRecognitionAsync();
});
await rm(wav, { force: true });

const written = text.split(/\s+/).filter(Boolean);
console.log(`  aligned ${words.length} word(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s`
  + `   written tokens ${written.length}`);
if (!words.length) { console.log('\n  NOTHING ALIGNED'); process.exit(1); }

const mono = words.every((w, i) => i === 0 || w.t >= words[i - 1].t);
const end = (words.at(-1).t + words.at(-1).d) / 1000;
console.log(`  monotonic ${mono}   last word ends ${end.toFixed(2)}s of ${dur.toFixed(2)}s`
  + `   (${((end / dur) * 100).toFixed(0)}% covered)`);
console.log('\n  first 10:');
for (const w of words.slice(0, 10)) console.log(`    ${String(w.t).padStart(6)}ms ${String(w.d).padStart(5)}ms  ${w.w}`);
console.log('\n  written vs aligned, first 10:');
for (let i = 0; i < Math.min(10, Math.max(written.length, words.length)); i++) {
  const a = written[i] ?? '-';
  const b = words[i]?.w ?? '-';
  console.log(`    ${a === b ? ' ' : '!'} ${a.padEnd(14)} ${b}`);
}
