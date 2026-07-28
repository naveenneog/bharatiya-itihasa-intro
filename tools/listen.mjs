/* Listen to the work, rather than assuming it sounds right.

   Two different jobs, two different models:

     transcribe  gpt-4o-transcribe        what words are actually in the audio, and when
     critique    gpt-4o-mini-audio-preview an actual listen — instrumentation, mix, pacing,
                                           whether the music fights the voice

   The second is the point. Loudness meters say a mix is legal; they cannot say it is good.
   An audio-native model can be asked "does the drum bury the narration here" and answer from
   the waveform rather than from my description of it.

     node tools/listen.mjs transcribe dist/v5-empires-mobile.mp4
     node tools/listen.mjs critique   dist/v5-empires-mobile.mp4 --from 0 --to 30
     node tools/listen.mjs critique   episodes/aryabhata/audio/en_p07_0.mp3 --ask "is the pacing too fast?"
*/
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { token, ENDPOINT } from './azure.mjs';

const execFileP = promisify(execFile);

const TRANSCRIBE = 'gpt-4o-transcribe';
const AUDIO_CHAT = 'gpt-audio-1.5';       // gpt-4o-mini-audio-preview is retired (HTTP 410)
const APIV = '2025-01-01-preview';

const argv = process.argv.slice(2);
const mode = argv[0];
const file = argv[1];
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const FROM = flag('from', null);
const TO = flag('to', null);
const ASK = flag('ask', null);

if (!mode || !file) {
  console.error('usage: node tools/listen.mjs <transcribe|critique> <file> [--from S --to S] [--ask "..."]');
  process.exit(1);
}

/** Pull mono 16k audio out of anything — the models want audio, not a video container.
    Transcription takes mp3 happily; the audio chat model is more reliable on wav. */
async function extract(src, fmt = 'mp3') {
  const out = path.join(os.tmpdir(), `listen-${Date.now()}.${fmt}`);
  const args = ['-y', '-loglevel', 'error'];
  if (FROM) args.push('-ss', String(FROM));
  if (TO) args.push('-to', String(TO));
  args.push('-i', src, '-vn', '-ac', '1', '-ar', '16000');
  if (fmt === 'mp3') args.push('-b:a', '64k');
  args.push(out);
  await execFileP('ffmpeg', args);
  return out;
}

async function post(url, body, headers = {}) {
  const tok = await token();
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, ...headers }, body });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

const FMT = mode === 'critique' ? 'wav' : 'mp3';
const audio = await extract(file, FMT);

try {
  if (mode === 'transcribe') {
    const fd = new FormData();
    fd.append('file', new Blob([await readFile(audio)], { type: 'audio/mpeg' }), 'a.mp3');
    fd.append('model', TRANSCRIBE);
    fd.append('response_format', 'json');
    // without a language hint the model can mis-detect a short clip that opens on an
    // unusual proper noun and return confident nonsense in the wrong script
    fd.append('language', flag('lang', 'en'));
    const j = await post(`${ENDPOINT}/openai/deployments/${TRANSCRIBE}/audio/transcriptions?api-version=${APIV}`, fd);
    console.log(j.text || JSON.stringify(j).slice(0, 2000));
  } else {
    const b64 = (await readFile(audio)).toString('base64');
    const ask = ASK || `You are a music supervisor and re-recording mixer reviewing the audio of a title
sequence and narrated history episode that is about to be published on YouTube.

Listen carefully and answer concretely, with timestamps where you can:
1. What instruments do you actually hear, and does the ensemble sound intentional or synthetic-and-thin?
2. Is there any point where an element buries or fights the narration or the moment?
3. Is the rhythm musical, or does it read as a metronome? Does any accelerando sound unstable or stumble?
4. Does the piece build and resolve, or does it plateau?
5. What is the single most damaging problem, and what specific change would fix it?

Be blunt and specific. Do not be encouraging. If something is genuinely good, say so in one line and move on.`;

    const body = JSON.stringify({
      model: AUDIO_CHAT,
      modalities: ['text'],
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: ask },
          { type: 'input_audio', input_audio: { data: b64, format: FMT } },
        ],
      }],
      max_completion_tokens: 1400,
    });
    const j = await post(`${ENDPOINT}/openai/deployments/${AUDIO_CHAT}/chat/completions?api-version=${APIV}`,
      body, { 'Content-Type': 'application/json' });
    console.log(j.choices?.[0]?.message?.content || JSON.stringify(j).slice(0, 1200));
  }
} finally {
  await unlink(audio).catch(() => {});
}
