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
  /**
   * 本次实际扣除的值（连购时为这批的总和）：
   * 传了就在次数后以括号追加（如「3次·(1.4万)」），null / 0 则不展示。
   * 数值殿传 BigNum；各点数殿（永劫点 / 坍缩点 / 往生点）直接传 number 亦可
   */
  cost?: BigNum | number | null;
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
  cost = null,
  maxed = false,
  singleDisabled = false,
  bulkDisabled,
  onSingle,
  onBulk,
  longPress = true,
  ariaLabel,
}) => {
  if (maxed) {
    return (
      <UpgradeButton disabled dashedBorder>
        max
      </UpgradeButton>
    );
  }

  const isBulk = mode !== '1';
  const disabled = isBulk ? (bulkDisabled ?? bulkLevels <= 0) : singleDisabled;
  const label = isBulk ? `${BigNum.fromNumber(bulkLevels).formatChinese(0)}次` : '1次';
  // 买不动（0 次）时不展示花费，避免出现「0次·(0)」这种噪声
  const costNum = typeof cost === 'number' ? BigNum.fromNumber(cost) : cost;
  const costText = costNum && costNum.gt(0) ? costNum.formatChinese(2) : null;

  const trigger = () => {
    if (disabled) return;
    if (isBulk) onBulk(bulkLevels);
    else onSingle();
  };

  const content = (
    <>
      {label}
      {costText && <span className="opacity-75">·({costText})</span>}
    </>
  );

  return longPress ? (
    <UpgradeButton
      id={id}
      disabled={disabled}
      onPress={trigger}
      ariaLabel={ariaLabel}
      dashedBorder
    >
      {content}
    </UpgradeButton>
  ) : (
    <UpgradeButton
      id={id}
      disabled={disabled}
      onClick={trigger}
      ariaLabel={ariaLabel}
      dashedBorder
    >
      {content}
    </UpgradeButton>
  );
};
