/* Assemble a closing movement out of takes that already exist.

   The film should not end on its last picture. It should dissolve back into the language the
   channel's title sequences are made of — ink and gold in black water — so the piece resolves
   into the brand rather than simply stopping.

   Every take needed for that is already generated: the abstract `event` shots across the three
   films. So this builds a small film that reuses them rather than generating anything, and
   renders it through the ordinary film renderer — which means it gets the wordmark, the
   vignette, the grain and the loudness pass for free, and cannot drift from them.

     node tools/make-outro.mjs
     node tools/film-render.mjs --id zero-outro --lift 0.5
*/
import { mkdir, copyFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './films.mjs';

/* Chosen for shape rather than for source: a surge, a settling, a ring forming, a dispersal,
   and one held circle to end on. The ring is the point — the film is about a symbol that is a
   circle, and the last thing on screen before the wordmark should be that circle appearing out
   of nothing on its own. */
const PICKS = [
  ['zero-objection', '010-ink-surge', 'the surge'],
  ['zero-reverse', '190-ink-dot-emergence', 'a dot resolving'],
  ['zero-objection', '280-dot-to-ring', 'the dot becomes a ring'],
  ['zero-objection', '380-precarious-circle', 'the circle, barely holding'],
  ['zero-objection', '530-lasting-question', 'and held'],
];

const ID = 'zero-outro';
const OUT = path.join(ROOT, ID);
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

/* Slowing toward the end. The first cut is four seconds and the last is seven, so the piece
   settles rather than stops — the opposite of the acceleration the title sequences use, which
   is what makes it read as a resolution. */
const HOLDS = [4.0, 4.6, 5.2, 6.0, 7.4];

const shots = [];
for (const [i, [film, shot, note]] of PICKS.entries()) {
  const src = await newest(film, shot);
  if (!src) { console.error(`missing take: ${film}/${shot}`); process.exit(1); }
  const id = `${String((i + 1) * 10).padStart(3, '0')}-${shot.replace(/^\d+-/, '')}`;
  await copyFile(src, path.join(OUT, 'clips', `${id}-r1.mp4`));
  shots.push({
    id,
    say: null,
    hold: HOLDS[i],
    tail: i === PICKS.length - 1 ? 0 : 0.25,
    place: 'full',
    kind: 'event',
    prompt: `reused take from ${film}/${shot} — ${note}`,
  });
  console.log(`  ${id.padEnd(26)} ${HOLDS[i].toFixed(1)}s  <- ${film}/${shot}`);
}

await writeFile(path.join(OUT, 'film.json'), `${JSON.stringify({
  id: ID,
  title: 'The Dot That Became Zero',
  spine: 'outro',
  logline: 'The film dissolves back into ink.',
  shots,
}, null, 2)}\n`);

const total = shots.reduce((a, s) => a + s.hold + s.tail, 0);
console.log(`\n${shots.length} shots, ${total.toFixed(1)}s + wordmark -> ${OUT}/film.json`);
console.log(`render it:  node tools/film-render.mjs --id ${ID} --lift 0.5`);
