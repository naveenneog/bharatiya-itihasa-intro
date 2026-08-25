/* Zero-dependency static server for manual preview. `node scripts/serve.mjs [port]`

   The request handling lives in tools/local-server.mjs, which is what the renderers use. This
   was a second copy of it until the two drifted apart in exactly the way that matters: the
   renderers learned to take a free port and wait until the socket answered, and this one kept
   the fixed port and the unhandled EADDRINUSE that made a busy port look like a dead server. */
import { startServer } from '../tools/local-server.mjs';

const want = Number(process.argv[2] || 4321);
const { base } = await startServer({ port: want });
console.log(`serving -> ${base}/`);

