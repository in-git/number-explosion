import regionsMock from '../mock/regions.json';
import { DEFAULT_NICKNAME } from '../config';

/** 服务器大区 */
export interface Region {
  id: string;
  name: string;
  desc: string;
  online: number;
}

/** 登录后的账号信息 */
export interface UserAccount {
  userId: string;
  userName: string;
  /** 昵称：展示在排行榜上 */
  nickname: string;
  password: string;
  token: string;
  /** 已选大区（入驻后写入） */
  regionId: string | null;
  regionName: string | null;
}

/** 入驻大区时上报的用户信息 */
export interface UserSyncPayload {
  userId: string;
  userName: string;
  /** 昵称：展示在排行榜上 */
  nickname: string;
  regionId: string;
  critChance: number;
  critMultiplier: number;
  comboChance: number;
  comboMultiplier: number;
  rebirthCount: number;
  collapsePoints: number;
  playTimeMs: number;
  highestValue: { m: number; e: number };
  totalSpent: { m: number; e: number };
}

/** 后端接口基址 */
const API_BASE = '/api';

/* ------------------------------------------------------------------ *
 * 对接说明（后端就绪后取消注释即可切换为真实请求）
 *   POST ${API_BASE}/auth/register  body: { userName, password } -> UserAccount
 *   POST ${API_BASE}/auth/login     body: { userName, password } -> UserAccount
 *   GET  ${API_BASE}/regions                                     -> { regions: Region[] }
 *   POST ${API_BASE}/user/region    body: UserSyncPayload        -> { ok: true }
 * ------------------------------------------------------------------ */

/** 随机字符串：仅字母与数字，不含特殊符号 */
const ALPHANUM = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomStr(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)];
  }
  return out;
}

/** 自动生成的账号与密码（均为字母数字，无特殊符号） */
export function generateCredentials(): { userName: string; password: string } {
  return { userName: `道友${randomStr(6)}`, password: randomStr(10) };
}

/** 注册：后端就绪后走真实接口，当前本地生成账号 */
export async function register(
  userName: string,
  password: string,
  nickname: string
): Promise<UserAccount> {
  // 真实接口：POST /api/auth/register
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, password, nickname }),
    });
    if (res.ok) return (await res.json()) as UserAccount;
  } catch {
    // 后端未启动 → 回落本地生成
  }

  return {
    userId: `u-${randomStr(8)}`,
    userName,
    nickname,
    password,
    token: `tk-${randomStr(12)}`,
    regionId: null,
    regionName: null,
  };
}

/** 登录：后端就绪后走真实接口，当前本地生成令牌 */
export async function login(userName: string, password: string): Promise<UserAccount> {
  // 真实接口：POST /api/auth/login
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, password }),
    });
    if (res.ok) return (await res.json()) as UserAccount;
  } catch {
    // 后端未启动 → 回落本地生成
  }

  return {
    userId: `u-${randomStr(8)}`,
    userName,
    nickname: DEFAULT_NICKNAME,
    password,
    token: `tk-${randomStr(12)}`,
    regionId: null,
    regionName: null,
  };
}

/** 拉取服务器大区（当前读取本地 JSON mock） */
export async function fetchRegions(): Promise<Region[]> {
  // 真实接口：GET /api/regions
  try {
    const res = await fetch(`${API_BASE}/regions`, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { regions: Region[] };
      if (Array.isArray(data.regions) && data.regions.length > 0) return data.regions;
    }
  } catch {
    // 后端未启动 → 回落本地 JSON mock
  }

  return (regionsMock as { regions: Region[] }).regions;
}

/** 选择大区并上报用户信息 */
export async function selectRegion(payload: UserSyncPayload): Promise<{ ok: boolean }> {
  // 真实接口：POST /api/user/region
  const res = await fetch(`${API_BASE}/user/region`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`入驻失败: ${res.status}`);
  return (await res.json()) as { ok: boolean };
}
