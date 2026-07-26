// Vendors the exact webfont subsets the title sequence needs, so the piece runs
// completely offline with zero external requests. Run once: node scripts/fetch-fonts.mjs
import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const OUT = path.resolve(import.meta.dirname, '..', 'vendor', 'fonts');
const KEEP = new Set(['latin', 'latin-ext', 'devanagari']);

const FAMILIES = [
  { slug: 'marcellus', url: 'https://fonts.googleapis.com/css2?family=Marcellus&display=block' },
  { slug: 'cormorant', url: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300&display=block' },
  { slug: 'tiro', url: 'https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:ital@0;1&display=block' },
];

await mkdir(OUT, { recursive: true });
for (const f of await readdir(OUT)) await unlink(path.join(OUT, f));

let css = `/* Vendored Google Fonts subsets (SIL Open Font License 1.1). Fetched by scripts/fetch-fonts.mjs */\n`;
let files = 0;

for (const fam of FAMILIES) {
  const sheet = await (await fetch(fam.url, { headers: { 'User-Agent': UA } })).text();
  const blocks = sheet.split('/*').slice(1);
  let i = 0;
  for (const raw of blocks) {
    const subset = raw.slice(0, raw.indexOf('*/')).trim();
    if (!KEEP.has(subset)) continue;
    const body = raw.slice(raw.indexOf('*/') + 2);
    const url = body.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
    if (!url) continue;
    const name = `${fam.slug}-${subset}-${i++}.woff2`;
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    await writeFile(path.join(OUT, name), buf);
    files++;
    css += `/* ${subset} */\n@font-face{${body.slice(body.indexOf('{') + 1, body.lastIndexOf('}'))
      .replace(/url\(https:\/\/[^)]+\.woff2\)/, `url(./${name})`)
      .replace(/\s+/g, ' ').trim()}}\n`;
  }
}

await writeFile(path.join(OUT, 'fonts.css'), css, 'utf8');
console.log(`vendored ${files} woff2 subsets -> vendor/fonts/fonts.css`);
