/* Does the Hindi voice report word boundaries for Devanagari?

   The whole Hindi plan rests on this. The channel's caption lights the word being spoken, which
   needs per-word timings, and the source project ships Hindi audio with English timings only. If
   the synthesiser reports boundaries for Devanagari the timings can be made here; if it does not,
   Hindi captions have to be whole-line and the channel loses its signature in half its output.

     node tools/hi-probe.mjs
*/
import { synth, voiceFor } from './voice.mjs';

const LINE = 'गुप्तों की सुनहरी सुबह के बाद के युग में, भीनमाल के एक व्यक्ति ने '
  + '‘कुछ नहीं’ के साधारण बिंदु को ऐसी संख्या बना दिया जिसने दुनिया बदल दी।';

const argv = process.argv.slice(2);
const VOICES = (argv[0] || 'hi-IN-Dhruv:MAI-Voice-2,hi-IN-MadhurNeural,hi-IN-SwaraNeural,hi-IN-AaravNeural')
  .split(',').map((s) => s.trim()).filter(Boolean);

const written = LINE.split(/\s+/).filter(Boolean);
console.log(`  written tokens: ${written.length}\n`);

for (const voice of VOICES) {
  const t0 = Date.now();
  try {
    const { audio, words } = await synth(LINE, { role: 'narrator', mood: 'calm', lang: 'hi', voice });
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const mono = words.every((w, i) => i === 0 || w.t >= words[i - 1].t);
    const end = words.length ? ((words.at(-1).t + words.at(-1).d) / 1000).toFixed(2) : '-';
    console.log(`  ${voice.padEnd(26)} ${String(words.length).padStart(3)} boundaries`
      + `  ${(audio.length / 1024).toFixed(0)}KB  ${secs}s`
      + (words.length ? `  monotonic=${mono}  ends ${end}s` : '   <- unusable for word-lit captions'));
    if (words.length) {
      console.log(`      ${words.slice(0, 8).map((w) => w.w).join(' / ')}`);
    }
  } catch (e) {
    console.log(`  ${voice.padEnd(26)} FAILED  ${String(e.message || e).replace(/\s+/g, ' ').slice(0, 120)}`);
  }
}

