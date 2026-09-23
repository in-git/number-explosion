import { Router } from 'express';
import { db, deleteAccount, SAVE_MAX_CHARS, upsertSave, userIdByToken } from '../db.js';
import type { SaveSyncPayload, UserSyncPayload } from '../types.js';
import {
  isBoard,
  patchFromPayload,
  queryLeaderboard,
  syncStatsFromSave,
  updateUserStats,
} from '../services/leaderboard.js';
import { EnvelopeError, openEnvelope } from '../utils/seal.js';

export const leaderboardRouter: Router = Router();

/** 拉取榜单：GET /api/leaderboard?board=xxx&userId=xxx（公开只读，无需签名） */
leaderboardRouter.get('/', (req, res) => {
  const boardRaw = req.query.board;
  const board = isBoard(boardRaw) ? boardRaw : 'value';
  const userId = typeof req.query.userId === 'string' ? req.query.userId : null;

  res.json(queryLeaderboard(board, userId));
});

// 成绩上报已并入云存档通道：POST /api/user/save 每次入库时由服务端从存档
// 提取游玩成绩并更新榜单数据，不再提供独立的 /api/leaderboard/score。

export const userRouter: Router = Router();

/** 入驻大区：保存用户信息 + 大区归属（同样须加密签名） */
userRouter.post('/region', (req, res) => {
  let payload: unknown;
  try {
    payload = openEnvelope((req.body ?? {}).env);
  } catch (err) {
    return res.status(403).json({ error: err instanceof EnvelopeError ? err.message : '报文校验失败' });
  }

  const userId = userIdByToken(((req.body.env as { token?: string })?.token) ?? '');
  if (!userId) return res.status(401).json({ error: '令牌无效' });

  const body = payload as Partial<UserSyncPayload>;
  if (!body.regionId) {
    return res.status(400).json({ error: '缺少 regionId' });
  }
  const region = db.prepare('SELECT id FROM regions WHERE id = ?').get(body.regionId);
  if (!region) return res.status(400).json({ error: '大区不存在' });

  updateUserStats(patchFromPayload({ ...body, userId }));

  res.json({ ok: true });
});

/** 云端自动存档：POST /api/user/save（报文加密签名，token 校验归属，每人仅保留最新一份） */
userRouter.post('/save', (req, res) => {
  let payload: unknown;
  try {
    payload = openEnvelope((req.body ?? {}).env);
  } catch (err) {
    return res.status(403).json({ error: err instanceof EnvelopeError ? err.message : '报文校验失败' });
  }

  const userId = userIdByToken(((req.body.env as { token?: string })?.token) ?? '');
  if (!userId) return res.status(401).json({ error: '令牌无效' });

  const body = payload as Partial<SaveSyncPayload> | null | undefined;
  if (!body || typeof body !== 'object' || body.save === undefined) {
    return res.status(400).json({ error: '缺少存档数据' });
  }

  const data = JSON.stringify(body.save);
  if (data.length > SAVE_MAX_CHARS) {
    return res.status(413).json({ error: '存档过大' });
  }

  upsertSave(userId, data);
  // 成绩同步：每次存档入库时由服务端从存档提取游玩成绩并更新榜单数据。
  // 登榜与否由查询条件（click_count > 0）决定，前端不做任何「登榜」操作。
  syncStatsFromSave(userId, body.save);
  res.json({ ok: true });
});

/** 彻底注销账号：POST /api/user/delete（加密签名 + token 校验归属；删除账号 / 云存档，令牌随之失效） */
userRouter.post('/delete', (req, res) => {
  try {
    openEnvelope((req.body ?? {}).env);
  } catch (err) {
    return res.status(403).json({ error: err instanceof EnvelopeError ? err.message : '报文校验失败' });
  }

  const userId = userIdByToken(((req.body.env as { token?: string })?.token) ?? '');
  if (!userId) return res.status(401).json({ error: '令牌无效' });

  deleteAccount(userId);
  res.json({ ok: true });
});
