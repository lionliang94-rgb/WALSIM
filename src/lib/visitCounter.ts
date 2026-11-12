/**
 * 全站访问计数（显示在页面底部）。
 *
 * 数据来自自建 Worker 的 /api/hit：
 *   GET  → 读当前计数
 *   POST → 计数 +1（同一浏览器只计一次）
 * 拿不到就静默隐藏，不打扰用户。
 */
import { RECOGNIZE_ENDPOINT } from './shardVision';

const OVERRIDE = (import.meta.env.VITE_VISIT_ENDPOINT as string | undefined)?.trim();

export const HIT_ENDPOINT =
  OVERRIDE ||
  (RECOGNIZE_ENDPOINT ? RECOGNIZE_ENDPOINT.replace(/\/api\/recognize\/?$/, '/api/hit') : '');

const SEEN_KEY = 'wnsim.visit-counted.v1';

export async function syncVisitCount(): Promise<number | null> {
  if (!HIT_ENDPOINT) return null;

  let seen = false;
  try {
    seen = window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    // 隐私模式下 localStorage 可能不可用，当作没来过
  }

  try {
    const res = await fetch(HIT_ENDPOINT, {
      method: seen ? 'GET' : 'POST',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { count?: unknown };
    if (typeof data?.count !== 'number' || !Number.isFinite(data.count)) return null;
    if (!seen) {
      try {
        window.localStorage.setItem(SEEN_KEY, '1');
      } catch {
        /* 忽略 */
      }
    }
    return Math.max(0, Math.round(data.count));
  } catch {
    return null;
  }
}
