import type { BigNumData } from '../types.js';

/**
 * 大数比较刻度：log10(m * 10^e) = e + log10(m)
 * 以 REAL 存储，便于 SQL 直接排序
 */
export function scoreOf(m: number, e: number): number {
  if (!Number.isFinite(m) || m <= 0) return 0;
  if (!Number.isFinite(e)) return 0;
  return e + Math.log10(m);
}

/** number → 尾数 + 指数（与前端 BigNum 同构） */
export function toBigNumData(n: number): BigNumData {
  if (!Number.isFinite(n) || n <= 0) return { m: 0, e: 0 };
  const e = Math.floor(Math.log10(n));
  const m = n / Math.pow(10, e);
  return { m, e };
}

/** 读取请求体中的大数（允许缺失 / 非法值） */
export function readBigNumData(raw: unknown): BigNumData {
  const src = raw as Partial<BigNumData> | undefined;
  const m = Number(src?.m);
  const e = Number(src?.e);
  if (!Number.isFinite(m) || m <= 0 || !Number.isFinite(e)) return { m: 0, e: 0 };
  return { m, e };
}
