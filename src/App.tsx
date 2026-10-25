import React, { useState, useEffect } from 'react';
import { useAppStore, useSimulationRunner, dispatch, saveCluster } from './store/gameStore';
import { audio } from './audio/proceduralAudio';
import { TopBar } from './components/ui/TopBar';
import { ClusterCanvas } from './components/canvas/ClusterCanvas';
import { SideRail } from './components/ui/SideRail';
import { InvoiceModal } from './components/ui/InvoiceModal';
import { CommandPalette } from './components/ui/CommandPalette';
import { ShortcutOverlay } from './components/ui/ShortcutOverlay';
import { ClusterMatrixModal } from './components/ui/ClusterMatrixModal';
import { LiveAnnouncer } from './components/ui/LiveAnnouncer';
import { StatusBar } from './components/ui/StatusBar';
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
  const [matrixOpen, setMatrixOpen] = useState(false);

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

  // Tactile audio feedback on interactive element hover
  useEffect(() => {
    let lastHovered: Element | null = null;
    const handleMouseOver = (e: MouseEvent) => {
      const btn = (e.target as Element | null)?.closest('button, [role="button"], a');
      if (btn && btn !== lastHovered) {
        lastHovered = btn;
        audio.playHover();
      }
    };
    document.addEventListener('mouseover', handleMouseOver);
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, []);

  // Periodic autosave while playing
  useEffect(() => {
    if (screen !== 'playing') return;
    const interval = window.setInterval(() => {
      saveCluster();
    }, 20000);
    return () => window.clearInterval(interval);
  }, [screen]);

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

      // Alt + A toggles Accessible Cluster Matrix anywhere
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setMatrixOpen((prev) => !prev);
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
    <div
      className={`ct-app ${settings.highContrast ? 'ct-high-contrast' : ''} ${
        settings.largeText ? 'ct-large-text' : ''
      }`}
    >
      {/* Screen Reader and Spoken Telemetry Announcer */}
      <LiveAnnouncer />

      {/* Optional CRT Phosphor Scanline Overlay (disabled in high-contrast mode for maximal clarity) */}
      {settings.crtScanlines && !settings.highContrast && (
        <div className="ct-crt-overlay ct-deco" aria-hidden="true" />
      )}

      {/* Primary Stage */}
      <div className="ct-stage">
        {screen === 'menu' && <MainMenu />}
        {screen === 'tutorial' && <SystemManual />}
        {screen === 'settings' && <SettingsScreen />}
        {screen === 'gameover' && <GameOverScreen />}

        {screen === 'playing' && (
          <div className="ct-game">
            <TopBar
              onOpenShortcuts={() => setShortcutsOpen(true)}
              onOpenMatrix={() => setMatrixOpen(true)}
            />
            <div className="ct-game__canvas">
              <ClusterCanvas />
            </div>
            <SideRail />
            <StatusBar
              onOpenShortcuts={() => setShortcutsOpen(true)}
              onOpenMatrix={() => setMatrixOpen(true)}
            />

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

            {/* Screen Reader & Keyboard Accessible Cluster Matrix Modal (Alt + A) */}
            <ClusterMatrixModal
              open={matrixOpen}
              onClose={() => setMatrixOpen(false)}
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
