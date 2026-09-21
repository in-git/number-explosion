import { DEFAULT_NICKNAME } from '../config';
import type { BigNumData } from '../types';
import { sealEnvelope } from './crypto';

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
  /** 连点榜：历世累计点击次数 */
  clickCount: number;
  /** 数值排行：历世最高数值（随存档上报，服务端据此排序） */
  highestValue: BigNumData;
}

/** 后端接口基址（由 vite 代理转发到后端服务） */
const API_BASE = '/api';

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

/** 注册：POST /api/auth/register */
export async function register(
  userName: string,
  password: string,
  nickname: string
): Promise<UserAccount> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName, password, nickname }),
  });
  if (!res.ok) throw new Error(`注册失败: ${res.status}`);
  return (await res.json()) as UserAccount;
}

/** 登录：POST /api/auth/login */
export async function login(userName: string, password: string): Promise<UserAccount> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName, password }),
  });
  if (!res.ok) throw new Error(`登录失败: ${res.status}`);
  return (await res.json()) as UserAccount;
}

/** 拉取服务器大区：GET /api/regions */
export async function fetchRegions(): Promise<Region[]> {
  const res = await fetch(`${API_BASE}/regions`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`大区拉取失败: ${res.status}`);
  const data = (await res.json()) as { regions: Region[] };
  return data.regions ?? [];
}

/** 选择大区并上报用户信息：POST /api/user/region（报文加密签名，token 校验归属） */
export async function selectRegion(payload: UserSyncPayload, token: string): Promise<{ ok: boolean }> {
  const env = await sealEnvelope(payload, token);
  const res = await fetch(`${API_BASE}/user/region`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ env }),
  });
  if (!res.ok) throw new Error(`入驻失败: ${res.status}`);
  return (await res.json()) as { ok: boolean };
}

/** 昵称默认值（注册时兜底，与后端一致） */
export { DEFAULT_NICKNAME };
