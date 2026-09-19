/**
 * 服务器时间同步
 *
 * 离线收益一律以「服务端时间」为准，避免玩家改本地系统时间卡 BUG。
 * 取值优先级（逐级兜底）：
 *   1. 同源 /api/time（返回 { serverTime }，dev/preview 由 vite 中间件提供）
 *   2. 同源任意请求的 Date 响应头（任何静态服务器都会带，同源可读）
 *   3. 公共时间 API（worldtimeapi）
 *   4. 本地时间兜底（离线 / 接口全挂时退化为本地时钟）
 */

const FETCH_TIMEOUT_MS = 4000;

/** 服务器时间 - 本地时间 的偏移（ms） */
let offsetMs = 0;
let lastSyncAt = 0;

function timeoutSignal(): AbortSignal | undefined {
  return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(FETCH_TIMEOUT_MS)
    : undefined;
}

/** 1. 自建接口 */
async function fromApi(): Promise<number | null> {
  try {
    const res = await fetch('/api/time', { cache: 'no-store', signal: timeoutSignal() });
    if (!res.ok) return null;
    const data = (await res.json()) as { serverTime?: number; time?: number; timestamp?: number };
    const t = Number(data?.serverTime ?? data?.time ?? data?.timestamp);
    return Number.isFinite(t) && t > 0 ? t : null;
  } catch {
    return null;
  }
}

/** 2. 同源响应的 Date 头（含单程延迟补偿） */
async function fromDateHeader(): Promise<number | null> {
  try {
    const t0 = Date.now();
    const res = await fetch(`${window.location.origin}/index.html`, {
      method: 'GET',
      cache: 'no-store',
      signal: timeoutSignal(),
    });
    const t1 = Date.now();
    const dateHeader = res.headers.get('Date');
    if (!dateHeader) return null;
    const parsed = Date.parse(dateHeader);
    if (!Number.isFinite(parsed)) return null;
    return parsed + (t1 - t0) / 2;
  } catch {
    return null;
  }
}

/** 3. 公共时间 API */
async function fromWorldTimeApi(): Promise<number | null> {
  try {
    const res = await fetch('https://worldtimeapi.org/api/ip', {
      cache: 'no-store',
      signal: timeoutSignal(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { unixtime?: number };
    const t = Number(data?.unixtime) * 1000;
    return Number.isFinite(t) && t > 0 ? t : null;
  } catch {
    return null;
  }
}

/** 取一次服务器当前时间戳（ms）；全部失败时退化为本地时间 */
export async function fetchServerTime(): Promise<number> {
  for (const source of [fromApi, fromDateHeader, fromWorldTimeApi]) {
    const t = await source();
    if (t !== null) return t;
  }
  return Date.now();
}

/** 同步时钟偏移，返回同步后的「服务器当前时间」（ms） */
export async function syncServerTime(): Promise<number> {
  const t0 = Date.now();
  const server = await fetchServerTime();
  const t1 = Date.now();
  // 以请求中点对齐，抵消网络往返耗时
  offsetMs = server - (t0 + t1) / 2;
  lastSyncAt = t1;
  return getServerNow();
}

/** 用已同步的偏移推算服务器当前时间（ms） */
export function getServerNow(): number {
  return Date.now() + offsetMs;
}

export function getLastSyncAt(): number {
  return lastSyncAt;
}

/** 时长格式化：x天x小时 / x小时x分 / x分钟 */
export function formatDuration(ms: number): string {
  const safeMs = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalMin = Math.floor(safeMs / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;

  if (days > 0) return `${days}天${hours}小时`;
  if (hours > 0) return `${hours}小时${mins}分`;
  return `${mins}分钟`;
}
