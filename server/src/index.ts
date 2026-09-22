import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { db, seedRegions } from './db.js';
import { authRouter } from './routes/auth.js';
import { regionsRouter } from './routes/regions.js';
import { leaderboardRouter, userRouter } from './routes/leaderboard.js';
import { attachWebSocket } from './ws.js';
import { createRateLimiter } from './utils/rateLimit.js';

/** 后端端口（避开 3000/3001/8080 等常用端口） */
const PORT = Number(process.env.PORT ?? 8731);

/** 全局限流：所有 /api 接口 */
const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  message: '访问过于频繁，请稍后再试',
});
/** 账号接口限流：防撞库 / 刷号 */
const authLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  message: '尝试过于频繁，请稍后再试',
});
/** 写接口限流：护住数据库写入（上报成绩 / 入驻大区 / 上传存档） */
const writeLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  message: '上报过于频繁，请稍后再试',
});

seedRegions();

const app = express();
app.use(cors());

// 限流放在 body 解析之前：高频请求尽早被拒，不浪费解析开销
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/leaderboard/score', writeLimiter);
app.use('/api/user', writeLimiter);

app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
  res.json({ ok: true, users: count.c });
});

app.use('/api/auth', authRouter);
app.use('/api/regions', regionsRouter);
app.use('/api/user', userRouter);
app.use('/api/leaderboard', leaderboardRouter);

const server = createServer(app);
// WebSocket 与 HTTP 共用端口：ws://host:8731/api/ws
attachWebSocket(server);

server.listen(PORT, () => {});
