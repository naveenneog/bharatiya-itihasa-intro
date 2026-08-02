/* The narrator's voice — the single copy.

   `speak.mjs` owned all of this, which was fine while re-synthesising an existing line was
   the only thing that needed to speak. Authoring a cold-open hook needs the same voice, the
   same rate, the same emotional styles and the same word-boundary handling, and a second
   copy of those constants is a channel whose opening line does not sound like the rest of
   the episode.

   The constants are mirrored from `IndianHistory/tools/voice.py` and must stay in step with
   it. The word-boundary handling is not in voice.py: it needs the WebSocket protocol, which
   only the Speech SDK speaks — the REST TTS endpoint does not return boundaries at all.
*/
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sdk from 'microsoft-cognitiveservices-speech-sdk';
import { spokenSpans } from './years.mjs';

const execFileP = promisify(execFile);

// ── copied from IndianHistory/tools/voice.py — keep in step ────────────────
export const REGION = 'eastus2';
export const RID = '/subscriptions/e839ff0f-532b-4828-a2b3-8c9a1b719d85/resourceGroups/rg-contosohub/'
  + 'providers/Microsoft.CognitiveServices/accounts/ai-contosohub530569751908';
export const CS_SCOPE = 'https://cognitiveservices.azure.com';

export const NARR = {
  en: 'en-IN-Arjun:DragonHDLatestNeural', hi: 'hi-IN-Dhruv:MAI-Voice-2',
  kn: 'kn-IN-GaganNeural', ta: 'ta-IN-ValluvarNeural', te: 'te-IN-MohanNeural',
};
export const MALE = {
  en: 'en-IN-PrabhatNeural', hi: 'hi-IN-Arjun:MAI-Voice-2',
  kn: 'kn-IN-GaganNeural', ta: 'ta-IN-ValluvarNeural', te: 'te-IN-MohanNeural',
};
export const FEMALE = {
  en: 'en-IN-NeerjaNeural', hi: 'hi-IN-Kavya:MAI-Voice-2',
  kn: 'kn-IN-SapnaNeural', ta: 'ta-IN-PallaviNeural', te: 'te-IN-ShrutiNeural',
};
export const RATE = { narrator: -6, male: 2, female: 0 };
/* Tamil/Telugu/Kannada neural voices are less native than DragonHD (en) and MAI-Voice-2 (hi),
   so they are slowed for clearer word pronunciation. Hindi is deliberately not in this set —
   it runs at the English rate. */
export const SLOW_LANGS = new Set(['ta', 'te', 'kn']);
export const EMO = {
  battle: { nstyle: 'excited', dstyle: 'angry', pitch: '+8%', rate: 6 },
  suspense: { nstyle: 'sad', dstyle: 'sad', pitch: '-7%', rate: -7 },
  triumph: { nstyle: 'hopeful', dstyle: 'hopeful', pitch: '+6%', rate: 2 },
  spirit: { nstyle: 'hopeful', dstyle: 'hopeful', pitch: '+3%', rate: -4 },
  calm: { nstyle: 'friendly', dstyle: 'friendly', pitch: '+2%', rate: 0 },
};
// ───────────────────────────────────────────────────────────────────────────

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

export const fmtRate = (n) => {
  const r = Math.round(n * 10) / 10;
  return r > 0 ? `+${r}%` : `${r}%`;
};

/* A language with no voice of its own must not quietly borrow English's. `table[lang] || table.en`
   returned an en-IN narrator for Hindi text: the request succeeds, the audio is the right length,
   and it is an English speaker sounding out Devanagari. Ask for a language the channel has no
   voice for and it should say so. */
export function voiceFor(role, lang = 'en') {
  const table = { narrator: NARR, male: MALE, female: FEMALE }[role] || NARR;
  const voice = table[lang];
  if (!voice) throw new Error(`no ${role} voice for "${lang}" — have ${Object.keys(table).join(', ')}`);
  return [voice, (RATE[role] ?? RATE.narrator) - (SLOW_LANGS.has(lang) ? 9 : 0)];
}

export async function token() {
  const { stdout } = await execFileP('az', ['account', 'get-access-token',
    '--resource', CS_SCOPE, '--query', 'accessToken', '-o', 'tsv'], { shell: true, timeout: 120000 });
  const t = stdout.trim();
  if (!t) throw new Error('no AAD token — run `az login`');
  return t;
}

export async function seconds(file) {
  const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', file]);
  return Number(stdout.trim());
}

export function ssml(text, voice, rate, style, pitch) {
  let body = `<prosody rate="${rate}" pitch="${pitch}">${esc(text.trim())}</prosody>`;
  if (style) body = `<mstts:express-as style="${style}" styledegree="1.8">${body}</mstts:express-as>`;
  const lang = (voice.match(/^([a-z]{2,3}-[A-Z]{2})/) || [, 'en-IN'])[1];
  return `<speak version="1.0" xmlns:mstts="https://www.w3.org/2001/mstts" `
    + `xml:lang="${lang}"><voice name="${voice}">${body}</voice></speak>`;
}

/** One synthesis at an explicit rate. Returns the mp3 bytes and the word boundaries. */
export async function synth(text, { role = 'narrator', mood = 'calm', ratePct = null, lang = 'en', voice: pin = null } = {}) {
  const [tableVoice, defRate] = voiceFor(role, lang);
  const voice = pin || tableVoice;
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
    synthesizer.speakSsmlAsync(ssml(text, voice, fmtRate(ratePct ?? defRate), style, e.pitch),
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
export function foldToWritten(written, spoken, boundaries) {
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
