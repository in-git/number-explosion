import React from 'react';
import { AppBackground } from './components/AppBackground';
import { AppHeader } from './components/AppHeader';
import { CoreNumberDisplay } from './components/CoreNumberDisplay';
import { AttributesPanel } from './components/AttributesPanel';
import { ShopEntries } from './components/ShopEntries';
import { GameModals } from './components/GameModals';
import { ToastContainer } from './components/ToastContainer';
import { useToasts } from './hooks/useToasts';
import { useFloatingTexts } from './hooks/useFloatingTexts';
import { useGameModals } from './hooks/useGameModals';
import { useGameState } from './hooks/useGameState';

export default function App() {
  const { toasts, addToast, dismissToast } = useToasts();
  const { floatingTexts, addFloatingText } = useFloatingTexts();
  const modals = useGameModals();
  const game = useGameState({ addToast, addFloatingText });

  return (
    <div className="relative min-h-screen bg-[#141210] text-[#e3ded4] font-serif flex flex-col">
      <AppBackground />
      <AppHeader />

      {/* 布局顺序: 1 数值 → 2 属性 → 3 各商店入口 */}
      <main className="relative z-10 flex-1 flex flex-col items-center">
        <CoreNumberDisplay
          currentValue={game.currentBigNum}
          floatingTexts={floatingTexts}
          onClick={game.handleUserClick}
        />

        <AttributesPanel state={game.state} />

        <ShopEntries
          state={game.state}
          canRebirth={game.canRebirth}
          canCollapse={game.canCollapse}
          onOpenUpgradeShop={modals.upgradeShop.open}
          onOpenRebirthShop={modals.rebirthShop.open}
          onOpenFunShop={modals.funShop.open}
          onOpenCollapseShop={modals.collapseShop.open}
          onOpenRebirthModal={modals.rebirth.open}
          onOpenAchievementsModal={modals.achievements.open}
          onOpenSettingsModal={modals.settings.open}
        />
      </main>

      <GameModals
        modals={modals}
        state={game.state}
        currentValue={game.currentBigNum}
        collapseGain={game.collapseGain}
        onUnlockUpgrade={game.handleUnlockUpgrade}
        onUpgradeLevel={game.handleUpgradeLevel}
        onBuyLevelCap={game.handleBuyLevelCap}
        onBuyRebirthBaseAttr={game.handleBuyRebirthBaseAttr}
        onUnlockCollapse={game.handleUnlockCollapse}
        onBuyValueCap={game.handleBuyValueCap}
        onBuyRebirthPointLevel={game.handleBuyRebirthPointLevel}
        onGambleSettle={game.handleGambleSettle}
        onConfirmRebirth={game.confirmRebirth}
        onConfirmCollapse={game.confirmCollapse}
        onSetDebugValue={game.debugSetValue}
        onResetProgress={game.resetProgress}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
