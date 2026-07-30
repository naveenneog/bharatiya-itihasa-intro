/* Write a film's shot list.

   This is the step that decides whether the piece has any rhythm, so it is the step that gets
   the most instruction. The model is not asked for "a script" — it is asked for an edit:
   shot by shot, with a stated duration intent and explicit silence between the ones that
   should land.

   Three spines, deliberately different films rather than three edits of one:

     ascent     chronological, accelerating — the idea gathering force
     reverse    opens on a number you used this morning, peels back to a dot on bark
     objection  an argument — the case against zero, stated and answered

     node tools/write-film.mjs --story the_dot_that_became_zero --spine ascent --id zero-ascent
     node tools/write-film.mjs --id zero-ascent --dry
*/
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { chatJson } from './llm.mjs';
import { validateFilm, loadFilm } from './films.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const SRC = arg('src', 'C:/Users/navg/DailyApps/IndianHistory');
const STORY = arg('story', 'the_dot_that_became_zero');
const SPINE = arg('spine', 'ascent');
const ID = arg('id', `zero-${SPINE}`);
const MINUTES = Number(arg('minutes', '5'));
const FORCE = argv.includes('--force');
const DRY = argv.includes('--dry');

const SPINES = {
  ascent: `CHRONOLOGICAL ASCENT.

Begin at the earliest physical trace and move forward in time to the present. The shots get
SHORTER as the film goes on — open on holds of six or seven seconds and close on cuts of two —
so the idea appears to gather speed as it gathers force. The last movement should feel like it
is arriving somewhere it has been heading all along.

The emotional shape: patience, then inevitability.`,

  reverse: `REVERSE ARCHAEOLOGY.

Open on the present — a number with a zero in it, the kind anybody read this morning without
looking at it — and then peel backwards, layer by layer, until the film ends on a single dot
of ink on birch bark in a field in the north-west. Each movement goes further back and gets
quieter and smaller.

The last shot is the oldest thing in the film and the smallest object in it. Nothing is
explained after it.

The emotional shape: recognition, then vertigo.`,

  objection: `THE OBJECTION.

Not a chronicle — an argument. State the case AGAINST zero as it would have been made:
nothing is not a quantity, you cannot count what is not there, a symbol for absence is a
contradiction. Let the objection be genuinely strong; a straw man collapses and takes the
film with it.

Then answer it, in order, with what people actually did. The film is structured as
objection / answer / objection / answer, tightening each time, until the last objection has no
answer and that is the honest ending — division by zero, which Brahmagupta got wrong and
nobody fixed for a thousand years.

The emotional shape: resistance, then surrender, then one thing left standing.`,
};

if (!SPINES[SPINE]) {
  console.error(`--spine must be one of: ${Object.keys(SPINES).join(', ')}`);
  process.exit(1);
}

const OUT = path.join('films', ID);
if (!FORCE && await stat(path.join(OUT, 'film.json')).then(() => true, () => false)) {
  console.log(`${OUT}/film.json exists — pass --force to rewrite`);
  process.exit(0);
}

const story = JSON.parse(await readFile(path.join(SRC, 'app', 'data', `${STORY}.player.json`), 'utf8'));
const research = story.panels.map((p) => p.lines?.[0]?.text?.en).filter(Boolean).join('\n');

const SYSTEM = `You are cutting a short documentary film. You write the EDIT, not a script.

The unit is the SHOT, not the sentence. A shot is one image, held for between 1.2 and 7
seconds. Some shots carry a line of narration. Some carry none at all, and those are not
filler — held silence on a single image is how a film breathes, and a film without it is a
voiceover with pictures.

Return JSON only:

{
  "logline": "one sentence",
  "shots": [
    {
      "id": "010-bakhshali",
      "say": "the narration for this shot, or null for a silent shot",
      "hold": 3.4,
      "tail": 0.3,
      "place": "full" | "macro" | "right",
      "prompt": "what the camera sees",
      "type": { "en": "SHORT CARD", "when": "c. 628 CE" }
    }
  ]
}

## The visual world — this is not negotiable

Every shot is the same photographic language: Indian ink and liquid gold blooming through
clear water against pure black, suspended gold leaf, one hard light. It is macro,
photoreal and physical. You describe **only the subject** — the lighting, the camera and
the palette are applied automatically and MUST NOT appear in your prompt.

So a shot is an object, a surface, a hand, a face, a material event — surfacing, dissolving,
igniting, settling. Never a wide landscape, never a room, never a crowd, never a diagram,
never anything modern unless the film's spine explicitly opens there.

People are allowed and should be used: a face half-lit at the edge of the black, hands,
an eye. Describe them physically and period-correctly. Do not name a real person in the
prompt — describe them.

## Writing, marks and numerals — the trap this film walks straight into

This film is about a written symbol, so half your instincts will be to show writing. The image
model renders requested text as gibberish glyphs, and a viewer looking at a manuscript is
looking closely enough to see that.

Three ways out, in order of preference:

1. **Show the shape, not the script.** A single dot. A single ring. A circle with a void at its
   centre. These are not writing — they are geometry, they render perfectly, and in this film
   they are literally the subject. Prefer this almost always.
2. **Show the surface and let the marks be texture** — "a bark leaf whose surface carries rows
   of worn, indistinct incised marks". The words worn, eroded, indistinct, incised or
   unreadable MUST appear.
3. **Show the instrument, the hand, the material** — a reed pen, a stained fingertip, powdered
   ink dissolving — and let the writing happen off-frame.

Never ask for a legible letter, digit or word. Never ask for a specific numeral.

## Fields

- "id" — three digits then a short slug, in order: 010-, 020-, 030-. Leave gaps of ten so
  shots can be inserted later without renumbering.
- "say" — one sentence, at most about 22 words. It will be spoken aloud at roughly 1.85 words
  per second, so a 16-word line runs about 8.5 seconds. That rate is measured from this
  narrator, not assumed — an earlier estimate of 2.6 ran a five-minute film thirty percent
  long. NEVER write a numeral: write "six twenty-eight", not "628". Null for a silent shot.
- "hold" — for a SILENT shot, exactly how long it holds, 1.2 to 4.0. For a speaking shot,
  your estimate; the real length is measured from the recorded audio later and replaces it.
- "tail" — the pause AFTER this shot, 0 to 1.6. This is your main rhythm control. Use 0 to
  run two shots together, and 0.8-1.6 to let something land.
- "place" — "full" for most shots, "macro" for the closest ones, "right" ONLY when the shot
  carries a "type" card, which needs the left third empty.
- "type" — optional. At most SIX cards in the whole film, at the movement boundaries. A card
  is two or three words plus a date. Not a caption of the shot.

## Rhythm — this is what the film is judged on

- Vary shot length constantly. Two long shots in a row is a stall; six short ones in a row is
  a music video. The pattern that reads is: long, long, short-short-short, hold, long.
- At least one in six shots is SILENT. Put them where the meaning needs a second to land —
  after a claim, before a reversal, on the last image.
- Never let the narration run continuously for more than about four shots without a silent one.
- The final shot is silent and holds at least three seconds.

## Accuracy

Every factual claim must be supported by the research given to you. Where the history is
contested, say so in the narration rather than choosing a side. Do not invent dates, names,
or firsts. The written zero SYMBOL and the CONCEPT of place value are different things and
the film must not conflate them.`;

const user = `FILM: ${story.title}
TARGET RUNTIME: about ${MINUTES} minutes — expect roughly ${Math.round(MINUTES * 13)} to ${Math.round(MINUTES * 17)} shots.

STRUCTURE — this is the spine of this particular version:

${SPINES[SPINE]}

RESEARCH — everything below is established by the source material. Work only from it.

${research}`;

if (DRY) {
  console.log(`${ID}: spine=${SPINE}, ${(SYSTEM.length + user.length)} chars; nothing sent`);
  process.exit(0);
}

console.log(`writing "${ID}" — ${SPINE} — target ${MINUTES} min...`);
const got = await chatJson(SYSTEM, user, { maxTokens: 16000 });

const film = {
  id: ID,
  title: story.title,
  spine: SPINE,
  logline: got.logline || '',
  story: STORY,
  shots: got.shots || [],
};

await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'film.json'), `${JSON.stringify(film, null, 2)}\n`);

const v = validateFilm(film);
const loaded = await loadFilm(ID);

console.log(`\n  ${film.shots.length} shots · ${v.spoken} speaking · ${v.silent} silent`);
console.log(`  estimated runtime ${Math.floor(loaded.runtime / 60)}:${String(Math.round(loaded.runtime % 60)).padStart(2, '0')}`);
console.log(`  ${loaded.shots.filter((s) => s.type).length} cards`);
console.log(`\n  "${film.logline}"\n`);

for (const s of loaded.shots.slice(0, 8)) {
  const mark = s.say ? ' ' : '\u00b7';
  console.log(`  ${mark} ${s.id.padEnd(22)} ${s.dur.toFixed(1)}s  ${s.say ? `"${s.say.slice(0, 62)}"` : '(silent)'}`);
}
console.log(`  ... ${loaded.shots.length - 8} more`);

if (v.problems.length) {
  console.log(`\n  ${v.problems.length} problem(s):`);
  for (const p of v.problems) console.log(`   ! ${p}`);
}
if (v.warn.length) {
  console.log(`\n  ${v.warn.length} warning(s):`);
  for (const p of v.warn.slice(0, 6)) console.log(`   - ${p}`);
}
console.log(`\n-> ${OUT}/film.json`);
