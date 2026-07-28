/* Years must be spoken as years, and quantities must not be.

   This is a rule about language, not about code, so it is worth pinning: it is easy to
   widen the date-context patterns until "62,832 to 20,000" becomes a pair of years, and
   the failure is silent — a correct-looking file that says the wrong thing, discovered
   only by listening to a rendered master.

     node tools/years.test.mjs
*/
import { yearWords, speakYears, spokenSpans } from './years.mjs';

let pass = 0;
const fails = [];
const eq = (label, got, want) => {
  if (got === want) { pass++; return; }
  fails.push(`${label}\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`);
};

// ── the reading itself ────────────────────────────────────────────────────
for (const [y, want] of [
  [499, 'four ninety-nine'],
  [320, 'three twenty'],
  [550, 'five fifty'],
  [476, 'four seventy-six'],
  [705, 'seven oh five'],
  [800, 'eight hundred'],
  [100, 'one hundred'],
  [1010, 'ten ten'],
  [1947, 'nineteen forty-seven'],
  [1900, 'nineteen hundred'],
  [1905, 'nineteen oh five'],
  [1192, 'eleven ninety-two'],
  [2000, 'two thousand'],
  [2005, 'two thousand five'],
  [60, 'sixty'],
]) eq(`yearWords(${y})`, yearWords(y), want);

// ── a year is only a year in a date context ───────────────────────────────
for (const [text, want] of [
  ['Kusumapura, 499 CE.', 'Kusumapura, four ninety-nine CE.'],
  ['born in 476.', 'born in four seventy-six.'],
  ['in the year 499,', 'in the year four ninety-nine,'],
  ['c. 320 - 550 CE', 'c. three twenty to five fifty CE'],
  ['raised c. 400 CE', 'raised c. four hundred CE'],
  ['by 550 CE', 'by five fifty CE'],
  ['321 BCE', 'three twenty-one BCE'],
  ['1192 AD', 'eleven ninety-two AD'],
]) eq(`speakYears(${JSON.stringify(text)})`, speakYears(text).text, want);

/* The ones that must NOT change. pi's numerator and denominator are a ratio; "20,000"
   sits after "of", which is not a date word; and a percentage is not a year. */
for (const text of [
  'take 62,832 as the circumference for a diameter of 20,000.',
  'Pi as we name it near 3.1416',
  'One hundred and twenty-one verses',
  'about 40% of the harvest',
  'in 12 days',
  'from 3 sources',
]) eq(`unchanged ${JSON.stringify(text)}`, speakYears(text).text, text);

// ── folding the spoken form back onto the written tokens ──────────────────
/* "four ninety-nine" is two whitespace tokens, not three — the hyphen does not split.
   That distinction is the whole point of this fold: the caption must still show one
   token, and the merge has to consume exactly as many boundaries as the voice reported. */
eq('spans: 499 -> two spoken',
  JSON.stringify(spokenSpans('Kusumapura, 499 CE. Under the', 'Kusumapura, four ninety-nine CE. Under the')),
  JSON.stringify([1, 2, 1, 1, 1]));
eq('spans: 2005 -> three spoken',
  JSON.stringify(spokenSpans('signed in 2005 by', 'signed in two thousand five by')),
  JSON.stringify([1, 1, 3, 1]));
eq('spans: nothing rewritten',
  JSON.stringify(spokenSpans('he shapes his work', 'he shapes his work')),
  JSON.stringify([1, 1, 1, 1]));
eq('spans: rewrite at the very end',
  JSON.stringify(spokenSpans('it was 1947', 'it was nineteen forty-seven')),
  JSON.stringify([1, 1, 2]));

console.log(`${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.error('\n' + fails.join('\n\n'));
  process.exit(1);
}
