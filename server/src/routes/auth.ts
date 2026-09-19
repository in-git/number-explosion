import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { db } from '../db.js';
import type { UserAccount } from '../types.js';

const DEFAULT_NICKNAME = '数爆玩家';

/** 榜单最多返回条数（与前端 LEADERBOARD_LIMIT 一致） */
export const LEADERBOARD_LIMIT = 6;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const calc = scryptSync(password, salt, 32).toString('hex');
  return calc.length === hash.length && timingSafeEqual(Buffer.from(calc), Buffer.from(hash));
}

interface UserRow {
  id: string;
  user_name: string;
  nickname: string;
  password_hash: string;
  token: string;
  region_id: string | null;
}

const findByName = db.prepare('SELECT * FROM users WHERE user_name = ?');
const findById = db.prepare('SELECT * FROM users WHERE id = ?');
const insertUser = db.prepare(`
  INSERT INTO users (id, user_name, nickname, password_hash, token, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const updateToken = db.prepare('UPDATE users SET token = ?, updated_at = ? WHERE id = ?');

function toAccount(row: UserRow, regionName: string | null): Omit<UserAccount, 'password'> & {
  password: string;
} {
  return {
    userId: row.id,
    userName: row.user_name,
    nickname: row.nickname,
    password: '',
    token: row.token,
    regionId: row.region_id,
    regionName,
  };
}

function regionNameOf(id: string | null): string | null {
  if (!id) return null;
  const row = db.prepare('SELECT name FROM regions WHERE id = ?').get(id) as
    | { name: string }
    | undefined;
  return row?.name ?? null;
}

export const authRouter: Router = Router();

/** 注册：账号密码由前端自动生成，昵称必填 */
authRouter.post('/register', (req, res) => {
  const { userName, password, nickname } = (req.body ?? {}) as Record<string, unknown>;

  if (typeof userName !== 'string' || userName.trim() === '') {
    return res.status(400).json({ error: '账号不可为空' });
  }
  if (typeof password !== 'string' || password === '') {
    return res.status(400).json({ error: '密码不可为空' });
  }

  const finalNickname =
    typeof nickname === 'string' && nickname.trim() !== '' ? nickname.trim() : DEFAULT_NICKNAME;

  if (findByName.get(userName)) {
    return res.status(409).json({ error: '账号已存在' });
  }

  const id = `u-${randomBytes(4).toString('hex')}`;
  const token = `tk-${randomBytes(12).toString('hex')}`;
  const now = Date.now();

  insertUser.run(id, userName, finalNickname, hashPassword(password), token, now, now);

  const row = findById.get(id) as UserRow;
  return res.json({ ...toAccount(row, regionNameOf(row.region_id)), password });
});

/** 登录：账号不存在时按注册处理（前端为自动赐号流程） */
authRouter.post('/login', (req, res) => {
  const { userName, password } = (req.body ?? {}) as Record<string, unknown>;

  if (typeof userName !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: '账号或密码缺失' });
  }

  const existing = findByName.get(userName) as UserRow | undefined;

  if (existing) {
    if (!verifyPassword(password, existing.password_hash)) {
      return res.status(401).json({ error: '密码错误' });
    }
    const token = `tk-${randomBytes(12).toString('hex')}`;
    updateToken.run(token, Date.now(), existing.id);
    const row = findById.get(existing.id) as UserRow;
    return res.json({ ...toAccount(row, regionNameOf(row.region_id)), password });
  }

  const id = `u-${randomBytes(4).toString('hex')}`;
  const token = `tk-${randomBytes(12).toString('hex')}`;
  const now = Date.now();

  insertUser.run(id, userName, DEFAULT_NICKNAME, hashPassword(password), token, now, now);

  const row = findById.get(id) as UserRow;
  return res.json({ ...toAccount(row, regionNameOf(row.region_id)), password });
});
