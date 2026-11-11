#!/usr/bin/env node
/**
 * 图鉴变更检查：对比「边狱公司 BWIKI」和你本地的 identities.ts，列出差异。
 *
 * 重要说明（2026-11 实测）：
 * - 灰机 wiki（limbus.huijiwiki.com）在 Cloudflare 反爬后面，服务器和无头浏览器
 *   都只能拿到「请稍候…」验证页，没法自动抓。
 * - B 站 wiki 有开放 API，可以用，但：
 *     1) 分类:人格 只有 75 个页面，不是完整镜像；
 *     2) 命名规则和灰机不同（"N社执锤者浮士德" vs "浮士德N社..."），
 *        而且没有 5 位编号，无法和现有 id / 头像文件对应。
 *   所以这个脚本只做「差异报告」，不会自动改 identities.ts。
 *
 * 用法：
 *   npm run wiki:diff
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://wiki.biligame.com/limbuscompany/api.php';
const UA = 'wnsim-wiki-diff/1.0 (+https://github.com/ryou33333/WalpurgisNightSim)';

const SINNER_BY_NUM = [
  'yisang', 'faust', 'don', 'ryoshu', 'meursault', 'honglu',
  'heathcliff', 'ishmael', 'rodion', 'sinclair', 'outis', 'gregor',
];

const SINNER_NAME = {
  yisang: '李箱', faust: '浮士德', don: '堂吉诃德', ryoshu: '良秀',
  meursault: '默尔索', honglu: '鸿璐', heathcliff: '希斯克利夫', ishmael: '以实玛利',
  rodion: '罗佳', sinclair: '辛克莱', outis: '奥提斯', gregor: '格里高尔',
};

const RARITY = { '3星': '000', '2星': '00', '1星': '0' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params, method = 'GET') {
  const body = new URLSearchParams({ format: 'json', ...params }).toString();
  const url = method === 'GET' ? `${API}?${body}` : API;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url, {
      method,
      headers: {
        'user-agent': UA,
        ...(method === 'POST' ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: method === 'POST' ? body : undefined,
    });
    if (res.ok) return res.json();
    if (res.status === 414) throw new Error('查询字符串过长（414），请把批量改小');
    if (res.status === 429 || res.status >= 500) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    throw new Error(`API ${res.status}`);
  }
  throw new Error('API 连续失败，稍后再试');
}

async function listCategory(category = '分类:人格') {
  const pages = [];
  const subcats = [];
  let cont = {};
  do {
    const data = await api({
      action: 'query',
      list: 'categorymembers',
      cmtitle: category,
      cmlimit: '500',
      cmtype: 'page|subcat',
      ...cont,
    });
    for (const item of data?.query?.categorymembers ?? []) {
      if (item.ns === 14) subcats.push(item.title);
      else pages.push(item.title);
    }
    cont = data?.continue ?? {};
    if (Object.keys(cont).length) await sleep(300);
  } while (Object.keys(cont).length);

  for (const sub of subcats) {
    await sleep(300);
    pages.push(...(await listCategory(sub)));
  }
  return [...new Set(pages)];
}

async function fetchWikitext(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 20) {
    const chunk = titles.slice(i, i + 20);
    const data = await api(
      {
        action: 'query',
        prop: 'revisions',
        rvslots: 'main',
        rvprop: 'content',
        titles: chunk.join('|'),
      },
      'POST',
    );
    for (const page of Object.values(data?.query?.pages ?? {})) {
      const content = page?.revisions?.[0]?.slots?.main?.['*'];
      if (content) out.set(page.title, content);
    }
    await sleep(400);
  }
  return out;
}

function parseTemplate(text) {
  const block = text.match(/\{\{人格[\s\S]*?\n\}\}/);
  if (!block) return null;
  const fields = {};
  for (const line of block[0].split('\n')) {
    const m = line.match(/^\s*\|\s*([^=|]+?)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in fields)) fields[m[1]] = m[2];
  }
  return fields;
}

function toRecord(title, fields) {
  if (!fields) return null;
  const name = (fields['名称'] || title).trim();
  const sinnerNum = Number((fields['罪人编号'] || '').replace(/\D/g, ''));
  const sinnerId = SINNER_BY_NUM[sinnerNum - 1];
  const rarity = RARITY[(fields['稀有度'] || '').trim()];
  if (!sinnerId || !rarity) return null;

  const sinnerName = SINNER_NAME[sinnerId];
  const suffix = name.endsWith(sinnerName) ? name.slice(0, -sinnerName.length) : name;
  return {
    title,
    sinnerId,
    sinnerName,
    rarity,
    cleanName: suffix.trim() || name,
    name: sinnerName + (suffix.trim() || name),
    released: (fields['实装日期'] || '').trim(),
  };
}

function readExisting() {
  const file = path.join(ROOT, 'src/data/identities.ts');
  const text = fs.readFileSync(file, 'utf8');
  const start = text.indexOf('= [');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < 0) throw new Error('identities.ts 结构不认识');
  return { list: JSON.parse(text.slice(start + 2, end + 1)) };
}

const normalize = (s) => String(s ?? '').replace(/[\s·・\-—()（）:：]/g, '').toLowerCase();

async function main() {
  console.log('拉取 BWIKI 分类:人格 ...');
  const titles = await listCategory();
  console.log(`页面数: ${titles.length}`);

  const wikitext = await fetchWikitext(titles);
  const records = [];
  for (const [title, text] of wikitext) {
    const record = toRecord(title, parseTemplate(text));
    if (record) records.push(record);
  }
  console.log(`解析出 ${records.length} 条人格数据`);

  const { list } = readExisting();
  const localNames = new Set(list.map((item) => normalize(item.name)));
  const localClean = new Set(list.map((item) => `${item.sinnerId}|${normalize(item.cleanName)}`));

  const onlyOnWiki = records.filter(
    (record) =>
      !localClean.has(`${record.sinnerId}|${normalize(record.cleanName)}`) &&
      !localNames.has(normalize(record.name)),
  );
  const localNamesSet = new Set(records.map((r) => normalize(r.name)));
  const onlyLocal = list.filter((item) => !localNamesSet.has(normalize(item.name)));

  console.log(`\n本地 ${list.length} 条 · wiki ${records.length} 条`);
  console.log(`wiki 有、本地没有: ${onlyOnWiki.length}`);
  for (const item of onlyOnWiki.slice(0, 30)) {
    console.log(`  + [${item.rarity}] ${item.name}（${item.released || '日期未知'}）`);
  }
  console.log(`\n本地有、wiki 分类里没有: ${onlyLocal.length}（多数是 wiki 分类不全，不代表要删）`);

  const reportPath = path.join(ROOT, 'src/data/wiki-diff.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: 'https://wiki.biligame.com/limbuscompany 分类:人格',
        wikiTotal: records.length,
        localTotal: list.length,
        onlyOnWiki,
        onlyLocal: onlyLocal.map((item) => ({ name: item.name, rarity: item.rarity })),
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`\n报告: ${path.relative(ROOT, reportPath)}`);
  console.log('提示：这里只是差异清单，合并进 identities.ts 需要人工确认（wiki 没有 5 位编号，无法自动对应头像/旧 id）。');
}

main().catch((err) => {
  console.error('检查失败:', err.message);
  process.exit(1);
});
