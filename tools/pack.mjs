/* Author the packaging for an episode: title, hook, chapters, tags, thumbnail headlines.

   `publish.json` was hand-written for the first episode. Eleven Gupta stories at two
   versions each is twenty-two of them, and a channel is a hundred and ninety-nine — so
   this writes it from the story's own narration.

   Three rules, each of which exists because the obvious version of this is worse:

   1. **Grounded.** The model is given the actual narration and told that every claim must
      be traceable to it. Packaging is where invention is most tempting and most damaging:
      a title that promises something the video does not deliver is the one thing that
      reliably destroys retention.
   2. **Chapters are chosen from real panel ids**, not invented, and are checked against
      the same >=10s rule publish.mjs enforces — so a chapter list cannot be authored here
      and then silently dropped at publish time.
   3. **Options, not a verdict.** Titles and thumbnail headlines come back as ranked lists.
      The channel's voice is the user's call; the model's job is to give it something to
      choose between.

     node tools/pack.mjs --slug aryabhata --dry
     node tools/pack.mjs --slug zero
     node tools/pack.mjs --slug zero --force        # overwrite an existing publish.json
*/
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chatJson } from './llm.mjs';
import { langOf, lineOf } from './lang.mjs';
import { CUTS, openIndices } from './episode-page.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const SLUG = arg('slug', null);
const CUT = arg('cut', 'cut-e-framed');
/* YouTube drops a chapter list if any gap is under 10s. The margin above that is for the
   whole-second rounding in the printed clock, not for the spliced title sequence — the
   splice shifts everything after it by the same amount, so gaps between later chapters
   are unchanged. A larger margin here only throws away good chapters. */
const MINGAP = Number(arg('min-gap', '18'));
const DRY = argv.includes('--dry');
const FORCE = argv.includes('--force');

if (!SLUG) { console.error('usage: node tools/pack.mjs --slug <episode-slug>'); process.exit(1); }

const EP = path.join('episodes', SLUG);
const OUT = path.join(EP, 'publish.json');
const ep = JSON.parse(await readFile(path.join(EP, 'episode.json'), 'utf8'));
const LANG = langOf(ep);
const cut = CUTS.find((c) => c.id === CUT);
if (!cut) { console.error(`unknown cut ${CUT}`); process.exit(1); }

if (!FORCE && await stat(OUT).then(() => true, () => false)) {
  console.log(`${OUT} already exists — pass --force to overwrite`);
  process.exit(0);
}

/* Panels in the order the *cut* plays them, not the order they are stored in. Cut E opens
   on `cover`, which is the third panel in the data; timing the chapters in storage order
   would put every mark in the wrong place and silently mis-measure the gaps. This is the
   same reordering publish.mjs does. */
const openIdx = openIndices(ep.panels, cut);
const order = [...openIdx, ...ep.panels.map((_, n) => n).filter((n) => !openIdx.includes(n))]
  .map((n) => ep.panels[n]);

/* The model sees the panels as a transcript with ids and running times, because a chapter
   is a *timestamp* decision as much as a naming one: it has to know that p03 is at 0:41
   to know it is far enough from p01. */
let t = 0;
const at = {};
const transcript = order.map((p) => {
  at[p.id] = t;
  const mm = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  t += p.dur;
  return `[${p.id} @ ${mm}] ${lineOf(p, LANG)}`;
}).join('\n');

const SYSTEM = `You write packaging for a YouTube history channel, "Bhāratīya Itihāsa".

The channel is serious history told cinematically. It is not a listicle channel and not a
mythology channel. Its audience is curious adults who will leave instantly if a title
overpromises, and equally instantly if the packaging is dull.

You will be given an episode's full narration. Everything you write must be supported by
that narration. If a striking comparison is not in the text, you may only use it if it is
uncontroversial general knowledge that a historian would not dispute (e.g. Copernicus
published in 1543). Never invent a date, a name, a number or a "first".

Return JSON only, in exactly this shape:

{
  "titles": [
    { "text": "...", "why": "...", "risk": "none|mild|overclaim" }
  ],
  "hook": "One sentence, max 30 words. The first two lines of the description are the only ones visible before 'more'.",
  "tags": ["..."],
  "chapters": { "<panel-id>": "Chapter name", ... },
  "thumb_headlines": [
    { "lines": ["...", "...", "..."], "why": "...", "risk": "none|mild|overclaim" }
  ],
  "kicker": "SHORT · DATE, e.g. INDIA · 499 CE",
  "one_line": "The single sentence that says why this story matters, for the end card."
}

Rules:
- 5 titles, ranked best first. Under 60 characters where possible so nothing truncates on
  mobile. No clickbait that the video does not pay off. Mark anything you are stretching
  as "overclaim" rather than quietly shipping it.
- 5 thumbnail headlines, ranked. Each is 2-4 SHORT lines in CAPS, 1-3 words per line —
  they are set very large over artwork and must be readable at 320x180. The thumbnail and
  the title are read together, so they must say two different things: a headline that
  restates the episode title, or the title you ranked first, wastes half the packaging.
  Prefer a question or a reversal that the title does not contain.
- 10-14 tags, specific before generic.
- 8-12 chapters. Keys MUST be panel ids that appear in the transcript. The first chapter
  must be the very first panel id in the transcript. Consecutive chapters must be at least
  {{MINGAP}} seconds apart in the running times shown — YouTube silently ignores a chapter
  list with any gap under 10s, so anything tighter is thrown away.
- Chapter names are 2-5 words, concrete, no colons.
${LANG.instruction}`.replace('{{MINGAP}}', String(MINGAP));

const user = `TITLE: ${ep.title}
FIGURE: ${ep.figure || '—'}
ERA: ${ep.era || '—'}
MORAL: ${ep.moral || '—'}
HERO LINE: ${ep.hero || '—'}
RUNTIME: ${(ep.runtime / 60).toFixed(1)} min

NARRATION
${transcript}`;

if (DRY) {
  console.log(`${SLUG}: ${ep.panels.length} panels, ${(ep.runtime / 60).toFixed(1)} min`);
  console.log(`prompt is ${(SYSTEM.length + user.length)} chars; nothing sent`);
  process.exit(0);
}

console.log(`packaging ${SLUG} — ${ep.panels.length} panels...`);
const got = await chatJson(SYSTEM, user, { maxTokens: 6000 });

/* Verify rather than trust. Every one of these has a real failure behind it: a chapter
   keyed to a panel that does not exist writes a file publish.mjs then throws on, and
   chapters closer than the 10s rule are dropped at upload with no error anywhere. */
const problems = [];
const chapters = {};
let prev = -Infinity;
for (const [id, name] of Object.entries(got.chapters || {})) {
  if (!(id in at)) { problems.push(`chapter "${name}" names unknown panel ${id}`); continue; }
  if (at[id] - prev < MINGAP && prev > -Infinity) {
    problems.push(`chapter "${name}" is ${(at[id] - prev).toFixed(0)}s after the previous one — dropped`);
    continue;
  }
  chapters[id] = name;
  prev = at[id];
}
if (Object.keys(chapters).length < 3) problems.push('fewer than 3 chapters survive — publish.mjs will refuse');

const first = order[0].id;
if (!(first in chapters)) {
  chapters[first] = got.chapters?.[first] || 'The claim';
  problems.push(`first panel ${first} had no chapter — added one, rename it`);
}

const ordered = Object.fromEntries(
  Object.keys(chapters).sort((a, b) => at[a] - at[b]).map((k) => [k, chapters[k]]),
);

const pick = (list, key) => (Array.isArray(list) && list.length ? list[0][key] ?? list[0] : null);

const out = {
  title: pick(got.titles, 'text') || ep.title,
  hook: got.hook || ep.hero || '',
  tags: got.tags || [],
  chapters: ordered,
  thumb: {
    candidate: null,
    art: null,
    pos: '50% 42%',
    kicker: got.kicker || '',
    headline: (got.thumb_headlines?.[0]?.lines || []).join(' '),
    lines: got.thumb_headlines?.[0]?.lines || [],
    foot: null,
  },
  /* The alternatives are kept in the file rather than printed and lost. Choosing a
     different title later must not mean re-running the model and getting a different
     five. */
  options: {
    titles: got.titles || [],
    thumb_headlines: got.thumb_headlines || [],
    one_line: got.one_line || '',
  },
};

await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);

console.log(`\nTITLES`);
for (const [i, t2] of (got.titles || []).entries()) {
  console.log(`  ${i + 1}. ${t2.text}${t2.risk && t2.risk !== 'none' ? `   [${t2.risk}]` : ''}`);
  console.log(`     ${t2.why}`);
}
console.log(`\nTHUMBNAIL HEADLINES`);
for (const [i, h] of (got.thumb_headlines || []).entries()) {
  console.log(`  ${i + 1}. ${h.lines.join(' / ')}${h.risk && h.risk !== 'none' ? `   [${h.risk}]` : ''}`);
}
console.log(`\nCHAPTERS (${Object.keys(ordered).length})`);
for (const [id, name] of Object.entries(ordered)) {
  const s = at[id];
  console.log(`  ${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}  ${name}   (${id})`);
}
if (problems.length) {
  console.log(`\n${problems.length} problem(s) corrected:`);
  for (const p of problems) console.log(`  - ${p}`);
}
console.log(`\n-> ${OUT}`);
console.log('thumb.candidate is still null — run gen-thumb-art.mjs, thumbnail.mjs, then --pick');
