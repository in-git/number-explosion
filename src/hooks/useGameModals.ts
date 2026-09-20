import { useDisclosure, Disclosure } from './useDisclosure';

export interface GameModalsState {
  /** 数值商店（功法升级） */
  upgradeShop: Disclosure;
  /** 永劫商店（等级上限 / 解锁坍缩） */
  rebirthShop: Disclosure;
  /** 坍缩商店（数值上限 +100万 等） */
  collapseShop: Disclosure;
  /** 往生店（数值店升级折扣，坍缩店解锁后显示） */
  afterlifeShop: Disclosure;
  /** 排行榜（永劫后解锁） */
  ranking: Disclosure;
  /** 奇趣商店（博弈） */
  funShop: Disclosure;
  /** 永劫确认 */
  rebirth: Disclosure;
  /** 坍缩确认 */
  collapse: Disclosure;
  /** 成就面板（历世累计点击成就） */
  achievements: Disclosure;
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
    settings: useDisclosure(),
  };
}
