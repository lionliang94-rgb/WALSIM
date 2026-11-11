# 📦 边狱公司 图鉴分享 · 瓦夜兑换箱子计算器

<div align="center">

**为《边狱巴士》玩家打造的瓦尔普吉斯之夜兑换规划工具**

帮助你管理罪人碎片、规划人格与 E.G.O 兑换，精准计算所需自选碎片箱数量，让每一份资源都用在刀刃上。

分享你的图鉴，帮助新人更好的规划队伍。

</div>

---

## ✨ 项目介绍

这是一个面向《边狱巴士（Limbus Company）》玩家制作的非官方辅助工具，主要用于规划瓦尔普吉斯之夜（Walpurgis Night）的碎片兑换。

通过录入当前账号的罪人碎片库存、选择想要兑换的人格和 E.G.O，工具会自动计算实际碎片缺口以及需要消耗的自选碎片箱数量。

本项目纯ai制作，除了这行字以外都是ai生成的。

无需登录，无需注册，[打开网页](https://ryou33333.github.io/WalpurgisNightSim/)即可使用。

## 🎯 核心功能

### 1. 瓦夜兑换数据库

- 收录第 1 期至第 9 期瓦夜的可兑换人格与 E.G.O。
- 按瓦夜期数、人格及 E.G.O 分类浏览。
- 提供卡牌立绘预览。
- 支持查看和调整卡牌强度评级（T0 / T0.5 / T1 / T1.5 / T2 / T3）。
- 支持自定义添加兑换项目。

### 2. 碎片库存管理

- 分别管理 12 位罪人的碎片数量。
- 录入当前账号已有碎片库存。
- 支持标记已经拥有的人格或 E.G.O。
- 自动排除已经拥有的项目，避免重复计算。

### 3. 智能兑换计算

- 自由勾选计划兑换的人格与 E.G.O。
- 自动按照罪人分类统计碎片需求。
- 自动抵扣对应罪人已有的碎片。
- 计算最终碎片缺口。
- 根据自选碎片箱的预期收益，计算需要准备的箱子数量。
- 提供各罪人碎片消耗明细。

**计算原则：**

每位罪人的碎片独立计算，不能跨罪人抵扣。

默认按照每个自选碎片箱期望获得 2 个碎片进行估算，也支持调整箱子折算参数。

### 4. 兑换规划与导出

- 支持预设兑换方案。
- 支持按照人格、E.G.O 和评级筛选。
- 自动生成兑换规划汇总。
- 支持导出高清兑换规划长图。
- 方便保存规划或分享给其他玩家。

### 5. 本地数据保存

- 使用浏览器 LocalStorage 保存自定义数据。
- 刷新页面后保留个人规划。
- 无需注册账号。
- 数据默认保存在当前浏览器及设备中。

---

## 🚀 使用方法

1. 打开计算器。
2. 录入 12 位罪人的当前碎片数量。
3. 输入自己拥有的自选碎片箱数量。
4. 在瓦夜数据库中选择想要兑换的人格和 E.G.O。
5. 对已经拥有的卡牌进行标记。
6. 查看自动生成的碎片需求、抵扣情况及最终箱子需求。
7. 导出兑换规划长图，保存自己的兑换计划。

---

## 📷 截图导入碎片（Gemini Flash）

不想手动把 12 个数字敲进去？直接把游戏里的「碎片」界面截图丢给页面，自动识别并填入。

**怎么用**

1. 在「瓦夜兑换计算器」页，展开「我的背包碎片与箱子库存」
2. 点右上角 **📷 截图导入**
3. 选图 / 拖图 / 直接 Ctrl+V 粘贴截图 → **开始识别**
4. 核对结果（每一行都能改、能取消勾选），点 **写入 N 位**

识别怎么走，取决于有没有配置代理地址：

| 模式 | 配置 | Key 在哪儿 | 适用 |
| --- | --- | --- | --- |
| **代理模式** | `VITE_RECOGNIZE_ENDPOINT=https://xxx.workers.dev` | 只在服务端 | **公开部署（推荐）** |
| 直连模式 | `VITE_VISION_API_KEY=...` | 构建进前端产物 | 只适合本地自己用 |

### 选一个视觉服务

不绑定 Gemini —— 任何 OpenAI 兼容的视觉接口都能用，国内服务不需要代理，也就没有 Gemini 那种地区限制：

| 服务 | `VITE_VISION_PROVIDER` | 默认模型 | 说明 |
| --- | --- | --- | --- |
| 智谱 | `zhipu` | `glm-4v-flash`（免费） | 国内直连；配合前端放大到 ~2000px，实测 12/12 |
| 阿里云百炼 | `dashscope` | `qwen-vl-plus` | 国内直连，新用户有免费额度 |
| 硅基流动 | `siliconflow` | `Qwen/Qwen2.5-VL-72B-Instruct` | 国内直连，有免费额度 |
| Google Gemini | `gemini` | `gemini-3.1-flash-lite` | 大陆需要代理，免费层按模型限速 |
| 其他 | `openai` + `VITE_VISION_BASE_URL` | 自填 | 任何 OpenAI 兼容的 `/chat/completions` |

> 具体额度、免费与否以各家官网当期说明为准，这里只是接入方式。
> 只用免费模型，不会自动切到付费模型；读不出来时直接提示你换张更清楚的截图。

⚠️ **国内服务不能浏览器直连**：智谱、百炼这些接口不返回 `Access-Control-Allow-Origin`，浏览器里 `fetch` 会直接 `Failed to fetch`（Gemini 是个例外，它支持跨域）。所以国内模型必须走中转，本地开发用自带的本地接口：

```bash
npm run dev:api     # 起在 127.0.0.1:8787/api/recognize，读 .env.local 里的 provider/key
```

```bash
# .env.local
VITE_VISION_PROVIDER=zhipu
VITE_VISION_API_KEY=你的key
VITE_RECOGNIZE_ENDPOINT=http://127.0.0.1:8787/api/recognize
```

`dev.cmd` 现在会把 vite、面板、本地识别接口一起拉起来。

直连模式本地这样配（`.env.local`，已被 `.gitignore` 忽略）：

```bash
VITE_VISION_PROVIDER=zhipu
VITE_VISION_API_KEY=你的key
```

改完 `.env.local` 需要重启 `npm run dev`（或重新 `npm run build`）才会生效。

> ⚠️ `VITE_` 变量会被打进 JS 产物。**带 Key 构建的 dist 绝对不能发到 GitHub Pages**，那等于公开 Key。公开部署请用下面的代理模式。

### 公开部署：把 Key 藏到服务端

前端是纯静态的，Key 放在任何前端代码里都能被扒出来。要真正做到「别人用、你看不到 Key」，需要一个中转服务。仓库里备了两种，**逻辑共用 [`shared/recognize-core.js`](shared/recognize-core.js)**，选一个部署即可：

```
浏览器 ──(图片)──> 你的中转 ──(图片 + Key)──> Gemini
```

| 部署平台 | 中转文件 | 地址形态 |
| --- | --- | --- |
| **Vercel**（部署整个站点时最省事） | `api/recognize.js` → `/api/recognize` | 同源，`/api/recognize` |
| Cloudflare Workers（只放中转） | `worker/index.js` | `https://xxx.workers.dev/api/recognize` |

**Vercel 怎么做**（站点和接口在同一个项目里）：

1. 项目 **Settings → Environment Variables** 加 `VISION_API_KEY` = 你的 Key，勾 **Secret**，只勾 Production
2. 再加 `VISION_PROVIDER` = `zhipu`（或 `dashscope` / `gemini`，见上表）
3. 再加 **`VITE_RECOGNIZE_ENDPOINT`** = `/api/recognize`（这个会被打进前端，值本身不是秘密）
4. **Redeploy**——环境变量只在部署时注入，不重新部署不生效

**Cloudflare 怎么做**：见 [worker/README.md](worker/README.md)，`VISION_API_KEY` 用 `wrangler secret put` 或控制台 Secret 配。

**GitHub Pages 怎么把地址接上**：地址不是机密，直接写在仓库根目录的 `.env.production` 里，Vite 构建时自动读取，不用去 Settings 配任何变量：

```bash
VITE_RECOGNIZE_ENDPOINT=https://你的worker.workers.dev/api/recognize
```

改完提交推送，Pages 工作流会自动重新构建。

> 关键点：
> - `VISION_API_KEY` / `GEMINI_API_KEY` **绝对不能**加 `VITE_` 前缀，否则会被打进 JS
> - `VITE_RECOGNIZE_ENDPOINT` 必须加 `VITE_` 前缀，否则前端读不到
>
> 中转自己也会挡：每 IP 每 10 分钟 12 次、只接受图片、限 2MB 左右，不能当通用视觉模型代理白嫖额度。

**实现说明**

| 项目 | 值 |
| --- | --- |
| 视觉服务 | `gemini` / `zhipu` / `dashscope` / `siliconflow` / `openai`（`VISION_PROVIDER` 切换） |
| 默认模型 | 按服务取预设：`glm-4v-plus` / `qwen-vl-plus` / `gemini-3.1-flash-lite` … |
| 识别方式 | 按位置读取：截图里 12 个图标按固定顺序排列，读成 12 个数字后依次对应 12 位罪人 |
| 模型下线兜底 | 仅 Gemini：404 时换 `gemini-3.8-flash` → `gemini-flash-latest`（不涉及付费升级） |
| 调用方式 | 代理模式：浏览器 → 中转 → 视觉服务；直连模式：浏览器 → 视觉服务 |
| 结构化输出 | Gemini 用 `responseSchema`；OpenAI 兼容用提示词 + 宽松 JSON 解析 |
| 图片处理 | 长边归一到 ~2000px（小图**放大**、大图缩小）后转 JPEG |
| 地区重试 | Gemini 出口 IP 被拒时自动重试 3 次 |
| 失败处理 | Key 无效 / 额度用尽 / 图片太糊都会给出具体提示 |
| 限流（代理模式） | 每 IP 每 10 分钟 12 次 |

> 为什么默认 Lite / Flash 级别：12 个数字的抽取不难，Lite 档免费额度最宽松，实测 12/12 全对、1.5–3.7 秒返回。
> 另外 Gemini 2.5 Flash 已对新用户关停（404 "no longer available to new users"），所以模型链里不再包含它。

识别不到（-1）的罪人会留空并默认不勾选，不会拿 0 去覆盖你已有的数据。

**关于隐私与额度**

- 代理模式：图片发往你自己部署的 Worker，再由它转给 Google；直连模式：浏览器直接发往 Google
- 两种模式下，免费层的数据都可能被 Google 用于改进服务，介意的话别传敏感截图
- 免费层有每分钟/每天的请求上限，触发 429 时等一分钟再试
- 本项目除可选的 Worker 外没有服务器，游戏数据、勾选记录全部只存在于你自己的浏览器里

---

## 🛠️ 技术栈

| 技术 | 用途 |
|---|---|
| React 19 | 前端界面 |
| TypeScript | 类型安全 |
| Vite | 项目构建与开发 |
| Tailwind CSS 4 | 界面样式 |
| Lucide React | 图标 |
| Motion | 动画效果 |
| LocalStorage | 本地数据持久化 |
| html-to-image | 规划长图导出 |

项目采用纯前端架构，无需独立后端服务器或数据库。

---

## 💻 本地运行

**环境要求：** Node.js

克隆项目：

```bash
git clone <你的GitHub仓库地址>
cd limbus-walpurgis-calculator
```

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

执行生产构建：

```bash
npm run build
```

构建完成后，生成的文件位于 `dist` 目录。

---

## 📌 项目说明

- 本项目为个人制作的非官方粉丝工具，与 Project Moon 无任何官方关联。
- 游戏数据、角色名称及相关美术素材的版权归原权利人所有。
- 人格强度评级及兑换建议属于个人整理与主观参考，不代表官方评价。
- 游戏版本更新可能导致兑换范围、数据和强度评价发生变化。
- 请以游戏内实际兑换规则为准。

## ❤️ 致谢

感谢《边狱巴士（Limbus Company）》及其开发团队 Project Moon 带来的优秀作品。

如果这个工具对你有所帮助，欢迎 Star ⭐ 本项目，也欢迎提出建议和反馈。

---

<div align="center">

**为你的下一次瓦夜，提前做好准备。**

*Limbus Company · Walpurgis Night Exchange Planner*

</div>
