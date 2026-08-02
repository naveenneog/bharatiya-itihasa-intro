/* The closing take, generated for this story and no other.

   The close is one abstract image held for seventeen seconds with the figure's own words set
   over it. It used to fall back to "the longest abstract beat in the era", which is a single
   deterministic answer for the whole era — so eleven of twelve Gupta outros were the same file,
   byte for byte. An era's beats are its shared signature and that is what they are for; the
   close is the last thing a viewer sees of a particular story, and it cannot be the last thing
   they saw of the previous one.

   One shot, twelve seconds — the longest Sora makes — because the retime that lets four lines
   breathe starts from whatever length the take is.

     node tools/outro-shot.mjs --slug zero --plan
     node tools/outro-shot.mjs --slug zero
     node tools/outro-shot.mjs --slug zero --force --replan
*/
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { chatJson } from './llm.mjs';
import { genImage, genVideo, soraFleet, rememberConc } from './azure.mjs';
import { INK_STYLE, INK_LIGHT, NOTYPE } from './ink.mjs';
import { langOf, lineOf } from './lang.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const SLUG = arg('slug', null);
if (!SLUG) { console.error('usage: node tools/outro-shot.mjs --slug <slug>'); process.exit(1); }
const EP = path.join('episodes', SLUG);
const OUT = path.join(EP, 'outro-clips');
const STILLS = path.join(EP, 'outro-stills');
/* Two files, deliberately. The plan is cacheable and cheap; the record is written only once a
   take actually exists on disk. A stage that declares the plan as its output is skipped on a
   resumed run whose generation failed, and make-outro then falls back to the shared era beat —
   silently producing the very thing this tool exists to prevent. */
const PLANFILE = path.join(EP, 'outro-shot.plan.json');
const DONEFILE = path.join(EP, 'outro-shot.json');
const SECONDS = arg('seconds', '12');

const ep = JSON.parse(await readFile(path.join(EP, 'episode.json'), 'utf8'));
const LANG = langOf(ep);
const closer = await readFile(path.join(EP, 'closer.json'), 'utf8').then(JSON.parse).catch(() => null);

const SYSTEM = `You choose the single closing image for an episode of a documentary series on
Indian history.

The episode ends on ONE abstract shot, held for about seventeen seconds, with four lines of the
episode's own conclusions set over it in silence. The material is fixed and added afterwards:
Indian ink and liquid gold blooming through clear water, one hard rim light, macro against
black. Do not describe the material or the light. Your job is only WHAT IS IN THE WATER.

WHAT MAKES A GOOD CLOSING IMAGE
- It is the episode's whole argument as one object. Not a summary of the plot — the thing the
  story leaves behind.
- It must be legible while text sits over it. One object, centred, slow. No busy field, no
  swarm, no scatter, nothing that competes with type for the eye.
- It must move slowly and continuously for twelve seconds: turning, settling, opening,
  dissolving, rising. Nothing that finishes early and leaves the frame still.
- It must belong to THIS episode. A viewer who watched another episode of this channel last
  night must not be looking at the same closing shot.

HARD RULES
1. **No writing of any kind.** Never say inscription, text, letters, numerals, script,
   manuscript, page, engraved words. The model invents glyphs and they come out as gibberish.
   Where a mark carries the meaning, ask for GEOMETRY: "a single incised circle", "a ring with
   a void at its centre", "a row of shallow drilled dots".
2. **No people.** No hands, no faces, no figures, no silhouettes.
3. Nothing modern and nothing western.
4. One sentence, 14 to 34 words, naming the object and what it does across the whole shot.
5. Do not name the era, the place or the person. The object carries it.

Return JSON only:
{"id":"kebab-case-two-words","subject":"...","why":"one sentence on why this closes this story"}`;

const closing = closer?.cards?.length
  ? closer.cards.map((c) => c.en || c.hi || '').filter(Boolean).join('\n')
  : '(no closing cards written yet)';

const user = `Episode: ${ep.title}
Figure: ${ep.figure || '(none named)'}
Era: ${ep.era || ''}
Moral: ${ep.moral || ''}

THE CLOSING LINES that will sit over this image:
${closing}

OPENING NARRATION, for what the story is about:
${ep.panels.slice(0, 5).map((p) => lineOf(p, LANG)).filter(Boolean).join('\n')}`;

let plan = await readFile(PLANFILE, 'utf8').then(JSON.parse).catch(() => null);
if (!plan || has('replan')) {
  const got = await chatJson(SYSTEM, user, { maxTokens: 1200 });
  const subject = String(got?.subject || '').trim();
  const id = String(got?.id || '').trim();

  /* Checked, not trusted — the same three rules that the Short's shots are held to, because the
     same model breaks them in the same way. The writing rule is the one that matters: asking for
     worn or indistinct marks reduces fake glyphs and does not stop them. */
  const problems = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) problems.push(`id must be kebab-case, got "${id}"`);
  const n = subject.split(/\s+/).filter(Boolean).length;
  if (n < 14 || n > 34) problems.push(`${n} words, outside 14-34`);
  if (/\binscription|\bwriting|\bletter|\bnumeral|\bscript\b|\btext\b|\bmanuscript|\bengrav/i.test(subject)) {
    problems.push(`asks for writing — it will come out as gibberish glyphs: "${subject}"`);
  }
  if (/\bhand|\bfinger|\bface|\bfigure|\bperson|\bsilhouette|\bman\b|\bwoman\b|\bcrowd/i.test(subject)) {
    problems.push(`contains a person: "${subject}"`);
  }
  if (problems.length) {
    console.error(`the closing shot for ${SLUG} did not pass:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  plan = {
    slug: SLUG,
    id,
    subject,
    why: got.why || '',
    /* The style, the lamp and the ban on type come from ink.mjs and are never restated in the
       subject — a shot that restates them is the first step of the drift the shared language
       exists to prevent. */
    prompt: `${subject} The camera is static and the movement is slow and continuous throughout.`
      + `\n\n${INK_STYLE} ${INK_LIGHT}\n\n${NOTYPE}`,
  };
  await writeFile(PLANFILE, `${JSON.stringify(plan, null, 2)}\n`);
}

console.log(`${SLUG} closes on: ${plan.id}`);
console.log(`  ${plan.subject}`);
if (plan.why) console.log(`  why: ${plan.why}`);
if (has('plan')) { console.log('\n--plan: nothing generated'); process.exit(0); }

await mkdir(OUT, { recursive: true });
const have = await readdir(OUT).catch(() => []);
const done = have.filter((f) => f.startsWith(`${plan.id}-r`) && f.endsWith('.mp4'));
if (done.length && !has('force')) {
  console.log(`\nalready generated: ${done.join(', ')} — pass --force for another take`);
  await writeFile(DONEFILE, `${JSON.stringify({ ...plan, take: path.join(OUT, done.at(-1)) }, null, 2)}\n`);
  process.exit(0);
}

const take = done.length + 1;
const out = path.join(OUT, `${plan.id}-r${take}.mp4`);
const still = path.join(STILLS, `${plan.id}-r${take}.png`);
await mkdir(STILLS, { recursive: true });

/* A still first, kept, and then used as the reference the take is built from.

   Going straight from text to video was cheaper by one image call per shot and it threw away
   the best thing the pipeline makes. The still is a finished piece of art in its own right —
   it is what a thumbnail, a chapter card or a poster would be cut from — and generating none
   meant a run produced nothing but video. It also locks the take: an animated still varies far
   less from what was asked for than a text prompt does, so the close matches the language. */
console.log(`\n  still...`);
const t0 = Date.now();
try {
  await genImage(plan.prompt, still, { size: '1536x1024', quality: 'high' });
  await writeFile(still.replace(/\.png$/, '.txt'), `${plan.prompt}\n`);
  console.log(`  ok  ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${still}`);
} catch (e) {
  console.error(`  FAIL still: ${String(e.message || e).slice(0, 300)}`);
  process.exit(1);
}

console.log(`  ${SECONDS}s take r${take}, animated from that still...`);
const t1 = Date.now();
try {
  /* The still is 1536x1024 (3:2) and the take is 1280x720; genVideo centre-crops and scales the
     reference, because sora rejects any mismatch. */
  const r = await genVideo(plan.prompt, out, { seconds: SECONDS, size: '1280x720', ref: still });
  /* The prompt is written beside the take, always. A generated asset whose prompt was not kept
     cannot be varied, corrected or explained later — only replaced. */
  await writeFile(out.replace(/\.mp4$/, '.txt'), `${plan.prompt}\n`);
  await writeFile(DONEFILE, `${JSON.stringify({ ...plan, take: out, still, lane: r.lane, at: new Date().toISOString() }, null, 2)}\n`);
  console.log(`  ok  ${((Date.now() - t1) / 1000).toFixed(0)}s on ${r.lane} -> ${out}`);
} catch (e) {
  console.error(`  FAIL take: ${String(e.message || e).slice(0, 300)}`);
  process.exit(1);
}
await rememberConc();
console.log(`  lanes: ${soraFleet.report()}`);
