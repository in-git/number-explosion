import React from 'react';
import {
  BarChart3,
  Dices,
  Infinity as InfinityIcon,
  Orbit,
  Package,
  RefreshCw,
  Settings,
  Sparkles,
  Store,
  Trophy,
  Zap,
} from 'lucide-react';
import { REBIRTH_THRESHOLD } from '../config';
import { getTitle } from '../utils/title';
import { useGameData, useModals } from '../context/GameContext';

/** 商殿卡片：同一排铺满，列宽自适应，内部为上下结构（图标在上、文字在下）；高度写死 */
const SHOP_CARD =
  'flex h-[70px] flex-col items-center justify-center gap-1.5 px-2 rounded-xl border-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all text-center';
/** 商殿网格：固定一排三个，超出换行 */
const SHOP_GRID = 'grid gap-2 grid-cols-3';
const SHOP_TITLE =
  'text-[11px] sm:text-sm font-serif font-bold tracking-[0.1em] sm:tracking-[0.2em] text-[#ded7cb] leading-tight';

/** 功能卡片：列表排布，一行一个；高度写死 */
const LIST_CARD =
  'flex h-[52px] items-center justify-between gap-3 px-3.5 rounded-xl border-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all text-left';
const LIST_TITLE =
  'text-sm font-serif font-bold tracking-[0.2em] text-[#ded7cb] whitespace-nowrap';

/** 称号 / 排行 / 成就：同排三项时的紧凑卡片；高度写死 */
const TRIPLE_CARD =
  'flex h-[44px] items-center justify-between gap-1.5 px-2 rounded-xl border-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all text-left min-w-0';
const TRIPLE_TITLE =
  'text-[11px] sm:text-sm font-serif font-bold tracking-[0.08em] sm:tracking-[0.16em] text-[#ded7cb] whitespace-nowrap';

export const ShopEntries: React.FC = () => {
  const { state, canRebirth } = useGameData();
  const modals = useModals();

  // 永劫商殿：永劫之道开启后才出现；坍缩商殿：须于永劫殿手动「解锁坍缩」后才出现
  const rebirthShopUnlocked = state.rebirthUnlocked || state.rebirthPoints > 0;
  const collapseShopUnlocked = state.collapseUnlocked;
  // 排行：消耗 1 点永劫点数解锁后显示
  const rankingUnlocked = !!state.rankingUnlocked;
  // 永劫门槛：数值必须 ≥ 100 万（坍缩入口已移至坍缩商殿，不再复用此按钮）
  const canOpenRebirth = canRebirth;
  // 称号：按历世最高数值自动达成
  const title = getTitle(state);

  return (
    <div className="w-full max-w-md mx-auto px-4 py-2 flex flex-col gap-2">
      {/* 商殿：同一排网格 */}
      <div className={SHOP_GRID}>
        {/* 升级商殿 */}
        <button
          id="btn-open-upgrade-shop"
          onClick={modals.upgradeShop.open}
          className={`${SHOP_CARD} bg-[#1a1816] border-[#332e27] hover:border-[#5b5142] active:translate-y-0.5 cursor-pointer`}
        >
          <Store size={18} className="text-[#8c8273] flex-shrink-0" />
          <div className={SHOP_TITLE}>数 值 殿</div>
        </button>

        {/* 永劫商殿：解锁后才显示 */}
        {rebirthShopUnlocked && (
          <button
            id="btn-open-rebirth-shop"
            onClick={modals.rebirthShop.open}
            className={`${SHOP_CARD} bg-[#1a1816] border-[#3a3226] hover:border-[#6b5a3f] active:translate-y-0.5 cursor-pointer`}
          >
            <RefreshCw size={18} className="text-[#8c8273] flex-shrink-0" />
            <div className={SHOP_TITLE}>永 劫 殿</div>
          </button>
        )}

        {/* 奇趣商殿 */}
        <button
          id="btn-open-fun-shop"
          onClick={modals.funShop.open}
          className={`${SHOP_CARD} bg-[#1a1816] border-[#332e27] hover:border-[#5b5142] active:translate-y-0.5 cursor-pointer`}
        >
          <Dices size={18} className="text-[#8c8273] flex-shrink-0" />
          <div className={SHOP_TITLE}>奇 趣 殿</div>
        </button>

        {/* 坍缩商殿：解锁后才显示 */}
        {collapseShopUnlocked && (
          <button
            id="btn-open-collapse-shop"
            onClick={modals.collapseShop.open}
            className={`${SHOP_CARD} bg-[#161d2b] border-[#2e4a6e] hover:border-[#3f7fd0] active:translate-y-0.5 cursor-pointer`}
          >
            <Orbit size={18} className="text-[#5b9bd8] flex-shrink-0" />
            <div className={SHOP_TITLE}>坍 缩 殿</div>
          </button>
        )}

        {/* 往生殿：于坍缩殿解锁后才显示 */}
        {state.afterlifeShopUnlocked && (
          <button
            id="btn-open-afterlife"
            onClick={modals.afterlifeShop.open}
            className={`${SHOP_CARD} bg-[#1b1622] border-[#4a2e5e] hover:border-[#8938b8] active:translate-y-0.5 cursor-pointer`}
          >
            <Sparkles size={18} className="text-[#d897fa] flex-shrink-0" />
            <div className={SHOP_TITLE}>往 生 殿</div>
          </button>
        )}

        {/* 渡劫殿：渡劫成功（飞升成仙）后显示，耗时炼制重置丹 */}
        {state.tribulationSuccess && (
          <button
            id="btn-open-tribulation-hall"
            onClick={modals.tribulationHall.open}
            className={`${SHOP_CARD} bg-[#221a12] border-[#5e3a24] hover:border-[#c8873f] active:translate-y-0.5 cursor-pointer`}
          >
            <Zap size={18} className="text-[#e8b56f] flex-shrink-0" />
            <div className={SHOP_TITLE}>渡 劫 殿</div>
          </button>
        )}
      </div>

      {/* 永劫 / 成就 / 设置：依旧是列表，一行一个 */}
      <div className="flex flex-col gap-2">
        {/* 永劫（内含坍缩入口）：已渡劫成功（飞升成仙）后不再显示 */}
        {!state.tribulationSuccess && (
          <button
            id="btn-open-rebirth"
            onClick={modals.rebirth.open}
            disabled={!canOpenRebirth}
            className={`relative ${LIST_CARD} ${
              canOpenRebirth
                ? 'bg-[#1a1816] border-[#4a3a24] hover:border-[#8a653f] active:translate-y-0.5 cursor-pointer animate-[rebirthGlow_1.5s_ease-in-out_infinite]'
                : 'bg-[#171513] border-[#2b2721] cursor-not-allowed'
            }`}
            style={{ overflow: 'visible' }}
          >
            <div
              className={`text-sm font-serif font-bold tracking-[0.2em] whitespace-nowrap ${
                canOpenRebirth ? 'text-[#ded7cb]' : 'text-[#6b6455]'
              }`}
            >
              永 劫
            </div>
            <InfinityIcon size={18} className="text-[#8c8273] flex-shrink-0" />
            {/* 门槛标签：右上角溢出边界的红色标签 */}
            <span className="absolute -top-2 -right-2 text-[9px] font-mono px-1 py-px rounded bg-[#3a1717] border border-[#7a2a2a] text-[#f07979] flex-shrink-0">
              {REBIRTH_THRESHOLD.formatChinese(0).replace('万', 'w')}
            </span>
          </button>
        )}

        {/* 称号 + 排行 + 成就：同一排（各自解锁后显示） */}
        {(state.titleUnlocked || rankingUnlocked || state.achievementsUnlocked) && (
          <div className="flex gap-2">
            {state.titleUnlocked && (
              <button
                id="home-title"
                onClick={modals.title.open}
                className={`${TRIPLE_CARD} flex-1 bg-[#1a1715] border-[#2b2721] hover:border-[#8a653f] active:translate-y-0.5 cursor-pointer`}
              >
                <div className={TRIPLE_TITLE}>称 号</div>
                <span
                  className="font-serif font-bold text-[11px] sm:text-sm whitespace-nowrap truncate"
                  style={{ color: title.color }}
                >
                  {title.name}
                </span>
              </button>
            )}
            {rankingUnlocked && (
              <button
                id="btn-open-ranking"
                onClick={modals.ranking.open}
                className={`${TRIPLE_CARD} flex-1 bg-[#1a1715] border-[#4a3a24] hover:border-[#8a653f] active:translate-y-0.5 cursor-pointer`}
              >
                <div className={TRIPLE_TITLE}>排 行</div>
                <BarChart3 size={16} className="text-[#8c8273] flex-shrink-0" />
              </button>
            )}
            {state.achievementsUnlocked && (
              <button
                id="btn-open-achievements"
                onClick={modals.achievements.open}
                className={`${TRIPLE_CARD} flex-1 bg-[#1a1715] border-[#4a3a24] hover:border-[#8a653f] active:translate-y-0.5 cursor-pointer`}
              >
                <div className={TRIPLE_TITLE}>成 就</div>
                <Trophy size={16} className="text-[#8c8273] flex-shrink-0" />
              </button>
            )}
          </div>
        )}

        {/* 设置（数值设定 / 重修道途） */}
        <button
          id="btn-open-settings"
          onClick={modals.settings.open}
          className={`${LIST_CARD} bg-[#161a1f] border-[#2c3440] hover:border-[#4a8db8] active:translate-y-0.5 cursor-pointer`}
        >
          <div className={LIST_TITLE}>设 置</div>
          <Settings size={18} className="text-[#8c8273] flex-shrink-0" />
        </button>
      </div>
    </div>
  );
};
