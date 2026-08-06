/* How to hand ffmpeg a filter graph that is too long for a command line.

   The graphs here run to tens of kilobytes, so they are written to a file rather than passed
   inline. The option that reads them was renamed:

     ffmpeg < 8      -filter_complex_script FILE
     ffmpeg >= 7.1   -/filter_complex FILE      (the generic "read this option from a file" form)
     ffmpeg >= 8     -filter_complex_script removed entirely

   winget updated ffmpeg from 7 to 9 between one era and the next, and every intro and master
   render began failing with "Unrecognized option 'filter_complex_script'". Nothing in the repo
   had changed. Four Pallava stories died at the same stage before it was caught, which is what a
   silent toolchain upgrade under a long unattended run looks like.

   The version is read once per process rather than assumed, because that is the thing that
   actually decides it. */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

let cached = null;

/** Major version of the ffmpeg on PATH, or null when it cannot be read. */
async function ffmpegMajor() {
  if (cached !== null) return cached;
  const { stdout } = await execFileP('ffmpeg', ['-version']).catch(() => ({ stdout: '' }));
  const m = stdout.match(/ffmpeg version n?(\d+)/i);
  cached = m ? Number(m[1]) : null;
  return cached;
}

/** The argument pair that feeds `file` to ffmpeg as the complex filter graph. */
export async function filterScript(file) {
  const major = await ffmpegMajor();
  /* Unknown version is treated as new: the old spelling is the one that has been removed, so
     guessing it would fail outright, while the new one works on everything from 7.1. */
  return major !== null && major < 7 ? ['-filter_complex_script', file] : ['-/filter_complex', file];
}
