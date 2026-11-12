#!/usr/bin/env node
/**
 * 本地开发用的识别接口（等价于 Vercel / Worker 上的 /api/recognize）
 *
 * 为什么需要它：智谱、百炼这些国内服务不返回 CORS 头，
 * 浏览器直连会被拦（Failed to fetch）。本地开发时用这个本地中转就能跑通，
 * 线上则用 api/recognize.js（Vercel）或 worker/（Cloudflare）。
 *
 * 用法：
 *   node scripts/dev-api.mjs            # 监听 8787
 *   PORT=8788 node scripts/dev-api.mjs
 *
 * 然后在 .env.local 里：
 *   VITE_RECOGNIZE_ENDPOINT=http://127.0.0.1:8787/api/recognize
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_BASE64, recognize } from '../shared/recognize-core.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 从 .env 文件读配置，省得再开一个 shell 设变量 */
function loadEnvFiles(files) {
  const env = {};
  for (const name of files) {
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index < 0) continue;
      env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
    }
  }
  return env;
}

// .env.development.local 优先级最高（Key 放这里），其次是 .env.local
const env = {
  ...loadEnvFiles(['.env.local', '.env.development.local']),
  ...process.env,
};
const provider = env.VITE_VISION_PROVIDER || 'zhipu';
const apiKey = env.VISION_API_KEY || env.VITE_VISION_API_KEY;
const model = env.VISION_MODEL || env.VITE_VISION_MODEL;
const port = Number(env.PORT || 8787);

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

let devVisits = 0;

function send(res, status, payload) {
  res.writeHead(status, { ...cors, 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }

  // 访问计数（本地只放内存，重启归零）
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  if (url.pathname === '/api/hit') {
    if (req.method === 'POST') devVisits += 1;
    return send(res, 200, { count: devVisits });
  }

  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });

  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > MAX_BASE64 * 1.4) req.destroy();
  });

  req.on('end', async () => {
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return send(res, 400, { error: 'invalid json' });
    }

    const { mimeType, data } = body ?? {};
    if (typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
      return send(res, 400, { error: 'image required' });
    }
    if (typeof data !== 'string' || data.length < 100) {
      return send(res, 400, { error: 'image required' });
    }
    if (data.length > MAX_BASE64) return send(res, 413, { error: 'image too large' });

    const started = Date.now();
    const result = await recognize({ provider, model, apiKey, mimeType, data });
    const ms = Date.now() - started;

    if (result.ok) {
      console.log(`[dev-api] ${provider}/${result.model} ${result.sinners.length} 位 ${ms}ms`);
      return send(res, 200, { sinners: result.sinners, model: result.model, ms });
    }

    console.log(`[dev-api] 失败 ${result.status} ${String(result.detail).slice(0, 120)}`);
    return send(res, result.status, { error: result.error, detail: result.detail });
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log('');
  console.log('  本地识别接口已启动');
  console.log(`  地址      http://127.0.0.1:${port}/api/recognize`);
  console.log(`  服务      ${provider}${model ? ` / ${model}` : ''}`);
  console.log(`  Key       ${apiKey ? '已配置' : '缺失！在 .env.local 里写 VITE_VISION_API_KEY=...'}`);
  console.log('');
});
