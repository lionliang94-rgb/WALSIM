/**
 * 精确限流：用 Durable Object 做「全局」计数。
 *
 * Worker 里的内存计数只在单个 isolate 内有效，用户命中不同实例时实际额度会翻倍。
 * 这里把每个 IP 的计数放进一个 DO（同一个 IP 永远落在同一个对象上），
 * 所以多个 isolate、多个边缘机房共享同一份计数。
 *
 * 没有绑定 RATE_LIMITER 时会自动退回内存计数（见 index.js 的 checkRate）。
 */

const DEFAULT_LIMIT = 12;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

export class RateLimiter {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit')) || DEFAULT_LIMIT;
    const windowMs = Number(url.searchParams.get('window')) || DEFAULT_WINDOW_MS;
    const now = Date.now();

    let bucket = (await this.state.storage.get('bucket')) ?? { count: 0, resetAt: 0 };
    if (!bucket.resetAt || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
    }

    if (bucket.count >= limit) {
      return Response.json({
        ok: false,
        retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
        remaining: 0,
      });
    }

    bucket.count += 1;
    await this.state.storage.put('bucket', bucket);

    return Response.json({
      ok: true,
      remaining: limit - bucket.count,
      resetAt: bucket.resetAt,
    });
  }
}
