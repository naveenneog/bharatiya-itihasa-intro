/* Eras — one folder per series, all speaking the same visual language.

   Layout:

     eras/<id>/era.json        the identity: name, tagline, beats, era copy
     eras/<id>/stills/         generated frames, never overwritten (-r1, -r2, ...)
     eras/<id>/clips/          generated video, never overwritten
     eras/<id>/picks.json      which revision of each beat was chosen, and why
     eras/<id>/facts.md        the accuracy record for the on-screen copy
     eras/<id>/build-NAME/     assembled pages per variant

   `era.json` is **data, not code**. That is the whole point: nineteen eras can be seeded,
   edited and generated in parallel without any of them being able to redefine the lighting,
   the framing or the timing curve, because none of them contains those things. The shared
   language lives in tools/ink.mjs and is imported, not copied.

   Timing is derived too. An era states how many beats it has and in what order; the
   accelerating curve is computed by `beatDurations`, so an era with nine beats and one with
   twelve get the same *shape* rather than two different rhythms.

     import { listEras, loadEra, saveEra } from './eras.mjs';
*/
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { beatDurations, roman, buildPrompt, INK_AND_LIGHT, RIGHT } from './ink.mjs';

export const ROOT = 'eras';

/** Every era folder that has an era.json. */
export async function listEras() {
  const dirs = await readdir(ROOT).catch(() => []);
  const out = [];
  for (const d of dirs) {
    if (d.startsWith('.') || d.startsWith('_')) continue;
    const f = path.join(ROOT, d, 'era.json');
    if (await stat(f).then(() => true, () => false)) out.push(d);
  }
  return out.sort();
}

/**
 * Load an era and resolve everything derived.
 *
 * The returned beats carry their duration, their numeral and their finished prompt, so a
 * caller never has to know how any of those are produced — which is what stops a second
 * caller from producing them differently.
 */
export async function loadEra(id) {
  const raw = JSON.parse(await readFile(path.join(ROOT, id, 'era.json'), 'utf8'));
  const beats = raw.beats || [];
  const durs = beatDurations(beats.length);
  return {
    ...raw,
    id: raw.id || id,
    dir: path.join(ROOT, id),
    style: INK_AND_LIGHT,
    beats: beats.map((b, i) => ({
      ...b,
      dur: durs[i],
      era: { ...b.era, num: b.era?.num || roman(i + 1) },
      fullPrompt: buildPrompt(b, { style: INK_AND_LIGHT, placement: RIGHT }),
    })),
  };
}

export async function saveEra(id, era) {
  await mkdir(path.join(ROOT, id), { recursive: true });
  /* Only the identity is persisted. Durations, numerals and prompts are derived on load,
     so a stale copy of them can never be committed and then quietly disagree with the
     shared language. */
  const { dir, style, ...keep } = era;
  keep.beats = (era.beats || []).map(({ dur, fullPrompt, era: e, ...b }) => ({
    ...b,
    era: e ? { hi: e.hi, en: e.en, when: e.when, line: e.line } : undefined,
  }));
  await writeFile(path.join(ROOT, id, 'era.json'), `${JSON.stringify(keep, null, 2)}\n`);
  return path.join(ROOT, id, 'era.json');
}

/** What is on disk for an era: how many beats have stills, clips, picks. */
export async function eraStatus(id) {
  const era = await loadEra(id);
  const ls = async (sub) => (await readdir(path.join(ROOT, id, sub)).catch(() => []));
  const stills = await ls('stills');
  const clips = await ls('clips');
  let picks = {};
  try { picks = JSON.parse(await readFile(path.join(ROOT, id, 'picks.json'), 'utf8')); } catch { /* none */ }

  const per = era.beats.map((b) => {
    const s = stills.filter((f) => new RegExp(`^${b.id}-r\\d+\\.png$`).test(f)).length;
    const c = clips.filter((f) => new RegExp(`^${b.id}-r\\d+\\.mp4$`).test(f)).length;
    return { id: b.id, stills: s, clips: c, picked: picks[b.id] ?? null };
  });
  return {
    id,
    name: era.name,
    beats: era.beats.length,
    withStills: per.filter((p) => p.stills > 0).length,
    withTwo: per.filter((p) => p.stills >= 2).length,
    withClips: per.filter((p) => p.clips > 0).length,
    picked: per.filter((p) => p.picked != null).length,
    seconds: era.beats.reduce((a, b) => a + b.dur, 0),
    per,
  };
}

/* ── validation ───────────────────────────────────────────────────────────
   Run before spending money on generation. Every one of these has already cost a real
   mistake somewhere in this project. */
export function validateEra(era) {
  const problems = [];
  const warn = [];

  if (!era.id || !/^[a-z0-9-]+$/.test(era.id)) problems.push('id must be lowercase kebab-case');
  if (!era.name) problems.push('missing name');
  if (!era.tagline) warn.push('no tagline — the wordmark card will be bare');

  const beats = era.beats || [];
  if (beats.length < 6) problems.push(`only ${beats.length} beats — a sequence needs at least 6 to build a rhythm`);
  if (beats.length > 14) warn.push(`${beats.length} beats will run long; 8-12 is the range that works`);

  const ids = new Set();
  for (const [i, b] of beats.entries()) {
    const where = `beat ${i + 1} (${b.id || '?'})`;
    if (!b.id || !/^\d{2}-[a-z0-9-]+$/.test(b.id)) problems.push(`${where}: id must look like 03-bhramati`);
    if (ids.has(b.id)) problems.push(`${where}: duplicate id`);
    ids.add(b.id);
    if (!b.prompt || b.prompt.length < 60) problems.push(`${where}: prompt is too thin to produce a specific image`);
    if (!b.era?.en) problems.push(`${where}: missing the English card line`);
    if (!b.era?.when) warn.push(`${where}: no date on the card`);
    if (!b.era?.line) warn.push(`${where}: no descriptive line`);

    /* The image model is told separately to render no text. A prompt that *asks* for an
       inscription usually gets gibberish glyphs, which is worse than nothing. */
    if (/\binscription\b|\bwriting\b|\bletters\b|\btext\b|\bscript\b/i.test(b.prompt)
      && !/incised|unreadable|indistinct|worn/i.test(b.prompt)) {
      warn.push(`${where}: asks for writing without saying it is worn or indistinct — expect gibberish glyphs`);
    }
    /* The lamp and the frame come from ink.mjs. An era that restates them is the first
       step of the drift this whole structure exists to prevent.

       Narrowly scoped on purpose: this must catch a beat that sets up the *scheme*
       ("a single hard rim light from the upper right", "shot on a macro probe at f/2"),
       and must NOT catch a beat that says which edge of its object catches the light —
       that is composition, and the approved Gupta iron-pillar beat depends on it. */
    if (/\bsingle\b[^.]{0,30}\brim light\b|no fill light|macro probe|f\/2\b|razor-thin|pure black background|\b16:9\b|#0d0b09/i.test(b.prompt)) {
      problems.push(`${where}: restates the shared style — that belongs in tools/ink.mjs only`);
    }
  }
  return { ok: problems.length === 0, problems, warn };
}

/** A blank era, ready to be filled in. */
export function emptyEra(id, name) {
  return { id, name, tagline: '', pitch: '', motion: '', beats: [] };
}
