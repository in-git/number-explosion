import React, { useState } from 'react';
import {
  Box,
  Circle,
  CircleDashed,
  Hand,
  Scissors,
  Target,
} from 'lucide-react';
import { BigNum } from '../utils/bigNumber';

export type SettleType = 'gain' | 'loss';

interface FunShopProps {
  currentValue: BigNum;
  /** type='gain' 表示净赚 amount；type='loss' 表示没收 amount */
  onSettle: (type: SettleType, amount: BigNum) => void;
}

// 石头0 / 剪刀1 / 布2：石头胜剪刀，剪刀胜布，布胜石头
const RPS = ['石头', '剪刀', '布'];
const COIN = ['正面', '反面'];
const NUMBER_POOL = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type TabId = 'rps' | 'coin' | 'numbers';
const TABS: { id: TabId; label: string; renderIcon: () => React.ReactNode }[] = [
  { id: 'rps', label: '石头剪子布', renderIcon: () => <Hand size={13} /> },
  { id: 'coin', label: '猜硬币', renderIcon: () => <Circle size={13} /> },
  { id: 'numbers', label: '猜号码', renderIcon: () => <Target size={13} /> },
];

/** 石头 / 剪刀 / 布 的图标 */
function RpsIcon({ index }: { index: number }) {
  if (index === 0) return <Box size={18} />;
  if (index === 1) return <Scissors size={18} />;
  return <Hand size={18} />;
}

/** 硬币 正面 / 反面 的图标 */
function CoinIcon({ index }: { index: number }) {
  return index === 0 ? <Circle size={18} /> : <CircleDashed size={18} />;
}

interface GameResult {
  title: string;
  detail: string;
  /** true 胜 / false 负 / null 平局 */
  win: boolean | null;
}

export const FunShop: React.FC<FunShopProps> = ({ currentValue, onSettle }) => {
  const [tab, setTab] = useState<TabId>('rps');
  const [percent, setPercent] = useState(10);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);

  const safePercent = Math.min(100, Math.max(1, Number(percent) || 1));
  const stake = currentValue.mulScalar(safePercent / 100);
  const canPlay = stake.gt(0);

  const settle = (type: SettleType, amount: BigNum, res: GameResult) => {
    onSettle(type, amount);
    setResult(res);
  };

  // 石头剪子布：猜中（胜）押注 ×1.5；未中（负）全部没收；平局退回
  const playRps = (player: number) => {
    if (!canPlay) return;
    const cpu = Math.floor(Math.random() * 3);
    if ((player + 1) % 3 === cpu) {
      settle('gain', stake.mulScalar(0.5), {
        title: '石头剪子布',
        detail: `你出 ${RPS[player]} · 电脑出 ${RPS[cpu]} · 胜！押注 ×1.5`,
        win: true,
      });
    } else if ((cpu + 1) % 3 === player) {
      settle('loss', stake, {
        title: '石头剪子布',
        detail: `你出 ${RPS[player]} · 电脑出 ${RPS[cpu]} · 负，押注尽数没收`,
        win: false,
      });
    } else {
      setResult({
        title: '石头剪子布',
        detail: `双方皆出 ${RPS[player]} · 平局，本金原样退回`,
        win: null,
      });
    }
  };

  // 猜硬币：猜中押注 ×2；未中全部没收
  const playCoin = (side: number) => {
    if (!canPlay) return;
    const flip = Math.floor(Math.random() * 2);
    if (flip === side) {
      settle('gain', stake.mulScalar(1), {
        title: '猜硬币',
        detail: `你猜 ${COIN[side]} · 开出 ${COIN[flip]} · 猜中！押注 ×2`,
        win: true,
      });
    } else {
      settle('loss', stake, {
        title: '猜硬币',
        detail: `你猜 ${COIN[side]} · 开出 ${COIN[flip]} · 未中，押注尽数没收`,
        win: false,
      });
    }
  };

  const toggleNumber = (n: number) => {
    setPicked((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : prev.length >= 3 ? prev : [...prev, n]
    );
  };

  const drawNumbers = (): number[] => {
    const pool = [...NUMBER_POOL];
    const draw: number[] = [];
    for (let i = 0; i < 3; i++) {
      draw.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return draw;
  };

  // 猜号码：全中 ×30（净 +29 倍）；中两个 ×2（净 +1 倍）；其余无奖励、没收押注
  const playNumbers = () => {
    if (!canPlay || picked.length !== 3) return;
    const draw = drawNumbers();
    const hits = picked.filter((n) => draw.includes(n)).length;

    if (hits === 3) {
      settle('gain', stake.mulScalar(29), {
        title: '猜号码',
        detail: `开奖 ${draw.join(' · ')} · 全中！押注 ×30`,
        win: true,
      });
    } else if (hits === 2) {
      settle('gain', stake.mulScalar(1), {
        title: '猜号码',
        detail: `开奖 ${draw.join(' · ')} · 中 2 个！押注 ×2`,
        win: true,
      });
    } else {
      settle('loss', stake, {
        title: '猜号码',
        detail: `开奖 ${draw.join(' · ')} · 仅中 ${hits} 个，无奖励`,
        win: false,
      });
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* 押注设置：对所有玩法生效 */}
      <div className="bg-[#211e1a] border border-[#3d372e] rounded-lg p-2.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-serif text-[#a69c8d]">
            押注金额（三种玩法通用）
          </span>
          <span className="text-[11px] font-mono font-bold text-[#e8b56f]">
            {stake.formatChinese(2)}（{safePercent}%）
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {[10, 25, 50, 100].map((p) => (
            <button
              key={p}
              onClick={() => setPercent(p)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                safePercent === p
                  ? 'bg-[#3b3327] border-[#6b5e4c] text-[#f2ede4]'
                  : 'bg-[#1a1816] border-[#2b2721] text-[#7d7364] hover:border-[#453a2d] hover:text-[#b8aa98]'
              }`}
            >
              {p === 100 ? '全押' : `${p}%`}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={100}
            value={percent}
            onChange={(e) => setPercent(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
            className="w-16 ml-auto px-1.5 py-0.5 rounded bg-[#141210] border border-[#2b2721] text-[11px] font-mono text-[#d9d1c3] outline-none focus:border-[#6b5e4c]"
          />
          <span className="text-[10px] text-[#7d7364] font-serif">%</span>
        </div>
        {!canPlay && (
          <div className="mt-1.5 text-[10px] text-[#8a6a5a] font-serif">
            当前数值为零，先点击石碑积累造化
          </div>
        )}
      </div>

      {/* 玩法选项卡 */}
      <div className="flex items-center gap-1.5 border-b border-[#2d2822] pb-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-fun-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 rounded text-[11px] font-serif font-bold border transition-all ${
              tab === t.id
                ? 'bg-[#3d3428] border-[#736450] text-[#f2ede4]'
                : 'bg-[#1a1816] border-[#2b2721] text-[#7d7364] hover:border-[#453a2d] hover:text-[#b8aa98]'
            } cursor-pointer`}
          >
            <span className="inline-flex items-center gap-1">
              {t.renderIcon()}
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* 结果回显 */}
      {result && (
        <div
          className={`rounded-lg p-2.5 border ${
            result.win === null
              ? 'bg-[#1f1d1a] border-[#3a352c]'
              : result.win
              ? 'bg-[#1f261c] border-[#354530]'
              : 'bg-[#261b1b] border-[#4a2e2e]'
          }`}
        >
          <div
            className={`text-[11px] font-serif font-bold mb-0.5 ${
              result.win === null
                ? 'text-[#a69c8d]'
                : result.win
                ? 'text-[#84b878]'
                : 'text-[#d97777]'
            }`}
          >
            {result.title} · {result.win === null ? '平局' : result.win ? '天眷加持' : '造化尽散'}
          </div>
          <div className="text-[10px] text-[#998e7e] font-serif">{result.detail}</div>
        </div>
      )}

      {/* 石头剪子布 */}
      {tab === 'rps' && (
        <div className="bg-[#211f1c] border border-[#383229] rounded-lg p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb]">
              石头剪子布
            </span>
            <span className="text-[10px] text-[#7d7364] font-serif">
              胜 ×1.5 · 负 全没收 · 平 退回
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {RPS.map((name, idx) => (
              <button
                key={name}
                id={`btn-fun-rps-${idx}`}
                onClick={() => playRps(idx)}
                disabled={!canPlay}
                className={`flex-1 py-2 rounded text-xs font-serif font-bold border transition-all ${
                  canPlay
                    ? 'bg-[#3d3428] hover:bg-[#524636] text-[#f2ede4] border-[#736450] active:translate-y-0.5 cursor-pointer'
                    : 'bg-[#181614] text-[#595246] border-[#2b2721] cursor-not-allowed'
                }`}
              >
                <RpsIcon index={idx} />
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 猜硬币 */}
      {tab === 'coin' && (
        <div className="bg-[#211f1c] border border-[#383229] rounded-lg p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb]">猜硬币</span>
            <span className="text-[10px] text-[#7d7364] font-serif">中 ×2 · 未中 全没收</span>
          </div>
          <div className="flex items-center gap-1.5">
            {COIN.map((name, idx) => (
              <button
                key={name}
                id={`btn-fun-coin-${idx}`}
                onClick={() => playCoin(idx)}
                disabled={!canPlay}
                className={`flex-1 py-2 rounded text-xs font-serif font-bold border transition-all ${
                  canPlay
                    ? 'bg-[#3d3428] hover:bg-[#524636] text-[#f2ede4] border-[#736450] active:translate-y-0.5 cursor-pointer'
                    : 'bg-[#181614] text-[#595246] border-[#2b2721] cursor-not-allowed'
                }`}
              >
                <CoinIcon index={idx} />
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 猜号码 */}
      {tab === 'numbers' && (
        <div className="bg-[#211f1c] border border-[#383229] rounded-lg p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb]">猜号码</span>
            <span className="text-[10px] text-[#7d7364] font-serif">
              全中 ×30 · 中二 ×2 · 余者无
            </span>
          </div>
          <div className="text-[10px] text-[#807565] font-serif mb-1.5">
            自选 3 个号码（1~9，不可重复），开奖 3 个，按命中个数结算
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {NUMBER_POOL.map((n) => {
              const active = picked.includes(n);
              return (
                <button
                  key={n}
                  onClick={() => toggleNumber(n)}
                  className={`w-8 h-8 rounded text-xs font-mono font-bold border transition-all ${
                    active
                      ? 'bg-[#543b23] border-[#8a653f] text-[#fcefdc]'
                      : 'bg-[#1a1816] border-[#2b2721] text-[#8f8574] hover:border-[#453a2d] hover:text-[#b8aa98]'
                  } ${picked.length >= 3 && !active ? 'opacity-40' : ''} cursor-pointer`}
                >
                  {n}
                </button>
              );
            })}
            <button
              id="btn-fun-numbers-draw"
              onClick={playNumbers}
              disabled={!canPlay || picked.length !== 3}
              className={`ml-auto px-3 py-1.5 rounded text-[11px] font-serif font-bold border transition-all whitespace-nowrap ${
                canPlay && picked.length === 3
                  ? 'bg-[#3d3428] hover:bg-[#524636] text-[#f2ede4] border-[#736450] active:translate-y-0.5 cursor-pointer'
                  : 'bg-[#181614] text-[#595246] border-[#2b2721] cursor-not-allowed'
              }`}
            >
              开奖（已选 {picked.length}/3）
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
