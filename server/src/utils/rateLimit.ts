import type { NextFunction, Request, Response } from 'express';

/**
 * 轻量 IP 限流（固定窗口计数，零依赖）。
 *
 * - 每个 IP 一个计数器：窗口内超过上限即回 429，并带 `Retry-After`
 * - 定期清理过期条目（定时器 unref，不阻止进程退出）；表容量设上限，防被伪造来源刷爆内存
 * - `X-Forwarded-For` 只在「直连方是回环 / 内网地址」（同机 nginx、vite dev 代理）或显式
 *   `TRUST_PROXY=1` 时才采信：公网直连无法伪造 XFF 绕过限流
 * - 多个限流器各自独立计数：全局限流之外还能给账号、写接口单独加严
 */

interface Options {
  /** 窗口长度（ms） */
  windowMs: number;
  /** 窗口内允许的请求数上限 */
  max: number;
  /** 触发限流时的提示文案（返回给前端展示） */
  message?: string;
}

interface Counter {
  count: number;
  resetAt: number;
}

/** 内存表容量上限：超过则整体重置，避免被海量伪造来源刷爆内存 */
const MAX_KEYS = 50_000;

/** 强制信任 X-Forwarded-For（部署在可信反代后面时使用） */
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

/** 回环 / 内网地址（IPv4）与 IPv6 回环、唯一本地、链路本地 */
function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '::' || ip === 'localhost') return true;
  if (/^f[cd]/i.test(ip) || /^fe[89ab]/i.test(ip)) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return (
    a === 127 || // 回环
    a === 10 || // 10.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) || // 192.168.0.0/16
    (a === 169 && b === 254) // 169.254.0.0/16
  );
}

/** 归一化：IPv6 映射的 IPv4（::ffff:1.2.3.4）统一成 IPv4，避免同一客户端被算成两个来源 */
function normalizeIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

/** 取客户端 IP：直连地址，必要时（可信代理）取 XFF 最左侧 */
function clientIp(req: Request): string {
  const direct = normalizeIp(req.socket.remoteAddress ?? 'unknown');
  if (TRUST_PROXY || isPrivateIp(direct)) {
    const raw = req.headers['x-forwarded-for'];
    const first = (Array.isArray(raw) ? raw[0] : raw)?.split(',')[0]?.trim();
    if (first) return normalizeIp(first);
  }
  return direct;
}

export function createRateLimiter(options: Options) {
  const { windowMs, max, message = '访问过于频繁，请稍后再试' } = options;
  const hits = new Map<string, Counter>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    hits.forEach((counter, key) => {
      if (counter.resetAt <= now) hits.delete(key);
    });
  }, Math.max(30_000, windowMs));
  // 不因该定时器阻止进程退出
  cleanup.unref?.();

  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();
    const key = clientIp(req);

    if (hits.size > MAX_KEYS) hits.clear();

    const counter = hits.get(key);
    if (!counter || counter.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    counter.count += 1;
    if (counter.count <= max) return next();

    const retryAfterSec = Math.max(1, Math.ceil((counter.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', '0');
    res.setHeader('RateLimit-Reset', String(retryAfterSec));
    res.status(429).json({ error: message });
  };
}
