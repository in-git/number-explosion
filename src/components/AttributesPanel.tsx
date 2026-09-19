import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { GameState } from '../types';
import { BigNum } from '../utils/bigNumber';
import { BASE_VALUE_INITIAL, calculateGameAttributes, getValueCap } from '../utils/gameMath';
import { formatDuration } from '../utils/serverTime';
import { INITIAL_REBIRTH_BASE_ATTRS } from '../config';

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

/** 通用属性行：无背景色、标题前无图标 */
const AttributeRow: React.FC<{ item: AttributeItem }> = ({ item }) => (
  <div id={item.id} className="flex items-center justify-between gap-3 py-1 px-1">
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

  const attrs = calculateGameAttributes(state);
  const baseValueUp = state.upgrades.baseValue;

  // Format auto-click string
  let autoClickDisplay = '0 /s';
  if (state.upgrades.autoClickUnlock.unlocked) {
    if (attrs.autoClicksPerMs > 0) {
      autoClickDisplay = `${attrs.autoClicksPerMs.toFixed(1)} 次/ms`;
    } else {
      autoClickDisplay = `${attrs.autoClicksPerSec.toFixed(1)} /s`;
    }
  }

  // 永劫基础属性：永久累加，与基础值叠加参与计算
  const rebirthBase = state.rebirthBaseAttrs || INITIAL_REBIRTH_BASE_ATTRS;
  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  const rebirthAttrsList: AttributeItem[] = [
    {
      id: 'rebirth-base-value',
      label: '基础数值',
      value: `+${rebirthBase.baseValue}`,
      detail: '与点击基础值累加',
      valueClass: 'text-[#5fa8e6]',
    },
    {
      id: 'rebirth-auto-freq',
      label: '自动点击频率',
      value: `+${rebirthBase.autoFrequency} 级`,
      detail: '与自动点击频率等级累加',
      valueClass: 'text-[#5fa8e6]',
    },
    {
      id: 'rebirth-crit-mult',
      label: '暴击倍数',
      value: `+${pct(rebirthBase.critMultiplier)}`,
      detail: '与暴击倍数基数累加',
      valueClass: 'text-[#5fa8e6]',
    },
    {
      id: 'rebirth-crit-chance',
      label: '暴击概率',
      value: `+${pct(rebirthBase.critChance)}`,
      detail: '与暴击概率基数累加',
      valueClass: 'text-[#5fa8e6]',
    },
    {
      id: 'rebirth-combo-chance',
      label: '连击概率',
      value: `+${pct(rebirthBase.comboChance)}`,
      detail: '与连击概率基数累加',
      valueClass: 'text-[#5fa8e6]',
    },
    {
      id: 'rebirth-combo-mult',
      label: '连击倍数',
      value: `+${pct(rebirthBase.comboMultiplier)}`,
      detail: '与连击倍数基数累加',
      valueClass: 'text-[#5fa8e6]',
    },
  ];

  const attributesList: AttributeItem[] = [
    {
      id: 'attr-base-upgrade',
      label: '数值升级',
      value: baseValueUp.unlocked
        ? `Lv.${baseValueUp.level} (+${attrs.baseValue.sub(BASE_VALUE_INITIAL).formatChinese(1)})`
        : `基础 (${BASE_VALUE_INITIAL})`,
      detail: `当前单次基础: ${attrs.baseValue.formatChinese(1)}`,
    },
    {
      id: 'attr-goods-total-spent',
      label: '购置总额',
      value: BigNum.fromData(state.goodsTotalSpent).formatChinese(2),
      valueClass: 'text-[#c9a86a]',
      detail: '万物店累计花费 · 永不清零',
    },
    {
      id: 'attr-highest-value',
      label: '最高数值',
      value: BigNum.fromData(state.highestValue).formatChinese(2),
      valueClass: 'text-[#e8b56f]',
      detail: '历世最高纪录 · 永不清零',
    },
    {
      id: 'attr-value-mult',
      label: '数值倍率',
      value: `${attrs.valueMultiplier.toFixed(2)}x`,
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
      value: `${(attrs.comboChance * 100).toFixed(1)}%`,
      detail: '触发多重连击',
    },
    {
      id: 'attr-combo-mult',
      label: '连击倍数',
      value: `${(attrs.comboMultiplier * 100).toFixed(0)}%`,
      detail: `加成 +${attrs.comboMultiplier.toFixed(1)}x`,
    },
    {
      id: 'attr-crit-mult',
      label: '暴击倍数',
      value: `${(attrs.critMultiplier * 100).toFixed(0)}%`,
      detail: `加成 +${attrs.critMultiplier.toFixed(1)}x`,
    },
    {
      id: 'attr-crit-chance',
      label: '暴击概率',
      value: `${(attrs.critChance * 100).toFixed(1)}%`,
      detail: '天意破极暴击',
    },
    {
      id: 'attr-rebirth-points',
      label: '永劫点数',
      value: `${attrs.rebirthPoints} 点`,
      valueClass: 'text-[#5fa8e6]',
      detail: `累计永劫: ${state.rebirthCount} 次`,
    },
    {
      id: 'attr-value-cap',
      label: '数值上限',
      value: getValueCap(state.valueCapLevel || 0).formatChinese(2),
      detail: '数值不得超越此限（坍缩商店可 +100万）',
    },
    {
      id: 'attr-collapse',
      label: '坍缩',
      value: `${attrs.collapsePoints} 重`,
      detail: state.collapseUnlocked ? '太虚混沌之力' : '太虚未开',
    },
    {
      id: 'attr-click-count',
      label: '点击量',
      value: `${attrs.clickCount} 次`,
      detail: '永劫后亲手点击次数 · 用于解锁功法（解锁时消耗）',
    },
    {
      id: 'attr-play-time',
      label: '游玩时长',
      value: formatDuration(attrs.playTimeMs),
      valueClass: 'text-[#76d18c]',
      detail: '页面开启时长 · 后台挂机与离线不计',
    },
    {
      id: 'attr-achievement-crit',
      label: '暴击效果加成',
      value: `+${attrs.achievementCritBonus}`,
      valueClass: 'text-[#76d18c]',
      detail: '游玩时长成就奖励 · 累加到暴击倍数',
    },
    {
      id: 'attr-total-click-count',
      label: '累计点击',
      value: `${attrs.totalClickCount} 次`,
      detail: '历世累计点击总数 · 用于解锁成就',
    },
    {
      id: 'attr-rebirth-point-bonus',
      label: '永劫点数加成',
      value: `+${attrs.rebirthPointBonus} 点`,
      detail: '「永劫点数获取」升级 · 每次永劫额外获得',
    },
    {
      id: 'attr-rebirth-start-value',
      label: '永劫初始数值',
      value: attrs.rebirthStartValue.formatChinese(2),
      detail: '成就奖励累加 · 永劫/坍缩后的起始数值',
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-1.5">
      <div className="bg-[#1a1816] border border-[#332e27] rounded-xl px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
        {/* Subtle Section Header with expand toggle */}
        <div
         onClick={() => setIsExpanded((v) => !v)}
          className={`flex items-center justify-between pb-1.5 ${
            isExpanded ? 'mb-1' : ''
          }`}
        >
          <button
            id="attr-panel-toggle"
           
            aria-expanded={isExpanded}
            className="flex items-center gap-1.5  transition-colors cursor-pointer"
          >
            <span >
              数 值 属 性
            </span>
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
         
          </button>
    
        </div>

        {/* Compact attribute list */}
        <div
          className={`flex flex-col divide-y divide-[#262220] overflow-hidden transition-all duration-200 ${
            isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {attributesList.map((item) => (
            <AttributeRow key={item.id} item={item} />
          ))}

          {/* 永劫基础属性（永久累加） */}
          <div className="pt-1.5 mt-1.5 border-t border-[#2d2822]">
            <div className="flex items-center gap-1.5 px-1 pb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5fa8e6]" />
              <span className="text-[10px] font-serif tracking-[0.2em] text-[#8fa6bd]">
                永 劫 基 础 属 性
              </span>
              <span className="text-[10px] font-serif text-[#5f5749]">永久累加</span>
            </div>
            <div className="flex flex-col divide-y divide-[#262220]">
              {rebirthAttrsList.map((item) => (
                <AttributeRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
