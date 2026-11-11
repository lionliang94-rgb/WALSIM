/**
 * 碎片截图识别（浏览器侧）
 *
 * 两种模式：
 * 1. 代理模式（公开部署用）：只调用自己的 Worker / Vercel 函数，Key 在服务端。
 *    配置 VITE_RECOGNIZE_ENDPOINT 即启用。
 * 2. 直连模式（本地开发用）：浏览器直接调视觉模型，Key 来自 VITE_ 变量。国内服务
 *    （智谱 / 阿里百炼 / 硅基流动）不需要梯子，也不会有 Gemini 的地区限制。
 *
 * 请求构造与结果解析复用 ../shared/recognize-core.js，和两个中转外壳同一份逻辑。
 */
import {
  DEFAULT_GEMINI_MODEL,
  OPENAI_PRESETS,
  parseSinnersText,
  recognize as coreRecognize,
} from '../../shared/recognize-core.js';

export interface ShardSinner {
  id: string;
  name: string;
  en: string;
  color?: string;
}

/** 顺序与游戏内一致，用于展示；识别结果是按 id 回填的 */
export const SHARD_SINNERS: ShardSinner[] = [
  { id: 'yisang', name: '李箱', en: 'Yi Sang' },
  { id: 'faust', name: '浮士德', en: 'Faust' },
  { id: 'don', name: '堂吉诃德', en: 'Don Quixote' },
  { id: 'ryoshu', name: '良秀', en: 'Ryōshū' },
  { id: 'meursault', name: '默尔索', en: 'Meursault' },
  { id: 'honglu', name: '鸿璐', en: 'Hong Lu' },
  { id: 'heathcliff', name: '希斯克利夫', en: 'Heathcliff' },
  { id: 'ishmael', name: '以实玛利', en: 'Ishmael' },
  { id: 'rodion', name: '罗佳', en: 'Rodion' },
  { id: 'sinclair', name: '辛克莱', en: 'Sinclair' },
  { id: 'outis', name: '奥提斯', en: 'Outis' },
  { id: 'gregor', name: '格里高尔', en: 'Gregor' },
];

// ------------------------------------------------------------------ 配置

const env = (key: string): string => {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
};

/** 视觉服务：gemini | zhipu | dashscope | siliconflow | openai */
export const VISION_PROVIDER = (env('VITE_VISION_PROVIDER') || 'gemini').toLowerCase();

export const VISION_BASE_URL = env('VITE_VISION_BASE_URL');
export const VISION_MODEL = env('VITE_VISION_MODEL');

/** 直连模式用的 Key：优先 VITE_VISION_API_KEY，其次 Gemini 专用的那个 */
export function getApiKey(): string {
  return env('VITE_VISION_API_KEY') || env('VITE_GEMINI_API_KEY');
}

/** 角标上显示的模型名 */
export const MODEL_ID = (() => {
  if (VISION_MODEL) return VISION_MODEL;
  if (VISION_PROVIDER === 'gemini') return DEFAULT_GEMINI_MODEL;
  const preset = OPENAI_PRESETS[VISION_PROVIDER as keyof typeof OPENAI_PRESETS];
  return preset?.model ?? OPENAI_PRESETS.openai.model;
})();

/**
 * 生产环境默认的识别服务地址（Cloudflare Worker）。
 * 这是公开地址，不是机密；构建时可用 VITE_RECOGNIZE_ENDPOINT 覆盖。
 * 只在生产构建里兜底，本地开发不配置就走直连模式。
 */
const DEFAULT_RECOGNIZE_ENDPOINT = import.meta.env.PROD
  ? 'https://wnsim-shard.ryou33333.workers.dev/api/recognize'
  : '';

/** 识别服务地址；配了环境变量就用环境变量，否则生产构建用默认值 */
export const RECOGNIZE_ENDPOINT = env('VITE_RECOGNIZE_ENDPOINT') || DEFAULT_RECOGNIZE_ENDPOINT;

export const usesProxy = Boolean(RECOGNIZE_ENDPOINT);

// ------------------------------------------------------------------ 图片处理

export interface InlineImage {
  mimeType: string;
  data: string; // base64，无 data: 前缀
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
}

/** 原图上限：超过就先让用户裁一下，别把浏览器卡死 */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/**
 * 统一把截图缩放到长边 targetEdge。
 *
 * 为什么要「放大」：实测免费模型 glm-4v-flash 在 1275px 的原图上完全读不出
 * 被边框裁切的第一行（0/12），放大到 1600–2200px 后稳定 12/12。
 * 所以这里不是一味压缩，而是把长边归一到约 2000px。
 */
export async function imageToInline(file: File, targetEdge = 2000): Promise<InlineImage> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('图片超过 25MB，先裁剪到只剩碎片区域再上传');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('这张图解码失败，请用 PNG / JPG / WebP（iPhone 的 HEIC 需要先转成 JPG）');
  }

  const longEdge = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(3, targetEdge / longEdge);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持 Canvas');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('图片压缩失败');

  return { mimeType: 'image/jpeg', data: await blobToBase64(blob) };
}

// ------------------------------------------------------------------ 错误

export class ShardImportError extends Error {
  hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.name = 'ShardImportError';
    this.hint = hint;
  }
}

function toUserError(status: number, error: string, detail: string): ShardImportError {
  if (status === 500 && /server not configured/i.test(error)) {
    return new ShardImportError(
      '还没有配置视觉模型的 Key',
      '本地：在 .env.local 里写 VITE_VISION_API_KEY=你的key；线上：给中转服务配 VISION_API_KEY。',
    );
  }
  if (status === 422) {
    return new ShardImportError(
      '没能从这张图里读出完整 12 位',
      '截图尽量用原图（别用压缩过的聊天图片），保证 12 个数字都看得见；太小或太糊时可以把游戏窗口放大后再截。',
    );
  }
  if (status === 429) {
    return new ShardImportError('触发额度/频率限制', '等一分钟再试，或换一个模型/账号。');
  }
  if (status === 401 || /unauthorized|invalid.*key|api key/i.test(detail)) {
    return new ShardImportError('API Key 无效或没有权限', '确认 Key 复制完整、且该模型已开通。');
  }
  if (status === 502 && /fetch|network|unreachable/i.test(`${error} ${detail}`)) {
    return new ShardImportError(
      '浏览器没能直接访问这个模型服务',
      '国内服务（智谱 / 百炼 / 硅基流动）不返回 CORS 头，浏览器不能直连。用 `npm run dev:api` 起本地中转，或把请求走 Worker / Vercel 接口（配 VITE_RECOGNIZE_ENDPOINT）。',
    );
  }
  return new ShardImportError('识别服务出错了', detail.slice(0, 240) || `HTTP ${status}`);
}

// ------------------------------------------------------------------ 调用

export interface ShardReading {
  id: string;
  shards: number;
}

export interface RecognizeResult {
  readings: ShardReading[];
  raw: string;
}

/** 代理模式：只把图片发给自己的服务，Key 永远不进浏览器 */
async function recognizeViaProxy(image: InlineImage, signal?: AbortSignal): Promise<RecognizeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 75_000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  let res: Response;
  try {
    res = await fetch(RECOGNIZE_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mimeType: image.mimeType, data: image.data }),
      signal: controller.signal,
    });
  } catch (err) {
    if (signal?.aborted) throw new ShardImportError('已取消识别', '你关掉了弹窗或点了取消。');
    if (controller.signal.aborted) {
      throw new ShardImportError('识别超时', '网络太慢或中转没响应，等一会儿再试。');
    }
    throw new ShardImportError(
      '连不上识别服务',
      `中转可能没部署成功或暂时不可用。(${String((err as Error).message ?? err)})`,
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let detail = text;
    let code = '';
    try {
      const parsed = JSON.parse(text);
      detail = parsed.detail ?? text;
      code = parsed.error ?? '';
    } catch {
      /* 保持原文 */
    }
    throw toUserError(res.status, code, String(detail));
  }

  const payload = await res.json();
  const text = JSON.stringify(payload);
  const readings = parseSinnersText(text);
  if (!readings) throw toUserError(422, 'unreadable', text.slice(0, 240));
  return { readings, raw: text.slice(0, 500) };
}

export async function recognizeShards(
  file: File,
  apiKey: string,
  options: { signal?: AbortSignal } = {},
): Promise<RecognizeResult> {
  const image = await imageToInline(file);

  if (RECOGNIZE_ENDPOINT) return recognizeViaProxy(image, options.signal);

  if (!apiKey) {
    throw new ShardImportError(
      '还没有配置视觉模型的 Key',
      '在项目根目录 .env.local 写 VITE_VISION_API_KEY=你的key（国内服务不需要梯子），然后重启 dev server。',
    );
  }

  const result = (await coreRecognize({
    provider: VISION_PROVIDER,
    baseUrl: VISION_BASE_URL,
    model: VISION_MODEL,
    apiKey,
    mimeType: image.mimeType,
    data: image.data,
    signal: options.signal,
  })) as
    | { ok: true; status: number; sinners: ShardReading[]; model: string }
    | { ok: false; status: number; error: string; detail?: string };

  if (!result.ok) {
    if (result.status === 499) throw new ShardImportError('已取消识别', '你关掉了弹窗或点了取消。');
    throw toUserError(result.status, result.error, String(result.detail ?? ''));
  }
  return { readings: result.sinners, raw: JSON.stringify(result.sinners) };
}
