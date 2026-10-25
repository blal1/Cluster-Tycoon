import React from 'react';
import { useAppStore, calculateScore } from '../../store/gameStore';
import {
  formatCurrency,
  formatRps,
  formatSecondsTime,
  NODE_TEMPLATES,
} from '../../constants/gameConfig';
import { Terminal, Shield, Keyboard, Activity } from 'lucide-react';

interface StatusBarProps {
  onOpenShortcuts?: () => void;
  onOpenMatrix?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ onOpenShortcuts, onOpenMatrix }) => {
  const sim = useAppStore((s) => s.sim);
  const score = calculateScore(sim);

  const activeToolLabel =
    sim.activeTool.kind === 'select'
      ? 'SELECT'
      : sim.activeTool.kind === 'connect'
      ? 'LINK_CABLE'
      : NODE_TEMPLATES[sim.activeTool.kind].short;

  const isPlacing = sim.activeTool.kind !== 'select' && sim.activeTool.kind !== 'connect';
  const hasMeltdown = Object.values(sim.nodes).some((n) => n.status === 'meltdown');
  const hasCritical = Object.values(sim.nodes).some((n) => n.status === 'critical');

  return (
    <div className="ct-game__statusbar" role="status" aria-label="System status bar">
      {hasMeltdown ? (
        <span className="flex items-center gap-1.5 font-bold text-red-500 animate-pulse">
          <Terminal size={13} />
          <span>[⚡ MELTDOWN]</span>
        </span>
      ) : hasCritical ? (
        <span className="flex items-center gap-1.5 font-bold text-yellow-400">
          <Terminal size={13} />
          <span>[▲ HIGH LOAD]</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5 font-bold text-cyan-400">
          <Terminal size={13} />
          <span>[✓ SYS_OK]</span>
        </span>
      )}

      <span>
        FUNDS: <strong className="text-yellow-300">{formatCurrency(sim.economy.cashUsd)}</strong>
      </span>

      <span>
        SERVED: <strong className="text-green-400">{formatRps(sim.servedRps)}</strong>
      </span>

      {sim.droppedRps > 0 && (
        <span className="text-red-400 font-bold">
          [✕ DROPPED: {formatRps(sim.droppedRps)}]
        </span>
      )}

      <span>
        INVOICE_IN: <strong>{formatSecondsTime(sim.economy.secondsToBill)}</strong>
      </span>

      <span>
        TOOL: <strong className="text-purple-400">{activeToolLabel}</strong>{' '}
        <span className="text-xs opacity-70">({isPlacing ? 'DEPLOY' : 'NAV'})</span>
      </span>

      <span>
        SCORE: <strong className="text-yellow-400">{score}</strong>
      </span>

      <span className="ml-auto flex items-center gap-2">
        {onOpenMatrix && (
          <button
            type="button"
            className="ct-statusbar__hotkey-pill"
            onClick={onOpenMatrix}
            title="Open Accessible Cluster Matrix (Alt + A)"
            aria-label="Open Accessible Cluster Matrix (Alt + A)"
          >
            <Activity size={12} className="inline mr-1 text-cyan-300" />
            <kbd>Alt + A</kbd> A11y Matrix
          </button>
        )}

        <button
          type="button"
          className="ct-statusbar__hotkey-pill"
          onClick={onOpenShortcuts}
          title="Open Shortcut Overlay (Shift + ?)"
        >
          <Keyboard size={12} className="inline mr-1" />
          <kbd>Shift + ?</kbd> Hotkeys
        </button>
      </span>
    </div>
  );
};
