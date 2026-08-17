/* The cases the person checker has already been wrong about.

   `flagPerson` has been widened nine times, and every widening was paid for by a story that lost
   all three of its attempts to a rule refusing that story's own subject. Until now the check after
   each widening was retyped by hand, which tests the fix and nothing else — so a later widening
   could quietly undo an earlier one and nobody would know until an era failed.

   Each PASS below is a sentence that was once refused and should not be. Each FAIL is the thing
   the checker is actually for, and is here so that widening never turns into switching off.

   Run: node tools\human-subject.test.mjs */

import { flagPerson } from './human-subject.mjs';

/* Should NOT be flagged — objects, every one of which cost a story. */
const PASS = [
  ['mace head',        'A heavy iron mace with a chipped head turning slowly'],
  ['coin face',        'One struck face catching brief flashes as it turns'],
  ['relief figure',    'A standing figure in shallow relief, drifting upward'],
  ['stone torso',      'A single smooth stone torso, never revealing its missing face'],
  ['emblem silhouette','Three carved lion heads locking into a single balanced silhouette'],
  ['copper plate',     'A thin rectangular copper plate, its face patterned with ridged bands'],
  ['tower finial',     'A broken tower finial turning, revealing its hybrid silhouette'],
  ['spire fragment',   'A tiered spire fragment rising, its ridged silhouette softening'],
  ['hand-drum',        'A rotating two-headed hand-drum, its faces catching the light'],
  ['child-sized slate','A child-sized reading slate tilting out of the dark'],
  ['wooden puppet',    'A painted wooden puppet torso with jointed arms, slowly turning'],
  ['signet ring',      'A heavy Mughal signet ring, its flat face catching and releasing glints'],
  ['simile of hands',  'Bristles fanning outward like many converging hands'],
  /* The ninth widening: fortification is architecture, and architecture has silhouettes. */
  ['hill-fort',        'A single rugged hill-fort silhouette slowly splitting into two halves'],
  ['rampart',          'A jagged rampart silhouette drifting apart and rejoining'],
  ['fortress',         'A fortress gatehouse, its scarred face turning toward the light'],
  ['citadel',          'A citadel bastion silhouette settling into one unbroken ridge'],
];

/* Should BE flagged — there is no reading of these that is not a person. */
const FAIL = [
  ['bare hands',       'A pair of hands lifting a clay lamp out of the dark'],
  ['fingers',          'Fingers closing slowly around a length of rope'],
  ['a man',            'A man in a plain robe turning to face the light'],
  ['a woman',          'A woman lifting a water pot above the surface'],
  ['a crowd',          'A crowd gathering along the far bank at dusk'],
  ['a child',          'A child running along the edge of the water'],
  /* The simile clause is dropped, so the comparison stops counting — but its subject must not. */
  ['man in a simile',  'A man like a mountain, standing against the current'],
  /* A depiction word with nothing saying the thing is made stays a person. */
  ['bare silhouette',  'A silhouette turning slowly against the light'],
];

let bad = 0;
for (const [name, s] of PASS) {
  const got = flagPerson(s);
  if (got) { bad++; console.log(`  FAIL  ${name.padEnd(18)} should pass, was flagged`); }
}
for (const [name, s] of FAIL) {
  const got = flagPerson(s);
  if (!got) { bad++; console.log(`  FAIL  ${name.padEnd(18)} should be flagged, passed`); }
}

const total = PASS.length + FAIL.length;
console.log(bad
  ? `\n${bad} of ${total} wrong`
  : `\nall ${total} correct — ${PASS.length} objects allowed, ${FAIL.length} people caught`);
process.exit(bad ? 1 : 0);
