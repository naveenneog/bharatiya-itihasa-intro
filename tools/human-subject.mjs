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
     - Materials count too. "A thin rectangular copper plate… its face patterned with dense,
       faintly ridged horizontal bands" was read as a person, because `copper` was not on the
       list and a plate has a face the way a person does.
     - So does architecture. `lokamahadevi_builds_in_two_stone_tongues` is about temple form, and
       lost three attempts to "a broken tower finial… revealing its hybrid silhouette" and "a
       tiered spire fragment… its ridged silhouette" — buildings have silhouettes far more often
       than people do.
     - A hyphen is a word boundary, so `\bhand\b` matched "hand-drum" and refused a rotating
       two-headed drum on `tenali_rama_between_poet_and_folktale`. Hand is only a person's hand
       when it stands alone: hand-drum, hand-mill and hand-axe are objects. The same story then
       lost "a child-sized reading slate" to `\bchild\b`, so the lookahead is now on the whole
       person list rather than on the one word that happened to fail: a person-word followed by
       a hyphen is a compound describing an object — child-sized, man-made, hand-drum.
     - A puppet is an object that depicts a person, which is the whole of what ICONOGRAPHY is
       for, but it was made of none of the listed materials. "A painted wooden puppet torso with
       jointed arms" was refused three times on `tenali_rama_between_poet_and_folktale` — an
       episode about folk theatre, where the puppet is the subject.
     - A signet ring has a face: the flat of its bezel. `amar_singh_i_makes_peace_with_jahangir`
       lost all three attempts to "a heavy Mughal-style signet ring ... its flat face catching
       and releasing glints" — the ring is the treaty, and the face is the part that seals it.
     - A fort is architecture. The list already carried tower, pillar, dome and spire, but no
       fortification at all, so `tarabai_outlasts_aurangzeb` — a story about hill-forts — lost
       all three attempts to "a single rugged hill-fort silhouette". `purandar_under_jai_singh`
       drew nearly the same image one story earlier and passed only because it happened to say
       "carved from pale stone". The subject was never the difference; the wording was.
     - A simile is not a person. `the_giant_book_of_heroes` lost all three attempts to "the
       bristles fanning outward like many converging hands": the shot is brushes, and the hands
       exist only in the comparison.

   Hands, fingers, crowds stay banned outright — there is no reading of those that is not a
   person. A checker that flags more than that stops being a check and becomes an obstacle.

   The iconography words match as prefixes, because `\bcoin\b` does not match "coins" and that is
   how most of them appear. `thirty_gods_on_kushan_coins` — an episode about coins — had three
   shots rejected in three attempts, every one of them containing the word "coins", while "coin"
   sat in the allowlist unable to see them. The person list had spelled out `hand|hands`, so the
   plural problem was known on one side of the test and missed on the other. */

const ICONOGRAPHY = /\brelief|\bcarv|\bstruck\b|\bstamped\b|\bcast\b|\bcoin|\bmask|\bstatue|\bsculpt|\bidol|\bmedallion|\bseal|\bbronze\b|\bterracotta\b|\bstone\b|\bsandstone\b|\bgranite\b|\bmarble\b|\bschist\b|\balabaster\b|\bchiselled\b|\bchiseled\b|\bpolished\b|\bemblem|\bdinar|\beffigy|\beffigies|\bcopper|\bbrass\b|\biron\b|\bclay\b|\bivory\b|\bplate|\btablet|\bplaque|\bfinial|\bspire|\btower|\bpillar|\bcapital\b|\bshrine|\btemple|\bcornice|\bplinth|\blintel|\bfragment|\bdome\b|\bcolumn|\bvault\b|\bfrieze|\bfort\b|\bforts\b|\bfortress|\bfortifi|\brampart|\bbastion|\bcitadel|\bbattlement|\bparapet|\bstronghold|\bmasonry\b|\bgatehouse|\bsignet|\bring\b|\brings\b|\bbezel|\bintaglio|\bcameo|\bpuppet|\bmarionette|\bdoll\b|\bwood|\blacquer|\bpainted\b/i;

/* `(?!-)` keeps a compound out: a hand-drum is an object, a hand is not, and a child-sized
   slate is a slate. */
const PERSON = /\bhands?\b(?!-)|\bfinger|\bperson\b(?!-)|\bpeople\b(?!-)|\bcrowd\b(?!-)|\bman\b(?!-)|\bwoman\b(?!-)|\bchild\b(?!-)/i;

/* Words that name a human form but just as readily name its image in stone or metal. */
const DEPICTION = /\bface\b|\bfigure\b|\bbust\b|\btorso\b|\bsilhouette\b/i;

/* A simile compares the object to a person; it does not put one in the shot. `the_giant_book_of_heroes`
   spent all three attempts on "the bristles fanning outward like many converging hands" — brushes,
   and the only hands in the sentence are the ones they are said to resemble. The clause is dropped
   before the test, so the simile's object stops counting while its subject still does: "a man like
   a mountain" keeps the man. */
const SIMILE = /\b(?:like|as if|as though|resembling|reminiscent of|recalling)\b[^.,;]*/gi;

/** A problem string naming what to do instead, or null when the subject is fine. */
export function flagPerson(subject) {
  const s = String(subject || '');
  const literal = s.replace(SIMILE, ' ');
  const depiction = DEPICTION.test(literal);
  if (!PERSON.test(literal) && !(depiction && !ICONOGRAPHY.test(literal))) return null;
  /* The message is an instruction, not a verdict: a validator that only says "no" gets the same
     answer back on the retry. */
  return 'contains a person — describe the object, not who is in it'
    + (depiction
      ? '; a carved, struck or stone face, figure, bust or torso is fine if the sentence says so'
      : '')
    + `: "${s}"`;
}
