/* Does every tool still parse?

   `episode-page.mjs` returns the whole player as one template literal, and a backtick
   anywhere inside it — including inside a comment — silently ends the string and produces a
   syntax error hundreds of lines away. That has now happened three times: once in a CSS
   comment, once writing a property name, once naming a class.

   It is caught instantly by parsing the file, and never caught by reading it. So parse them
   all, and say which one broke.

     npm run check
*/
import { readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileP = promisify(execFile);

const dirs = ['tools', 'scripts', 'src'];
const files = [];
for (const d of dirs) {
  for (const f of await readdir(d).catch(() => [])) {
    if (/\.m?js$/.test(f)) files.push(path.join(d, f));
  }
}

const bad = [];
for (const f of files) {
  try {
    await execFileP(process.execPath, ['--check', f]);
  } catch (e) {
    bad.push([f, String(e.stderr || e.message).split('\n').slice(0, 4).join('\n')]);
  }
}

for (const [f, err] of bad) console.error(`\n${f}\n${err}`);
console.log(`\n${files.length - bad.length}/${files.length} parse`);
if (bad.length) process.exit(1);
