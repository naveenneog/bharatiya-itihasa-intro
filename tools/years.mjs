/* Say a year like a year.

   Azure's neural voices read a bare integer as a quantity. "Kusumapura, 499 CE" comes
   out as "four hundred ninety-nine C E" — the number of something, not a date — which
   is wrong in the opening line of the first episode, and inconsistent with how the same
   year is read elsewhere in the same narration.

   English reads years in pairs, not as totals:

     499  -> four ninety-nine          (not four hundred ninety-nine)
     320  -> three twenty
     550  -> five fifty
     705  -> seven oh five
     800  -> eight hundred             (a round century keeps "hundred")
     1010 -> ten ten
     1947 -> nineteen forty-seven
     1900 -> nineteen hundred
     2005 -> two thousand five

   This is deliberately a *text* transform rather than SSML `<say-as interpret-as="date">`,
   for two reasons. Support for a bare year is uneven across voices and silently falls
   back to the quantity reading, which is the bug. And the word timings that drive the
   on-screen captions come back from the synthesiser keyed to the words it actually
   spoke — so the spoken form has to be something we chose and can map back.

   Only years in a date context are touched: a number adjacent to CE, BCE, AD, BC, or
   inside a phrase like "in the year 499". A bare "62,832" in a ratio stays a quantity,
   because that is what it is.

   This mirrors `_norm()` in IndianHistory/tools/voice.py and is written to be lifted
   back into it verbatim.
*/

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 0–99 in words. 47 -> "forty-seven". */
function twoDigit(n) {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = n % 10;
  return o ? `${t}-${ONES[o]}` : t;
}

/** 0–999 as a quantity. Used only for the parts of a year that need it. */
function under1000(n) {
  if (n < 100) return twoDigit(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  return r ? `${ONES[h]} hundred ${twoDigit(r)}` : `${ONES[h]} hundred`;
}

/**
 * A year, spoken the way a reader would say it.
 * @param {number} y
 * @returns {string}
 */
export function yearWords(y) {
  if (!Number.isInteger(y) || y < 1 || y > 2999) return String(y);

  // under a hundred: "in the year sixty" — nothing to pair
  if (y < 100) return twoDigit(y);

  // three digits: pair the hundreds digit with the remainder — "four ninety-nine"
  if (y < 1000) {
    const h = Math.floor(y / 100);
    const r = y % 100;
    if (r === 0) return `${ONES[h]} hundred`;
    if (r < 10) return `${ONES[h]} oh ${ONES[r]}`;   // 705 -> "seven oh five"
    return `${ONES[h]} ${twoDigit(r)}`;
  }

  /* Four digits. The 2000s are read as a total ("two thousand five"), everything before
     them in pairs ("ten ten", "nineteen forty-seven"). A round hundred keeps the word:
     1900 is "nineteen hundred", not "nineteen zero". */
  const hi = Math.floor(y / 100);
  const lo = y % 100;
  if (y >= 2000) {
    if (lo === 0 && y % 1000 === 0) return `${ONES[Math.floor(y / 1000)]} thousand`;
    return `${ONES[Math.floor(y / 1000)]} thousand ${under1000(y % 1000)}`.trim();
  }
  if (lo === 0) return `${twoDigit(hi)} hundred`;
  if (lo < 10) return `${twoDigit(hi)} oh ${ONES[lo]}`;
  return `${twoDigit(hi)} ${twoDigit(lo)}`;
}

/* A year is only a year when something says so. Three contexts, in the order they have
   to be tried so the widest one does not swallow the others:

     1. an explicit era marker after the number   "499 CE", "1192 AD", "321 BCE"
     2. a range whose right side carries a marker "c. 320 - 550 CE"
     3. an explicit date phrase                   "in the year 499", "by 550"

   Everything else is left alone. */
const ERA = '(?:C\\.?E\\.?|B\\.?C\\.?E\\.?|A\\.?D\\.?|B\\.?C\\.?)';
const RE_RANGE = new RegExp(`\\b(\\d{1,4})\\s*(?:-|–|—|\\bto\\b)\\s*(\\d{1,4})(\\s*${ERA})\\b`, 'g');
const RE_ERA = new RegExp(`\\b(\\d{1,4})(\\s*${ERA})\\b`, 'g');
const RE_PHRASE = /\b(?:in|by|around|about|circa|c\.|since|from|until|till)\s+(?:the\s+year\s+)?(\d{3,4})\b(?!\s*(?:%|st|nd|rd|th))/gi;
const RE_YEAROF = /\bthe\s+year\s+(\d{1,4})\b/gi;

/**
 * Rewrite years in `text` into the words a reader would say.
 *
 * A number is only treated as a year when it sits in a date context, so quantities and
 * ratios are untouched: "62,832 to 20,000" stays a quantity because neither side carries
 * an era marker.
 *
 * @param {string} text
 * @returns {{text: string, changed: [string, string][]}}
 */
export function speakYears(text) {
  const changed = [];
  const sub = (from, to) => { if (from !== to) changed.push([from, to]); return to; };
  let out = String(text ?? '');

  out = out.replace(RE_RANGE, (m, a, b, era) =>
    sub(m, `${yearWords(Number(a))} to ${yearWords(Number(b))}${era}`));
  out = out.replace(RE_ERA, (m, y, era) => sub(m, `${yearWords(Number(y))}${era}`));
  out = out.replace(RE_YEAROF, (m, y) => sub(m, m.replace(y, yearWords(Number(y)))));
  out = out.replace(RE_PHRASE, (m, y) => sub(m, m.replace(y, yearWords(Number(y)))));

  return { text: out, changed };
}

/* The captions are keyed to the *written* line, not the spoken one, so the words that
   come back from the synthesiser have to be folded back to the tokens on screen.
   "four ninety-nine" is three spoken words standing in for the single token "499", and
   their timings must be merged into one span or the caption lights three words that the
   viewer cannot see.

   This returns the spoken-token count each written token expands to, so the merge is
   arithmetic rather than a guess. */
export function spokenSpans(written, spoken) {
  const w = written.split(/\s+/).filter(Boolean);
  const s = spoken.split(/\s+/).filter(Boolean);
  const spans = [];
  let i = 0;
  let j = 0;
  const bare = (t) => t.replace(/[^\w'’-]/g, '').toLowerCase();

  while (i < w.length) {
    // a written token that survived verbatim consumes exactly one spoken token
    if (j < s.length && bare(w[i]) === bare(s[j])) { spans.push(1); i++; j++; continue; }

    /* Otherwise it was rewritten. Consume spoken tokens until the *next* written token
       lines up again — that run is what this one token became. */
    const nextW = i + 1 < w.length ? bare(w[i + 1]) : null;
    let n = 0;
    while (j + n < s.length) {
      n++;
      if (nextW === null) { n = s.length - j; break; }
      if (bare(s[j + n]) === nextW) break;
    }
    spans.push(Math.max(1, n));
    j += Math.max(1, n);
    i++;
  }
  return spans;
}
