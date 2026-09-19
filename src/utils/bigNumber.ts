import { BigNumData } from '../types';

/**
 * 中文大数单位表：一律单字，第 i 项对应 10^(4i)
 * - 传统位(万进): 万 亿 兆 京 垓 秭 穰 沟 涧 正 载 极
 * - 佛经位取首字: 恒(恒河沙) 阿(阿僧祇) 那(那由他) 议(不可思议) 无(无量) 大(大数)
 * - 大数(10^72) 为传统序列顶点；其后民间流传的扩展位为 全(全仕祥, 10^76)
 * - 末位为 古(古戈尔 googol, 10^100)：网络与科普口径中公认的最大计数单位
 * - 10^80 ~ 10^96 无标准名，按「宇 宙 洪 蒙 太」补足以保证每级 4 个数量级
 */
export const CHINESE_UNITS = [
  '',
  '万', // 10^4
  '亿', // 10^8
  '兆', // 10^12
  '京', // 10^16
  '垓', // 10^20
  '秭', // 10^24
  '穰', // 10^28
  '沟', // 10^32
  '涧', // 10^36
  '正', // 10^40
  '载', // 10^44
  '极', // 10^48
  '恒', // 10^52  恒河沙
  '阿', // 10^56  阿僧祇
  '那', // 10^60  那由他
  '议', // 10^64  不可思议
  '无', // 10^68  无量
  '大', // 10^72  大数（传统序列顶点）
  '全', // 10^76  全仕祥（民间扩展位）
  '宇', // 10^80
  '宙', // 10^84
  '洪', // 10^88
  '蒙', // 10^92
  '太', // 10^96
  '古', // 10^100 
];

/** 组合单位的最大段数：超过则退回科学计数法，避免串得过长 */
export const MAX_COMPOUND_UNITS = 6;

/** 可表示的量级上限，超过后钳制，避免出现 Infinity / NaN 之类的坏数值 */
export const MAX_EXP = 1e15;

export class BigNum {
  m: number; // mantissa: 0 or [1, 10)
  e: number; // exponent

  constructor(m: number = 0, e: number = 0) {
    this.m = m;
    this.e = e;
    this.normalize();
  }

  normalize(): this {
    if (!Number.isFinite(this.m) || Number.isNaN(this.m) || this.m <= 0) {
      this.m = 0;
      this.e = 0;
      return this;
    }

    if (!Number.isFinite(this.e) || Number.isNaN(this.e)) {
      this.m = 0;
      this.e = 0;
      return this;
    }

    // 量级溢出保护：过大钳制到极值，过小（已无法表示）视作 0
    if (this.e > MAX_EXP) {
      this.m = 1;
      this.e = MAX_EXP;
      return this;
    }
    if (this.e < -MAX_EXP) {
      this.m = 0;
      this.e = 0;
      return this;
    }

    // Convert m to scientific form
    const logVal = Math.log10(this.m);
    const expDiff = Math.floor(logVal);
    this.m = this.m / Math.pow(10, expDiff);
    this.e += expDiff;

    if (this.m < 1 && this.m > 0) {
      this.m *= 10;
      this.e -= 1;
    }

    return this;
  }

  static fromNumber(n: number): BigNum {
    if (n <= 0 || isNaN(n) || !isFinite(n)) return new BigNum(0, 0);
    return new BigNum(n, 0);
  }

  static fromData(d: BigNumData | null | undefined): BigNum {
    if (!d || d.m === 0) return new BigNum(0, 0);
    return new BigNum(d.m, d.e);
  }

  toData(): BigNumData {
    return { m: this.m, e: this.e };
  }

  toNumber(): number {
    if (this.m === 0) return 0;
    if (this.e > 308) return Number.MAX_VALUE;
    return this.m * Math.pow(10, this.e);
  }

  gte(other: BigNum | number): boolean {
    const o = typeof other === 'number' ? BigNum.fromNumber(other) : other;
    if (this.m === 0 && o.m === 0) return true;
    if (this.m === 0) return false;
    if (o.m === 0) return true;
    if (this.e > o.e) return true;
    if (this.e < o.e) return false;
    return this.m >= o.m - 1e-9;
  }

  gt(other: BigNum | number): boolean {
    const o = typeof other === 'number' ? BigNum.fromNumber(other) : other;
    if (this.m === 0 && o.m === 0) return false;
    if (this.m === 0) return false;
    if (o.m === 0) return true;
    if (this.e > o.e) return true;
    if (this.e < o.e) return false;
    return this.m > o.m + 1e-9;
  }

  lte(other: BigNum | number): boolean {
    return !this.gt(other);
  }

  lt(other: BigNum | number): boolean {
    return !this.gte(other);
  }

  add(other: BigNum | number): BigNum {
    const o = typeof other === 'number' ? BigNum.fromNumber(other) : other;
    if (this.m === 0) return new BigNum(o.m, o.e);
    if (o.m === 0) return new BigNum(this.m, this.e);

    const diff = this.e - o.e;
    if (diff >= 16) return new BigNum(this.m, this.e);
    if (diff <= -16) return new BigNum(o.m, o.e);

    if (diff >= 0) {
      const alignedM = o.m * Math.pow(10, -diff);
      return new BigNum(this.m + alignedM, this.e);
    } else {
      const alignedM = this.m * Math.pow(10, diff);
      return new BigNum(alignedM + o.m, o.e);
    }
  }

  sub(other: BigNum | number): BigNum {
    const o = typeof other === 'number' ? BigNum.fromNumber(other) : other;
    if (this.lte(o)) return new BigNum(0, 0);

    const diff = this.e - o.e;
    if (diff >= 16) return new BigNum(this.m, this.e);

    const alignedM = o.m * Math.pow(10, -diff);
    return new BigNum(this.m - alignedM, this.e);
  }

  mul(other: BigNum | number): BigNum {
    const o = typeof other === 'number' ? BigNum.fromNumber(other) : other;
    if (this.m === 0 || o.m === 0) return new BigNum(0, 0);
    return new BigNum(this.m * o.m, this.e + o.e);
  }

  mulScalar(scalar: number): BigNum {
    if (scalar <= 0 || this.m === 0) return new BigNum(0, 0);
    return new BigNum(this.m * scalar, this.e);
  }

  div(other: BigNum | number): BigNum {
    const o = typeof other === 'number' ? BigNum.fromNumber(other) : other;
    if (o.m === 0) return new BigNum(0, 0);
    if (this.m === 0) return new BigNum(0, 0);
    return new BigNum(this.m / o.m, this.e - o.e);
  }

  /**
   * Power operation: a^p
   * (m * 10^e)^p = 10^( (log10(m) + e) * p )
   */
  pow(power: number): BigNum {
    if (power === 0) return new BigNum(1, 0);
    if (this.m === 0) return new BigNum(0, 0);
    if (power === 1) return new BigNum(this.m, this.e);

    const totalLog = (Math.log10(this.m) + this.e) * power;

    // 指数爆炸/下溢保护：不再返回 Infinity 或制造无法表示的极小值
    if (Number.isNaN(totalLog)) return new BigNum(0, 0);
    if (totalLog > MAX_EXP) return new BigNum(1, MAX_EXP);
    if (totalLog < -MAX_EXP) return new BigNum(0, 0);

    const newE = Math.floor(totalLog);
    const newM = Math.pow(10, totalLog - newE);
    return new BigNum(newM, newE);
  }

  /**
   * Format to user specification:
   * 万以下常规显示 (e.g. 0.5, 9999.5)
   * 万及以上用单字中文单位: 万 亿 兆 ... 天，每级相差 4 个数量级
   * 超出单位表后以末位单位「天」为尾缀叠加组合: 万天、亿天、兆天 ... 天天、万天天 ...
   */
  formatChinese(decimals: number = 2): string {
    if (this.m === 0) return '0';

    // Below 10,000 (10^4)
    if (this.e < 4) {
      const val = this.m * Math.pow(10, this.e);
      if (val === 0 || !Number.isFinite(val)) return '0';
      if (Number.isInteger(val)) {
        return val.toLocaleString('zh-CN');
      }
      // 极小值用科学计数法，避免被四舍五入显示成 0.0
      if (val < 0.1) return val.toExponential(1);
      return val.toFixed(val < 10 ? 1 : decimals);
    }

    // 自高位向低位剥离单位：每剥离一级，后续只能使用不大于该级的单位
    const parts: string[] = [];
    let rest = this.e;
    let cap = CHINESE_UNITS.length - 1;

    while (rest >= 4 && cap >= 1 && parts.length < MAX_COMPOUND_UNITS) {
      const idx = Math.min(cap, Math.floor(rest / 4));
      if (idx < 1) break;
      parts.push(CHINESE_UNITS[idx]);
      rest -= idx * 4;
      cap = idx;
    }

    // 仍未剥离完：量级过巨，退回科学计数法
    if (rest >= 4 && cap >= 1) {
      return `${this.m.toFixed(decimals)} × 10^${this.e}`;
    }

    const mantissa = this.m * Math.pow(10, rest);
    return `${mantissa.toFixed(decimals)} ${parts.reverse().join('')}`;
  }
}
