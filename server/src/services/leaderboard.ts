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

/**
 * 登榜门槛（log10 刻度）：须达第一个修仙境界「炼气」——最高数值 ≥ 1 亿（10^8）。
 * 未达境界的玩家（含纯注册号）不出现在榜上，也不计名次。
 * highest_value_score = e + log10(m)，≥ 8 即表示最高数值 ≥ 10^8。
 */
const LEADERBOARD_MIN_SCORE = 8;

/** 榜单排序依据 */
const BOARDS: Record<
  LeaderboardId,
  { score: string; value: 'big' | 'num'; m?: string; e?: string; num?: string }
> = {
  value: { score: 'highest_value_score', value: 'big', m: 'highest_value_m', e: 'highest_value_e' },
  playTime: { score: 'play_time_ms', value: 'num', num: 'play_time_ms' },
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

  // 登榜由后端控制：须达「炼气」境（最高数值 ≥ 1 亿）才出现在榜上。
  // 注册只创建账号，未达境界的玩家一律不占榜位；达标后自动上榜。
  // 成绩独立在 user_stats 表，JOIN users 仅取昵称；不再 SELECT * 读取 password_hash / token
  const rows = db
    .prepare(
      `SELECT
         s.user_id                  AS id,
         u.nickname                 AS nickname,
         s.crit_chance,  s.crit_multiplier,
         s.combo_chance, s.combo_multiplier,
         s.rebirth_count, s.collapse_points,
         s.play_time_ms,  s.click_count,
         s.highest_value_m, s.highest_value_e,
         s.total_spent_m,  s.total_spent_e,
         s.game_cleared
       FROM user_stats s
       JOIN users u ON u.id = s.user_id
       WHERE s.highest_value_score >= ?
       ORDER BY s.${col.score} DESC, s.updated_at ASC
       LIMIT ?`
    )
    .all(LEADERBOARD_MIN_SCORE, LEADERBOARD_LIMIT) as unknown as UserRow[];

  const entries = rows.map((row, i) => toEntry(row, board, i + 1));

  let selfRank: number | null = null;
  if (userId) {
    const me = db
      .prepare(`SELECT highest_value_score AS score FROM user_stats WHERE user_id = ?`)
      .get(userId) as { score: number } | undefined;
    // 本人未达「炼气」境时不返回名次
    if (me && me.score >= LEADERBOARD_MIN_SCORE) {
      const better = db
        .prepare(
          `SELECT COUNT(*) AS c FROM user_stats WHERE highest_value_score >= ? AND ${col.score} > ?`
        )
        .get(LEADERBOARD_MIN_SCORE, me.score) as { c: number };
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

/** 可选数值：缺省时传 null，SQL 侧用 COALESCE 保留原值（如存档同步不覆盖入驻时上报的属性） */
function optionalNum(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * 写入/更新玩家成绩。
 * 账号字段（昵称 / 大区）留在 users 表；榜单刻度列独立写入 user_stats 表。
 * regionId 为 null 时不改动原大区；属性为缺省时保留原值。
 */
export function updateUserStats(patch: StatsPatch): void {
  const highest = readBigNumData(patch.highestValue);
  const spent = readBigNumData(patch.totalSpent);

  // 账号侧字段
  db.prepare(
    `UPDATE users SET
       nickname = COALESCE(?, nickname),
       region_id = COALESCE(?, region_id),
       updated_at = ?
     WHERE id = ?`
  ).run(
    typeof patch.nickname === 'string' && patch.nickname.trim() ? patch.nickname.trim() : null,
    typeof patch.regionId === 'string' ? patch.regionId : null,
    Date.now(),
    patch.userId
  );

  // 榜单成绩侧字段
  db.prepare(
    `UPDATE user_stats SET
       crit_chance = COALESCE(?, crit_chance),
       crit_multiplier = COALESCE(?, crit_multiplier),
       combo_chance = COALESCE(?, combo_chance),
       combo_multiplier = COALESCE(?, combo_multiplier),
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
     WHERE user_id = ?`
  ).run(
    optionalNum(patch.critChance),
    optionalNum(patch.critMultiplier),
    optionalNum(patch.comboChance),
    optionalNum(patch.comboMultiplier),
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

/**
 * 从云存档（GameState 快照 JSON）提取游玩成绩并更新榜单数据。
 * 由 POST /api/user/save 在每次存档入库时调用：成绩同步与云存档共用同一条
 * 30s 通道，前端不单独上报成绩；是否登榜由 queryLeaderboard 的
 * 条件（click_count > 0）决定，前端不做任何「登榜」操作。
 * - 昵称取存档账号信息，空值时不覆盖
 * - 暴击/连击属性取快照的 attrs（前端随存档附带计算结果）；缺省时保留原值
 */
export function syncStatsFromSave(userId: string, save: unknown): void {
  if (!save || typeof save !== 'object') return;
  const s = save as Record<string, unknown>;
  const account = s.account as Record<string, unknown> | null | undefined;
  const attrs = s.attrs as Record<string, unknown> | null | undefined;

  const attr = (key: string): number | undefined => {
    const v = attrs?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  };

  updateUserStats({
    userId,
    nickname: typeof account?.nickname === 'string' ? account.nickname : null,
    critChance: attr('critChance'),
    critMultiplier: attr('critMultiplier'),
    comboChance: attr('comboChance'),
    comboMultiplier: attr('comboMultiplier'),
    rebirthCount: Number(s.rebirthCount),
    collapsePoints: Number(s.collapsePoints),
    playTimeMs: Number(s.playTimeMs),
    clickCount: Number(s.totalClickCount),
    highestValue: s.highestValue,
    totalSpent: s.totalSpent,
    gameCleared: !!s.gameCleared,
  });
}
