import React, { useState } from 'react';
import { useAppStore, dispatch } from '../../store/gameStore';
import { audio } from '../../audio/proceduralAudio';
import { formatPercent } from '../../constants/gameConfig';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Music,
  Vibrate,
  Tv,
  Trash2,
  Play,
  RotateCcw,
  Eye,
  Type,
  Megaphone,
  BellRing,
  Shield,
  Sliders,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const settings = useAppStore((s) => s.settings);
  const returnScreen = useAppStore((s) => s.returnScreen);
  const [resetArm, setResetArm] = useState(false);

  const handleBack = () => {
    audio.playClick();
    dispatch({ type: 'screen', screen: returnScreen });
  };

  const handleMasterChange = (val: number) => {
    dispatch({ type: 'updateSettings', patch: { masterVolume: val } });
  };

  const handleSfxChange = (val: number) => {
    dispatch({ type: 'updateSettings', patch: { sfxVolume: val } });
  };

  const handleMusicChange = (val: number) => {
    dispatch({ type: 'updateSettings', patch: { musicVolume: val } });
  };

  const handleToggleMusic = () => {
    audio.playClick();
    dispatch({ type: 'updateSettings', patch: { musicEnabled: !settings.musicEnabled } });
  };

  const handleToggleVibration = () => {
    audio.playClick();
    dispatch({ type: 'updateSettings', patch: { vibrationEnabled: !settings.vibrationEnabled } });
  };

  const handleToggleCrt = () => {
    audio.playClick();
    dispatch({ type: 'updateSettings', patch: { crtScanlines: !settings.crtScanlines } });
  };

  const handleToggleHighContrast = () => {
    audio.playClick();
    dispatch({ type: 'updateSettings', patch: { highContrast: !settings.highContrast } });
  };

  const handleToggleLargeText = () => {
    audio.playClick();
    dispatch({ type: 'updateSettings', patch: { largeText: !settings.largeText } });
  };

  const handleToggleAnnouncements = () => {
    audio.playClick();
    dispatch({
      type: 'updateSettings',
      patch: { screenReaderAnnouncements: !settings.screenReaderAnnouncements },
    });
  };

  const handleToggleSpeech = () => {
    audio.playClick();
    const nextVal = !settings.speechSynthesisEnabled;
    dispatch({
      type: 'updateSettings',
      patch: { speechSynthesisEnabled: nextVal },
    });
    if (nextVal) {
      setTimeout(() => {
        audio.speakText("Spoken telemetry active.", "urgent");
      }, 50);
    }
  };

  const handleToggleBeacons = () => {
    audio.playClick();
    dispatch({
      type: 'updateSettings',
      patch: { soundBeaconOnSelect: !settings.soundBeaconOnSelect },
    });
  };

  const handleResetData = () => {
    audio.playMeltdown();
    dispatch({ type: 'resetData' });
  };

  return (
    <div className="ct-app__center ct-app__center--doc">
      <div className="ct-doc" role="group" aria-labelledby="settings-title">
        {/* Header */}
        <div className="ct-doc__head">
          <div>
            <h1 className="ct-doc__title" id="settings-title">
              Preferences & Accessibility
            </h1>
            <p className="ct-doc__subtitle">
              Audio levels, display modes, and assistive accessibility configuration.
            </p>
          </div>
          <button type="button" className="ct-btn" onClick={handleBack}>
            <ArrowLeft size={16} />
            <span>Return</span>
          </button>
        </div>

        {/* Settings Body */}
        <div className="ct-doc__body">
          {/* Section: Audio */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-slate-300 font-mono tracking-wider uppercase mb-3 flex items-center gap-2">
              <Volume2 size={14} className="text-cyan-400" />
              <span>Audio Configuration</span>
            </h2>

            {/* Master Volume */}
            <div className="ct-field">
              <label className="ct-field__label" htmlFor="set-master">
                Master Volume
              </label>
              <p className="ct-field__help">Overall sound level for the simulation.</p>
              <div className="ct-field__row">
                <input
                  id="set-master"
                  className="ct-slider"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.masterVolume * 100)}
                  onChange={(e) => handleMasterChange(Number(e.target.value) / 100)}
                  aria-label="Master Volume"
                />
                <output className="ct-readout">{formatPercent(settings.masterVolume)}</output>
              </div>
            </div>

            {/* SFX Volume */}
            <div className="ct-field">
              <label className="ct-field__label" htmlFor="set-sfx">
                Sound Effects
              </label>
              <p className="ct-field__help">Volume for relay clicks, alarms, and node deployment sounds.</p>
              <div className="ct-field__row">
                <input
                  id="set-sfx"
                  className="ct-slider"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.sfxVolume * 100)}
                  onChange={(e) => handleSfxChange(Number(e.target.value) / 100)}
                  aria-label="Sound Effects Volume"
                />
                <output className="ct-readout">{formatPercent(settings.sfxVolume)}</output>
                <button
                  type="button"
                  className="ct-btn ct-btn--sm"
                  onClick={() => audio.playSelect()}
                  title="Test sound effect"
                >
                  <Play size={12} />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Ambient Background Music */}
            <div className="ct-field">
              <label className="ct-field__label" htmlFor="set-music">
                Background Music
              </label>
              <p className="ct-field__help">Procedural ambient synth pad.</p>
              <div className="ct-field__row">
                <button
                  type="button"
                  className={`ct-toggle ${settings.musicEnabled ? 'ct-toggle--on' : ''}`}
                  onClick={handleToggleMusic}
                  aria-pressed={settings.musicEnabled}
                >
                  <span className="ct-toggle__track">
                    <span className="ct-toggle__thumb" />
                  </span>
                  <span>{settings.musicEnabled ? 'Enabled' : 'Muted'}</span>
                </button>
                <input
                  id="set-music"
                  className="ct-slider"
                  type="range"
                  min={0}
                  max={100}
                  disabled={!settings.musicEnabled}
                  value={Math.round(settings.musicVolume * 100)}
                  onChange={(e) => handleMusicChange(Number(e.target.value) / 100)}
                  aria-label="Background Music Volume"
                />
                <output className="ct-readout">{formatPercent(settings.musicVolume)}</output>
              </div>
            </div>

            {/* Haptic Vibration */}
            <div className="ct-field">
              <label className="ct-field__label">Haptic Vibration</label>
              <p className="ct-field__help">Tactile vibration feedback on supported mobile devices.</p>
              <div className="ct-field__row">
                <button
                  type="button"
                  className={`ct-toggle ${settings.vibrationEnabled ? 'ct-toggle--on' : ''}`}
                  onClick={handleToggleVibration}
                  aria-pressed={settings.vibrationEnabled}
                >
                  <span className="ct-toggle__track">
                    <span className="ct-toggle__thumb" />
                  </span>
                  <span>{settings.vibrationEnabled ? 'Enabled' : 'Disabled'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Display */}
          <div className="pt-4 border-t border-[var(--ct-line-strong)] mb-6">
            <h2 className="text-xs font-bold text-slate-300 font-mono tracking-wider uppercase mb-3 flex items-center gap-2">
              <Tv size={14} className="text-cyan-400" />
              <span>Display Preferences</span>
            </h2>

            <div className="ct-field">
              <label className="ct-field__label">CRT Scanline Effect</label>
              <p className="ct-field__help">Subtle phosphor monitor overlay effect.</p>
              <div className="ct-field__row">
                <button
                  type="button"
                  className={`ct-toggle ${settings.crtScanlines ? 'ct-toggle--on' : ''}`}
                  onClick={handleToggleCrt}
                  aria-pressed={settings.crtScanlines}
                >
                  <span className="ct-toggle__track">
                    <span className="ct-toggle__thumb" />
                  </span>
                  <span>{settings.crtScanlines ? 'Enabled' : 'Disabled'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Accessibility */}
          <div className="pt-4 border-t border-[var(--ct-line-strong)] mb-6">
            <h2 className="text-xs font-bold text-slate-300 font-mono tracking-wider uppercase mb-3 flex items-center gap-2">
              <Eye size={14} className="text-cyan-400" />
              <span>Accessibility & Assistive Features</span>
            </h2>

            {/* High Contrast Mode */}
            <div className="ct-field">
              <label className="ct-field__label">High-Contrast Theme</label>
              <p className="ct-field__help">
                WCAG AAA compliance with high text contrast, solid borders, and disabled visual filters.
              </p>
              <div className="ct-field__row">
                <button
                  type="button"
                  className={`ct-toggle ${settings.highContrast ? 'ct-toggle--on' : ''}`}
                  onClick={handleToggleHighContrast}
                  aria-pressed={settings.highContrast}
                >
                  <span className="ct-toggle__track">
                    <span className="ct-toggle__thumb" />
                  </span>
                  <span>{settings.highContrast ? 'High Contrast On' : 'Standard Theme'}</span>
                </button>
              </div>
            </div>

            {/* Large Text Mode */}
            <div className="ct-field">
              <label className="ct-field__label">Large Text & Enlarged Controls</label>
              <p className="ct-field__help">Increases typography size and enlarges click targets to minimum 48px.</p>
              <div className="ct-field__row">
                <button
                  type="button"
                  className={`ct-toggle ${settings.largeText ? 'ct-toggle--on' : ''}`}
                  onClick={handleToggleLargeText}
                  aria-pressed={settings.largeText}
                >
                  <span className="ct-toggle__track">
                    <span className="ct-toggle__thumb" />
                  </span>
                  <span>{settings.largeText ? 'Large Text On' : 'Standard Size'}</span>
                </button>
              </div>
            </div>

            {/* Screen Reader Live Alerts */}
            <div className="ct-field">
              <label className="ct-field__label">Screen Reader Live Updates (ARIA)</label>
              <p className="ct-field__help">Emits polite live announcements for status updates, invoices, and outages.</p>
              <div className="ct-field__row">
                <button
                  type="button"
                  className={`ct-toggle ${settings.screenReaderAnnouncements ? 'ct-toggle--on' : ''}`}
                  onClick={handleToggleAnnouncements}
                  aria-pressed={settings.screenReaderAnnouncements}
                >
                  <span className="ct-toggle__track">
                    <span className="ct-toggle__thumb" />
                  </span>
                  <span>{settings.screenReaderAnnouncements ? 'Active' : 'Muted'}</span>
                </button>
              </div>
            </div>

            {/* Text-to-Speech Spoken Telemetry */}
            <div className="ct-field">
              <label className="ct-field__label">Voice Readout (Browser Speech)</label>
              <p className="ct-field__help">Audibly announces critical incidents and billing deadlines.</p>
              <div className="ct-field__row flex-wrap gap-2">
                <button
                  type="button"
                  className={`ct-toggle ${settings.speechSynthesisEnabled ? 'ct-toggle--on' : ''}`}
                  onClick={handleToggleSpeech}
                  aria-pressed={settings.speechSynthesisEnabled}
                >
                  <span className="ct-toggle__track">
                    <span className="ct-toggle__thumb" />
                  </span>
                  <span>{settings.speechSynthesisEnabled ? 'Voice Readout On' : 'Off'}</span>
                </button>
              </div>
            </div>

            {/* Audio Health Beacons */}
            <div className="ct-field">
              <label className="ct-field__label">Selection Audio Cues</label>
              <p className="ct-field__help">Plays distinct audio earcons when selecting nodes based on their load health.</p>
              <div className="ct-field__row">
                <button
                  type="button"
                  className={`ct-toggle ${settings.soundBeaconOnSelect ? 'ct-toggle--on' : ''}`}
                  onClick={handleToggleBeacons}
                  aria-pressed={settings.soundBeaconOnSelect}
                >
                  <span className="ct-toggle__track">
                    <span className="ct-toggle__thumb" />
                  </span>
                  <span>{settings.soundBeaconOnSelect ? 'Active' : 'Disabled'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Storage */}
          <div className="pt-4 border-t border-[var(--ct-line-strong)]">
            <h2 className="text-xs font-bold text-red-400 font-mono tracking-wider uppercase mb-3 flex items-center gap-2">
              <Trash2 size={14} />
              <span>Storage & Saved Game</span>
            </h2>

            <div className="ct-field">
              <label className="ct-field__label text-red-400">Clear Local Storage</label>
              <p className="ct-field__help">Deletes saved cluster, high scores, and local preferences.</p>
              <div className="ct-field__row">
                {resetArm ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="ct-btn ct-btn--danger"
                      onClick={handleResetData}
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      className="ct-btn"
                      onClick={() => setResetArm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="ct-btn ct-btn--danger"
                    onClick={() => setResetArm(true)}
                  >
                    <RotateCcw size={14} />
                    <span>Reset Data</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
