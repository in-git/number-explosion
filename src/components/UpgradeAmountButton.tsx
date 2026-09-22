import React from 'react';
import { BigNum } from '../utils/bigNumber';
import type { UpgradeAmountMode } from '../utils/gameMath';
import { UpgradeButton } from './UpgradeButton';

interface UpgradeAmountButtonProps {
  id?: string;
  /** 本殿当前的升级量模式（由「一键升级」开关决定） */
  mode: UpgradeAmountMode;
  /** 连购模式（一半 / max）下本次会购买的数量 */
  bulkLevels: number;
  /** 已满级：显示 max 并禁用 */
  maxed?: boolean;
  /** 「1」模式下的可用性（沿用各殿原有的单次购买判断） */
  singleDisabled?: boolean;
  /** 连购模式下的可用性（缺省按 bulkLevels > 0 判断） */
  bulkDisabled?: boolean;
  /** 「1」模式：购买 1 次 */
  onSingle: () => void;
  /** 「一半」/「max」：按 bulkLevels 次一次买到位 */
  onBulk: (levels: number) => void;
  /** 是否支持长按连发（默认 true；兑换类走单击，传 false） */
  longPress?: boolean;
  ariaLabel?: string;
}

/**
 * 通用「升级 / 一键升级」按钮：
 * 文案、可用性、结算数量统一由升级量模式决定 ——
 * 「1」恒买 1 次；「一半」「max」买 bulkLevels 次（各殿只需给出两种动作即可）。
 */
export const UpgradeAmountButton: React.FC<UpgradeAmountButtonProps> = ({
  id,
  mode,
  bulkLevels,
  maxed = false,
  singleDisabled = false,
  bulkDisabled,
  onSingle,
  onBulk,
  longPress = true,
  ariaLabel,
}) => {
  if (maxed) return <UpgradeButton disabled>max</UpgradeButton>;

  const isBulk = mode !== '1';
  const disabled = isBulk ? (bulkDisabled ?? bulkLevels <= 0) : singleDisabled;
  const label = isBulk ? `${BigNum.fromNumber(bulkLevels).formatChinese(0)}次` : '1次';

  const trigger = () => {
    if (disabled) return;
    if (isBulk) onBulk(bulkLevels);
    else onSingle();
  };

  return longPress ? (
    <UpgradeButton id={id} disabled={disabled} onPress={trigger} ariaLabel={ariaLabel}>
      {label}
    </UpgradeButton>
  ) : (
    <UpgradeButton id={id} disabled={disabled} onClick={trigger} ariaLabel={ariaLabel}>
      {label}
    </UpgradeButton>
  );
};
