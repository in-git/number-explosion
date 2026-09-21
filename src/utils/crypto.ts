/**
 * 上报报文信封：AES-256-GCM 加密 + HMAC-SHA256 签名。
 * 密钥由服务端签发的 token 派生，故只有持有合法 token 的客户端才能构造出
 * 服务端可通过校验的报文 —— 直接调用 API 伪造成绩会被签名校验拒绝。
 *
 * 与后端 server/src/utils/seal.ts 的 openEnvelope 互操作：
 * 两端派生规则、base64url 编码一致，且 AES-GCM 的认证标签统一置于密文末尾。
 */

export interface SealedEnvelope {
  /** 服务端签发的令牌（bearer 身份） */
  token: string;
  /** base64url(iv || ciphertext || authTag) */
  data: string;
  /** hex(HMAC-SHA256(hmacKey, data)) */
  sig: string;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

/** SHA-256（返回原始字节，供 importKey 使用） */
function sha256(input: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', enc.encode(input));
}

/** 由 token 派生 AES 密钥（SHA-256 前 32 字节 → AES-256） */
async function aesKeyOf(token: string): Promise<CryptoKey> {
  const raw = await sha256(`datapoint::v1::${token}`);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** 由 token 派生 HMAC 密钥（SHA-256 前 32 字节） */
async function hmacKeyOf(token: string): Promise<CryptoKey> {
  const raw = await sha256(`datapoint::sig::v1::${token}`);
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

/** ArrayBuffer/Uint8Array → URL-safe base64（无填充） */
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
  const aesKey = await aesKeyOf(token);
  const hmacKey = await hmacKeyOf(token);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = enc.encode(JSON.stringify(payload));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintext));

  // ct 末尾已含 16 字节 GCM 认证标签
  const bundle = new Uint8Array(12 + ct.length);
  bundle.set(iv, 0);
  bundle.set(ct, 12);

  const data = toBase64Url(bundle);
  const sigBuf = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, enc.encode(data)));
  const sig = Array.from(sigBuf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { token, data, sig };
}
