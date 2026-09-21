import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { GameState } from '../types';
import { BigNum } from '../utils/bigNumber';
import {
  calculateGameAttributes,
  getValueCap,
  getRebirthPointsCap,
  TRIBULATION_MAX_COUNT,
} from '../utils/gameMath';
import { formatDuration } from '../utils/serverTime';
import { getTitle } from '../utils/title';

interface AttributesPanelProps {
  state: GameState;
}

interface AttributeItem {
  id: string;
  label: string;
  value: string;
  detail?: string;
  valueClass?: string;
}

/** 页签：数值属性 / 存档属性 */
type AttrTab = 'value' | 'archive';

const TABS: { id: AttrTab; label: string }[] = [
  { id: 'value', label: '数值属性' },
  { id: 'archive', label: '存档属性' },
];

/** 通用属性行：无背景色、标题前无图标；行高写死，保证列表整齐 */
const AttributeRow: React.FC<{ item: AttributeItem }> = ({ item }) => (
  <div id={item.id} className="flex h-7 items-center justify-between gap-3 px-1">
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-serif text-[11px] sm:text-xs text-[#948a7a] whitespace-nowrap">
        {item.label}
      </span>
      <span className="text-[10px] text-[#5f5749] font-serif truncate hidden sm:inline">
        {item.detail}
      </span>
    </div>
    <span
      className={`font-mono text-xs sm:text-sm font-bold ${
        item.valueClass || 'text-[#e6ded1]'
      } tracking-tight whitespace-nowrap flex-shrink-0`}
    >
      {item.value}
    </span>
  </div>
);

export const AttributesPanel: React.FC<AttributesPanelProps> = ({ state }) => {
  // 属性面板默认收起
  const [isExpanded, setIsExpanded] = useState(false);
  // 当前页签：数值属性 / 存档属性
  const [tab, setTab] = useState<AttrTab>('value');

  const attrs = calculateGameAttributes(state);
  const title = getTitle(state);

  // Format auto-click string
  let autoClickDisplay = '0次/s';
  if (state.upgrades.autoClickUnlock.unlocked) {
    autoClickDisplay = `${attrs.autoClicksPerSec.toFixed(1)}次/s`;
  }

  /** 数值属性：渡劫失败时全部回到初始值 */
  const attributesList: AttributeItem[] = [
    {
      id: 'attr-base-upgrade',
      label: '数值升级',
      // 统一取自 calculateGameAttributes（已含数值殿 × 往生殿基础倍数 + 永劫殿）
      value: attrs.baseValueUpgradeBonus.formatChinese(1),
      detail: '数值殿 + 永劫殿累计加成 · 已含往生殿基础倍数',
    },

    {
      id: 'attr-value-cap',
      label: '数值上限',
      value: getValueCap(state.valueCapLevel || 0, state.rebirthCount || 0).formatChinese(2),
      detail: '坍缩殿提升上限 · 每次永劫 +100万 · 达到上限后数值不再增长',
    },
    {
      id: 'attr-highest-value',
      label: '最高数值',
      value: BigNum.fromData(state.highestValue).formatChinese(2),
      valueClass: 'text-[#e8b56f]',
      detail: '历世最高纪录',
    },
    {
      id: 'attr-value-mult',
      label: '数值倍率',
      value: `${BigNum.fromNumber(attrs.valueMultiplier).formatChinese(2)}x`,
      detail: '基础全域倍率',
    },
    {
      id: 'attr-auto-click',
      label: '自动点击n/s',
      value: autoClickDisplay,
      detail: state.upgrades.autoClickUnlock.unlocked ? '自动行功运化' : '尚未觉醒',
    },
    {
      id: 'attr-combo-chance',
      label: '连击概率',
      value: `${BigNum.fromNumber(attrs.comboChance * 100).formatChinese(1)}%`,
      detail: '触发多重连击',
    },
    {
      id: 'attr-combo-mult',
      label: '连击倍数',
      value: `${BigNum.fromNumber(attrs.comboMultiplier * 100).formatChinese(0)}%`,
      detail: `加成 +${BigNum.fromNumber(attrs.comboMultiplier).formatChinese(1)}x`,
    },
    {
      id: 'attr-crit-mult',
      label: '暴击倍数',
      value: `${BigNum.fromNumber(attrs.critMultiplier * 100).formatChinese(0)}%`,
      detail: `加成 +${BigNum.fromNumber(attrs.critMultiplier).formatChinese(1)}x`,
    },
    {
      id: 'attr-crit-chance',
      label: '暴击概率',
      value: `${BigNum.fromNumber(attrs.critChance * 100).formatChinese(1)}%`,
      detail: '天意破极暴击',
    },
    {
      id: 'attr-click-count',
      label: '当世点击',
      value: `${attrs.clickCount} 次`,
      detail: '即数值殿的「点击量」· 解锁功法时消耗 · 渡劫失败后归零',
    },
    {
      id: 'attr-achievement-crit',
      label: '暴击效果加成',
      value: `+${attrs.achievementCritBonus}`,
      valueClass: 'text-[#76d18c]',
      detail: '游玩时长成就奖励 · 累加到暴击倍数',
    },
    {
      id: 'attr-rebirth-point-bonus',
      label: '永劫点数加成',
      value: `+${attrs.rebirthPointBonus} / 百万`,
      detail: '「永劫爆炸」升级 · 永劫时每 100 万数值额外获得',
    },
    {
      id: 'attr-rebirth-cap',
      label: '永劫点上限',
      value: `${BigNum.fromNumber(getRebirthPointsCap(state.rebirthCapLevel || 0)).formatChinese(0)} 点`,
      valueClass: 'text-[#5fa8e6]',
      detail: '每次永劫所得的点数上限 · 往生殿升级提升 · 每级增量递增（+100、+110、+120…）',
    },
    {
      id: 'attr-rebirth-start-value',
      label: '永劫初始数值',
      value: attrs.rebirthStartValue.formatChinese(2),
      detail: '成就奖励累加 · 永劫/坍缩后的起始数值',
    },
  ];

  /**
   * 存档属性：历世之迹，渡劫失败也只重置数值属性，这些一律保留。
   * 与 utils/state.ts 的 ARCHIVE_KEYS 对应（lastActiveAt / notifiedUnlocks 属内部记账，不在此展示）。
   */
  const archiveList: AttributeItem[] = [
    {
      id: 'attr-play-time',
      label: '游玩时长',
      value: formatDuration(attrs.playTimeMs),
      valueClass: 'text-[#76d18c]',
      detail: '页面开启时长 · 后台挂机与离线不计',
    },
    {
      id: 'attr-total-click-count',
      label: '总点击',
      value: `${attrs.totalClickCount} 次`,
      detail: '历世累计点击总数 · 用于解锁成就',
    },
    {
      id: 'attr-tribulation',
      label: '渡劫次数',
      value: `${state.tribulationCount || 0} / ${TRIBULATION_MAX_COUNT} 次`,
      valueClass: 'text-[#e8b56f]',
      detail:
        state.tribulationCount > 0
          ? `单次收益取原值的 ${attrs.tribulationExponent} 次方`
          : '尚未渡劫成功 · 次方暂不参与收益计算',
    },
  ];

  const shownList = tab === 'archive' ? archiveList : attributesList;

  return (
    <div className="w-full max-w-md mx-auto px-4 py-1.5">
      <div className="bg-[#1a1816] border border-[#332e27] rounded-xl px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
        {/* 卡片标题：点任意处收起 / 展开 */}
        <div
          onClick={() => setIsExpanded((v) => !v)}
          className={`flex h-6 items-center justify-between cursor-pointer ${
            isExpanded ? 'mb-1' : ''
          }`}
        >
          <button
            id="attr-panel-toggle"
            aria-expanded={isExpanded}
            className="flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>数 值 存 档</span>
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* 资源区：置顶常显，为 0 的不显示；全部为空时整块不渲染 */}
        {(attrs.rebirthPoints > 0 || state.afterlifePoints > 0) && (
          <div className="flex h-7 flex-wrap items-center gap-x-4 overflow-hidden">
            {attrs.rebirthPoints > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-[11px] sm:text-xs text-[#948a7a]">永劫点数</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-[#5fa8e6] tracking-tight">
                  {BigNum.fromNumber(attrs.rebirthPoints).formatChinese(0)} 点
                </span>
              </div>
            )}

            {state.afterlifePoints > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-[11px] sm:text-xs text-[#948a7a]">往生点</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-[#d897fa] tracking-tight">
                  {state.afterlifePoints} 点
                </span>
              </div>
            )}
          </div>
        )}

        {/* 折叠区：页签栏 + 属性列表 */}
        <div
          className={`overflow-hidden transition-all duration-200 ${
            isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {/* 页签栏：数值属性 / 存档属性 */}
          <div className="flex items-center gap-1.5 pb-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                id={`attr-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`px-2 py-0.5 rounded border text-[11px] font-serif tracking-[0.15em] transition-colors cursor-pointer ${
                  tab === t.id
                    ? 'text-[#e8dcc6] border-[#6b5e4c] bg-[#3b3327]'
                    : 'text-[#7d7364] border-[#2b2721] hover:border-[#453a2d] hover:text-[#b8aa98]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 属性列表 */}
          <div className="flex flex-col divide-y divide-[#262220]">
            {shownList.map((item) => (
              <AttributeRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
