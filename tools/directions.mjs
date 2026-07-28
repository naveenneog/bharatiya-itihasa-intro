/* Four genuinely different art directions for the Bhāratīya Itihāsa intro.
   These are not variations of one look — they disagree about what the piece should be.

   Shared constraints baked into every prompt:
     - 16:9 cinematic, deep near-black ground (#0d0b09), gold (#e8b64a) and saffron (#e07b2a)
     - negative space held on one side so the title/era type has somewhere to live
     - absolutely no lettering: image models garble Devanagari, and all type is set in HTML
*/

const NOTYPE = 'Absolutely no text, no letters, no writing, no captions, no watermark, no signature anywhere in the image.';
const FRAME = 'Cinematic 16:9 widescreen composition. Deep near-black background (#0d0b09). '
  + 'Warm antique gold (#e8b64a) and saffron (#e07b2a) as the only strong colours. '
  + 'Rich negative space on the left third of the frame, kept dark and empty, for titles.';

export const DIRECTIONS = [
  {
    id: 'v2a-living-miniature',
    name: 'Living Miniature',
    tagline: 'Five thousand years, painted.',
    pitch: 'Indian miniature painting — Mughal, Pahari and Rajput — brought to life. Flat jewelled '
      + 'pigment, real gold leaf, ornate rule borders. Unmistakably Indian, warm, storybook.',
    motion: 'Figures breathe and banners stir while the frame stays a painting — the page is alive, not filmed.',
    style: 'In the style of a museum-quality Indian miniature painting on handmade wasli paper: '
      + 'flattened perspective, jewel-like opaque watercolour pigment, burnished 24k gold leaf highlights, '
      + 'fine squirrel-hair brushwork, decorative gold rule border, subtle age-craquelure and foxing on the paper.',
    beats: [
      { id: '1-indus', era: { num: 'I', hi: 'सिंधु घाटी', en: 'INDUS', when: 'c. 2600 BCE', line: 'A seal the size of a thumb. A script no one can read.' },
        prompt: 'A humped zebu bull standing in profile before a small offering stand, rendered as an Indus Valley steatite seal reimagined as a jewelled painting. Terracotta and gold pigment.' },
      { id: '2-maurya', era: { num: 'II', hi: 'मौर्य', en: 'MAURYA', when: 'c. 250 BCE', line: 'Four lions at Sarnath — and the wheel on India’s flag.' },
        prompt: 'Emperor Ashoka, crowned and jewelled, standing before a tall polished sandstone pillar topped with four addorsed lions, deer and monks in the garden behind him.' },
      { id: '3-chola', era: { num: 'III', hi: 'चोल', en: 'CHOLA', when: '1010 CE', line: 'Thirteen storeys of granite. A capstone still argued over.' },
        prompt: 'A vast Chola granite temple tower of thirteen tapering storeys at dawn, with tiny devotees and a bronze Nataraja being carried in procession at its base.' },
      { id: '4-mughal', era: { num: 'IV', hi: 'मुग़ल', en: 'MUGHAL', when: '1632–1653', line: 'Marble on the Yamuna. A name against time.' },
        prompt: 'A white marble domed mausoleum on a riverbank at dusk, cypress avenues and a reflecting channel, a lone boat on the dark water.' },
    ],
  },
  {
    id: 'v2b-carved-stone',
    name: 'Carved in Stone',
    tagline: 'Five thousand years, cut in stone.',
    pitch: 'Macro cinematography of real Indian temple stone. Raking gold light crawling across '
      + 'carved sandstone and granite, dust suspended in the beam. Monumental, tactile, reverent.',
    motion: 'Slow dolly along a frieze, light raking across relief as if the sun were moving — carvings emerge and fall back into shadow.',
    style: 'Photorealistic macro cinematography, shot on anamorphic lenses at T2, extremely shallow depth of field, '
      + 'strong low raking golden-hour sunlight from one side carving deep chiaroscuro shadows into the relief, '
      + 'fine dust motes suspended in the light beam, weathered stone with lichen and erosion, volumetric haze.',
    beats: [
      { id: '1-indus', era: { num: 'I', hi: 'सिंधु घाटी', en: 'INDUS', when: 'c. 2600 BCE', line: 'A seal the size of a thumb. A script no one can read.' },
        prompt: 'Extreme macro of a small carved steatite seal held in shadow, a humped bull and undeciphered pictographs incised into its worn surface, one edge catching gold light.' },
      { id: '2-maurya', era: { num: 'II', hi: 'मौर्य', en: 'MAURYA', when: 'c. 250 BCE', line: 'Four lions at Sarnath — and the wheel on India’s flag.' },
        prompt: 'The mirror-polished sandstone lion capital of Ashoka, four lions back to back, lit from below by raking gold light against blackness.' },
      { id: '3-chola', era: { num: 'III', hi: 'चोल', en: 'CHOLA', when: '1010 CE', line: 'Thirteen storeys of granite. A capstone still argued over.' },
        prompt: 'Detail of a colossal granite temple tower, tier upon tier of carved deity niches receding upward, hard gold sunlight raking across a thousand small sculptures.' },
      { id: '4-hampi', era: { num: 'IV', hi: 'विजयनगर', en: 'VIJAYANAGARA', when: 'c. 1520 CE', line: 'A stone chariot whose wheels, they say, turned.' },
        prompt: 'The carved stone chariot wheel at Hampi in extreme close-up, lotus-petal spokes and worn rim, granite grain visible, gold light along the top edge.' },
    ],
  },
  {
    id: 'v2c-ink-and-light',
    name: 'Ink and Light',
    tagline: 'Five thousand years, written down.',
    pitch: 'The v1 idea made physical. Real ink blooming in water, gold leaf, palm-leaf manuscript, '
      + 'handmade paper fibre. Abstract, luxurious, and still about the act of writing history down.',
    motion: 'Ink blooms and gold dust drifts in real fluid — the drawing forms itself out of liquid rather than being stroked on.',
    style: 'Photorealistic high-speed macro photography against pure black. Indian ink and liquid gold pigment '
      + 'blooming and diffusing through clear water in delicate tendrils, suspended gold leaf flakes catching light, '
      + 'shot with a macro probe lens, razor-thin depth of field, dramatic single-source rim light, pin-sharp detail.',
    beats: [
      { id: '1-bloom', era: { num: 'I', hi: 'प्रथम चिह्न', en: 'THE FIRST MARK', when: 'c. 2600 BCE', line: 'A seal the size of a thumb. A script no one can read.' },
        prompt: 'A single drop of black ink striking still water and blooming into a tendrilled cloud, backlit gold, the very first mark being made.' },
      { id: '2-leaf', era: { num: 'II', hi: 'ताड़पत्र', en: 'THE PALM LEAF', when: 'c. 250 BCE', line: 'Edicts cut into stone, then copied onto leaf.' },
        prompt: 'An ancient palm-leaf manuscript edge in extreme macro, incised script filled with lampblack, gold dust settling into the grooves.' },
      { id: '3-gold', era: { num: 'III', hi: 'स्वर्ण', en: 'THE GOLD', when: '1010 CE', line: 'Empires gild what they need remembered.' },
        prompt: 'Gold leaf being laid onto dark handmade paper, the sheet buckling and catching light, loose flakes drifting up into blackness.' },
      { id: '4-map', era: { num: 'IV', hi: 'भूमि', en: 'THE LAND', when: '1632 CE', line: 'The ink finds a coastline.' },
        prompt: 'Ink diffusing through water forming a shape that suggests a peninsular coastline, gold particles tracing the edge, everything else black.' },
    ],
  },
  {
    id: 'v2d-faces',
    name: 'The Faces of Itihāsa',
    tagline: 'Five thousand years, made by hand.',
    pitch: 'History as people, not monuments. Cinematic chiaroscuro portraits of the hands and faces '
      + 'that actually made these things. Warm, human, and the one direction with real emotion in it.',
    motion: 'The portrait holds your eye, then breathes — a blink, a breath, firelight shifting. Almost a still, which is what makes it land.',
    style: 'Photorealistic cinematic portrait, Rembrandt chiaroscuro lighting from a single warm firelit source, '
      + 'shot on 85mm at T1.4, extremely shallow depth of field, deep black background, skin texture and sweat and dust '
      + 'rendered in fine detail, film grain, muted palette of gold, saffron and deep shadow.',
    beats: [
      { id: '1-potter', era: { num: 'I', hi: 'कुम्भकार', en: 'THE POTTER', when: 'c. 2600 BCE', line: 'Before the kings — the hands.' },
        prompt: 'The weathered hands and downturned face of a Harappan potter turning a wet clay vessel on a stone wheel, lit by a single oil lamp.' },
      { id: '2-mason', era: { num: 'II', hi: 'शिल्पी', en: 'THE MASON', when: 'c. 250 BCE', line: 'Four lions at Sarnath. One man’s chisel.' },
        prompt: 'A Mauryan stone carver, dust in his beard and eyelashes, pausing mid-strike with mallet and chisel against polished sandstone.' },
      { id: '3-bronze', era: { num: 'III', hi: 'स्थपति', en: 'THE CASTER', when: '1010 CE', line: 'He pours the god, then breaks the mould.' },
        prompt: 'A Chola bronze caster in the red glow of a crucible, molten metal light on his face, a wax figure of a dancing deity beside him.' },
      { id: '4-inlay', era: { num: 'IV', hi: 'पच्चीकार', en: 'THE INLAYER', when: '1632–1653', line: 'Marble on the Yamuna. Twenty thousand pairs of hands.' },
        prompt: 'A Mughal pietra dura craftsman setting a sliver of carnelian into white marble with tweezers, magnified by candlelight, hands steady and old.' },
    ],
  },
];

export const buildPrompt = (dir, beat) => `${beat.prompt}\n\n${dir.style}\n\n${FRAME}\n\n${NOTYPE}`;

/* ── v3: Ink and Light, extended ──────────────────────────────────────────────

   The chosen direction (v2c) taken from four abstract beats to a full procession
   of twelve empires. The visual language does not change: everything is still
   macro ink and liquid gold in black water. What changes is that each beat now
   carries one empire's defining object, submerged in that medium — pure abstraction
   cannot tell Gupta from Chola, and a roll-call of empires has to be legible.

   Beats accelerate monotonically, 5.6s down to 3.4s. That was the single thing v1
   was tuned around and the one lesson worth carrying over: five thousand years
   should arrive faster than you can hold it. The copy shortens in step so the
   reading load per second stays flat, and the acceleration then breaks on the
   chakra, which holds. The release is the point.

   Dates are the conventional scholarly ranges. Empires overlap — the Sultanate
   and Vijayanagara are contemporaries — so the order is by start date, not by
   any claim that one replaced the other.
*/

const INK_STYLE = 'Photorealistic high-speed macro photography against pure black. Indian ink and liquid gold pigment '
  + 'blooming and diffusing through clear water in delicate tendrils, suspended gold leaf flakes catching light, '
  + 'shot with a macro probe lens, razor-thin depth of field, dramatic single-source rim light, pin-sharp detail.';

export const EMPIRES = {
  id: 'v3-empires-ink',
  name: 'Ink and Light — the Empires',
  tagline: 'Five thousand years, written down.',
  pitch: 'The chosen Ink and Light language extended into a full procession of twelve empires. '
    + 'Each age arrives as its defining object, surfacing out of black water in ink and gold, '
    + 'and each arrives faster than the last.',
  motion: 'The object surfaces out of the ink rather than being revealed by a cut — fluid, unhurried, '
    + 'and always still settling when the next age takes over.',
  style: INK_STYLE,
  beats: [
    /* The opening. Two beats before the procession, slower than any empire, so the
       acceleration runs unbroken from 6.4s down to 3.4s across the whole piece.
       They carry no numeral and no date: the numbering is reserved for empires, and
       neither of these is one. The first names the form itself — itihāsa is literally
       iti-ha-āsa, "so indeed it was" — and the second establishes the ground the
       empires will be fought over, before any of them exist. */
    {
      id: '00-itihasa', dur: 6.4,
      era: { num: '', hi: 'इतिहास', en: 'ITIHĀSA', when: '',
        line: 'iti ha āsa — “so indeed it was.”' },
      prompt: 'A single drop of black ink falling into perfectly still clear water and blooming outward '
        + 'in one slow expanding tendril, a few flakes of gold leaf suspended and turning in the current, '
        + 'everything else pure black stillness.',
    },
    {
      id: '00-bharatavarsha', dur: 6.0,
      era: { num: '', hi: 'भारतवर्ष', en: 'BHĀRATAVARSHA', when: '',
        line: 'A peninsula, three seas, and a wall of mountains to the north.' },
      /* The only beat that is a landscape rather than a single object, and sora
         answered the direction's "surfacing out of the ink" by growing a field of
         repeating scallops across the terrain. It needs to be told to hold still. */
      motion: 'The rock, the ridgeline and the terrain are completely solid and do not move, '
        + 'deform or change shape at all. Only the liquid gold moves, creeping slowly downhill. '
        + 'No new shapes form, no repeating pattern or texture appears, nothing boils or churns. '
        + 'The camera is locked off and drifts only imperceptibly.',
      prompt: 'A heavy horizontal range of jagged mountain peaks drawn in thick black ink across the top, '
        + 'liquid gold light breaking behind the ridgeline, gold pigment pooling and running southward beneath it '
        + 'into black water like rivers reaching a coast.',
    },
    {
      id: '01-indus', dur: 5.6,
      era: { num: 'I', hi: 'सिंधु', en: 'INDUS', when: 'c. 2600 – 1900 BCE',
        line: 'A seal the size of a thumb. A script no one can read.' },
      prompt: 'A small carved steatite seal bearing a humped bull, half-submerged in black water, '
        + 'black ink tendrils curling up out of its incised pictographs, gold dust settling into the carved grooves.',
    },
    {
      id: '02-vedic', dur: 5.31,
      era: { num: 'II', hi: 'वैदिक', en: 'VEDIC', when: 'c. 1500 – 500 BCE',
        line: 'Hymns carried in memory for centuries before anyone wrote them down.' },
      prompt: 'Liquid gold igniting beneath black water into a tall column of fire-shaped tendrils, '
        + 'sparks of gold leaf rising and dissolving, the silhouette of a sacrificial flame forming out of ink.',
    },
    {
      id: '03-maurya', dur: 5.03,
      era: { num: 'III', hi: 'मौर्य', en: 'MAURYA', when: '322 – 185 BCE',
        line: 'After Kalinga, an emperor puts down the sword.' },
      prompt: 'The four-lion polished sandstone capital of Ashoka rising out of black water, '
        + 'ink sheeting off the mirror-polished stone, a spoked wheel of gold light forming at its base.',
    },
    {
      id: '04-kushan', dur: 4.76,
      era: { num: 'IV', hi: 'कुषाण', en: 'KUSHAN', when: 'c. 30 – 375 CE',
        line: 'Silk, gold, and the Buddha given a human face.' },
      prompt: 'An ancient struck gold coin sinking slowly through black water, its worn relief catching '
        + 'a single beam of light, trailing a wake of ink and drifting gold flake behind it.',
    },
    {
      id: '05-gupta', dur: 4.52,
      era: { num: 'V', hi: 'गुप्त', en: 'GUPTA', when: '320 – 550 CE',
        line: 'Aryabhata measures the year. An iron pillar refuses to rust.' },
      prompt: 'A gold lotus opening under black water, black ink threading between its petals, '
        + 'a tall dark iron column standing unrusted in the blackness behind it.',
    },
    {
      id: '06-chola', dur: 4.29,
      era: { num: 'VI', hi: 'चोल', en: 'CHOLA', when: '848 – 1279 CE',
        line: 'Bronze gods, and a navy that crossed the Bay of Bengal.' },
      prompt: 'A Chola bronze dancing deity inside a ring of flame, submerged in black water, '
        + 'molten gold light running along the bronze, ink swirling around the raised foot.',
    },
    {
      id: '07-sultanate', dur: 4.07,
      era: { num: 'VII', hi: 'दिल्ली सल्तनत', en: 'DELHI SULTANATE', when: '1206 – 1526 CE',
        line: 'Five dynasties in three hundred years. The Qutb still stands.' },
      prompt: 'One single tall tapering red sandstone victory tower alone against black, seen whole from base to tip, '
        + 'its ribbed fluted shaft ringed by carved horizontal balconies and bands of inscription, '
        + 'black ink sheeting down the ribs, gold leaf catching the ornamental courses. '
        + 'A single isolated tower, not a group of columns, entirely surrounded by empty darkness.',
    },
    {
      id: '08-vijayanagara', dur: 3.88,
      era: { num: 'VIII', hi: 'विजयनगर', en: 'VIJAYANAGARA', when: '1336 – 1646 CE',
        line: 'A stone chariot whose wheels, they say, turned.' },
      prompt: 'The carved granite chariot wheel of Hampi standing in the right half of the frame, half-submerged in black water, '
        + 'lotus-petal spokes shedding black ink, gold dust caught in the worn stone grain. '
        + 'The whole left half of the frame is empty black water and nothing else.',
    },
    {
      id: '09-mughal', dur: 3.71,
      era: { num: 'IX', hi: 'मुग़ल', en: 'MUGHAL', when: '1526 – 1857 CE',
        line: 'Marble on the Yamuna. A name against time.' },
      prompt: 'White marble inlaid with carnelian and lapis flowers under black water, ink pooling in the '
        + 'incised inlay lines, a great dome silhouette dissolving into gold mist behind it.',
    },
    {
      id: '10-maratha', dur: 3.57,
      era: { num: 'X', hi: 'मराठा', en: 'MARATHA', when: '1674 – 1818 CE',
        line: 'Hill forts, monsoon, an empire that would not sit still.' },
      prompt: 'A black basalt hill fort on a steep crag against black sky, its rampart wall and arched gateway '
        + 'seen whole in silhouette, torrential monsoon rain streaming off the wet stone as running black ink, '
        + 'a thin hard line of gold light along the battlements. Wide shot of the whole fortress on its hill.',
    },
    {
      id: '11-sikh', dur: 3.46,
      era: { num: 'XI', hi: 'सिख साम्राज्य', en: 'SIKH EMPIRE', when: '1799 – 1849 CE',
        line: 'A kingdom of five rivers, gilded and brief.' },
      prompt: 'A gilded domed sanctuary mirrored in perfectly still black water, gold leaf dissolving off it '
        + 'in slow tendrils, a polished double-edged steel emblem catching the light.',
    },
    {
      id: '12-republic', dur: 3.4,
      era: { num: 'XII', hi: 'गणराज्य', en: 'REPUBLIC', when: '1947 —',
        line: 'The fifteenth of August. The wheel turns again.' },
      prompt: 'A twenty-four spoked wheel of pure gold forming out of ink and light against black water, '
        + 'saffron and deep green ink bleeding slowly inward from either edge of the frame.',
    },
  ],
};

DIRECTIONS.push(EMPIRES);

