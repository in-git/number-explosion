import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { REGION_SEED } from './data/seed.js';

/** 数据目录（可用 DB_DIR 覆盖） */
const DATA_DIR = process.env.DB_DIR ?? path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

/**
 * SQLite（Node 内置 node:sqlite，无需原生编译）
 *
 * 表结构拆分为两张：
 *  - users：账号与凭证（id / 账号名 / 昵称 / 密码哈希 / token / 大区 / 时间戳），
 *    不再存放任何游玩成绩，避免榜单查询误读 password_hash、token 等敏感字段。
 *  - user_stats：榜单所需的成绩刻度列，主键 user_id，独立建索引，供排行榜只读查询。
 *  - saves：云端存档（每人仅保留最新一份）。
 */
export const db = new DatabaseSync(path.join(DATA_DIR, 'leaderboard.db'));

db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS regions (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    online      INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    user_name   TEXT NOT NULL UNIQUE,
    nickname    TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    token       TEXT NOT NULL,
    region_id   TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_stats (
    user_id           TEXT PRIMARY KEY,
    crit_chance       REAL    NOT NULL DEFAULT 0,
    crit_multiplier   REAL    NOT NULL DEFAULT 1,
    combo_chance      REAL    NOT NULL DEFAULT 0,
    combo_multiplier  REAL    NOT NULL DEFAULT 1,
    rebirth_count     INTEGER NOT NULL DEFAULT 0,
    collapse_points   INTEGER NOT NULL DEFAULT 0,
    play_time_ms      INTEGER NOT NULL DEFAULT 0,
    click_count       INTEGER NOT NULL DEFAULT 0,
    highest_value_m   REAL    NOT NULL DEFAULT 0,
    highest_value_e   REAL    NOT NULL DEFAULT 0,
    highest_value_score REAL  NOT NULL DEFAULT 0,
    total_spent_m     REAL    NOT NULL DEFAULT 0,
    total_spent_e     REAL    NOT NULL DEFAULT 0,
    total_spent_score REAL    NOT NULL DEFAULT 0,
    game_cleared      INTEGER NOT NULL DEFAULT 0,
    updated_at        INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS saves (
    user_id    TEXT PRIMARY KEY,
    data       TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

/** 旧 users 表上的成绩列（含类型），用于一次性迁移到 user_stats */
const OLD_STATS_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ['crit_chance', 'REAL NOT NULL DEFAULT 0'],
  ['crit_multiplier', 'REAL NOT NULL DEFAULT 1'],
  ['combo_chance', 'REAL NOT NULL DEFAULT 0'],
  ['combo_multiplier', 'REAL NOT NULL DEFAULT 1'],
  ['rebirth_count', 'INTEGER NOT NULL DEFAULT 0'],
  ['collapse_points', 'INTEGER NOT NULL DEFAULT 0'],
  ['play_time_ms', 'INTEGER NOT NULL DEFAULT 0'],
  ['click_count', 'INTEGER NOT NULL DEFAULT 0'],
  ['highest_value_m', 'REAL NOT NULL DEFAULT 0'],
  ['highest_value_e', 'REAL NOT NULL DEFAULT 0'],
  ['highest_value_score', 'REAL NOT NULL DEFAULT 0'],
  ['total_spent_m', 'REAL NOT NULL DEFAULT 0'],
  ['total_spent_e', 'REAL NOT NULL DEFAULT 0'],
  ['total_spent_score', 'REAL NOT NULL DEFAULT 0'],
  ['game_cleared', 'INTEGER NOT NULL DEFAULT 0'],
];

/**
 * 一次性迁移：将旧 users 表内联的成绩列拆到 user_stats。
 * - 兼容更早版本缺失字段的情况（先补列再回填）
 * - 旧 users 表上的成绩索引先删除，再 DROP 列，避免依赖报错
 * - 幂等：已拆分的库（users 无 crit_chance）直接跳过
 */
function migrateSplitStats(): void {
  const cols = (db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes('crit_chance')) return; // 已拆分，无需迁移

  // 1) 补齐可能缺失的旧成绩列（兼容更早版本的库）
  for (const [name, def] of OLD_STATS_COLUMNS) {
    if (!cols.includes(name)) db.exec(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
  }

  // 2) 回填成绩到 user_stats（已存在的行靠主键 IGNORE 跳过）
  db.exec(`
    INSERT OR IGNORE INTO user_stats (
      user_id, crit_chance, crit_multiplier, combo_chance, combo_multiplier,
      rebirth_count, collapse_points, play_time_ms, click_count,
      highest_value_m, highest_value_e, highest_value_score,
      total_spent_m, total_spent_e, total_spent_score, game_cleared, updated_at
    )
    SELECT id, crit_chance, crit_multiplier, combo_chance, combo_multiplier,
      rebirth_count, collapse_points, play_time_ms, click_count,
      highest_value_m, highest_value_e, highest_value_score,
      total_spent_m, total_spent_e, total_spent_score, game_cleared, updated_at
    FROM users
  `);

  // 3) 删除旧 users 表上的成绩索引与列
  for (const idx of [
    'idx_users_highest',
    'idx_users_spent',
    'idx_users_time',
    'idx_users_rebirth',
    'idx_users_clicks',
  ]) {
    db.exec(`DROP INDEX IF EXISTS ${idx}`);
  }
  for (const [name] of OLD_STATS_COLUMNS) {
    db.exec(`ALTER TABLE users DROP COLUMN ${name}`);
  }
}
migrateSplitStats();

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_stats_highest ON user_stats (highest_value_score DESC);
  CREATE INDEX IF NOT EXISTS idx_stats_spent   ON user_stats (total_spent_score DESC);
  CREATE INDEX IF NOT EXISTS idx_stats_time    ON user_stats (play_time_ms DESC);
  CREATE INDEX IF NOT EXISTS idx_stats_rebirth ON user_stats (rebirth_count DESC);
  CREATE INDEX IF NOT EXISTS idx_stats_clicks  ON user_stats (click_count DESC);
`);

/** 仅预置大区；玩家数据一律来自前端上报，不做任何示例数据写入 */
export function seedRegions(): void {
  const count = db.prepare('SELECT COUNT(*) AS c FROM regions').get() as { c: number };
  if (count && count.c > 0) return;

  const insertRegion = db.prepare(
    'INSERT INTO regions (id, name, description, online, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  REGION_SEED.forEach((r, i) => insertRegion.run(r.id, r.name, r.desc, r.online, i));
}

/** 由令牌反查玩家 id：上报报文须携带服务端签发的 token，否则视为伪造 */
const findByToken = db.prepare('SELECT id FROM users WHERE token = ?');
export function userIdByToken(token: string): string | null {
  if (typeof token !== 'string' || token === '') return null;
  const row = findByToken.get(token) as { id: string } | undefined;
  return row?.id ?? null;
}

/** 云端存档单条上限（字符数）：超出即拒绝，防止恶意报文撑爆数据库 */
export const SAVE_MAX_CHARS = 200_000;

/** 写入 / 覆盖玩家的云端存档（每人仅保留最新一份） */
const upsertSaveStmt = db.prepare(`
  INSERT INTO saves (user_id, data, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
`);

/** 确保玩家在 user_stats 有一行（注册 / 登录时调用，已存在则跳过） */
const ensureUserStatsStmt = db.prepare(
  'INSERT OR IGNORE INTO user_stats (user_id, updated_at) VALUES (?, ?)'
);
export function ensureUserStats(userId: string): void {
  ensureUserStatsStmt.run(userId, Date.now());
}

const deleteSaveStmt = db.prepare('DELETE FROM saves WHERE user_id = ?');
const deleteUserStatsStmt = db.prepare('DELETE FROM user_stats WHERE user_id = ?');
const deleteUserStmt = db.prepare('DELETE FROM users WHERE id = ?');

/**
 * 彻底注销账号：删除玩家记录（token 存于 users 行上，随之失效）、成绩与云端存档。
 * 用于「重置游戏数据」——云端侧的所有数据（账号 / 成绩 / 存档）一次清空。
 */
export function deleteAccount(userId: string): void {
  db.exec('BEGIN');
  try {
    deleteSaveStmt.run(userId);
    deleteUserStatsStmt.run(userId);
    deleteUserStmt.run(userId);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
export function upsertSave(userId: string, data: string): void {
  upsertSaveStmt.run(userId, data, Date.now());
}
