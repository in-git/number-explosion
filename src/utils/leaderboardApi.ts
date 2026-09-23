import { BigNum } from './bigNumber';
import { BigNumData } from '../types';

/** 榜单类型：数值 / 时长 / 累计点击 */
export type LeaderboardId = 'value' | 'playTime' | 'clicks';

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
  /** 是否已通关（数值曾达 1ssr）：存档属性，榜上以「通关」标记展示 */
  gameCleared: boolean;
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

/** 榜单展示条数（后端返回已截断，前端保持一致展示说明） */
export const LEADERBOARD_LIMIT = 6;

/** 未登录时本人条目的临时标识 */
export const SELF_USER_ID = 'self';

/** 后端接口基址（由 vite 代理转发到后端服务） */
const API_BASE = '/api';

/**
 * 拉取榜单：GET /api/leaderboard?board=xxx&userId=xxx（公开只读）
 * 服务端据 userId 额外标出本人名次；不带 userId 也不影响读取榜单。
 */
export async function fetchLeaderboard(
  board: LeaderboardId,
  userId: string
): Promise<LeaderboardResponse> {
  const res = await fetch(
    `${API_BASE}/leaderboard?board=${board}&userId=${encodeURIComponent(userId)}`,
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`榜单拉取失败: ${res.status}`);
  return (await res.json()) as LeaderboardResponse;
}

/** BigNumData 读取（榜单成绩展示用） */
export function readValue(data: BigNumData): BigNum {
  return BigNum.fromData(data);
}
