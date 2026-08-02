/* Nothing generated is thrown away.

   Every still, take, frame and contact sheet in this project costs either money or a long wait:
   a Sora take is about a minute, a master render is forty, and an era's beats are half an hour
   before a single episode can be cut. Tools were deleting that work as a matter of hygiene —
   scratch directories cleared on startup so a rerun could not read stale frames, temporary
   folders removed after encoding, probe output discarded once it had been printed. Each deletion
   was locally reasonable and collectively meant a judgement could never be revisited: the frame
   that showed the bug was gone by the time anyone asked about it.

   So: archive instead of delete, and never write twice to the same place.

     stash(dir, label)   move something out of the way rather than removing it
     runDir(label)       an output directory stamped with its run, so nothing is overwritten

   Set ITIHASA_ARTIFACTS to move the archive off the working disk.
*/
import { mkdir, rename, cp, rm, readdir } from 'node:fs/promises';
import path from 'node:path';

export const ARTIFACTS = process.env.ITIHASA_ARTIFACTS || 'artifacts';

/** A sortable stamp, local time, safe on Windows paths. */
export const stamp = (d = new Date()) => [
  d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0'),
].join('') + '-' + [
  String(d.getHours()).padStart(2, '0'), String(d.getMinutes()).padStart(2, '0'),
  String(d.getSeconds()).padStart(2, '0'),
].join('');

/** Where a run should write, so two runs of the same tool never collide. */
export function runDir(label, root = ARTIFACTS) {
  return path.join(root, label, stamp());
}

/* Move `dir` into the archive. Falls back to copy-then-remove when the archive is on another
   volume, because rename cannot cross one and a failed rename here would otherwise leave the
   caller believing the directory had been cleared. Returns the new location, or null if there
   was nothing there. */
export async function stash(dir, label) {
  const entries = await readdir(dir).catch(() => null);
  if (!entries || !entries.length) return null;
  const to = runDir(label);
  await mkdir(path.dirname(to), { recursive: true });
  try {
    await rename(dir, to);
  } catch {
    await cp(dir, to, { recursive: true });
    await rm(dir, { recursive: true, force: true });
  }
  return to;
}

/** Archive whatever is at `dir`, then hand back an empty one at the same path. */
export async function recycle(dir, label) {
  const kept = await stash(dir, label);
  await mkdir(dir, { recursive: true });
  return kept;
}
