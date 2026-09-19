import { BigNum } from './bigNumber';
import { BigNumData } from '../types';
import { DAY_MS, HOUR_MS, MINUTE_MS } from '../config';

/** 榜单类型：数值 / 富豪 / 时长 / 重生次数 */
export type LeaderboardId = 'value' | 'wealth' | 'playTime' | 'rebirth';

/** 榜单玩家档案（点击榜单条目后展示） */
export interface PlayerProfile {
  userId: string;
  userName: string;
  /** 暴击率 0~1 */
  critChance: number;
  /** 暴击倍数（倍数基数，1.0 = 100%） */
  critMultiplier: number;
  /** 连击率 0~1 */
  comboChance: number;
  /** 连击倍数（倍数基数，1.0 = 100%） */
  comboMultiplier: number;
  /** 累计重生次数 */
  rebirthCount: number;
  /** 坍缩重数 */
  collapsePoints: number;
  /** 累计游玩时长（ms） */
  playTimeMs: number;
  /** 最高数值 */
  highestValue: BigNumData;
  /** 万物店累计购置总额 */
  totalSpent: BigNumData;
}

/** 榜单条目：成绩统一以 BigNumData 承载（时长/次数亦然） */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  value: BigNumData;
  profile: PlayerProfile;
}

/** 榜单响应（后端返回结构） */
export interface LeaderboardResponse {
  board: LeaderboardId;
  /** 榜单更新时间戳（ms） */
  updatedAt: number;
  /** 本人名次；未上榜为 null */
  selfRank: number | null;
  entries: LeaderboardEntry[];
}

/** 上报成绩（后端对接用） */
export interface ScoreReport {
  userId: string;
  userName: string;
  highestValue: BigNumData;
  totalSpent: BigNumData;
  playTimeMs: number;
  rebirthCount: number;
}

/** 榜单最多展示条数 */
export const LEADERBOARD_LIMIT = 6;

/** 本机玩家在榜单中的标识（后端接入后改用真实 userId） */
export const SELF_USER_ID = 'self';

/** 后端接口基址 */
const API_BASE = '/api';

/* ------------------------------------------------------------------ *
 * 对接说明（后端就绪后按注释切换为真实请求，前端无需再改）
 *   GET  ${API_BASE}/leaderboard?board=value|wealth|playTime|rebirth&userId=self
 *        -> LeaderboardResponse
 *   POST ${API_BASE}/leaderboard/score   body: ScoreReport
 * ------------------------------------------------------------------ */

/** 榜单成绩取值 */
function scoreOf(board: LeaderboardId, p: PlayerProfile): BigNumData {
  if (board === 'value') return p.highestValue;
  if (board === 'wealth') return p.totalSpent;
  if (board === 'playTime') return BigNum.fromNumber(p.playTimeMs).toData();
  return BigNum.fromNumber(p.rebirthCount).toData();
}

/** 按成绩降序排名 */
function rankEntries(list: Omit<LeaderboardEntry, 'rank'>[]): LeaderboardEntry[] {
  return [...list]
    .sort((a, b) =>
      BigNum.fromData(b.value).gt(BigNum.fromData(a.value))
        ? 1
        : BigNum.fromData(a.value).gt(BigNum.fromData(b.value))
          ? -1
          : 0
    )
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

/** 临时假数据：后端未就绪时用于打通前端交互 */
const MOCK_PLAYERS: PlayerProfile[] = [
  {
    userId: 'u-1001',
    userName: '无极道尊',
    critChance: 0.85,
    critMultiplier: 12.5,
    comboChance: 0.7,
    comboMultiplier: 8.5,
    rebirthCount: 1286,
    collapsePoints: 96,
    playTimeMs: 26 * DAY_MS,
    highestValue: { m: 5.2, e: 21 },
    totalSpent: { m: 3.4, e: 19 },
  },
  {
    userId: 'u-1002',
    userName: '青玄子',
    critChance: 0.72,
    critMultiplier: 9.5,
    comboChance: 0.6,
    comboMultiplier: 6.5,
    rebirthCount: 842,
    collapsePoints: 61,
    playTimeMs: 18 * DAY_MS,
    highestValue: { m: 8.6, e: 19 },
    totalSpent: { m: 7.1, e: 17 },
  },
  {
    userId: 'u-1003',
    userName: '一剑霜寒',
    critChance: 0.66,
    critMultiplier: 8,
    comboChance: 0.55,
    comboMultiplier: 5.5,
    rebirthCount: 517,
    collapsePoints: 44,
    playTimeMs: 11 * DAY_MS,
    highestValue: { m: 3.3, e: 18 },
    totalSpent: { m: 2.2, e: 16 },
  },
  {
    userId: 'u-1004',
    userName: '太上忘情',
    critChance: 0.58,
    critMultiplier: 6.5,
    comboChance: 0.5,
    comboMultiplier: 4.5,
    rebirthCount: 306,
    collapsePoints: 30,
    playTimeMs: 6 * DAY_MS,
    highestValue: { m: 9.4, e: 16 },
    totalSpent: { m: 5.6, e: 14 },
  },
  {
    userId: 'u-1005',
    userName: '紫电青霜',
    critChance: 0.5,
    critMultiplier: 5,
    comboChance: 0.45,
    comboMultiplier: 4,
    rebirthCount: 184,
    collapsePoints: 21,
    playTimeMs: 3 * DAY_MS + 6 * HOUR_MS,
    highestValue: { m: 4.1, e: 15 },
    totalSpent: { m: 1.8, e: 13 },
  },
  {
    userId: 'u-1006',
    userName: '醉卧青山',
    critChance: 0.44,
    critMultiplier: 4,
    comboChance: 0.4,
    comboMultiplier: 3.5,
    rebirthCount: 96,
    collapsePoints: 14,
    playTimeMs: 30 * HOUR_MS,
    highestValue: { m: 6.7, e: 13 },
    totalSpent: { m: 8.2, e: 11 },
  },
  {
    userId: 'u-1007',
    userName: '白衣卿相',
    critChance: 0.38,
    critMultiplier: 3,
    comboChance: 0.35,
    comboMultiplier: 3,
    rebirthCount: 47,
    collapsePoints: 8,
    playTimeMs: 9 * HOUR_MS,
    highestValue: { m: 2.5, e: 12 },
    totalSpent: { m: 3.6, e: 10 },
  },
  {
    userId: 'u-1008',
    userName: '初入玄门',
    critChance: 0.3,
    critMultiplier: 2,
    comboChance: 0.25,
    comboMultiplier: 2.5,
    rebirthCount: 12,
    collapsePoints: 3,
    playTimeMs: 55 * MINUTE_MS,
    highestValue: { m: 7.8, e: 10 },
    totalSpent: { m: 1.2, e: 9 },
  },
];

/**
 * 拉取榜单
 * 后端就绪后：取消下方 fetch 注释并移除 mock 分支即可
 */
export async function fetchLeaderboard(
  board: LeaderboardId,
  self: Omit<LeaderboardEntry, 'rank'>
): Promise<LeaderboardResponse> {
  // 真实接口：GET /api/leaderboard?board=xxx&userId=xxx
  try {
    const res = await fetch(
      `${API_BASE}/leaderboard?board=${board}&userId=${encodeURIComponent(self.userId)}`,
      { cache: 'no-store' }
    );
    if (res.ok) return (await res.json()) as LeaderboardResponse;
  } catch {
    // 后端未启动 → 回落本地 mock
  }

  const merged = rankEntries([
    ...MOCK_PLAYERS.map((p) => ({
      userId: p.userId,
      userName: p.userName,
      value: scoreOf(board, p),
      profile: p,
    })),
    self,
  ]);

  return {
    board,
    updatedAt: Date.now(),
    selfRank: merged.find((e) => e.userId === self.userId)?.rank ?? null,
    // 后端返回完整榜单，前端仅取前 N 名展示
    entries: merged.slice(0, LEADERBOARD_LIMIT),
  };
}

/** 上报本人成绩：POST /api/leaderboard/score */
export async function submitScore(report: ScoreReport): Promise<void> {
  try {
    await fetch(`${API_BASE}/leaderboard/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
  } catch {
    // 后端未启动时忽略，避免影响本地玩法
  }
}
