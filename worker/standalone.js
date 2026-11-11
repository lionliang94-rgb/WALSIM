// shared/recognize-core.js
var SINNERS = [
  ["yisang", "\u674E\u7BB1 / Yi Sang"],
  ["faust", "\u6D6E\u58EB\u5FB7 / Faust"],
  ["don", "\u5802\u5409\u8BC3\u5FB7 / Don Quixote"],
  ["ryoshu", "\u826F\u79C0 / Ry\u014Dsh\u016B"],
  ["meursault", "\u9ED8\u5C14\u7D22 / Meursault"],
  ["honglu", "\u9E3F\u7490 / Hong Lu"],
  ["heathcliff", "\u5E0C\u65AF\u514B\u5229\u592B / Heathcliff"],
  ["ishmael", "\u4EE5\u5B9E\u739B\u5229 / Ishmael"],
  ["rodion", "\u7F57\u4F73 / Rodion"],
  ["sinclair", "\u8F9B\u514B\u83B1 / Sinclair"],
  ["outis", "\u5965\u63D0\u65AF / Outis"],
  ["gregor", "\u683C\u91CC\u9AD8\u5C14 / Gregor"]
];
var SINNER_IDS = SINNERS.map(([id]) => id);
var PROMPT = `\u8FD9\u662F\u300A\u8FB9\u72F1\u516C\u53F8\u300B\u300CInventory \u2192 Egoshards\u300D\u754C\u9762\uFF1A\u6BCF\u4E2A\u516D\u8FB9\u5F62\u56FE\u6807\u662F\u4E00\u4F4D\u7F6A\u4EBA\u7684\u788E\u7247\uFF0C\u65C1\u8FB9\u6570\u5B57\u662F\u6570\u91CF\u3002
12 \u4F4D\u7F6A\u4EBA\u6309\u56FA\u5B9A\u987A\u5E8F\uFF08\u674E\u7BB1\u3001\u6D6E\u58EB\u5FB7\u3001\u5802\u5409\u8BC3\u5FB7\u3001\u826F\u79C0\u3001\u9ED8\u5C14\u7D22\u3001\u9E3F\u7490\u3001\u5E0C\u65AF\u514B\u5229\u592B\u3001\u4EE5\u5B9E\u739B\u5229\u3001\u7F57\u4F73\u3001\u8F9B\u514B\u83B1\u3001\u5965\u63D0\u65AF\u3001\u683C\u91CC\u9AD8\u5C14\uFF09\u4ECE\u5DE6\u5230\u53F3\u3001\u4ECE\u4E0A\u5230\u4E0B\u6392\u5217\uFF0C\u6BCF\u884C 5 \u4E2A\uFF1B\u7B2C\u4E00\u884C\u6570\u5B57\u88AB\u9876\u90E8\u8FB9\u6846\u906E\u4F4F\u4E00\u534A\uFF0C\u8981\u4ED4\u7EC6\u8BFB\u3002
\u6309\u987A\u5E8F\u8F93\u51FA {"values":[\u6570\u5B57...]}\uFF0C\u672B\u5C3E\u82E5\u6709\u91D1\u8272\u81EA\u9009\u7BB1\u4E5F\u4E00\u5E76\u8F93\u51FA\u3002\u53EA\u8F93\u51FA JSON\u3002`;
var RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    values: {
      type: "array",
      description: "\u6309\u201C\u4ECE\u5DE6\u5230\u53F3\u3001\u4ECE\u4E0A\u5230\u4E0B\u201D\u987A\u5E8F\u7684\u788E\u7247\u6570\u91CF\uFF0C\u524D 12 \u4E2A\u5BF9\u5E94 12 \u4F4D\u7F6A\u4EBA",
      items: { type: "integer" }
    }
  },
  required: ["values"]
};
var MAX_BASE64 = 3e6;
var REQUEST_TIMEOUT_MS = 75e3;
function timeoutSignal(ms, external) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), ms);
  const onAbort = () => controller.abort(external?.reason);
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
      external?.removeEventListener("abort", onAbort);
    }
  };
}
function isAbort(err) {
  return err?.name === "AbortError" || /aborted|abort/i.test(String(err?.message ?? ""));
}
var OPENAI_PRESETS = {
  zhipu: {
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    // 只用免费模型；配合前端放大到 ~2000px 实测 12/12
    model: "glm-4v-flash",
    label: "\u667A\u8C31 GLM-4V"
  },
  dashscope: {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-vl-plus",
    label: "\u963F\u91CC\u767E\u70BC qwen-vl-plus"
  },
  siliconflow: {
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen2.5-VL-72B-Instruct",
    label: "\u7845\u57FA\u6D41\u52A8 Qwen2.5-VL"
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    label: "OpenAI \u517C\u5BB9\u670D\u52A1"
  }
};
var DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
var GEMINI_FALLBACKS = ["gemini-3.8-flash", "gemini-flash-latest"];
function resolveProviderConfig({ provider, baseUrl, model }) {
  const name = (provider || "gemini").trim().toLowerCase();
  if (name === "gemini") {
    return { kind: "gemini", model: model || DEFAULT_GEMINI_MODEL, fallbacks: GEMINI_FALLBACKS };
  }
  const preset = OPENAI_PRESETS[name] || OPENAI_PRESETS.openai;
  return {
    kind: "openai",
    name,
    baseUrl: (baseUrl || preset.baseUrl).replace(/\/+$/, ""),
    model: model || preset.model,
    label: preset.label
  };
}
function parseSinnersText(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const json2 = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  let parsed;
  try {
    parsed = JSON.parse(json2);
  } catch {
    return null;
  }
  const collect = (list) => {
    if (!Array.isArray(list)) return null;
    const sinners = [];
    for (const entry of list) {
      const id = entry?.id;
      const shards = entry?.shards;
      if (typeof id !== "string" || !SINNER_IDS.includes(id)) continue;
      if (typeof shards !== "number" || !Number.isFinite(shards) || shards < 0) continue;
      sinners.push({ id, shards: Math.min(99999, Math.round(shards)) });
    }
    return sinners.length ? sinners : null;
  };
  const toNumber = (value) => {
    if (typeof value === "number") return value;
    const cleaned2 = String(value).replace(/[^\d.-]/g, "");
    return cleaned2 ? Number(cleaned2) : NaN;
  };
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
  if (Array.isArray(parsed?.rows)) {
    const flattened = parsed.rows.flatMap((row) => Array.isArray(row) ? row : [row]);
    const fromRows = positional(flattened);
    if (fromRows) return fromRows;
  }
  if (Array.isArray(parsed?.values)) {
    const fromValues = positional(parsed.values);
    if (fromValues) return fromValues;
  }
  const nested = collect(parsed?.sinners);
  if (nested) return nested;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const sinners = [];
    for (const [key, value] of Object.entries(parsed)) {
      if (!SINNER_IDS.includes(key)) continue;
      const shards = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(shards) || shards < 0) continue;
      sinners.push({ id: key, shards: Math.min(99999, Math.round(shards)) });
    }
    if (sinners.length) return sinners;
  }
  return collect(parsed);
}
function parseGeminiPayload(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts.map((part) => part?.text).filter((t) => typeof t === "string").join("");
  return parseSinnersText(text);
}
function parseOpenAiPayload(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return parseSinnersText(content);
  if (Array.isArray(content)) {
    const text = content.map((part) => typeof part === "string" ? part : part?.text).filter((t) => typeof t === "string").join("");
    return parseSinnersText(text);
  }
  return null;
}
function geminiBody(mimeType, data) {
  return JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data } }]
      }
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 }
    }
  });
}
function openAiBody(model, mimeType, data) {
  return JSON.stringify({
    model,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${data}` } }
        ]
      }
    ]
  });
}
async function recognize({
  provider,
  baseUrl,
  model,
  apiKey,
  mimeType,
  data,
  signal,
  fetchImpl = fetch
}) {
  if (!apiKey) {
    return { ok: false, status: 500, error: "server not configured", detail: "missing vision API key" };
  }
  const config = resolveProviderConfig({ provider, baseUrl, model });
  if (config.kind === "openai") {
    let res;
    const timeout = timeoutSignal(REQUEST_TIMEOUT_MS, signal);
    try {
      res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: openAiBody(config.model, mimeType, data),
        signal: timeout.signal
      });
    } catch (err) {
      if (signal?.aborted) return { ok: false, status: 499, error: "aborted", detail: "\u5DF2\u53D6\u6D88" };
      if (isAbort(err)) return { ok: false, status: 504, error: "timeout", detail: "\u6A21\u578B\u54CD\u5E94\u8D85\u65F6" };
      return { ok: false, status: 502, error: "upstream_unreachable", detail: String(err?.message ?? err) };
    } finally {
      timeout.dispose();
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status === 429 ? 429 : 502,
        error: "upstream_error",
        detail: text.slice(0, 300)
      };
    }
    const payload = await res.json().catch(() => null);
    const sinners = parseOpenAiPayload(payload);
    if (!sinners) {
      return {
        ok: false,
        status: 422,
        error: "unreadable",
        detail: `${config.model} \u6CA1\u6709\u8BFB\u5168 12 \u4F4D\uFF0C\u53EF\u80FD\u662F\u622A\u56FE\u592A\u5C0F\u6216\u6570\u5B57\u88AB\u906E\u6321`
      };
    }
    return { ok: true, status: 200, sinners, model: config.model };
  }
  const body = geminiBody(mimeType, data);
  const chain = [.../* @__PURE__ */ new Set([config.model, ...config.fallbacks])];
  let lastStatus = 502;
  let lastDetail = "";
  for (const candidate of chain) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let res;
      const timeout = timeoutSignal(REQUEST_TIMEOUT_MS, signal);
      try {
        res = await fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey}`,
          { method: "POST", headers: { "content-type": "application/json" }, body, signal: timeout.signal }
        );
      } catch (err) {
        if (signal?.aborted) return { ok: false, status: 499, error: "aborted", detail: "\u5DF2\u53D6\u6D88" };
        if (isAbort(err)) {
          return { ok: false, status: 504, error: "timeout", detail: "\u6A21\u578B\u54CD\u5E94\u8D85\u65F6" };
        }
        return { ok: false, status: 502, error: "upstream_unreachable", detail: String(err?.message ?? err) };
      } finally {
        timeout.dispose();
      }
      if (res.ok) {
        const payload = await res.json();
        const sinners = parseGeminiPayload(payload);
        if (!sinners) {
          return { ok: false, status: 422, error: "unreadable", detail: "\u6A21\u578B\u6CA1\u6709\u8FD4\u56DE\u53EF\u89E3\u6790\u7684\u788E\u7247\u6570\u636E" };
        }
        return { ok: true, status: 200, sinners, model: candidate };
      }
      const text = await res.text().catch(() => "");
      lastStatus = res.status;
      lastDetail = text.slice(0, 300);
      if (res.status === 400 && /User location is not supported/i.test(text) && attempt < 2) continue;
      if (res.status === 404) break;
      return { ok: false, status: res.status === 429 ? 429 : 502, error: "upstream_error", detail: lastDetail };
    }
  }
  return { ok: false, status: 502, error: "upstream_error", detail: lastDetail || String(lastStatus) };
}

// worker/limiter.js
var DEFAULT_LIMIT = 12;
var DEFAULT_WINDOW_MS = 10 * 60 * 1e3;
var RateLimiter = class {
  constructor(state) {
    this.state = state;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit")) || DEFAULT_LIMIT;
    const windowMs = Number(url.searchParams.get("window")) || DEFAULT_WINDOW_MS;
    const now = Date.now();
    let bucket = await this.state.storage.get("bucket") ?? { count: 0, resetAt: 0 };
    if (!bucket.resetAt || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
    }
    if (bucket.count >= limit) {
      return Response.json({
        ok: false,
        retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1e3)),
        remaining: 0
      });
    }
    bucket.count += 1;
    await this.state.storage.put("bucket", bucket);
    return Response.json({
      ok: true,
      remaining: limit - bucket.count,
      resetAt: bucket.resetAt
    });
  }
};

// worker/index.js
var RATE_LIMIT = 12;
var RATE_WINDOW_MS = 10 * 60 * 1e3;
var hits = /* @__PURE__ */ new Map();
var MAX_TRACKED_IPS = 1e3;
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
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1e3) };
  }
  entry.count += 1;
  return { ok: true };
}
async function checkRate(env, ip) {
  if (env.RATE_LIMITER) {
    try {
      const stub = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(ip));
      const res = await stub.fetch(
        `https://limiter/?limit=${RATE_LIMIT}&window=${RATE_WINDOW_MS}`
      );
      if (res.ok) {
        const data = await res.json();
        return data.ok ? { ok: true } : { ok: false, retryAfter: data.retryAfter ?? 60 };
      }
    } catch {
    }
  }
  return takeToken(ip);
}
function corsHeaders(request, env) {
  const allow = (env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim()).filter(Boolean);
  const origin = request.headers.get("origin") || "";
  const allowed = allow.includes("*") || allow.includes(origin) ? origin || "*" : allow[0];
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin"
  };
}
function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers }
  });
}
var index_default = {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    const url = new URL(request.url);
    if (url.pathname !== "/" && url.pathname !== "/api/recognize") {
      return json({ error: "not found" }, 404, cors);
    }
    if (request.method !== "POST") {
      return json({ error: "method not allowed" }, 405, cors);
    }
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const gate = await checkRate(env, ip);
    if (!gate.ok) {
      return new Response(JSON.stringify({ error: "rate limited", retryAfter: gate.retryAfter }), {
        status: 429,
        headers: {
          ...cors,
          "content-type": "application/json; charset=utf-8",
          "retry-after": String(gate.retryAfter)
        }
      });
    }
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_BASE64 * 1.4) {
      return json({ error: "image too large" }, 413, cors);
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400, cors);
    }
    const { mimeType, data } = body ?? {};
    if (typeof mimeType !== "string" || !mimeType.startsWith("image/")) {
      return json({ error: "image required" }, 400, cors);
    }
    if (typeof data !== "string" || data.length < 100) {
      return json({ error: "image required" }, 400, cors);
    }
    if (data.length > MAX_BASE64) {
      return json({ error: "image too large" }, 413, cors);
    }
    const result = await recognize({
      mimeType,
      data,
      provider: env.VISION_PROVIDER,
      baseUrl: env.VISION_BASE_URL,
      model: env.VISION_MODEL || env.GEMINI_MODEL,
      apiKey: env.VISION_API_KEY || env.GEMINI_API_KEY
    });
    if (result.ok) {
      return json({ sinners: result.sinners, model: result.model }, 200, cors);
    }
    return json(
      { error: result.error, detail: result.detail, colo: request.cf?.colo ?? null },
      result.status,
      cors
    );
  }
};
export {
  RateLimiter,
  index_default as default
};
