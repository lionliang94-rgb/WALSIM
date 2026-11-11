#!/usr/bin/env node
/**
 * 从「边狱公司中文维基」抓取全部人格（灰机 wiki）。
 *
 * 为什么要在你本机跑、而且要开一个真浏览器：
 *   灰机 wiki 挂在 Cloudflare 后面，服务器 / 无头浏览器都被判定成机器人（一直停在
 *   「请稍候…」）。用你本机启动的真实 Edge 过验证后，页面和 /api.php 就都能正常访问了。
 *
 * 用法：
 *   npm run wiki:capture
 *   抓完会写 src/data/wiki-snapshot.json，并列出「wiki 有、本地没有」的新人格编号。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE_URL = 'https://limbuscompany.huijiwiki.com/wiki/%E4%BA%BA%E6%A0%BC';
const CDP_PORT = 9223;
const CDP = `http://127.0.0.1:${CDP_PORT}`;
const PROFILE = path.join(process.env.TEMP || '/tmp', 'wnsim-wiki-browser');

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/microsoft-edge',
  '/usr/bin/google-chrome',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpAlive() {
  try {
    const res = await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureBrowser() {
  if (await cdpAlive()) {
    console.log('复用已打开的调试浏览器');
    return;
  }
  const exe = EDGE_CANDIDATES.find((p) => fs.existsSync(p));
  if (!exe) throw new Error('没找到 Edge/Chrome，可手动打开浏览器后重试');

  console.log('启动浏览器（会弹出一个窗口，正常现象）...');
  spawn(
    exe,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${PROFILE}`,
      '--no-first-run',
      '--window-size=1280,900',
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' },
  ).unref();

  for (let i = 0; i < 20; i += 1) {
    await sleep(500);
    if (await cdpAlive()) return;
  }
  throw new Error('浏览器启动超时');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      id += 1;
      pending.set(id, (msg) => (msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });

  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  return { ws, send, ready };
}

async function main() {
  await ensureBrowser();

  const targets = await (await fetch(`${CDP}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page' && !t.url.startsWith('devtools'));
  if (!page) throw new Error('没有可用的标签页');

  const { ws, send, ready } = connect(page.webSocketDebuggerUrl);
  await ready;
  await send('Page.enable');
  await send('Page.navigate', { url: PAGE_URL });

  let passed = false;
  for (let i = 0; i < 15; i += 1) {
    await sleep(3000);
    const state = await send('Runtime.evaluate', {
      expression: '({ t: document.title, n: document.images.length })',
      returnByValue: true,
    });
    const value = state.result?.value ?? {};
    process.stdout.write(`  ${(i + 1) * 3}s 标题=${JSON.stringify(value.t)} 图片=${value.n}\n`);
    if (value.n > 500) {
      passed = true;
      break;
    }
  }

  if (!passed) {
    ws.close();
    throw new Error('没等到页面加载完成；如果浏览器窗口停在验证页，手动点一下验证再重跑');
  }

  const rows = await send('Runtime.evaluate', {
    expression: `(() => {
      const out = [];
      for (const img of document.images) {
        const alt = decodeURIComponent(img.alt || '');
        const src = decodeURIComponent(img.src || '');
        const m = alt.match(/^头像-(.+?)-(\\d{5})\\.png$/) || src.match(/头像-(.+?)-(\\d{5})\\.png/);
        if (!m) continue;
        const a = img.closest('a');
        out.push({ code: m[2], sinner: m[1], name: a ? (a.title || a.textContent || '').trim() : '' });
      }
      const map = new Map();
      for (const r of out) if (!map.has(r.code)) map.set(r.code, r);
      return [...map.values()];
    })()`,
    returnByValue: true,
  });

  const data = rows.result?.value ?? [];
  ws.close();

  if (!data.length) throw new Error('页面上没抓到人格头像，可能页面结构变了');

  const snapshotPath = path.join(ROOT, 'src/data/wiki-snapshot.json');
  fs.writeFileSync(
    snapshotPath,
    JSON.stringify({ capturedAt: new Date().toISOString(), source: PAGE_URL, rows: data }, null, 2),
    'utf8',
  );

  console.log(`\n抓到 ${data.length} 个人格 → ${path.relative(ROOT, snapshotPath)}`);

  const tsPath = path.join(ROOT, 'src/data/identities.ts');
  const text = fs.readFileSync(tsPath, 'utf8');
  const existing = JSON.parse(text.slice(text.indexOf('= [') + 2, text.lastIndexOf(']') + 1));
  const known = new Set(existing.map((item) => item.code).filter(Boolean));
  const fresh = data.filter((item) => !known.has(item.code));

  console.log(`本地 ${known.size} 个编号 / wiki ${data.length} 个`);
  if (fresh.length) {
    console.log(`\n新人格（wiki 有、本地没有）：${fresh.length}`);
    for (const item of fresh) console.log(`  + ${item.code}  ${item.name}`);
    console.log('\n下一步：把新编号补进 identities.ts（需要头像和稀有度，可以再跑一次对话让我处理）。');
  } else {
    console.log('\n没有新人格，本地数据是最新的。');
  }
}

main().catch((err) => {
  console.error('抓取失败:', err.message);
  process.exit(1);
});
