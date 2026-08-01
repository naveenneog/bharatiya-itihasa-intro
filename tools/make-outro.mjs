/* The closing movement: one image, and what the story's figure actually wrote.

   The film should not end on its last picture. It should dissolve back into the language the
   channel's title sequences are made of — ink and gold in black water — so the piece resolves
   into the brand rather than simply stopping.

   It used to do that across five abstract takes over thirty-three seconds, which is a montage
   where a held shot was wanted: five images in a row say less than one image held long enough
   to be looked at. So this is **one** take, slowed, with the figure's own claims set over it
   as silent type. Nothing is spoken. The last thing the viewer reads is the thing the episode
   was about, in the words of the person who wrote it.

   Nothing is generated here. The take already exists among the abstract `event` shots of the
   three films, and the piece is rendered through the ordinary film renderer — so it gets the
   wordmark, the vignette, the grain and the loudness pass for free, and cannot drift from them.

     node tools/make-outro.mjs --slug zero
     node tools/film-render.mjs --id zero-outro --lift 0.5
*/
import { mkdir, writeFile, readdir, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { ROOT } from './films.mjs';

const execFileP = promisify(execFile);
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };

const SLUG = arg('slug', 'zero');
const ERA = arg('era', 'gupta');

/* What each story closes on.

   Per story, because the closing type is the *content* of the episode restated, not a channel
   sign-off — a shared one would be decoration.

   `episodes/<slug>/closer.json`, written by tools/closer.mjs from the episode's own narration,
   is preferred when it exists. This table is the hand-written fallback, and it holds the one
   set of lines I could write without deriving them: Brahmagupta's, from the Brāhmasphuṭasiddhānta,
   628 CE, chapter 18, where the rules for working with zero and with negative quantities — his
   "fortunes" and "debts" — are set out for the first time anywhere. He also wrote that zero
   divided by zero is zero, which is wrong; it is left off rather than put on screen without the
   narration that would place it, because a card with no voice over it is read as fact. */
const CLOSERS = {
  zero: {
    take: ['zero-objection', '530-lasting-question'],
    cards: [
      { en: 'A fortune minus zero is a fortune.' },
      { en: 'A debt minus zero is a debt.' },
      { en: 'Zero minus zero is zero.' },
      { en: 'Zero multiplied by zero is zero.' },
      { en: 'BRĀHMASPHUṬASIDDHĀNTA', when: '628 CE' },
    ],
  },
};

/* The image the close is held on.

   The three films exist only for the first episode, so a story with no film of its own falls
   back to its era's own abstract beats — the same ink and light language, generated from the
   same prompts, already on disk for all nineteen eras. Without this every story after the
   first would have had to wait on a film that is never going to be made for it. */

const fromFile = await readFile(path.join('episodes', SLUG, 'closer.json'), 'utf8')
  .then(JSON.parse).catch(() => null);
const ep = await readFile(path.join('episodes', SLUG, 'episode.json'), 'utf8')
  .then(JSON.parse).catch(() => null);
const closer = fromFile
  ? { take: CLOSERS[SLUG]?.take || null, cards: fromFile.cards }
  : CLOSERS[SLUG];

if (!closer) {
  console.error(`no closing movement for --slug ${SLUG}`);
  console.error('run tools/closer.mjs --slug ' + SLUG + ' first, or add an entry to CLOSERS');
  process.exit(1);
}
console.log(`${SLUG}: closing cards from ${fromFile ? 'closer.json' : 'the CLOSERS table'}`);

const ID = `${SLUG}-outro`;
const OUT = path.join(ROOT, ID);
/* The clips directory is rebuilt rather than added to: it used to hold five takes, and a
   stale one left beside the new single take is a shot the renderer would happily find. */
await rm(path.join(OUT, 'clips'), { recursive: true, force: true });
await mkdir(path.join(OUT, 'clips'), { recursive: true });

async function newest(film, shot) {
  const dir = path.join(ROOT, film, 'clips');
  const files = await readdir(dir).catch(() => []);
  let best = null; let n = 0;
  for (const f of files) {
    const g = f.match(new RegExp(`^${shot}-r(\\d+)\\.mp4$`));
    if (g && Number(g[1]) > n) { n = Number(g[1]); best = f; }
  }
  return best ? path.join(dir, best) : null;
}

/* The longest abstract beat an era has, and its id.

   Longest because the close is one held image and the type has to be read over it: an eight
   second take retimed is seventeen seconds, a twelve second one is twenty-six, and the
   difference is whether four lines can breathe. */
async function eraTake(era) {
  const dir = path.join('eras', era, 'clips');
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith('.mp4'));
  if (!files.length) return null;
  let best = null; let longest = 0;
  for (const f of files) {
    const p = path.join(dir, f);
    const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', p]).catch(() => ({ stdout: '0' }));
    const d = Number(stdout.trim()) || 0;
    if (d > longest) { longest = d; best = p; }
  }
  return best;
}

const src = closer.take
  ? await newest(closer.take[0], closer.take[1])
  : await eraTake(ERA);
if (!src) {
  console.error(closer.take
    ? `missing take: ${closer.take.join('/')}`
    : `no abstract clips in eras/${ERA}/clips — generate the era first`);
  process.exit(1);
}
console.log(`  held on ${src}`);

const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
  '-of', 'default=nw=1:nk=1', src]);
const srcDur = Number(stdout.trim());

/* Slowed, because the type has to be read.

   Five lines need about seventeen seconds to be legible with fades on both ends; the longest
   take Sora makes is twelve. Rather than cut back to three lines or run a second clip — which
   is the montage this is replacing — the one take is retimed. Abstract ink at two thirds speed
   does not read as slow motion; it reads as held. Audio is dropped: the take carries none, and
   the bed is synthesised later against the shot's own length.

   The factor is chosen from the take rather than fixed, because era beats are eight seconds
   and film shots are twelve, and a fixed 1.5x gives one of them a close half as long as the
   other's for no reason a viewer could name. */
const SHOT_ID = '010-close';
const WANT = 17.5;
const SLOW = Math.min(2.4, Math.max(1.2, +(WANT / srcDur).toFixed(2)));
const clip = path.join(OUT, 'clips', `${SHOT_ID}-r1.mp4`);
await execFileP('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src,
  '-filter:v', `setpts=${SLOW}*PTS`, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
  '-pix_fmt', 'yuv420p', clip]);
/* Measured, not multiplied.

   `srcDur * SLOW` is what the retime asks for; the encoder delivers whatever lands on a whole
   number of frames, which was 150 ms short. The renderer refuses to build a shot its take
   cannot cover — correctly, since the alternative is a frozen frame nobody notices — so the
   hold is taken from the file that now exists rather than from the arithmetic that made it. */
const { stdout: outDur } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
  '-of', 'default=nw=1:nk=1', clip]);
const held = Number(outDur.trim()) - 0.5;

/* Every line gets the same window and they run end to end: a gap between two quotations reads
   as the piece having finished and started again. The last one ends a beat before the picture
   does, so the wordmark rises out of an image with nothing written on it. */
const LEAD = 0.6;
const room = held - LEAD - 0.6;
const each = +(room / closer.cards.length).toFixed(3);
const cards = closer.cards.map((c, k) => ({
  ...c,
  at: +(LEAD + k * each).toFixed(3),
  hold: each,
}));

const shots = [{
  id: SHOT_ID,
  say: null,
  hold: +held.toFixed(3),
  tail: 0,
  place: 'full',
  kind: 'event',
  cards,
  prompt: `reused take from ${src.replace(/\\/g, '/')}, retimed to ${SLOW}x — held, while what `
    + 'the episode found is read rather than heard',
}];

await writeFile(path.join(OUT, 'film.json'), `${JSON.stringify({
  id: ID,
  title: ep?.title || SLUG,
  spine: 'outro',
  logline: 'The film dissolves back into ink, and what it found is read.',
  shots,
}, null, 2)}\n`);

console.log(`${ID}: one take, ${srcDur.toFixed(1)}s -> ${held.toFixed(1)}s at ${SLOW}x`);
for (const c of cards) console.log(`  ${String(c.at).padStart(6)}s +${c.hold}s  ${c.en}`);
console.log(`\n-> ${OUT}/film.json`);
console.log(`render it:  node tools/film-render.mjs --id ${ID} --lift 0.5`);
