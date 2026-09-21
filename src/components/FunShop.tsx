import React, { useState } from 'react';
import {
  Box,
  Circle,
  CircleDashed,
  Hand,
  Scissors,
  Flame,
  Infinity as InfinityIcon,
  Orbit,
  Sparkles,
} from 'lucide-react';
import { BigNum } from '../utils/bigNumber';

export type SettleType = 'gain' | 'loss';

/** 可梭哈的货币：数值 / 永劫点 / 坍缩点 / 往生点 */
export type GambleCurrency = 'value' | 'rebirth' | 'collapse' | 'afterlife';
export type PointsCurrency = Exclude<GambleCurrency, 'value'>;

interface FunShopProps {
  currentValue: BigNum;
  rebirthPoints: number;
  collapsePoints: number;
  afterlifePoints: number;
  /** 数值结算：type='gain' 净赚 amount；type='loss' 没收 amount */
  onSettle: (type: SettleType, amount: BigNum) => void;
  /** 点数类货币结算：同上，金额为整数点数 */
  onSettlePoints: (currency: PointsCurrency, type: SettleType, amount: number) => void;
  /** 收手离场：关闭模态框 */
  onClose: () => void;
}

// 石头0 / 剪刀1 / 布2：石头胜剪刀，剪刀胜布，布胜石头
const RPS = ['石头', '剪刀', '布'];
const COIN = ['正面', '反面'];

type GameId = 'rps' | 'coin';
/** 天意随机抽取的玩法池 */
const GAMES: GameId[] = ['rps', 'coin'];
const GAME_TITLES: Record<GameId, string> = {
  rps: '石头剪子布',
  coin: '猜硬币',
};
const GAME_RULES: Record<GameId, string> = {
  rps: '胜 ×1.5 · 负 尽数没收 · 平 原样退回',
  coin: '中 ×2 · 未中 尽数没收',
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

/** 各货币在押注阶段的小标签 */
const CURRENCY_LABELS: Record<PointsCurrency, string> = {
  rebirth: '永劫点',
  collapse: '坍缩点',
  afterlife: '往生点',
};

export const FunShop: React.FC<FunShopProps> = ({
  currentValue,
  rebirthPoints,
  collapsePoints,
  afterlifePoints,
  onSettle,
  onSettlePoints,
  onClose,
}) => {
  /** bet: 选择梭哈的货币；game: 天意指定的玩法 */
  const [stage, setStage] = useState<'bet' | 'game'>('bet');
  const [currency, setCurrency] = useState<GambleCurrency | null>(null);
  /** 数值押注快照 */
  const [stake, setStake] = useState<BigNum>(new BigNum(0, 0));
  /** 点数类押注快照（整数点数） */
  const [pointStake, setPointStake] = useState(0);
  const [game, setGame] = useState<GameId | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);

  const locked = result !== null;
  const isValue = currency === 'value';

  /** 各货币当前余额 */
  const balanceOf = (c: GambleCurrency): BigNum => {
    if (c === 'value') return currentValue;
    const n =
      c === 'rebirth' ? rebirthPoints : c === 'collapse' ? collapsePoints : afterlifePoints;
    return BigNum.fromNumber(Math.max(0, n));
  };

  /** 选定梭哈的货币并随机抽取一个玩法 */
  const startGame = (c: GambleCurrency) => {
    const balance = balanceOf(c);
    if (!balance.gt(0)) return;
    setCurrency(c);
    if (c === 'value') setStake(balance);
    else setPointStake(Math.floor(balance.toNumber()));
    setResult(null);
    setGame(GAMES[Math.floor(Math.random() * GAMES.length)]);
    setStage('game');
  };

  /** 统一结算：数值走 BigNum，点数走整数 */
  const settle = (type: SettleType, amount: BigNum | number, res: GameResult) => {
    if (!currency) return;
    if (currency === 'value') {
      onSettle(type, amount instanceof BigNum ? amount : BigNum.fromNumber(amount));
    } else {
      const amt =
        typeof amount === 'number' ? Math.floor(amount) : Math.floor(amount.toNumber());
      onSettlePoints(currency, type, amt);
    }
    setResult(res);
  };

  // 石头剪子布：猜中（胜）押注 ×1.5；未中（负）全部没收；平局退回
  const playRps = (player: number) => {
    if (locked) return;
    const cpu = Math.floor(Math.random() * 3);
    if ((player + 1) % 3 === cpu) {
      settle('gain', isValue ? stake.mulScalar(0.5) : Math.floor(pointStake * 0.5), {
        title: GAME_TITLES.rps,
        detail: `你出 ${RPS[player]} · 电脑出 ${RPS[cpu]} · 胜！押注 ×1.5`,
        win: true,
      });
    } else if ((cpu + 1) % 3 === player) {
      settle('loss', isValue ? stake : pointStake, {
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
      settle('gain', isValue ? stake : pointStake, {
        title: GAME_TITLES.coin,
        detail: `你猜 ${COIN[side]} · 开出 ${COIN[flip]} · 猜中！押注 ×2`,
        win: true,
      });
    } else {
      settle('loss', isValue ? stake : pointStake, {
        title: GAME_TITLES.coin,
        detail: `你猜 ${COIN[side]} · 开出 ${COIN[flip]} · 未中，押注尽数没收`,
        win: false,
      });
    }
  };

  /** 第一环节：选择梭哈哪种货币 */
  if (stage === 'bet') {
    const options: {
      id: GambleCurrency;
      label: string;
      sub: string;
      icon: React.ReactNode;
      tone: string;
    }[] = [
      {
        id: 'value',
        label: '梭哈数值',
        sub: currentValue.formatChinese(2),
        icon: <Flame size={24} />,
        tone: 'bg-[#2a1a18] border-[#5a2f2f] hover:border-[#b25454]',
      },
      {
        id: 'rebirth',
        label: '梭哈永劫点',
        sub: `${BigNum.fromNumber(rebirthPoints).formatChinese(0)} 点`,
        icon: <InfinityIcon size={24} />,
        tone: 'bg-[#18202b] border-[#2e4a6e] hover:border-[#5b9bd8]',
      },
      {
        id: 'collapse',
        label: '梭哈坍缩点',
        sub: `${BigNum.fromNumber(collapsePoints).formatChinese(0)} 重`,
        icon: <Orbit size={24} />,
        tone: 'bg-[#1b1622] border-[#4a2e5e] hover:border-[#8938b8]',
      },
      {
        id: 'afterlife',
        label: '梭哈往生点',
        sub: `${BigNum.fromNumber(afterlifePoints).formatChinese(0)} 点`,
        icon: <Sparkles size={24} />,
        tone: 'bg-[#20182b] border-[#54336e] hover:border-[#a05fd8]',
      },
    ];

    return (
      <div className="flex flex-col gap-3">
        <div className="text-center text-[11px] font-serif text-[#807565]">
          掷下造化 · 与天对赌 · 择一梭哈
        </div>

        <div className="grid grid-cols-2 gap-2">
          {options.map((o) => {
            const disabled = !balanceOf(o.id).gt(0);
            return (
              <button
                key={o.id}
                id={`btn-fun-bet-${o.id}`}
                onClick={() => startGame(o.id)}
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

        <div className="text-center text-[10px] font-serif text-[#6f6656]">
          余额为零的货币不可梭哈
        </div>
      </div>
    );
  }

  /** 第二环节：天意指定的玩法 */
  const stakeText = isValue
    ? stake.formatChinese(2)
    : `${BigNum.fromNumber(pointStake).formatChinese(0)} 点`;
  const currencyLabel =
    currency === 'rebirth'
      ? CURRENCY_LABELS.rebirth
      : currency === 'collapse'
        ? CURRENCY_LABELS.collapse
        : currency === 'afterlife'
          ? CURRENCY_LABELS.afterlife
          : '数值';

  return (
    <div className="flex flex-col gap-3">
      {/* 本局押注 */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-[#3d372e] bg-[#211e1a] px-3 py-2">
        <span className="text-[11px] font-serif text-[#a69c8d]">
          本局押注（梭哈 · {currencyLabel}）
        </span>
        <span className="text-xs font-mono font-bold text-[#e8b56f]">{stakeText}</span>
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
            onClick={() => currency && startGame(currency)}
            className={`${BIG_CARD} py-4 ${BIG_CARD_ACTIVE}`}
          >
            <span className="text-sm font-serif font-bold tracking-wider">再赌一把</span>
            <span className="text-[10px] font-serif text-[#998e7e]">
              继续梭哈{currencyLabel}
            </span>
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
