/* The story library, indexed.

   IndianHistory holds ~193 renderable stories. Deciding which to produce, in what order,
   and which belong to the same series is not something to do by reading filenames — the
   authoritative answer is in each story's own `era` and `hero` fields.

   This reads them all (read-only, as everything here does), and answers the questions the
   factory needs to ask:

     which stories belong to the Gupta age?
     which are already built here, and which are untouched?
     how long is each one, and how much render time does that imply?
     which ones carry the strongest hook — a number, a first, a confrontation?

   Nothing is written to IndianHistory. The index is derived on every run, so a story added
   upstream appears here without anything being regenerated.

     node tools/stories.mjs                       # the whole library, summarised
     node tools/stories.mjs --era gupta           # one series
     node tools/stories.mjs --era gupta --plan    # + render-time estimate and order
     node tools/stories.mjs --search zero,pi      # by keyword
*/
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const SRC = arg('src', 'C:/Users/navg/DailyApps/IndianHistory');
const DATA = path.join(SRC, 'app', 'data');
const ERA = (arg('era', null) || '').toLowerCase();
const SEARCH = (arg('search', null) || '').toLowerCase().split(',').filter(Boolean);
const LIMIT = Number(arg('limit', '0'));

/* Era buckets. A story's `era` field is free text written for a human ("Gupta science, the
   Aryabhatiya composed 499 CE"), so series membership is matched on the words that
   actually identify a dynasty rather than on a controlled vocabulary that does not exist
   upstream. Order matters: the first bucket that matches wins, so the more specific
   dynasties are listed before the empires that contain them. */
export const ERAS = [
  ['harappa', /harappa|indus|meluhha|mohenjo|dholavira|shortughai/i],
  ['maurya', /maurya|ashoka|asoka|chandragupta maurya|bindusara|kautilya|arthashastra|pataliputra.*maurya|sarnath/i],
  ['kushan', /kushan|kanishka|huvishka|kadphises|yuezhi|gandhara|begram/i],
  ['satavahana', /satavahana|paithan|amaravati/i],
  ['gupta', /gupta|aryabhat|kalidasa|vakataka|samudragupta|skandagupta|prabhavati|faxian|nalanda|deogarh|iron pillar/i],
  ['chalukya', /chalukya|badami|pulakeshin|vatapi|aihole|mangalesa|lokamahadevi/i],
  ['pallava', /pallava|mamalla|mahendravarman|kanchi|mamallapuram|rajasimha|simhavishnu/i],
  ['rashtrakuta', /rashtrakuta|dantidurga|krishna i|kailasa|amoghavarsha|govinda|manyakheta/i],
  ['chola', /chola|rajaraja|rajendra|thanjavur|brihadisvara|kulottunga|kundavai|vijayalaya|kaveri|anicut/i],
  ['kerala-math', /madhava|nilakantha|jyeshthadeva|paramesvara|sangamagrama|kerala school|whish|ilanchi|malayalam.*proof/i],
  ['delhi-sultanate', /sultanate|iltutmish|balban|razia|alauddin|tughlaq|firuz|qutb|khusrau|nizamuddin|timur|lodi/i],
  ['vijayanagara', /vijayanagara|hampi|krishnadevaraya|harihara|bukka|raichur|tangadi|amuktamalyada|tenali/i],
  ['mughal', /mughal|babur|akbar|jahangir|nur jahan|shah jahan|aurangzeb|todar mal|mansab|samugarh|fatehpur|taj|yamuna.*mausoleum/i],
  ['sikh', /sikh|guru nanak|guru angad|guru amar das|guru ram das|guru arjan|guru hargobind|guru tegh|guru gobind|banda/i],
  ['maratha', /maratha|shivaji|peshwa|balaji|madhavrao|mahadji|tarabai|nana fadnavis|kanhoji|chauth|panipat|palkhed|vasai|scindia/i],
  ['bhakti', /bhakti|tukaram|purandara|appar|kamban|acyuta|melpathur|pandharpur|nayanar|alvar/i],
  ['freedom', /1857|freedom|bhagat singh|tilak|lajpat|kakori|mangal pandey|lakshmibai|kunwar singh|tatya tope|khudiram|bagha jatin|zafar|simon/i],
  ['sangam', /sangam|tamil.*merchant|pari|three crowns|keezhadi|muziris|guild/i],
];

export function eraOf(story) {
  const blob = `${story.era || ''} ${story.title || ''} ${story.figure || ''} `
    + `${story.hero?.name || ''} ${(story.hero?.epithets || []).join(' ')} ${story.id || ''}`;
  for (const [name, re] of ERAS) if (re.test(blob)) return name;
  return 'other';
}

/* A hook is something concrete a thumbnail could be built on: a figure, a first, a
   confrontation, a physical object. Stories whose text is mostly abstract are harder to
   package, and it is worth knowing that before spending an hour rendering one. */
const HOOK = /\b\d[\d,.]*\b|\bfirst\b|\bnever\b|\bno one\b|\bnobody\b|\bbefore\b|\brefus|\bdare|\bdefied?\b|\bsecret\b|\bproof\b|\bzero\b|\bpi\b/i;

export async function loadStories() {
  const files = (await readdir(DATA)).filter((f) => f.endsWith('.player.json'));
  const out = [];
  for (const f of files) {
    let s;
    try { s = JSON.parse(await readFile(path.join(DATA, f), 'utf8')); } catch { continue; }
    const panels = s.panels || [];
    const text = panels.map((p) => p.lines?.[0]?.text?.en || '').join(' ');
    const hooks = panels.filter((p) => HOOK.test(p.lines?.[0]?.text?.en || '')).length;
    /* Runtime is not stored, and probing every mp3 in the library would take minutes. The
       narration is ~14.5 characters per second at this voice and rate, measured across the
       28 panels of ep01 (326 s for 4,730 characters). Good enough to rank and to budget. */
    const estSec = Math.round(text.length / 14.5);
    out.push({
      id: s.id || f.replace(/\.player\.json$/, ''),
      file: f,
      title: s.title || '',
      figure: s.figure || '',
      era: s.era || '',
      bucket: eraOf(s),
      legend: s.hero?.legend || '',
      moral: s.moral || '',
      panels: panels.length,
      chars: text.length,
      estSec,
      hooks,
      hookRate: panels.length ? hooks / panels.length : 0,
      langs: s.langs || [],
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/** Which stories already have a built episode in this repo. */
async function builtHere() {
  const dirs = await readdir('episodes').catch(() => []);
  const done = new Set();
  for (const d of dirs) {
    const j = await readFile(path.join('episodes', d, 'episode.json'), 'utf8').catch(() => null);
    if (j) { try { done.add(JSON.parse(j).id); } catch { /* malformed */ } }
  }
  return done;
}

// ── report ────────────────────────────────────────────────────────────────
/* Only when run directly. This module is imported by the seeder and the factory, and a
   module that prints a table and calls process.exit() on import is not importable. */
const RUN_DIRECTLY = process.argv[1] && path.resolve(process.argv[1]).endsWith('stories.mjs');
if (!RUN_DIRECTLY) {
  // exported for use as a library; nothing else to do
} else {
  await main();
}

async function main() {
const all = await loadStories();
const done = await builtHere();

let list = all;
if (ERA) list = list.filter((s) => s.bucket === ERA);
if (SEARCH.length) {
  list = list.filter((s) => SEARCH.some((k) =>
    `${s.id} ${s.title} ${s.figure} ${s.era} ${s.legend}`.toLowerCase().includes(k)));
}

if (!ERA && !SEARCH.length && !has('plan')) {
  const by = new Map();
  for (const s of all) by.set(s.bucket, [...(by.get(s.bucket) || []), s]);
  console.log(`\n  ${all.length} stories in ${DATA}\n`);
  console.log(`  ${'series'.padEnd(18)} ${'n'.padStart(3)}  ${'est. runtime'.padStart(12)}   built here`);
  console.log(`  ${'─'.repeat(18)} ${'─'.repeat(3)}  ${'─'.repeat(12)}   ${'─'.repeat(10)}`);
  const order = [...ERAS.map(([n]) => n), 'other'];
  for (const b of order) {
    const g = by.get(b);
    if (!g) continue;
    const mins = Math.round(g.reduce((a, s) => a + s.estSec, 0) / 60);
    const built = g.filter((s) => done.has(s.id)).length;
    console.log(`  ${b.padEnd(18)} ${String(g.length).padStart(3)}  ${(`${mins} min`).padStart(12)}   ${built || '·'}`);
  }
  console.log(`\n  node tools/stories.mjs --era gupta --plan\n`);
  process.exit(0);
}

console.log(`\n  ${list.length} stor${list.length === 1 ? 'y' : 'ies'}`
  + `${ERA ? ` in "${ERA}"` : ''}${SEARCH.length ? ` matching ${SEARCH.join(', ')}` : ''}\n`);

const shown = LIMIT ? list.slice(0, LIMIT) : list;
for (const s of shown) {
  const mark = done.has(s.id) ? '✓' : ' ';
  const mm = Math.floor(s.estSec / 60);
  const ss = String(s.estSec % 60).padStart(2, '0');
  console.log(`  ${mark} ${s.title}`);
  console.log(`     ${s.id}`);
  console.log(`     ${s.panels} panels · ~${mm}:${ss} · ${s.hooks}/${s.panels} hooks (${(s.hookRate * 100).toFixed(0)}%)`);
  console.log(`     ${s.era}`);
  if (s.legend) console.log(`     "${s.legend}"`);
  console.log('');
}

if (has('plan')) {
  /* Ordered by how well the story packages, not by filename. A story with a high hook rate
     gives the intro beats and the thumbnail something concrete to be about; one without
     needs the writing to do more work, so it should not be first. */
  const todo = list.filter((s) => !done.has(s.id))
    .sort((a, b) => b.hookRate - a.hookRate || b.hooks - a.hooks);
  const PER_VERSION_MIN = 65;   // measured on ep01: stills 5 + clips 12 + masters 8 + render 38 + kit 2
  console.log('  ─'.repeat(38));
  console.log('\n  PRODUCTION ORDER  (strongest packaging first)\n');
  todo.forEach((s, i) => {
    console.log(`   ${String(i + 1).padStart(2)}. ${s.title.padEnd(44)} ${String(s.hooks).padStart(2)}/${s.panels} hooks`);
  });
  const hrs1 = (todo.length * PER_VERSION_MIN) / 60;
  console.log(`\n  ${todo.length} to produce · ~${PER_VERSION_MIN} min per version`);
  console.log(`  one version each:  ~${hrs1.toFixed(1)} h`);
  console.log(`  two versions each: ~${(hrs1 * 2).toFixed(1)} h`);
  console.log(`  in a 12 h window:  ~${Math.floor(720 / PER_VERSION_MIN)} versions`
    + ` = ${Math.floor(720 / PER_VERSION_MIN / 2)} stories at two versions each\n`);
}
}
