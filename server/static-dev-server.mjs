#!/usr/bin/env node
/**
 * Minimal static file server for local PWA testing on the developer's own
 * machine — Node.js built-ins only, no dependencies. Not part of the
 * published app: the deployed site is plain static files served by
 * whatever static host the user picks (GitHub Pages, Cloudflare Pages,
 * Netlify, a plain HTTPS server, ...). This script only exists so
 * START_PWA.bat has something to serve the project root over HTTP with
 * (service workers and manifests need a real http(s) origin — they don't
 * work when a page is opened straight from disk via file://).
 *
 * Usage: node server/static-dev-server.mjs [preferredPort]
 */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREFERRED_PORT = Number(process.argv[2]) || 8000;
const MAX_PORT_ATTEMPTS = 20;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function contentTypeFor(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function resolveFile(urlPath) {
  // Strip query/hash, decode, and prevent escaping the project root.
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const safeRelative = path.normalize(decoded).replace(/^([.][.][/\\])+/, '');
  let filePath = path.join(ROOT, safeRelative);

  if (!filePath.startsWith(ROOT)) return null; // path traversal attempt

  try {
    let st = await stat(filePath);
    if (st.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      st = await stat(filePath);
    }
    if (st.isFile()) return filePath;
  } catch {
    return null;
  }
  return null;
}

function startServer(port, attemptsLeft) {
  const server = http.createServer(async (req, res) => {
    const filePath = await resolveFile(req.url || '/');

    if (!filePath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + req.url);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentTypeFor(filePath),
      // Dev server only: always serve the latest file, never a browser-cached copy.
      'Cache-Control': 'no-cache'
    });
    createReadStream(filePath).pipe(res);
  });

  server.on('error', err => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      startServer(port + 1, attemptsLeft - 1);
    } else {
      console.error('[static-dev-server] failed to start:', err.message);
      process.exit(1);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Serving ${ROOT}`);
    console.log(`LISTENING_PORT=${port}`);
    console.log(`Server listening on http://localhost:${port}/`);
  });
}

startServer(PREFERRED_PORT, MAX_PORT_ATTEMPTS);
