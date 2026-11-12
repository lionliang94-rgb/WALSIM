/**
 * 碎片识别代理 — Cloudflare Worker 外壳
 *
 * 业务逻辑在 ../shared/recognize-core.js，和 Vercel 版本共用一份。
 * 部署见同目录 README.md。
 */
import { MAX_BASE64, recognize } from '../shared/recognize-core.js';

export { RateLimiter } from './limiter.js';
export { Counter } from './counter.js';

// 没绑定 Durable Object 时的兜底计数（仅用于本地开发 / 未配置环境）
let memoryVisits = 0;

const RATE_LIMIT = 12; // 每个 IP 每 10 分钟
const RATE_WINDOW_MS = 10 * 60 * 1000;

// 单 isolate 内存计数，够挡住随手刷接口的人；不是精确的全局配额
const hits = new Map();
const MAX_TRACKED_IPS = 1000;

/** 防止 Map 无限增长：超过阈值时清掉已过期的条目 */
function pruneHits(now) {
  if (hits.size < MAX_TRACKED_IPS) return;
  for (const [ip, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(ip);
  }
}

function takeToken(ip) {
  const now = Date.now();
  pruneHits(now);
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

/**
 * 优先用 Durable Object 做全局计数（绑定了 RATE_LIMITER 才生效）；
 * 没绑定或调用失败时退回单 isolate 内存计数。
 */
async function checkRate(env, ip) {
  if (env.RATE_LIMITER) {
    try {
      const stub = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(ip));
      const res = await stub.fetch(
        `https://limiter/?limit=${RATE_LIMIT}&window=${RATE_WINDOW_MS}`,
      );
      if (res.ok) {
        const data = await res.json();
        return data.ok ? { ok: true } : { ok: false, retryAfter: data.retryAfter ?? 60 };
      }
    } catch {
      /* 落到内存计数 */
    }
  }
  return takeToken(ip);
}

function corsHeaders(request, env) {
  const allow = (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = request.headers.get('origin') || '';
  const allowed = allow.includes('*') || allow.includes(origin) ? origin || '*' : allow[0];
  return {
    'access-control-allow-origin': allowed,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

/** 访问计数：GET 读、POST 自增；优先走 Durable Object */
async function handleHit(request, env, cors) {
  const method = request.method;
  if (method !== 'GET' && method !== 'POST') {
    return json({ error: 'method not allowed' }, 405, cors);
  }

  const respond = (count) =>
    json({ count }, 200, { ...cors, 'cache-control': 'no-store' });

  // 1) 专门的计数器 DO（可选，配置了 COUNTER 就用它）
  if (env.COUNTER) {
    try {
      const stub = env.COUNTER.get(env.COUNTER.idFromName('global'));
      const res = await stub.fetch(request);
      const data = await res.json();
      if (typeof data?.count === 'number') return respond(data.count);
    } catch {
      /* 继续往下试 */
    }
  }

  // 2) 复用已绑定的限流 DO（控制台用户通常已经有 RATE_LIMITER，不用再加新绑定）
  if (env.RATE_LIMITER) {
    try {
      const stub = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName('__visit_counter__'));
      const res = await stub.fetch(`https://counter/?visit=1`, { method });
      const data = await res.json();
      if (typeof data?.count === 'number') return respond(data.count);
    } catch {
      /* 落到内存计数 */
    }
  }

  // 3) 兜底：单 isolate 内存计数（重启归零，仅供本地/未绑定场景）
  if (method === 'POST') memoryVisits += 1;
  return respond(memoryVisits);
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

    if (url.pathname === '/api/hit') {
      return handleHit(request, env, cors);
    }

    if (url.pathname !== '/' && url.pathname !== '/api/recognize') {
      return json({ error: 'not found' }, 404, cors);
    }
    if (request.method !== 'POST') {
      return json({ error: 'method not allowed' }, 405, cors);
    }

    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const gate = await checkRate(env, ip);    if (!gate.ok) {
      return new Response(JSON.stringify({ error: 'rate limited', retryAfter: gate.retryAfter }), {
        status: 429,
        headers: {
          ...cors,
          'content-type': 'application/json; charset=utf-8',
          'retry-after': String(gate.retryAfter),
        },
      });
    }

    // 先看声明大小，避免把超大 body 读进内存
    const declared = Number(request.headers.get('content-length') ?? 0);
    if (declared > MAX_BASE64 * 1.4) {
      return json({ error: 'image too large' }, 413, cors);
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
