/* A film — a shot list, not a panel list.

   The episodes in `episodes/` are built the only way their source data allows: one narration
   line, one picture, twelve to fourteen seconds, repeat. Everything wrong with them is
   downstream of that. Pacing cannot be authored because the durations *are* the text-to-speech
   output lengths. There is no such thing as a two-second beat, or a held silence, or three
   images inside one sentence.

   A film inverts it. The shot is the unit, the shot list is written first, and the narration is
   synthesised *per shot* afterwards — so a shot can be 1.4 seconds of silence on a single image,
   and the piece can accelerate into a claim the way the title sequences do.

     films/<id>/film.json     the shot list — the whole authored decision
     films/<id>/audio/        one mp3 per speaking shot
     films/<id>/stills/       one plate per shot, never overwritten
     films/<id>/clips/        one Sora take per shot, never overwritten
     films/<id>/build/        the assembled page

   Durations are derived, never typed:

     a speaking shot   = its narration length + the pause the author asked for after it
     a silent shot     = exactly the hold the author asked for

   That is the whole timing model, and it is why silence is a first-class thing here. In the
   episode pipeline a gap between lines is an accident of the audio; here it is a decision.
*/
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { INK_STYLE, INK_LIGHT, FRAME, NOTYPE, RIGHT, FULL, MACRO } from './ink.mjs';

export const ROOT = 'films';

/** Tail after a spoken line before the next shot begins. Authored per shot, defaulted here. */
export const DEFAULT_TAIL = 0.28;

export async function listFilms() {
  const dirs = await readdir(ROOT).catch(() => []);
  const out = [];
  for (const d of dirs) {
    if (d.startsWith('.') || d.startsWith('_')) continue;
    if (await stat(path.join(ROOT, d, 'film.json')).then(() => true, () => false)) out.push(d);
  }
  return out.sort();
}

const PLACEMENT = { right: RIGHT, full: FULL, macro: MACRO };

/**
 * Load a film and resolve everything derived: prompts, durations, start times.
 *
 * `dur` is only final once the narration exists — `film-voice.mjs` writes each spoken shot's
 * measured length back into the shot as `said`. Before that the author's `hold` stands in, so
 * the timeline is inspectable before a rupee is spent.
 */
export async function loadFilm(id) {
  const raw = JSON.parse(await readFile(path.join(ROOT, id, 'film.json'), 'utf8'));
  let t = 0;
  const shots = (raw.shots || []).map((s, i) => {
    const tail = s.tail ?? (s.say ? DEFAULT_TAIL : 0);
    const dur = +((s.say ? (s.said ?? s.hold ?? 3.2) : (s.hold ?? 1.6)) + tail).toFixed(3);
    const row = {
      ...s,
      n: i,
      tail,
      dur,
      start: +t.toFixed(3),
      fullPrompt: buildShot(s),
    };
    t += dur;
    return row;
  });
  return { ...raw, id: raw.id || id, dir: path.join(ROOT, id), shots, runtime: +t.toFixed(3) };
}

export async function saveFilm(id, film) {
  await mkdir(path.join(ROOT, id), { recursive: true });
  const { dir, shots, runtime, ...keep } = film;
  /* Only what was authored is written back. `said` is a measurement and stays, because
     re-measuring it costs a synthesis; everything else is recomputed on load. */
  keep.shots = (shots || film.shots || []).map(({ n, dur, start, fullPrompt, ...s }) => s);
  await writeFile(path.join(ROOT, id, 'film.json'), `${JSON.stringify(keep, null, 2)}\n`);
}

/* The prompt for one shot.

   Same order as the title sequences — subject, material, lamp, frame, prohibitions — because
   putting the style first produces beautiful ink photographs of the wrong object. The only
   addition is placement, which a film varies per shot: a card shot has to leave its left third
   empty, and a shot with no card should use the whole frame. */
export function buildShot(s) {
  const subject = String(s.prompt || '').replace(/\s+/g, ' ').trim();
  const place = PLACEMENT[s.place] || (s.type ? RIGHT : FULL);
  return `${subject} ${place}\n\n${INK_STYLE} ${INK_LIGHT}\n\n${FRAME}\n\n${NOTYPE}`;
}

/* ── validation ───────────────────────────────────────────────────────────
   Run before generating. A film is far more expensive to regenerate than an era: one Sora
   take per shot, seventy-odd shots. */
export function validateFilm(film) {
  const problems = [];
  const warn = [];
  const shots = film.shots || [];

  if (!film.id || !/^[a-z0-9-]+$/.test(film.id)) problems.push('id must be lowercase kebab-case');
  if (!film.title) problems.push('missing title');
  if (shots.length < 20) problems.push(`only ${shots.length} shots — this is a film, not a montage`);

  const ids = new Set();
  let spoken = 0;
  let silent = 0;
  for (const [i, s] of shots.entries()) {
    const where = `shot ${i + 1} (${s.id || '?'})`;
    if (!s.id || !/^\d{2,3}-[a-z0-9-]+$/.test(s.id)) problems.push(`${where}: id must look like 014-bakhshali`);
    if (ids.has(s.id)) problems.push(`${where}: duplicate id`);
    ids.add(s.id);
    if (!s.prompt || s.prompt.length < 40) problems.push(`${where}: prompt is too thin to produce a specific image`);
    if (s.say) spoken++; else silent++;

    /* The lamp and the material come from ink.mjs. A shot that restates them is the first step
       of the drift the shared language exists to prevent. */
    if (/\bsingle\b[^.]{0,30}\brim light\b|no fill light|macro probe|f\/2\b|razor-thin|pure black background|#0d0b09/i.test(s.prompt)) {
      problems.push(`${where}: restates the shared style — that belongs in tools/ink.mjs only`);
    }
    if (/\binscription\b|\bwriting\b|\bletters\b|\bnumerals?\b|\btext\b/i.test(s.prompt)
      && !/incised|unreadable|indistinct|worn|eroded/i.test(s.prompt)) {
      warn.push(`${where}: asks for writing without saying it is worn — expect gibberish glyphs`);
    }
  }

  /* Timing is the dominant criterion, so the shape of the timing is checked, not just its
     legality. A film with no silence in it has no beats; it has a voiceover. */
  if (silent < shots.length * 0.12) {
    problems.push(`only ${silent} of ${shots.length} shots are silent — without held beats this is a `
      + 'voiceover with pictures, which is the thing this format exists to stop being');
  }
  const avg = shots.length ? shots.reduce((a, s) => a + (s.said ?? s.hold ?? 3.2), 0) / shots.length : 0;
  if (avg > 7) warn.push(`shots average ${avg.toFixed(1)}s — long enough to feel like panels again`);

  return { ok: problems.length === 0, problems, warn, spoken, silent };
}

/** What is on disk: how many shots have narration, stills, clips. */
export async function filmStatus(id) {
  const film = await loadFilm(id);
  const ls = async (sub) => (await readdir(path.join(ROOT, id, sub)).catch(() => []));
  const audio = await ls('audio');
  const stills = await ls('stills');
  const clips = await ls('clips');
  const per = film.shots.map((s) => ({
    id: s.id,
    said: !!s.said,
    audio: audio.includes(`${s.id}.mp3`),
    stills: stills.filter((f) => new RegExp(`^${s.id}-r\\d+\\.png$`).test(f)).length,
    clips: clips.filter((f) => new RegExp(`^${s.id}-r\\d+\\.mp4$`).test(f)).length,
  }));
  return {
    id,
    title: film.title,
    shots: film.shots.length,
    runtime: film.runtime,
    withAudio: per.filter((p) => p.audio).length,
    needAudio: film.shots.filter((s) => s.say).length,
    withStills: per.filter((p) => p.stills > 0).length,
    withClips: per.filter((p) => p.clips > 0).length,
    per,
  };
}
