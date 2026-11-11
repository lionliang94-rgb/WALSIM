/**
 * 碎片识别代理 — Vercel Serverless Function
 *
 * 路由：/api/recognize
 * 业务逻辑与 Cloudflare 版本共用 ../shared/recognize-core.js。
 *
 * 环境变量（Vercel → Settings → Environment Variables）：
 *   GEMINI_API_KEY   你的 Gemini Key（不要加 VITE_ 前缀，否则会被打进前端）
 *   GEMINI_MODEL     可选，默认 gemini-3.1-flash-lite
 *   ALLOWED_ORIGINS  可选，允许的站点来源，默认 *
 */
import { MAX_BASE64, recognize } from '../shared/recognize-core.js';

const RATE_LIMIT = 12; // 每个 IP 每 10 分钟
const RATE_WINDOW_MS = 10 * 60 * 1000;

// serverless 实例内存计数，够挡住随手刷接口的人
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

function send(res, status, payload, headers = {}) {
  res.status(status);
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.json(payload);
}

export default async function handler(req, res) {
  const allow = (process.env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.origin || '';
  const cors = {
    'access-control-allow-origin': allow.includes('*') || allow.includes(origin) ? origin || '*' : allow[0],
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'origin',
  };

  if (req.method === 'OPTIONS') {
    res.status(204);
    for (const [key, value] of Object.entries(cors)) res.setHeader(key, value);
    return res.end();
  }

  if (req.method !== 'POST') {
    return send(res, 405, { error: 'method not allowed' }, cors);
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const gate = takeToken(ip);
  if (!gate.ok) {
    return send(res, 429, { error: 'rate limited', retryAfter: gate.retryAfter }, {
      ...cors,
      'retry-after': String(gate.retryAfter),
    });
  }

  // 先看声明大小，避免解析超大 body
  const declared = Number(req.headers['content-length'] ?? 0);
  if (declared > MAX_BASE64 * 1.4) {
    return send(res, 413, { error: 'image too large' }, cors);
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return send(res, 400, { error: 'invalid json' }, cors);
    }
  }
  if (!body || typeof body !== 'object') {
    return send(res, 400, { error: 'invalid json' }, cors);
  }

  const { mimeType, data } = body;
  if (typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
    return send(res, 400, { error: 'image required' }, cors);
  }
  if (typeof data !== 'string' || data.length < 100) {
    return send(res, 400, { error: 'image required' }, cors);
  }
  if (data.length > MAX_BASE64) {
    return send(res, 413, { error: 'image too large' }, cors);
  }

  const result = await recognize({
    mimeType,
    data,
    provider: process.env.VISION_PROVIDER,
    baseUrl: process.env.VISION_BASE_URL,
    model: process.env.VISION_MODEL || process.env.GEMINI_MODEL,
    apiKey: process.env.VISION_API_KEY || process.env.GEMINI_API_KEY,
  });

  if (result.ok) {
    return send(res, 200, { sinners: result.sinners, model: result.model }, cors);
  }
  return send(res, result.status, { error: result.error, detail: result.detail }, cors);
}
