import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const port = Number(process.env.CLIENT_PORT ?? 5173);
const tsc = spawn('tsc', ['-p', 'tsconfig.json', '--watch', '--preserveWatchOutput'], { stdio: 'inherit' });

const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
]);

function safePath(url) {
  const pathname = new URL(url, `http://localhost:${port}`).pathname;
  const candidate = normalize(join('dist', pathname === '/' ? 'index.html' : pathname));
  if (!candidate.startsWith('dist')) throw new Error('Invalid path');
  return candidate;
}

createServer(async (request, response) => {
  try {
    let file = safePath(request.url ?? '/');
    if (file === 'dist/index.html') {
      await readFile('index.html');
    }
    if (file === 'dist/index.html') {
      response.setHeader('content-type', 'text/html; charset=utf-8');
      response.end(await readFile('index.html'));
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    response.setHeader('content-type', types.get(extname(file)) ?? 'application/octet-stream');
    response.end(await readFile(file));
  } catch {
    response.statusCode = 404;
    response.end('Not found. If this is the first run, wait for TypeScript to finish compiling.');
  }
}).listen(port, () => {
  console.log(`Gods.io client available at http://localhost:${port}`);
  console.log('Run `npm run server` in another terminal for multiplayer.');
});

process.on('SIGINT', () => {
  tsc.kill('SIGINT');
  process.exit(0);
});
