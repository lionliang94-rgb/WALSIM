/**
 * 碎片识别代理 — Cloudflare Worker 外壳
 *
 * 业务逻辑在 ../shared/recognize-core.js，和 Vercel 版本共用一份。
 * 部署见同目录 README.md。
 */
import { MAX_BASE64, recognize } from '../shared/recognize-core.js';

const RATE_LIMIT = 12; // 每个 IP 每 10 分钟
const RATE_WINDOW_MS = 10 * 60 * 1000;

// 单 isolate 内存计数，够挡住随手刷接口的人；不是精确的全局配额
const hits = new Map();

function takeToken(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true };
  }
  if (entry.count >= RATE_LIMIT) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true };
}

function corsHeaders(request, env) {
  const allow = (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = request.headers.get('origin') || '';
  const allowed = allow.includes('*') || allow.includes(origin) ? origin || '*' : allow[0];
  return {
    'access-control-allow-origin': allowed,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/' && url.pathname !== '/api/recognize') {
      return json({ error: 'not found' }, 404, cors);
    }
    if (request.method !== 'POST') {
      return json({ error: 'method not allowed' }, 405, cors);
    }

    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const gate = takeToken(ip);
    if (!gate.ok) {
      return new Response(JSON.stringify({ error: 'rate limited', retryAfter: gate.retryAfter }), {
        status: 429,
        headers: {
          ...cors,
          'content-type': 'application/json; charset=utf-8',
          'retry-after': String(gate.retryAfter),
        },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid json' }, 400, cors);
    }

    const { mimeType, data } = body ?? {};
    if (typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
      return json({ error: 'image required' }, 400, cors);
    }
    if (typeof data !== 'string' || data.length < 100) {
      return json({ error: 'image required' }, 400, cors);
    }
    if (data.length > MAX_BASE64) {
      return json({ error: 'image too large' }, 413, cors);
    }

    const result = await recognize({
      mimeType,
      data,
      provider: env.VISION_PROVIDER,
      baseUrl: env.VISION_BASE_URL,
      model: env.VISION_MODEL || env.GEMINI_MODEL,
      apiKey: env.VISION_API_KEY || env.GEMINI_API_KEY,
    });

    if (result.ok) {
      return json({ sinners: result.sinners, model: result.model }, 200, cors);
    }
    // colo 方便判断「地区不支持」是不是机房出口造成的
    return json(
      { error: result.error, detail: result.detail, colo: request.cf?.colo ?? null },
      result.status,
      cors,
    );
  },
};
