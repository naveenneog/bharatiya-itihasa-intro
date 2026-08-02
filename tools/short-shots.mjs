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
import { genVideo } from './azure.mjs';
import { INK_STYLE, INK_LIGHT, FRAME_TALL, LOWER, NOTYPE } from './ink.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const SLUG = arg('slug', null);
if (!SLUG) { console.error('usage: node tools/short-shots.mjs --slug <slug>'); process.exit(1); }
const EP = path.join('episodes', SLUG);
const OUT = path.join(EP, 'short-clips');
const PLANFILE = path.join(EP, 'short-shots.json');
const CONC = Number(arg('conc', 2));
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

const user = `Episode: ${ep.title}
Figure: ${ep.figure || '(none)'}
Era: ${ep.era || ''}

THE SEVEN CLAIMS, in order:
${script.lines.map((l, i) => `${i + 1}. [${l.kick}] ${l.text}`).join('\n')}`;

let plan = await readFile(PLANFILE, 'utf8').then(JSON.parse).catch(() => null);
if (!plan || has('replan')) {
  const got = await chatJson(SYSTEM, user, { maxTokens: 2000 });
  const shots = Array.isArray(got.shots) ? got.shots : [];

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
    if (n < 12 || n > 30) problems.push(`shot ${i + 1}: ${n} words, outside 12-30`);
    if (/\binscription|\bwriting|\bletter|\bnumeral|\bscript\b|\btext\b|\bmanuscript|\bpalm.leaf|\bengrav/i.test(subj)) {
      problems.push(`shot ${i + 1}: asks for writing — it will come out as gibberish glyphs: "${subj}"`);
    }
    if (/\bhand|\bfinger|\bface|\bfigure|\bperson|\bsilhouette|\bman\b|\bwoman\b/i.test(subj)) {
      problems.push(`shot ${i + 1}: contains a person: "${subj}"`);
    }
  }
  if (problems.length) {
    console.error(`the shot plan for ${SLUG} did not pass:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
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
const have = await readdir(OUT).catch(() => []);
const todo = plan.shots.filter((s) => {
  if (ONLY.length && !ONLY.includes(String(s.n + 1)) && !ONLY.includes(s.id)) return false;
  if (has('force')) return true;
  return !have.some((f) => f.startsWith(`${String(s.n).padStart(2, '0')}-`) && f.endsWith('.mp4'));
});
if (!todo.length) { console.log('\nall seven already generated'); process.exit(0); }

console.log(`\n  generating ${todo.length}, ${CONC} at a time — about ${Math.ceil(todo.length / CONC * 1.2)} min\n`);
const t0 = Date.now();
let done = 0; let failed = 0;
const queue = [...todo];
await Promise.all(Array.from({ length: Math.min(CONC, queue.length) }, async () => {
  for (;;) {
    const s = queue.shift();
    if (!s) return;
    const base = `${String(s.n).padStart(2, '0')}-${s.id}`;
    const out = path.join(OUT, `${base}-r1.mp4`);
    try {
      /* Text to video, no reference frame. The era pipeline animates a chosen still so the
         picked candidate is the one that moves; here there is no candidate to pick and a
         reference would cost a still per shot for no editorial gain. */
      await genVideo(s.prompt, out, { seconds: '8', size: '720x1280' });
      await writeFile(out.replace(/\.mp4$/, '.txt'), s.prompt);
      done++;
      console.log(`  [${done + failed}/${todo.length}] ${((Date.now() - t0) / 1000).toFixed(0)}s  ok   ${base}`);
    } catch (e) {
      failed++;
      console.log(`  [${done + failed}/${todo.length}] ${((Date.now() - t0) / 1000).toFixed(0)}s  FAIL ${base}`);
      console.log(`        ${String(e.message || e).slice(0, 300)}`);
    }
  }
}));

console.log(`\n  ${done}/${todo.length} in ${((Date.now() - t0) / 60000).toFixed(1)} min -> ${OUT}/`);
if (failed) process.exit(1);
