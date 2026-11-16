#!/usr/bin/env node
// Serves the static export in out/ for `npm run preview`.
// Usage: npm run build && npm run preview [-- --port 4173]
// Dependency-free: no server framework, no file watching, no fallback to dev.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'out');
const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const port = Number(portFlag === -1 ? (process.env.PORT ?? 4173) : args[portFlag + 1]);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(
    `serve-static: "${portFlag === -1 ? process.env.PORT : args[portFlag + 1]}" is not a valid port`,
  );
  process.exit(1);
}

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('serve-static: out/index.html is missing — run `npm run build` first.');
  process.exit(1);
}

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.map', 'application/json; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

function isFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function isDirectory(file) {
  try {
    return fs.statSync(file).isDirectory();
  } catch {
    return false;
  }
}

// Resolves a URL path inside the export root, or returns null when the path
// escapes it. Every candidate is re-checked against the root prefix.
function resolveInside(pathname) {
  const candidate = path.resolve(root, `.${pathname}`);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) return null;
  return candidate;
}

function locate(pathname) {
  const direct = resolveInside(pathname);
  if (!direct) return { status: 400 };
  if (isFile(direct)) return { status: 200, file: direct };
  if (isDirectory(direct)) {
    const index = path.join(direct, 'index.html');
    if (isFile(index)) return { status: 200, file: index };
  }
  // Next writes /twin.html for the /twin route; try the extensionless form too.
  if (!path.extname(direct) && isFile(`${direct}.html`)) {
    return { status: 200, file: `${direct}.html` };
  }
  const notFound = path.join(root, '404.html');
  return isFile(notFound) ? { status: 404, file: notFound } : { status: 404 };
}

function send(res, status, body, headers) {
  res.writeHead(status, { 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}

function sendFile(res, status, file, headers) {
  const stream = fs.createReadStream(file);
  stream.on('error', () => {
    if (res.headersSent) res.destroy();
    else send(res, 500, 'Read error\n', { 'Content-Type': 'text/plain; charset=utf-8' });
  });
  res.writeHead(status, { 'X-Content-Type-Options': 'nosniff', ...headers });
  stream.pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method not allowed\n', {
      'Content-Type': 'text/plain; charset=utf-8',
      Allow: 'GET, HEAD',
    });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  } catch {
    send(res, 400, 'Bad request\n', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }
  if (pathname.includes('\0') || pathname.includes('\\')) {
    send(res, 400, 'Bad request\n', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  const { status, file } = locate(pathname);
  if (!file) {
    send(res, status, 'Not found\n', { 'Content-Type': 'text/plain; charset=utf-8' });
    console.log(`${req.method} ${req.url} ${status}`);
    return;
  }

  const type = MIME.get(path.extname(file).toLowerCase()) ?? 'application/octet-stream';
  const cache = pathname.startsWith('/_next/static/')
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';
  const headers = {
    'Content-Type': type,
    'Cache-Control': cache,
    'Content-Length': fs.statSync(file).size,
  };

  if (req.method === 'HEAD') {
    res.writeHead(status, { 'X-Content-Type-Options': 'nosniff', ...headers });
    res.end();
  } else {
    sendFile(res, status, file, headers);
  }
  console.log(`${req.method} ${req.url} ${status}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`serve-static: port ${port} is already in use — pass --port <n>.`);
  } else {
    console.error(`serve-static: ${error.message}`);
  }
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Helios static preview — http://localhost:${port}`);
  console.log(`Serving ${root}`);
  console.log('Ctrl+C to stop.');
});
