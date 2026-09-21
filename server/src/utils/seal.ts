import { createHash, createCipheriv, createDecipheriv, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * 上报报文信封：AES-256-GCM 加密 + HMAC-SHA256 签名。
 * 密钥由服务端签发的 token 派生，故只有持有合法 token 的客户端才能构造出
 * 服务端可通过校验的报文 —— 直接调用 API 伪造成绩会被签名校验拒绝。
 *
 * 与前端 src/utils/crypto.ts 的 sealEnvelope 互操作：两端使用同一套派生规则与
 * base64url 编码，且 AES-GCM 的认证标签统一置于密文末尾。
 */

const IV_LEN = 12;
const TAG_LEN = 16;

export interface SealedEnvelope {
  /** 服务端签发的令牌（bearer 身份） */
  token: string;
  /** base64url(iv || ciphertext || authTag) */
  data: string;
  /** hex(HMAC-SHA256(hmacKey, data)) */
  sig: string;
}

/** 非法报文（签名不符 / 解密失败 / 字段缺失） */
export class EnvelopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvelopeError';
  }
}

/** 由 token 派生 AES 密钥（SHA-256 前 32 字节） */
function aesKeyOf(token: string): Buffer {
  return createHash('sha256').update(`datapoint::v1::${token}`).digest().subarray(0, 32);
}

/** 由 token 派生 HMAC 密钥（SHA-256 前 32 字节） */
function hmacKeyOf(token: string): Buffer {
  return createHash('sha256').update(`datapoint::sig::v1::${token}`).digest().subarray(0, 32);
}

/**
 * 校验签名并解密，返回原始 payload 对象。
 * 调用方仍需用 env.token 查到的玩家 id 覆盖授权（绝不信任报文内的 userId）。
 */
export function openEnvelope(env: unknown): unknown {
  const e = env as Partial<SealedEnvelope> | null | undefined;
  if (!e || typeof e.token !== 'string' || typeof e.data !== 'string' || typeof e.sig !== 'string') {
    throw new EnvelopeError('报文缺少必要字段');
  }

  const bundle = Buffer.from(e.data, 'base64url');
  if (bundle.length < IV_LEN + TAG_LEN) throw new EnvelopeError('报文长度非法');

  // 先校验签名（恒定时间比较），失败直接拒绝
  const expect = createHmac('sha256', hmacKeyOf(e.token)).update(e.data).digest();
  const got = Buffer.from(e.sig, 'hex');
  if (got.length !== expect.length || !timingSafeEqual(got, expect)) {
    throw new EnvelopeError('签名校验失败');
  }

  // 再解密：iv 在前 12 字节，authTag 在末尾 16 字节
  const iv = bundle.subarray(0, IV_LEN);
  const tag = bundle.subarray(bundle.length - TAG_LEN);
  const ct = bundle.subarray(IV_LEN, bundle.length - TAG_LEN);

  try {
    const decipher = createDecipheriv('aes-256-gcm', aesKeyOf(e.token), iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return JSON.parse(pt.toString('utf8'));
  } catch {
    throw new EnvelopeError('解密失败');
  }
}
