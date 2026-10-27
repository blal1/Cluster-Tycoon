import React, { useEffect, useRef } from 'react';
import { audio } from '../../audio/proceduralAudio';
import { Terminal, X, Command, Cpu, Navigation, Zap, Play } from 'lucide-react';

interface ShortcutGroup {
  category: string;
  icon: React.ReactNode;
  shortcuts: Array<{
    keys: string[];
    description: string;
    note?: string;
  }>;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'Global & System',
    icon: <Command size={14} className="text-cyan-400" />,
    shortcuts: [
      { keys: ['?'], description: 'Open keyboard shortcuts overlay' },
      { keys: ['Alt', 'A'], description: 'Open Cluster Topology Matrix' },
      { keys: ['Alt', 'I'], description: 'Open Incidents & Chaos Console' },
      { keys: ['Space', '/'], description: 'Open command search palette' },
      { keys: ['Esc'], description: 'Close active modal / deselect node' },
      { keys: ['S'], description: 'Save cluster snapshot to local storage' },
    ],
  },
  {
    category: 'Canvas Navigation',
    icon: <Navigation size={14} className="text-purple-400" />,
    shortcuts: [
      { keys: ['F'], description: 'Fit cluster topology in viewport' },
      { keys: ['+', '='], description: 'Zoom in canvas' },
      { keys: ['-', '_'], description: 'Zoom out canvas' },
      { keys: ['Wheel'], description: 'Smooth zoom at cursor position' },
      { keys: ['Drag Canvas'], description: 'Pan viewport' },
    ],
  },
  {
    category: 'Node & Hardware Operations',
    icon: <Cpu size={14} className="text-green-400" />,
    shortcuts: [
      { keys: ['Arrow Keys'], description: 'Directional navigation between adjacent nodes' },
      { keys: ['Shift', 'Arrows'], description: 'Nudge selected node position by 40px grid' },
      { keys: ['V'], description: 'Vertical scale (Upgrade CPU, RAM, or storage)' },
      { keys: ['B'], description: 'Attach downstream server node' },
      { keys: ['Del', 'Backspace'], description: 'Decommission selected node' },
      { keys: ['Alt + Click'], description: 'Sever connection link' },
    ],
  },
  {
    category: 'Simulation Controls',
    icon: <Play size={14} className="text-yellow-400" />,
    shortcuts: [
      { keys: ['P'], description: 'Pause or resume simulation' },
      { keys: ['1'], description: 'Set simulation speed to 1x' },
      { keys: ['2'], description: 'Set simulation speed to 2x' },
      { keys: ['4'], description: 'Set simulation speed to 4x' },
    ],
  },
];

interface ShortcutOverlayProps {
  open: boolean;
  onClose: () => void;
}

export const ShortcutOverlay: React.FC<ShortcutOverlayProps> = ({ open, onClose }) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      audio.playSelect();
      audio.triggerVibrate(20);
      modalRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        audio.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ct-bill-scrim" onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className="ct-shortcut-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="ct-shortcut__header">
          <div className="ct-shortcut__title-group">
            <Terminal size={18} className="text-cyan-400" />
            <span className="ct-shortcut__title" id="shortcut-title">
              Keyboard Shortcuts & Controls
            </span>
          </div>
          <button
            type="button"
            className="ct-shortcut__close-btn"
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            title="Close overlay (Esc or ?)"
          >
            <X size={16} />
            <span className="ct-sr-only">Close</span>
          </button>
        </div>

        {/* Subtitle */}
        <p className="ct-shortcut__lead">
          Keyboard controls for navigating topology, provisioning nodes, and operating the cluster. Press <kbd className="ct-key">?</kbd> or{' '}
          <kbd className="ct-key">Esc</kbd> at any time to toggle.
        </p>

        {/* Keybinding Grid */}
        <div className="ct-shortcut__grid">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="ct-shortcut__section">
              <div className="ct-shortcut__category">
                {group.icon}
                <span>{group.category}</span>
              </div>
              <ul className="ct-shortcut__list">
                {group.shortcuts.map((item, idx) => (
                  <li key={idx} className="ct-shortcut__row">
                    <span className="ct-shortcut__desc">{item.description}</span>
                    <div className="ct-shortcut__keys">
                      {item.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <kbd className="ct-key">{k}</kbd>
                          {kIdx < item.keys.length - 1 && <span className="ct-key__or">/</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="ct-shortcut__footer">
          <span className="text-gray-400 text-xs">Press <kbd className="ct-key">Esc</kbd> or click outside to dismiss.</span>
          <button
            type="button"
            className="ct-btn ct-btn--sm ml-auto"
            onClick={() => {
              audio.playClick();
              onClose();
            }}
          >
            Close [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};
