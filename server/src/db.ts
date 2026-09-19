import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { REGION_SEED } from './data/seed.js';

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
    click_count         INTEGER NOT NULL DEFAULT 0,
    highest_value_m     REAL    NOT NULL DEFAULT 0,
    highest_value_e     REAL    NOT NULL DEFAULT 0,
    highest_value_score REAL    NOT NULL DEFAULT 0,
    total_spent_m       REAL    NOT NULL DEFAULT 0,
    total_spent_e       REAL    NOT NULL DEFAULT 0,
    total_spent_score   REAL    NOT NULL DEFAULT 0,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL
  );

`);

// 旧库迁移：补齐后加的列（须在建索引之前）
const userColumns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
if (!userColumns.some((c) => c.name === 'click_count')) {
  db.exec('ALTER TABLE users ADD COLUMN click_count INTEGER NOT NULL DEFAULT 0');
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_highest ON users (highest_value_score DESC);
  CREATE INDEX IF NOT EXISTS idx_users_spent   ON users (total_spent_score DESC);
  CREATE INDEX IF NOT EXISTS idx_users_time    ON users (play_time_ms DESC);
  CREATE INDEX IF NOT EXISTS idx_users_rebirth ON users (rebirth_count DESC);
  CREATE INDEX IF NOT EXISTS idx_users_clicks  ON users (click_count DESC);
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
