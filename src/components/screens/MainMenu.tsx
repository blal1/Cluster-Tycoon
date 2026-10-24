import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, dispatch, loadCluster, getHighScore } from '../../store/gameStore';
import { GameDifficulty } from '../../types/game';
import { audio } from '../../audio/proceduralAudio';
import { BILLING_CYCLE_SECONDS } from '../../constants/gameConfig';
import {
  Play,
  RotateCcw,
  BookOpen,
  Settings,
  Sparkles,
  Zap,
  Server,
  Trophy,
} from 'lucide-react';

export const MainMenu: React.FC = () => {
  const hasSave = useAppStore((s) => s.hasSave);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('normal');
  const [glitching, setGlitching] = useState(false);
  const [electric, setElectric] = useState(false);
  const highScore = getHighScore();

  const newClusterRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    newClusterRef.current?.focus();
  }, []);

  // Periodic visual glitch / lightning effects
  useEffect(() => {
    let unmounted = false;

    const glitchLoop = () => {
      if (unmounted) return;
      const delay = 8000 + Math.random() * 6000;
      window.setTimeout(() => {
        if (unmounted) return;
        setGlitching(true);
        audio.playGlitchHit();
        audio.triggerVibrate(80);
        window.setTimeout(() => {
          if (!unmounted) setGlitching(false);
        }, 650);
        glitchLoop();
      }, delay);
    };

    const electricLoop = () => {
      if (unmounted) return;
      const delay = 4500 + Math.random() * 5000;
      window.setTimeout(() => {
        if (unmounted) return;
        setElectric(true);
        audio.playDigitalTear();
        window.setTimeout(() => {
          if (!unmounted) setElectric(false);
        }, 380);
        electricLoop();
      }, delay);
    };

    glitchLoop();
    electricLoop();

    return () => {
      unmounted = true;
    };
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
    <div className={`ct-app__center ct-app__center--menu ${glitching ? 'ct-menu--glitching' : ''} ${electric ? 'ct-menu--electric' : ''}`}>
      {/* Electric Lightning Overlay */}
      {electric && (
        <svg
          className="ct-menu__lightning"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            points="10,0 35,40 20,45 55,100"
            fill="none"
            stroke="var(--ct-cyan)"
            strokeWidth="1.2"
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px var(--ct-cyan))' }}
          />
          <polyline
            points="60,0 80,30 68,34 92,100"
            fill="none"
            stroke="var(--ct-deck-hot)"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      )}

      <nav className="ct-menu" aria-labelledby="menu-title">
        {/* Left Hero Column */}
        <div className="ct-menu__hero">
          <p className="ct-menu__eyebrow">
            <Zap size={13} className="inline mr-1 text-cyan-400" />
            Backend Infrastructure Simulator
          </p>
          <h1 className="ct-menu__title" id="menu-title" data-text="Cluster Tycoon">
            Cluster Tycoon
          </h1>
          <hr className="ct-menu__rule" />
          <span className="ct-menu__version">v0.2.0 • 100% Procedural Audio</span>

          <p className="ct-menu__tagline">
            Top-down cloud architecture, load balancing, and systems administration simulation.
            Route synthetic internet traffic, withstand DDoS surges and hardware meltdowns, and survive
            the monthly cloud billing cycle. Runs fully offline with procedural synthesis.
          </p>

          <dl className="ct-menu__stats">
            <div className="ct-menu__stat">
              <dt>Billing Period</dt>
              <dd>{BILLING_CYCLE_SECONDS}s</dd>
            </div>
            <div className="ct-menu__stat">
              <dt>Node Classes</dt>
              <dd>6 Modules</dd>
            </div>
            <div className="ct-menu__stat">
              <dt>Sound Engine</dt>
              <dd>Web Audio API</dd>
            </div>
            {highScore > 0 && (
              <div className="ct-menu__stat">
                <dt>High Score</dt>
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
              <span>Difficulty Mode</span>
              <select
                value={difficulty}
                onChange={(e) => {
                  audio.playClick();
                  setDifficulty(e.target.value as GameDifficulty);
                }}
              >
                <option value="easy">Easy (150% Cash, Slower Growth)</option>
                <option value="normal">Normal (Standard Cloud Ops)</option>
                <option value="hard">Hard (Strict Budget, Fierce Surges)</option>
                <option value="endless">Endless (Sandbox Sandbox Mode)</option>
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
              <span>Launch New Cluster</span>
            </button>

            <button
              type="button"
              className="ct-btn ct-btn--block"
              disabled={!hasSave}
              onClick={handleLoadBackup}
              title={hasSave ? 'Restore saved snapshot' : 'No save file found'}
            >
              <RotateCcw size={18} />
              <span>Load Saved Cluster</span>
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
              <span>System Manual & Docs</span>
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
              <span>Settings & Audio Lab</span>
            </button>
          </div>

          <p className="ct-menu__hint">
            <kbd>Space</kbd> opens the command palette in-game. <kbd>F</kbd> frames the cluster canvas.{' '}
            <kbd>Alt + Click</kbd> severs wire links.
          </p>
        </div>
      </nav>
    </div>
  );
};
