/* Era playlists for the history episodes: create them, and add episodes to them by video id.

   Studio has no "Add videos" on a playlist's own page, and the creation dialog's picker lists
   videos by title, which is not unique on this channel (two public long-form videos are called
   "Brahmagupta and the Birth of Zero"). So a playlist is created empty, and each episode is added
   from its own edit page, where every playlist is a checkbox carrying the playlist's id
   (ytcp-checkbox-lit[test-id]). Neither path touches anything else on the video.

     node tools/yt-playlist.mjs list
     node tools/yt-playlist.mjs create --era gupta --title "..." --description "..." [--go]
     node tools/yt-playlist.mjs add --playlist <playlist id> --ids a,b,c [--go]
     node tools/yt-playlist.mjs sync [--go]
     node tools/yt-playlist.mjs describe --playlist <id> [--title "..."] [--description "..."] [--go]

   create: refuses a title that already exists, and an era that already has a playlist; makes the
   playlist Public with the default order "Date published (oldest)", so episodes appear in release
   order. add: per video, reads the visibility card (for a scheduled video, its stored date and
   time too), ticks the playlist's box, Done, Save, waits for Save to go disabled, reloads, and
   confirms the box is ticked and the card and schedule unchanged; a video already in the
   playlist is skipped.
   sync: for every era playlist, adds the era's episodes (dist/<era>/<slug>_book) that are public,
   or scheduled for today (IST), per dist/yt-channel.json. A scheduled episode is added on its
   own day, not before, so that viewers do not see a list of hidden private videos; and it lists
   the eras that have no playlist yet, with their first date. It then reads each playlist's public
   page signed out (count, hidden notice, views), fails if fewer videos show than the public
   episodes recorded in it, and with --go records the views by day.
   describe: fixes a playlist's title and/or description from its own edit page
   (studio.youtube.com/playlist/<id>/edit), which has the same two contenteditable fields as the
   creation dialog. Reads the current text first, so a dry run shows the actual change; Save,
   reload, and confirm the field reads back what was set. All four are dry by default and record
   what they did in dist/playlists.json. Only one process may drive the browser
   profile at a time. */
import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';

const argv = process.argv.slice(2);
const cmd = argv[0];
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const GO = argv.includes('--go');
const CHANNEL = 'UCGYbLzah4VnRM1NVL7W8mVA';
const REG = 'dist/playlists.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

const reg = JSON.parse(await readFile(REG, 'utf8').catch(() => '{"playlists":{}}'));
const saveReg = () => writeFile(REG, `${JSON.stringify(reg, null, 2)}\n`);
/* Any video's edit page shows the full list of playlists; the first feed Short is a stable one. */
const REF = arg('ref', JSON.parse(await readFile('dist/feed-shorts.json', 'utf8'))[0]?.id);

if (!['list', 'create', 'add', 'sync', 'describe'].includes(cmd)) {
  console.error('usage: node tools/yt-playlist.mjs list | create --era <era> --title "..." --description "..." [--go] | add --playlist <id> --ids a,b [--go] | sync [--go]');
  process.exit(1);
}

/* Every uploaded long-form episode, by era: { era, slug, id }. publish-log is the later record,
   so its id wins over the upload ledger's. */
async function episodesByEra() {
  const up = JSON.parse(await readFile('dist/uploads.json', 'utf8')).uploads || {};
  const log = JSON.parse(await readFile('dist/publish-log.json', 'utf8').catch(() => '{}'));
  const eps = new Map();
  const key = (d) => d.match(/^dist\/([^/]+)\/(.+)_book$/);
  for (const [d, v] of Object.entries(up)) {
    const k = key(d);
    if (k && v.exit === 0 && v.url) eps.set(d, { era: k[1], slug: k[2], id: String(v.url).replace(/^.*\//, '') });
  }
  for (const [d, v] of Object.entries(log)) {
    const k = key(d);
    if (k && v.id) eps.set(d, { era: k[1], slug: k[2], id: v.id });
  }
  return [...eps.values()];
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const istDate = (ms) => { const d = new Date(ms + 5.5 * 3600e3); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };
const whenMs = (when) => Date.parse(`${when} 00:00 GMT+0530`);

/* The playlist as a signed-out viewer gets it: the video count, the playlist's views, and the
   "N unavailable videos are hidden" notice. Read from the public page, not Studio, so a playlist
   that went private or lost its videos shows up. Both counts come from the same metadataParts
   info card ("Playlist", then the video count, then the view count) rather than the page's
   separate "stats" line, because that line is absent on a freshly created, still-empty playlist
   — found 10 Oct — where metadataParts still renders, reading "No videos" and "No views". (The
   page also carries localisation strings such as "VIDEO_COUNT":{"case1":"1 video"}; not used.) */
async function publicView(pid) {
  try {
    const res = await fetch(`https://www.youtube.com/playlist?list=${pid}&hl=en`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36', 'Accept-Language': 'en-US' },
    });
    const s = await res.text();
    const card = s.match(/"metadataParts":\[\{"text":\{"content":"Playlist"\}\},\{"text":\{"content":"(No videos|[\d,]+ videos?)"\}\},\{"text":\{"content":"(No views|[\d,.]+[KM]? views?)"\}\}/);
    const videos = card?.[1];
    const views = card?.[2];
    const hidden = (s.match(/(\d+) unavailable videos? (?:is|are) hidden/) || [])[1];
    return {
      videos: videos === undefined ? null : (videos === 'No videos' ? 0 : Number(videos.replace(/ videos?$/, '').replace(/,/g, ''))),
      views: views === undefined ? null : (views === 'No views' ? 0 : views.replace(/ views?$/, '')),
      hidden: hidden === undefined ? 0 : Number(hidden),
    };
  } catch { return null; }
}

let ctx = null;
let page = null;
async function browser() {
  if (ctx) return;
  ctx = await chromium.launchPersistentContext('C:\\Users\\navg\\.copilot\\playwright-youtube-profile',
    { channel: 'msedge', headless: false, viewport: { width: 1400, height: 1000 } });
  page = ctx.pages()[0] || await ctx.newPage();
}

/* A scheduled video's card says only "Scheduled"; its date and time are in the visibility dialog,
   which opens with the stored values in it (as in tools/yt-reschedule.mjs). Escape closes it
   unchanged, which is confirmed by Save staying disabled. */
async function readSchedule() {
  await page.locator('ytcp-video-metadata-visibility [role=button]').first().click({ timeout: 15000 });
  await sleep(2500);
  let time = '';
  const inputs = page.locator('tp-yt-paper-dialog input, ytcp-video-metadata-visibility input');
  for (let i = 0; i < await inputs.count(); i++) {
    const v = (await inputs.nth(i).inputValue().catch(() => '')) || '';
    if (/(AM|PM)/i.test(v)) { time = norm(v); break; }
  }
  const date = norm(await page.locator('#datepicker-trigger').first().innerText().catch(() => ''));
  await page.keyboard.press('Escape');
  await sleep(1200);
  if (!date || !time) throw new Error('could not read the stored date and time of a scheduled video');
  if (await page.getByRole('button', { name: /^Save$/i }).first().isEnabled().catch(() => false)) throw new Error('reading the schedule left unsaved changes');
  return `${date} ${time}`;
}

async function openPicker(videoId) {
  await browser();
  await page.goto(`https://studio.youtube.com/video/${videoId}/edit`, { waitUntil: 'domcontentloaded' });
  await sleep(8000);
  let vis = norm(await page.locator('ytcp-video-metadata-visibility').first().innerText().catch(() => ''));
  if (/scheduled/i.test(vis)) vis = `${vis} ${await readSchedule()}`;
  const trigger = page.locator('ytcp-video-metadata-playlists ytcp-dropdown-trigger, ytcp-video-metadata-playlists [role=button]').first();
  await trigger.scrollIntoViewIfNeeded().catch(() => {});
  await trigger.click({ timeout: 15000 });
  await page.locator('ytcp-checkbox-lit[test-id]').first().waitFor({ timeout: 15000 });
  await sleep(800);
  return vis;
}
async function closePicker() {
  await page.keyboard.press('Escape');
  await sleep(1000);
}
/* Every playlist the picker shows: { id, title, checked }. */
async function readPicker() {
  return page.locator('ytcp-checkbox-lit[test-id]').evaluateAll((els) => els.map((e) => ({
    id: e.getAttribute('test-id'),
    title: (e.closest('li, label')?.innerText || '').replace(/\s+/g, ' ').trim(),
    checked: e.querySelector('[role=checkbox]')?.getAttribute('aria-checked') === 'true',
  })));
}

/* Adds each id to playlist pid; returns { added, already, failed }. */
async function addTo(pid, ids) {
  let added = 0; let already = 0; let failed = 0;
  for (const id of ids) {
    try {
      const vis = await openPicker(id);
      const box = page.locator(`ytcp-checkbox-lit[test-id="${pid}"] [role=checkbox]`).first();
      if (!(await box.count())) throw new Error(`no playlist ${pid} in the picker`);
      const title = norm(await page.locator(`ytcp-checkbox-lit[test-id="${pid}"]`).first().evaluate((e) => e.closest('li, label')?.innerText || ''));
      if ((await box.getAttribute('aria-checked')) === 'true') {
        await closePicker(); already++;
        if (GO && reg.playlists[pid] && !reg.playlists[pid].videos[id]) {
          reg.playlists[pid].videos[id] = { at: new Date().toISOString(), visibility: vis, found: 'already in the playlist' };
          await saveReg();
        }
        console.log(`  ${id}  already in "${title}"  [${vis}]`);
        continue;
      }
      if (!GO) { await closePicker(); console.log(`  ${id}  would add to "${title}"  [${vis}]  (dry run)`); continue; }
      /* The inner [role=checkbox] never reads as stable to Playwright; the outer element takes the click. */
      await page.locator(`ytcp-checkbox-lit[test-id="${pid}"]`).first().click({ timeout: 8000 });
      await sleep(600);
      if ((await box.getAttribute('aria-checked')) !== 'true') throw new Error('the box did not tick');
      await page.getByRole('button', { name: /^Done$/ }).last().click({ timeout: 8000 });
      await sleep(1500);
      const save = page.getByRole('button', { name: /^Save$/i }).first();
      if (!(await save.isEnabled().catch(() => false))) throw new Error('Save is not enabled after ticking');
      await save.click({ timeout: 8000 });
      /* Studio disables Save once the change is stored; leaving before that can drop it. */
      const until = Date.now() + 30000;
      while (Date.now() < until && await save.isEnabled().catch(() => false)) await sleep(500);
      if (await save.isEnabled().catch(() => false)) throw new Error('Save is still enabled 30 s after clicking it');
      await sleep(2000);
      const visAfter = await openPicker(id);
      const ok = (await page.locator(`ytcp-checkbox-lit[test-id="${pid}"] [role=checkbox]`).first().getAttribute('aria-checked')) === 'true';
      await closePicker();
      if (!ok) throw new Error('after reload the box is not ticked');
      if (visAfter !== vis) throw new Error(`visibility card changed: "${vis}" -> "${visAfter}"`);
      reg.playlists[pid] = reg.playlists[pid] || { title, videos: {} };
      reg.playlists[pid].videos[id] = { at: new Date().toISOString(), visibility: vis };
      await saveReg();
      added++;
      console.log(`  ${id}  added to "${title}", confirmed  [${vis}]`);
    } catch (e) {
      failed++;
      await page?.screenshot({ path: `dist/probe/yt-playlist-${id}.png` }).catch(() => {});
      console.log(`  ${id}  FAILED: ${String(e.message).split('\n')[0]}  (page: dist/probe/yt-playlist-${id}.png)`);
      await closePicker().catch(() => {});
    }
  }
  return { added, already, failed };
}

let code = 0;
try {
  if (cmd === 'list') {
    await openPicker(REF);
    for (const p of await readPicker()) console.log(`  ${p.id.padEnd(16)} ${p.title}`);
    await closePicker();
  }

  if (cmd === 'create') {
    const title = norm(arg('title', ''));
    const description = arg('description', '');
    const era = arg('era', null);
    if (!title || title.length > 150) throw new Error('--title is required (150 characters at most)');
    if (!era) throw new Error('--era is required (the dist/<era> bucket whose episodes sync adds)');
    if (!(await episodesByEra()).some((e) => e.era === era)) throw new Error(`no uploaded episodes in era "${era}"`);
    const has = Object.entries(reg.playlists).find(([, p]) => p.era === era);
    if (has) throw new Error(`era "${era}" already has a playlist: ${has[0]} "${has[1].title}"`);
    await openPicker(REF);
    const before = await readPicker();
    await closePicker();
    const dup = before.find((p) => p.title === title);
    if (dup) throw new Error(`a playlist called "${title}" already exists: ${dup.id}`);
    console.log(`  create "${title}" (Public, Date published (oldest))\n    ${description}`);
    if (!GO) { console.log('    dry run: nothing created (pass --go)'); }
    else {
      await page.goto(`https://studio.youtube.com/channel/${CHANNEL}/content/playlists`, { waitUntil: 'domcontentloaded' });
      await sleep(7000);
      await page.getByRole('button', { name: /^Create$/ }).first().click({ timeout: 10000 });
      await sleep(1200);
      await page.getByText('New playlist', { exact: true }).first().click({ timeout: 10000 });
      await sleep(3000);
      const dlg = page.locator('tp-yt-paper-dialog:visible, ytcp-dialog:visible').filter({ hasText: 'Create a new playlist' }).last();
      await dlg.locator('[aria-label="Add title"]').first().fill(title);
      if (description) await dlg.locator('[aria-label="Add description"]').first().fill(description);
      const text = norm(await dlg.innerText());
      if (!/Visibility\s+Public/i.test(text)) throw new Error(`visibility is not Public in the dialog: "${text.slice(0, 200)}"`);
      await dlg.getByText('Date published (newest)', { exact: true }).first().click({ timeout: 8000 });
      await sleep(1200);
      await page.locator('tp-yt-paper-item:visible').filter({ hasText: /^\s*Date published \(oldest\)\s*$/ }).first().click({ timeout: 8000 });
      await sleep(1000);
      if (!/Date published \(oldest\)/.test(norm(await dlg.innerText()))) throw new Error('the default order did not change to Date published (oldest)');
      await dlg.getByRole('button', { name: /^Create$/ }).first().click({ timeout: 10000 });
      await sleep(6000);
      await openPicker(REF);
      const after = await readPicker();
      await closePicker();
      const made = after.filter((p) => p.title === title);
      if (made.length !== 1) throw new Error(`after creating, the picker shows ${made.length} playlist(s) called "${title}"`);
      reg.playlists[made[0].id] = { era, title, description, order: 'Date published (oldest)', createdAt: new Date().toISOString(), videos: {} };
      await saveReg();
      console.log(`    created ${made[0].id}`);
    }
  }

  if (cmd === 'add') {
    const pid = arg('playlist', null);
    const ids = String(arg('ids', '')).split(',').map((s) => s.trim()).filter(Boolean);
    if (!pid || !ids.length) throw new Error('add needs --playlist <id> and --ids a,b,c');
    const r = await addTo(pid, ids);
    console.log(`\n  added ${r.added}, already there ${r.already}, failed ${r.failed}${GO ? '' : ' (dry run)'}`);
    if (r.failed) code = 1;
  }

  if (cmd === 'sync') {
    const chan = JSON.parse(await readFile('dist/yt-channel.json', 'utf8'));
    const ageH = (Date.now() - Date.parse(chan.at)) / 3600e3;
    if (!(ageH < 30)) throw new Error(`dist/yt-channel.json is ${ageH.toFixed(0)} h old; run tools/yt-scan.mjs first`);
    const rows = new Map(chan.rows.map((r) => [r.id, r]));
    /* --today "Oct 20, 2026" previews another day's additions; it is refused with --go. */
    const today = arg('today', istDate(Date.now()));
    if (arg('today', null) && GO) throw new Error('--today is for previews only; it cannot be combined with --go');
    const eps = (await episodesByEra()).map((e) => ({ ...e, row: rows.get(e.id) })).filter((e) => e.row);
    const withList = new Map(Object.entries(reg.playlists).filter(([, p]) => p.era).map(([pid, p]) => [p.era, pid]));
    let failed = 0;
    for (const [era, pid] of withList) {
      const p = reg.playlists[pid];
      const mine = eps.filter((e) => e.era === era && !p.videos[e.id]);
      const due = mine.filter((e) => e.row.state === 'PUBLIC' || (e.row.state === 'SCHEDULED' && e.row.when === today));
      const later = mine.filter((e) => e.row.state === 'SCHEDULED' && e.row.when !== today);
      console.log(`${era}: ${pid} "${p.title}" — ${Object.keys(p.videos).length} in, ${due.length} due today, ${later.length} scheduled later${later.length ? ` (next ${later.map((e) => e.row.when).sort((a, b) => whenMs(a) - whenMs(b))[0]})` : ''}`);
      if (!due.length) continue;
      if (!GO) { for (const e of due) console.log(`  ${e.id}  would add (${e.row.state}${e.row.when ? ` ${e.row.when}` : ''})  ${e.row.title}`); continue; }
      const r = await addTo(pid, due.map((e) => e.id));
      failed += r.failed;
    }
    const soon = Date.now() + 14 * 86400e3;
    for (const era of [...new Set(eps.map((e) => e.era))].filter((x) => !withList.has(x)).sort()) {
      const mine = eps.filter((e) => e.era === era && /PUBLIC|SCHEDULED/.test(e.row.state));
      if (!mine.length) continue;
      const pub = mine.filter((e) => e.row.state === 'PUBLIC').length;
      const first = mine.filter((e) => e.row.when).map((e) => e.row.when).sort((a, b) => whenMs(a) - whenMs(b))[0];
      const due = pub > 0 || (first && whenMs(first) <= soon);
      console.log(`${era}: no playlist — ${pub} public, ${mine.length - pub} scheduled${first ? `, first scheduled ${first}` : ''}${due ? '  <- create one (an episode is public or within 14 days)' : ''}`);
    }
    /* What viewers get. Every public episode recorded in a playlist should be visible on its page. */
    console.log('\npublic pages (signed out):');
    for (const [era, pid] of withList) {
      const p = reg.playlists[pid];
      const v = await publicView(pid);
      const pubIn = Object.keys(p.videos).filter((id) => rows.get(id)?.state === 'PUBLIC').length;
      if (!v || v.videos === null) { console.log(`  ${era}: ${pid}  public page NOT READ`); code = 1; continue; }
      const shown = v.videos - v.hidden;
      const ok = shown >= pubIn;
      console.log(`  ${era}: ${pid}  ${shown} shown${v.hidden ? ` + ${v.hidden} hidden` : ''}, ${v.views} views${ok ? '' : `  <- MISMATCH: ${pubIn} public episodes recorded in it`}`);
      if (!ok) code = 1;
      if (GO) { p.views = p.views || {}; p.views[istDate(Date.now())] = v.views; }
    }
    if (GO) await saveReg();
    if (!GO) console.log('\n  dry run: nothing added (pass --go)');
    if (failed) code = 1;
  }

  if (cmd === 'describe') {
    const pid = arg('playlist', null);
    const newTitle = arg('title', null);
    const newDesc = arg('description', null);
    if (!pid) throw new Error('describe needs --playlist <id>');
    if (newTitle === null && newDesc === null) throw new Error('describe needs --title and/or --description');
    await browser();
    await page.goto(`https://studio.youtube.com/playlist/${pid}/edit`, { waitUntil: 'domcontentloaded' });
    await sleep(6000);
    const titleBox = page.locator('[aria-label="Add title"], [aria-label="Playlist title"]').first();
    const descBox = page.locator('[aria-label="Add description"], [aria-label="Playlist description"]').first();
    if (!(await titleBox.count())) throw new Error(`playlist ${pid} not found (its edit page has no title field)`);
    const before = { title: norm(await titleBox.innerText()), description: norm(await descBox.innerText()) };
    console.log(`  ${pid}  current title: "${before.title}"`);
    console.log(`  ${pid}  current description: "${before.description}"`);
    const want = { title: newTitle === null ? before.title : norm(newTitle), description: newDesc === null ? before.description : norm(newDesc) };
    if (want.title === before.title && want.description === before.description) { console.log('    already set to that'); }
    else {
      console.log(`    -> title: "${want.title}"`);
      console.log(`    -> description: "${want.description}"`);
      if (!GO) { console.log('    dry run: nothing changed (pass --go)'); }
      else {
        if (newTitle !== null) await titleBox.fill(newTitle);
        if (newDesc !== null) await descBox.fill(newDesc);
        const save = page.getByRole('button', { name: /^Save$/i }).first();
        if (!(await save.isEnabled().catch(() => false))) throw new Error('Save is not enabled after editing');
        await save.click({ timeout: 8000 });
        await sleep(4000);
        await page.goto(`https://studio.youtube.com/playlist/${pid}/edit`, { waitUntil: 'domcontentloaded' });
        await sleep(6000);
        const after = { title: norm(await titleBox.innerText()), description: norm(await descBox.innerText()) };
        const ok = after.title === want.title && after.description === want.description;
        console.log(`    after reload: title "${after.title}", description "${after.description}"  -> ${ok ? 'saved, confirmed' : 'NOT CONFIRMED'}`);
        if (!ok) throw new Error('the saved title/description does not match what was set');
        if (reg.playlists[pid]) { reg.playlists[pid].title = after.title; reg.playlists[pid].description = after.description; await saveReg(); }
      }
    }
  }
} catch (e) {
  code = 1;
  await page?.screenshot({ path: `dist/probe/yt-playlist-${cmd}.png` }).catch(() => {});
  console.log(`  FAILED: ${String(e.message).split('\n')[0]}${page ? `  (page: dist/probe/yt-playlist-${cmd}.png)` : ''}`);
} finally {
  if (ctx) await ctx.close();
}
process.exitCode = code;
