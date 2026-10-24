import React, { useState, useEffect } from 'react';
import { useAppStore, useSimulationRunner, dispatch, saveCluster } from './store/gameStore';
import { audio } from './audio/proceduralAudio';
import { TopBar } from './components/ui/TopBar';
import { ClusterCanvas } from './components/canvas/ClusterCanvas';
import { SideRail } from './components/ui/SideRail';
import { InvoiceModal } from './components/ui/InvoiceModal';
import { CommandPalette } from './components/ui/CommandPalette';
import { ShortcutOverlay } from './components/ui/ShortcutOverlay';
import { MainMenu } from './components/screens/MainMenu';
import { SystemManual } from './components/screens/SystemManual';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { GameOverScreen } from './components/screens/GameOverScreen';

export default function App() {
  const screen = useAppStore((s) => s.screen);
  const sim = useAppStore((s) => s.sim);
  const settings = useAppStore((s) => s.settings);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Hook simulation tick loop
  useSimulationRunner();

  // Initialize audio on first user gesture
  useEffect(() => {
    const handleGesture = () => {
      audio.init();
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };

    window.addEventListener('pointerdown', handleGesture);
    window.addEventListener('keydown', handleGesture);

    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

  // Sync title with simulation state
  useEffect(() => {
    if (screen === 'playing') {
      if (sim.economy.pendingBill) {
        document.title = 'CLUSTER TYCOON :: INVOICE DUE';
      } else if (sim.speed === 0) {
        document.title = 'CLUSTER TYCOON :: PAUSED';
      } else {
        document.title = 'CLUSTER TYCOON :: RUNNING';
      }
    } else if (screen === 'gameover') {
      document.title = 'CLUSTER TYCOON :: POST-MORTEM';
    } else {
      document.title = 'Cluster Tycoon :: Cloud Infrastructure Simulation';
    }
  }, [screen, sim.economy.pendingBill, sim.speed]);

  // Global hotkeys (Shift + ?, Space, P, S, 1, 2, 4, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isInput) return;

      // Shift + ? or '?' toggles the Shortcut Overlay anywhere
      if ((e.key === '?' || (e.shiftKey && (e.key === '/' || e.code === 'Slash'))) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      if (screen !== 'playing') return;

      // Spacebar or '/' opens Command Palette (when not holding modifier)
      if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      } else if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      // Quick hotkeys in playing screen:
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          dispatch({ type: 'togglePause' });
          return;
        }

        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          const ok = saveCluster();
          if (ok) {
            audio.playSelect();
            audio.triggerVibrate(20);
          }
          return;
        }

        if (e.key === '1') {
          e.preventDefault();
          dispatch({ type: 'setSpeed', speed: 1 });
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          dispatch({ type: 'setSpeed', speed: 2 });
          return;
        }
        if (e.key === '4') {
          e.preventDefault();
          dispatch({ type: 'setSpeed', speed: 4 });
          return;
        }

        if ((e.key === 'v' || e.key === 'V') && sim.selectedNodeId) {
          e.preventDefault();
          dispatch({ type: 'scaleVertical', nodeId: sim.selectedNodeId });
          return;
        }

        if ((e.key === 'b' || e.key === 'B') && sim.selectedNodeId) {
          e.preventDefault();
          dispatch({ type: 'addServerBehind', nodeId: sim.selectedNodeId });
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, sim.selectedNodeId]);

  return (
    <div className="ct-app">
      {/* Optional CRT Phosphor Scanline Overlay */}
      {settings.crtScanlines && <div className="ct-crt-overlay ct-deco" aria-hidden="true" />}

      {/* Primary Stage */}
      <div className="ct-stage">
        {screen === 'menu' && <MainMenu />}
        {screen === 'tutorial' && <SystemManual />}
        {screen === 'settings' && <SettingsScreen />}
        {screen === 'gameover' && <GameOverScreen />}

        {screen === 'playing' && (
          <div className="ct-game">
            <TopBar onOpenShortcuts={() => setShortcutsOpen(true)} />
            <div className="ct-game__canvas">
              <ClusterCanvas />
            </div>
            <SideRail />

            {/* AWS Monthly Bill Modal */}
            {sim.economy.pendingBill && (
              <InvoiceModal
                bill={sim.economy.pendingBill}
                cashUsd={sim.economy.cashUsd}
              />
            )}

            {/* Command Palette */}
            <CommandPalette
              open={paletteOpen}
              onClose={() => setPaletteOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Sysadmin Shortcut Overlay (Shift + ?) */}
      <ShortcutOverlay
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
