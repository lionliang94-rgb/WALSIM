#!/usr/bin/env node
/**
 * 一键同步图鉴：抓 wiki → 找出新人格 → 补稀有度/日期/头像 → 写进 identities.ts
 *
 * 运行：npm run wiki:sync   （或双击 wiki-sync.cmd）
 *
 * 原理：灰机 wiki 有 Cloudflare 反爬，服务器抓不到；这里启动你本机的真实 Edge，
 * 过验证后在页面上下文里取数据（同源，不会被拦）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIST_URL = 'https://limbuscompany.huijiwiki.com/wiki/%E4%BA%BA%E6%A0%BC';
const ORIGIN = 'https://limbuscompany.huijiwiki.com';
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
    return (await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}

async function ensureBrowser() {
  if (await cdpAlive()) return;
  const exe = EDGE_CANDIDATES.find((p) => fs.existsSync(p));
  if (!exe) throw new Error('没找到 Edge，请先手动打开浏览器再重试');
  console.log('启动浏览器（会弹出窗口，正常现象）...');
  spawn(
    exe,
    [`--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--window-size=1280,900', 'about:blank'],
    { detached: true, stdio: 'ignore' },
  ).unref();
  for (let i = 0; i < 24; i += 1) {
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

function readDatabase() {
  const file = path.join(ROOT, 'src/data/identities.ts');
  const text = fs.readFileSync(file, 'utf8');
  const start = text.indexOf('= [');
  const end = text.lastIndexOf(']');
  return { file, list: JSON.parse(text.slice(start + 2, end + 1)) };
}

const HEADER = `export interface Identity {
  id: string;
  code: string;
  sinnerId: string;
  sinnerName: string;
  rarity: '000' | '00' | '0';
  name: string;
  cleanName: string;
  nickname: string;
  image: string;
  wikiImg: string;
  oldId?: string;
}

export const IDENTITIES_DATABASE: Identity[] = `;

const RARITY_MAP = { 3: '000', 2: '00', 1: '0' };

async function main() {
  await ensureBrowser();

  const targets = await (await fetch(`${CDP}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page' && !t.url.startsWith('devtools'));
  if (!page) throw new Error('没有可用标签页');

  const { ws, send, ready } = connect(page.webSocketDebuggerUrl);
  await ready;
  await send('Page.enable');
  await send('Page.navigate', { url: LIST_URL });

  let loaded = false;
  for (let i = 0; i < 15; i += 1) {
    await sleep(3000);
    const st = await send('Runtime.evaluate', { expression: '({ t: document.title, n: document.images.length })', returnByValue: true });
    const v = st.result?.value ?? {};
    process.stdout.write(`  等待页面… ${(i + 1) * 3}s 图片=${v.n}\n`);
    if (v.n > 500) {
      loaded = true;
      break;
    }
  }
  if (!loaded) throw new Error('页面没加载出来；若停在验证页，手动过一下再重跑');

  // 1. 抓全部人格
  const captured = await send('Runtime.evaluate', {
    expression: `(() => {
      const out = new Map();
      for (const img of document.images) {
        const alt = decodeURIComponent(img.alt || '');
        const src = decodeURIComponent(img.src || '');
        const m = alt.match(/^头像-(.+?)-(\\d{5})\\.png$/) || src.match(/头像-(.+?)-(\\d{5})\\.png/);
        if (!m) continue;
        const a = img.closest('a');
        if (out.has(m[2])) continue;
        out.set(m[2], {
          code: m[2],
          sinner: m[1],
          name: a ? (a.title || '').trim() : '',
          href: a ? a.getAttribute('href') : '',
          img: img.currentSrc || img.src,
        });
      }
      return [...out.values()];
    })()`,
    returnByValue: true,
  });
  const rows = captured.result?.value ?? [];
  if (!rows.length) throw new Error('没抓到人格，页面结构可能变了');
  console.log(`\n抓到 ${rows.length} 个人格`);

  // 2. 找新增
  const { file, list } = readDatabase();
  const known = new Set(list.map((i) => i.code).filter(Boolean));
  const fresh = rows.filter((r) => !known.has(r.code));

  if (!fresh.length) {
    console.log('没有新人格，图鉴已是最新。');
    ws.close();
    return;
  }
  console.log(`新人格 ${fresh.length} 个，开始补详情…`);

  const SINNER_IDS = ['yisang', 'faust', 'don', 'ryoshu', 'meursault', 'honglu', 'heathcliff', 'ishmael', 'rodion', 'sinclair', 'outis', 'gregor'];
  const SINNER_NAME = {
    yisang: '李箱', faust: '浮士德', don: '堂吉诃德', ryoshu: '良秀', meursault: '默尔索', honglu: '鸿璐',
    heathcliff: '希斯克利夫', ishmael: '以实玛利', rodion: '罗佳', sinclair: '辛克莱', outis: '奥提斯', gregor: '格里高尔',
  };
  const nameToId = {
    李箱: 'yisang', 浮士德: 'faust', 堂吉诃德: 'don', 良秀: 'ryoshu', 默尔索: 'meursault', 鸿璐: 'honglu',
    希斯克利夫: 'heathcliff', 以实玛利: 'ishmael', 罗佳: 'rodion', 辛克莱: 'sinclair', 奥提斯: 'outis', 格里高尔: 'gregor',
  };

  const avatarsDir = path.join(ROOT, 'public/avatars');
  fs.mkdirSync(avatarsDir, { recursive: true });

  for (const item of fresh) {
    const sinnerId = nameToId[item.sinner] ?? SINNER_IDS[Math.floor(Number(item.code.slice(0, 3)) / 100) - 1] ?? 'yisang';
    const sinnerName = SINNER_NAME[sinnerId] ?? item.sinner;
    const cleanName = item.name.startsWith(sinnerName) ? item.name.slice(sinnerName.length).trim() : item.name;

    // 详情页：稀有度 + 登场时间
    const detail = await send('Runtime.evaluate', {
      expression: `(async () => {
        const res = await fetch('/api.php?format=json&action=parse&prop=text&page=' + encodeURIComponent(${JSON.stringify(item.name)}), { credentials: 'include' });
        const data = await res.json();
        const html = data?.parse?.text?.['*'] ?? '';
        const text = html.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ');
        const rarityImg = html.match(/稀有度([123])\\.png/);
        const starAlt = html.match(/([123])星/);
        const date = text.match(/(\\d{4})[.年\\-](\\d{1,2})[.月\\-](\\d{1,2})/);
        return {
          rarity: rarityImg ? Number(rarityImg[1]) : starAlt ? Number(starAlt[1]) : null,
          date: date ? date[0] : null,
          htmlLen: html.length
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    const info = detail.result?.value ?? {};
    a11y: {
      // 稀有度只认 infobox 里的 稀有度N.png；认不出就中止，绝不猜
      if (!info.rarity) {
        console.log(`  ! ${item.code} ${item.name}：拿不到稀有度，已中止写入（请手工确认）`);
        console.log('\n未修改 identities.ts。');
        ws.close();
        process.exit(1);
      }
    }
    const rarity = RARITY_MAP[info.rarity] ?? '00';

    // 头像下载（页面上下文里取，绕过 CF；先试原图，失败退回缩略图）
    const imageData = await send('Runtime.evaluate', {
      expression: `(async () => {
        const src = ${JSON.stringify(item.img)};
        const abs = src.startsWith('http') ? src : new URL(src, location.origin).href;
        // 缩略图 URL 形如 /uploads/thumb/e/e4/xx.png/70px-xx.png —— 去掉 /thumb/.../70px- 就是原图
        const full = abs.replace(/\\/thumb\\/(.+?)\\/\\d+px-/, '/$1/');
        const candidates = [abs.replace(/\\/\\d+px-/, '/256px-'), full, abs];
        for (const url of candidates) {
          try {
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) continue;
            const buf = await res.arrayBuffer();
            if (buf.byteLength < 1000) continue;
            const bytes = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
            return btoa(binary);
          } catch { /* 下一个 */ }
        }
        return null;
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    const b64 = typeof imageData.result?.value === 'string' ? imageData.result.value : null;
    if (b64) fs.writeFileSync(path.join(avatarsDir, `${item.code}.png`), Buffer.from(b64, 'base64'));

    list.push({
      id: `id_${item.code}`,
      code: item.code,
      sinnerId,
      sinnerName,
      rarity,
      name: item.name,
      cleanName: cleanName || item.name,
      nickname: cleanName || item.name,
      image: `./avatars/${item.code}.png`,
      wikiImg: '',
    });

    console.log(`  + ${item.code} ${item.name}  稀有度=${rarity} 登场=${info.date ?? '未知'} 头像=${b64 ? '已下载' : '失败'}`);
  }

  ws.close();

  fs.writeFileSync(file, HEADER + JSON.stringify(list, null, 2) + ';\n', 'utf8');
  console.log(`\n已写入 ${path.relative(ROOT, file)}（${list.length} 条）`);
  console.log('昵称先按「去掉罪人前缀的名字」生成，需要的话可以在 App 里手动改。');
}

main().catch((err) => {
  console.error('同步失败:', err.message);
  process.exit(1);
});
