# 碎片识别代理（Cloudflare Worker）

一个几十行的中转服务，唯一目的：**让视觉模型的 Key 不进入前端代码**。

> 用 Vercel 部署整站的话不需要这个目录，直接用仓库根部的 `api/recognize.js`（逻辑相同，共用 `shared/recognize-core.js`）。

```
浏览器 ──(图片)──> 你的 Worker ──(图片 + Key)──> 视觉模型
        <──(数字)──           <──(数字)──
```

- 前端产物里只有 Worker 地址，没有任何 Key
- Key 存在 Worker 的 Secret 里，控制台只能写不能读回
- 内置：每 IP 每 10 分钟 12 次限流、图片大小上限、只接受图片（不能当通用代理刷）
- 支持 Gemini，也支持任何 OpenAI 兼容的国内视觉模型（智谱 / 百炼 / 硅基流动）

## 地区问题（用 Gemini 时）

Worker 把请求从「用户的 IP」换成「Cloudflare 机房的出口 IP」，所以**你本地挂的代理节点被不被 Google 认，就不重要了**。

但这不是 100% 保险：Cloudflare 默认把 Worker 调度到**离用户最近**的机房，大陆用户常落在香港，而香港出口可能仍被 Gemini 判为不支持。两个办法：

1. 开 **Smart Placement**（`wrangler.toml` 里已写 `[placement] mode = "smart"`；控制台在 Worker → Settings → Placement 开），让 Worker 跑到离上游近的机房（美西/美东）
2. 干脆换国内模型（`VISION_PROVIDER=zhipu`），完全不碰地区问题

报错时响应里带了 `colo` 字段（例如 `"colo": "HKG"`），能直接看出是哪个机房出口导致的问题。

## 部署（二选一）

### A. 网页控制台，不用装东西

⚠️ **控制台是单文件编辑器，必须粘 [`standalone.js`](standalone.js)**（esbuild 打出来的自包含版本，没有任何 `import`）。
`index.js` 是给 wrangler 用的，它 `import '../shared/recognize-core.js'`，在控制台里会找不到模块。

1. 打开 <https://dash.cloudflare.com/> → **Workers & Pages** → **Create** → **Worker**
2. 名字随便，例如 `wnsim-shard-recognizer`，创建后点 **Edit code**
3. 把 `standalone.js` 的内容整段粘进去，覆盖默认代码 → **Deploy**
4. 回到这个 Worker → **Settings** → **Variables and Secrets**
   - 新增 **Secret**：`VISION_API_KEY` = 视觉服务的 Key（智谱 / 百炼 / Gemini 都行）
   - 新增 **Variable**：`VISION_PROVIDER` = `zhipu`（或 `dashscope` / `siliconflow` / `gemini`）
   - 新增 **Variable**（可选）：`VISION_MODEL` = 覆盖默认模型
   - 新增 **Variable**（可选）：`ALLOWED_ORIGINS` = 你的站点域名
5. 确认 **Settings → Domains & Routes** 里 `xxx.workers.dev` 这条路由处于启用状态
6. 记下你的地址，形如 `https://wnsim-shard-recognizer.你的子域.workers.dev`

**自检**：浏览器打开 `https://xxx.workers.dev/`，返回 `{"error":"method not allowed"}` 说明已经生效；
如果返回 Cloudflare 的 HTML「Page not found」，说明这个域名下没有 Worker（没部署成功 / 路由没开）。

### B. 命令行

```bash
cd worker
npx wrangler login
npx wrangler secret put VISION_API_KEY   # 粘贴 Key
npx wrangler deploy
```

命令行用 `index.js`（会一起打包 `../shared/recognize-core.js`）。
改了 `shared/` 之后重新生成单文件版：

```bash
npm run build:worker
```

## 接上前端

在 GitHub 仓库 **Settings → Secrets and variables → Actions → Variables** 新建：

| Name | Value |
| --- | --- |
| `RECOGNIZE_ENDPOINT` | 你的 Worker 地址（`https://xxx.workers.dev/api/recognize`） |

`.github/workflows/main.yml` 会把它作为 `VITE_RECOGNIZE_ENDPOINT` 注入构建（已经配好）。

本地想测代理：

```bash
# .env.local
VITE_RECOGNIZE_ENDPOINT=https://xxx.workers.dev/api/recognize
# 配了这个之后，本地直连用的 Key 会被忽略（走代理）
```

## 自测

```bash
curl -X POST https://xxx.workers.dev/api/recognize \
  -H "content-type: application/json" \
  -d "{\"mimeType\":\"image/png\",\"data\":\"$(base64 -w0 shot.png)\"}"
```

正常返回：

```json
{ "sinners": [{ "id": "yisang", "shards": 211 }], "model": "glm-4v-flash" }
```

## 精确限流（可选，推荐）

默认限流是「单 isolate 内存计数」：用户请求落到不同实例时，实际额度会翻倍。想要「每个 IP 每 10 分钟 12 次」全局精确生效，用 Durable Object：

1. `standalone.js` 结尾已经带 `export { RateLimiter, ... }`，不需要改代码
2. 控制台 → 这个 Worker → **Settings → Bindings → Add → Durable Object**
   - Variable name：`RATE_LIMITER`
   - Class name：`RateLimiter`
   - 若询问存储后端，选 **SQLite**（免费版要求）
3. 保存后点 **Deploy**
4. 验证：同一个 IP 连续请求 13 次，第 13 次应返回 `{"error":"rate limited","retryAfter":...}`

没绑定也能正常跑，会自动退回内存计数（`checkRate` 里做的兜底）。

## 访问计数（页脚「已服务 N 位经理」）

页面底部的「已服务 N 位经理」来自 `POST /api/hit`（首次访问 +1），计数存在 Durable Object 里。

1. `standalone.js` 里已经带 `export { Counter }`
2. 控制台 → 这个 Worker → **Settings → Bindings → Add → Durable Object**
   - Variable name：`COUNTER`
   - Class name：`Counter`
   - 存储后端选 **SQLite**
3. 保存后 **Deploy**，然后打开网站刷新一次
4. 验证：
   - `GET https://<你的 worker>/api/hit` → `{"count":N}`
   - `POST https://<你的 worker>/api/hit` → 计数 +1

没绑定 `COUNTER` 时会计到 isolate 内存里（重启归零），页脚仍能显示，只是数字不可靠。

## 成本与滥用

- Worker 免费额度：10 万请求/天，个人站点远远用不完
- 视觉模型的免费额度看各家规则；被刷到上限就是 429，Worker 会原样返回 `rate limited`
- 限流是「每个 isolate 每 IP」的内存计数，不是全局精确配额。真被恶意刷了，最省事的办法是换一个 Worker 地址，或在 Cloudflare 加 WAF 规则
