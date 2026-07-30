/* Re-shoot a film — rewrite what the camera sees, keep everything else.

   The first pass of stills was beautiful and monotonous: five shots in eight were the same
   picture, ink billowing in black water. Individually strong, indistinguishable in sequence.
   That is a failure of the thing this format exists for — timing cannot articulate anything
   if every shot has the same texture, because there is no contrast for it to work against.

   Re-authoring the film would fix it and throw away the narration, which is recorded, timed
   and good. So only the prompts are rewritten. The shot ids, the lines, the holds, the tails
   and the cards are untouched, which means the edit survives and only the pictures change.

   Three rules go in that were not there the first time:

   1. **A shot has a KIND**, and the kinds are distributed. No more than two abstract ink shots
      in a row, and every movement has to contain a hand or a face.
   2. **The figure is described once**, from the episode's own artwork, exactly as the thumbnail
      subject is — otherwise the model reaches for a white-bearded sage in saffron robes, which
      is a stereotype rather than a person and was in the first pass.
   3. **Gold and ivory carry the frame; saffron is an accent.** The first pass came out
      saffron-dominant and drifted away from the title sequences it has to cut against.

     node tools/reshoot.mjs --id zero-ascent
     node tools/reshoot.mjs --all
*/
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chatJson } from './llm.mjs';
import { listFilms, ROOT } from './films.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);
const DRY = has('dry');
const SUBJECT = arg('subject', 'episodes/zero/thumb-art/subject.json');

const ids = has('all') ? await listFilms() : (arg('id', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!ids.length) { console.error('usage: --all | --id <film-id>'); process.exit(1); }

const subject = await readFile(SUBJECT, 'utf8').then(JSON.parse).catch(() => null);

const SYSTEM = `You are the director of photography on a documentary short. The edit is locked:
the shots, their order, their narration and their durations are all decided. Your only job is
to say what the camera sees in each one.

Return JSON only: { "shots": [ { "id": "010-...", "kind": "...", "place": "...", "prompt": "..." } ] }

One entry for every shot id you are given, in the same order. Change nothing else.

## The world

Every shot is the same photographic language: Indian ink and liquid gold blooming through clear
water against pure black, suspended gold leaf, one hard light, macro, photoreal. The lighting,
the camera and the palette are applied automatically — describe ONLY the subject, never the
light, the lens or the colour scheme.

**Gold and aged ivory carry the frame. Saffron is an accent, not the subject.** A previous pass
came out orange-dominant and stopped matching the rest of the channel. Do not write "orange",
"saffron" or "amber" into a prompt; the palette is applied for you.

## KIND — this is the part that decides whether the film works

Every shot must be one of these, and the distribution is enforced:

  object     a made thing, held or resting — a bowl, a coin, a chisel, a reed pen, a seal
  surface    a texture filling the frame — bark, stone, cloth, skin, water, powder
  hand       hands doing something specific — scribing, counting, grinding, pointing, tying
  face       a person, half-lit at the edge of the black
  event      a physical happening — ink striking water, gold leaf igniting, a drop landing,
             something dissolving, cracking, settling
  scale      the one wide idea in a movement — a stone face receding, a vast dark expanse

**No more than TWO "event" shots in a row.** The abstract ink-in-water shot is the easiest and
the emptiest; used back to back it turns a film into a screensaver. It is punctuation, not
substance.

**Every run of eight shots must contain at least one "hand" or "face".** Human presence is what
stops macro photography becoming wallpaper.

**Consecutive shots must differ in kind.** Two "surface" shots in a row is one shot.

## place

  "macro"  extreme close, the subject fills the frame — use for surface and small objects
  "full"   the whole frame — use for most shots
  "right"  ONLY where the shot already carries a card; the left third must stay empty

## Writing and marks

The image model renders requested text as gibberish. Show the SHAPE, not the script: a dot, a
ring, a circle with a void at its centre. If a surface must carry marks, they are "worn, eroded
and indistinct". Never ask for a legible letter, digit or word.

## Anachronism

Nothing later than the shot's own period. No globes, no telescopes, no printed books, no
spectacles, no modern glassware — unless the film's own narration is explicitly in the present.`;

for (const id of ids) {
  const f = path.join(ROOT, id, 'film.json');
  const film = JSON.parse(await readFile(f, 'utf8'));

  const list = film.shots.map((s, i) =>
    `${s.id}  [${s.type ? 'CARD' : s.say ? 'spoken' : 'silent'}]  ${s.say || '(held, no narration)'}\n      now: ${s.prompt}`).join('\n');

  const user = `FILM: ${film.title} — ${film.spine}
${film.logline}

${subject ? `THE FIGURE — whenever a person appears in this film it is this person, and every
"face" or "hand" shot must match this description. Do not invent a different one, and do not
default to an elderly bearded sage:

${subject.figure}

` : ''}THE LOCKED EDIT — rewrite the "now:" line for each, keeping the same subject matter but
choosing a KIND that gives the sequence contrast:

${list}`;

  if (DRY) { console.log(`${id}: ${(SYSTEM.length + user.length)} chars; nothing sent`); continue; }

  console.log(`re-shooting ${id} — ${film.shots.length} shots...`);
  const got = await chatJson(SYSTEM, user, { maxTokens: 16000 });
  const by = new Map((got.shots || []).map((s) => [s.id, s]));

  let n = 0;
  const kinds = {};
  for (const s of film.shots) {
    const g = by.get(s.id);
    if (!g?.prompt) continue;
    s.prompt = g.prompt;
    s.kind = g.kind || 'object';
    if (g.place) s.place = g.place;
    if (s.type) s.place = 'right';
    kinds[s.kind] = (kinds[s.kind] || 0) + 1;
    n++;
  }

  /* Verify the distribution rather than trust it — the rule that matters most is the one the
     model is most likely to slide on, because the abstract shot is the easy one to write. */
  const seq = film.shots.map((s) => s.kind);
  let runs = 0;
  for (let i = 2; i < seq.length; i++) if (seq[i] === 'event' && seq[i - 1] === 'event' && seq[i - 2] === 'event') runs++;
  let dry = 0;
  for (let i = 0; i + 8 <= seq.length; i++) if (!seq.slice(i, i + 8).some((k) => k === 'hand' || k === 'face')) dry++;

  await writeFile(f, `${JSON.stringify(film, null, 2)}\n`);
  console.log(`  ${n}/${film.shots.length} rewritten`);
  console.log(`  kinds  ${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  if (runs) console.log(`  ! ${runs} run(s) of three consecutive event shots`);
  if (dry) console.log(`  ! ${dry} window(s) of eight shots with no hand or face`);
  if (!runs && !dry) console.log('  distribution ok');
}
