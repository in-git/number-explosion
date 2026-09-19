import type { BigNumData } from '../types.js';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 服务器大区（与前端 mock/regions.json 保持一致） */
export const REGION_SEED = [
  { id: 'tianshu-1', name: '天枢·一区', desc: '初开之地 · 群雄并起', online: 1286 },
  { id: 'tianxuan-2', name: '天璇·二区', desc: '灵气渐盛 · 宗门林立', online: 974 },
  { id: 'tianji-3', name: '天玑·三区', desc: '新秀云集 · 后起之秀', online: 1523 },
  { id: 'tianquan-4', name: '天权·四区', desc: '群仙争霸 · 强者为尊', online: 2088 },
  { id: 'yuheng-5', name: '玉衡·五区', desc: '最新大区 · 百废待兴', online: 642 },
];

interface SeedUser {
  userId: string;
  userName: string;
  nickname: string;
  regionId: string;
  critChance: number;
  critMultiplier: number;
  comboChance: number;
  comboMultiplier: number;
  rebirthCount: number;
  collapsePoints: number;
  playTimeMs: number;
  highestValue: BigNumData;
  totalSpent: BigNumData;
}

/** 示例玩家：库为空时写入，保证榜单开箱有内容 */
export const USER_SEED: SeedUser[] = [
  {
    userId: 'u-1001',
    userName: 'wuji',
    nickname: '无极道尊',
    regionId: 'tianshu-1',
    critChance: 0.85,
    critMultiplier: 12.5,
    comboChance: 0.7,
    comboMultiplier: 8.5,
    rebirthCount: 1286,
    collapsePoints: 96,
    playTimeMs: 26 * DAY,
    highestValue: { m: 5.2, e: 21 },
    totalSpent: { m: 3.4, e: 19 },
  },
  {
    userId: 'u-1002',
    userName: 'qingxuan',
    nickname: '青玄子',
    regionId: 'tianxuan-2',
    critChance: 0.72,
    critMultiplier: 9.5,
    comboChance: 0.6,
    comboMultiplier: 6.5,
    rebirthCount: 842,
    collapsePoints: 61,
    playTimeMs: 18 * DAY,
    highestValue: { m: 8.6, e: 19 },
    totalSpent: { m: 7.1, e: 17 },
  },
  {
    userId: 'u-1003',
    userName: 'yijian',
    nickname: '一剑霜寒',
    regionId: 'tianji-3',
    critChance: 0.66,
    critMultiplier: 8,
    comboChance: 0.55,
    comboMultiplier: 5.5,
    rebirthCount: 517,
    collapsePoints: 44,
    playTimeMs: 11 * DAY,
    highestValue: { m: 3.3, e: 18 },
    totalSpent: { m: 2.2, e: 16 },
  },
  {
    userId: 'u-1004',
    userName: 'taishang',
    nickname: '太上忘情',
    regionId: 'tianquan-4',
    critChance: 0.58,
    critMultiplier: 6.5,
    comboChance: 0.5,
    comboMultiplier: 4.5,
    rebirthCount: 306,
    collapsePoints: 30,
    playTimeMs: 6 * DAY,
    highestValue: { m: 9.4, e: 16 },
    totalSpent: { m: 5.6, e: 14 },
  },
  {
    userId: 'u-1005',
    userName: 'zidian',
    nickname: '紫电青霜',
    regionId: 'yuheng-5',
    critChance: 0.5,
    critMultiplier: 5,
    comboChance: 0.45,
    comboMultiplier: 4,
    rebirthCount: 184,
    collapsePoints: 21,
    playTimeMs: 3 * DAY + 6 * HOUR,
    highestValue: { m: 4.1, e: 15 },
    totalSpent: { m: 1.8, e: 13 },
  },
  {
    userId: 'u-1006',
    userName: 'zuiwo',
    nickname: '醉卧青山',
    regionId: 'tianshu-1',
    critChance: 0.44,
    critMultiplier: 4,
    comboChance: 0.4,
    comboMultiplier: 3.5,
    rebirthCount: 96,
    collapsePoints: 14,
    playTimeMs: 30 * HOUR,
    highestValue: { m: 6.7, e: 13 },
    totalSpent: { m: 8.2, e: 11 },
  },
  {
    userId: 'u-1007',
    userName: 'baiyi',
    nickname: '白衣卿相',
    regionId: 'tianji-3',
    critChance: 0.38,
    critMultiplier: 3,
    comboChance: 0.35,
    comboMultiplier: 3,
    rebirthCount: 47,
    collapsePoints: 8,
    playTimeMs: 9 * HOUR,
    highestValue: { m: 2.5, e: 12 },
    totalSpent: { m: 3.6, e: 10 },
  },
  {
    userId: 'u-1008',
    userName: 'churu',
    nickname: '初入玄门',
    regionId: 'yuheng-5',
    critChance: 0.3,
    critMultiplier: 2,
    comboChance: 0.25,
    comboMultiplier: 2.5,
    rebirthCount: 12,
    collapsePoints: 3,
    playTimeMs: 55 * MINUTE,
    highestValue: { m: 7.8, e: 10 },
    totalSpent: { m: 1.2, e: 9 },
  },
];
