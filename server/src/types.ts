/** 与前端 src/utils/leaderboardApi.ts、src/utils/authApi.ts 对齐的响应结构 */

export interface BigNumData {
  m: number;
  e: number;
}

export type LeaderboardId = 'value' | 'wealth' | 'playTime' | 'rebirth' | 'clicks';

export interface Region {
  id: string;
  name: string;
  desc: string;
  online: number;
}

export interface PlayerProfile {
  userId: string;
  userName: string;
  critChance: number;
  critMultiplier: number;
  comboChance: number;
  comboMultiplier: number;
  rebirthCount: number;
  collapsePoints: number;
  playTimeMs: number;
  /** 连点榜：历世累计点击次数 */
  clickCount: number;
  highestValue: BigNumData;
  totalSpent: BigNumData;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  value: BigNumData;
  profile: PlayerProfile;
}

export interface LeaderboardResponse {
  board: LeaderboardId;
  updatedAt: number;
  selfRank: number | null;
  entries: LeaderboardEntry[];
}

export interface UserAccount {
  userId: string;
  userName: string;
  nickname: string;
  password: string;
  token: string;
  regionId: string | null;
  regionName: string | null;
}

export interface UserSyncPayload {
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
  /** 连点榜：历世累计点击次数 */
  clickCount: number;
  highestValue: BigNumData;
  totalSpent: BigNumData;
}
