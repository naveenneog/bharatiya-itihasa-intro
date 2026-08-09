/* The static server the renderers point a browser at, running inside the same process.

   It used to be a spawned child on a fixed port:

     spawn(node, ['scripts/serve.mjs', '4407'], { stdio: 'ignore' })
     process.on('exit', () => server.kill())
     await sleep(700)

   Three faults in four lines, and together they cost more than a day of unattended runs.

   The port is fixed, so a leftover server from an earlier run owns it. serve.mjs does not handle
   EADDRINUSE and stdio is ignored, so the new one dies silently. The 700 ms wait is a guess
   rather than a check, so the render then drives a browser at a port nothing is listening on.
   And killing the child only in `process.on('exit')` cannot work when the child is itself what
   keeps the event loop alive — the classic node deadlock, which showed up as `render-episode`
   and `serve.mjs` sitting side by side for 28 hours having written zero frames.

   Running it in-process removes all three at once. There is no child to orphan, no exit handler
   to deadlock, and port 0 asks the operating system for one that is free rather than hoping. The
   caller gets the real port back and closes it in a finally. */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webm': 'video/webm', '.mp4': 'video/mp4',
};

/** Serve the repo on a free port. Resolves once it is actually accepting connections. */
export async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
      const info = await stat(file).catch(() => null);
      if (!info?.isFile()) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(await readFile(file));
    } catch (e) { res.writeHead(500).end(String(e)); }
  });

  /* Sockets are tracked so stop() can end them. An open keep-alive connection from the browser
     will hold close() open indefinitely otherwise, which would reintroduce the hang this file
     exists to remove. */
  const sockets = new Set();
  server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });

  const port = await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });

  return {
    port,
    base: `http://127.0.0.1:${port}`,
    stop: () => new Promise((resolve) => {
      for (const s of sockets) { try { s.destroy(); } catch { /* gone */ } }
      server.close(() => resolve());
    }),
  };
}
