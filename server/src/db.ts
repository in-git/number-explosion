import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { REGION_SEED, USER_SEED } from './data/seed.js';
import { scoreOf } from './utils/bignum.js';

/** 数据目录（可用 DB_DIR 覆盖） */
const DATA_DIR = process.env.DB_DIR ?? path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

/**
 * SQLite（Node 内置 node:sqlite，无需原生编译）
 * 表结构：大区 regions / 玩家 users（含榜单所需的成绩刻度列）
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
    id                  TEXT PRIMARY KEY,
    user_name           TEXT NOT NULL UNIQUE,
    nickname            TEXT NOT NULL,
    password_hash       TEXT NOT NULL,
    token               TEXT NOT NULL,
    region_id           TEXT,
    crit_chance         REAL    NOT NULL DEFAULT 0,
    crit_multiplier     REAL    NOT NULL DEFAULT 1,
    combo_chance        REAL    NOT NULL DEFAULT 0,
    combo_multiplier    REAL    NOT NULL DEFAULT 1,
    rebirth_count       INTEGER NOT NULL DEFAULT 0,
    collapse_points     INTEGER NOT NULL DEFAULT 0,
    play_time_ms        INTEGER NOT NULL DEFAULT 0,
    highest_value_m     REAL    NOT NULL DEFAULT 0,
    highest_value_e     REAL    NOT NULL DEFAULT 0,
    highest_value_score REAL    NOT NULL DEFAULT 0,
    total_spent_m       REAL    NOT NULL DEFAULT 0,
    total_spent_e       REAL    NOT NULL DEFAULT 0,
    total_spent_score   REAL    NOT NULL DEFAULT 0,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_highest ON users (highest_value_score DESC);
  CREATE INDEX IF NOT EXISTS idx_users_spent   ON users (total_spent_score DESC);
  CREATE INDEX IF NOT EXISTS idx_users_time    ON users (play_time_ms DESC);
  CREATE INDEX IF NOT EXISTS idx_users_rebirth ON users (rebirth_count DESC);
`);

/** 种子：大区与示例玩家（仅在对应表为空时写入） */
export function seedIfEmpty(): void {
  const regionCount = db.prepare('SELECT COUNT(*) AS c FROM regions').get() as { c: number };
  if (!regionCount || regionCount.c === 0) {
    const insertRegion = db.prepare(
      'INSERT INTO regions (id, name, description, online, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    REGION_SEED.forEach((r, i) => insertRegion.run(r.id, r.name, r.desc, r.online, i));
  }

  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
  if (!userCount || userCount.c === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, user_name, nickname, password_hash, token, region_id,
        crit_chance, crit_multiplier, combo_chance, combo_multiplier,
        rebirth_count, collapse_points, play_time_ms,
        highest_value_m, highest_value_e, highest_value_score,
        total_spent_m, total_spent_e, total_spent_score,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    USER_SEED.forEach((u) => {
      insertUser.run(
        u.userId,
        u.userName,
        u.nickname,
        'seed',
        `tk-${u.userId}`,
        u.regionId,
        u.critChance,
        u.critMultiplier,
        u.comboChance,
        u.comboMultiplier,
        u.rebirthCount,
        u.collapsePoints,
        u.playTimeMs,
        u.highestValue.m,
        u.highestValue.e,
        scoreOf(u.highestValue.m, u.highestValue.e),
        u.totalSpent.m,
        u.totalSpent.e,
        scoreOf(u.totalSpent.m, u.totalSpent.e),
        now,
        now
      );
    });
  }
}
