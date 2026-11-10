import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CheckSquare, Square, Package, Sparkles, Filter, RotateCcw, 
  Layers, User, Flame, ShieldAlert, Award, Plus, Trash2, 
  ChevronDown, ChevronUp, Calculator, Coins, HelpCircle, Check,
  Calendar, Edit3, AlertTriangle, CheckCircle2, EyeOff, ZoomIn, X,
  Download, Copy, Image as ImageIcon, Loader2, Maximize2, Minimize2, Camera
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';

export interface Sinner {
  id: string;
  num: string;
  name: string;
  en: string;
  color: string;
  bg: string;
  border: string;
  initialShards: number;
  iconType: string;
}

export interface WalpurgisItem {
  id: string;
  edition: number;
  editionName: string;
  sinnerId: string;
  type: string;
  rarity: string;
  name: string;
  shortName: string;
  cost: number;
  tier: string;
  tierDesc: string;
  themeColor: string;
  accentColor: string;
  motif: string;
  abnoCode: string;
  isNewlyUnlocked?: boolean;
  image?: string;
  archetype?: string; 
}

import { IDENTITIES_DATABASE, Identity } from './data/identities';

export { IDENTITIES_DATABASE };
export type { Identity };

// 统一拥有状态匹配函数（兼容新旧 ID、5位编号及历史键名）
export const isIdentityOwned = (item: Identity, ownedIds: string[]): boolean => {
  return ownedIds.includes(item.id) || 
    (item.oldId ? ownedIds.includes(item.oldId) : false) || 
    (item.code ? ownedIds.includes(item.code) : false);
};

// ==========================================
// 边狱公司各战斗体系配置与视觉徽标
// ==========================================
export interface ArchetypeMeta {
  name: string;
  label: string;
  icon: string;
  badgeClass: string;
  tagClass: string;
  color: string;
}

export const ARCHETYPE_CONFIG: Record<string, ArchetypeMeta> = {
  '烧伤': {
    name: '烧伤',
    label: '烧伤体系',
    icon: '🔥',
    badgeClass: 'bg-orange-950/80 border-orange-500/60 text-orange-200 shadow-sm',
    tagClass: 'bg-gradient-to-r from-orange-600/30 to-amber-600/30 border-orange-500/50 text-orange-200',
    color: '#f97316'
  },
  '沉沦': {
    name: '沉沦',
    label: '沉沦体系',
    icon: '💧',
    badgeClass: 'bg-sky-950/80 border-sky-500/60 text-sky-200 shadow-sm',
    tagClass: 'bg-gradient-to-r from-sky-600/30 to-blue-600/30 border-sky-500/50 text-sky-200',
    color: '#38bdf8'
  },
  '流血': {
    name: '流血',
    label: '流血体系',
    icon: '🩸',
    badgeClass: 'bg-rose-950/80 border-rose-500/60 text-rose-200 shadow-sm',
    tagClass: 'bg-gradient-to-r from-rose-600/30 to-red-600/30 border-rose-500/50 text-rose-200',
    color: '#fb7185'
  },
  '破裂': {
    name: '破裂',
    label: '破裂体系',
    icon: '💥',
    badgeClass: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200 shadow-sm',
    tagClass: 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border-emerald-500/50 text-emerald-200',
    color: '#34d399'
  },
  '震颤': {
    name: '震颤',
    label: '震颤体系',
    icon: '🔔',
    badgeClass: 'bg-amber-950/80 border-amber-500/60 text-amber-200 shadow-sm',
    tagClass: 'bg-gradient-to-r from-amber-600/30 to-yellow-600/30 border-amber-500/50 text-amber-200',
    color: '#fbbf24'
  },
  '呼吸': {
    name: '呼吸',
    label: '呼吸体系',
    icon: '🗡️',
    badgeClass: 'bg-cyan-950/80 border-cyan-500/60 text-cyan-200 shadow-sm',
    tagClass: 'bg-gradient-to-r from-cyan-600/30 to-sky-600/30 border-cyan-500/50 text-cyan-200',
    color: '#22d3ee'
  },
  '充能': {
    name: '充能',
    label: '充能体系',
    icon: '⚡',
    badgeClass: 'bg-indigo-950/80 border-indigo-500/60 text-indigo-200 shadow-sm',
    tagClass: 'bg-gradient-to-r from-indigo-600/30 to-violet-600/30 border-indigo-500/50 text-indigo-200',
    color: '#818cf8'
  },
  '通用': {
    name: '通用',
    label: '通用/直伤',
    icon: '⚔️',
    badgeClass: 'bg-zinc-800/80 border-zinc-600/60 text-zinc-200 shadow-sm',
    tagClass: 'bg-zinc-800/50 border-zinc-700 text-zinc-300',
    color: '#d4d4d8'
  }
};

// ==========================================
// 1. 12名罪人基础资料与用户截图预设碎片数据
// ==========================================
const INITIAL_SINNERS: Sinner[] = [
  { id: 'yisang', num: '01', name: '李箱', en: 'Yi Sang', color: '#cbd5e1', bg: '#1e293b', border: '#64748b', initialShards: 211, iconType: 'wings' },
  { id: 'faust', num: '02', name: '浮士德', en: 'Faust', color: '#f8fafc', bg: '#334155', border: '#94a3b8', initialShards: 191, iconType: 'flask' },
  { id: 'don', num: '03', name: '堂吉诃德', en: 'Don Quixote', color: '#facc15', bg: '#422006', border: '#eab308', initialShards: 273, iconType: 'lance' },
  { id: 'ryoshu', num: '04', name: '良秀', en: 'Ryōshū', color: '#ef4444', bg: '#450a0a', border: '#dc2626', initialShards: 208, iconType: 'katana' },
  { id: 'meursault', num: '05', name: '默尔索', en: 'Meursault', color: '#3b82f6', bg: '#172554', border: '#2563eb', initialShards: 194, iconType: 'gauntlet' },
  { id: 'honglu', num: '06', name: '鸿璐', en: 'Hong Lu', color: '#2dd4bf', bg: '#042f2e', border: '#14b8a6', initialShards: 277, iconType: 'jade' },
  { id: 'heathcliff', num: '07', name: '希斯克利夫', en: 'Heathcliff', color: '#a855f7', bg: '#3b0764', border: '#9333ea', initialShards: 356, iconType: 'bat' },
  { id: 'ishmael', num: '08', name: '以实玛利', en: 'Ishmael', color: '#f97316', bg: '#431407', border: '#ea580c', initialShards: 222, iconType: 'harpoon' },
  { id: 'rodion', num: '09', name: '罗佳', en: 'Rodion', color: '#f43f5e', bg: '#4c0519', border: '#e11d48', initialShards: 242, iconType: 'axe' },
  { id: 'sinclair', num: '10', name: '辛克莱', en: 'Sinclair', color: '#eab308', bg: '#3f2e05', border: '#ca8a04', initialShards: 276, iconType: 'halberd' },
  { id: 'outis', num: '11', name: '奥提斯', en: 'Outis', color: '#84cc16', bg: '#1a2e05', border: '#65a30d', initialShards: 320, iconType: 'watch' },
  { id: 'gregor', num: '12', name: '格里高尔', en: 'Gregor', color: '#a16207', bg: '#271705', border: '#b45309', initialShards: 190, iconType: 'claw' },
];

// ==========================================
// 2. 第1期～第9期瓦夜全部25张真实可兑换人格与E.G.O数据库（迎战瓦夜最新评价）
// ==========================================
const INITIAL_WALPURGIS_ITEMS: WalpurgisItem[] = [
  // ================= 第一期 (2023.10) =================
  {
    id: 'w1_faust_regret',
    edition: 1,
    editionName: '第一期 瓦夜 (2023.10)',
    sinnerId: 'faust',
    type: '000人格',
    rarity: '000',
    name: '脑叶E.G.O::悔恨 浮士德',
    shortName: '悔恨浮',
    cost: 400,
    tier: 'T2',
    tierDesc: '早期震颤自颤群攻打手，如今瓦夜环境下数值已跟不上时代。',
    themeColor: '#94a3b8',
    accentColor: '#e2e8f0',
    motif: 'flail',
    abnoCode: 'T-01-54',
    archetype: '震颤',
    image: './images/w1_faust_regret.png'
  },
  {
    id: 'w1_honglu_hook',
    edition: 1,
    editionName: '第一期 瓦夜 (2023.10)',
    sinnerId: 'honglu',
    type: '00人格',
    rarity: '00',
    name: '吊钩事务所收尾人 鸿璐',
    shortName: '吊钩宝',
    cost: 150,
    tier: 'T3',
    tierDesc: '早期二灯流血卡，如今流血队三灯神仙打架，抽瓦夜池时极易歪到，无需专门花碎片换。',
    themeColor: '#14b8a6',
    accentColor: '#ef4444',
    motif: 'hook',
    abnoCode: 'HOOK-02',
    archetype: '流血',
    image: './images/w1_honglu_hook.png'
  },
  {
    id: 'w1_meursault_regret_ego',
    edition: 1,
    editionName: '第一期 瓦夜 (2023.10)',
    sinnerId: 'meursault',
    type: 'E.G.O',
    rarity: 'TETH',
    name: '【悔恨】默尔索',
    shortName: '悔恨默 E.G.O',
    cost: 400,
    tier: 'T0',
    tierDesc: '跨时代真神！被动“束缚的愤怒”直接提供硬币威力+2（减首币点数），几乎所有默尔索强力人格（含第8期黄蜂默、剑契默等）的底层刚需插件，最优先兑换！',
    themeColor: '#3b82f6',
    accentColor: '#f59e0b',
    motif: 'chains',
    abnoCode: 'T-01-54',
    archetype: '震颤',
    image: './images/w1_meursault_regret_ego.png'
  },

  // ================= 第二期 (2024.01) =================
  {
    id: 'w2_outis_magicbullet',
    edition: 2,
    editionName: '第二期 瓦夜 (2024.01)',
    sinnerId: 'outis',
    type: '000人格',
    rarity: '000',
    name: '脑叶E.G.O::魔弹 奥提斯',
    shortName: '魔弹奥',
    cost: 400,
    tier: 'T1',
    tierDesc: '黑焰引爆核心，强烈建议与第5期【魔弹】E.G.O成套兑换以质变启动速度。',
    themeColor: '#2563eb',
    accentColor: '#60a5fa',
    motif: 'rifle',
    abnoCode: 'F-01-69',
    archetype: '烧伤',
    image: './images/w2_outis_magicbullet.png'
  },
  {
    id: 'w2_don_lantern',
    edition: 2,
    editionName: '第二期 瓦夜 (2024.01)',
    sinnerId: 'don',
    type: '00人格',
    rarity: '00',
    name: '脑叶E.G.O::提灯 堂吉诃德',
    shortName: '提灯唐',
    cost: 150,
    tier: 'T2',
    tierDesc: '优质二灯破裂抗伤回血坦。',
    themeColor: '#ca8a04',
    accentColor: '#fef08a',
    motif: 'lantern',
    abnoCode: 'O-04-84',
    archetype: '破裂',
    image: './images/w2_don_lantern.png'
  },

  // ================= 第三期 (2024.05) =================
  {
    id: 'w3_sinclair_dawn',
    edition: 3,
    editionName: '第三期 瓦夜 (2024.05)',
    sinnerId: 'sinclair',
    type: '000人格',
    rarity: '000',
    name: '黎明事务所收尾人 辛克莱',
    shortName: '黎明辛 / 菲利普辛',
    cost: 400,
    tier: 'T0.5',
    tierDesc: '烧伤队核心兼群体清杂王牌！尤其第9期实装萨尔瓦多虫&尤娜浮后，“黎明事务所三人组”联动彻底质变！',
    themeColor: '#ea580c',
    accentColor: '#fde047',
    motif: 'flameSword',
    abnoCode: 'DAWN-03',
    archetype: '烧伤',
    image: './images/w3_sinclair_dawn.png'
  },
  {
    id: 'w3_rodion_sanguine_ego',
    edition: 3,
    editionName: '第三期 瓦夜 (2024.05)',
    sinnerId: 'rodion',
    type: 'E.G.O',
    rarity: 'WAW',
    name: '【血色欲望】罗佳',
    shortName: '血欲罗 E.G.O',
    cost: 400,
    tier: 'T0.5',
    tierDesc: '流血队绝对核心E.G.O！释放当回合直接锁死敌方流血层数不衰减并触发高额流血结算，玩流血体系必换神卡！',
    themeColor: '#dc2626',
    accentColor: '#fecdd3',
    motif: 'redShoes',
    abnoCode: 'O-04-08',
    archetype: '流血',
    image: './images/w3_rodion_sanguine_ego.png'
  },
  {
    id: 'w3_ishmael_wingbeat_ego',
    edition: 3,
    editionName: '第三期 瓦夜 (2024.05)',
    sinnerId: 'ishmael',
    type: 'E.G.O',
    rarity: 'HE',
    name: '【翅振】以实玛利',
    shortName: '翅振玛 E.G.O',
    cost: 400,
    tier: 'T3',
    tierDesc: '多币赌脸回血流血E.G.O，发挥极不稳定，十期瓦夜视角下依然优先度垫底，强烈建议省下箱子。',
    themeColor: '#ea580c',
    accentColor: '#bef264',
    motif: 'fairy',
    abnoCode: 'F-04-83',
    archetype: '流血',
    image: './images/w3_ishmael_wingbeat_ego.png'
  },

  // ================= 第四期 (2024.09) =================
  {
    id: 'w4_yisang_solemn',
    edition: 4,
    editionName: '第四期 瓦夜 (2024.09)',
    sinnerId: 'yisang',
    type: '000人格',
    rarity: '000',
    name: '脑叶E.G.O::庄严哀悼 李箱',
    shortName: '蝶箱',
    cost: 400,
    tier: 'T0',
    tierDesc: '沉沦队绝对主力核心，活蝶与死蝶双机制兼具超高多币爆发与全队理智回复，配合第9期新解禁的李箱本家【庄严哀悼】E.G.O更是完美闭环，必换！',
    themeColor: '#334155',
    accentColor: '#f8fafc',
    motif: 'butterflyGuns',
    abnoCode: 'T-01-68',
    archetype: '沉沦',
    image: './images/w4_yisang_solemn.png'
  },
  {
    id: 'w4_ryoshu_redeyes',
    edition: 4,
    editionName: '第四期 瓦夜 (2024.09)',
    sinnerId: 'ryoshu',
    type: '000人格',
    rarity: '000',
    name: '脑叶E.G.O::赤瞳·忏悔 良秀',
    shortName: '蜘蛛良 / 赤瞳良',
    cost: 400,
    tier: 'T1',
    tierDesc: '极强单兵综合素质，集流血、高额护盾、群体回血回理智于一身的六边形副坦打手，良秀碎片建议优先换第8期余香良后再补她. ',
    themeColor: '#b91c1c',
    accentColor: '#f8fafc',
    motif: 'spiderSkull',
    abnoCode: 'T-02-43',
    archetype: '流血',
    image: './images/w4_ryoshu_redeyes.png'
  },
  {
    id: 'w4_gregor_solemn_ego',
    edition: 4,
    editionName: '第四期 瓦夜 (2024.09)',
    sinnerId: 'gregor',
    type: 'E.G.O',
    rarity: 'HE',
    name: '【庄严哀悼】格里高尔',
    shortName: '哀悼虫 E.G.O',
    cost: 400,
    tier: 'T0.5',
    tierDesc: '多币超高频爆发沉沦E.G.O，对单Boss倾泻蝴蝶与沉沦伤害毁天灭地，沉沦队与蝶箱最佳搭档。',
    themeColor: '#475569',
    accentColor: '#e2e8f0',
    motif: 'butterflyCoffin',
    abnoCode: 'T-01-68',
    archetype: '沉沦',
    image: './images/w4_gregor_solemn_ego.png'
  },

  // ================= 第五期 (2025.01) =================
  {
    id: 'w5_honglu_fullstop',
    edition: 5,
    editionName: '第五期 瓦夜 (2025.01)',
    sinnerId: 'honglu',
    type: '000人格',
    rarity: '000',
    name: '句点事务所代表 鸿璐',
    shortName: '句点宝',
    cost: 400,
    tier: 'T0.5',
    tierDesc: '与句点希斯绑定后的T0级双人呼吸穿刺爆发组合，弹药耗尽后呼叫句点希协同攻击极强。',
    themeColor: '#0d9488',
    accentColor: '#5eead4',
    motif: 'dualPistols',
    abnoCode: 'STOP-01',
    archetype: '呼吸',
    image: './images/w5_honglu_fullstop.png'
  },
  {
    id: 'w5_heathcliff_fullstop',
    edition: 5,
    editionName: '第五期 瓦夜 (2025.01)',
    sinnerId: 'heathcliff',
    type: '000人格',
    rarity: '000',
    name: '句点事务所收尾人 希斯克利夫',
    shortName: '句点希 / 句点夫',
    cost: 400,
    tier: 'T0.5',
    tierDesc: '超高单发重狙核爆，后备支援与句点宝双人联动堪称艺术！',
    themeColor: '#4c1d95',
    accentColor: '#c084fc',
    motif: 'crosshair',
    abnoCode: 'STOP-02',
    archetype: '呼吸',
    image: './images/w5_heathcliff_fullstop.png'
  },
  {
    id: 'w5_outis_magicbullet_ego',
    edition: 5,
    editionName: '第五期 瓦夜 (2025.01)',
    sinnerId: 'outis',
    type: 'E.G.O',
    rarity: 'HE',
    name: '【魔弹】奥提斯',
    shortName: '魔弹奥 E.G.O',
    cost: 400,
    tier: 'T1',
    tierDesc: '魔弹奥人格的灵魂外置器官，大幅加速黑焰与魔弹层数叠加，玩魔弹奥必换组件。',
    themeColor: '#1d4ed8',
    accentColor: '#93c5fd',
    motif: 'magicCircle',
    abnoCode: 'F-01-69',
    archetype: '烧伤',
    image: './images/w5_outis_magicbullet_ego.png'
  },

  // ================= 第六期 (2025.07) =================
  {
    id: 'w6_don_queen',
    edition: 6,
    editionName: '第六期 瓦夜 (2025.07)',
    sinnerId: 'don',
    type: '000人格',
    rarity: '000',
    name: '脑叶E.G.O::奉以爱与恨之名 堂吉诃德',
    shortName: '魔法唐 / 憎恶女王唐',
    cost: 400,
    tier: 'T1',
    tierDesc: '魔法少女双形态充能/破裂主力大C，建议与同名WAW E.G.O配套使用。',
    themeColor: '#db2777',
    accentColor: '#fef08a',
    motif: 'heartWand',
    abnoCode: 'O-01-04',
    archetype: '破裂',
    image: './images/w6_don_queen.png'
  },
  {
    id: 'w6_rodion_knight',
    edition: 6,
    editionName: '第六期 瓦夜 (2025.07)',
    sinnerId: 'rodion',
    type: '000人格',
    rarity: '000',
    name: '脑叶E.G.O::泪锋之剑 罗佳',
    shortName: '绝望罗 / 绝望骑士罗',
    cost: 400,
    tier: 'T0',
    tierDesc: '全游戏最顶级泛用三灯大C之一！护盾加护、沉沦贯穿、加硬币威力兼备，单兵作战能力拉满，第一顺位必换！！',
    themeColor: '#1e3a8a',
    accentColor: '#93c5fd',
    motif: 'tearSword',
    abnoCode: 'O-01-73',
    archetype: '沉沦',
    image: './images/w6_rodion_knight.png'
  },
  {
    id: 'w6_don_queen_ego',
    edition: 6,
    editionName: '第六期 瓦夜 (2025.07)',
    sinnerId: 'don',
    type: 'E.G.O',
    rarity: 'WAW',
    name: '【奉以爱与恨之名】堂吉诃德',
    shortName: '憎恶女王唐 E.G.O',
    cost: 400,
    tier: 'T1',
    tierDesc: '魔法唐专属配套WAW级广域激光轰炸E.G.O，群攻清场与状态运转兼备。',
    themeColor: '#be185d',
    accentColor: '#f472b6',
    motif: 'arcanaBeam',
    abnoCode: 'O-01-04',
    archetype: '破裂',
    image: './images/w6_don_queen_ego.png'
  },

  // ================= 第七期 (2025.11 - 废墟图书馆一般招待主题) =================
  {
    id: 'w7_ishmael_hanafuda',
    edition: 7,
    editionName: '第七期 瓦夜 (2025.11)',
    sinnerId: 'ishmael',
    type: '000人格',
    rarity: '000',
    name: '丁事务所代表 以实玛利',
    shortName: '花札玛',
    cost: 400,
    tier: 'T0.5',
    tierDesc: '废墟图书馆一般招待“花札”人格，独特的弃牌抽牌机制与极高硬币拼点上限，手感一流的泛用强力主C。',
    themeColor: '#c2410c',
    accentColor: '#fed7aa',
    motif: 'hanafudaCards',
    abnoCode: 'JEONG-08',
    archetype: '呼吸',
    image: './images/w7_ishmael_hanafuda.png'
  },
  {
    id: 'w7_gregor_allen',
    edition: 7,
    editionName: '第七期 瓦夜 (2025.11)',
    sinnerId: 'gregor',
    type: '000人格',
    rarity: '000',
    name: '夜锥队长 格里高尔',
    shortName: '艾兰虫',
    cost: 400,
    tier: 'T0.5',
    tierDesc: '废墟图书馆“夜锥队长艾兰”人格，极致穿刺特化与防御弱点洞悉，对单攻坚顶级打手。',
    themeColor: '#78350f',
    accentColor: '#fcd34d',
    motif: 'stiletto',
    abnoCode: 'AWL-12',
    archetype: '破裂',
    image: './images/w7_gregor_allen.png'
  },

  // ================= 第八期 (2026.03 - 琥珀色黄昏 / 福利部主题) =================
  {
    id: 'w8_ryoshu_aroma',
    edition: 8,
    editionName: '第八期 瓦夜 (2026.03 · 琥珀色黄昏)',
    sinnerId: 'ryoshu',
    type: '000人格',
    rarity: '000',
    name: '脑叶E.G.O::余香·孤独 良秀',
    shortName: '余香良',
    cost: 400,
    tier: 'T0',
    tierDesc: '脑叶公司“默示录/阿里乌涅”E.G.O人格！沉沦与粉色花瓣复合机制数值怪，拼点与AOE收割统治级，T0必换人权卡！',
    themeColor: '#7f1d1d',
    accentColor: '#fca5a5',
    motif: 'aromaFlower',
    abnoCode: 'T-04-53',
    archetype: '沉沦',
    image: './images/w8_ryoshu_aroma.png'
  },
  {
    id: 'w8_meursault_hornet',
    edition: 8,
    editionName: '第八期 瓦夜 (2026.03 · 琥珀色黄昏)',
    sinnerId: 'meursault',
    type: '000人格',
    rarity: '000',
    name: '脑叶E.G.O::黄蜂【侵蚀】默尔索',
    shortName: '黄蜂默',
    cost: 400,
    tier: 'T1',
    tierDesc: '脑叶公司“蜂后”孢子弹药机制人格，烧伤与流血双复合引爆（散弹破币+孢子引爆愤怒伤害），配合本家【悔恨】E.G.O点数极猛！',
    themeColor: '#b45309',
    accentColor: '#fef08a',
    motif: 'hornet',
    abnoCode: 'Z-04-37',
    archetype: '烧伤',
    image: './images/w8_meursault_hornet.png'
  },
  {
    id: 'w8_sinclair_harmony_ego',
    edition: 8,
    editionName: '第八期 瓦夜 (2026.03 · 琥珀色黄昏)',
    sinnerId: 'sinclair',
    type: 'E.G.O',
    rarity: 'HE',
    name: '【和声】辛克莱',
    shortName: '和声辛 E.G.O',
    cost: 400,
    tier: 'T1',
    tierDesc: '脑叶公司“歌唱机”HE级E.G.O，流血/烧伤攻击赋予全队亢奋与强力伤害增幅，黎明辛与烧伤/流血队高难速刷优秀插件。',
    themeColor: '#a16207',
    accentColor: '#fef9c3',
    motif: 'musicNote',
    abnoCode: 'O-05-76',
    archetype: '烧伤',
    image: './images/w8_sinclair_harmony_ego.png'
  },

  // ================= 第九期 (2026.07 - 破晓时分的收尾人，首次开放箱子兑换！) =================
  {
    id: 'w9_faust_yuna',
    edition: 9,
    editionName: '第九期 瓦夜 (2026.07 · 破晓时分的收尾人)',
    sinnerId: 'faust',
    type: '000人格',
    rarity: '000',
    name: '黎明事务所收尾人 浮士德',
    shortName: '尤娜浮 / 黎明浮',
    cost: 400,
    tier: 'T0.5',
    tierDesc: '🔥【首次解禁兑换！】废墟图书馆“尤娜”人格，烧伤+震颤双修，自带“破晓之光”与支援强化，令黎明辛与萨尔瓦多虫彻底起飞！',
    themeColor: '#9a3412',
    accentColor: '#fdba74',
    motif: 'crimsonLotus',
    abnoCode: 'DAWN-02',
    isNewlyUnlocked: true,
    archetype: '烧伤',
    image: './images/w9_faust_yuna.png'
  },
  {
    id: 'w9_gregor_salvador',
    edition: 9,
    editionName: '第九期 瓦夜 (2026.07 · 破晓时分的收尾人)',
    sinnerId: 'gregor',
    type: '000人格',
    rarity: '000',
    name: '黎明事务所代表 格里高尔',
    shortName: '萨尔瓦多虫 / 黎明虫',
    cost: 400,
    tier: 'T0.5',
    tierDesc: '🔥【首次解禁兑换！】“萨尔瓦多”老爷子人格，30层破晓之光触发【破晓】核爆，队友攻击触发【日出闪光】追击，还能给残血黎明辛套逃生装置/不屈！',
    themeColor: '#7c2d12',
    accentColor: '#fde047',
    motif: 'dawnGreatsword',
    abnoCode: 'DAWN-01',
    isNewlyUnlocked: true,
    archetype: '烧伤',
    image: './images/w9_gregor_salvador.png'
  },
  {
    id: 'w9_yisang_solemn_ego',
    edition: 9,
    editionName: '第九期 瓦夜 (2026.07 · 破晓时分的收尾人)',
    sinnerId: 'yisang',
    type: 'E.G.O',
    rarity: 'HE',
    name: '【庄严哀悼】李箱',
    shortName: '哀悼箱 E.G.O',
    cost: 400,
    tier: 'T0',
    tierDesc: '🔥【首次解禁兑换！】继第4期蝶箱人格后，李箱终于装上了本家【庄严哀悼】双枪E.G.O！与蝶箱人格自己左脚踩右脚完美联动，沉沦队必换毕业拼图！',
    themeColor: '#1e293b',
    accentColor: '#e2e8f0',
    motif: 'seraphWings',
    abnoCode: 'T-01-68',
    isNewlyUnlocked: true,
    archetype: '沉沦',
    image: './images/w9_yisang_solemn_ego.png'
  }
];

// ==========================================
// 2.5 统一安全图片加载组件 (带精美兜底徽章与外链备选)
// ==========================================
const SafeImage = ({ 
  src, 
  fallbackSrc,
  alt, 
  className, 
  sinnerId, 
  rarity, 
  nickname,
  style = {}
}: { 
  src: string; 
  fallbackSrc?: string;
  alt: string; 
  className?: string; 
  sinnerId?: string; 
  rarity?: string; 
  nickname?: string;
  style?: React.CSSProperties;
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setHasTriedFallback(false);
    setError(false);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (!hasTriedFallback && fallbackSrc && fallbackSrc !== currentSrc) {
      setHasTriedFallback(true);
      setCurrentSrc(fallbackSrc);
    } else {
      setError(true);
    }
  };

  const sinner = sinnerId ? INITIAL_SINNERS.find(s => s.id === sinnerId) : null;
  
  if (error || !currentSrc) {
    const bgColor = sinner?.bg || '#1a1b26';
    const accentColor = sinner?.color || '#fbbf24';
    const isGold = rarity === '000' || rarity === 'WAW' || rarity === 'ALEPH';
    const isRed = rarity === '00' || rarity === 'HE';
    
    return (
      <div 
        className={`relative flex flex-col items-center justify-center text-center overflow-hidden border-2 ${className || ''}`}
        style={{ 
          background: `radial-gradient(circle at 30% 25%, ${accentColor}44, ${bgColor} 85%)`,
          borderColor: isGold ? '#fbbf24' : isRed ? '#ef4444' : '#3b82f6',
          boxShadow: isGold ? 'inset 0 0 15px rgba(251, 191, 36, 0.3)' : 'none',
          ...style
        }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        <Sparkles className="w-4 h-4 mb-0.5 opacity-40" style={{ color: accentColor }} />
        <span 
          className="text-xs font-black tracking-tight drop-shadow-md px-0.5 leading-tight line-clamp-2"
          style={{ color: '#ffffff' }}
        >
          {nickname || alt.split('::').pop()?.split(' ').pop()}
        </span>
        <div className="absolute bottom-0.5 right-0.5 opacity-20">
           <span className="text-[7px] font-black italic">{rarity}</span>
        </div>
      </div>
    );
  }

  return (
    <img 
      src={currentSrc} 
      alt={alt} 
      className={`object-cover object-center ${className || ''}`} 
      style={style}
      referrerPolicy="no-referrer"
      onError={handleError} 
    />
  );
};

// ==========================================
// 3. 边狱公司官方卡面高清立绘组件
// ==========================================
const CardPortraitArtwork = ({ 
  item, 
  sinner, 
  isChecked,
  onPreview
}: { 
  item: WalpurgisItem; 
  sinner?: Sinner; 
  isChecked: boolean; 
  onPreview?: (item: WalpurgisItem) => void;
}) => {
  const imageSrc = item.image || `./images/${item.id}.png`;

  return (
    <div 
      onClick={(e) => {
        if (onPreview) {
          e.stopPropagation();
          onPreview(item);
        }
      }}
      className={`group/card relative w-20 h-24 sm:w-28 sm:h-32 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-300 select-none shadow-md bg-[#0d0e14] ${
        onPreview ? 'cursor-pointer' : ''
      }`}
      style={{
        borderColor: isChecked ? '#fbbf24' : 'rgba(63, 63, 70, 0.8)',
        boxShadow: isChecked ? '0 0 20px rgba(251, 191, 36, 0.5)' : 'none',
        transform: isChecked ? 'scale(1.02)' : 'none',
      }}
      title={onPreview ? "点击放大查看官方高清原图与深度评级" : undefined}
    >
      {/* 官方卡面图片 */}
      <SafeImage 
        src={imageSrc}
        alt={item.name}
        sinnerId={item.sinnerId}
        rarity={item.rarity}
        nickname={item.shortName}
        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover/card:scale-110"
      />

      {/* 卡面暗色渐变遮罩保护文字与信息 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/70 pointer-events-none group-hover/card:from-black/75 transition-colors" />

      {/* 顶部标签条：稀有度 + 放大镜按钮 */}
      <div className="absolute top-1 left-1 right-1 flex items-center justify-between z-10 pointer-events-none">
        <span 
          className="text-[10px] font-black px-1.5 py-0.5 rounded shadow-md tracking-wider border"
          style={
            item.rarity === '000' ? { background: 'linear-gradient(to right, #f59e0b, #d97706)', color: '#000000', borderColor: '#fcd34d' } :
            item.rarity === '00' ? { background: 'linear-gradient(to right, #dc2626, #b91c1c)', color: '#ffffff', borderColor: '#f87171' } :
            item.rarity === 'WAW' ? { background: 'linear-gradient(to right, #7e22ce, #6b21a8)', color: '#ffffff', borderColor: '#c084fc' } :
            { background: 'linear-gradient(to right, #0284c7, #0369a1)', color: '#ffffff', borderColor: '#38bdf8' }
          }
        >
          {item.rarity}
        </span>

        {/* 点击放大查看官方高清原图按钮 / 提示 */}
        {onPreview && (
          <div
            title="查看官方高清大图"
            className="p-1 rounded-md transition-colors backdrop-blur-sm shadow border border-white/10"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', color: '#d4d4d8' }}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* 罪人与所属体系角标 */}
      <div className="absolute top-7 left-1 z-10 pointer-events-none flex flex-col items-start gap-1">
        {sinner && (
          <span 
            className="text-[9px] font-mono font-extrabold px-1 py-0.2 rounded bg-black/75 backdrop-blur-[2px] shadow-sm flex items-center gap-1"
            style={{ color: sinner.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: sinner.color }} />
            #{sinner.num}
          </span>
        )}
        {item.archetype && (
          <span 
            className="text-[8.5px] font-black px-1 py-0.2 rounded shadow-md border backdrop-blur-[2px] flex items-center gap-0.5"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.8)', 
              color: ARCHETYPE_CONFIG[item.archetype]?.color || '#d4d4d8',
              borderColor: 'rgba(63, 63, 70, 1)' 
            }}
          >
            <span>{ARCHETYPE_CONFIG[item.archetype]?.icon}</span>
            <span>{item.archetype}</span>
          </span>
        )}
      </div>

      {/* 底部信息条：简称 */}
      <div className="absolute bottom-1 left-1 right-1 text-center z-10 pointer-events-none">
        <div className="text-[11px] font-extrabold text-amber-100 truncate tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
          {item.shortName.split(' ')[0]}
        </div>
      </div>

      {/* 已勾选高亮标记 */}
      {isChecked && (
        <div 
          className="absolute top-1.5 right-7 w-5 h-5 rounded-full flex items-center justify-center shadow-lg border z-10 pointer-events-none"
          style={{ backgroundColor: '#fbbf24', color: '#000000', borderColor: '#fef3c7' }}
        >
          <Check className="w-3.5 h-3.5 stroke-[3.5]" />
        </div>
      )}
    </div>
  );
};

// ==========================================
// 4. 评级定义与可调整下拉选择器组件
// ==========================================
export const TIER_OPTIONS = [
  { value: 'T0', label: 'T0 人权必换', hexBg: '#e11d48', hexText: '#ffffff', hexBorder: '#fb7185' },
  { value: 'T0.5', label: 'T0.5 顶配核心', hexBg: 'rgba(249, 115, 22, 0.3)', hexText: '#fed7aa', hexBorder: 'rgba(251, 146, 60, 0.5)' },
  { value: 'T1', label: 'T1 体系主力', hexBg: 'rgba(245, 158, 11, 0.25)', hexText: '#fde68a', hexBorder: 'rgba(245, 158, 11, 0.4)' },
  { value: 'T1.5', label: 'T1.5 强力过渡', hexBg: 'rgba(14, 165, 233, 0.2)', hexText: '#bae6fd', hexBorder: 'rgba(14, 165, 233, 0.3)' },
  { value: 'T2', label: 'T2 次选对策', hexBg: '#27272a', hexText: '#d4d4d8', hexBorder: '#3f3f46' },
  { value: 'T3', label: 'T3 优先度低', hexBg: '#18181b', hexText: '#71717a', hexBorder: '#27272a' },
];

export const TierBadgeSelect = ({
  tier,
  onChange,
  size = 'normal'
}: {
  tier: string;
  onChange: (newTier: string) => void;
  size?: 'small' | 'normal' | 'large';
}) => {
  const currentOption = TIER_OPTIONS.find(o => o.value === tier) || {
    value: tier,
    label: `${tier} 自定`,
    hexBg: '#27272a', hexText: '#d4d4d8', hexBorder: '#3f3f46'
  };

  return (
    <div 
      className="relative inline-flex items-center group/tier"
      onClick={(e) => e.stopPropagation()}
      title="点击下拉菜单可随时调整评级 (T0 / T0.5 / T1 / T1.5 / T2 / T3)"
    >
      <select
        value={tier}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.value);
        }}
        onClick={(e) => e.stopPropagation()}
        className={`appearance-none cursor-pointer font-extrabold rounded border shadow-sm outline-none transition focus:ring-2 focus:ring-amber-400/70 hover:brightness-125 select-none ${
          size === 'small' 
            ? 'text-[10px] pl-1.5 pr-4 py-0.5' 
            : size === 'large'
            ? 'text-xs pl-2.5 pr-6 py-1 font-bold'
            : 'text-[11px] pl-2 pr-5 py-0.5'
        }`}
        style={{ backgroundColor: currentOption.hexBg, color: currentOption.hexText, borderColor: currentOption.hexBorder }}
      >
        {TIER_OPTIONS.map(opt => (
          <option 
            key={opt.value} 
            value={opt.value} 
            className="bg-[#141620] text-zinc-100 font-sans py-1 text-xs"
          >
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown 
        className={`absolute pointer-events-none text-current opacity-70 group-hover/tier:opacity-100 transition-opacity ${
          size === 'small' ? 'w-2.5 h-2.5 right-1' : size === 'large' ? 'w-3.5 h-3.5 right-1.5' : 'w-3 h-3 right-1.5'
        }`} 
      />
    </div>
  );
};

// ==========================================
// 4. BOX 图鉴选择弹窗组件
// ==========================================
const IdentitySelectionModal = ({
  sinner,
  onClose,
  ownedIds,
  onToggle,
}: {
  sinner: Sinner;
  onClose: () => void;
  ownedIds: string[];
  onToggle: (item: Identity) => void;
}) => {
  const [rarityTab, setRarityTab] = useState<'000' | '00' | '0'>('000');
  const sinnerIdentities = IDENTITIES_DATABASE.filter(i => i.sinnerId === sinner.id);
  const count000 = sinnerIdentities.filter(i => i.rarity === '000').length;
  const count00 = sinnerIdentities.filter(i => i.rarity === '00').length;
  const count0 = sinnerIdentities.filter(i => i.rarity === '0').length;
  const filtered = sinnerIdentities.filter(i => i.rarity === rarityTab);

  const lcbCode = 10000 + parseInt(sinner.num, 10) * 100 + 1;
  const lcbIdentity = sinnerIdentities.find(i => i.code === String(lcbCode) || i.rarity === '0');

  const toggleAll = (select: boolean) => {
    filtered.forEach(item => {
      const currentlyOwned = isIdentityOwned(item, ownedIds);
      if (select && !currentlyOwned) onToggle(item);
      if (!select && currentlyOwned) onToggle(item);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#141720] border border-amber-500/30 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* 弹窗头部：带罪人专属 LCB 头像与编号 */}
        <div className="p-4 bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="relative w-11 h-11 rounded-xl overflow-hidden border-2 shadow-md shrink-0 bg-black/60" 
              style={{ borderColor: sinner.color }}
            >
              <SafeImage
                src={`./avatars/${lcbCode}.png`}
                fallbackSrc={lcbIdentity?.wikiImg}
                alt={sinner.name}
                sinnerId={sinner.id}
                rarity="0"
                nickname={sinner.name}
                className="w-full h-full object-cover"
              />
              <div 
                className="absolute bottom-0 right-0 px-1 py-0.2 rounded-tl text-[8px] font-black font-mono leading-none shadow"
                style={{ backgroundColor: sinner.color, color: '#000000' }}
              >
                {sinner.num}
              </div>
            </div>
            <div>
              <h3 className="font-black text-amber-100 text-base">{sinner.name} · 人格选择</h3>
              <p className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">{sinner.en}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-zinc-100 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 筛选与全选 */}
        <div className="px-4 py-3 bg-zinc-900/50 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800">
          <div className="flex bg-black/40 p-1 rounded-lg border border-zinc-700 gap-1">
            <button
              onClick={() => setRarityTab('000')}
              className={`px-3 py-1 rounded-md text-xs font-black transition ${
                rarityTab === '000' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              3星 (000) · {count000}
            </button>
            <button
              onClick={() => setRarityTab('00')}
              className={`px-3 py-1 rounded-md text-xs font-black transition ${
                rarityTab === '00' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              2星 (00) · {count00}
            </button>
            {count0 > 0 && (
              <button
                onClick={() => setRarityTab('0')}
                className={`px-3 py-1 rounded-md text-xs font-black transition ${
                  rarityTab === '0' ? 'bg-zinc-700 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                初始 (1星)
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleAll(true)} className="text-[10px] px-2.5 py-1 rounded bg-zinc-800 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition">全选本页</button>
            <button onClick={() => toggleAll(false)} className="text-[10px] px-2.5 py-1 rounded bg-zinc-800 text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 transition">清空本页</button>
          </div>
        </div>

        {/* 列表滚动区 */}
        <div className="p-3 sm:p-4 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3">
          {filtered.map(item => {
            const isSelected = isIdentityOwned(item, ownedIds);
            return (
              <div
                key={item.id}
                onClick={() => onToggle(item)}
                className={`group relative rounded-xl border-2 cursor-pointer transition-all duration-200 overflow-hidden bg-[#0d0e14] flex flex-col justify-between ${
                  isSelected 
                    ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
                    : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {/* 人格头像：正方形 1:1 居中显示，彻底解决手机端被拉扁或只露头顶的问题 */}
                <div className="w-full aspect-square relative overflow-hidden bg-black/80 flex items-center justify-center">
                  <SafeImage 
                    src={item.image} 
                    fallbackSrc={item.wikiImg}
                    alt={item.name} 
                    sinnerId={item.sinnerId}
                    rarity={item.rarity}
                    nickname={item.nickname}
                    className={`w-full h-full object-cover object-center transition-transform duration-300 ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`} 
                  />
                  
                  {/* 勾选对勾角标 */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-amber-400 text-black rounded-full p-0.5 shadow-lg z-10">
                      <Check className="w-3 h-3 stroke-[3.5]" />
                    </div>
                  )}

                  {/* 稀有度角标 */}
                  <div className={`absolute top-1 left-1 px-1.5 py-0.2 rounded text-[7.5px] font-black shadow-sm z-10 leading-tight ${
                    item.rarity === '000' 
                      ? 'bg-amber-500 text-black' 
                      : item.rarity === '00' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-zinc-700 text-zinc-200'
                  }`}>
                    {item.rarity === '0' ? '1星' : item.rarity}
                  </div>
                </div>

                {/* 底部信息栏：无论 3 星、2 星还是 1 星，始终固定展示名字与高亮昵称 */}
                <div className="p-1.5 sm:p-2 bg-[#12141c] border-t border-zinc-800/80 flex flex-col justify-between flex-1 gap-1">
                  {/* 第一行：角色正式名称 */}
                  <div 
                    className="text-[11px] sm:text-xs font-black text-zinc-100 leading-tight line-clamp-1 group-hover:text-amber-200 transition-colors" 
                    title={item.cleanName || item.name}
                  >
                    {item.cleanName || item.name}
                  </div>
                  
                  {/* 第二行：高亮玩家常用昵称 */}
                  <div className="flex items-center">
                    <span 
                      className="text-[10px] sm:text-[11px] font-black text-amber-300 bg-amber-500/20 border border-amber-500/50 px-1.5 py-0.5 rounded shadow-sm tracking-tight truncate max-w-full"
                      title={item.nickname}
                    >
                      {item.nickname}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4.5 BOX 导出图专门排版组件 (隐藏渲染)
// ==========================================
const BoxExportPoster = React.forwardRef<HTMLDivElement, { ownedIds: string[], isPreview?: boolean }>(({ ownedIds, isPreview = false }, ref) => {
  const total000 = IDENTITIES_DATABASE.filter(i => i.rarity === '000' && isIdentityOwned(i, ownedIds)).length;
  const total00 = IDENTITIES_DATABASE.filter(i => i.rarity === '00' && isIdentityOwned(i, ownedIds)).length;

  return (
    <div className={isPreview ? "relative" : "fixed -left-[2000px] top-0 pointer-events-none"}>
      <div 
        ref={ref} 
        style={{ 
          width: '960px', 
          backgroundColor: '#0b0c13', 
          padding: '24px', 
          color: '#f4f4f5', 
          position: 'relative', 
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {/* 背景装饰 */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle at 2px 2px, #f59e0b 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        
        {/* 顶部紧凑 Header */}
        <div style={{ 
          position: 'relative', 
          zIndex: 10, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          paddingBottom: '14px', 
          marginBottom: '16px', 
          borderBottom: '2px solid rgba(245, 158, 11, 0.4)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: '#f59e0b',
              boxShadow: '0 0 14px rgba(245, 158, 11, 0.35)'
            }}>
              <Package size={22} style={{ color: '#000000' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#fbbf24', letterSpacing: '0.02em', margin: 0 }}>
                  边狱公司 · 管理人 BOX 一览
                </h1>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#71717a', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                  LIMBUS COMPANY
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              backgroundColor: 'rgba(24, 24, 27, 0.85)', 
              border: '1px solid rgba(245, 158, 11, 0.3)', 
              padding: '4px 12px', 
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 800
            }}>
              <span style={{ color: '#a1a1aa' }}>000人格总计: </span>
              <span style={{ color: '#fbbf24', fontWeight: 900, fontFamily: 'monospace', fontSize: '14px' }}>{total000}</span>
            </div>
            <div style={{ 
              backgroundColor: 'rgba(24, 24, 27, 0.85)', 
              border: '1px solid rgba(168, 85, 247, 0.3)', 
              padding: '4px 12px', 
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 800
            }}>
              <span style={{ color: '#a1a1aa' }}>00人格总计: </span>
              <span style={{ color: '#c084fc', fontWeight: 900, fontFamily: 'monospace', fontSize: '14px' }}>{total00}</span>
            </div>
          </div>
        </div>

        {/* 2列 × 6行 严格对齐 CSS Grid */}
        <div style={{ 
          position: 'relative', 
          zIndex: 10, 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '10px' 
        }}>
          {INITIAL_SINNERS.map(sinner => {
            const ownedInSinner = IDENTITIES_DATABASE
              .filter(i => i.sinnerId === sinner.id && isIdentityOwned(i, ownedIds))
              .sort((a, b) => {
                const rScore = (r: string) => r === '000' ? 3 : r === '00' ? 2 : 1;
                return rScore(b.rarity) - rScore(a.rarity);
              });
            const totalInDb = IDENTITIES_DATABASE.filter(i => i.sinnerId === sinner.id).length;
            const isEmpty = ownedInSinner.length === 0;

            return (
              <div 
                key={sinner.id} 
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  minHeight: '72px',
                  backgroundColor: isEmpty ? 'rgba(18, 18, 24, 0.55)' : 'rgba(22, 22, 29, 0.85)', 
                  border: `1px solid ${isEmpty ? '#27272a' : 'rgba(245, 158, 11, 0.35)'}`, 
                  borderRadius: '10px', 
                  boxShadow: isEmpty ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.4)',
                  boxSizing: 'border-box'
                }}
              >
                {/* 【左侧罪人信息栏】（固定宽度 122px，右侧加细微暗金分割线） */}
                <div style={{ 
                  width: '122px', 
                  minWidth: '122px', 
                  maxWidth: '122px', 
                  paddingRight: '8px', 
                  borderRight: '1px solid rgba(245, 158, 11, 0.25)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  gap: '4px',
                  flexShrink: 0
                }}>
                  {/* 第一行：罪人代表色编号 + 中文名 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 900, fontFamily: 'monospace', color: sinner.color }}>
                      {sinner.num}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#fef3c7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: '1 1 auto' }}>
                      {sinner.name}
                    </span>
                  </div>
                  {/* 第二行：英文名缩写（左）+ 持有进度胶囊（强制右对齐到分割线） */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, width: '100%', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', color: '#71717a', whiteSpace: 'normal', flexShrink: 1, minWidth: 0, lineHeight: 1.15, wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                      {sinner.en}
                    </span>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: 900, 
                      fontFamily: 'monospace', 
                      color: isEmpty ? '#71717a' : '#fbbf24', 
                      backgroundColor: isEmpty ? '#18181b' : 'rgba(245, 158, 11, 0.15)', 
                      border: `1px solid ${isEmpty ? '#27272a' : 'rgba(245, 158, 11, 0.4)'}`, 
                      borderRadius: '9999px', 
                      padding: '0px 5px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      lineHeight: '16px'
                    }}>
                      {ownedInSinner.length} / {totalInDb}
                    </span>
                  </div>
                </div>

                {/* 【右侧人格头像流】（52px × 52px 紧密排列） */}
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '6px', 
                  paddingLeft: '12px', 
                  alignItems: 'center',
                  minHeight: '52px'
                }}>
                  {isEmpty ? (
                    <div style={{ color: '#52525b', fontSize: '12px', fontStyle: 'italic', fontWeight: 700, letterSpacing: '0.05em' }}>
                      — 暂无人格 —
                    </div>
                  ) : (
                    ownedInSinner.map(item => (
                      <div 
                        key={item.id} 
                        style={{ 
                          position: 'relative', 
                          width: '54px', 
                          height: '58px', 
                          borderRadius: '6px', 
                          overflow: 'hidden', 
                          border: `1.5px solid ${item.rarity === '000' ? '#f59e0b' : item.rarity === '00' ? '#a855f7' : '#71717a'}`, 
                          backgroundColor: '#0a0a0f',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
                          flexShrink: 0
                        }}
                      >
                        <SafeImage 
                          src={item.image} 
                          fallbackSrc={item.wikiImg}
                          alt={item.cleanName || item.name}
                          sinnerId={item.sinnerId}
                          rarity={item.rarity}
                          nickname={item.nickname}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} 
                        />
                        {/* 稀有度标签不再叠加：立绘本身已带 000/00 标记，避免重复 */}

                        {/* 底部叠印：两行黄字（第一行正式名，第二行玩家简称，高度与间距严格对齐不重叠） */}
                        <div style={{ 
                          position: 'absolute', 
                          bottom: 0, 
                          left: 0, 
                          right: 0, 
                          textAlign: 'center', 
                          padding: '2px 1.5px 2px 1.5px',
                          pointerEvents: 'none',
                          zIndex: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          gap: '1px'
                        }}>
                          <span style={{ 
                            fontSize: '6.5px', 
                            fontWeight: 700, 
                            color: '#fef08a', 
                            overflow: 'hidden', 
                            whiteSpace: 'normal', 
                            overflowWrap: 'anywhere',
                            display: '-webkit-box', 
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2,
                            textShadow: '0 0 2px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.95)',
                            lineHeight: 1.1
                          }}>
                            {item.cleanName || item.name}
                          </span>
                          <span style={{ 
                            fontSize: '8px', 
                            fontWeight: 900, 
                            color: '#fbbf24', 
                            overflow: 'hidden', 
                            whiteSpace: 'nowrap', 
                            textOverflow: 'ellipsis', 
                            display: 'block', 
                            textShadow: '0 0 2px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.95)',
                            lineHeight: 1.1
                          }}>
                            {item.nickname}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer 水印文字紧贴网格 */}
        <div style={{ 
          position: 'relative', 
          zIndex: 10, 
          marginTop: '16px', 
          paddingTop: '12px', 
          borderTop: '1px solid rgba(39, 39, 42, 0.8)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          fontFamily: 'monospace', 
          fontSize: '11px', 
          letterSpacing: '0.12em', 
          textTransform: 'uppercase', 
          color: '#52525b' 
        }}>
          <div>LIMBUS COMPANY BOX SHARE TOOL</div>
          <div>RECORDED ON {new Date().toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
});

// ==========================================
// 5. 主应用组件
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState<'box' | 'walpurgis'>('box');

  // 12罪人碎片状态（初始为用户的背包截图数值）
  const [sinnerShards, setSinnerShards] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('limbus_walpurgis_v1_sinners');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load sinner shards', e);
    }
    const map: Record<string, number> = {};
    INITIAL_SINNERS.forEach(s => {
      map[s.id] = 0; // 默认清零
    });
    return map;
  });

  // 保存碎片数到 localStorage
  useEffect(() => {
    localStorage.setItem('limbus_walpurgis_v1_sinners', JSON.stringify(sinnerShards));
  }, [sinnerShards]);

  // 库存自选箱数量（默认清零）
  const [ownedBoxes, setOwnedBoxes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('limbus_walpurgis_v1_crates');
      if (saved) return parseInt(saved, 10) || 0;
    } catch {}
    return 0;
  });

  // 保存箱子数到 localStorage
  useEffect(() => {
    localStorage.setItem('limbus_walpurgis_v1_crates', ownedBoxes.toString());
  }, [ownedBoxes]);

  // 每箱折合碎片数（期望=2，极非保底=1）
  const [shardsPerBox, setShardsPerBox] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('limbus_walpurgis_v1_shardsPerBox');
      if (saved) return parseInt(saved, 10) || 2;
    } catch {}
    return 2;
  });

  // 保存折合率到 localStorage
  useEffect(() => {
    localStorage.setItem('limbus_walpurgis_v1_shardsPerBox', shardsPerBox.toString());
  }, [shardsPerBox]);

  // BOX 持久化状态
  const [ownedIdentityIds, setOwnedIdentityIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('limbus_owned_box_ids');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('limbus_owned_box_ids', JSON.stringify(ownedIdentityIds));
  }, [ownedIdentityIds]);

  // BOX 重置确认弹窗与反馈提示状态
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [resetToast, setResetToast] = useState<boolean>(false);

  // 实际执行重置 BOX 所有已选人格
  const executeResetBox = () => {
    setOwnedIdentityIds([]);
    try {
      localStorage.removeItem('limbus_owned_box_ids');
      localStorage.setItem('limbus_owned_box_ids', '[]');
    } catch (e) {
      console.error('Failed to clear box local storage', e);
    }
    setShowResetConfirm(false);
    setResetToast(true);
    setTimeout(() => setResetToast(false), 2500);
  };

  const [selectingSinnerId, setSelectingSinnerId] = useState<string | null>(null);
  const [showBoxExportModal, setShowBoxExportModal] = useState<boolean>(false);
  const [boxExportDataUrl, setBoxExportDataUrl] = useState<string>('');
  const boxExportRef = useRef<HTMLDivElement>(null);
  const [isBoxExporting, setIsBoxExporting] = useState<boolean>(false);
  const [boxFitScreen, setBoxFitScreen] = useState<boolean>(true);
  const [boxPreviewScale, setBoxPreviewScale] = useState<number>(1);
  const [boxPosterHeight, setBoxPosterHeight] = useState<number>(0);
  const boxPreviewScrollRef = useRef<HTMLDivElement>(null);
  const boxPreviewPosterRef = useRef<HTMLDivElement>(null);

  // 仅打开 BOX 导出预览弹窗
  const handleOpenBoxExport = () => {
    setShowBoxExportModal(true);
    setBoxExportDataUrl(''); // 重置之前的生成图
  };

  // 实际执行 BOX 渲染逻辑
  const handleExportBox = async () => {
    if (!boxExportRef.current || isBoxExporting) return;
    setIsBoxExporting(true);
    try {
      // 预加载所有小头像图片
      const images = Array.from(boxExportRef.current.querySelectorAll('img'));
      await Promise.all(images.map(img => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise(resolve => { 
          img.onload = resolve; 
          img.onerror = resolve; 
          setTimeout(resolve, 3000);
        });
      }));

      const node = boxExportRef.current;
      const fullHeight = Math.max(node.scrollHeight, node.offsetHeight, 320);

      // 用 html-to-image（SVG foreignObject）而非 html2canvas：
      // 后者自行模拟排版，不支持 flex，会把「英文名 + 进度胶囊」竖着堆叠并压到名字上。
      const dataUrl = await toPng(node, {
        backgroundColor: '#0b0c13',
        pixelRatio: 2,
        width: 960,
        height: fullHeight,
        cacheBust: true,
        style: { transform: 'none', left: '0', top: '0', position: 'static' },
      });
      const link = document.createElement('a');
      link.download = `Limbus_BOX_Share_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error('Failed to export BOX image', err);
      const errorMsg = err instanceof Error ? err.message : (typeof err === 'string' ? err : '未知错误');
      alert('导出图片失败: ' + errorMsg);
    } finally {
      setIsBoxExporting(false);
    }
  };

  // 瓦夜条目列表（优先从 localStorage 恢复用户手动调整的评级并无缝继承最新体系属性）
  const [items, setItems] = useState<WalpurgisItem[]>(() => {
    try {
      const saved = localStorage.getItem('walpurgis_custom_items_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_WALPURGIS_ITEMS.length) {
          return parsed.map((item: WalpurgisItem) => {
            const initial = INITIAL_WALPURGIS_ITEMS.find(i => i.id === item.id);
            return initial ? { ...initial, ...item, archetype: initial.archetype || item.archetype } : item;
          });
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_WALPURGIS_ITEMS;
  });

  // 持久化保存用户评级等条目改动
  useEffect(() => {
    try {
      localStorage.setItem('walpurgis_custom_items_v2', JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  // 已拥有卡片集合（标记为“已拥有”的卡不计入消耗）
  // 联动逻辑：如果 BOX 图鉴里拥有对应瓦夜人格，则自动同步为已拥有
  const [alreadyOwnedIds, setAlreadyOwnedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('limbus_walpurgis_v1_ownedIds');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // 手动“取消拥有”的覆盖集合：让瓦夜页可以覆盖 BOX 图鉴联动来的已拥有状态
  const [unownedOverrides, setUnownedOverrides] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('limbus_walpurgis_v1_unownedOverrides');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('limbus_walpurgis_v1_unownedOverrides', JSON.stringify(unownedOverrides));
  }, [unownedOverrides]);

  const syncedAlreadyOwnedIds = useMemo(() => {
    const ids = [...alreadyOwnedIds];
    // 遍历瓦夜项目，如果它是人格且在图鉴里已勾选，则加入已拥有列表
    INITIAL_WALPURGIS_ITEMS.forEach(item => {
      if (item.type !== 'E.G.O') {
        const dbItem = IDENTITIES_DATABASE.find(d => 
          (d.oldId && (d.oldId === item.id || item.id.includes(d.oldId))) ||
          d.name === item.name || 
          d.cleanName === item.name ||
          (d.nickname && item.shortName && item.shortName.includes(d.nickname))
        );
        if (dbItem && isIdentityOwned(dbItem, ownedIdentityIds)) {
          if (!ids.includes(item.id)) ids.push(item.id);
        }
      }
    });
    return ids.filter(id => !unownedOverrides.includes(id));
  }, [alreadyOwnedIds, ownedIdentityIds, unownedOverrides]);

  // 保存已拥有列表到 localStorage
  useEffect(() => {
    localStorage.setItem('limbus_walpurgis_v1_ownedIds', JSON.stringify(alreadyOwnedIds));
  }, [alreadyOwnedIds]);

  // 勾选状态集合（默认清空）
  const [checkedIds, setCheckedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('limbus_walpurgis_v1_selectedIds');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // 保存勾选列表到 localStorage
  useEffect(() => {
    localStorage.setItem('limbus_walpurgis_v1_selectedIds', JSON.stringify(checkedIds));
  }, [checkedIds]);

  // 视图与筛选控制
  const [viewMode, setViewMode] = useState<'edition' | 'sinner'>('edition');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ID' | 'EGO' | 'CHECKED'>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [archetypeFilter, setArchetypeFilter] = useState<string>('ALL');
  const [showShardEditor, setShowShardEditor] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [previewItem, setPreviewItem] = useState<WalpurgisItem | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const exportPosterRef = useRef<HTMLDivElement>(null);
  const previewScrollContainerRef = useRef<HTMLDivElement>(null);
  const [fitScreen, setFitScreen] = useState<boolean>(true);
  const [previewScale, setPreviewScale] = useState<number>(1);
  const [posterHeight, setPosterHeight] = useState<number>(0);

  // 自定义新增表单状态
  const [newItem, setNewItem] = useState<{
    edition: number;
    sinnerId: string;
    type: string;
    rarity: string;
    name: string;
    shortName: string;
    cost: number;
    tier: string;
    tierDesc: string;
    archetype: string;
  }>({
    edition: 9,
    sinnerId: 'heathcliff',
    type: '000人格',
    rarity: '000',
    name: '',
    shortName: '',
    cost: 400,
    tier: 'T0',
    tierDesc: '瓦夜前夕自定义补充条目',
    archetype: '烧伤'
  });

  // 切换单个条目勾选
  const toggleItem = (id: string) => {
    if (syncedAlreadyOwnedIds.includes(id)) return;
    setCheckedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 切换标记“我已拥有此卡”（含覆盖图鉴联动）
  const toggleAlreadyOwned = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const isOwned = syncedAlreadyOwnedIds.includes(id);
    if (isOwned) {
      // 取消拥有：手动标记的直接撤销；仅由 BOX 图鉴联动来的，记录为“瓦夜页不采用”
      if (alreadyOwnedIds.includes(id)) {
        setAlreadyOwnedIds(prev => prev.filter(x => x !== id));
      } else {
        setUnownedOverrides(prev => (prev.includes(id) ? prev : [...prev, id]));
      }
      return;
    }
    // 重新标记为已拥有
    setUnownedOverrides(prev => prev.filter(x => x !== id));
    setAlreadyOwnedIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    setCheckedIds(c => c.filter(x => x !== id));
  };

  // 修改某个罪人的已有碎片数
  const handleShardChange = (sinnerId: string, value: string) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setSinnerShards(prev => ({ ...prev, [sinnerId]: num }));
  };

  // 恢复截图初始碎片与65箱数据（需二次确认）
  const resetToUserScreenshot = () => {
    const confirmReset = window.confirm('确定要恢复为演示用的初始截图数据吗？\n这将覆盖您当前的碎片和箱子记录。');
    if (!confirmReset) return;

    const map: Record<string, number> = {};
    INITIAL_SINNERS.forEach(s => {
      map[s.id] = s.initialShards;
    });
    setSinnerShards(map);
    setOwnedBoxes(65);
    setShardsPerBox(2);
    
    // 恢复默认勾选演示项目
    setCheckedIds([
      'w1_meursault_regret_ego',
      'w4_yisang_solemn',
      'w6_rodion_knight',
      'w8_ryoshu_aroma',
      'w9_yisang_solemn_ego',
      'w3_sinclair_dawn'
    ]);
  };

  // 手动调整人格 / E.G.O 的评级（T0 / T0.5 / T1 / T1.5 / T2 / T3）
  const handleUpdateItemTier = (id: string, newTier: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, tier: newTier };
      }
      return item;
    }));
    // 如果当前正打开此卡的大图预览，同步更新预览条目
    setPreviewItem(prev => (prev && prev.id === id ? { ...prev, tier: newTier } : prev));
  };

  // 恢复所有卡牌评级为预设默认值
  const resetTiersToDefault = () => {
    setItems(prev => prev.map(item => {
      const original = INITIAL_WALPURGIS_ITEMS.find(i => i.id === item.id);
      return original ? { ...item, tier: original.tier } : item;
    }));
    setPreviewItem(prev => {
      if (!prev) return null;
      const original = INITIAL_WALPURGIS_ITEMS.find(i => i.id === prev.id);
      return original ? { ...prev, tier: original.tier } : prev;
    });
  };

  // 检查是否有任何被用户手动修改过评级的卡牌
  const hasCustomTiers = useMemo(() => {
    return items.some(item => {
      const orig = INITIAL_WALPURGIS_ITEMS.find(i => i.id === item.id);
      return orig && orig.tier !== item.tier;
    });
  }, [items]);

  // 快捷预设勾选方案（适配最新梯度，自动跳过已标记拥有的卡）
  const applyPreset = (presetType: string) => {
    const validItems = items.filter(i => !alreadyOwnedIds.includes(i.id));
    if (presetType === 'T0') {
      setCheckedIds(validItems.filter(i => i.tier === 'T0').map(i => i.id));
    } else if (presetType === 'T0_AND_T05') {
      setCheckedIds(validItems.filter(i => i.tier === 'T0' || i.tier === 'T0.5').map(i => i.id));
    } else if (presetType === 'EDITION_9_ONLY') {
      setCheckedIds(validItems.filter(i => i.edition === 9).map(i => i.id));
    } else if (presetType === 'EDITION_8_9') {
      setCheckedIds(validItems.filter(i => i.edition === 8 || i.edition === 9).map(i => i.id));
    } else if (presetType === 'DAWN_TRIO') {
      setCheckedIds(validItems.filter(i => ['w3_sinclair_dawn', 'w9_faust_yuna', 'w9_gregor_salvador'].includes(i.id)).map(i => i.id));
    } else if (presetType === 'ALL_EGO') {
      setCheckedIds(validItems.filter(i => i.type === 'E.G.O').map(i => i.id));
    } else if (presetType === 'ALL') {
      setCheckedIds(validItems.map(i => i.id));
    } else if (presetType === 'NONE') {
      setCheckedIds([]);
    }
  };

  // 添加自定义瓦夜条目
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    const sinnerObj = INITIAL_SINNERS.find(s => s.id === newItem.sinnerId);
    const created: WalpurgisItem = {
      id: `custom_${Date.now()}`,
      edition: Number(newItem.edition),
      editionName: `第${newItem.edition}期 瓦夜`,
      sinnerId: newItem.sinnerId,
      type: newItem.type,
      rarity: newItem.type === '00人格' ? '00' : (newItem.type === '000人格' ? '000' : 'HE'),
      name: newItem.name.trim(),
      shortName: newItem.shortName.trim() || newItem.name.trim(),
      cost: Number(newItem.cost),
      tier: newItem.tier,
      tierDesc: newItem.tierDesc || '自定义条目',
      themeColor: sinnerObj?.bg || '#334155',
      accentColor: sinnerObj?.color || '#f8fafc',
      motif: 'crosshair',
      abnoCode: 'CUSTOM',
      archetype: newItem.archetype
    };
    setItems(prev => [...prev, created]);
    setCheckedIds(prev => [...prev, created.id]);
    setNewItem({ ...newItem, name: '', shortName: '' });
    setShowAddModal(false);
  };

  // ==========================================
  // 5. 核心联动计算引擎（按罪人分组抵扣碎片）
  // ==========================================
  const calculation = useMemo(() => {
    // 排除已拥有的项（含图鉴同步项）
    const effectiveCheckedIds = checkedIds.filter(id => !syncedAlreadyOwnedIds.includes(id));
    const selectedItems = items.filter(item => effectiveCheckedIds.includes(item.id));
    
    // 1. 不计已有碎片的原价统计
    const rawTotalShards = selectedItems.reduce((sum, item) => sum + item.cost, 0);
    const rawTotalBoxes = selectedItems.reduce((sum, item) => sum + Math.ceil(item.cost / shardsPerBox), 0);

    // 2. 按12名罪人分别统计需求、抵扣已有碎片、计算净缺口与所需箱子
    const sinnerBreakdown = INITIAL_SINNERS.map(sinner => {
      const owned = sinnerShards[sinner.id] ?? 0;
      const sinnerCheckedItems = selectedItems.filter(i => i.sinnerId === sinner.id);
      const neededShards = sinnerCheckedItems.reduce((sum, i) => sum + i.cost, 0);
      
      // 抵扣该罪人已有碎片（不可跨罪人抵扣）
      const deductedShards = Math.min(owned, neededShards);
      const remainingShardsAfterExchange = Math.max(0, owned - neededShards);
      const deficitShards = Math.max(0, neededShards - owned);
      
      // 该罪人净缺口需要的箱子数（向上取整）
      const boxesNeededForSinner = deficitShards > 0 ? Math.ceil(deficitShards / shardsPerBox) : 0;

      return {
        ...sinner,
        owned,
        checkedItems: sinnerCheckedItems,
        neededShards,
        deductedShards,
        remainingShardsAfterExchange,
        deficitShards,
        boxesNeededForSinner
      };
    });

    // 3. 汇总扣除已有碎片后的总数据
    const totalDeductedShards = sinnerBreakdown.reduce((sum, s) => sum + s.deductedShards, 0);
    const totalDeficitShards = sinnerBreakdown.reduce((sum, s) => sum + s.deficitShards, 0);
    const boxesAfterShards = sinnerBreakdown.reduce((sum, s) => sum + s.boxesNeededForSinner, 0);

    // 4. 再扣除账号现有自选箱库存（如65箱）后的最终还需刷取箱数
    const finalBoxesToFarm = Math.max(0, boxesAfterShards - ownedBoxes);
    const remainingOwnedBoxes = Math.max(0, ownedBoxes - boxesAfterShards);

    // 5. 折算成日常普牢把数（9箱/把）与脑啡肽模块饼数（1饼=1.8箱，5饼/把）
    const normalDungeonRuns = Math.ceil(finalBoxesToFarm / 9);
    const modulesNeeded = Math.ceil(finalBoxesToFarm / 1.8);

    return {
      selectedCount: selectedItems.length,
      selectedIdCount: selectedItems.filter(i => i.type !== 'E.G.O').length,
      selectedEgoCount: selectedItems.filter(i => i.type === 'E.G.O').length,
      rawTotalShards,
      rawTotalBoxes,
      totalDeductedShards,
      totalDeficitShards,
      boxesAfterShards,
      finalBoxesToFarm,
      remainingOwnedBoxes,
      normalDungeonRuns,
      modulesNeeded,
      sinnerBreakdown
    };
  }, [items, checkedIds, sinnerShards, ownedBoxes, shardsPerBox, syncedAlreadyOwnedIds]);

  // 过滤显示的条目
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (typeFilter === 'ID' && item.type === 'E.G.O') return false;
      if (typeFilter === 'EGO' && item.type !== 'E.G.O') return false;
      if (typeFilter === 'CHECKED' && !checkedIds.includes(item.id)) return false;
      if (tierFilter !== 'ALL' && item.tier !== tierFilter) return false;
      if (archetypeFilter !== 'ALL' && item.archetype !== archetypeFilter) return false;
      return true;
    });
  }, [items, typeFilter, tierFilter, archetypeFilter, checkedIds]);

  // 获取所有期数列表（第1期～第9期全部可兑换）
  const editions = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // 按人格 (Identities) 与 E.G.O 分类组织已选条目（用于导出长图展示）
  const selectedItemsByType = useMemo(() => {
    const effectiveCheckedIds = checkedIds.filter(id => !syncedAlreadyOwnedIds.includes(id));
    const selected = items.filter(item => effectiveCheckedIds.includes(item.id));
    const identities = selected.filter(item => item.type !== 'E.G.O');
    const egos = selected.filter(item => item.type === 'E.G.O');

    // 组内排序：优先按 T 级（T0 -> T0.5 -> T1 -> T1.5 -> T2 -> T3），同级按期数降序
    const tierOrder: Record<string, number> = { 'T0': 0, 'T0.5': 1, 'T1': 2, 'T1.5': 3, 'T2': 4, 'T3': 5 };
    const sortFn = (a: WalpurgisItem, b: WalpurgisItem) => {
      const diff = (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99);
      if (diff !== 0) return diff;
      return b.edition - a.edition;
    };

    identities.sort(sortFn);
    egos.sort(sortFn);

    const groups: {
      typeKey: 'ID' | 'EGO';
      title: string;
      badgeText: string;
      badgeClass: string;
      items: WalpurgisItem[];
    }[] = [];

    if (identities.length > 0) {
      groups.push({
        typeKey: 'ID',
        title: '已选战斗人格 (Identities)',
        badgeText: 'IDENTITIES · 战斗人格',
        badgeClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-black border border-amber-300 font-black',
        items: identities
      });
    }

    if (egos.length > 0) {
      groups.push({
        typeKey: 'EGO',
        title: '已选异想体武装 (E.G.O)',
        badgeText: 'E.G.O · 异想体武装',
        badgeClass: 'bg-gradient-to-r from-purple-700 to-purple-800 text-white border border-purple-400 font-black',
        items: egos
      });
    }

    return groups;
  }, [items, checkedIds, syncedAlreadyOwnedIds]);

  // 监听 BOX 预览缩放
  useEffect(() => {
    if (!showBoxExportModal) return;
    const calculateScale = () => {
      if (boxPreviewScrollRef.current) {
        const containerW = boxPreviewScrollRef.current.clientWidth - 32;
        if (containerW < 960 && boxFitScreen) {
          const s = Math.max(0.2, Math.min(1, containerW / 960));
          setBoxPreviewScale(s);
        } else {
          setBoxPreviewScale(1);
        }
      }
    };
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [showBoxExportModal, boxFitScreen]);

  // 监听 BOX 预览实际高度用于紧凑自适应
  useEffect(() => {
    if (!showBoxExportModal || !boxPreviewPosterRef.current) return;
    const updateH = () => {
      if (boxPreviewPosterRef.current) {
        setBoxPosterHeight(boxPreviewPosterRef.current.offsetHeight);
      }
    };
    updateH();
    const timer = setTimeout(updateH, 150);
    const observer = new ResizeObserver(updateH);
    observer.observe(boxPreviewPosterRef.current);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [showBoxExportModal, ownedIdentityIds]);

  // 监听画板预览容器尺寸，在移动端/较窄屏幕上自适应 720px 画板宽度
  useEffect(() => {
    if (!showExportModal) return;
    const calculateScale = () => {
      if (previewScrollContainerRef.current) {
        const containerW = previewScrollContainerRef.current.clientWidth - 32;
        if (containerW < 720 && fitScreen) {
          const s = Math.max(0.35, Math.min(1, containerW / 720));
          setPreviewScale(s);
        } else {
          setPreviewScale(1);
        }
      }
    };
    calculateScale();
    const timer = setTimeout(calculateScale, 100);
    window.addEventListener('resize', calculateScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateScale);
    };
  }, [showExportModal, fitScreen]);

  // 监听海报实际高度用于自适应高度包裹，防止底部溢出或空白
  useEffect(() => {
    if (!showExportModal || !exportPosterRef.current) return;
    const updateH = () => {
      if (exportPosterRef.current) {
        setPosterHeight(exportPosterRef.current.offsetHeight);
      }
    };
    updateH();
    const timer = setTimeout(updateH, 150);
    const observer = new ResizeObserver(updateH);
    observer.observe(exportPosterRef.current);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [showExportModal, selectedItemsByType]);

  // 导出完整无损长图下载 (PNG)
  const handleDownloadImage = async () => {
    const node = exportPosterRef.current;
    if (!node) return;
    const prevFit = fitScreen;
    try {
      setIsExporting(true);

      // 导出捕获前临时重置为 1:1 原始比例并更新 DOM
      if (prevFit && previewScale !== 1) {
        setFitScreen(false);
        setPreviewScale(1);
        await new Promise(r => setTimeout(r, 60));
      }

      // 预先等待所有卡面立绘图片加载完毕
      const images = Array.from(node.querySelectorAll('img'));
      await Promise.all(
        images.map(img => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      // 确保精准测量完整无损长图的高度与宽度
      const fullWidth = 720;
      const fullHeight = Math.max(node.scrollHeight, node.offsetHeight, 800);

      // html2canvas 渲染
      const canvas = await html2canvas(node, {
        backgroundColor: '#0b0c13',
        scale: 2,
        useCORS: true,
        width: fullWidth,
        height: fullHeight,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.download = `边狱公司_瓦夜兑换长图_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error('Failed to export long image', err);
      const errorMsg = err instanceof Error ? err.message : (typeof err === 'string' ? err : '未知错误');
      alert('导出图片失败: ' + errorMsg + '\n提示：请尝试刷新页面后重试，或检查网络连接。');
    } finally {
      if (prevFit) {
        setFitScreen(true);
      }
      setIsExporting(false);
    }
  };

  // 复制完整长图到剪贴板
  const handleCopyImage = async () => {
    const node = exportPosterRef.current;
    if (!node) return;
    const prevFit = fitScreen;
    try {
      setIsExporting(true);

      if (prevFit && previewScale !== 1) {
        setFitScreen(false);
        setPreviewScale(1);
        await new Promise(r => setTimeout(r, 60));
      }

      const images = Array.from(node.querySelectorAll('img'));
      await Promise.all(
        images.map(img => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      const fullWidth = 720;
      const fullHeight = Math.max(node.scrollHeight, node.offsetHeight, 800);

      // html2canvas 渲染
      const canvas = await html2canvas(node, {
        backgroundColor: '#0b0c13',
        scale: 2,
        useCORS: true,
        width: fullWidth,
        height: fullHeight,
        logging: false,
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));

      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
      } else {
        handleDownloadImage();
      }
    } catch (err: any) {
      console.error('Failed to copy image to clipboard', err);
      const errorMsg = err instanceof Error ? err.message : (typeof err === 'string' ? err : '未知错误');
      console.warn('Clipboard copy failed, falling back to download. Error:', errorMsg);
      handleDownloadImage();
    } finally {
      if (prevFit) {
        setFitScreen(true);
      }
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100 font-sans pb-44 selection:bg-amber-500 selection:text-black">
      {/* 顶部边狱公司风格深红黑警示条 */}
      <div className="h-1.5 bg-gradient-to-r from-red-900 via-amber-500 to-red-900" />


      {/* 顶部 Tab 切换 */}
      <div className="bg-[#11131a] border-b border-amber-500/10">
        <div className="max-w-7xl mx-auto px-4 flex">
          <button
            onClick={() => setActiveTab('box')}
            className={`px-6 py-3 text-sm font-black transition-all relative ${
              activeTab === 'box' ? 'text-amber-400 bg-amber-500/5' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>📦 个人图鉴 / BOX 分享</span>
            </div>
            {activeTab === 'box' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
          </button>
          <button
            onClick={() => setActiveTab('walpurgis')}
            className={`px-6 py-3 text-sm font-black transition-all relative ${
              activeTab === 'walpurgis' ? 'text-amber-400 bg-amber-500/5' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>🌙 瓦夜兑换计算器</span>
            </div>
            {activeTab === 'walpurgis' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
          </button>
        </div>
      </div>

      {activeTab === 'box' ? (
        <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
          {/* BOX 主功能面板 */}
          <div className="bg-[#141720] border border-amber-500/30 p-4 sm:p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center rotate-3 shadow-lg">
                <Package className="w-8 h-8 text-black" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-amber-100 flex items-center justify-center md:justify-start gap-2">
                  个人图鉴与 BOX 分享
                </h2>
                <p className="text-zinc-400 text-xs sm:text-sm mt-1">记录您的全人格收集进度，一键生成 3×4 紧凑网格分享图</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex gap-2">
                <div className="px-3 py-1.5 bg-black/40 border border-amber-500/20 rounded-lg text-center">
                  <div className="text-[10px] text-amber-500 font-black uppercase">000 持有</div>
                  <div className="text-lg font-black font-mono leading-tight">{IDENTITIES_DATABASE.filter(i => i.rarity === '000' && isIdentityOwned(i, ownedIdentityIds)).length}</div>
                </div>
                <div className="px-3 py-1.5 bg-black/40 border border-purple-500/20 rounded-lg text-center">
                  <div className="text-[10px] text-purple-400 font-black uppercase">00 持有</div>
                  <div className="text-lg font-black font-mono leading-tight">{IDENTITIES_DATABASE.filter(i => i.rarity === '000' ? false : i.rarity === '00' && isIdentityOwned(i, ownedIdentityIds)).length}</div>
                </div>
              </div>
              <button
                onClick={handleOpenBoxExport}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black hover:scale-105 active:scale-95"
              >
                <Camera className="w-4 h-4" />
                生成我的 BOX 分享图
              </button>
            </div>
          </div>

          {/* 12罪人紧凑列表 */}
          <div className="grid gap-4">
            {INITIAL_SINNERS.map(sinner => {
              const owned = IDENTITIES_DATABASE.filter(i => i.sinnerId === sinner.id && isIdentityOwned(i, ownedIdentityIds));
              const totalInDatabase = IDENTITIES_DATABASE.filter(i => i.sinnerId === sinner.id).length;
              const lcbCode = 10000 + parseInt(sinner.num, 10) * 100 + 1;
              const lcbIdentity = IDENTITIES_DATABASE.find(i => i.sinnerId === sinner.id && (i.code === String(lcbCode) || i.rarity === '0'));

              return (
                <div key={sinner.id} className="bg-[#1a1c26] border border-zinc-800 hover:border-amber-500/30 rounded-xl p-3 sm:p-4 transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      {/* 罪人专属 LCB 头像 (替代原先的纯数字圆圈) */}
                      <div 
                        className="relative w-12 h-12 rounded-xl overflow-hidden border-2 shadow-md shrink-0 bg-black/60"
                        style={{ borderColor: sinner.color }}
                      >
                        <SafeImage
                          src={`./avatars/${lcbCode}.png`}
                          fallbackSrc={lcbIdentity?.wikiImg}
                          alt={sinner.name}
                          sinnerId={sinner.id}
                          rarity="0"
                          nickname={sinner.name}
                          className="w-full h-full object-cover"
                        />
                        <div 
                          className="absolute bottom-0 right-0 px-1 py-0.2 rounded-tl text-[9px] font-black font-mono leading-none shadow"
                          style={{ backgroundColor: sinner.color, color: '#000000' }}
                        >
                          {sinner.num}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-zinc-100">{sinner.name}</h3>
                          <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">{sinner.en}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="h-1.5 w-24 bg-black/40 rounded-full overflow-hidden border border-zinc-800/50">
                            <div 
                              className="h-full bg-amber-500 transition-all duration-500" 
                              style={{ width: `${totalInDatabase > 0 ? (owned.length / totalInDatabase) * 100 : 0}%` }} 
                            />
                          </div>
                          <span className="text-[10px] font-black text-amber-500/80">已拥有: {owned.length} / {totalInDatabase}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setSelectingSinnerId(sinner.id)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-400 text-xs font-black transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> 选择人格图鉴
                    </button>
                  </div>

                  {/* 已选人格标签流 */}
                  {owned.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-3 sm:mt-4 pl-0 sm:pl-[62px]">
                      {owned.sort((a,b) => {
                        const rScore = (r: string) => r === '000' ? 3 : r === '00' ? 2 : 1;
                        return rScore(b.rarity) - rScore(a.rarity);
                      }).map(idItem => (
                        <span 
                          key={idItem.id} 
                          className={`px-2 py-0.5 rounded text-[10px] font-black shadow-sm border transition-all hover:scale-105 select-none ${
                            idItem.rarity === '000' 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                              : idItem.rarity === '00'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          {idItem.nickname}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 pl-0 sm:pl-[62px] text-xs text-zinc-600 font-black italic uppercase tracking-tighter">暂无已选人格</div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      ) : (
        <div className="space-y-6">
          {/* Header 头部 */}
          <header className="border-b border-amber-500/20 bg-[#11131a]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-amber-500/20 to-red-900/40 border border-amber-500/50 flex items-center justify-center shadow-inner">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-wide text-amber-400">
                  瓦尔普吉斯之夜 · 兑换计算器
                </h1>
              </div>
              <p className="text-xs text-zinc-400">
                勾选任意人格与 E.G.O，自动按对应罪人抵扣您背包的碎片库存
              </p>
            </div>
          </div>

          {/* 顶部快捷操作与模式切换栏 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1箱期望切换 */}
            <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setShardsPerBox(2)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  shardsPerBox === 2 
                    ? 'bg-amber-500 text-black font-bold' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                数学期望 (1箱=2碎)
              </button>
              <button
                onClick={() => setShardsPerBox(1)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  shardsPerBox === 1 
                    ? 'bg-red-600 text-white font-bold' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                最低保底 (1箱=1碎)
              </button>
            </div>

            {/* 视图切换 */}
            <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setViewMode('edition')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  viewMode === 'edition' ? 'bg-zinc-700 text-amber-300 font-bold' : 'text-zinc-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> 按期数(1~9期)
              </button>
              <button
                onClick={() => setViewMode('sinner')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  viewMode === 'sinner' ? 'bg-zinc-700 text-amber-300 font-bold' : 'text-zinc-400'
                }`}
              >
                <User className="w-3.5 h-3.5" /> 按罪人分组
              </button>
            </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold transition"
          >
            <Plus className="w-4 h-4" /> 补充自定义项
          </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-4 space-y-6">
        {/* ==========================================
            模块1：用户账号现有碎片与自选箱库存面板（已预设截图数据）
           ========================================== */}
        <section className="bg-[#141720] border border-amber-500/25 rounded-xl overflow-hidden shadow-lg">
          <div 
            onClick={() => setShowShardEditor(!showShardEditor)}
            className="px-4 py-3 bg-gradient-to-r from-amber-950/30 via-zinc-900 to-zinc-900 border-b border-zinc-800 flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-sm sm:text-base text-amber-200">
                我的背包碎片与箱子库存（已录入您的截图数据，点击数字可随时微调）
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetToUserScreenshot();
                }}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
              >
                <RotateCcw className="w-3 h-3" /> 恢复截图初始值
              </button>
              {showShardEditor ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </div>
          </div>

          {showShardEditor && (
            <div className="p-4 space-y-4">
              {/* 12罪人碎片网格 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {calculation.sinnerBreakdown.map((s) => {
                  const isUsed = s.neededShards > 0;
                  return (
                    <div 
                      key={s.id}
                      className={`p-2.5 rounded-lg border transition ${
                        isUsed 
                          ? 'bg-amber-950/20 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                          : 'bg-zinc-900/80 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold flex items-center gap-1">
                          <span 
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="text-zinc-400 font-mono">{s.num}</span>
                          <span className="text-zinc-100">{s.name}</span>
                        </span>
                        {isUsed && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                            需{s.neededShards}碎
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={sinnerShards[s.id]}
                          onChange={(e) => handleShardChange(s.id, e.target.value)}
                          className="w-full bg-black/60 border border-zinc-700 focus:border-amber-400 rounded px-2 py-1 text-sm font-mono font-bold text-amber-300 outline-none"
                        />
                        <span className="text-xs text-zinc-400 shrink-0">碎</span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">
                          兑换后剩: <strong className="text-emerald-400">{s.remainingShardsAfterExchange}</strong>
                        </span>
                        {s.boxesNeededForSinner > 0 ? (
                          <span className="text-rose-400 font-bold">
                            差 {s.boxesNeededForSinner} 箱
                          </span>
                        ) : isUsed ? (
                          <span className="text-emerald-400 font-bold">碎片直换</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 现有自选箱库存设置条 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-bold text-amber-300">📦 背包现有自选碎片箱：</span>
                    <input
                      type="number"
                      min="0"
                      value={ownedBoxes}
                      onChange={(e) => setOwnedBoxes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-20 bg-black/70 border border-amber-500/50 rounded px-2 py-0.5 text-sm font-mono font-extrabold text-amber-300 outline-none text-center"
                    />
                    <span className="text-xs text-amber-200">箱 (约等于 {ownedBoxes * shardsPerBox} 任意碎片)</span>
                  </div>
                </div>

                {/* 一键预设勾选按钮组 */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-zinc-400 mr-1">十期环境快捷勾选：</span>
                  <button
                    onClick={() => applyPreset('T0')}
                    className="text-xs px-2.5 py-1 rounded bg-rose-600/25 hover:bg-rose-600/40 border border-rose-500/50 text-rose-200 font-semibold transition"
                  >
                    👑 T0必换人权 ({items.filter(i => i.tier === 'T0').length}张)
                  </button>
                  <button
                    onClick={() => applyPreset('T0_AND_T05')}
                    className="text-xs px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-semibold transition"
                  >
                    ✨ T0 + T0.5 核心毕业 ({items.filter(i => i.tier === 'T0' || i.tier === 'T0.5').length}张)
                  </button>
                  <button
                    onClick={() => applyPreset('EDITION_9_ONLY')}
                    className="text-xs px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-200 font-semibold transition"
                  >
                    🌅 第9期新解禁 (尤娜浮+萨尔瓦多虫+哀悼箱EGO)
                  </button>
                  <button
                    onClick={() => applyPreset('DAWN_TRIO')}
                    className="text-xs px-2.5 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-200 font-semibold transition"
                  >
                    🔥 黎明事务所三人组
                  </button>
                  <button
                    onClick={() => applyPreset('ALL_EGO')}
                    className="text-xs px-2.5 py-1 rounded bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-200 transition"
                  >
                    全部 E.G.O (9张)
                  </button>
                  <button
                    onClick={() => applyPreset('ALL')}
                    className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition"
                  >
                    全选({items.length})
                  </button>
                  <button
                    onClick={() => applyPreset('NONE')}
                    className="text-xs px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-red-200 transition"
                  >
                    清空全部√
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ==========================================
            模块2：筛选栏与兑换列表主体
           ========================================== */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#141720] p-3 rounded-xl border border-zinc-800 shadow-lg">
            <div className="flex flex-wrap items-center gap-1.5">
              <Filter className="w-4 h-4 text-amber-400 mr-1" />
              {([
                { key: 'ALL' as const, label: `全部项目 (${items.length})` },
                { key: 'ID' as const, label: `仅看人格 (${items.filter(i => i.type !== 'E.G.O').length})` },
                { key: 'EGO' as const, label: `仅看 E.G.O (${items.filter(i => i.type === 'E.G.O').length})` },
                { key: 'CHECKED' as const, label: `只看已打√ (${checkedIds.length})` },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setTypeFilter(tab.key)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                    typeFilter === tab.key
                      ? 'bg-amber-500 text-black font-bold shadow'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <span className="text-zinc-700 mx-1">|</span>
              {['ALL', 'T0', 'T0.5', 'T1', 'T1.5', 'T2', 'T3'].map(t => {
                const count = t === 'ALL' ? items.length : items.filter(i => i.tier === t).length;
                return (
                  <button
                    key={t}
                    onClick={() => setTierFilter(t)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-mono transition ${
                      tierFilter === t
                        ? 'bg-rose-600 text-white font-bold shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {t === 'ALL' ? '全部评级' : `${t} (${count})`}
                  </button>
                );
              })}

              {hasCustomTiers && (
                <button
                  onClick={resetTiersToDefault}
                  title="恢复所有卡牌评级为预设默认值"
                  className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-medium transition flex items-center gap-1 shadow-sm"
                >
                  <RotateCcw className="w-3 h-3" /> 恢复默认评级
                </button>
              )}
            </div>

            <div className="text-xs text-zinc-400">
              提示：点击任意行打 <span className="text-amber-400 font-bold">√</span> 计入兑换清单；若已有某张卡可点右侧 <span className="text-emerald-400 font-bold">[标记已拥有]</span> 排除
            </div>

            {/* 第二行：所属体系快速筛选 */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-1 border-t border-zinc-800/80">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-amber-300/80 font-bold mr-1 flex items-center gap-1">
                  <span>⚔️</span> 人格所属体系:
                </span>
                {['ALL', '烧伤', '沉沦', '流血', '破裂', '震颤', '呼吸', '充能'].map(arch => {
                  const isAll = arch === 'ALL';
                  const count = isAll ? items.length : items.filter(i => i.archetype === arch).length;
                  const meta = !isAll ? ARCHETYPE_CONFIG[arch] : null;
                  return (
                    <button
                      key={arch}
                      onClick={() => setArchetypeFilter(arch)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                        archetypeFilter === arch
                          ? 'bg-amber-400 text-black font-black shadow-md'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {meta && <span>{meta.icon}</span>}
                      <span>{isAll ? '全部体系' : `${arch} (${count})`}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                已按 7 大战斗流派标注全人格所属体系
              </div>
            </div>
          </div>

          {/* 视图 A：按瓦夜期数（第1期～第9期）展示 */}
          {viewMode === 'edition' ? (
            <div className="space-y-5">
              {editions.map(edNum => {
                const editionItems = filteredItems.filter(i => i.edition === edNum);
                if (editionItems.length === 0) return null;

                const selectableEditionItems = editionItems.filter(i => !alreadyOwnedIds.includes(i.id));
                const allEditionChecked = selectableEditionItems.length > 0 && selectableEditionItems.every(i => checkedIds.includes(i.id));

                const toggleWholeEdition = () => {
                  if (allEditionChecked) {
                    setCheckedIds(prev => prev.filter(id => !selectableEditionItems.some(i => i.id === id)));
                  } else {
                    const toAdd = selectableEditionItems.map(i => i.id);
                    setCheckedIds(prev => Array.from(new Set([...prev, ...toAdd])));
                  }
                };

                return (
                  <div key={edNum} className="bg-[#141720] border border-zinc-800/90 rounded-xl overflow-hidden shadow">
                    {/* 期数标题栏 */}
                    <div className="px-4 py-2.5 bg-gradient-to-r from-zinc-900 via-[#191d28] to-zinc-900 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className={`px-2.5 py-0.5 rounded border text-xs font-extrabold tracking-wider ${
                          edNum === 9 
                            ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300' 
                            : edNum === 8
                            ? 'bg-rose-500/20 border-rose-400/60 text-rose-200'
                            : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        }`}>
                          {editionItems[0]?.editionName || `第 ${edNum} 期 瓦尔普吉斯之夜`}
                        </span>
                        {edNum === 8 && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold">
                            含T0人权【余香·孤独 良秀】与【黄蜂 默尔索】
                          </span>
                        )}
                        <span className="text-xs text-zinc-400">
                          共 {editionItems.length} 项可兑换
                        </span>
                      </div>
                      <button
                        onClick={toggleWholeEdition}
                        className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
                      >
                        {allEditionChecked ? <CheckSquare className="w-3.5 h-3.5 text-amber-400" /> : <Square className="w-3.5 h-3.5 text-zinc-400" />}
                        {allEditionChecked ? '取消本期全选' : '全选本期'}
                      </button>
                    </div>

                    {/* 期数内卡片表格 */}
                    <div className="divide-y divide-zinc-800/70">
                      {editionItems.map(item => {
                        const sinner = INITIAL_SINNERS.find(s => s.id === item.sinnerId);
                        const isChecked = checkedIds.includes(item.id);
                        const isOwned = syncedAlreadyOwnedIds.includes(item.id);
                        const rawBoxes = Math.ceil(item.cost / shardsPerBox);
                        const sinnerCalc = calculation.sinnerBreakdown.find(s => s.id === item.sinnerId);

                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleItem(item.id)}
                            className={`group p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                              isOwned
                                ? 'bg-zinc-950/80 opacity-50'
                                : isChecked 
                                ? 'bg-amber-500/[0.08] hover:bg-amber-500/[0.12]' 
                                : 'hover:bg-zinc-800/40'
                            }`}
                          >
                            {/* 左侧：打勾框 + 卡面立绘确认图 + 名称详情 */}
                            <div className="flex items-start sm:items-center gap-3.5 flex-1">
                              {/* 醒目打勾框 */}
                              <div 
                                className={`mt-2 sm:mt-0 w-7 h-7 rounded-md flex items-center justify-center border-2 transition shrink-0 ${
                                  isOwned
                                    ? 'bg-emerald-950 border-emerald-600 text-emerald-400'
                                    : isChecked 
                                    ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_10px_rgba(251,191,36,0.5)]' 
                                    : 'bg-zinc-900 border-zinc-600 text-transparent group-hover:border-amber-400/60'
                                }`}
                              >
                                <Check className="w-5 h-5 stroke-[3.5]" />
                              </div>

                              {/* 视觉立绘缩略卡 */}
                              <CardPortraitArtwork item={item} sinner={sinner} isChecked={isChecked} onPreview={setPreviewItem} />

                              {/* 文字信息 */}
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {/* 类型与所属体系徽标 */}
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                                    item.type === 'E.G.O' 
                                      ? 'bg-purple-950/80 border-purple-500/50 text-purple-200' 
                                      : item.rarity === '000'
                                      ? 'bg-amber-950/80 border-amber-500/50 text-amber-200'
                                      : 'bg-red-950/80 border-red-500/50 text-red-200'
                                  }`}>
                                    {item.type === 'E.G.O' ? `E.G.O [${item.rarity}]` : `${item.type} · ${item.archetype || '通用'}体系`}
                                  </span>

                                  {item.type !== 'E.G.O' && item.archetype && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shadow-sm flex items-center gap-1 ${
                                      ARCHETYPE_CONFIG[item.archetype]?.badgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                    }`}>
                                      <span>{ARCHETYPE_CONFIG[item.archetype]?.icon}</span>
                                      <span>{item.archetype}体系</span>
                                    </span>
                                  )}

                                  {/* 手动可调节评级下拉菜单 */}
                                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">评级:</span>
                                    <TierBadgeSelect 
                                      tier={item.tier} 
                                      onChange={(newTier) => handleUpdateItemTier(item.id, newTier)} 
                                    />
                                  </div>

                                  {item.isNewlyUnlocked && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300">
                                      新解禁兑换
                                    </span>
                                  )}

                                  <span className={`text-sm sm:text-base font-extrabold transition ${
                                    isOwned ? 'line-through text-zinc-500' : 'text-zinc-100 group-hover:text-amber-200'
                                  }`}>
                                    {item.name}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                                  <span>
                                    常用简称：<strong className="text-amber-300/90">{item.shortName}</strong>
                                  </span>
                                  <span>·</span>
                                  <span>
                                    所属罪人：<strong style={{ color: sinner?.color }}>{sinner?.num} {sinner?.name}</strong>
                                    （现有 <strong className="text-amber-300 font-mono">{sinnerCalc?.owned}</strong> 碎，单换此卡仅差 <strong className="text-rose-300 font-mono">{Math.ceil(Math.max(0, item.cost - (sinnerCalc?.owned || 0)) / shardsPerBox)}</strong> 箱）
                                  </span>
                                </div>

                                {/* 十期瓦夜详细环境评价 */}
                                <p className="text-xs text-zinc-300/90 leading-relaxed bg-black/30 px-2.5 py-1 rounded border-l-2 border-amber-500/60">
                                  {item.tierDesc}
                                </p>
                              </div>
                            </div>

                            {/* 右侧：碎片与箱子消耗明细 + 标记已拥有按钮 */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 pl-10 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800/60 shrink-0">
                              <div className="text-left sm:text-right">
                                <div className="text-xs text-zinc-400">
                                  原价：<span className="font-mono font-bold text-zinc-200">{item.cost} 碎</span>
                                </div>
                                <div className="text-xs font-mono">
                                  折合：<strong className="text-amber-400 text-sm">{rawBoxes} 箱</strong>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => toggleAlreadyOwned(e, item.id)}
                                className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition ${
                                  isOwned
                                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                                    : 'bg-zinc-900/90 hover:bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                {isOwned ? '✓ 已拥有' : '标记已拥有'}
                              </button>

                              {/* 实时状态徽章 */}
                              <div className={`min-w-[84px] text-center px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                                isOwned
                                  ? 'bg-zinc-900 border-zinc-800 text-zinc-500'
                                  : isChecked 
                                  ? 'bg-amber-400/20 border-amber-400 text-amber-300' 
                                  : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                              }`}>
                                {isOwned ? '已跳过' : isChecked ? '✓ 已勾选' : '点击打√'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 视图 B：按12罪人分组展示 */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calculation.sinnerBreakdown.map(sinner => {
                const sinnerItems = filteredItems.filter(i => i.sinnerId === sinner.id);
                if (sinnerItems.length === 0) return null;

                return (
                  <div key={sinner.id} className="bg-[#141720] border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between">
                    <div>
                      {/* 罪人头部 */}
                      <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sinner.color }} />
                          <span className="font-extrabold text-sm text-zinc-100">
                            #{sinner.num} {sinner.name} ({sinner.en})
                          </span>
                        </div>
                        <div className="text-xs font-mono">
                          现有碎片: <strong className="text-amber-400">{sinner.owned}</strong> | 
                          已勾需求: <strong className="text-rose-300">{sinner.neededShards}</strong>
                        </div>
                      </div>

                      <div className="divide-y divide-zinc-800/60">
                        {sinnerItems.map(item => {
                          const isChecked = checkedIds.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleItem(item.id)}
                              className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                                isChecked ? 'bg-amber-500/10' : 'hover:bg-zinc-800/40'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded flex items-center justify-center border ${
                                  isChecked ? 'bg-amber-400 border-amber-300 text-black' : 'border-zinc-600'
                                }`}>
                                  {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                                </div>
                                <CardPortraitArtwork item={item} sinner={sinner} isChecked={isChecked} onPreview={setPreviewItem} />
                                <div>
                                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                    <span className="text-xs text-amber-400/90 font-mono">
                                      第{item.edition}期 · {item.type === 'E.G.O' ? item.type : `${item.type} · ${item.archetype || '通用'}体系`}
                                    </span>
                                    {item.type !== 'E.G.O' && item.archetype && (
                                      <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border shadow-sm flex items-center gap-0.5 ${
                                        ARCHETYPE_CONFIG[item.archetype]?.badgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                      }`}>
                                        <span>{ARCHETYPE_CONFIG[item.archetype]?.icon}</span>
                                        <span>{item.archetype}体系</span>
                                      </span>
                                    )}
                                    <TierBadgeSelect 
                                      tier={item.tier} 
                                      size="small"
                                      onChange={(newTier) => handleUpdateItemTier(item.id, newTier)} 
                                    />
                                  </div>
                                  <div className="font-bold text-sm text-zinc-100">{item.name}</div>
                                  <div className="text-xs text-zinc-400">{item.shortName} ({item.cost}碎)</div>
                                </div>
                              </div>
                              <div className="text-right font-mono text-xs shrink-0">
                                <div className="text-amber-300 font-bold">{Math.ceil(item.cost / shardsPerBox)} 箱</div>
                                <div className="text-zinc-500">{item.cost} 碎</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 罪人底部小计 */}
                    <div className="px-4 py-2 bg-black/50 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                      <span>
                        兑换后剩余碎片：<strong className="text-emerald-400">{sinner.remainingShardsAfterExchange} 碎</strong>
                      </span>
                      <span>
                        该罪人需补箱数：
                        <strong className={sinner.boxesNeededForSinner > 0 ? 'text-rose-400 text-sm ml-1' : 'text-emerald-400 ml-1'}>
                          {sinner.boxesNeededForSinner} 箱
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ==========================================
            模块3：表格尾部【三行核心统计总表 + 12罪人剩余碎片与箱子结算明细】
           ========================================== */}
        <section className="bg-[#141720] border-2 border-amber-500/40 rounded-xl overflow-hidden shadow-2xl">
          <div className="px-4 py-3 bg-gradient-to-r from-amber-500/20 via-red-950/30 to-zinc-900 border-b border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-400" />
              <h2 className="font-black text-base sm:text-lg text-amber-300">
                瓦夜兑换箱子消耗结算总表（随上方打 √ 实时增减）
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-300">
              当前已打勾：{calculation.selectedCount} 项（{calculation.selectedIdCount} 人格 + {calculation.selectedEgoCount} E.G.O）
            </span>
          </div>

          {/* 核心三行对比统计表 */}
          <div className="divide-y divide-zinc-800">
            {/* 第 1 行：不计碎片的原价总消耗箱数 */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-900/40">
              <div>
                <div className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-200 text-xs font-mono">第 1 行</span>
                  已勾选项目【原价总消耗箱数】（不抵扣已有碎片）
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  已选 {calculation.selectedCount} 个项目的理论总碎片需求为 {calculation.rawTotalShards} 碎片
                </p>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs text-zinc-400 mr-2">共需 {calculation.rawTotalShards} 碎片 =</span>
                <span className="text-xl sm:text-2xl font-black text-zinc-200">
                  {calculation.rawTotalBoxes} <span className="text-sm font-normal text-zinc-400">箱</span>
                </span>
              </div>
            </div>

            {/* 第 2 行：扣除账号已有对应罪人碎片后需要消耗的箱数 */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-500/[0.07]">
              <div>
                <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-xs font-mono font-bold">第 2 行</span>
                  【扣除账号已有碎片后】实际需要消耗的箱数
                </div>
                <p className="text-xs text-zinc-300 mt-0.5">
                  已成功抵扣您对应罪人的 <strong className="text-emerald-400 font-mono">{calculation.totalDeductedShards}</strong> 碎片，净缺口为 <strong className="text-amber-300 font-mono">{calculation.totalDeficitShards}</strong> 碎片
                </p>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs text-amber-200/80 mr-2">扣除已有碎片后需开：</span>
                <span className="text-2xl sm:text-3xl font-black text-amber-400">
                  {calculation.boxesAfterShards} <span className="text-sm font-normal text-amber-200">箱</span>
                </span>
              </div>
            </div>

            {/* 第 3 行：再扣除背包现有 65 个自选箱后的最终还需刷取箱数 & 饼数 */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-950/20">
              <div>
                <div className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-black text-xs font-mono font-bold">第 3 行</span>
                  【再扣除背包现有 {ownedBoxes} 个自选箱后】最终还需刷取缺口
                </div>
                <p className="text-xs text-zinc-300 mt-0.5">
                  用掉现有自选箱后，背包还剩 <strong className="text-emerald-400 font-mono">{calculation.remainingOwnedBoxes}</strong> 个自选箱
                </p>
              </div>
              <div className="flex flex-wrap items-baseline justify-end gap-3 font-mono">
                <div className="text-right">
                  <span className="text-xs text-zinc-400 mr-1">最终还差：</span>
                  <span className="text-2xl sm:text-3xl font-black text-rose-400">
                    {calculation.finalBoxesToFarm} <span className="text-sm font-normal text-rose-200">箱</span>
                  </span>
                </div>
                <div className="text-xs px-3 py-1.5 rounded-lg bg-black/60 border border-zinc-700 text-amber-200">
                  ≈ 需花 <strong className="text-amber-400 text-sm">{calculation.modulesNeeded}</strong> 个饼 
                  （打 <strong className="text-amber-400 text-sm">{calculation.normalDungeonRuns}</strong> 把日常普牢）
                </div>
              </div>
            </div>
          </div>

          {/* 12罪人兑换后剩余碎片与单人补箱明细表 */}
          <div className="p-4 bg-black/40 border-t border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
              📊 12 罪人兑换后剩余碎片 & 单罪人需补箱数一览表
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="py-2 px-2">罪人</th>
                    <th className="py-2 px-2">已勾选项目</th>
                    <th className="py-2 px-2 text-right">账号原有碎片</th>
                    <th className="py-2 px-2 text-right">勾选消耗碎片</th>
                    <th className="py-2 px-2 text-right">兑换后剩余碎片</th>
                    <th className="py-2 px-2 text-right">碎片缺口</th>
                    <th className="py-2 px-2 text-right">该罪人需开箱数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {calculation.sinnerBreakdown.map(s => (
                    <tr 
                      key={s.id} 
                      className={s.neededShards > 0 ? 'bg-amber-500/[0.05] text-zinc-100' : 'text-zinc-500'}
                    >
                      <td className="py-2 px-2 font-sans font-bold">
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: s.color }} />
                        {s.num} {s.name}
                      </td>
                      <td className="py-2 px-2 font-sans">
                        {s.checkedItems.length > 0 
                          ? s.checkedItems.map(i => i.shortName).join(' + ')
                          : '— 未勾选 —'}
                      </td>
                      <td className="py-2 px-2 text-right text-amber-300">{s.owned}</td>
                      <td className="py-2 px-2 text-right text-rose-300">
                        {s.neededShards > 0 ? `-${s.neededShards}` : '0'}
                      </td>
                      <td className="py-2 px-2 text-right text-emerald-400 font-bold">
                        {s.remainingShardsAfterExchange} 碎
                      </td>
                      <td className="py-2 px-2 text-right">
                        {s.deficitShards > 0 ? `${s.deficitShards} 碎` : '0'}
                      </td>
                      <td className="py-2 px-2 text-right font-bold">
                        {s.boxesNeededForSinner > 0 ? (
                          <span className="text-amber-400">{s.boxesNeededForSinner} 箱</span>
                        ) : s.neededShards > 0 ? (
                          <span className="text-emerald-400">0 箱 (碎片直换)</span>
                        ) : (
                          '0 箱'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ==========================================
            模块4：页面最下方一键导出规划图面板
           ========================================== */}
        <section className="bg-gradient-to-r from-[#171320] via-[#12141f] to-[#171320] border-2 border-amber-500/40 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-900/30 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Download className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-200 flex items-center gap-2">
                <span>一键导出兑换规划高清长图</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  按T级分档 · 附总需箱数
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                将当前打勾的人格与 E.G.O 按 T0 ~ T3 评级分档排布，底部附带精准扣除碎片与库存后的总需箱数，方便分享至微信/QQ群与社区交流。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (calculation.selectedCount === 0) {
                alert("请先勾选需要兑换的人格或 E.G.O，即可生成分档规划长图！");
                return;
              }
              setShowExportModal(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-sm shadow-[0_0_20px_rgba(251,191,36,0.4)] transition hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4 stroke-[3]" />
            <span>生成并导出规划图 ({calculation.selectedCount}项)</span>
          </button>
        </section>
      </main>

      {/* ==========================================
          底部常驻悬浮实时结算台（打勾时无需滚到底部也能实时看箱数变化）
         ========================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0e1017]/95 border-t-2 border-amber-500/60 backdrop-blur-md shadow-[0_-10px_30px_rgba(0,0,0,0.85)]">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs sm:text-sm">
            <div>
              已打勾：<strong className="text-amber-400 font-mono text-base">{calculation.selectedCount}</strong> 项
            </div>
            <div className="text-zinc-400">
              原价总箱数：<strong className="text-zinc-100 font-mono text-base">{calculation.rawTotalBoxes}</strong> 箱
            </div>
            <div className="text-amber-200">
              扣已有碎片后需：<strong className="text-amber-400 font-mono text-lg">{calculation.boxesAfterShards}</strong> 箱
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 border-t md:border-t-0 pt-1.5 md:pt-0 border-zinc-800">
            <div className="text-xs sm:text-sm">
              再扣现有 <span className="text-amber-300 font-mono font-bold">{ownedBoxes}</span> 箱后还需刷：
              <strong className="text-rose-400 font-mono text-xl ml-1">{calculation.finalBoxesToFarm}</strong> 箱
              <span className="text-zinc-400 text-xs ml-1.5">
                (剩 {calculation.remainingOwnedBoxes} 箱)
              </span>
            </div>

            <div className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold">
              需 {calculation.modulesNeeded} 饼 / {calculation.normalDungeonRuns} 把普牢
            </div>

            {/* 页面最下方一键导出长图按钮 */}
            <button
              type="button"
              onClick={() => {
                if (calculation.selectedCount === 0) {
                  alert("请先勾选需要兑换的人格或 E.G.O，即可生成分档规划长图！");
                  return;
                }
                setShowExportModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-110 text-black font-black text-xs shadow-[0_0_15px_rgba(251,191,36,0.4)] transition cursor-pointer shrink-0"
              title="生成并导出兑换规划长图（按T级分档，底部附总需箱数）"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>一键导出规划图</span>
            </button>
          </div>
        </div>
      </div>

      {/* 自定义添加瓦夜项目弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#161922] border border-amber-500/40 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <h3 className="font-bold text-amber-300">补充自定义瓦夜兑换项</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white text-sm">
                关闭
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">所属期数</label>
                  <select
                    value={newItem.edition}
                    onChange={e => setNewItem({ ...newItem, edition: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <option key={n} value={n}>第 {n} 期瓦夜</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">所属罪人</label>
                  <select
                    value={newItem.sinnerId}
                    onChange={e => setNewItem({ ...newItem, sinnerId: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100"
                  >
                    {INITIAL_SINNERS.map(s => (
                      <option key={s.id} value={s.id}>{s.num} {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">类型</label>
                  <select
                    value={newItem.type}
                    onChange={e => {
                      const t = e.target.value;
                      setNewItem({ 
                        ...newItem, 
                        type: t, 
                        cost: t === '00人格' ? 150 : 400 
                      });
                    }}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100"
                  >
                    <option value="000人格">000人格 (400碎)</option>
                    <option value="00人格">00人格 (150碎)</option>
                    <option value="E.G.O">E.G.O (400碎)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">兑换所需碎片</label>
                  <input
                    type="number"
                    value={newItem.cost}
                    onChange={e => setNewItem({ ...newItem, cost: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-amber-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">人格 / E.G.O 名称</label>
                <input
                  type="text"
                  required
                  placeholder="例如：脑叶E.G.O::XXX"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">常用简称</label>
                <input
                  type="text"
                  placeholder="例如：XX良 / XX箱"
                  value={newItem.shortName}
                  onChange={e => setNewItem({ ...newItem, shortName: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">所属体系 (战斗流派)</label>
                <select
                  value={newItem.archetype}
                  onChange={e => setNewItem({ ...newItem, archetype: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100"
                >
                  {['烧伤', '沉沦', '流血', '破裂', '震颤', '呼吸', '充能', '通用'].map(arch => (
                    <option key={arch} value={arch}>{ARCHETYPE_CONFIG[arch]?.icon} {arch}体系</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">推荐评级</label>
                <select
                  value={newItem.tier}
                  onChange={e => setNewItem({ ...newItem, tier: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100"
                >
                  {TIER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-amber-500 text-black font-bold"
                >
                  确认添加并打勾
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 官方卡面全景高清画廊预览弹窗 (Lightbox) */}
      {/* ========================================== */}
      {previewItem && (() => {
        const previewSinner = INITIAL_SINNERS.find(s => s.id === previewItem.sinnerId);
        const isChecked = checkedIds.includes(previewItem.id);
        const isOwned = syncedAlreadyOwnedIds.includes(previewItem.id);
        const ownedShards = sinnerShards[previewItem.sinnerId] ?? 0;
        const deficit = Math.max(0, previewItem.cost - ownedShards);
        const boxesNeeded = Math.ceil(previewItem.cost / shardsPerBox);
        const boxesDeficit = Math.ceil(deficit / shardsPerBox);
        const imgSrc = previewItem.image || `assets/cards/${previewItem.id}.webp`;

        return (
          <div 
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
            onClick={() => setPreviewItem(null)}
          >
            <div 
              className="relative w-full max-w-3xl bg-[#0c0d14] border-2 border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.95)] overflow-hidden text-zinc-100 flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 顶部标题栏 */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/80">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
                    Limbus Company · 官方原画鉴赏
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    第{previewItem.edition}期 瓦夜
                  </span>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                  title="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 弹窗主体内容 */}
              <div className="p-5 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
                {/* 左侧：官方立绘大图展示区 */}
                <div className="md:w-5/12 flex flex-col items-center">
                  <div className="relative w-full aspect-[3/4] max-w-[280px] rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.2)] bg-black group">
                    <SafeImage
                      src={imgSrc}
                      alt={previewItem.name}
                      sinnerId={previewItem.sinnerId}
                      rarity={previewItem.rarity}
                      nickname={previewItem.shortName}
                      className="w-full h-full object-cover object-center"
                    />
                    
                    {/* 稀有度与罪人标 */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className={`text-xs font-black px-2 py-0.5 rounded shadow ${
                        previewItem.rarity === '000' ? 'bg-amber-500 text-black border border-amber-300 font-extrabold' :
                        previewItem.rarity === '00' ? 'bg-red-600 text-white border border-red-400' :
                        previewItem.rarity === 'WAW' ? 'bg-purple-700 text-white border border-purple-400' :
                        'bg-sky-600 text-white border border-sky-400'
                      }`}>
                        {previewItem.rarity}
                      </span>
                      {previewSinner && (
                        <span 
                          className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/10"
                          style={{ color: previewSinner.color }}
                        >
                          #{previewSinner.num} {previewSinner.name}
                        </span>
                      )}
                    </div>

                    {/* 异想体代号标 */}
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/85 text-zinc-300 border border-zinc-700">
                        {previewItem.abnoCode}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-center text-xs text-zinc-500 font-mono">
                    Official Artwork · Limbus Company
                  </div>
                </div>

                {/* 右侧：卡牌详情、兑换消耗与梯度点评 */}
                <div className="md:w-7/12 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* 标题与简称 */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                          previewItem.type === 'E.G.O' 
                            ? 'bg-purple-950/80 border-purple-500/50 text-purple-200' 
                            : 'bg-amber-950/80 border-amber-500/50 text-amber-200'
                        }`}>
                          {previewItem.type === 'E.G.O' ? `E.G.O [${previewItem.rarity}]` : `${previewItem.type} · ${previewItem.archetype || '通用'}体系`}
                        </span>

                        {previewItem.type !== 'E.G.O' && previewItem.archetype && (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded border shadow flex items-center gap-1 ${
                            ARCHETYPE_CONFIG[previewItem.archetype]?.badgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}>
                            <span>{ARCHETYPE_CONFIG[previewItem.archetype]?.icon}</span>
                            <span>{previewItem.archetype}体系</span>
                          </span>
                        )}
                        
                        <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded-lg border border-zinc-700/80 shadow-sm">
                          <span className="text-[11px] text-zinc-400 font-mono">自定义评级:</span>
                          <TierBadgeSelect 
                            tier={previewItem.tier} 
                            size="large"
                            onChange={(newTier) => handleUpdateItemTier(previewItem.id, newTier)} 
                          />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-zinc-100 leading-snug">
                        {previewItem.name}
                      </h3>
                      <p className="text-sm text-amber-300/90 font-mono mt-0.5">
                        常用简称：{previewItem.shortName}
                      </p>
                    </div>

                    {/* 兑换资源核算面板 */}
                    <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-zinc-400">兑换原价</div>
                        <div className="font-mono text-base font-bold text-amber-300">
                          {previewItem.cost} <span className="text-xs font-normal text-zinc-400">碎</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-400">折合自选箱</div>
                        <div className="font-mono text-base font-bold text-amber-400">
                          {boxesNeeded} <span className="text-xs font-normal text-zinc-400">箱 (期望)</span>
                        </div>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                        <span className="text-zinc-400">
                          当前持有 <span style={{ color: previewSinner?.color }}>{previewSinner?.name}</span> 碎片：
                        </span>
                        <span className="font-mono font-bold text-zinc-200">
                          {ownedShards} 碎
                        </span>
                      </div>
                      <div className="col-span-2">
                        {ownedShards >= previewItem.cost ? (
                          <div className="text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 rounded px-2 py-1 text-center">
                            ✅ 现有罪人碎片已完全足够，0箱直接秒换！
                          </div>
                        ) : (
                          <div className="text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded px-2 py-1 flex items-center justify-between font-mono">
                            <span>扣除已有后净缺口：</span>
                            <span className="font-bold text-amber-400">{deficit} 碎 (约需 {boxesDeficit} 箱)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 强度定位与十期瓦夜前瞻分析 */}
                    <div className="p-3.5 rounded-xl bg-[#141622] border border-amber-500/20 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        瓦夜实战评级与体系搭配建议：
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {previewItem.tierDesc}
                      </p>
                    </div>
                  </div>

                  {/* 底部操作快捷按钮 */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleItem(previewItem.id)}
                      className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                        isOwned 
                          ? 'opacity-50 cursor-not-allowed bg-zinc-800 text-zinc-500'
                          : isChecked
                          ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-md'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
                      }`}
                      disabled={isOwned}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      {isOwned ? '已拥有此卡' : isChecked ? '已加入兑换计划 (点击移出)' : '加入兑换计划'}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => toggleAlreadyOwned(e, previewItem.id)}
                      className={`py-2.5 px-3.5 rounded-xl font-medium text-xs flex items-center gap-1.5 border transition cursor-pointer ${
                        isOwned
                          ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
                      }`}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      {isOwned ? '已标为拥有' : '标记已拥有'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewItem(null)}
                      className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs border border-zinc-700 transition cursor-pointer"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================== */}
      {/* 一键导出兑换规划分档长图弹窗 */}
      {/* ========================================== */}
      {showExportModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setShowExportModal(false)}
        >
          <div 
            className="relative w-full max-w-4xl bg-[#0c0d14] border-2 border-amber-500/50 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.95)] overflow-hidden text-zinc-100 flex flex-col max-h-[94vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗顶部操作控制栏 */}
            <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-[#12141f]">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base text-amber-200">
                  兑换规划分档图预览与导出
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hidden sm:inline">
                  已选 {calculation.selectedCount} 项 · 按T级分档
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* 屏幕自适应 / 100% 原始尺寸切换按钮 */}
                <button
                  type="button"
                  onClick={() => setFitScreen(!fitScreen)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title={fitScreen ? "切换为 100% 原始大小" : "切换为自适应屏幕大小"}
                >
                  {fitScreen ? (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">100% 原始尺寸</span>
                      <span className="sm:hidden">100%</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">自适应屏幕</span>
                      <span className="sm:hidden">适应屏幕</span>
                    </>
                  )}
                </button>

                {/* 复制图片到剪贴板 */}
                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={isExporting}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  title="复制完整长图到剪贴板（可直接Ctrl+V粘贴发送）"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{copiedToast ? '已复制长图！' : '复制长图'}</span>
                </button>

                {/* 保存PNG图片 */}
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={isExporting}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-black text-xs font-extrabold flex items-center gap-1.5 shadow transition cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>正在渲染完整长图...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>下载高清长图 (PNG)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                  title="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 提示条（复制成功提示） */}
            {copiedToast && (
              <div className="bg-emerald-950/90 border-b border-emerald-600 px-4 py-2 text-xs text-emerald-200 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>已成功将规划长图复制至剪贴板，可在 QQ、微信、论坛或 Discord 直接粘贴分享！</span>
              </div>
            )}

            {/* 长图说明与手机端提示条 */}
            <div className="px-5 py-2.5 bg-zinc-950 border-b border-zinc-800 text-xs text-amber-300/90 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                已生成 <strong>720px 高清无损长图</strong>
              </span>
              <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                {previewScale < 1 && fitScreen && (
                  <span className="text-amber-400 font-bold">
                    已自适应缩放至 {Math.round(previewScale * 100)}%
                  </span>
                )}
                <span>上下滑动可浏览长图全貌 · 点击右上角保存</span>
              </div>
            </div>

            {/* 弹窗主体：画板预览区域（完美适配手机与桌面端，支持缩放或 1:1 无损预览） */}
            <div 
              ref={previewScrollContainerRef}
              className="p-3 sm:p-6 overflow-x-auto overflow-y-auto flex-1 flex justify-center bg-[#07080c]"
            >
              <div
                style={{
                  width: previewScale < 1 && fitScreen ? `${Math.round(720 * previewScale)}px` : '720px',
                  height: previewScale < 1 && fitScreen && posterHeight > 0 ? `${Math.round(posterHeight * previewScale)}px` : 'auto',
                  position: 'relative',
                  overflow: previewScale < 1 && fitScreen ? 'hidden' : 'visible',
                  flexShrink: 0
                }}
              >
                <div 
                  ref={exportPosterRef} 
                  className="w-[720px] min-w-[720px] bg-[#0b0c13] p-5 sm:p-6 rounded-2xl border-2 shadow-2xl relative font-sans shrink-0 h-auto overflow-visible"
                  style={{ 
                    color: '#f4f4f5',
                    borderColor: 'rgba(245, 158, 11, 0.5)',
                    background: 'radial-gradient(ellipse at 50% 0%, #1c1324 0%, #0c0d14 75%)',
                    transform: previewScale < 1 && fitScreen ? `scale(${previewScale})` : 'none',
                    transformOrigin: 'top left',
                  }}
                >
                  {/* 顶部 Limbus 战术横幅 */}
                  <div className="flex items-center justify-between pb-4 mb-5" style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 via-amber-600 to-amber-400 p-0.5 shadow-lg flex items-center justify-center">
                        <div className="w-full h-full bg-[#0d0e15] rounded-[10px] flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-amber-400" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black tracking-widest uppercase" style={{ color: '#f59e0b' }}>
                            LIMBUS COMPANY · WALPURGISNACHT
                          </span>
                        </div>
                        <h2 className="text-xl font-black tracking-wide mt-0.5" style={{ color: '#fde68a' }}>
                          瓦尔普吉斯之夜 · 兑换规划清单
                        </h2>
                      </div>
                    </div>
                    <div className="text-right text-[11px] font-mono" style={{ color: '#a1a1aa' }}>
                      <div>已选 <strong style={{ color: '#fbbf24' }}>{calculation.selectedCount}</strong> 张 (1箱期望={shardsPerBox}碎)</div>
                      <div style={{ color: '#71717a' }}>背包库存: {ownedBoxes} 箱</div>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* 第一个大框：所有已选兑换卡牌总览 (完整把所有勾选的卡框进这一个大框内) */}
                  {/* ========================================================================= */}
                  <div className="bg-[#10121a]/95 border-2 rounded-2xl p-4 sm:p-5 shadow-2xl mb-5 space-y-4 relative" style={{ borderColor: 'rgba(245, 158, 11, 0.5)' }}>
                    {/* 第一个大框头部标题栏 */}
                    <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                        <h3 className="text-base font-black tracking-wide" style={{ color: '#fde68a' }}>
                          已选兑换卡牌总览 · 按人格与 E.G.O 分类
                        </h3>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full border" style={{ backgroundColor: '#450a0a', borderColor: '#d97706', color: '#fcd34d' }}>
                          共已选 {calculation.selectedCount} 张 (人格 {calculation.selectedIdCount} / E.G.O {calculation.selectedEgoCount})
                        </span>
                      </div>
                      <div className="text-xs font-mono" style={{ color: '#a1a1aa' }}>
                        选卡总原价：<strong style={{ color: '#fbbf24' }}>{calculation.rawTotalShards}</strong> 碎
                        <span style={{ color: '#71717a' }}> (折合约 {calculation.rawTotalBoxes} 箱)</span>
                      </div>
                    </div>

                    {/* 如果未选择任何卡牌 */}
                    {selectedItemsByType.length === 0 ? (
                      <div className="text-center py-10 text-sm" style={{ color: '#71717a' }}>
                        当前未勾选任何卡牌，请在主界面勾选需要兑换的人格或 E.G.O
                      </div>
                    ) : (
                      /* 在同一个大框内，按人格与 E.G.O 分类展示两个板块 */
                      <div className="space-y-4">
                        {selectedItemsByType.map((group) => {
                          const totalGroupCost = group.items.reduce((sum, i) => sum + i.cost, 0);
                          const totalGroupBoxes = group.items.reduce((sum, i) => sum + Math.ceil(i.cost / shardsPerBox), 0);

                          return (
                            <div 
                              key={group.typeKey} 
                              className="bg-[#141724]/90 border border-zinc-800/90 rounded-xl p-3.5 space-y-3 shadow-inner"
                            >
                              {/* 分类头部标题 */}
                              <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid rgba(39, 39, 42, 0.8)' }}>
                                <div className="flex items-center gap-2">
                                  <span 
                                    className="text-xs px-2.5 py-0.5 rounded shadow"
                                    style={group.typeKey === 'ID' 
                                      ? { background: 'linear-gradient(to right, #f59e0b, #d97706)', color: '#000000', border: '1px solid #fcd34d', fontWeight: '900' }
                                      : { background: 'linear-gradient(to right, #7e22ce, #6b21a8)', color: '#ffffff', border: '1px solid #c084fc', fontWeight: '900' }
                                    }
                                  >
                                    {group.badgeText}
                                  </span>
                                  <span className="text-xs font-bold" style={{ color: '#e4e4e7' }}>
                                    {group.title}
                                  </span>
                                  <span className="text-xs font-mono" style={{ color: '#a1a1aa' }}>
                                    (共已选 {group.items.length} 张)
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono" style={{ color: 'rgba(251, 191, 36, 0.9)' }}>
                                  分类合计：{totalGroupCost} 碎 (约 {totalGroupBoxes} 箱)
                                </span>
                              </div>

                              {/* 卡牌网格 (双列清晰排布，精美边框与官方卡面立绘) */}
                              <div className="grid grid-cols-2 gap-2.5">
                                {group.items.map(item => {
                                  const sinner = INITIAL_SINNERS.find(s => s.id === item.sinnerId);
                                  const ownedShards = sinnerShards[item.sinnerId] ?? 0;
                                  const imgSrc = item.image || `assets/cards/${item.id}.webp`;
                                  const isCovered = ownedShards >= item.cost;
                                  const archMeta = item.archetype ? ARCHETYPE_CONFIG[item.archetype] : null;

                                  return (
                                    <div 
                                      key={item.id} 
                                      className="flex items-center gap-2.5 p-2 rounded-lg border shadow-sm transition"
                                      style={{ backgroundColor: '#181b29', borderColor: 'rgba(63, 63, 70, 0.7)' }}
                                    >
                                      {/* 官方卡面立绘小图 */}
                                      <div className="relative w-12 h-14 rounded-md overflow-hidden shrink-0 border border-amber-500/50 bg-black shadow">
                                        <SafeImage 
                                          src={imgSrc} 
                                          alt={item.name}
                                          sinnerId={item.sinnerId}
                                          rarity={item.rarity}
                                          nickname={item.shortName}
                                          className="w-full h-full object-cover object-center" 
                                        />
                                        <span className={`absolute top-0.5 left-0.5 text-[8px] font-black px-1 rounded shadow ${
                                          item.rarity === '000' ? 'bg-amber-500 text-black' :
                                          item.rarity === '00' ? 'bg-red-600 text-white' :
                                          item.rarity === 'WAW' ? 'bg-purple-700 text-white' : 'bg-sky-600 text-white'
                                        }`}>
                                          {item.rarity}
                                        </span>
                                        <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold px-1 rounded bg-black/80 text-amber-300 font-mono">
                                          {item.tier}
                                        </span>
                                      </div>

                                      {/* 卡牌信息 */}
                                      <div className="min-w-0 flex-1 space-y-0.5">
                                        <div className="flex items-center gap-1.5 text-[10px] font-mono flex-wrap" style={{ color: '#a1a1aa' }}>
                                          <span className="font-bold" style={{ color: '#fbbf24' }}>第{item.edition}期</span>
                                          <span>·</span>
                                          <span style={{ color: sinner?.color }} className="font-semibold">#{sinner?.num} {sinner?.name}</span>
                                          <span>·</span>
                                          {item.type !== 'E.G.O' ? (
                                            <span 
                                              className="px-1.5 py-0.2 rounded font-sans font-bold text-[9px] border shadow-sm flex items-center gap-0.5"
                                              style={{ 
                                                backgroundColor: archMeta?.color ? `${archMeta.color}33` : 'rgba(69, 10, 10, 0.8)', 
                                                borderColor: archMeta?.color ? `${archMeta.color}80` : 'rgba(245, 158, 11, 0.5)',
                                                color: archMeta?.color || '#fcd34d'
                                              }}
                                            >
                                              {archMeta?.icon} {item.archetype || '通用'}体系
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.2 rounded font-sans font-bold text-[9px]" style={{ backgroundColor: 'rgba(69, 10, 10, 0.8)', border: '1px solid rgba(126, 34, 206, 0.5)', color: '#e9d5ff' }}>
                                              E.G.O [{item.rarity}]
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs font-bold truncate" style={{ color: '#f4f4f5' }} title={item.name}>
                                          {item.name}
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-mono">
                                          <span className="font-bold" style={{ color: '#fcd34d' }}>{item.cost} 碎 ({Math.ceil(item.cost / shardsPerBox)}箱)</span>
                                          {isCovered ? (
                                            <span className="font-semibold flex items-center gap-0.5" style={{ color: '#34d399' }}>
                                              ✓ 现有碎片直换
                                            </span>
                                          ) : (
                                            <span style={{ color: '#a1a1aa' }}>库存 {ownedShards} 碎</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ========================================================================= */}
                  {/* 最下方汇总大框：总需要箱子数与碎片资源核算 */}
                  {/* ========================================================================= */}
                  <div className="bg-gradient-to-br from-[#18131e] via-[#141624] to-[#12131d] border-2 rounded-2xl p-4 sm:p-5 shadow-xl" style={{ borderColor: 'rgba(245, 158, 11, 0.6)' }}>
                    <div className="text-xs sm:text-sm font-bold mb-3 flex items-center justify-between pb-2.5" style={{ color: '#fcd34d', borderBottom: '1px solid rgba(245, 158, 11, 0.25)' }}>
                      <span className="flex items-center gap-2">
                        <Package className="w-4 h-4" style={{ color: '#f59e0b' }} />
                        兑换资源总核算 (碎片抵扣)
                      </span>
                      <span className="font-mono text-xs" style={{ color: '#a1a1aa' }}>
                        已抵扣背包碎片：<strong style={{ color: '#34d399' }}>{calculation.totalDeductedShards}</strong> 碎
                      </span>
                    </div>

                    {/* 关键数据 3 格横排 */}
                    <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                      <div className="bg-black/50 border rounded-xl p-2.5" style={{ borderColor: '#27272a' }}>
                        <div className="text-[11px]" style={{ color: '#a1a1aa' }}>已选卡牌原价</div>
                        <div className="text-sm font-mono font-bold mt-0.5" style={{ color: '#e4e4e7' }}>
                          {calculation.rawTotalShards} <span className="text-[10px]" style={{ color: '#a1a1aa' }}>碎</span>
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: '#71717a' }}>约需 {calculation.rawTotalBoxes} 箱</div>
                      </div>

                      <div className="bg-black/50 border rounded-xl p-2.5" style={{ borderColor: '#27272a' }}>
                        <div className="text-[11px]" style={{ color: '#a1a1aa' }}>扣除罪人碎片后</div>
                        <div className="text-sm font-mono font-bold mt-0.5" style={{ color: '#fcd34d' }}>
                          {calculation.boxesAfterShards} <span className="text-[10px]" style={{ color: '#a1a1aa' }}>箱</span>
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: 'rgba(251, 211, 77, 0.8)' }}>净缺口 {calculation.totalDeficitShards} 碎</div>
                      </div>

                      <div className="bg-black/50 border rounded-xl p-2.5" style={{ borderColor: '#27272a' }}>
                        <div className="text-[11px]" style={{ color: '#a1a1aa' }}>当前背包自选箱</div>
                        <div className="text-sm font-mono font-bold mt-0.5" style={{ color: '#e4e4e7' }}>
                          {ownedBoxes} <span className="text-[10px]" style={{ color: '#a1a1aa' }}>箱</span>
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: '#71717a' }}>1箱期望折合2碎</div>
                      </div>
                    </div>

                    {/* 最下方核心突出：总还需刷取箱子数 */}
                    <div className="bg-black/70 border rounded-xl p-3.5 flex items-center justify-between" style={{ borderColor: 'rgba(245, 158, 11, 0.5)' }}>
                      <div>
                        <div className="text-xs sm:text-sm font-bold" style={{ color: '#fde68a' }}>
                          再扣除现有库存 {ownedBoxes} 箱后：
                        </div>
                        {calculation.finalBoxesToFarm > 0 ? (
                          <div className="text-xs mt-1 font-mono" style={{ color: '#a1a1aa' }}>
                            需刷普牢约 <strong style={{ color: '#fcd34d' }}>{calculation.normalDungeonRuns}</strong> 把 
                            (折合 <strong style={{ color: '#fcd34d' }}>{calculation.modulesNeeded}</strong> 块脑啡肽模块)
                          </div>
                        ) : (
                          <div className="text-xs mt-1 font-medium" style={{ color: '#34d399' }}>
                            背包库存充足，兑换后还剩余 {calculation.remainingOwnedBoxes} 个自选箱！
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-mono" style={{ color: '#a1a1aa' }}>最终总需补刷箱子数</div>
                        <div className="font-mono text-2xl sm:text-3xl font-black" style={{ color: '#fb7185' }}>
                          {calculation.finalBoxesToFarm} <span className="text-xs font-bold" style={{ color: '#e4e4e7' }}>箱</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 底部小字水印 */}
                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-[10px] font-mono" style={{ borderTopColor: '#18181b', color: '#71717a' }}>
                    <span>瓦尔普吉斯之夜兑换计算器</span>
                    <span>祝各位经理抽卡十连双金！</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

      {/* BOX 选择弹窗 */}
      {selectingSinnerId && (
        <IdentitySelectionModal
          sinner={INITIAL_SINNERS.find(s => s.id === selectingSinnerId)!}
          ownedIds={ownedIdentityIds}
          onToggle={(item) => {
            const isOwned = isIdentityOwned(item, ownedIdentityIds);
            setOwnedIdentityIds(prev => {
              if (isOwned) {
                return prev.filter(x => x !== item.id && x !== item.oldId && x !== item.code);
              } else {
                return [...prev, item.id];
              }
            });
          }}
          onClose={() => setSelectingSinnerId(null)}
        />
      )}

      {/* BOX 导出预览弹窗 */}
      {showBoxExportModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setShowBoxExportModal(false)}
        >
          <div 
            className="relative w-full max-w-6xl bg-[#0c0d14] border-2 border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[94vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部工具栏 */}
            <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-[#12141f]">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base text-amber-200">
                  我的 BOX 分享图预览
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBoxFitScreen(!boxFitScreen)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  {boxFitScreen ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{boxFitScreen ? "100% 原始尺寸" : "自适应屏幕"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportBox}
                  disabled={isBoxExporting}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-black text-xs font-black flex items-center gap-1.5 shadow transition"
                >
                  {isBoxExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>下载高清分享图</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBoxExportModal(false)}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="px-5 py-2 bg-zinc-950 border-b border-zinc-800 text-[10px] text-amber-300/80 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              <span>点击“下载”保存</span>
            </div>

            {/* 预览区域 */}
            <div 
              ref={boxPreviewScrollRef}
              className="p-4 sm:p-8 overflow-auto flex-1 flex justify-center bg-[#07080c]"
            >
              <div
                style={{
                  width: boxFitScreen ? `${Math.round(960 * boxPreviewScale)}px` : '960px',
                  height: boxFitScreen && boxPosterHeight > 0 ? `${Math.round(boxPosterHeight * boxPreviewScale)}px` : 'auto',
                  position: 'relative',
                  overflow: boxFitScreen ? 'hidden' : 'visible',
                  flexShrink: 0
                }}
              >
                <div 
                  ref={boxPreviewPosterRef}
                  className="w-[960px] origin-top-left"
                  style={{ 
                    transform: boxFitScreen ? `scale(${boxPreviewScale})` : 'none',
                    transformOrigin: 'top left'
                  }}
                >
                  <BoxExportPoster ownedIds={ownedIdentityIds} isPreview={true} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 隐藏的导出容器 */}
      <BoxExportPoster ref={boxExportRef} ownedIds={ownedIdentityIds} />

      {/* 底部居中重置 BOX 按钮 (仅在 BOX 页面显示) */}
      {activeTab === 'box' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
          {resetToast && (
            <div className="bg-emerald-500 text-black px-4 py-1.5 rounded-full text-xs font-black shadow-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>已成功清空所有已勾选人格！</span>
            </div>
          )}

          <button 
            type="button"
            onClick={() => setShowResetConfirm(true)} 
            className="group px-6 py-2.5 rounded-full bg-zinc-950/95 hover:bg-rose-950/90 border border-zinc-700/80 hover:border-rose-500 text-zinc-300 hover:text-rose-100 text-xs font-black shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95 select-none"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-400 group-hover:-rotate-90 transition-transform duration-300" />
            <span>重置 BOX</span>
          </button>
        </div>
      )}

      {/* 自定义重置 BOX 确认弹窗（彻底杜绝 iframe 阻断 window.confirm 问题） */}
      {showResetConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowResetConfirm(false)}
        >
          <div 
            className="bg-[#151722] border-2 border-rose-500/50 rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-rose-100">清空图鉴已勾选记录？</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                这将清空您在 12 位罪人图鉴中勾选的所有已拥有人格记录。此操作无法撤销。
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={executeResetBox}
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs shadow-lg transition"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}