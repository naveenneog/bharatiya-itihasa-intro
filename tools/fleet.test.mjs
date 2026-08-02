/* The Sora fleet: dispatch, pinning, and the back-off law.

   Worth pinning because every failure here is silent and expensive. A lane that is handed a slot
   it does not own mis-attributes throttles; a waiter pinned to a busy lane that blocks the queue
   stalls a run that had capacity sitting idle; a back-off step larger than the ceiling can never
   find the ceiling. None of it throws, and all of it looks like "generation is a bit slow today".

   No network: the fleet is exercised directly.

     node tools/fleet.test.mjs
*/
import { soraFleet } from './azure.mjs';

let pass = 0;
const fails = [];
const eq = (label, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { pass++; return; }
  fails.push(`${label}\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`);
};

const fleet = soraFleet;
const reset = (limits) => {
  fleet.quiet = true;
  fleet.lanes.length = 0;
  for (const [name, limit] of Object.entries(limits)) {
    const l = fleet.lane(name);
    l.limit = limit; l.min = 1; l.max = 12; l.active = 0; l.clean = 0; l.throttles = 0; l.done = 0;
  }
};
const settle = () => new Promise((r) => setImmediate(r));

// ── dispatch spreads across lanes ─────────────────────────────────────────
{
  reset({ a: 2, b: 2 });
  const got = [];
  for (let i = 0; i < 4; i++) got.push((await fleet.acquire()).name);
  eq('four jobs fill both lanes', got.sort(), ['a', 'a', 'b', 'b']);
  eq('both lanes full', fleet.lanes.map((l) => l.active), [2, 2]);
}

// ── a fifth job waits, and is released to the lane that frees ─────────────
{
  reset({ a: 1, b: 1 });
  const one = await fleet.acquire();
  const two = await fleet.acquire();
  let third = null;
  fleet.acquire().then((l) => { third = l.name; });
  await settle();
  eq('third job waits', third, null);
  fleet.release(one);
  await settle();
  eq('third job takes the freed lane', third, one.name);
  fleet.release(two);
}

// ── a pinned job holds a slot on the lane it actually runs on ─────────────
{
  reset({ a: 4, b: 4 });
  const l = await fleet.acquire('b');
  eq('pinned to b', l.name, 'b');
  eq('b is the lane charged', fleet.lanes.map((x) => x.active), [0, 1]);
}

// ── a pinned waiter must not block one that could run now ─────────────────
{
  reset({ a: 1, b: 1 });
  const onA = await fleet.acquire('a');
  await fleet.acquire('b');
  const order = [];
  fleet.acquire('a').then(() => order.push('pinned-a'));   // blocked: a is full
  fleet.acquire('a').then(() => order.push('pinned-a2'));  // also blocked
  await settle();
  eq('both pinned waiters queued', order, []);
  fleet.release(onA);
  await settle();
  eq('head of the queue runs, the rest keep waiting', order, ['pinned-a']);
}

// ── an unknown deployment gets a lane rather than an exception ────────────
{
  reset({ a: 2 });
  const l = await fleet.acquire('sora-3-imaginary');
  eq('named lane created', l.name, 'sora-3-imaginary');
  eq('fleet now has two lanes', fleet.lanes.length, 2);
}

// ── back-off converges on a small ceiling instead of overshooting it ──────
{
  reset({ a: 6 });
  const [lane] = fleet.lanes;
  const steps = [];
  for (let i = 0; i < 4; i++) { fleet.throttled(lane, 'test'); steps.push(lane.limit); }
  eq('6 -> 4 -> 3 -> 2 -> 1, never skipping 2', steps, [4, 3, 2, 1]);
}

// ── clean finishes ramp back up, but only after a run of them ─────────────
{
  reset({ a: 2 });
  const [lane] = fleet.lanes;
  lane.clear = 3;
  fleet.finished(lane); fleet.finished(lane);
  eq('two clean finishes do not raise the limit', lane.limit, 2);
  fleet.finished(lane);
  eq('the third does', lane.limit, 3);
  eq('the counter resets', lane.clean, 0);
}

// ── a throttle cancels progress toward a raise ────────────────────────────
{
  reset({ a: 4 });
  const [lane] = fleet.lanes;
  lane.clear = 3;
  fleet.finished(lane); fleet.finished(lane);
  fleet.throttled(lane, 'test');
  fleet.finished(lane);
  eq('a throttle resets the clean run', lane.limit, 3);
}

// ── a lane cannot be driven below its floor ───────────────────────────────
{
  reset({ a: 2 });
  const [lane] = fleet.lanes;
  for (let i = 0; i < 10; i++) fleet.throttled(lane, 'test');
  eq('floors at min', lane.limit, 1);
}

console.log(`\n  ${pass} passed${fails.length ? `, ${fails.length} FAILED` : ''}`);
for (const f of fails) console.log(`\n  ✗ ${f}`);
process.exit(fails.length ? 1 : 0);
