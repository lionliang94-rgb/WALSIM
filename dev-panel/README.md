# Dev Preview

给 WalpurgisNightSim 用的极简实时预览面板：**只做一件事** —— 把 dev server 放进一个 iframe，文件一改就自动刷新。

不跟踪 diff、不存基线、不依赖任何 npm 包，一个 Node 脚本 + 一张 HTML。

## 启动

```bat
:: 项目根目录
dev.cmd
```

依次：起 Vite dev server（3000）→ 起面板（5199）→ 把面板地址放进剪贴板。

只想起面板（dev server 已在跑）：`dev.cmd /panel`
想同时弹一个独立窗口：`dev.cmd /window`

手动启动：

```bat
node dev-panel\server.mjs
:: 打开 http://127.0.0.1:5199
```

## 界面

一行工具栏 + 一整块预览：

| 控件 | 作用 |
| --- | --- |
| 状态点 | 预览目标是否可访问（每 5 秒探测一次） |
| 下拉框 | 切「本地 dev（127.0.0.1:3000）」/「线上 Pages」 |
| 自动刷新 | 勾选时，项目文件变化约 0.3 秒后自动重载预览 |
| ↻ | 手动刷新 |
| ↗ | 在新标签页打开当前目标 |

宽度小于 760px 会自动收紧工具栏，适配窄栏（DSH 右侧栏）。

预览加载不出来时会显示提示，而不是一片空白。

## 内嵌到 DSH 右侧栏

DSH 右侧栏自带 **Browser** 标签类型（`ui-sidebar-browser`，本机已启用），回环地址也能直接打开：

1. 在 DSH 会话头右上角展开右侧栏
2. 点标签条上的 **+** → Guide → **Browser**
3. 地址栏粘贴 `http://127.0.0.1:5199`（`dev.cmd` 已放进剪贴板），回车

Browser 标签会记住地址，重启后点 Restore 恢复。Desktop 端走 `<webview>`，不受 iframe 嵌站限制。

## 配置

`dev-panel/config.json`：

```jsonc
{
  "project": "..",                       // 相对本目录，用于监听文件变化
  "previewTargets": [                    // 下拉框里的预览目标
    { "label": "本地 dev", "url": "http://127.0.0.1:3000" },
    { "label": "线上 Pages", "url": "https://ryou33333.github.io/WalpurgisNightSim/" }
  ],
  "port": 5199,
  "watchIgnore": ["node_modules", ".git", "dist", "dev-panel", "dev.cmd", ".baseline"]
}
```

端口被占：`set PANEL_PORT=5201`。

## 接口

| 路径 | 作用 |
| --- | --- |
| `GET /api/targets` | 项目路径 + 预览目标 |
| `GET /api/preview-health?url=...` | 目标可达性 |
| `GET /api/events` | SSE，文件变化推送（面板据此自动刷新） |
