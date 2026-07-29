/* Fact-check an era's on-screen copy before it is rendered.

   Every claim in a sequence appears on screen as an assertion, in a channel about history,
   under the user's name. The Gupta sequence was drafted carefully by hand and still carried
   **two outright errors** — Ajanta attributed to the Guptas when it is Vākāṭaka work, and
   the empire "falling to the Hunas" when Skandagupta defeated them. Both were caught only
   because they were checked. Drafts written by a model will carry more, not fewer.

   Rendering is the expensive step. A wrong date costs an hour of generation to fix after
   the fact, and costs the channel's credibility if it ships. So the check runs first.

   What it looks for, in order of how much damage it does:

     wrong        the claim is false, or the artefact belongs to another dynasty
     overclaim    true but stated more strongly than the evidence supports
     anachronism  the date and the thing do not belong together
     script       the Devanagari is wrong, mixed with another script, or nonsense
     vague        true but says nothing a viewer could not have guessed

   The model is asked to be adversarial and to cite what it is relying on. Its verdicts are
   written to `eras/<id>/facts.md` as a record — the point is that someone can disagree with
   a verdict later and see what it was based on.

     node tools/check-era.mjs chola
     node tools/check-era.mjs --all
     node tools/check-era.mjs chola --apply     # write the corrections back into era.json
*/
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { listEras, loadEra, saveEra, ROOT } from './eras.mjs';
import { chatJson } from './llm.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);
const CONC = Number(arg('conc', '3'));
const APPLY = has('apply');

const VALUE_FLAGS = new Set(['conc']);
const consumed = new Set();
argv.forEach((a, i) => { if (a.startsWith('--') && VALUE_FLAGS.has(a.slice(2))) consumed.add(i + 1); });
const targets = argv.filter((a, i) => !a.startsWith('--') && !consumed.has(i));

const SYSTEM = `You are a historian of South Asia reviewing captions for a history channel.
You are adversarial. Your job is to find what is wrong, not to be encouraging.

Each beat has a Devanagari title, an English title, a date, and one line of copy that will
appear on screen as a statement of fact.

Judge each beat and return a verdict:

  "ok"          nothing to change
  "wrong"       the claim is false, or the object/monument belongs to a different dynasty,
                region or century than implied
  "overclaim"   true in substance but stated more strongly than evidence supports — for
                example claiming a "first" that is contested, or attributing to a dynasty
                what its neighbours or successors actually did
  "anachronism" the date and the thing do not belong together
  "script"      the Devanagari is wrong, is actually another script, mixes scripts, or is
                not idiomatic
  "vague"       true but empty — says nothing a viewer could not have guessed

For anything not "ok", supply a corrected "en", "when", "line" and/or "hi" that is
accurate, keeps the same register (line: max 14 words, concrete, makes you want the next
beat), and does not become bland in the process. Prefer FIXING to deleting.

State your reason in one sentence, naming what you are relying on (an inscription, a
attested date range, a scholarly consensus). If a matter is genuinely disputed, say so and
hedge the line rather than picking a side.

Known traps in this material:
- Monuments attributed to the wrong dynasty (Ajanta is Vākāṭaka, not Gupta).
- Empires "falling" to whoever they famously fought (Skandagupta defeated the Hunas).
- Claims of the "first" zero, the "first" university, the "first" hospital.
- Round-number dates presented as precise.
- Devanagari used for regions whose language is Tamil, Kannada or Telugu — for those, the
  Devanagari should transliterate the term, not substitute a different language's word.

Return JSON: { "verdicts": [ { "id", "verdict", "reason", "fix": { "hi"?, "en"?, "when"?, "line"? } } ] }`;

async function check(era) {
  const beats = era.beats.map((b) => ({
    id: b.id, hi: b.era.hi, en: b.era.en, when: b.era.when, line: b.era.line,
    object: b.prompt.slice(0, 140),
  }));
  const user = `Series: ${era.name}\nTagline: ${era.tagline}\n\nBeats:\n${JSON.stringify(beats, null, 2)}`;
  return chatJson(SYSTEM, user, { maxTokens: 9000 });
}

const eras = targets.length ? targets : await listEras();
console.log(`\nchecking ${eras.length} era(s)\n`);

const queue = eras.slice();
const done = [];

async function worker() {
  for (;;) {
    const id = queue.shift();
    if (!id) return;
    try {
      const era = await loadEra(id);
      const { verdicts = [] } = await check(era);
      const byId = new Map(verdicts.map((v) => [v.id, v]));

      const bad = verdicts.filter((v) => v.verdict && v.verdict !== 'ok');
      done.push({ id, total: era.beats.length, bad });

      // the record, so a verdict can be disagreed with later
      const md = [`# ${era.name} — accuracy record`, '',
        `Checked ${new Date().toISOString().slice(0, 10)}. ${bad.length} of ${era.beats.length} beats flagged.`,
        '', '| beat | verdict | reason | correction |', '|---|---|---|---|',
        ...verdicts.map((v) => {
          const f = v.fix || {};
          const fix = [f.hi && `hi: ${f.hi}`, f.en && `en: ${f.en}`, f.when && `when: ${f.when}`, f.line && `line: ${f.line}`]
            .filter(Boolean).join('<br>') || '—';
          return `| \`${v.id}\` | ${v.verdict} | ${String(v.reason || '').replace(/\|/g, '\\|')} | ${fix.replace(/\|/g, '\\|')} |`;
        })].join('\n');
      await writeFile(path.join(ROOT, id, 'facts.md'), `${md}\n`);

      if (APPLY && bad.length) {
        const raw = JSON.parse(await readFile(path.join(ROOT, id, 'era.json'), 'utf8'));
        for (const b of raw.beats) {
          const v = byId.get(b.id);
          if (!v || v.verdict === 'ok' || !v.fix) continue;
          for (const k of ['hi', 'en', 'when', 'line']) if (v.fix[k]) b.era[k] = v.fix[k];
        }
        raw.checked = new Date().toISOString();
        raw.draft = false;
        await writeFile(path.join(ROOT, id, 'era.json'), `${JSON.stringify(raw, null, 2)}\n`);
      }
      console.log(`  ${id.padEnd(18)} ${bad.length}/${era.beats.length} flagged${APPLY && bad.length ? ' — corrections applied' : ''}`);
    } catch (e) {
      console.log(`  ${id.padEnd(18)} FAILED: ${String(e.message).slice(0, 140)}`);
    }
  }
}
await Promise.all(Array.from({ length: Math.max(1, Math.min(CONC, eras.length)) }, worker));

console.log('');
for (const d of done.sort((a, b) => b.bad.length - a.bad.length)) {
  if (!d.bad.length) continue;
  console.log(`\n${d.id}  (${d.bad.length}/${d.total})`);
  for (const v of d.bad) {
    console.log(`  ${v.verdict.toUpperCase().padEnd(12)} ${v.id}`);
    console.log(`               ${v.reason}`);
    if (v.fix?.line) console.log(`               -> "${v.fix.line}"`);
  }
}
const flagged = done.reduce((a, d) => a + d.bad.length, 0);
const total = done.reduce((a, d) => a + d.total, 0);
console.log(`\n${flagged} of ${total} beats flagged across ${done.length} era(s).`);
console.log(`records written to ${ROOT}/<era>/facts.md`);
if (!APPLY) console.log('re-run with --apply to write the corrections into era.json\n');
else console.log('corrections applied; eras are no longer marked draft\n');
