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
  /** 渡劫（天雷峰：成功率 + 渡劫丹） */
  tribulation: Disclosure;
  /** 渡劫殿（渡劫成功后开启：耗费时间炼制重置丹） */
  tribulationHall: Disclosure;
  /** 称号详情（当前称号 + 最近的几个修仙等级） */
  title: Disclosure;
  /** 设置面板（个人中心 / 作者 / 帮助 / 修改数据 四个入口） */
  settings: Disclosure;
  /** 个人中心（账号信息；未登录时复用登录注册面板） */
  userCenter: Disclosure;
  /** 作者（署名与作品信息） */
  author: Disclosure;
  /** 帮助文档（玩法指引） */
  help: Disclosure;
  /** 修改数据（数值 / 点数设定与重置） */
  editData: Disclosure;
  /** 首次进入：渡劫警示（3 秒后方可关闭） */
  firstEntry: Disclosure;
  /** 通关提示（数值达 1ssr 时弹一次，可随时关闭） */
  cleared: Disclosure;
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
    tribulation: useDisclosure(),
    tribulationHall: useDisclosure(),
    title: useDisclosure(),
    settings: useDisclosure(),
    userCenter: useDisclosure(),
    author: useDisclosure(),
    help: useDisclosure(),
    editData: useDisclosure(),
    firstEntry: useDisclosure(),
    cleared: useDisclosure(),
  };
}
