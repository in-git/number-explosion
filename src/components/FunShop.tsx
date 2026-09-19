import React, { useState } from 'react';
import {
  Box,
  Circle,
  CircleDashed,
  Hand,
  Scissors,
  Target,
  Flame,
  Percent,
  LogOut,
} from 'lucide-react';
import { BigNum } from '../utils/bigNumber';

export type SettleType = 'gain' | 'loss';

interface FunShopProps {
  currentValue: BigNum;
  /** type='gain' 表示净赚 amount；type='loss' 表示没收 amount */
  onSettle: (type: SettleType, amount: BigNum) => void;
  /** 不玩了 / 收手离场：关闭模态框 */
  onClose: () => void;
}

// 石头0 / 剪刀1 / 布2：石头胜剪刀，剪刀胜布，布胜石头
const RPS = ['石头', '剪刀', '布'];
const COIN = ['正面', '反面'];
const NUMBER_POOL = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type GameId = 'rps' | 'coin' | 'numbers';
/** 天意随机抽取的玩法池 */
const GAMES: GameId[] = ['rps', 'coin', 'numbers'];
const GAME_TITLES: Record<GameId, string> = {
  rps: '石头剪子布',
  coin: '猜硬币',
  numbers: '猜号码',
};
const GAME_RULES: Record<GameId, string> = {
  rps: '胜 ×1.5 · 负 尽数没收 · 平 原样退回',
  coin: '中 ×2 · 未中 尽数没收',
  numbers: '自选 3 号 · 全中 ×30 · 中二 ×2 · 余者无',
};

/** 石头 / 剪刀 / 布 的图标 */
function RpsIcon({ index }: { index: number }) {
  if (index === 0) return <Box size={26} />;
  if (index === 1) return <Scissors size={26} />;
  return <Hand size={26} />;
}

/** 硬币 正面 / 反面 的图标 */
function CoinIcon({ index }: { index: number }) {
  return index === 0 ? <Circle size={26} /> : <CircleDashed size={26} />;
}

interface GameResult {
  title: string;
  detail: string;
  /** true 胜 / false 负 / null 平局 */
  win: boolean | null;
}

/** 大卡片：竖向居中、内边距加大 */
const BIG_CARD =
  'flex flex-col items-center justify-center gap-2 py-6 px-2 rounded-xl border-2 text-center transition-all active:translate-y-0.5';
/** 大卡片 · 可点 */
const BIG_CARD_ACTIVE =
  'bg-[#3d3428] border-[#736450] hover:bg-[#524636] text-[#f2ede4] cursor-pointer';
/** 大卡片 · 禁用 */
const BIG_CARD_DISABLED = 'bg-[#181614] border-[#2b2721] text-[#595246] cursor-not-allowed';

export const FunShop: React.FC<FunShopProps> = ({ currentValue, onSettle, onClose }) => {
  /** bet: 选择投入；game: 天意指定的玩法 */
  const [stage, setStage] = useState<'bet' | 'game'>('bet');
  const [betPercent, setBetPercent] = useState(100);
  /** 进入玩法时锁定押注，避免自动点击期间数值变动 */
  const [stake, setStake] = useState<BigNum>(new BigNum(0, 0));
  const [game, setGame] = useState<GameId | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);

  const canBet = currentValue.gt(0);
  const betName = betPercent >= 100 ? '梭哈' : '一半';
  const locked = result !== null;

  /** 选定投入并随机抽取一个玩法 */
  const startGame = (percent: number) => {
    const amount = currentValue.mulScalar(percent / 100);
    if (!amount.gt(0)) return;
    setBetPercent(percent);
    setStake(amount);
    setPicked([]);
    setResult(null);
    setGame(GAMES[Math.floor(Math.random() * GAMES.length)]);
    setStage('game');
  };

  const settle = (type: SettleType, amount: BigNum, res: GameResult) => {
    onSettle(type, amount);
    setResult(res);
  };

  // 石头剪子布：猜中（胜）押注 ×1.5；未中（负）全部没收；平局退回
  const playRps = (player: number) => {
    if (locked) return;
    const cpu = Math.floor(Math.random() * 3);
    if ((player + 1) % 3 === cpu) {
      settle('gain', stake.mulScalar(0.5), {
        title: GAME_TITLES.rps,
        detail: `你出 ${RPS[player]} · 电脑出 ${RPS[cpu]} · 胜！押注 ×1.5`,
        win: true,
      });
    } else if ((cpu + 1) % 3 === player) {
      settle('loss', stake, {
        title: GAME_TITLES.rps,
        detail: `你出 ${RPS[player]} · 电脑出 ${RPS[cpu]} · 负，押注尽数没收`,
        win: false,
      });
    } else {
      setResult({
        title: GAME_TITLES.rps,
        detail: `双方皆出 ${RPS[player]} · 平局，本金原样退回`,
        win: null,
      });
    }
  };

  // 猜硬币：猜中押注 ×2；未中全部没收
  const playCoin = (side: number) => {
    if (locked) return;
    const flip = Math.floor(Math.random() * 2);
    if (flip === side) {
      settle('gain', stake.mulScalar(1), {
        title: GAME_TITLES.coin,
        detail: `你猜 ${COIN[side]} · 开出 ${COIN[flip]} · 猜中！押注 ×2`,
        win: true,
      });
    } else {
      settle('loss', stake, {
        title: GAME_TITLES.coin,
        detail: `你猜 ${COIN[side]} · 开出 ${COIN[flip]} · 未中，押注尽数没收`,
        win: false,
      });
    }
  };

  const toggleNumber = (n: number) => {
    if (locked) return;
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
    if (locked || picked.length !== 3) return;
    const draw = drawNumbers();
    const hits = picked.filter((n) => draw.includes(n)).length;

    if (hits === 3) {
      settle('gain', stake.mulScalar(29), {
        title: GAME_TITLES.numbers,
        detail: `开奖 ${draw.join(' · ')} · 全中！押注 ×30`,
        win: true,
      });
    } else if (hits === 2) {
      settle('gain', stake.mulScalar(1), {
        title: GAME_TITLES.numbers,
        detail: `开奖 ${draw.join(' · ')} · 中 2 个！押注 ×2`,
        win: true,
      });
    } else {
      settle('loss', stake, {
        title: GAME_TITLES.numbers,
        detail: `开奖 ${draw.join(' · ')} · 仅中 ${hits} 个，无奖励`,
        win: false,
      });
    }
  };

  /** 第一环节：只决定投入多少 */
  if (stage === 'bet') {
    const options = [
      {
        id: 'all',
        label: '梭哈',
        sub: `全押 ${currentValue.formatChinese(2)}`,
        percent: 100,
        icon: <Flame size={24} />,
        tone: 'bg-[#2a1a18] border-[#5a2f2f] hover:border-[#b25454]',
      },
      {
        id: 'half',
        label: '一半',
        sub: `投入 ${currentValue.mulScalar(0.5).formatChinese(2)}`,
        percent: 50,
        icon: <Percent size={24} />,
        tone: 'bg-[#231f18] border-[#5b4b33] hover:border-[#8a653f]',
      },
      {
        id: 'quit',
        label: '不玩了',
        sub: '见好就收 · 全身而退',
        percent: 0,
        icon: <LogOut size={24} />,
        tone: 'bg-[#1a1816] border-[#332e27] hover:border-[#5b5142]',
      },
    ];

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[11px] font-serif px-1">
          <span className="text-[#7a6f5e]">当前数值</span>
          <span className="font-mono font-bold text-[#e8b56f]">
            {currentValue.formatChinese(2)}
          </span>
        </div>

        <div className="text-center text-[11px] font-serif text-[#807565]">
          掷下造化 · 与天对赌
        </div>

        <div className="grid grid-cols-3 gap-2">
          {options.map((o) => {
            const disabled = o.percent > 0 && !canBet;
            return (
              <button
                key={o.id}
                id={`btn-fun-bet-${o.id}`}
                onClick={() => (o.percent === 0 ? onClose() : startGame(o.percent))}
                disabled={disabled}
                className={`${BIG_CARD} ${
                  disabled ? BIG_CARD_DISABLED : `${o.tone} text-[#f2ede4] cursor-pointer`
                }`}
              >
                {o.icon}
                <span className="text-sm sm:text-base font-serif font-bold tracking-wider">
                  {o.label}
                </span>
                <span className="text-[10px] font-serif text-[#998e7e] leading-tight">
                  {o.sub}
                </span>
              </button>
            );
          })}
        </div>

        {!canBet && (
          <div className="text-center text-[11px] text-[#8a6a5a] font-serif">
            当前数值为零，先点击石碑积累造化
          </div>
        )}
      </div>
    );
  }

  /** 第二环节：天意指定的玩法 */
  return (
    <div className="flex flex-col gap-3">
      {/* 本局押注 */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-[#3d372e] bg-[#211e1a] px-3 py-2">
        <span className="text-[11px] font-serif text-[#a69c8d]">本局押注（{betName}）</span>
        <span className="text-xs font-mono font-bold text-[#e8b56f]">{stake.formatChinese(2)}</span>
      </div>

      {/* 玩法标题与规则 */}
      <div className="text-center">
        <div className="text-[10px] font-serif text-[#6f6656]">天 意 裁 定</div>
        <div className="text-base sm:text-lg font-serif font-bold text-[#ded7cb] tracking-[0.15em]">
          {game ? GAME_TITLES[game] : ''}
        </div>
        <div className="text-[10px] font-serif text-[#7d7364] mt-0.5">
          {game ? GAME_RULES[game] : ''}
        </div>
      </div>

      {/* 石头剪子布 */}
      {game === 'rps' && (
        <div className="grid grid-cols-3 gap-2">
          {RPS.map((name, idx) => (
            <button
              key={name}
              id={`btn-fun-rps-${idx}`}
              onClick={() => playRps(idx)}
              disabled={locked}
              className={`${BIG_CARD} ${locked ? BIG_CARD_DISABLED : BIG_CARD_ACTIVE}`}
            >
              <RpsIcon index={idx} />
              <span className="text-sm font-serif font-bold">{name}</span>
            </button>
          ))}
        </div>
      )}

      {/* 猜硬币 */}
      {game === 'coin' && (
        <div className="grid grid-cols-2 gap-2">
          {COIN.map((name, idx) => (
            <button
              key={name}
              id={`btn-fun-coin-${idx}`}
              onClick={() => playCoin(idx)}
              disabled={locked}
              className={`${BIG_CARD} ${locked ? BIG_CARD_DISABLED : BIG_CARD_ACTIVE}`}
            >
              <CoinIcon index={idx} />
              <span className="text-sm font-serif font-bold">{name}</span>
            </button>
          ))}
        </div>
      )}

      {/* 猜号码 */}
      {game === 'numbers' && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-5 gap-2">
            {NUMBER_POOL.map((n) => {
              const active = picked.includes(n);
              return (
                <button
                  key={n}
                  id={`btn-fun-number-${n}`}
                  onClick={() => toggleNumber(n)}
                  disabled={locked}
                  className={`flex items-center justify-center h-14 rounded-xl border-2 text-base font-mono font-bold text-center transition-all active:translate-y-0.5 ${
                    locked
                      ? BIG_CARD_DISABLED
                      : active
                        ? 'bg-[#543b23] border-[#8a653f] text-[#fcefdc] cursor-pointer'
                        : 'bg-[#1a1816] border-[#2b2721] text-[#8f8574] hover:border-[#453a2d] hover:text-[#b8aa98] cursor-pointer'
                  } ${picked.length >= 3 && !active ? 'opacity-40' : ''}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <button
            id="btn-fun-numbers-draw"
            onClick={playNumbers}
            disabled={locked || picked.length !== 3}
            className={`w-full py-3 rounded-xl border-2 text-sm font-serif font-bold text-center transition-all active:translate-y-0.5 ${
              locked || picked.length !== 3 ? BIG_CARD_DISABLED : BIG_CARD_ACTIVE
            }`}
          >
            开奖（已选 {picked.length}/3）
          </button>
        </div>
      )}

      {/* 结果回显 */}
      {result && (
        <div
          className={`rounded-xl p-3 border-2 text-center ${
            result.win === null
              ? 'bg-[#1f1d1a] border-[#3a352c]'
              : result.win
                ? 'bg-[#1f261c] border-[#354530]'
                : 'bg-[#261b1b] border-[#4a2e2e]'
          }`}
        >
          <div
            className={`text-sm font-serif font-bold mb-1 ${
              result.win === null
                ? 'text-[#a69c8d]'
                : result.win
                  ? 'text-[#84b878]'
                  : 'text-[#d97777]'
            }`}
          >
            {result.title} ·{' '}
            {result.win === null ? '平局' : result.win ? '天眷加持' : '造化尽散'}
          </div>
          <div className="text-[11px] text-[#998e7e] font-serif">{result.detail}</div>
        </div>
      )}

      {/* 结算后：再赌一把 / 收手离场 */}
      {result && (
        <div className="grid grid-cols-2 gap-2">
          <button
            id="btn-fun-replay"
            onClick={() => startGame(betPercent)}
            className={`${BIG_CARD} py-4 ${BIG_CARD_ACTIVE}`}
          >
            <span className="text-sm font-serif font-bold tracking-wider">再赌一把</span>
            <span className="text-[10px] font-serif text-[#998e7e]">沿用「{betName}」</span>
          </button>
          <button
            id="btn-fun-leave"
            onClick={onClose}
            className={`${BIG_CARD} py-4 bg-[#1a1816] border-[#332e27] text-[#ded7cb] hover:border-[#5b5142] cursor-pointer`}
          >
            <span className="text-sm font-serif font-bold tracking-wider">收手离场</span>
            <span className="text-[10px] font-serif text-[#998e7e]">见好就收</span>
          </button>
        </div>
      )}
    </div>
  );
};
