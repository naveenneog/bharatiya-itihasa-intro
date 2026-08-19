/* The pictures a Short is set over — this story's, not the era's.

   The first version played every Short over the era's ten abstract beats. It works once: the
   language is right, the type reads, and the piece looks like the channel. Then you watch two
   in a row and they are the same film with different words over them — a viewer who saw the
   Nalanda Short has already seen the Sushruta one. Sameness is the channel's asset at the
   level of *style* and its liability at the level of *shot*.

   So each Short gets its own seven takes, one per claim, whose subjects come from that story
   and no other: the object the claim is about, in ink and gold in black water. Roughly a
   minute of generation per story.

     node tools/short-shots.mjs --slug sushruta --plan
     node tools/short-shots.mjs --slug sushruta
     node tools/short-shots.mjs --slug sushruta --shots 2,5 --force

   Writes episodes/<slug>/short-clips/NN-<id>-r1.mp4 and the prompt beside each.
*/
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { chatJson } from './llm.mjs';
import { genImage, genVideo, soraFleet, rememberConc } from './azure.mjs';
import { INK_STYLE, INK_LIGHT, FRAME_TALL, LOWER, NOTYPE } from './ink.mjs';
import { flagPerson } from './human-subject.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const SLUG = arg('slug', null);
if (!SLUG) { console.error('usage: node tools/short-shots.mjs --slug <slug>'); process.exit(1); }
const EP = path.join('episodes', SLUG);
const OUT = path.join(EP, 'short-clips');
const STILLS = path.join(EP, 'short-stills');
const PLANFILE = path.join(EP, 'short-shots.json');
/* The real throttle is soraFleet inside genVideo, which finds each deployment's current cap by
   probing it. Workers here only need to be numerous enough that no lane is ever starved of
   something to start. --conc pins every lane. */
const PIN = Number(arg('conc', 0));
if (PIN) for (const l of soraFleet.lanes) { l.limit = PIN; l.min = PIN; l.max = PIN; }
const CONC = soraFleet.max;
const ONLY = (arg('shots', '') || '').split(',').map((s) => s.trim()).filter(Boolean);

const script = JSON.parse(await readFile(path.join(EP, 'short.json'), 'utf8'));
const ep = JSON.parse(await readFile(path.join(EP, 'episode.json'), 'utf8'));

const SYSTEM = `You choose the pictures for a vertical short about Indian history.

The short is seven spoken claims. Each one plays over a separate abstract shot: Indian ink
and liquid gold blooming through clear water, lit by one hard rim light, shot macro against
black. That material and that light are fixed and are added afterwards — do not describe
them. Your job is only WHAT IS IN THE WATER for each claim.

WHAT MAKES A GOOD SUBJECT
- A physical thing this story is actually about: an instrument, a coin, a pillar, a leaf, a
  seed, a vessel, a knife, a loom, a wheel, a fragment of stone, a plant, a flame, a wave.
- Different from the other six. Seven variations on a circle is one shot seven times.
- It should read at a glance on a phone, at arm's length, in under three seconds.
- It should belong to THIS story and no other. A viewer who has seen another episode of this
  channel must not have seen this shot.

HARD RULES
1. **No writing of any kind.** Never say inscription, text, letters, numerals, script,
   manuscript, page, palm-leaf writing, engraved words. The model invents glyphs and they are
   always gibberish. Where a mark carries the meaning, ask for GEOMETRY instead: "a single
   incised circle", "a ring with a void at its centre", "a row of shallow drilled dots".
2. **No people.** No hands, no faces, no figures, no silhouettes. The material is the subject.
3. Nothing modern and nothing western.
4. One sentence, 12 to 30 words, naming the object and what it is doing in the water —
   sinking, dissolving, surfacing, turning, splitting, catching light, coming apart.
5. Do not name the era, the place or the person. The object carries it.

Return JSON only:
{"shots":[{"id":"kebab-case-two-words","subject":"..."} , ... exactly 7, in order]}`;

/* The claims are handed over twice: in full, and then stripped if Azure refuses them.

   `lal_mahal_raid_on_shaista_khan` died here at stage 19 of 22, 53 minutes in. Not the image
   model this time and not a person in a shot — the *prompt* was refused, `param: "prompt"`,
   `ResponsibleAIPolicyViolation`, before a single shot existed. The claim that did it reads
   "Akhbarat letters report Shaista Khan's fingers cut, his honour wounded far worse", with
   "wakes to Maratha steel" three lines above it. Both are accurate, both are the episode, and
   neither is going to be rewritten to suit a filter.

   But the shot planner does not need them. It is asked for objects in black water and is
   forbidden from naming the person, the place or the era anyway — the claims are there to say
   what each beat is *about*. The kick labels already say that: THE SHOCK, TAKEN PALACE, THE
   WOUND. So a refusal falls back to the labels alone and the plan still lands on the right
   seven subjects, just derived from the beat rather than its wording.

   This is degradation, not repair: the full text is always tried first, and the fallback only
   runs when the API refuses to read it. An era of battles will meet this again. */
const user = `Episode: ${ep.title}
Figure: ${ep.figure || '(none)'}
Era: ${ep.era || ''}

THE SEVEN CLAIMS, in order:
${script.lines.map((l, i) => `${i + 1}. [${l.kick}] ${l.text}`).join('\n')}`;

const claimsOnly = `Episode: ${ep.title}
Figure: ${ep.figure || '(none)'}
Era: ${ep.era || ''}

THE SEVEN BEATS, in order. Only the beat label is given; write the object each one is about:
${script.lines.map((l, i) => `${i + 1}. ${l.kick}`).join('\n')}`;

let plan = await readFile(PLANFILE, 'utf8').then(JSON.parse).catch(() => null);
if (!plan || has('replan')) {
  /* Three attempts, with the rejection handed back as an instruction — the same loop as closer
     and outro-shot, for the same reason. `the-four-lions` lost a whole build to one word: shot 7
     described the Sarnath capital locking into "a single, balanced, emblematic silhouette", which
     is the outline of a sculpture, not a person. A validator that exits on the first miss throws
     away six good shots to punish the seventh. */
  let shots = [];
  let note = '';
  let softened = false;
  let lastBad = new Set();
  for (let attempt = 1; ; attempt++) {
    let got;
    try {
      got = await chatJson(SYSTEM, (softened ? claimsOnly : user) + note, { maxTokens: 2000 });
    } catch (e) {
      if (softened || !/content_filter|ResponsibleAIPolicy/i.test(String(e && e.message))) throw e;
      console.error(`the claims were refused by the content filter; planning from the beat labels alone`);
      softened = true;
      attempt--;
      continue;
    }
    shots = Array.isArray(got.shots) ? got.shots : [];

    /* Checked, not trusted. The writing rule is the one that matters: "worn and indistinct"
       reduces fake writing and does not stop it, so the only rule that holds is never to
       mention writing at all — see the skill's bug log. */
    const problems = [];
    if (shots.length !== 7) problems.push(`${shots.length} shots, expected 7`);
    const seen = new Set();
    for (const [i, s] of shots.entries()) {
      const subj = String(s?.subject || '').trim();
      const id = String(s?.id || '').trim();
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) problems.push(`shot ${i + 1}: id must be kebab-case, got "${id}"`);
      if (seen.has(id)) problems.push(`shot ${i + 1}: duplicate id "${id}"`);
      seen.add(id);
      const n = subj.split(/\s+/).length;
      if (n < 12 || n > 30) problems.push(`shot ${i + 1}: the subject is ${n} words; write 12 to 30`);
      if (/\binscription|\bwriting|\bletter|\bnumeral|\bscript\b|\btext\b|\bmanuscript|\bengrav/i.test(subj)) {
        problems.push(`shot ${i + 1}: asks for writing, which comes out as gibberish glyphs —`
          + ` ask for geometry instead, such as a single incised circle: "${subj}"`);
      }
      const problem = flagPerson(subj);
      if (problem) problems.push(`shot ${i + 1}: ${problem}`);
    }

    if (!problems.length) break;

    if (attempt >= 3) {
      console.error(`the shot plan for ${SLUG} did not pass in ${attempt} attempts:`);
      for (const p of problems) console.error(`  - ${p}`);
      process.exit(1);
    }
    console.error(`shot plan attempt ${attempt} did not pass, asking again:`);
    for (const p of problems) console.error(`  - ${p}`);
    /* A rejection the model answers by rewording is a rejection it has not understood.

       `nana_fadnavis_and_the_twelve_pillars` is about the papers in the Peshwa Daftar, so the
       planner reached for a writing board, was told writing comes out as gibberish glyphs, and
       came back with the same writing board plus the words "in branching channels". Three
       attempts, one object, 48 minutes lost at stage 20 of 22.

       The first message is advice. The second, for a shot that fails twice, is an instruction:
       change the object. Kept narrow — only shots that failed the previous attempt too. */
    const bad = new Set();
    for (const p of problems) { const m = /^shot (\d+):/.exec(p); if (m) bad.add(m[1]); }
    const repeated = new Set([...bad].filter((n) => lastBad.has(n)));
    lastBad = bad;

    note = '\n\nYour previous answer was rejected for these reasons:\n'
      + problems.map((p) => `- ${p}`).join('\n')
      + '\nReturn all seven shots again with every one of them fixed.'
      + (repeated.size
        ? `\n\nShot(s) ${[...repeated].join(', ')} failed for the same reason last time. Rewording`
          + ' is not enough: choose a DIFFERENT OBJECT for those shots. If the beat is about'
          + ' documents, records or accounts, do not name any writing surface — use the thing the'
          + ' paperwork acts on or travels in: a seal, a coin, a knotted cord, a folded cloth, a'
          + ' lamp, a weight, a locked box, a bundle tie.'
        : '');
  }

  plan = {
    slug: SLUG,
    shots: shots.map((s, i) => ({
      n: i,
      id: s.id,
      subject: s.subject.trim(),
      claim: script.lines[i].text,
      /* The style, the lamp, the tall frame and the ban on type come from ink.mjs and are
         never restated in the subject — a shot that restates them is the first step of the
         drift the shared language exists to prevent. */
      prompt: `${s.subject.trim()} ${LOWER}\n\n${INK_STYLE} ${INK_LIGHT}\n\n${FRAME_TALL}\n\n${NOTYPE}`,
    })),
  };
  await writeFile(PLANFILE, `${JSON.stringify(plan, null, 2)}\n`);
}

console.log(`${SLUG}: ${plan.shots.length} shots for the vertical cut`);
for (const s of plan.shots) console.log(`  ${String(s.n + 1)}. ${s.id.padEnd(22)} ${s.subject}`);
if (has('plan')) { console.log('\n--plan: nothing generated'); process.exit(0); }

await mkdir(OUT, { recursive: true });
await mkdir(STILLS, { recursive: true });
const have = await readdir(OUT).catch(() => []);
const todo = plan.shots.filter((s) => {
  if (ONLY.length && !ONLY.includes(String(s.n + 1)) && !ONLY.includes(s.id)) return false;
  if (has('force')) return true;
  return !have.some((f) => f.startsWith(`${String(s.n).padStart(2, '0')}-`) && f.endsWith('.mp4'));
});
if (!todo.length) { console.log('\nall seven already generated'); process.exit(0); }

console.log(`\n  generating ${todo.length} across ${soraFleet.lanes.length} deployment(s): ${soraFleet.lanes.map((l) => `${l.name}@${l.limit}`).join(', ')}\n`);
const t0 = Date.now();
let done = 0; let failed = 0;
const queue = [...todo];

const blocked = (e) => /moderation_blocked|moderation system/i.test(String(e?.message || e));

/* Moderation gets a second subject rather than costing the story its Short.

   `mamallapuram` lost shot 5 to "violence" on a dancing torso fragment — a broken sculpture at a
   site whose whole subject is broken sculpture. The filter is not reasoning about the image, and
   no rewording of that sentence was going to argue with it, so the answer is a different object.
   outro-shot has had this since the Seleucus elephant; the Short's shots did not, and a single
   blocked shot out of seven failed the stage. */
async function replan(s) {
  const got = await chatJson(
    'You write one shot for a vertical film in the Ink and Light language: an object in ink and'
    + ' gold in black water, no people, no writing. Return JSON only:'
    + ' {"id":"kebab-case-two-words","subject":"one sentence, 12-30 words"}',
    `The claim this shot sits under: "${s.claim}"\n\nThis subject was refused by an automated`
    + ` content filter. It is not about wording — propose a DIFFERENT object, plainer and more`
    + ` concrete, that still carries the claim:\n"${s.subject}"`,
    { maxTokens: 600 });
  const subject = String(got?.subject || '').trim();
  const id = String(got?.id || '').trim();
  if (!subject || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) return null;
  if (flagPerson(subject)) return null;
  return {
    ...s,
    id,
    subject,
    prompt: `${subject} ${LOWER}\n\n${INK_STYLE} ${INK_LIGHT}\n\n${FRAME_TALL}\n\n${NOTYPE}`,
  };
}

await Promise.all(Array.from({ length: Math.min(CONC, queue.length) }, async () => {
  for (;;) {
    let s = queue.shift();
    if (!s) return;
    for (let attempt = 1; ; attempt++) {
      const base = `${String(s.n).padStart(2, '0')}-${s.id}`;
      const out = path.join(OUT, `${base}-r1.mp4`);
      const still = path.join(STILLS, `${base}-r1.png`);
      try {
        /* A still first, kept, then animated from it.

           This used to go straight from text to video on the reasoning that there is no candidate
           to pick here, so a reference bought nothing. That was wrong twice over. The still is a
           finished piece of art in its own right and throwing it away meant seven takes produced
           no stills at all. And animating a still holds the take much closer to what was asked
           for than a text prompt does, which is what keeps seven shots in one visual language.

           Portrait, 1024x1536: a landscape still centre-cropped to 9:16 keeps a narrow strip and
           upscales it, which is the same softness that made cropped landscape footage unusable. */
        await genImage(s.prompt, still, { size: '1024x1536', quality: 'high' });
        await writeFile(still.replace(/\.png$/, '.txt'), s.prompt);
        await genVideo(s.prompt, out, { seconds: '8', size: '720x1280', ref: still });
        await writeFile(out.replace(/\.mp4$/, '.txt'), s.prompt);
        done++;
        console.log(`  [${done + failed}/${todo.length}] ${((Date.now() - t0) / 1000).toFixed(0)}s  ok   ${base}`);
        break;
      } catch (e) {
        if (blocked(e) && attempt <= 2) {
          console.log(`  moderation refused ${base}, asking for a different object`);
          const next = await replan(s).catch(() => null);
          if (next) { s = next; continue; }
        }
        failed++;
        console.log(`  [${done + failed}/${todo.length}] ${((Date.now() - t0) / 1000).toFixed(0)}s  FAIL ${base}`);
        console.log(`        ${String(e.message || e).slice(0, 300)}`);
        break;
      }
    }
  }
}));

console.log(`\n  ${done}/${todo.length} in ${((Date.now() - t0) / 60000).toFixed(1)} min -> ${OUT}/`);
console.log(`  lanes: ${soraFleet.report()}`);
await rememberConc();
if (failed) process.exit(1);
