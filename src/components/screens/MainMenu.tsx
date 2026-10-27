import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, dispatch, loadCluster, getHighScore } from '../../store/gameStore';
import { GameDifficulty } from '../../types/game';
import { audio } from '../../audio/proceduralAudio';
import {
  Play,
  RotateCcw,
  BookOpen,
  Settings,
  Server,
  Trophy,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';

export const MainMenu: React.FC = () => {
  const hasSave = useAppStore((s) => s.hasSave);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('normal');
  const highScore = getHighScore();

  const newClusterRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    newClusterRef.current?.focus();
  }, []);

  const handleStartNew = () => {
    audio.init();
    audio.playDeploy();
    audio.triggerVibrate([30, 40, 50]);
    dispatch({ type: 'startNewCluster', difficulty });
  };

  const handleLoadBackup = () => {
    audio.init();
    const success = loadCluster();
    if (success) {
      audio.playSelect();
    } else {
      audio.playDenied();
    }
  };

  return (
    <div className="ct-app__center ct-app__center--menu">
      <nav className="ct-menu" aria-labelledby="menu-title">
        {/* Left Hero Column */}
        <div className="ct-menu__hero">
          <p className="ct-menu__eyebrow">
            Distributed Systems & Infrastructure Simulation
          </p>
          <h1 className="ct-menu__title" id="menu-title">
            Cluster Tycoon
          </h1>
          <hr className="ct-menu__rule" />
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Version 0.2.0</span>
            <span aria-hidden="true">·</span>
            <span>Local Simulation</span>
            <span aria-hidden="true">·</span>
            <span>Real-time Topology</span>
          </div>

          <p className="ct-menu__tagline">
            Design, scale, and operate resilient cloud infrastructure. Wire ingress load balancers,
            app servers, in-memory caches, and managed databases to serve incoming HTTP demand while
            maintaining operational uptime and budget solvency.
          </p>

          <dl className="ct-menu__stats">
            <div className="ct-menu__stat">
              <dt>Billing Interval</dt>
              <dd>180 seconds</dd>
            </div>
            <div className="ct-menu__stat">
              <dt>Target Uptime</dt>
              <dd>99.9% SLA</dd>
            </div>
            <div className="ct-menu__stat">
              <dt>Components</dt>
              <dd>6 Node Classes</dd>
            </div>
            {highScore > 0 && (
              <div className="ct-menu__stat">
                <dt>Best SRE Score</dt>
                <dd className="text-yellow-400">
                  <Trophy size={14} className="inline mr-1" />
                  {highScore}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Right Navigation Column */}
        <div className="ct-menu__panel">
          <div className="ct-menu__nav">
            {/* Difficulty selector */}
            <label className="ct-menu__difficulty">
              <span>Simulation Difficulty</span>
              <select
                value={difficulty}
                onChange={(e) => {
                  audio.playClick();
                  setDifficulty(e.target.value as GameDifficulty);
                }}
                aria-label="Simulation Difficulty"
              >
                <option value="easy">Easy — $3,600 starting capital, gentle traffic growth</option>
                <option value="normal">Normal — $2,400 standard operating budget</option>
                <option value="hard">Hard — $1,200 constrained capital, rapid demand surges</option>
                <option value="endless">Endless — Sandbox mode with no bankruptcy suspension</option>
              </select>
            </label>

            {/* Main Action Buttons */}
            <button
              ref={newClusterRef}
              type="button"
              className="ct-btn ct-btn--primary ct-btn--block"
              onClick={handleStartNew}
            >
              <Play size={18} />
              <span>Start Simulation</span>
            </button>

            <button
              type="button"
              className="ct-btn ct-btn--block"
              disabled={!hasSave}
              onClick={handleLoadBackup}
              title={hasSave ? 'Resume existing cluster state' : 'No saved cluster found in browser storage'}
            >
              <RotateCcw size={18} />
              <span>Continue Cluster</span>
            </button>

            <button
              type="button"
              className="ct-btn ct-btn--block"
              onClick={() => {
                audio.playClick();
                dispatch({ type: 'openManual' });
              }}
            >
              <BookOpen size={18} />
              <span>Operations Manual</span>
            </button>

            <button
              type="button"
              className="ct-btn ct-btn--block"
              onClick={() => {
                audio.playClick();
                dispatch({ type: 'openSettings' });
              }}
            >
              <Settings size={18} />
              <span>Preferences & Accessibility</span>
            </button>
          </div>

          <p className="ct-menu__hint">
            Shortcuts: <kbd>Space</kbd> Palette · <kbd>Alt + I</kbd> Incidents · <kbd>Alt + A</kbd> Matrix · <kbd>?</kbd> Hotkeys
          </p>
        </div>
      </nav>
    </div>
  );
};
