#!/usr/bin/env node
/**
 * Dev Preview — 极简本地预览面板
 *
 * 只做一件事：把 dev server 放进一个 iframe，文件一改就自动刷新。
 * 零依赖，零构建。
 *
 * 启动：node server.mjs   面板：http://127.0.0.1:5199
 */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PANEL_DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(PANEL_DIR, 'public');

const CONFIG = JSON.parse(await fsp.readFile(path.join(PANEL_DIR, 'config.json'), 'utf8'));
const PROJECT = path.resolve(PANEL_DIR, CONFIG.project ?? '..');
const TARGETS = CONFIG.previewTargets ?? [{ label: '本地', url: 'http://127.0.0.1:3000' }];
const IGNORE = new Set(CONFIG.watchIgnore ?? ['node_modules', '.git', 'dist']);
const PORT = Number(process.env.PANEL_PORT ?? CONFIG.port ?? 5199);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

const sseClients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) res.write(payload);
}

function sendJson(res, code, payload) {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

async function serveStatic(res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const abs = path.join(PUBLIC_DIR, rel);
  if (!abs.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: 'forbidden' });
  try {
    const buf = await fsp.readFile(abs);
    res.writeHead(200, {
      'content-type': MIME[path.extname(abs)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const { pathname } = url;

  if (pathname === '/api/targets') {
    return sendJson(res, 200, {
      project: PROJECT,
      targets: TARGETS,
      previewUrl: TARGETS[0].url,
    });
  }

  if (pathname === '/api/preview-health') {
    const wanted = url.searchParams.get('url') ?? TARGETS[0].url;
    if (!TARGETS.some((t) => t.url === wanted)) {
      return sendJson(res, 400, { error: 'unknown preview target' });
    }
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1500);
      const r = await fetch(wanted, { method: 'GET', signal: ctrl.signal });
      clearTimeout(timer);
      return sendJson(res, 200, { ok: r.ok || r.status < 500, status: r.status, url: wanted });
    } catch (err) {
      return sendJson(res, 200, { ok: false, error: String(err.message ?? err), url: wanted });
    }
  }

  if (pathname === '/api/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    res.write('event: hello\ndata: {}\n\n');
    sseClients.add(res);
    const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
    return undefined;
  }

  return serveStatic(res, pathname);
});

// ---------------------------------------------------------------- 文件监听

let watchTimer = null;
try {
  fs.watch(PROJECT, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    const rel = filename.toString().replace(/\\/g, '/');
    if (rel.split('/').some((seg) => IGNORE.has(seg))) return;
    clearTimeout(watchTimer);
    watchTimer = setTimeout(() => broadcast('change', { at: Date.now() }), 250);
  });
} catch (err) {
  console.warn('[dev-preview] 文件监听启动失败:', err.message);
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[dev-preview] 端口 ${PORT} 已被占用，换一个：set PANEL_PORT=5201`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  Dev Preview  已启动');
  console.log(`  项目      ${PROJECT}`);
  console.log(`  预览目标  ${TARGETS.map((t) => `${t.label} ${t.url}`).join(' | ')}`);
  console.log(`  面板      http://127.0.0.1:${PORT}`);
  console.log('');
});
