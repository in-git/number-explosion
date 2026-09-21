import { useDisclosure, Disclosure } from './useDisclosure';

export interface GameModalsState {
  /** 数值商殿（功法升级） */
  upgradeShop: Disclosure;
  /** 永劫商殿（等级上限 / 解锁坍缩） */
  rebirthShop: Disclosure;
  /** 坍缩商殿（数值上限 +100万 等） */
  collapseShop: Disclosure;
  /** 往生殿（数值殿升级折扣，坍缩殿解锁后显示） */
  afterlifeShop: Disclosure;
  /** 排行榜（永劫后解锁） */
  ranking: Disclosure;
  /** 奇趣商殿（博弈） */
  funShop: Disclosure;
  /** 永劫确认 */
  rebirth: Disclosure;
  /** 坍缩确认 */
  collapse: Disclosure;
  /** 成就面板（历世累计点击成就） */
  achievements: Disclosure;
  /** 称号详情（当前称号 + 最近的几个修仙等级） */
  title: Disclosure;
  /** 设置面板（设定当前数值 / 重修道途） */
  settings: Disclosure;
}

export function useGameModals(): GameModalsState {
  return {
    upgradeShop: useDisclosure(),
    rebirthShop: useDisclosure(),
    collapseShop: useDisclosure(),
    afterlifeShop: useDisclosure(),
    ranking: useDisclosure(),
    funShop: useDisclosure(),
    rebirth: useDisclosure(),
    collapse: useDisclosure(),
    achievements: useDisclosure(),
    title: useDisclosure(),
    settings: useDisclosure(),
  };
}
