/* Does this shot description ask for a human being?

   The house style is objects surfacing out of black water — never a person. Sora renders people
   badly here and moderation refuses reference images of them, so a shot plan that names one is
   caught before it costs a generation.

   The rule lives here because it is needed in two places — the Shorts shot plan and the episode's
   closing shot — and when it lived in both it drifted, then failed differently in each. Every
   loosening below was paid for by a lost story:

     - "head" is not a person. A mace head, a spear head, an arrow head, the head of a pillar.
       "A heavy iron mace with a chipped head" was rejected and cost `shravanabelagola`.
     - "face", "figure", "bust" and "torso" are not people when the thing is struck, carved, cast
       or cut from stone — and on this channel they very often are. The Western Satraps' coinage
       episode lost two shots to "a standing figure in shallow relief" and "one face catching brief
       flashes", which is a coin's face and the image struck on it: the entire subject of the story.
     - Stone counts as iconography. `the_didarganj_yakshi_s_polished_secret` is about a famous
       polished sandstone statue, and "a single smooth stone torso… never revealing its missing
       face" was rejected as a person. The story is the sculpture.
     - "silhouette" is the outline of a thing, and the thing is usually an object. It cost
       `the_four_lions_of_sarnath` a build: three lion heads on a circular base locking into "a
       single, balanced, emblematic silhouette" — the Ashokan capital, and now the national
       emblem. It is treated like face and figure: fine when the sentence says the thing is made.

   Hands, fingers, crowds stay banned outright — there is no reading of those that is not a
   person. A checker that flags more than that stops being a check and becomes an obstacle.

   The iconography words match as prefixes, because `\bcoin\b` does not match "coins" and that is
   how most of them appear. `thirty_gods_on_kushan_coins` — an episode about coins — had three
   shots rejected in three attempts, every one of them containing the word "coins", while "coin"
   sat in the allowlist unable to see them. The person list had spelled out `hand|hands`, so the
   plural problem was known on one side of the test and missed on the other. */

const ICONOGRAPHY = /\brelief|\bcarv|\bstruck\b|\bstamped\b|\bcast\b|\bcoin|\bmask|\bstatue|\bsculpt|\bidol|\bmedallion|\bseal|\bbronze\b|\bterracotta\b|\bstone\b|\bsandstone\b|\bgranite\b|\bmarble\b|\bschist\b|\balabaster\b|\bchiselled\b|\bchiseled\b|\bpolished\b|\bemblem|\bdinar|\beffigy|\beffigies/i;

const PERSON = /\bhand\b|\bhands\b|\bfinger|\bperson\b|\bpeople\b|\bcrowd\b|\bman\b|\bwoman\b|\bchild\b/i;

/* Words that name a human form but just as readily name its image in stone or metal. */
const DEPICTION = /\bface\b|\bfigure\b|\bbust\b|\btorso\b|\bsilhouette\b/i;

/** A problem string naming what to do instead, or null when the subject is fine. */
export function flagPerson(subject) {
  const s = String(subject || '');
  const depiction = DEPICTION.test(s);
  if (!PERSON.test(s) && !(depiction && !ICONOGRAPHY.test(s))) return null;
  /* The message is an instruction, not a verdict: a validator that only says "no" gets the same
     answer back on the retry. */
  return 'contains a person — describe the object, not who is in it'
    + (depiction
      ? '; a carved, struck or stone face, figure, bust or torso is fine if the sentence says so'
      : '')
    + `: "${s}"`;
}
