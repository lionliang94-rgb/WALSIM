/**
 * 碎片识别的核心逻辑，被三种外壳共用：
 *   - worker/index.js   Cloudflare Worker
 *   - api/recognize.js  Vercel Serverless Function
 *   - worker/standalone.js（上面两个打出来的单文件版）
 *
 * 支持两类视觉模型服务：
 *   gemini            Google Gemini（Generative Language API）
 *   openai            任何 OpenAI 兼容的 /chat/completions（智谱、阿里百炼、硅基流动…）
 */

export const SINNERS = [
  ['yisang', '李箱 / Yi Sang'],
  ['faust', '浮士德 / Faust'],
  ['don', '堂吉诃德 / Don Quixote'],
  ['ryoshu', '良秀 / Ryōshū'],
  ['meursault', '默尔索 / Meursault'],
  ['honglu', '鸿璐 / Hong Lu'],
  ['heathcliff', '希斯克利夫 / Heathcliff'],
  ['ishmael', '以实玛利 / Ishmael'],
  ['rodion', '罗佳 / Rodion'],
  ['sinclair', '辛克莱 / Sinclair'],
  ['outis', '奥提斯 / Outis'],
  ['gregor', '格里高尔 / Gregor'],
];

export const SINNER_IDS = SINNERS.map(([id]) => id);

export const PROMPT = `这是《边狱公司》「Inventory → Egoshards」界面：每个六边形图标是一位罪人的碎片，旁边数字是数量。
12 位罪人按固定顺序（李箱、浮士德、堂吉诃德、良秀、默尔索、鸿璐、希斯克利夫、以实玛利、罗佳、辛克莱、奥提斯、格里高尔）从左到右、从上到下排列，每行 5 个；第一行数字被顶部边框遮住一半，要仔细读。
按顺序输出 {"values":[数字...]}，末尾若有金色自选箱也一并输出。只输出 JSON。`;

export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    values: {
      type: 'array',
      description: '按“从左到右、从上到下”顺序的碎片数量，前 12 个对应 12 位罪人',
      items: { type: 'integer' },
    },
  },
  required: ['values'],
};

export const MAX_BASE64 = 3_000_000; // ≈2.2MB 图片
export const REQUEST_TIMEOUT_MS = 75_000;

/** 统一的超时控制器：超时 + 外部取消（用户关弹窗）都能中断请求 */
function timeoutSignal(ms, external) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), ms);
  const onAbort = () => controller.abort(external?.reason);
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
      external?.removeEventListener('abort', onAbort);
    },
  };
}

function isAbort(err) {
  return err?.name === 'AbortError' || /aborted|abort/i.test(String(err?.message ?? ''));
}

/** 各家 OpenAI 兼容服务的默认地址与默认模型 */
export const OPENAI_PRESETS = {
  zhipu: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    // 只用免费模型；配合前端放大到 ~2000px 实测 12/12
    model: 'glm-4v-flash',
    label: '智谱 GLM-4V',
  },
  dashscope: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-vl-plus',
    label: '阿里百炼 qwen-vl-plus',
  },
  siliconflow: {
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-VL-72B-Instruct',
    label: '硅基流动 Qwen2.5-VL',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    label: 'OpenAI 兼容服务',
  },
};

export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
export const GEMINI_FALLBACKS = ['gemini-3.8-flash', 'gemini-flash-latest'];

/** 把 {provider, baseUrl, model} 解析成一次调用所需的完整配置 */
export function resolveProviderConfig({ provider, baseUrl, model }) {
  const name = (provider || 'gemini').trim().toLowerCase();
  if (name === 'gemini') {
    return { kind: 'gemini', model: model || DEFAULT_GEMINI_MODEL, fallbacks: GEMINI_FALLBACKS };
  }
  const preset = OPENAI_PRESETS[name] || OPENAI_PRESETS.openai;
  return {
    kind: 'openai',
    name,
    baseUrl: (baseUrl || preset.baseUrl).replace(/\/+$/, ''),
    model: model || preset.model,
    label: preset.label,
  };
}

/** 从模型返回里抽出 { sinners: [...] }，抽不出来返回 null */
export function parseSinnersText(text) {
  if (typeof text !== 'string' || !text.trim()) return null;

  const cleaned = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  // 有些模型会带一句前缀，取第一个 { 到最后一个 }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  const collect = (list) => {
    if (!Array.isArray(list)) return null;
    const sinners = [];
    for (const entry of list) {
      const id = entry?.id;
      const shards = entry?.shards;
      if (typeof id !== 'string' || !SINNER_IDS.includes(id)) continue;
      if (typeof shards !== 'number' || !Number.isFinite(shards) || shards < 0) continue;
      sinners.push({ id, shards: Math.min(99999, Math.round(shards)) });
    }
    return sinners.length ? sinners : null;
  };

  /** 模型有时把数字写成字符串（"211"），统一转成数字 */
  const toNumber = (value) => {
    if (typeof value === 'number') return value;
    const cleaned = String(value).replace(/[^\d.-]/g, '');
    return cleaned ? Number(cleaned) : NaN;
  };

  /** 按位置对应 12 位罪人 */
  const positional = (list) => {
    if (!Array.isArray(list)) return null;
    const nums = list.map(toNumber).filter((n) => Number.isFinite(n));
    if (nums.length < 12) return null;
    const sinners = [];
    nums.slice(0, 12).forEach((value, index) => {
      if (value < 0) return;
      sinners.push({ id: SINNER_IDS[index], shards: Math.min(99999, Math.round(value)) });
    });
    return sinners.length ? sinners : null;
  };

  // 形态 0a：{ rows: [[5 个], [5 个], [3 个]] } —— 当前主用，按行读
  if (Array.isArray(parsed?.rows)) {
    const flattened = parsed.rows.flatMap((row) => (Array.isArray(row) ? row : [row]));
    const fromRows = positional(flattened);
    if (fromRows) return fromRows;
  }

  // 形态 0b：{ values: [211, 191, ...] }
  if (Array.isArray(parsed?.values)) {
    const fromValues = positional(parsed.values);
    if (fromValues) return fromValues;
  }

  // 形态 1：{ sinners: [{ id, shards }] }
  const nested = collect(parsed?.sinners);
  if (nested) return nested;

  // 形态 2：模型偷懒的扁平对象 { yisang: 211, faust: 191 }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const sinners = [];
    for (const [key, value] of Object.entries(parsed)) {
      if (!SINNER_IDS.includes(key)) continue;
      const shards = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(shards) || shards < 0) continue;
      sinners.push({ id: key, shards: Math.min(99999, Math.round(shards)) });
    }
    if (sinners.length) return sinners;
  }

  // 形态 3：直接把数组作为根
  return collect(parsed);
}

/** Gemini 的响应体 → { sinners } */
export function parseGeminiPayload(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .map((part) => part?.text)
    .filter((t) => typeof t === 'string')
    .join('');
  return parseSinnersText(text);
}

/** OpenAI 兼容的响应体 → { sinners } */
export function parseOpenAiPayload(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return parseSinnersText(content);
  // 少数实现返回分片数组
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part === 'string' ? part : part?.text))
      .filter((t) => typeof t === 'string')
      .join('');
    return parseSinnersText(text);
  }
  return null;
}

function geminiBody(mimeType, data) {
  return JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data } }],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
}

function openAiBody(model, mimeType, data) {
  return JSON.stringify({
    model,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } },
        ],
      },
    ],
  });
}

/**
 * 调视觉模型，返回 { ok, status, sinners, model } 或 { ok:false, status, error, detail }
 * Gemini：404 换模型、地区限制重试；OpenAI 兼容：401/429 直接透出。
 */
export async function recognize({
  provider,
  baseUrl,
  model,
  apiKey,
  mimeType,
  data,
  signal,
  fetchImpl = fetch,
}) {
  if (!apiKey) {
    return { ok: false, status: 500, error: 'server not configured', detail: 'missing vision API key' };
  }

  const config = resolveProviderConfig({ provider, baseUrl, model });

  if (config.kind === 'openai') {
    let res;
    const timeout = timeoutSignal(REQUEST_TIMEOUT_MS, signal);
    try {
      res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: openAiBody(config.model, mimeType, data),
        signal: timeout.signal,
      });
    } catch (err) {
      if (signal?.aborted) return { ok: false, status: 499, error: 'aborted', detail: '已取消' };
      if (isAbort(err)) return { ok: false, status: 504, error: 'timeout', detail: '模型响应超时' };
      return { ok: false, status: 502, error: 'upstream_unreachable', detail: String(err?.message ?? err) };
    } finally {
      timeout.dispose();
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        status: res.status === 429 ? 429 : 502,
        error: 'upstream_error',
        detail: text.slice(0, 300),
      };
    }

    const payload = await res.json().catch(() => null);
    const sinners = parseOpenAiPayload(payload);
    if (!sinners) {
      return {
        ok: false,
        status: 422,
        error: 'unreadable',
        detail: `${config.model} 没有读全 12 位，可能是截图太小或数字被遮挡`,
      };
    }
    return { ok: true, status: 200, sinners, model: config.model };
  }

  const body = geminiBody(mimeType, data);
  const chain = [...new Set([config.model, ...config.fallbacks])];
  let lastStatus = 502;
  let lastDetail = '';

  for (const candidate of chain) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let res;
      const timeout = timeoutSignal(REQUEST_TIMEOUT_MS, signal);
      try {
        res = await fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: timeout.signal },
        );
      } catch (err) {
        if (signal?.aborted) return { ok: false, status: 499, error: 'aborted', detail: '已取消' };
        if (isAbort(err)) {
          return { ok: false, status: 504, error: 'timeout', detail: '模型响应超时' };
        }
        return { ok: false, status: 502, error: 'upstream_unreachable', detail: String(err?.message ?? err) };
      } finally {
        timeout.dispose();
      }

      if (res.ok) {
        const payload = await res.json();
        const sinners = parseGeminiPayload(payload);
        if (!sinners) {
          return { ok: false, status: 422, error: 'unreadable', detail: '模型没有返回可解析的碎片数据' };
        }
        return { ok: true, status: 200, sinners, model: candidate };
      }

      const text = await res.text().catch(() => '');
      lastStatus = res.status;
      lastDetail = text.slice(0, 300);

      if (res.status === 400 && /User location is not supported/i.test(text) && attempt < 2) continue;
      if (res.status === 404) break;

      return { ok: false, status: res.status === 429 ? 429 : 502, error: 'upstream_error', detail: lastDetail };
    }
  }

  return { ok: false, status: 502, error: 'upstream_error', detail: lastDetail || String(lastStatus) };
}
