import { Router } from 'express';
import { db } from '../db.js';
import type {
  LeaderboardEntry,
  LeaderboardId,
  LeaderboardResponse,
  UserSyncPayload,
} from '../types.js';
import { readBigNumData, scoreOf, toBigNumData } from '../utils/bignum.js';

/** 榜单最多返回条数（与前端 LEADERBOARD_LIMIT 一致） */
const LEADERBOARD_LIMIT = 6;

const BOARDS: Record<LeaderboardId, { score: string; value: 'big' | 'num'; m?: string; e?: string; num?: string }> = {
  value: { score: 'highest_value_score', value: 'big', m: 'highest_value_m', e: 'highest_value_e' },
  wealth: { score: 'total_spent_score', value: 'big', m: 'total_spent_m', e: 'total_spent_e' },
  playTime: { score: 'play_time_ms', value: 'num', num: 'play_time_ms' },
  rebirth: { score: 'rebirth_count', value: 'num', num: 'rebirth_count' },
};

interface UserRow {
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
  highest_value_m: number;
  highest_value_e: number;
  total_spent_m: number;
  total_spent_e: number;
}

function isBoard(v: unknown): v is LeaderboardId {
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
    // 榜单展示昵称
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
      highestValue: { m: row.highest_value_m, e: row.highest_value_e },
      totalSpent: { m: row.total_spent_m, e: row.total_spent_e },
    },
  };
}

/** 写入/更新玩家成绩（regionId 为 null 时不改动原大区） */
function updateStats(
  userId: string,
  nickname: string | null,
  regionId: string | null,
  body: Partial<UserSyncPayload>,
  highest: { m: number; e: number },
  spent: { m: number; e: number }
): void {
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
       highest_value_m = ?,
       highest_value_e = ?,
       highest_value_score = ?,
       total_spent_m = ?,
       total_spent_e = ?,
       total_spent_score = ?,
       updated_at = ?
     WHERE id = ?`
  ).run(
    nickname,
    regionId,
    Number(body.critChance) || 0,
    Number(body.critMultiplier) || 1,
    Number(body.comboChance) || 0,
    Number(body.comboMultiplier) || 1,
    Math.max(0, Math.floor(Number(body.rebirthCount) || 0)),
    Math.max(0, Math.floor(Number(body.collapsePoints) || 0)),
    Math.max(0, Math.floor(Number(body.playTimeMs) || 0)),
    highest.m,
    highest.e,
    scoreOf(highest.m, highest.e),
    spent.m,
    spent.e,
    scoreOf(spent.m, spent.e),
    Date.now(),
    userId
  );
}

export const leaderboardRouter: Router = Router();

/** 拉取榜单：?board=value|wealth|playTime|rebirth&userId=xxx */
leaderboardRouter.get('/', (req, res) => {
  const boardRaw = req.query.board;
  const board: LeaderboardId = isBoard(boardRaw) ? boardRaw : 'value';
  const userId = typeof req.query.userId === 'string' ? req.query.userId : null;

  const col = BOARDS[board];

  const rows = db
    .prepare(
      `SELECT * FROM users
       ORDER BY ${col.score} DESC, updated_at ASC
       LIMIT ?`
    )
    .all(LEADERBOARD_LIMIT) as UserRow[];

  const entries = rows.map((row, i) => toEntry(row, board, i + 1));

  // 本人名次：统计成绩更高的人数 + 1（未注册/无记录为 null）
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

  const payload: LeaderboardResponse = {
    board,
    updatedAt: Date.now(),
    selfRank,
    entries,
  };

  res.json(payload);
});

/** 上报成绩（前端在登录后 / 成绩变化时调用） */
leaderboardRouter.post('/score', (req, res) => {
  const body = (req.body ?? {}) as Partial<UserSyncPayload> & { userId?: string };
  if (!body.userId) return res.status(400).json({ error: '缺少 userId' });

  const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(body.userId);
  if (!exists) return res.status(404).json({ error: '用户不存在' });

  const highest = readBigNumData(body.highestValue);
  const spent = readBigNumData(body.totalSpent);

  updateStats(
    body.userId,
    typeof body.nickname === 'string' && body.nickname.trim() ? body.nickname.trim() : null,
    typeof body.regionId === 'string' ? body.regionId : null,
    body,
    highest,
    spent
  );

  res.json({ ok: true });
});

export const userRouter: Router = Router();

/** 入驻大区：保存用户信息 + 大区归属 */
userRouter.post('/region', (req, res) => {
  const body = (req.body ?? {}) as Partial<UserSyncPayload>;

  if (!body.userId || !body.regionId) {
    return res.status(400).json({ error: '缺少 userId 或 regionId' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(body.userId);
  if (!exists) return res.status(404).json({ error: '用户不存在' });

  const region = db.prepare('SELECT id FROM regions WHERE id = ?').get(body.regionId);
  if (!region) return res.status(400).json({ error: '大区不存在' });

  const highest = readBigNumData(body.highestValue);
  const spent = readBigNumData(body.totalSpent);

  updateStats(
    body.userId,
    typeof body.nickname === 'string' && body.nickname.trim() ? body.nickname.trim() : null,
    body.regionId,
    body,
    highest,
    spent
  );

  res.json({ ok: true });
});
