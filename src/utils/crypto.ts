/**
 * 上报报文信封：AES-256-GCM 加密 + HMAC-SHA256 签名。
 * 密钥由服务端签发的 token 派生，故只有持有合法 token 的客户端才能构造出
 * 服务端可通过校验的报文 —— 直接调用 API 伪造成绩会被签名校验拒绝。
 *
 * 与后端 server/src/utils/seal.ts 的 openEnvelope 互操作：
 * 两端派生规则、base64url 编码一致，且 AES-GCM 的认证标签统一置于密文末尾。
 *
 * 注意：这里使用纯 JS 的 @noble 实现，而非原生 crypto.subtle。
 * 因为 crypto.subtle 仅在安全上下文（https / localhost）可用，
 * 通过局域网 IP 以 http 访问时 crypto.subtle 为 undefined，会导致
 * “Cannot read properties of undefined (reading 'digest')”。
 * noble 的输出格式与原生 WebCrypto、Node crypto 完全一致，可无缝互通。
 */
import { gcm } from '@noble/ciphers/aes.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';

export interface SealedEnvelope {
  /** 服务端签发的令牌（bearer 身份） */
  token: string;
  /** base64url(iv || ciphertext || authTag) */
  data: string;
  /** hex(HMAC-SHA256(hmacKey, data)) */
  sig: string;
}

const IV_LEN = 12;
const enc = new TextEncoder();

/** 由 token 派生 AES 密钥（SHA-256 前 32 字节 → AES-256） */
function aesKeyOf(token: string): Uint8Array {
  return sha256(enc.encode(`datapoint::v1::${token}`));
}

/** 由 token 派生 HMAC 密钥（SHA-256 前 32 字节） */
function hmacKeyOf(token: string): Uint8Array {
  return sha256(enc.encode(`datapoint::sig::v1::${token}`));
}

/** Byte → URL-safe base64（无填充） */
function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 构造加密信封：对 payload 做 AES-256-GCM 加密，并对密文做 HMAC-SHA256 签名。
 * 调用方需传入服务端签发的 token（来自 state.account.token）。
 */
export async function sealEnvelope(payload: unknown, token: string): Promise<SealedEnvelope> {
  const aesKey = aesKeyOf(token);
  const hmacKey = hmacKeyOf(token);

  // getRandomValues 在非安全上下文同样可用（仅 subtle 受限）
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const plaintext = enc.encode(JSON.stringify(payload));
  // gcm.encrypt 返回 ciphertext || authTag(16B)，与原生 WebCrypto 一致
  const ct = gcm(aesKey, iv).encrypt(plaintext);

  const bundle = new Uint8Array(IV_LEN + ct.length);
  bundle.set(iv, 0);
  bundle.set(ct, IV_LEN);

  const data = toBase64Url(bundle);
  const sigBuf = hmac(sha256, hmacKey, enc.encode(data));
  const sig = Array.from(sigBuf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { token, data, sig };
}
