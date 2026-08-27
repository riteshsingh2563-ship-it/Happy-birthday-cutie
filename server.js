#!/usr/bin/env node
/**
 * Birthday surprise for Asmita — tiny zero-dependency dev server.
 *
 *  - Serves the static site (index.html, css/, js/)
 *  - Serves /photos/*  -> public/photos/*   (Asmita's real, user-provided photos)
 *  - Serves /music/*   -> public/music/*    (user-provided birthday music)
 *  - POST /api/photos/:name  — best-effort one-time import endpoint:
 *    the visitor's browser (which CAN reach Google Drive) downloads the
 *    real photo and posts it here so it is served locally from then on.
 *
 * Usage:  node server.js          (http://localhost:4173)
 *         PORT=8080 node server.js
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = process.env.PORT ? Number(process.env.PORT) : 4173;
const HOST = process.env.HOST || '0.0.0.0';

const ALLOWED_PHOTO_NAMES = new Set([
  'IMG-20260826-WA0003.jpg',
  'IMG-20260826-WA0004.jpg',
  'IMG-20260826-WA0006.jpg',
  'IMG-20260826-WA0007.jpg',
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function resolveSafe(rootDir, urlPath) {
  const p = path.normalize(path.join(rootDir, urlPath));
  if (p !== rootDir && !p.startsWith(rootDir + path.sep)) return null;
  return p;
}

function serveFile(res, filePath, isHead) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    if (isHead) { res.end(); return; }
    fs.createReadStream(filePath).pipe(res);
  });
}

function handleStatic(req, res) {
  const isHead = req.method === 'HEAD';
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (urlPath === '/' || urlPath === '/index.html') {
    return serveFile(res, path.join(ROOT, 'index.html'), isHead);
  }
  if (urlPath.startsWith('/photos/') || urlPath.startsWith('/music/')) {
    const filePath = resolveSafe(PUBLIC_DIR, urlPath);
    if (!filePath) { res.writeHead(403); return res.end(); }
    return serveFile(res, filePath, isHead);
  }
  const filePath = resolveSafe(ROOT, urlPath);
  if (!filePath) { res.writeHead(403); return res.end(); }
  return serveFile(res, filePath, isHead);
}

function handleImportPhoto(req, res, name) {
  if (!ALLOWED_PHOTO_NAMES.has(name)) {
    return sendJson(res, 400, { ok: false, error: 'unknown photo name' });
  }
  const destDir = path.join(PUBLIC_DIR, 'photos');
  const dest = path.join(destDir, name);
  const MAX = 10 * 1024 * 1024; // 10 MB is plenty for phone photos
  let size = 0;
  let type = req.headers['content-type'] || '';
  const chunks = [];
  const tmp = dest + '.importing';

  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX) {
      sendJson(res, 413, { ok: false, error: 'file too large' });
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('close', () => {
    try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
  });

  req.on('end', () => {
    try {
      const buf = Buffer.concat(chunks);
      const isJpeg = buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8;
      const isPng = buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47;
      const typeOk = /image\/(jpeg|png)/.test(type) || isJpeg || isPng;
      if (!isJpeg && !isPng || !typeOk || buf.length < 2048) {
        return sendJson(res, 400, { ok: false, error: 'not a valid image' });
      }
      fs.mkdirSync(destDir, { recursive: true });
      // atomic write so a half-finished import never serves a broken file
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, dest);
      console.log(`[import] saved photo ${name} (${buf.length} bytes)`);
      return sendJson(res, 200, { ok: true, bytes: buf.length });
    } catch (e) {
      console.error('[import] failed:', e.message);
      return sendJson(res, 500, { ok: false, error: 'import failed' });
    }
  });
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (req.method === 'POST' && urlPath.startsWith('/api/photos/')) {
    const name = decodeURIComponent(urlPath.slice('/api/photos/'.length));
    return handleImportPhoto(req, res, name);
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return handleStatic(req, res);
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method not allowed');
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  Happy Birthday, Asmita ✨');
  console.log(`  -> http://localhost:${PORT}          (the experience)`);
  console.log(`  -> http://localhost:${PORT}/?preview=true   (preview the surprise now)`);
  console.log('');
});
