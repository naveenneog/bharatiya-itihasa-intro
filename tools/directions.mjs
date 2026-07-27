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
