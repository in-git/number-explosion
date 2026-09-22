import fs from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { db, seedRegions } from './db.js';
import { authRouter } from './routes/auth.js';
import { regionsRouter } from './routes/regions.js';
import { leaderboardRouter, userRouter } from './routes/leaderboard.js';
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

/**
 * 服务端时间：离线收益以此结算，前端同源直连，无需反向代理。
 * 与 vite 开发期的本地中间件行为保持一致（禁缓存 + 同字段名）。
 */
app.get('/api/time', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ serverTime: Date.now() });
});

app.use('/api/auth', authRouter);
app.use('/api/regions', regionsRouter);
app.use('/api/user', userRouter);
app.use('/api/leaderboard', leaderboardRouter);

/** 未匹配的 /api 一律返回 JSON 404，避免被 SPA 回退吞成 HTML */
app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, error: 'not_found' });
});

/**
 * 前后端不分离：同一个 Express 进程同时托管前端构建产物与 /api。
 * server/src 与 server/dist 同级，故两种运行方式下相对路径解析一致；
 * 也可用 WEB_DIST 指定产物目录（如部署时前端单独打包）。
 */
const WEB_DIST = process.env.WEB_DIST ?? fileURLToPath(new URL('../../dist', import.meta.url));
const INDEX_HTML = path.join(WEB_DIST, 'index.html');

if (fs.existsSync(INDEX_HTML)) {
  // 静态资源长缓存，index.html 不缓存（否则发版后用户拿到旧页面）
  app.use(express.static(WEB_DIST, { index: false, maxAge: '7d', etag: true }));
  app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(INDEX_HTML);
  });
} else {
  console.warn(`[web] 未找到前端产物：${WEB_DIST}，请先执行 npm run build（仅提供 /api 接口）`);
}

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}${fs.existsSync(INDEX_HTML) ? ' （已托管前端产物）' : ''}`);
});
