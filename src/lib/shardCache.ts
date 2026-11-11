/**
 * 识别结果的本地缓存。
 *
 * 同一张截图重复上传（比如先试一次、再点一次“重新识别”）没必要再花一次额度。
 * 用图片内容的 SHA-256 前 12 字节做 key，存在 localStorage，7 天过期、最多 20 条。
 */

const STORAGE_KEY = 'wnsim.shard-cache.v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 20;

export interface CachedReading {
  id: string;
  shards: number;
}

export interface CacheEntry {
  hash: string;
  readings: CachedReading[];
  model?: string;
  at: number;
}

interface Store {
  entries: CacheEntry[];
}

/** 图片（base64 字符串）的稳定指纹 */
export async function hashImage(base64: string): Promise<string> {
  if (!globalThis.crypto?.subtle) return ''; // 非安全上下文（http 非 localhost）没有 SubtleCrypto
  const bytes = new TextEncoder().encode(base64);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw) as Store;
    return Array.isArray(parsed?.entries) ? parsed : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* 配额满或隐私模式：缓存失效不影响主流程 */
  }
}

function isFresh(entry: CacheEntry, now: number): boolean {
  return Boolean(entry?.hash) && Array.isArray(entry.readings) && now - entry.at < TTL_MS;
}

export function readCache(hash: string): CacheEntry | null {
  if (!hash) return null;
  const now = Date.now();
  const store = readStore();
  const hit = store.entries.find((entry) => entry.hash === hash);
  return hit && isFresh(hit, now) ? hit : null;
}

export function writeCache(entry: CacheEntry): void {
  if (!entry.hash || !entry.readings?.length) return;
  const now = Date.now();
  const store = readStore();
  const kept = store.entries.filter((item) => item.hash !== entry.hash && isFresh(item, now));
  kept.unshift(entry);
  writeStore({ entries: kept.slice(0, MAX_ENTRIES) });
}

export function clearCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
