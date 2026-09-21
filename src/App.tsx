import React from 'react';
import { AppBackground } from './components/AppBackground';
import { AppHeader } from './components/AppHeader';
import { CoreNumberDisplay } from './components/CoreNumberDisplay';
import { AttributesPanel } from './components/AttributesPanel';
import { ShopEntries } from './components/ShopEntries';
import { GameModals } from './components/GameModals';
import { OfflineGainModal } from './components/OfflineGainModal';
import { ToastContainer } from './components/ToastContainer';
import {
  GameProvider,
  useFloatingTextsApi,
  useGameActions,
  useGameData,
  useToastsApi,
} from './context/GameContext';

export default function App() {
  return (
    <GameProvider>
      <GameShell />
    </GameProvider>
  );
}

/** 需要读取全局状态的界面层，放在 GameProvider 内部 */
function GameShell() {
  const { toasts, dismissToast } = useToastsApi();
  const { floatingTexts } = useFloatingTextsApi();
  const { state, currentBigNum, offlineReport } = useGameData();
  const { handleUserClick, dismissOfflineReport } = useGameActions();

  return (
    <div className="relative min-h-screen bg-[#141210] text-[#e3ded4] font-serif flex flex-col">
      <AppBackground />
      <AppHeader />

      {/* 布局顺序: 1 数值 → 2 属性 → 3 各商殿入口 */}
      <main className="relative z-10 flex-1 flex flex-col items-center">
        <CoreNumberDisplay
          currentValue={currentBigNum}
          floatingTexts={floatingTexts}
          onClick={handleUserClick}
        />

        <AttributesPanel state={state} />

        <ShopEntries />
      </main>

      <GameModals />

      {/* 挂机收益弹窗：离线 / 切后台回来后展示本次挂机收益 */}
      <OfflineGainModal report={offlineReport} onClose={dismissOfflineReport} />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
