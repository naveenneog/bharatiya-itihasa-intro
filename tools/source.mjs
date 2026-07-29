/* Where a title sequence comes from.

   There are two: the hand-authored art directions in `versions/` (v2a…v7, defined in
   directions.mjs) and the seeded eras in `eras/` (one folder per series, defined by data).
   They produce the same shape — id, name, tagline, beats — so everything downstream can
   stay ignorant of which one it was handed.

   That ignorance is the point. `build-version.mjs` and `render-master.mjs` are the only
   two places that know how a sequence is assembled and rendered; if eras had been given
   their own copies of either, nineteen eras would drift away from the six directions the
   first time one of the four files was edited.

     node tools/build-version.mjs v7-gupta --variant kingdom
     node tools/build-version.mjs --era chola --variant kingdom
*/
import { DIRECTIONS } from './directions.mjs';
import { loadEra, listEras } from './eras.mjs';

/** Strip flags and their values, leaving the positional arguments. */
export function positional(argv, valued = []) {
  const skip = new Set();
  argv.forEach((a, i) => {
    if (!a.startsWith('--')) return;
    skip.add(i);
    if (valued.includes(a.slice(2))) skip.add(i + 1);
  });
  return argv.filter((_, i) => !skip.has(i));
}

/**
 * Resolve every sequence the arguments name.
 *
 * `--era X` / `--era all` selects from `eras/`; anything else is matched against the
 * art-direction ids as before. Returns `{ root, dir }` pairs, where `dir` is beat-shaped
 * either way.
 */
export async function resolveSources(argv, { valued = [] } = {}) {
  const i = argv.indexOf('--era');
  if (i >= 0) {
    const arg = argv[i + 1];
    const ids = !arg || arg === 'all' || arg.startsWith('--') ? await listEras() : arg.split(',');
    const out = [];
    for (const id of ids) out.push({ root: 'eras', dir: await loadEra(id.trim()) });
    return out;
  }
  const filter = positional(argv, valued);
  const dirs = filter.length
    ? DIRECTIONS.filter((d) => filter.some((f) => d.id.includes(f)))
    : DIRECTIONS;
  return dirs.map((dir) => ({ root: 'versions', dir }));
}

/** One sequence, for the tools that only ever act on a single one. */
export async function resolveSource(argv, opts) {
  const all = await resolveSources(argv, opts);
  if (all.length !== 1) {
    console.error(all.length
      ? `names ${all.length} sequences; this command takes one`
      : `usage: <version-id> | --era <id>\nversions: ${DIRECTIONS.map((d) => d.id).join(', ')}\neras: ${(await listEras()).join(', ')}`);
    process.exit(1);
  }
  return all[0];
}
