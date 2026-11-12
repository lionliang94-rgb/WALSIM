/**
 * 全站访问计数（Cloudflare Durable Object）
 *
 * 整个站点共用一个实例（idFromName('global')），DO 天然串行，不会丢更新。
 *   POST /api/hit → 计数 +1，返回 { count }
 *   GET  /api/hit → 只读，返回 { count }
 */
const KEY = 'visits';

export class Counter {
  constructor(state) {
    this.storage = state.storage;
  }

  async fetch(request) {
    const method = request.method.toUpperCase();

    if (method === 'GET') {
      const count = (await this.storage.get(KEY)) ?? 0;
      return json({ count });
    }

    if (method === 'POST') {
      const count = ((await this.storage.get(KEY)) ?? 0) + 1;
      await this.storage.put(KEY, count);
      return json({ count });
    }

    return json({ error: 'method not allowed' }, 405);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
