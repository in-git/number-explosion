import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { db, seedRegions } from './db.js';
import { authRouter } from './routes/auth.js';
import { regionsRouter } from './routes/regions.js';
import { leaderboardRouter, userRouter } from './routes/leaderboard.js';
import { attachWebSocket } from './ws.js';

/** 后端端口（避开 3000/3001/8080 等常用端口） */
const PORT = Number(process.env.PORT ?? 8731);

seedRegions();

const app = express();
app.use(cors());
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

server.listen(PORT, () => {
  console.log(`[data-point] server listening on http://localhost:${PORT}`);
  console.log(`[data-point] websocket ready at ws://localhost:${PORT}/api/ws`);
});
