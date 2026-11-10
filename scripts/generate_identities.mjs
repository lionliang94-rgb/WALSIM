import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('public/assets/wiki_identities.json', 'utf8'));

const threeStarStarts = {
  1: '10103', 2: '10204', 3: '10302', 4: '10403',
  5: '10503', 6: '10603', 7: '10703', 8: '10802',
  9: '10902', 10: '11002', 11: '11104', 12: '11203'
};

const sinnerIdMap = {
  1: 'yisang', 2: 'faust', 3: 'don', 4: 'ryoshu',
  5: 'meursault', 6: 'honglu', 7: 'heathcliff', 8: 'ishmael',
  9: 'rodion', 10: 'sinclair', 11: 'outis', 12: 'gregor'
};

const codeNicknames = {
  // 李箱 (101xx)
  '10101': '初始箱', '10102': '七箱', '10103': '剑箱', '10104': '花箱',
  '10105': '臼箱', '10106': 'W箱', '10107': '副官箱', '10108': '迪箱',
  '10109': '环箱', '10110': '蝶箱', '10111': '提灯箱', '10112': '六箱',
  '10113': '凶弹箱', '10114': '黑箱', '10115': '父辈箱', '10116': '次元箱',

  // 浮士德 (102xx)
  '10201': '初始浮', '10202': 'W浮', '10203': '脑叶浮', '10204': '握浮',
  '10205': '茨浮', '10206': '七浮', '10207': '悔恨浮', '10208': '剑浮',
  '10209': '管家浮', '10210': '裂纹浮', '10211': '红煞浮', '10212': '黑浮',
  '10213': '史浮', '10214': '纸条浮', '10215': '环浮', '10216': '尤娜浮',

  // 堂吉诃德 (103xx)
  '10301': '初始唐', '10302': 'W唐', '10303': '史唐', '10304': '中锤唐',
  '10305': '辛唐', '10306': '中唐', '10307': '灯笼唐', '10308': '剑唐',
  '10309': 'T唐', '10310': '总督唐', '10311': '东辛唐', '10312': '爱憎唐',
  '10313': '黑唐', '10314': '代行唐', '10315': '黑派唐',

  // 良秀 (104xx)
  '10401': '初始良', '10402': '七良', '10403': '黑良', '10404': '厨良',
  '10405': 'W良', '10406': 'LCCB良', '10407': '六良', '10408': '管家良',
  '10409': '圣愚良', '10410': '赤忏良', '10411': '黑卯良', '10412': '敬畏良',
  '10413': '浪人良', '10414': '余香良', '10415': '巢刃良', '10416': '制鞋良',

  // 默尔索 (105xx)
  '10501': '初始默', '10502': '六默', '10503': 'W默', '10504': '大锤默',
  '10505': '扳手默', '10506': '犀牛默', '10507': '中默', '10508': '剑默',
  '10509': '死兔默', '10510': '迪默', '10511': '辛默', '10512': '拇指默',
  '10513': '王子默', '10514': '变调黄蜂', '10515': '野兽默',

  // 鸿璐 (106xx)
  '10601': '初始璐', '10602': '黑璐', '10603': '豆豆璐', '10604': '六璐',
  '10605': 'K璐', '10606': 'W璐', '10607': '吊钩璐', '10608': '迪璐',
  '10609': '圣愚璐', '10610': '猎牙璐', '10611': '句点璐', '10612': '鹿璐',
  '10613': '君主璐', '10614': '环父璐', '10615': '推奴璐', '10616': '辛璐',
  '10617': '广播璐',

  // 希斯克利夫 (107xx)
  '10701': '初始希', '10702': '史希', '10703': '兔希', '10704': '小锤希',
  '10705': '狐雨希', '10706': '七希', '10707': '鱼叉希', '10708': '欧希',
  '10709': '裂纹希', '10710': '魔王希', '10711': '句点希', '10712': '黑希',
  '10713': 'CCA希', '10714': '黑酉希', '10715': '中兄希', '10716': '拇指希',
  '10717': '裁缝希',

  // 以实玛利 (108xx)
  '10801': '初始玛', '10802': '鹿玛', '10803': '史玛', '10804': '散弹玛',
  '10805': '荡漾玛', '10806': '六玛', '10807': '船工玛', '10808': '船玛',
  '10809': '管家玛', '10810': '茨玛', '10811': '黑玛', '10812': '家主玛',
  '10813': '定玛', '10814': '中指玛', '10815': 'LCD玛', '10816': '红派玛',

  // 罗佳 (109xx)
  '10901': '初始罗', '10902': '黑罗', '10903': '斧罗', '10904': '中锤罗',
  '10905': '扳手罗', '10906': '茨罗', '10907': '迪罗', '10908': '六罗',
  '10909': 'T罗', '10910': '德罗', '10911': '公主罗', '10912': '黑巳罗',
  '10913': '魔剑罗', '10914': '鹿罗', '10915': '讲解罗', '10916': '拇指罗',
  '10917': '改衣罗',

  // 辛克莱 (110xx)
  '11001': '初始辛', '11002': '剑辛', '11003': '茨辛', '11004': '乐队辛',
  '11005': 'N辛', '11006': '符咒辛', '11007': '船工辛', '11008': '辛辛',
  '11009': '菲辛', '11010': '西茨辛', '11011': '德辛', '11012': '中指辛',
  '11013': '东兵辛', '11014': '黑酉辛', '11015': '小指辛', '11016': '赤神辛',

  // 奥提斯 (111xx)
  '11101': '初始奥', '11102': '剑奥', '11103': '虫奥', '11104': '七奥',
  '11105': '臼奥', '11106': '辛奥', '11107': '魔弹奥', '11108': '管家奥',
  '11109': '环奥', '11110': 'W奥', '11111': '理发奥', '11112': '黑卯奥',
  '11113': 'T奥', '11114': '先锋奥', '11115': '拇指奥',

  // 格里高尔 (112xx)
  '11201': '初始格', '11202': '六格', '11203': '虫叔', '11204': '帮厨格',
  '11205': '扳手格', '11206': '茨格', '11207': '海盗格', '11208': '黑格',
  '11209': '继承格', '11210': '神父格', '11211': '炎拳格', '11212': '黑巳格',
  '11213': '夜锥格', '11214': '目灯格', '11215': 'AEDD格', '11216': '萨尔瓦多格'
};

const oldIdMap = {
  '10110': 'yisang_solemn', '10104': 'yisang_spicebush', '10106': 'yisang_wcorp',
  '10102': 'yisang_seven', '10108': 'yisang_dieci', '10105': 'yisang_molar', '10107': 'yisang_pequod',
  '10207': 'faust_regret', '10216': 'faust_yuna', '10204': 'faust_ncorp', '10202': 'faust_wcorp',
  '10203': 'faust_lobcorp', '10206': 'faust_seven', '10209': 'faust_butler',
  '10310': 'don_queen', '10307': 'don_lantern', '10302': 'don_wcorp', '10305': 'don_cinq',
  '10306': 'don_middle', '10303': 'don_shi', '10304': 'don_ncorp',
  '10410': 'ryoshu_redeyes', '10414': 'ryoshu_aroma', '10405': 'ryoshu_wcorp', '10402': 'ryoshu_seven',
  '10403': 'ryoshu_kurokumo', '10404': 'ryoshu_chef',
  '10506': 'meursault_rhino', '10504': 'meursault_ncorp', '10508': 'meursault_blade',
  '10605': 'honglu_kcorp', '10603': 'honglu_tingtang', '10607': 'honglu_hook', '10611': 'honglu_fullstop',
  '10703': 'heathcliff_rabbit', '10707': 'heathcliff_pequod', '10710': 'heathcliff_wildhunt', '10705': 'heathcliff_foxrain',
  '10808': 'ishmael_pequod', '10802': 'ishmael_reindeer', '10807': 'ishmael_molar',
  '10907': 'rodion_dieci', '10913': 'rodion_knight', '10905': 'rodion_wrench',
  '11005': 'sinclair_ncorp', '11009': 'sinclair_dawn', '11008': 'sinclair_cinq',
  '11107': 'outis_magicbullet_ego', '11104': 'outis_seven', '11108': 'outis_butler',
  '11207': 'gregor_twinhook', '11203': 'gregor_gcorp', '11216': 'gregor_salvador'
};

const isThreeStarMap = {};
const identities = [];

raw.forEach(item => {
  const match = item.wikiImg.match(/(\d{5})\.png/);
  if (!match) return; // 过滤无 5 位编号
  const code = match[1];
  const sNum = item.sinnerId;
  const sinnerKey = sinnerIdMap[sNum];

  let rarity = '00';
  if (code.endsWith('01') || item.name.includes('LCB罪人')) {
    rarity = '0';
  } else {
    if (code === threeStarStarts[sNum]) {
      isThreeStarMap[sNum] = true;
    }
    if (isThreeStarMap[sNum]) {
      rarity = '000';
    } else {
      rarity = '00';
    }
  }

  let cleanName = item.name;
  if (cleanName.startsWith(item.sinnerName)) {
    cleanName = cleanName.slice(item.sinnerName.length).trim();
  }

  const nickname = codeNicknames[code] || cleanName;
  const oldId = oldIdMap[code];

  identities.push({
    id: 'id_' + code,
    code,
    sinnerId: sinnerKey,
    sinnerName: item.sinnerName,
    rarity,
    name: item.name,
    cleanName,
    nickname,
    image: './avatars/' + code + '.png',
    wikiImg: item.wikiImg,
    ...(oldId ? { oldId } : {})
  });
});

if (!fs.existsSync('src/data')) {
  fs.mkdirSync('src/data', { recursive: true });
}

const fileContent = `export interface Identity {
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

export const IDENTITIES_DATABASE: Identity[] = ${JSON.stringify(identities, null, 2)};
`;

fs.writeFileSync('src/data/identities.ts', fileContent, 'utf8');
console.log('Successfully wrote src/data/identities.ts with ' + identities.length + ' identities!');
