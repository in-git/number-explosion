import React from 'react';
import { ModalShell } from './ModalShell';
import { useModals } from '../context/GameContext';
import {
  AFTERLIFE_POINT_EXCHANGE_COST,
  AFTERLIFE_SHOP_UNLOCK_COST,
  ACHIEVEMENTS_UNLOCK_COST,
  TITLE_UNLOCK_COST,
  TRIBULATION_UNLOCK_COST,
} from '../config';
import {
  COLLAPSE_COST,
  TRIBULATION_COST,
  TRIBULATION_MAX_COUNT,
  TRIBULATION_PILL_COST,
  TRIBULATION_POINT_GAIN,
  TRIBULATION_POINT_INTERVAL_MS,
  TRIBULATION_STRIKE_COUNT,
  TRIBULATION_STRIKE_CHANCE,
  UPGRADE_TRIBULATION_POINT_COST,
  VALUE_CAP_BASE,
} from '../utils/gameMath';
import { BigNum } from '../utils/bigNumber';

/** 帮助条目：标题 + 逐条正文 */
interface HelpSection {
  title: string;
  lines: string[];
}

/** 大数统一走中文单位展示 */
const fmt = (n: number): string => BigNum.fromNumber(n).formatChinese(0);

const SECTIONS: HelpSection[] = [
  {
    title: '一 · 起步',
    lines: [
      '点击中央数值即行功一次，数值随之增长。',
      '数值受「数值上限」约束，达上限后不再增长，须提升上限方能继续。',
      '离线挂机也会自动累积：不足 3 分钟不计，最多结算 1 天。',
    ],
  },
  {
    title: '二 · 数值殿',
    lines: [
      '功法以「本世点击次数」解锁（转世后点击清零需重新解锁，除非已购「功法无需解锁」特权）。',
      '解锁门槛：数值升级 10 次 · 自动点击 20 次 · 自动点击频率 40 次 · 连击概率 50 次 · 暴击概率 / 连击倍数 100 次 · 暴击倍数 200 次。',
      '升级消耗随等级倍增；连击与暴击互斥，至多触发其一。',
      '「一键升级」是升级量开关：默认每次升 1 级，切至 MAX 后每次升级直接升到圆满。',
    ],
  },
  {
    title: '三 · 数值上限',
    lines: [
      `初始上限 ${fmt(VALUE_CAP_BASE)}，每次永劫永久 +${fmt(1e6)}。`,
      '另可于坍缩殿逐级购得更高上限。',
    ],
  },
  {
    title: '四 · 永劫',
    lines: [
      '数值达 100 万即可永劫：按「数值 ÷ 100 万」换取永劫点数（受永劫点数上限约束）。',
      '转世后：数值回到起始数值、本世点击清零、数值殿等级清零；累计点击、成就、称号与永劫殿等级永久保留。',
    ],
  },
  {
    title: '五 · 坍缩殿',
    lines: [
      `消耗 ${COLLAPSE_COST} 点永劫点数即可坍缩一次。`,
      '永劫点数可按 3:1 兑换坍缩点数（单次消耗随累计兑换次数递增）。',
      '坍缩点数用于：提升数值上限、强化「永劫爆炸」、抬高各项功法的等级上限。',
      `殿内花费 ${AFTERLIFE_SHOP_UNLOCK_COST} 点坍缩点数即可解锁「往生殿」。`,
    ],
  },
  {
    title: '六 · 往生殿',
    lines: [
      `每 ${AFTERLIFE_POINT_EXCHANGE_COST} 点坍缩点数可兑换 1 点往生点。`,
      `「渡劫」特权 ${TRIBULATION_UNLOCK_COST} 点往生点：解锁后方可登临天雷峰。`,
      `渡劫丹 ${TRIBULATION_PILL_COST} 点往生点：一颗可保一道雷劫必定通过。`,
    ],
  },
  {
    title: '七 · 渡劫（天雷峰）',
    lines: [
      `每次渡劫耗 ${TRIBULATION_COST} 点往生点，共 ${TRIBULATION_STRIKE_COUNT} 道雷劫，无丹时每道 ${Math.round(TRIBULATION_STRIKE_CHANCE * 100)}% 通过。`,
      `累计渡劫上限 ${TRIBULATION_MAX_COUNT} 次；成功则飞升成仙（收益按次方放大），失败则数值尽失。`,
      `飞升后开启「渡劫殿」，此后数值殿 / 永劫殿每升 1 级另需 ${UPGRADE_TRIBULATION_POINT_COST} 点渡劫点。`,
    ],
  },
  {
    title: '八 · 渡劫殿',
    lines: [
      `渡劫点每 ${TRIBULATION_POINT_INTERVAL_MS / 1000} 秒自动产出 ${TRIBULATION_POINT_GAIN} 点；另有「永劫点」按 30 秒起的周期自动结算。`,
      '数值重置丹每炉 1 分钟：重置数值殿等级，消耗回到初始曲线，已有效果全部保留。',
      '永劫重置丹每炉 3 分钟：作用于永劫殿，效果同上。',
    ],
  },
  {
    title: '九 · 成就 / 称号 / 排行',
    lines: [
      `成就系统：数值殿花费 ${fmt(ACHIEVEMENTS_UNLOCK_COST)} 数值开启，达成后奖励永久生效。`,
      `称号系统：数值殿花费 ${fmt(TITLE_UNLOCK_COST)} 数值开启，按历世最高数值自动晋升境界称号。`,
      '排行：消耗 1 点永劫点数解锁，登录并选择大区后可上传成绩、查看天榜。',
    ],
  },
];

export const HelpModal: React.FC = () => {
  const modals = useModals();

  return (
    <ModalShell
      isOpen={modals.help.isOpen}
      onClose={modals.help.close}
      title="帮 助"
      subtitle="—— 修 真 指 引 · 由 浅 入 深 ——"
    >
      <div className="flex flex-col gap-2.5">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-2.5"
          >
            <div className="text-[11px] sm:text-xs font-serif font-bold tracking-[0.14em] text-[#e8cf9a] mb-1.5">
              {section.title}
            </div>
            <div className="flex flex-col gap-1 text-[11px] font-serif leading-relaxed text-[#948a7a]">
              {section.lines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-2.5 text-[11px] font-serif leading-relaxed text-[#8f8574]">
          若需调整数值或点数，请移步「设置 → 修改数据」；若需清空存档重来，请移步「设置 → 重修道途」。
        </div>
      </div>
    </ModalShell>
  );
};
