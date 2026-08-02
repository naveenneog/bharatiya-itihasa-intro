/* The Ink and Light visual language — the single copy.

   Nineteen eras will be generated, often several at once, over many sessions. The one
   thing that must not happen is drift: two eras lit differently, framed differently, or
   composed differently, so the channel stops looking like one channel.

   Consistency here is structural rather than conventional. Every era imports these
   constants; none of them restates a lighting note or a framing rule in its own prompt.
   If the language needs to change it changes once, and every era that is regenerated
   afterwards changes with it.

   What belongs here: anything true of *every* era.
   What does not: the objects, the dates, the copy — those are the era's identity and live
   in its own `era.json`.

   Extracted verbatim from the prompts that produced v2c, v3/v5 and v7, which the user
   approved. Do not "improve" the wording casually — these strings are the reason the
   frames look the way they do.
*/

/** The material and the camera. */
export const INK_STYLE =
  'Photorealistic high-speed macro photography against pure black. Indian ink and liquid gold pigment '
  + 'blooming and diffusing through clear water in delicate tendrils, suspended gold leaf flakes catching light, '
  + 'shot with a macro probe lens, razor-thin depth of field, dramatic single-source rim light, pin-sharp detail.';

/** The lamp. Pinning this is what makes frames from different eras cut together. */
export const INK_LIGHT =
  'A single hard rim light from the upper right; everything it does not touch falls to '
  + 'pure black. Shot on a macro probe lens at f/2, razor-thin plane of focus, no fill light, no ambient haze.';

/** The frame. */
export const FRAME =
  'Cinematic 16:9 widescreen composition. Deep near-black background (#0d0b09). '
  + 'Rich warm gold (#e8b64a), aged ivory (#f6ecd8) and deep saffron (#e07b2a) are the only colours. '
  + 'Nothing modern, nothing western, no people unless the beat asks for one.';

/** Placement. Stated twice on purpose: subjects drift into the left third unless told. */
export const RIGHT =
  'The subject is composed in the right two-thirds of the frame. The entire left third is empty black '
  + 'water and nothing else — no object, no highlight, no tendril enters it.';

/** The frame a vertical cut needs.
 *
 * Not the 16:9 frame with different numbers: a 9:16 picture that is composed like a
 * landscape one puts its subject where the type goes. The Short sets its words across the
 * upper half, so the subject is held low and the top is left as empty water — the same
 * reservation RIGHT makes, turned ninety degrees. */
export const FRAME_TALL =
  'Vertical 9:16 portrait composition for a phone screen. Deep near-black background (#0d0b09). '
  + 'Rich warm gold (#e8b64a), aged ivory (#f6ecd8) and deep saffron (#e07b2a) are the only colours. '
  + 'Nothing modern, nothing western, no people.';

/** Where a vertical subject sits. */
export const LOWER =
  'The subject is composed in the lower two-thirds of the tall frame. The entire top third is empty '
  + 'black water and nothing else — no object, no highlight, no tendril enters it.';

/** Full frame, for a shot that carries no type. The title sequence always reserves the left
    third for its cards; a film only does so on the shots that actually have a card, and
    reserving it everywhere would waste a third of every frame in the piece. */
export const FULL =
  'The subject is composed for the full frame, centred or slightly off-centre, filling it with '
  + 'confidence. There is no reserved empty margin.';

/** Very close. The single most under-used framing in this language: the material is ink and
    gold in water, and it rewards being looked at from four inches away. */
export const MACRO =
  'Extreme close framing — the subject fills the frame edge to edge, closer than feels comfortable, '
  + 'so its surface and texture are the whole picture.';

/** Type is added by the page, never by the image model. */
export const NOTYPE =
  'Absolutely no text, no letters, no writing, no numbers, no captions, no watermark, no signature anywhere in the image.';

/** The full style string an era uses. */
export const INK_AND_LIGHT = `${INK_STYLE} ${INK_LIGHT}`;

/**
 * Assemble the prompt for one beat.
 *
 * Order matters: the subject first, so the model spends its attention there, then the
 * material, then the lamp, then the frame, then the prohibitions. Putting the style first
 * produces beautiful ink photographs that happen to contain the wrong object.
 */
export function buildPrompt(beat, { style = INK_AND_LIGHT, placement = RIGHT } = {}) {
  const subject = String(beat.prompt || '').replace(/\s+/g, ' ').trim();
  return `${subject} ${placement}\n\n${style}\n\n${FRAME}\n\n${NOTYPE}`;
}

/* ── timing ───────────────────────────────────────────────────────────────
   Beats accelerate. The viewer is taught a rhythm that tightens, which is what makes a
   procession feel like it is going somewhere rather than listing things.

   v3/v5 ran 6.4 -> 3.4s across fourteen beats; v7 ran 6.0 -> 3.4 across ten. The curve is
   generated rather than typed per beat so an era with a different number of beats gets the
   same *shape* instead of a different one. */
export const FIRST_BEAT = 6.0;
export const LAST_BEAT = 3.4;

/** Durations for `n` beats, accelerating on a gentle convex curve. */
export function beatDurations(n, { first = FIRST_BEAT, last = LAST_BEAT } = {}) {
  if (n <= 1) return [first];
  return Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1);
    // convex: hold the opening a little longer, then tighten harder toward the end
    return +(first + (last - first) * Math.pow(u, 1.25)).toFixed(2);
  });
}

/** Roman numerals for the era cards. Beats are numbered I..N on screen. */
export function roman(n) {
  const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  let v = n;
  for (const [d, s] of map) while (v >= d) { out += s; v -= d; }
  return out;
}
