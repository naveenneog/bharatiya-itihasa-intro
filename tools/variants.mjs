/* Build variants of a version.

   A variant is a different *build* of the same generated picture: its own output
   directory, type scale, scrim and score, and optionally a subset of beats. Older
   versions therefore keep exactly what they shipped with — changing the procession
   score or the type scale cannot retune v4 — and a new treatment costs a config
   entry rather than a fork.

   Shared by build-version.mjs and render-master.mjs, because both have to agree on
   which beats are in the cut. When the list lived in one of them the other silently
   rendered a different sequence.
*/

const MOBILE_SCRIM =
  'linear-gradient(90deg,rgba(6,5,4,.97) 0%,rgba(6,5,4,.93) 28%,rgba(6,5,4,.72) 44%,rgba(6,5,4,.24) 60%,rgba(6,5,4,0) 75%)';

export const VARIANTS = {
  default: {
    out: 'build', ts: 1, tw: '38%', score: 'standard', beats: null,
    scrim: 'linear-gradient(90deg,rgba(6,5,4,.94) 0%,rgba(6,5,4,.78) 26%,rgba(6,5,4,.20) 48%,rgba(6,5,4,0) 66%)',
  },
  /* Phone-sized type. At 1.6x the longest lines ran out of the dark zone and onto
     bright gold, so the column is narrower than the desktop one, not wider — the type
     wraps sooner and stays where it can be read, and the scrim reaches further. */
  mobile: {
    out: 'build-mobile', ts: 1.6, tw: '37%', score: 'procession', beats: null,
    scrim: MOBILE_SCRIM,
  },
  /* The per-episode stinger: the opening beat, then the era the episode is actually
     about. Fifteen seconds instead of sixty-one, and it says something different for
     every episode rather than replaying the whole empire procession each time. */
  episode: {
    out: 'build-episode', ts: 1.6, tw: '37%', score: 'procession',
    beats: ['00-itihasa', '05-gupta'],
    scrim: MOBILE_SCRIM,
  },
};

export function variant(name) {
  const v = VARIANTS[name];
  if (!v) {
    console.error(`unknown variant ${name} — one of ${Object.keys(VARIANTS).join(', ')}`);
    process.exit(1);
  }
  return v;
}

/** The beats a variant actually uses, in the direction's own order. */
export function beatsFor(dir, v) {
  if (!v.beats) return dir.beats;
  return dir.beats.filter((b) => v.beats.includes(b.id));
}
