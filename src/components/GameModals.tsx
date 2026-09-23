import React from 'react';
import { useModals } from '../context/GameContext';
import { ModalShell } from './ModalShell';
import { FunShop } from './FunShop';
import { UpgradesList } from './UpgradesList';
import { RebirthShop } from './RebirthShop';
import { CollapseShop } from './CollapseShop';
import { Ranking } from './Ranking';
import { AchievementsModal } from './AchievementsModal';
import { RebirthModal } from './RebirthModal';
import { CollapseModal } from './CollapseModal';
import { AfterlifeShop } from './AfterlifeShop';
import { TribulationModal } from './TribulationModal';
import { TribulationHall } from './TribulationHall';
import { TitleModal } from './TitleModal';
import { SettingsModal } from './SettingsModal';
import { UserCenter } from './UserCenter';
import { HelpModal } from './HelpModal';
import { EditDataModal } from './EditDataModal';
import { ResetConfirmModal } from './ResetConfirmModal';
import { WipeConfirmModal } from './WipeConfirmModal';
import { FirstEntryModal } from './FirstEntryModal';
import { GameClearedModal } from './GameClearedModal';

/**
 * 全部弹窗：数值商殿 / 永劫商殿 / 坍缩商殿 / 奇趣商殿 / 往生殿 / 渡劫 / 永劫 / 坍缩 / 成就 / 称号 / 设置
 *
 * 此处只负责「摆弹窗」：各自的开关状态取自 useModals，内容组件自行通过
 * useGameData / useGameActions 取用所需数据与操作，无需逐层透传 props。
 */
export const GameModals: React.FC = () => {
  const modals = useModals();

  return (
    <>
      {/* 数值商殿 Modal */}
      <ModalShell
        isOpen={modals.upgradeShop.isOpen}
        onClose={modals.upgradeShop.close}
        title="数 值 殿"
        subtitle="—— 先 启 封 印 · 方 可 习 炼 ——"
      >
        <UpgradesList />
      </ModalShell>

      {/* 永劫商殿 Modal */}
      <ModalShell
        isOpen={modals.rebirthShop.isOpen}
        onClose={modals.rebirthShop.close}
        title="永 劫 殿"
      >
        <RebirthShop />
      </ModalShell>

      {/* 坍缩商殿 Modal */}
      <ModalShell
        isOpen={modals.collapseShop.isOpen}
        onClose={modals.collapseShop.close}
        title="坍 缩 殿"
        subtitle="—— 一 元 复 始 · 上 限 突 破 ——"
      >
        <CollapseShop />
      </ModalShell>

      {/* 排行 Modal */}
      <ModalShell
        isOpen={modals.ranking.isOpen}
        onClose={modals.ranking.close}
        title="排 行"
        subtitle="—— 天 道 有 榜 · 各 归 其 位 ——"
      >
        <Ranking />
      </ModalShell>

      {/* 奇趣商殿 Modal */}
      <ModalShell
        isOpen={modals.funShop.isOpen}
        onClose={modals.funShop.close}
        title="奇 趣 殿 · 博 弈 造 化"
      >
        <FunShop />
      </ModalShell>

      {/* 永劫 Modal */}
      <RebirthModal />

      {/* 往生殿 Modal */}
      <ModalShell
        isOpen={modals.afterlifeShop.isOpen}
        onClose={modals.afterlifeShop.close}
        title="往生殿"
        subtitle="永劫殿升级消耗折扣 · 往生点兑换"
      >
        <AfterlifeShop />
      </ModalShell>

      {/* 渡劫 · 天雷峰 Modal */}
      <ModalShell
        isOpen={modals.tribulation.isOpen}
        onClose={modals.tribulation.close}
        title="渡 劫"
        subtitle="—— 天 雷 加 身 · 九 死 一 生 ——"
      >
        <TribulationModal />
      </ModalShell>

      {/* 渡劫殿 Modal：渡劫成功（飞升成仙）后开启，耗时炼制重置丹 */}
      <ModalShell
        isOpen={modals.tribulationHall.isOpen}
        onClose={modals.tribulationHall.close}
        title="渡 劫 殿"
        subtitle="—— 炉 火 不 息 · 丹 成 重 置 ——"
      >
        <TribulationHall />
      </ModalShell>

      {/* 坍缩 Modal */}
      <CollapseModal />

      {/* 成就 Modal */}
      <AchievementsModal />

      {/* 称号详情 Modal */}
      <ModalShell
        isOpen={modals.title.isOpen}
        onClose={modals.title.close}
        title="称 号"
        subtitle="—— 天 道 授 名 · 各 有 其 位 ——"
      >
        <TitleModal />
      </ModalShell>

      {/* 设置 Modal（个人中心 / 帮助 / B 站 / 开源地址 四入口） */}
      <SettingsModal />

      {/* 个人中心 Modal：未登录时复用排行榜的登录注册面板 */}
      <ModalShell
        isOpen={modals.userCenter.isOpen}
        onClose={modals.userCenter.close}
        title="个 人 中 心"
        subtitle="—— 道 号 与 历 世 之 迹 ——"
      >
        <UserCenter />
      </ModalShell>

      {/* 帮助 / 重修确认 / 数据重置：各自独立弹窗，叠在设置之上，关闭后回到设置 */}
      <HelpModal />
      <ResetConfirmModal />
      <WipeConfirmModal />

      {/* 修改数据：入口已从设置面板隐藏，弹窗保留（需要时把入口挂回 SettingsModal 即可） */}
      <EditDataModal />

      {/* 首次进入：渡劫警示（3 秒后方可关闭） */}
      <FirstEntryModal />

      {/* 通关提示：数值达 1ssr 时弹一次，可随时关闭，不影响其他功能 */}
      <GameClearedModal />
    </>
  );
};
