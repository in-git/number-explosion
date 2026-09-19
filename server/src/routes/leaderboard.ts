import { Router } from 'express';
import { db } from '../db.js';
import type { UserSyncPayload } from '../types.js';
import {
  isBoard,
  patchFromPayload,
  queryLeaderboard,
  updateUserStats,
} from '../services/leaderboard.js';
import { broadcastBoards } from '../ws.js';

export const leaderboardRouter: Router = Router();

/** 拉取榜单：GET /api/leaderboard?board=xxx&userId=xxx */
leaderboardRouter.get('/', (req, res) => {
  const boardRaw = req.query.board;
  const board = isBoard(boardRaw) ? boardRaw : 'value';
  const userId = typeof req.query.userId === 'string' ? req.query.userId : null;

  res.json(queryLeaderboard(board, userId));
});

/** 上报成绩：POST /api/leaderboard/score */
leaderboardRouter.post('/score', (req, res) => {
  const body = (req.body ?? {}) as Partial<UserSyncPayload> & { userId?: string };
  if (!body.userId) return res.status(400).json({ error: '缺少 userId' });

  const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(body.userId);
  if (!exists) return res.status(404).json({ error: '用户不存在' });

  updateUserStats(patchFromPayload(body));
  // 数据变更后推送给 WebSocket 订阅者
  broadcastBoards();

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

  updateUserStats(patchFromPayload(body));
  broadcastBoards();

  res.json({ ok: true });
});
