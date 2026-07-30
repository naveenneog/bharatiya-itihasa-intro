/* Publish a film — the upload folder, from the film's own edit.

   The episode publisher cuts captions out of per-panel word timings and chapters out of an
   authored map. A film has neither: it has shots, cards and one narration file per speaking
   shot. Everything here is derived from those, so a change to the edit cannot leave the
   captions a second out.

   Chapters come from the CARDS, which is what a card is for — the author already decided where
   the movements begin, and asking a model to decide it again would be a second opinion nobody
   needs.

     node tools/film-publish.mjs --id zero-ascent
     node tools/film-publish.mjs --all
*/
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { listFilms, loadFilm, ROOT } from './films.mjs';
import { cardsOf } from './film-page.mjs';

const execFileP = promisify(execFile);
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);
const ERA = arg('era', 'gupta');

const ids = has('all') ? await listFilms() : (arg('id', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!ids.length) { console.error('usage: --all | --id <film-id>'); process.exit(1); }

const clock = (s) => {
  const t = Math.max(0, Math.floor(s));
  const m = Math.floor(t / 60);
  const sec = String(t % 60).padStart(2, '0');
  return t >= 3600 ? `${Math.floor(t / 3600)}:${String(m % 60).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

const ts = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor(ms / 60000) % 60).padStart(2, '0');
  const sec = String(Math.floor(ms / 1000) % 60).padStart(2, '0');
  return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, '0')}`;
};

const MAXLINE = 42;
function wrap(text) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && `${cur} ${w}`.length > MAXLINE) { lines.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2).join('\n') + (lines.length > 2 ? ` ${lines.slice(2).join(' ')}` : '');
}

for (const id of ids) {
  const film = await loadFilm(id);
  const master = arg('master', path.join('dist', `${id}.mp4`));
  const out = arg('out', path.join('dist', ERA, id.replace(/-/g, '_')));
  await mkdir(out, { recursive: true });

  /* Captions. One cue per speaking shot, split only when the line is too long to read at once
     — a film's narration is already one sentence per shot, so the shot is the natural cue.
     Silent shots produce no cue, which is the point: the screen is empty because nothing is
     being said, and a caption there would be inventing something to read. */
  const cues = [];
  for (const s of film.shots) {
    if (!s.say) continue;
    const said = s.said ?? s.hold ?? 3;
    const words = s.say.trim().split(/\s+/);
    if (s.say.length <= MAXLINE * 2) {
      cues.push({ a: s.start, b: s.start + said, t: s.say.trim() });
      continue;
    }
    const half = Math.ceil(words.length / 2);
    const cut = words.slice(0, half).join(' ');
    const share = cut.length / s.say.trim().length;
    cues.push({ a: s.start, b: s.start + said * share, t: cut });
    cues.push({ a: s.start + said * share, b: s.start + said, t: words.slice(half).join(' ') });
  }
  const srt = cues
    .filter((c) => c.b > c.a + 0.15)
    .map((c, k) => `${k + 1}\n${ts(c.a)} --> ${ts(c.b)}\n${wrap(c.t)}\n`).join('\n');
  await writeFile(path.join(out, `${id}.en.srt`), srt);

  /* Chapters from the cards. The author placed them at the movement boundaries, which is
     exactly what a chapter is, so they are not decided twice. YouTube's rules are enforced
     here rather than assumed: first mark at 0:00, at least three, none under ten seconds. */
  const cards = cardsOf(film);
  /* The first mark must read 0:00. If the opening card is already close to the top it *is*
     that mark; only if the film runs for a while before its first card does it need a name of
     its own. Seeding with the first card and then walking the same list produced it twice. */
  const first = cards[0];
  const seeded = first && first.start < 20;
  const marks = [{ at: 0, name: seeded ? first.en : 'Open' }];
  for (const c of cards.slice(seeded ? 1 : 0)) {
    if (c.start - marks[marks.length - 1].at >= 10) marks.push({ at: c.start, name: c.en });
  }
  if (marks.length < 3) {
    /* A film with only two cards still needs three chapters, so the gap is filled from the
       shot list at the largest silences — the places the edit itself already treats as breaks. */
    const breaks = film.shots.filter((s) => !s.say && s.dur >= 2.4).map((s) => ({ at: s.start, name: 'A pause' }));
    for (const b of breaks) {
      if (marks.length >= 4) break;
      if (marks.every((m) => Math.abs(m.at - b.at) >= 25)) marks.push(b);
    }
    marks.sort((a, b) => a.at - b.at);
  }
  const chapters = marks.map((m) => `${clock(m.at)} ${m.name}`).join('\n');
  await writeFile(path.join(out, 'chapters.txt'), `${chapters}\n`);

  const description = [
    film.logline,
    '',
    `${film.title} — a Bhāratīya Itihāsa film.`,
    '',
    'CHAPTERS',
    chapters,
    '',
    'Bhāratīya Itihāsa — India\'s history, one story at a time.',
  ].join('\n');
  await writeFile(path.join(out, 'description.txt'), description);
  await writeFile(path.join(out, 'title.txt'), `${film.title}\n`);

  const collected = [];
  if (existsSync(master)) {
    await copyFile(master, path.join(out, `${id}.mp4`));
    collected.push([`${id}.mp4`, statSync(master).size]);
  }

  const mb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;
  await writeFile(path.join(out, 'UPLOAD.md'), [
    `# ${film.title} — ${film.spine}`,
    '',
    `${film.shots.length} shots · ${clock(film.runtime)} · ${cues.length} caption cues · ${marks.length} chapters`,
    '',
    `> ${film.logline}`,
    '',
    '## Upload',
    '',
    `1. Video          ${id}.mp4`,
    '2. Title          title.txt',
    '3. Description    description.txt — chapters are already in it',
    `4. Subtitles      ${id}.en.srt (English, manual)`,
    '',
    '## Check before publishing',
    '',
    '- [ ] The first chapter reads 0:00 in the description box.',
    '- [ ] Captions are set to English, not auto-generated.',
    '- [ ] Watch the last thirty seconds — the film has to end, not stop.',
    '',
    ...collected.map(([f, b]) => `  ${f.padEnd(28)} ${mb(b)}`),
  ].join('\n') + '\n');

  console.log(`${id} -> ${out}/`);
  console.log(`  ${film.shots.length} shots · ${clock(film.runtime)} · ${cues.length} cues · ${marks.length} chapters`);
  if (!collected.length) console.log(`  (no master at ${master} yet)`);
  console.log(chapters.split('\n').map((l) => `    ${l}`).join('\n'));
}
