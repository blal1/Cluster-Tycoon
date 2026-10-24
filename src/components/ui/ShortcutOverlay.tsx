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
      { keys: ['?'], description: 'Toggle this Sysadmin Hotkey Overlay' },
      { keys: ['Space', '/'], description: 'Open Fuzzy Command Palette' },
      { keys: ['Esc'], description: 'Close modal / cancel tool / deselect node' },
      { keys: ['S'], description: 'Quick-save cluster state to local storage' },
    ],
  },
  {
    category: 'Canvas & Topology Navigation',
    icon: <Navigation size={14} className="text-purple-400" />,
    shortcuts: [
      { keys: ['F'], description: 'Auto-frame and fit all nodes in viewport' },
      { keys: ['+', '='], description: 'Zoom in canvas' },
      { keys: ['-', '_'], description: 'Zoom out canvas' },
      { keys: ['Wheel'], description: 'Smooth zoom around cursor position' },
      { keys: ['Drag Canvas'], description: 'Pan viewport across cluster space' },
    ],
  },
  {
    category: 'Node & Hardware Operations',
    icon: <Cpu size={14} className="text-green-400" />,
    shortcuts: [
      { keys: ['Arrow Keys'], description: 'Directional navigation between adjacent nodes' },
      { keys: ['Shift', 'Arrows'], description: 'Nudge selected node position by 40px grid' },
      { keys: ['V'], description: 'Scale Up (Vertical upgrade: CPU, RAM, RPS)' },
      { keys: ['B'], description: 'Add Server Behind (Horizontal scale worker)' },
      { keys: ['Del', 'Backspace'], description: 'Decommission selected hardware node' },
      { keys: ['Alt + Click'], description: 'Sever & cut traffic wire / connection link' },
    ],
  },
  {
    category: 'Simulation Telemetry & Speed',
    icon: <Play size={14} className="text-yellow-400" />,
    shortcuts: [
      { keys: ['P'], description: 'Toggle Pause / Resume cluster simulation' },
      { keys: ['1'], description: 'Set simulation speed to 1x (Normal)' },
      { keys: ['2'], description: 'Set simulation speed to 2x (Fast-Forward)' },
      { keys: ['4'], description: 'Set simulation speed to 4x (Hyper-Drive)' },
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
        {/* Terminal Header Bar */}
        <div className="ct-shortcut__header">
          <div className="ct-shortcut__title-group">
            <Terminal size={18} className="text-cyan-400" />
            <span className="ct-shortcut__title" id="shortcut-title">
              SYSADMIN_KEYMAP :: PROTOCOL_REFERENCE
            </span>
            <span className="ct-shortcut__cursor">_</span>
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
          Terminal-grade system administrator key bindings. Press <kbd className="ct-key">?</kbd> or{' '}
          <kbd className="ct-key">Esc</kbd> at any time to toggle this reference card.
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

        {/* Terminal Status Footer */}
        <div className="ct-shortcut__footer">
          <span className="text-cyan-400 font-bold">STATUS:</span> OPERATIONAL • PROCEED TO DIRECT CLUSTER MANIPULATION
          <button
            type="button"
            className="ct-btn ct-btn--sm ml-auto"
            onClick={() => {
              audio.playClick();
              onClose();
            }}
          >
            Acknowledge [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};
