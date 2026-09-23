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

  // 登榜由后端控制：仅「有过真实游玩成绩」（累计点击 > 0）的玩家出现在榜上。
  // 注册只创建账号，纯注册号（成绩全 0）不占榜位；一旦玩家真正游玩并上报成绩，自动上榜。
  const rows = db
    .prepare(
      `SELECT * FROM users
       WHERE click_count > 0
       ORDER BY ${col.score} DESC, updated_at ASC
       LIMIT ?`
    )
    .all(LEADERBOARD_LIMIT) as unknown as UserRow[];

  const entries = rows.map((row, i) => toEntry(row, board, i + 1));

  let selfRank: number | null = null;
  if (userId) {
    const me = db
      .prepare(`SELECT click_count, ${col.score} AS score FROM users WHERE id = ?`)
      .get(userId) as { click_count: number; score: number } | undefined;
    // 本人尚未登榜（无游玩成绩）时不返回名次
    if (me && me.click_count > 0) {
      const better = db
        .prepare(`SELECT COUNT(*) AS c FROM users WHERE click_count > 0 AND ${col.score} > ?`)
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

/** 可选数值：缺省时传 null，SQL 侧用 COALESCE 保留原值（如存档同步不覆盖入驻时上报的属性） */
function optionalNum(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 写入/更新玩家成绩（regionId 为 null 时不改动原大区；属性为缺省时保留原值） */
export function updateUserStats(patch: StatsPatch): void {
  const highest = readBigNumData(patch.highestValue);
  const spent = readBigNumData(patch.totalSpent);

  db.prepare(
    `UPDATE users SET
       nickname = COALESCE(?, nickname),
       region_id = COALESCE(?, region_id),
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
     WHERE id = ?`
  ).run(
    typeof patch.nickname === 'string' && patch.nickname.trim() ? patch.nickname.trim() : null,
    typeof patch.regionId === 'string' ? patch.regionId : null,
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
