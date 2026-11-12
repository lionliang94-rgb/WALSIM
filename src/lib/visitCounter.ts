/**
 * 全站访问计数（页脚「已服务 N 位经理」）。
 *
 * 用免费公开计数服务 abacus.jasoncameron.dev，不需要任何 Cloudflare 绑定：
 *   GET /hit/<namespace>/<key> → 计数 +1 并返回 { value }
 *   GET /get/<namespace>/<key> → 只读
 *
 * 想换成自己的接口：设 VITE_VISIT_ENDPOINT（需支持 GET/POST 返回 { count }）。
 * 注意：Worker 里的 /api/hit 如果没绑 Durable Object，计数存在内存里，重启归零，
 * 不适合做累计展示，所以默认不用它。
 */
const NAMESPACE = 'ryou33333-walpurgisnightsim';
const KEY = 'visits';
const ABACUS = 'https://abacus.jasoncameron.dev';

const OVERRIDE = (import.meta.env.VITE_VISIT_ENDPOINT as string | undefined)?.trim();

const SEEN_KEY = 'wnsim.visit-counted.v1';
const TIMEOUT_MS = 4000;

function timeoutSignal(ms: number): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return undefined;
  }
}

function normalize(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.round(num));
}

async function readAbacus(count: boolean): Promise<number | null> {
  const res = await fetch(`${ABACUS}/${count ? 'hit' : 'get'}/${NAMESPACE}/${KEY}`, {
    cache: 'no-store',
    signal: timeoutSignal(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { value?: unknown };
  return normalize(data?.value);
}

async function readOverride(count: boolean): Promise<number | null> {
  const res = await fetch(OVERRIDE as string, {
    method: count ? 'POST' : 'GET',
    cache: 'no-store',
    signal: timeoutSignal(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { count?: unknown };
  return normalize(data?.count);
}

export async function syncVisitCount(): Promise<number | null> {
  let seen = false;
  try {
    seen = window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    // 隐私模式：当作第一次来
  }

  let value: number | null = null;

  try {
    value = OVERRIDE ? await readOverride(!seen) : await readAbacus(!seen);
  } catch {
    value = null;
  }

  // 计数 key 还没建出来（/get 404）时，用一次写入把它建出来
  if (value === null && seen) {
    try {
      value = OVERRIDE ? await readOverride(true) : await readAbacus(true);
    } catch {
      value = null;
    }
  }

  if (value !== null && !seen) {
    try {
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* 忽略 */
    }
  }

  return value;
}
