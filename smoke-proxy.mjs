// 本地冒烟测试：两个中转外壳 + 共用核心（假 fetch，不打真实 API）
import worker from './worker/index.js';
import apiHandler from './api/recognize.js';
import { parseOpenAiPayload, parseGeminiPayload, resolveProviderConfig } from './shared/recognize-core.js';

process.env.GEMINI_API_KEY = 'fake-key';

let pass = 0;
let fail = 0;

function check(name, condition, extra = '') {
  if (condition) {
    pass += 1;
    console.log('PASS', name);
  } else {
    fail += 1;
    console.log('FAIL', name, extra);
  }
}

const goodJson = JSON.stringify({
  sinners: [
    { id: 'yisang', shards: 211 },
    { id: 'faust', shards: -1 },
    { id: 'unknown', shards: 5 },
  ],
});

// ---- 1. Worker: OPTIONS / 空 body ----
const optRes = await worker.fetch(new Request('https://x/api/recognize', { method: 'OPTIONS' }), { ALLOWED_ORIGINS: '*' });
check('worker OPTIONS 204', optRes.status === 204, String(optRes.status));

const badRes = await worker.fetch(
  new Request('https://x/api/recognize', {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'content-type': 'application/json' },
  }),
  { ALLOWED_ORIGINS: '*', GEMINI_API_KEY: 'fake' },
);
check('worker 缺图 400', badRes.status === 400, String(badRes.status));

// ---- 2. 解析器 ----
check('解析 Gemini 响应', parseGeminiPayload({ candidates: [{ content: { parts: [{ text: goodJson }] } }] })?.length === 1);
check('解析 OpenAI 响应', parseOpenAiPayload({ choices: [{ message: { content: goodJson } }] })?.length === 1);
check(
  '解析带前缀的 JSON',
  parseOpenAiPayload({ choices: [{ message: { content: '好的，结果如下： {"sinners":[{"id":"don","shards":273}]}' } }] })?.length === 1,
);

// 智谱全尺寸提示词下会返回扁平对象 {"yisang":211,...}
check(
  '解析扁平的 id:值 对象',
  parseOpenAiPayload({ choices: [{ message: { content: '```json\n{"yisang":211,"faust":191}\n```' } }] })?.length === 2,
);
check(
  '扁平对象里过滤非法 id',
  parseOpenAiPayload({ choices: [{ message: { content: '{"yisang":211,"foo":9}' } }] })?.length === 1,
);

const zhipu = resolveProviderConfig({ provider: 'zhipu' });
check(
  'zhipu 预设地址与免费模型',
  zhipu.baseUrl === 'https://open.bigmodel.cn/api/paas/v4' &&
    zhipu.model === 'glm-4v-flash' &&
    !('fallbackModel' in zhipu),
  JSON.stringify(zhipu),
);

// ---- 3. Worker 走 Gemini ----
let lastUrl = '';
let lastAuth = '';
globalThis.fetch = async (url, options) => {
  lastUrl = String(url);
  lastAuth = options?.headers?.authorization ?? '';
  if (String(url).includes('generativelanguage')) {
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: goodJson }] } }] }), { status: 200 });
  }
  return new Response(
    JSON.stringify({ choices: [{ message: { content: goodJson } }] }),
    { status: 200 },
  );
};

const payload = { mimeType: 'image/jpeg', data: 'A'.repeat(200) };

const geminiRes = await worker.fetch(
  new Request('https://x/api/recognize', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  }),
  { ALLOWED_ORIGINS: '*', GEMINI_API_KEY: 'fake' },
);
const geminiBody = await geminiRes.json();
check('worker Gemini 模式 200', geminiRes.status === 200, JSON.stringify(geminiBody));
check('worker 过滤 -1 与未知 id', geminiBody.sinners?.length === 1 && geminiBody.sinners[0].id === 'yisang', JSON.stringify(geminiBody));
check('走的是 Gemini 端点', lastUrl.includes('generativelanguage.googleapis.com'), lastUrl);

// ---- 4. Worker 走国内 OpenAI 兼容服务 ----
lastUrl = '';
lastAuth = '';
const qwenRes = await worker.fetch(
  new Request('https://x/api/recognize', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  }),
  { ALLOWED_ORIGINS: '*', VISION_PROVIDER: 'dashscope', VISION_API_KEY: 'sk-domestic' },
);
const qwenBody = await qwenRes.json();
check('worker 国内服务 200', qwenRes.status === 200, JSON.stringify(qwenBody));
check('命中 dashscope 地址', lastUrl.includes('dashscope.aliyuncs.com'), lastUrl);
check('使用 Bearer 鉴权', lastAuth === 'Bearer sk-domestic', lastAuth);
check('国内服务也过滤 -1', qwenBody.sinners?.length === 1, JSON.stringify(qwenBody));

// ---- 5. Vercel 外壳 ----
function makeRes() {
  const res = {
    statusCode: 0,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {},
  };
  return res;
}

const vRes = makeRes();
await apiHandler({ method: 'POST', headers: { 'x-forwarded-for': '1.2.3.4' }, body: payload, socket: {} }, vRes);
check('vercel 成功 200', vRes.statusCode === 200, JSON.stringify(vRes.body));
check('vercel 返回 sinners', Array.isArray(vRes.body?.sinners) && vRes.body.sinners.length === 1, JSON.stringify(vRes.body));

const vBad = makeRes();
await apiHandler({ method: 'POST', headers: {}, body: {}, socket: {} }, vBad);
check('vercel 缺图 400', vBad.statusCode === 400, String(vBad.statusCode));

const vMethod = makeRes();
await apiHandler({ method: 'GET', headers: {}, socket: {} }, vMethod);
check('vercel 非 POST 405', vMethod.statusCode === 405, String(vMethod.statusCode));

// ---- 6. 限流 ----
const codes = [];
for (let i = 0; i < 15; i += 1) {
  const r = makeRes();
  await apiHandler({ method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body: payload, socket: {} }, r);
  codes.push(r.statusCode);
}
check('vercel 第 13 次开始 429', codes.slice(0, 12).every((c) => c === 200) && codes[12] === 429, JSON.stringify(codes));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
