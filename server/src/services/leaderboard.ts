import { db } from '../db.js';
import type {
  LeaderboardEntry,
  LeaderboardId,
  LeaderboardResponse,
  UserSyncPayload,
} from '../types.js';
import { readBigNumData, scoreOf, toBigNumData } from '../utils/bignum.js';

/** 榜单最多返回条数（与前端一致） */
const LEADERBOARD_LIMIT = 6;

/** 榜单排序依据 */
const BOARDS: Record<
  LeaderboardId,
  { score: string; value: 'big' | 'num'; m?: string; e?: string; num?: string }
> = {
  value: { score: 'highest_value_score', value: 'big', m: 'highest_value_m', e: 'highest_value_e' },
  playTime: { score: 'play_time_ms', value: 'num', num: 'play_time_ms' },
  rebirth: { score: 'rebirth_count', value: 'num', num: 'rebirth_count' },
  clicks: { score: 'click_count', value: 'num', num: 'click_count' },
};

export interface UserRow {
  id: string;
  user_name: string;
  nickname: string;
  region_id: string | null;
  crit_chance: number;
  crit_multiplier: number;
  combo_chance: number;
  combo_multiplier: number;
  rebirth_count: number;
  collapse_points: number;
  play_time_ms: number;
  click_count: number;
  highest_value_m: number;
  highest_value_e: number;
  total_spent_m: number;
  total_spent_e: number;
  game_cleared: number;
}

export function isBoard(v: unknown): v is LeaderboardId {
  return typeof v === 'string' && v in BOARDS;
}

function toEntry(row: UserRow, board: LeaderboardId, rank: number): LeaderboardEntry {
  const col = BOARDS[board];
  const value =
    col.value === 'num'
      ? toBigNumData(Number(row[col.num as keyof UserRow]))
      : { m: Number(row[col.m as keyof UserRow]), e: Number(row[col.e as keyof UserRow]) };

  return {
    rank,
    userId: row.id,
    userName: row.nickname,
    value,
    profile: {
      userId: row.id,
      userName: row.nickname,
      critChance: row.crit_chance,
      critMultiplier: row.crit_multiplier,
      comboChance: row.combo_chance,
      comboMultiplier: row.combo_multiplier,
      rebirthCount: row.rebirth_count,
      collapsePoints: row.collapse_points,
      playTimeMs: row.play_time_ms,
      clickCount: row.click_count,
      highestValue: { m: row.highest_value_m, e: row.highest_value_e },
      totalSpent: { m: row.total_spent_m, e: row.total_spent_e },
      gameCleared: !!row.game_cleared,
    },
  };
}

/** 查询榜单（含本人名次） */
export function queryLeaderboard(board: LeaderboardId, userId: string | null): LeaderboardResponse {
  const col = BOARDS[board];

  const rows = db
    .prepare(
      `SELECT * FROM users
       ORDER BY ${col.score} DESC, updated_at ASC
       LIMIT ?`
    )
    .all(LEADERBOARD_LIMIT) as unknown as UserRow[];

  const entries = rows.map((row, i) => toEntry(row, board, i + 1));

  let selfRank: number | null = null;
  if (userId) {
    const me = db.prepare(`SELECT ${col.score} AS score FROM users WHERE id = ?`).get(userId) as
      | { score: number }
      | undefined;
    if (me) {
      const better = db
        .prepare(`SELECT COUNT(*) AS c FROM users WHERE ${col.score} > ?`)
        .get(me.score) as { c: number };
      selfRank = Number(better.c) + 1;
    }
  }

  return { board, updatedAt: Date.now(), selfRank, entries };
}

export interface StatsPatch {
  userId: string;
  nickname?: string | null;
  regionId?: string | null;
  critChance?: number;
  critMultiplier?: number;
  comboChance?: number;
  comboMultiplier?: number;
  rebirthCount?: number;
  collapsePoints?: number;
  playTimeMs?: number;
  clickCount?: number;
  highestValue?: unknown;
  totalSpent?: unknown;
  gameCleared?: unknown;
}

/** 写入/更新玩家成绩（regionId 为 null 时不改动原大区） */
export function updateUserStats(patch: StatsPatch): void {
  const highest = readBigNumData(patch.highestValue);
  const spent = readBigNumData(patch.totalSpent);

  db.prepare(
    `UPDATE users SET
       nickname = COALESCE(?, nickname),
       region_id = COALESCE(?, region_id),
       crit_chance = ?,
       crit_multiplier = ?,
       combo_chance = ?,
       combo_multiplier = ?,
       rebirth_count = ?,
       collapse_points = ?,
       play_time_ms = ?,
       click_count = ?,
       highest_value_m = ?,
       highest_value_e = ?,
       highest_value_score = ?,
       total_spent_m = ?,
       total_spent_e = ?,
       total_spent_score = ?,
       game_cleared = MAX(game_cleared, ?),
       updated_at = ?
     WHERE id = ?`
  ).run(
    typeof patch.nickname === 'string' && patch.nickname.trim() ? patch.nickname.trim() : null,
    typeof patch.regionId === 'string' ? patch.regionId : null,
    Number(patch.critChance) || 0,
    Number(patch.critMultiplier) || 1,
    Number(patch.comboChance) || 0,
    Number(patch.comboMultiplier) || 1,
    Math.max(0, Math.floor(Number(patch.rebirthCount) || 0)),
    Math.max(0, Math.floor(Number(patch.collapsePoints) || 0)),
    Math.max(0, Math.floor(Number(patch.playTimeMs) || 0)),
    Math.max(0, Math.floor(Number(patch.clickCount) || 0)),
    highest.m,
    highest.e,
    scoreOf(highest.m, highest.e),
    spent.m,
    spent.e,
    scoreOf(spent.m, spent.e),
    patch.gameCleared ? 1 : 0,
    Date.now(),
    patch.userId
  );
}

/** 由上报报文构建 patch */
export function patchFromPayload(body: Partial<UserSyncPayload>): StatsPatch {
  return {
    userId: body.userId ?? '',
    nickname: body.nickname,
    regionId: body.regionId,
    critChance: body.critChance,
    critMultiplier: body.critMultiplier,
    comboChance: body.comboChance,
    comboMultiplier: body.comboMultiplier,
    rebirthCount: body.rebirthCount,
    collapsePoints: body.collapsePoints,
    playTimeMs: body.playTimeMs,
    clickCount: body.clickCount,
    highestValue: body.highestValue,
    totalSpent: body.totalSpent,
    gameCleared: body.gameCleared,
  };
}
