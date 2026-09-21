import { Router } from 'express';
import { db, SAVE_MAX_CHARS, upsertSave, userIdByToken } from '../db.js';
import type { SaveSyncPayload, UserSyncPayload } from '../types.js';
import {
  isBoard,
  patchFromPayload,
  queryLeaderboard,
  updateUserStats,
} from '../services/leaderboard.js';
import { broadcastBoards } from '../ws.js';
import { EnvelopeError, openEnvelope } from '../utils/seal.js';

export const leaderboardRouter: Router = Router();

/** 拉取榜单：GET /api/leaderboard?board=xxx&userId=xxx（公开只读，无需签名） */
leaderboardRouter.get('/', (req, res) => {
  const boardRaw = req.query.board;
  const board = isBoard(boardRaw) ? boardRaw : 'value';
  const userId = typeof req.query.userId === 'string' ? req.query.userId : null;

  res.json(queryLeaderboard(board, userId));
});

/** 上报成绩：POST /api/leaderboard/score（报文须加密签名，且 token 须有效） */
leaderboardRouter.post('/score', (req, res) => {
  let payload: unknown;
  try {
    payload = openEnvelope((req.body ?? {}).env);
  } catch (err) {
    return res.status(403).json({ error: err instanceof EnvelopeError ? err.message : '报文校验失败' });
  }

  const userId = userIdByToken(((req.body.env as { token?: string })?.token) ?? '');
  if (!userId) return res.status(401).json({ error: '令牌无效' });

  updateUserStats(patchFromPayload({ ...(payload as Partial<UserSyncPayload>), userId }));
  // 数据变更后推送给 WebSocket 订阅者
  broadcastBoards();

  res.json({ ok: true });
});

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
  broadcastBoards();

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
  res.json({ ok: true });
});
