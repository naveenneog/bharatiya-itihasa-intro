/* What language an episode is in, and what that means for everything written about it.

   The episode folder carries its own language (build-episode stamps `lang` into episode.json),
   so every downstream tool can ask rather than be told. That matters more than it sounds: the
   packaging, the cold open, the closing cards and the vertical cut are four separate generators,
   and a language passed to three of them produces an episode with a Hindi voice and an English
   title, which is worse than either.

   The Hindi that is asked for here is deliberately specific. A model told only "write in Hindi"
   produces news-anchor Hindi — heavily Sanskritised, or worse, English nouns in Devanagari. This
   channel's Hindi is the register the narration itself is written in, which is what the sample
   lines are for. */
import path from 'node:path';
import { readFile } from 'node:fs/promises';

export const LANGS = {
  en: {
    code: 'en',
    name: 'English',
    /* The wordmark is bilingual everywhere else in the channel, so neither language "owns" it. */
    wordmark: 'Bhāratīya Itihāsa',
    instruction: '',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    wordmark: 'भारतीय इतिहास',
    instruction: `
WRITE EVERYTHING IN HINDI, in Devanagari script. This is not a translation task — you are
writing for a Hindi-speaking audience directly.

- Use the same register as the narration you are given: plain, literary Hindi that a general
  audience reads comfortably. Not Sanskritised officialese, not Hinglish.
- Keep proper nouns as the narration spells them (ब्रह्मगुप्त, भीनमाल, नालंदा).
- Numbers and years in Devanagari numerals only where the narration does; otherwise Arabic.
- Do not transliterate English words into Devanagari when a Hindi word exists. "पुस्तकालय",
  not "लाइब्रेरी".
- Titles must still work as titles: short, concrete, and honest about what the episode shows.
  A Hindi title that is a literal translation of an English one is usually too long — write
  the Hindi title, do not translate.`,
  },
};

/** The language record for a built episode, read from the episode itself. */
export function langOf(ep) {
  const code = ep?.lang || 'en';
  const l = LANGS[code];
  if (!l) throw new Error(`episode language "${code}" has no profile in tools/lang.mjs`);
  return l;
}

/** Read an episode and its language in one step, since nothing wants one without the other. */
export async function episodeIn(slug) {
  const dir = path.join('episodes', slug);
  const ep = JSON.parse(await readFile(path.join(dir, 'episode.json'), 'utf8'));
  return { dir, ep, lang: langOf(ep) };
}

/** The caption text a panel shows in this episode's language, falling back to what exists. */
export const lineOf = (p, lang) => (p.text?.[lang.code] || p.text?.en || '').trim();

/** Narration as the generators want it: one line per panel, timed, in the episode's language. */
export function narrationOf(ep, lang, { withTimes = true } = {}) {
  let t = 0;
  const out = [];
  for (const p of ep.panels) {
    const mm = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    t += p.dur;
    const line = lineOf(p, lang);
    if (line) out.push(withTimes ? `[${p.id} @ ${mm}] ${line}` : line);
  }
  return out.join('\n');
}
