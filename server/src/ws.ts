import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { LeaderboardId, UserSyncPayload } from './types.js';
import { isBoard, patchFromPayload, queryLeaderboard, updateUserStats } from './services/leaderboard.js';
import { userIdByToken } from './db.js';
import { EnvelopeError, openEnvelope } from './utils/seal.js';

/**
 * WebSocket 服务：前端长连接订阅榜单，数据变更时由服务端推送，
 * 避免前端反复发起 HTTP 轮询造成网络阻塞。
 *
 * 协议（JSON）：
 *   客户端 → 服务端
 *     { type: 'subscribe', board, userId }   订阅榜单（返回一次快照，之后变更即推送）
 *     { type: 'unsubscribe' }                取消订阅
 *     { type: 'score', payload }             上报成绩（复用 UserSyncPayload）
 *   服务端 → 客户端
 *     { type: 'leaderboard', payload: LeaderboardResponse }
 *     { type: 'error', message }
 */

interface Subscription {
  board: LeaderboardId;
  userId: string | null;
}

const subscriptions = new Map<WebSocket, Subscription>();
let wss: WebSocketServer | null = null;

function send(ws: WebSocket, data: unknown): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

/** 向所有订阅者推送各自榜单的最新数据 */
export function broadcastBoards(): void {
  if (!wss) return;
  subscriptions.forEach((sub, ws) => {
    if (ws.readyState !== WebSocket.OPEN) {
      subscriptions.delete(ws);
      return;
    }
    send(ws, { type: 'leaderboard', payload: queryLeaderboard(sub.board, sub.userId) });
  });
}

/** 单连接消息节流：窗口内超过上限即判为异常并断开（防止狂刷订阅 / 上报把 SQL 查询打爆） */
const WS_WINDOW_MS = 10_000;
const WS_MAX_MESSAGES = 40;

/** 挂载 WebSocket（路径 /api/ws） */
export function attachWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', (ws) => {
    // 单连接消息计数（固定窗口）
    let windowStart = Date.now();
    let received = 0;

    ws.on('message', (raw) => {
      const now = Date.now();
      if (now - windowStart >= WS_WINDOW_MS) {
        windowStart = now;
        received = 0;
      }
      if (++received > WS_MAX_MESSAGES) {
        send(ws, { type: 'error', message: '消息过于频繁' });
        ws.close(1008, 'rate limit');
        return;
      }

      let msg: { type?: string; board?: unknown; userId?: unknown; payload?: unknown };
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return send(ws, { type: 'error', message: '无效的报文' });
      }

      if (msg.type === 'subscribe') {
        const board = isBoard(msg.board) ? msg.board : 'value';
        const userId = typeof msg.userId === 'string' ? msg.userId : null;
        subscriptions.set(ws, { board, userId });
        return send(ws, { type: 'leaderboard', payload: queryLeaderboard(board, userId) });
      }

      if (msg.type === 'unsubscribe') {
        subscriptions.delete(ws);
        return;
      }

      if (msg.type === 'score') {
        const env = (msg as { env?: unknown }).env;
        let payload: unknown;
        try {
          payload = openEnvelope(env);
        } catch (err) {
          return send(ws, {
            type: 'error',
            message: err instanceof EnvelopeError ? err.message : '报文校验失败',
          });
        }
        const token = (env as { token?: string } | null)?.token ?? '';
        const userId = userIdByToken(token);
        if (!userId) return send(ws, { type: 'error', message: '令牌无效' });
        updateUserStats(patchFromPayload({ ...(payload as Partial<UserSyncPayload>), userId }));
        broadcastBoards();
        return;
      }

      return send(ws, { type: 'error', message: `未知指令: ${String(msg.type)}` });
    });

    ws.on('close', () => subscriptions.delete(ws));
    ws.on('error', () => subscriptions.delete(ws));
  });
}
