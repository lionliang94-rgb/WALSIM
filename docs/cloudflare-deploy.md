# Cloudflare Worker 部署攻略（保姆级）

目标：把仓库里的 `worker/standalone.js` 部署成一个 Cloudflare Worker，让它替前端调用智谱的视觉模型，**API Key 只存在 Cloudflare 里，前端代码中完全没有**。

全程只需要电脑上的浏览器，不用装任何软件。预计 10 分钟。

---

## 0. 开始之前

准备三样东西：

| 需要 | 说明 |
| --- | --- |
| Cloudflare 账号 | 没有就注册，免费，不需要绑卡 |
| 智谱 API Key | 在智谱控制台能查到的那串 `xxxxxxxx.xxxxxxxx` |
| 代码文件 | 本机 `WalpurgisNightSim\worker\standalone.js`，用记事本打开即可 |

打开方式：文件资源管理器进到 `WalpurgisNightSim\worker\`，右键 `standalone.js` → 打开方式 → 记事本。**先不要关闭，后面要整段复制。**

---

## 1. 登录 Cloudflare

1. 打开 <https://dash.cloudflare.com/>
2. 没有账号点 **Sign up** 注册；有账号直接登录
3. 登录后看到的是账号首页（Account Home），左侧有一列菜单

---

## 2. 创建 Worker

1. 左侧菜单点 **Workers & Pages**（中文界面叫「Workers 和 Pages」）
2. 点右上角或页面中间的 **Create**（创建）
3. 选择 **Workers** 标签下的 **Start with Hello World!**（从 Hello World 开始）
4. 给 Worker 起个名字，例如 `wnsim-shard`（只能小写字母、数字、连字符）
5. 点 **Deploy**（部署）

部署完成后会进入一个页面，上面有你的地址，形如：

```
https://wnsim-shard.你的子域.workers.dev
```

这个地址先记下来。**注意：你之前那个 `broad-mouse-1492` 就是名字不一样而已，都行。**

---

## 3. 把代码粘进去

1. 在刚才的页面点 **Edit code**（编辑代码），会打开一个在线编辑器，里面是默认的 Hello World 代码
2. 点一下编辑器里的代码区域
3. **Ctrl+A** 全选 → **Delete** 删掉
4. 回到记事本里的 `standalone.js`，**Ctrl+A** 全选 → **Ctrl+C** 复制
5. 切回浏览器编辑器，**Ctrl+V** 粘贴
6. 点右上角 **Deploy**（部署）

> 粘贴后代码大概 400 行，第一行是 `var __defProp = ...` 之类的，这是正常的打包结果。
> 如果你看到 import ... from 开头的，那是拿错文件了——要用 `standalone.js`，不是 `index.js`。

---

## 4. 配置变量（最关键的一步）

1. 回到这个 Worker 的详情页
2. 点 **Settings**（设置）标签
3. 找到 **Variables and Secrets**（变量和机密）
4. 点 **Add**（添加），添加第一个：

   | 字段 | 填什么 |
   | --- | --- |
   | Type | **Secret**（机密） |
   | Variable name | `VISION_API_KEY` |
   | Value | 你的智谱 API Key（形如 `xxxxxxxx.xxxxxxxx`，在智谱控制台复制） |

5. 再点一次 **Add**，添加第二个：

   | 字段 | 填什么 |
   | --- | --- |
   | Type | **Text**（文本） |
   | Variable name | `VISION_PROVIDER` |
   | Value | `zhipu` |

6. 点 **Save and Deploy** / **Deploy**（有的界面叫「保存并部署」）

> 两个变量的区别：`VISION_API_KEY` 是机密，保存后连你自己都看不到原值，只能覆盖；
> `VISION_PROVIDER` 是普通文本，值就是 `zhipu`，告诉 Worker 用智谱的接口。

---

## 5. 确认外网地址是通的

1. 还在这个 Worker 的 **Settings** 页面，点 **Domains & Routes**（域和路由）
2. 确认列表里有 `xxxx.workers.dev`，并且状态是启用的（Enabled）

如果这里没有，点 **Add** → **Workers.dev** 启用。

---

## 6. 验证（两分钟）

### 6.1 浏览器验证

浏览器直接打开你的地址（不带 `/api/recognize`）：

```
https://wnsim-shard.你的子域.workers.dev/
```

- ✅ 看到 `{"error":"method not allowed"}` → **成功**，Worker 活着
- ❌ 看到 Cloudflare 的 HTML 页面「Page not found」 → Worker 没部署成功，或 workers.dev 路由没开，回到第 4、5 步

### 6.2 用真实图片验证（推荐）

⚠️ **不要直接把原图 base64 发过去**。免费模型在 1275px 这种小图上读不全（会返回 `unreadable`），前端是先把图片放大到长边 2000px 再发的。命令行测试要么先放大，要么直接用仓库里现成的脚本。

仓库根目录有个 [`test-worker.ps1`](../../test-worker.ps1)，已经把「放大到 2000px → 转 JPEG → POST」都写好了。在 PowerShell 里执行（改两处路径/地址）：

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\Ryou33\Documents\deepseek-harness\default-workspace\test-worker.ps1" `
  -ImagePath "C:\Users\Ryou33\Pictures\你的碎片截图.png" `
  -Url "https://wnsim-shard.你的子域.workers.dev/api/recognize"
```

正常会输出：

```json
{
  "sinners": [
    { "id": "yisang", "shards": 211 },
    { "id": "faust", "shards": 191 }
  ],
  "model": "glm-4v-flash"
}
```

末尾还会打印「识别到 12 位罪人，模型 glm-4v-flash」。看到这两行就是全通了。

> 如果自己写脚本，记得先放大图片：长边 < 1600px 时免费模型基本读不出被裁切的第一行。

---

## 7. 把前端接上去

前端需要一个地址，告诉它「识别请求发给谁」。

### 如果站点部署在 Vercel

1. Vercel 项目 → **Settings** → **Environment Variables**
2. 新增：

   | Name | Value |
   | --- | --- |
   | `VITE_RECOGNIZE_ENDPOINT` | `https://wnsim-shard.你的子域.workers.dev/api/recognize` |

3. 回到 **Deployments**，对最新一条点 **Redeploy**（环境变量只在部署时注入）

### 如果站点部署在 GitHub Pages

**不用去 Settings 里找 Variables**（那个入口在不同版界面里位置不一样，容易找不到）。地址不是机密，直接写进仓库文件就行：

1. 打开仓库根目录的 `.env.production`
2. 把这一行改成你的地址：

   ```bash
   VITE_RECOGNIZE_ENDPOINT=https://你的worker.地址.workers.dev/api/recognize
   ```

3. 提交并推送（GitHub 网页上直接编辑也行：仓库 → 点开 `.env.production` → 右上角铅笔图标 → 改完 Commit changes）
4. Pages 的 Actions 会自动重新构建部署，等 1–2 分钟刷新页面

> 如果你确实想用仓库变量：入口是 `https://github.com/你的用户名/你的仓库/settings/variables/actions`
> （Settings → 左侧 **Secrets and variables** → **Actions** → 顶部切到 **Variables** 标签）。

### 如果只是本地测试

编辑 `WalpurgisNightSim\.env.local`：

```bash
VITE_RECOGNIZE_ENDPOINT=https://wnsim-shard.你的子域.workers.dev/api/recognize
```

然后重启 `npm run dev`（或 `dev.cmd`）。

> 配了这个之后，前端就不再需要 `VITE_VISION_API_KEY`，Key 也不会被打进产物。

---

## 8. 常见错误对照表

| 你看到的 | 原因 | 怎么修 |
| --- | --- | --- |
| 浏览器打开是 HTML「Page not found」 | Worker 没部署，或 workers.dev 路由没开 | 回到第 4、5 步 |
| `{"error":"server not configured"}` | 没加 `VISION_API_KEY`，或加了没重新 Deploy | 第 4 步，加完点 Deploy |
| `{"error":"upstream_error","detail":"...401..."}` | Key 填错 / 有空格 / 被停用 | 重新粘贴 Key，注意不要带引号 |
| `{"error":"upstream_error","detail":"...429..."}` | 触发了智谱的额度或频率限制 | 等一分钟再试；免费额度按天算 |
| `{"error":"unreadable"}` | 图太小或数字看不清（命令行测试常见） | 用 `test-worker.ps1`（会先放大到 2000px），或直接用页面上的上传按钮 |
| 前端报 `Failed to fetch` | 跨域被拒，或地址写错 | 检查 `ALLOWED_ORIGINS`；本地调试可先设成 `*` |
| 前端一直「识别中…」然后超时 | 地址写错（少了 `/api/recognize`），或 Worker 报错 | 先用第 6.2 步的 PowerShell 单独测 Worker |

`ALLOWED_ORIGINS` 是可选项：不填默认允许所有来源（`*`），适合先跑通；跑通后建议改成你的站点域名，多个用逗号分隔，例如：

```
ALLOWED_ORIGINS = https://你的项目.vercel.app,https://ryou33333.github.io
```

---

## 9. 可选：换成自己的域名

`xxx.workers.dev` 在国内访问时好时坏。有域名的话：

1. 域名托管在 Cloudflare（Nameserver 指向 CF）
2. Worker → **Settings** → **Domains & Routes** → **Add** → **Custom Domain**
3. 填 `api.你的域名.com`，保存即可

之后前端地址换成 `https://api.你的域名.com/api/recognize`。

---

## 10. 安全与额度

- Key 存在 Worker 的 Secret 里，前端产物、浏览器网络面板里都看不到
- Worker 自带限流：**每个 IP 每 10 分钟 12 次**，防止别人拿你的地址刷额度
- Worker 只接受图片，不能当通用智谱代理用
- 免费额度：Cloudflare Worker 每天 10 万请求，个人站点根本用不完；智谱那边按它自己的免费额度走
- 万一 Key 泄露：去智谱控制台把 Key 删掉重新生成，然后回第 4 步替换 `VISION_API_KEY`
