/**
 * 全站访问计数（页脚「已服务 N 位经理」）。
 *
 * 不依赖任何 Cloudflare 绑定：
 *   默认用免费公开计数服务 abacus.jasoncameron.dev
 *     GET /hit/<namespace>/<key> → 计数 +1 并返回 { value }
 *     GET /get/<namespace>/<key> → 只读
 *
 * 想换回自建 Worker，只设 VITE_VISIT_ENDPOINT 即可（要支持 GET/POST 返回 { count }）。
 */
const NAMESPACE = 'ryou33333-walpurgisnightsim';
const KEY = 'visits';
const BASE = 'https://abacus.jasoncameron.dev';

const OVERRIDE = (import.meta.env.VITE_VISIT_ENDPOINT as string | undefined)?.trim();

const SEEN_KEY = 'wnsim.visit-counted.v1';

async function readFromAbacus(count: boolean): Promise<number | null> {
  const res = await fetch(`${BASE}/${count ? 'hit' : 'get'}/${NAMESPACE}/${KEY}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { value?: unknown };
  const value = Number(data?.value);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

async function readFromOwnWorker(count: boolean): Promise<number | null> {
  const res = await fetch(OVERRIDE as string, {
    method: count ? 'POST' : 'GET',
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { count?: unknown };
  const value = Number(data?.count);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

export async function syncVisitCount(): Promise<number | null> {
  let seen = false;
  try {
    seen = window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    // 隐私模式下 localStorage 不可用，当作第一次来
  }

  try {
    let value = OVERRIDE
      ? await readFromOwnWorker(!seen)
      : await readFromAbacus(!seen);

    // 计数 key 还没被创建时 /get 会 404，这时用一次 /hit 把它建出来
    if (value === null && seen) {
      value = OVERRIDE ? await readFromOwnWorker(true) : await readFromAbacus(true);
      if (value !== null) seen = false;
    }

    if (value !== null && !seen) {
      try {
        window.localStorage.setItem(SEEN_KEY, '1');
      } catch {
        /* 忽略 */
      }
    }
    return value;
  } catch {
    return null;
  }
}
