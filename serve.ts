import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
};

function parsePort(argv: string[]): number {
  const flagIndex = argv.indexOf('--port');
  if (flagIndex === -1 || flagIndex + 1 >= argv.length) return 8080;
  const parsed = Number(argv[flagIndex + 1]);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 8080;
}

const port = parsePort(process.argv.slice(2));

const server = createServer((req, res) => {
  const parsedUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
  let pathname: string;
  try {
    pathname = decodeURIComponent(parsedUrl.pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }

  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  const resolvedPath = resolve(join(gameRoot, normalize(pathname)));
  if (resolvedPath !== gameRoot && !resolvedPath.startsWith(gameRoot + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const info = statSync(resolvedPath);
    if (!info.isFile()) {
      res.writeHead(404).end('Not found');
      return;
    }
    const ext = extname(resolvedPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-store',
    });
    createReadStream(resolvedPath).pipe(res);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Feather & Cleaver serving game/ at http://127.0.0.1:${port}`);
});
