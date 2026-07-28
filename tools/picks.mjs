/* Which revision of a beat is the chosen one.

   Generators never overwrite: every run writes a new `-rN`. That keeps every take
   reviewable, but it also means "newest" and "best" are not the same thing, and by
   default the pipeline used newest. When two candidates are generated per beat so the
   stronger frame can be chosen, that default silently throws the choice away.

   `versions/<id>/picks.json` is that choice, as `{ "<beat-id>": <revision> }`. Absent
   or unlisted beats fall back to the highest revision, so this is opt-in and no
   existing version changes behaviour.
*/
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const cache = new Map();

export async function picks(root, dirId) {
  const key = `${root}/${dirId}`;
  if (cache.has(key)) return cache.get(key);
  let p = {};
  try { p = JSON.parse(await readFile(path.join(root, dirId, 'picks.json'), 'utf8')); } catch { /* none */ }
  cache.set(key, p);
  return p;
}

/** The chosen file for a beat: the picked revision if there is one, else the newest. */
export function choose(files, beatId, ext, pick) {
  const re = new RegExp(`^${beatId}-r(\\d+)\\.${ext}$`);
  const found = new Map();
  for (const f of files) {
    const g = f.match(re);
    if (g) found.set(Number(g[1]), f);
  }
  if (!found.size) return null;
  if (pick && found.has(Number(pick))) return found.get(Number(pick));
  return found.get(Math.max(...found.keys()));
}
