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
  /* A kingdom sequence's full-length build: the mobile treatment with the corrected
     procession. A separate entry rather than a change to `mobile`, because v5 was
     approved with the old score and has to keep it. */
  kingdom: {
    out: 'build-mobile', ts: 1.6, tw: '37%', score: 'procession2', beats: null,
    scrim: MOBILE_SCRIM,
  },
  /* The same idea one level down: a kingdom sequence has its own stinger, cut to the
     two beats that set up the episode in front of it. Sized against YouTube's own
     measurement rather than taste — Analytics calls the first 30 seconds the intro, so
     a ~12s cold open plus ~16s of titles puts the story back on screen before the
     number that decides whether the video gets recommended is taken. The full 45s
     sequence remains its own piece; it is not what an episode opens with. */
  stinger: {
    out: 'build-stinger', ts: 1.6, tw: '37%', score: 'procession2',
    perSource: true,
    beats: ['01-dinara', '03-bhramati'],
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

/** The beats a variant actually uses, in the sequence's own order.

    Three levels, narrowest first: an explicit `--beats a,b` for one build, then the
    sequence's own `stinger` list (an era knows which two of its beats introduce it far
    better than a global config does), then the variant's list. A cut that names a beat
    the sequence does not have is a mistake worth stopping for — a silent filter would
    quietly ship a one-beat stinger. */
export function beatsFor(dir, v, override = null) {
  const want = override || (v.perSource ? dir.stinger : null) || v.beats;
  if (!want) return dir.beats;
  const have = new Set(dir.beats.map((b) => b.id));
  const missing = want.filter((id) => !have.has(id));
  if (missing.length) {
    console.error(`${dir.id}: cut names beat(s) it does not have — ${missing.join(', ')}`);
    process.exit(1);
  }
  return dir.beats.filter((b) => want.includes(b.id));
}
