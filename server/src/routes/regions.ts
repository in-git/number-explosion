import { Router } from 'express';
import { db } from '../db.js';
import type { Region } from '../types.js';

export const regionsRouter: Router = Router();

/** 服务器大区列表：sort_order 升序，最后一个即最新大区 */
regionsRouter.get('/', (_req, res) => {
  const rows = db
    .prepare('SELECT id, name, description, online FROM regions ORDER BY sort_order ASC')
    .all() as { id: string; name: string; description: string; online: number }[];

  const regions: Region[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    desc: r.description,
    online: r.online,
  }));

  res.json({ regions });
});
