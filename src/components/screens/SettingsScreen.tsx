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
  Sparkles,
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
        audio.speakText("Speech telemetry enabled. Live status announcements active.", "urgent");
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

  const handleTestSpeech = () => {
    audio.speakText("Cluster telemetry online. All servers nominal. Inbound traffic at 650 requests per second.", "urgent");
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
              System Settings & Audio Lab
            </h1>
            <p className="ct-doc__subtitle">
              Configure hardware telemetry, procedural audio synthesis, and graphics shaders.
            </p>
          </div>
          <button type="button" className="ct-btn" onClick={handleBack}>
            <ArrowLeft size={16} />
            <span>Return</span>
          </button>
        </div>

        {/* Settings Body */}
        <div className="ct-doc__body">
          {/* Master Volume */}
          <div className="ct-field">
            <label className="ct-field__label" htmlFor="set-master">
              <Volume2 size={15} className="inline mr-1 text-cyan-400" />
              Master Volume
            </label>
            <p className="ct-field__help">
              Controls overall gain for all procedural audio output including the continuous data center fan hum.
            </p>
            <div className="ct-field__row">
              <input
                id="set-master"
                className="ct-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.masterVolume * 100)}
                onChange={(e) => handleMasterChange(Number(e.target.value) / 100)}
              />
              <output className="ct-readout">{formatPercent(settings.masterVolume)}</output>
            </div>
          </div>

          {/* SFX Volume */}
          <div className="ct-field">
            <label className="ct-field__label" htmlFor="set-sfx">
              <Volume2 size={15} className="inline mr-1 text-green-400" />
              Sound Effects Volume
            </label>
            <p className="ct-field__help">
              Level for discrete relays, computer chirps, circuit connections, and alarms.
            </p>
            <div className="ct-field__row">
              <input
                id="set-sfx"
                className="ct-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.sfxVolume * 100)}
                onChange={(e) => handleSfxChange(Number(e.target.value) / 100)}
              />
              <output className="ct-readout">{formatPercent(settings.sfxVolume)}</output>
            </div>

            {/* Interactive Procedural Audio Test Deck */}
            <div className="mt-3">
              <span className="text-xs text-muted block mb-2 font-mono uppercase tracking-wide">
                Test Procedural Sound Generators:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="ct-btn ct-btn--sm"
                  onClick={() => audio.playClick()}
                >
                  <Play size={12} /> Click
                </button>
                <button
                  type="button"
                  className="ct-btn ct-btn--sm"
                  onClick={() => audio.playSelect()}
                >
                  <Play size={12} /> Chirp
                </button>
                <button
                  type="button"
                  className="ct-btn ct-btn--sm"
                  onClick={() => audio.playConnect()}
                >
                  <Play size={12} /> Link Triad
                </button>
                <button
                  type="button"
                  className="ct-btn ct-btn--sm"
                  onClick={() => audio.playDeploy()}
                >
                  <Play size={12} /> Rack Thud
                </button>
                <button
                  type="button"
                  className="ct-btn ct-btn--sm"
                  onClick={() => audio.playPaySuccess()}
                >
                  <Play size={12} /> Cash Chime
                </button>
                <button
                  type="button"
                  className="ct-btn ct-btn--sm"
                  onClick={() => audio.playMeltdown()}
                >
                  <Play size={12} /> Siren Alarm
                </button>
                <button
                  type="button"
                  className="ct-btn ct-btn--sm"
                  onClick={() => audio.playGlitchHit()}
                >
                  <Play size={12} /> Glitch
                </button>
                <button
                  type="button"
                  className="ct-btn ct-btn--sm"
                  onClick={() => audio.playDigitalTear()}
                >
                  <Play size={12} /> Electric Spark
                </button>
              </div>
            </div>
          </div>

          {/* Generative Music */}
          <div className="ct-field">
            <label className="ct-field__label" htmlFor="set-music">
              <Music size={15} className="inline mr-1 text-purple-400" />
              Generative Cyber Ambient Music
            </label>
            <p className="ct-field__help">
              Continuous analog synth pad chords synthesized in real-time by the Web Audio API.
            </p>
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
                <span>{settings.musicEnabled ? 'ENABLED' : 'MUTED'}</span>
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
              />
              <output className="ct-readout">{formatPercent(settings.musicVolume)}</output>
            </div>
          </div>

          {/* Haptic Vibration */}
          <div className="ct-field">
            <label className="ct-field__label">
              <Vibrate size={15} className="inline mr-1 text-yellow-400" />
              Haptic Vibration Feedback
            </label>
            <p className="ct-field__help">
              Sends haptic pulses during meltdowns, invoices, and node deletions on supported devices.
            </p>
            <div className="ct-field__row">
              <button
                type="button"
                className={`ct-toggle ${settings.vibrationEnabled ? 'ct-toggle--on' : ''}`}
                onClick={handleToggleVibration}
              >
                <span className="ct-toggle__track">
                  <span className="ct-toggle__thumb" />
                </span>
                <span>{settings.vibrationEnabled ? 'ENABLED' : 'DISABLED'}</span>
              </button>
            </div>
          </div>

          {/* CRT Shaders */}
          <div className="ct-field">
            <label className="ct-field__label">
              <Tv size={15} className="inline mr-1 text-cyan-400" />
              Retro CRT Scanlines Overlay
            </label>
            <p className="ct-field__help">
              Renders hardware monitor phosphor scanline artifacts and subtle chromatic vignette.
            </p>
            <div className="ct-field__row">
              <button
                type="button"
                className={`ct-toggle ${settings.crtScanlines ? 'ct-toggle--on' : ''}`}
                onClick={handleToggleCrt}
              >
                <span className="ct-toggle__track">
                  <span className="ct-toggle__thumb" />
                </span>
                <span>{settings.crtScanlines ? 'ENABLED' : 'DISABLED'}</span>
              </button>
            </div>
          </div>

          {/* ================================================== */}
          {/* ACCESSIBILITY & LOW VISION PREFERENCES */}
          {/* ================================================== */}
          <div className="pt-4 border-t border-[var(--ct-line-strong)]">
            <h2 className="text-sm font-bold text-cyan-300 font-mono tracking-wide uppercase flex items-center gap-2 mb-4">
              <Eye size={16} />
              <span>Accessibility & Low-Vision Features</span>
            </h2>

            {/* High Contrast Mode */}
            <div className="ct-field">
              <label className="ct-field__label">
                <Sparkles size={15} className="inline mr-1 text-cyan-300" />
                High-Contrast Mode (WCAG AAA)
              </label>
              <p className="ct-field__help">
                Applies maximum contrast (solid pure black, pure white text, bright neon cyan/yellow badges, bold 2.5px borders, and disables scanline shaders).
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
                  <span>{settings.highContrast ? 'HIGH CONTRAST ON' : 'STANDARD DARK'}</span>
                </button>
              </div>
            </div>

            {/* Large Text Mode */}
            <div className="ct-field">
              <label className="ct-field__label">
                <Type size={15} className="inline mr-1 text-purple-300" />
                Large Text & Enlarged Hit Targets
              </label>
              <p className="ct-field__help">
                Scales typographic hierarchy by 25–35% and increases button heights to minimum 48px for easier reading and interaction.
              </p>
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
                  <span>{settings.largeText ? 'LARGE TEXT ON' : 'STANDARD SIZE'}</span>
                </button>
              </div>
            </div>

            {/* Live Screen Reader Announcements */}
            <div className="ct-field">
              <label className="ct-field__label">
                <Megaphone size={15} className="inline mr-1 text-green-300" />
                Screen Reader Live Alerts (ARIA Live Regions)
              </label>
              <p className="ct-field__help">
                Emits ARIA polite and assertive telemetry updates when meltdowns occur, invoices arrive, incidents trigger, or nodes are selected.
              </p>
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
                  <span>{settings.screenReaderAnnouncements ? 'ANNOUNCEMENTS ACTIVE' : 'MUTED'}</span>
                </button>
              </div>
            </div>

            {/* Text-to-Speech Spoken Telemetry */}
            <div className="ct-field">
              <label className="ct-field__label">
                <Volume2 size={15} className="inline mr-1 text-yellow-300" />
                Spoken Voice Telemetry (Web Speech API)
              </label>
              <p className="ct-field__help">
                Audibly speaks cluster emergencies, bill due dates, and server selections through your browser's speech synthesizer.
              </p>
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
                  <span>{settings.speechSynthesisEnabled ? 'VOICE READOUT ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  className="ct-btn ct-btn--sm"
                  onClick={handleTestSpeech}
                >
                  <Play size={12} />
                  <span>Test Voice Announcement</span>
                </button>
              </div>
            </div>

            {/* Auditory Earcon Beacons */}
            <div className="ct-field">
              <label className="ct-field__label">
                <BellRing size={15} className="inline mr-1 text-cyan-300" />
                Node Earcon Beacons (Auditory Health Cues)
              </label>
              <p className="ct-field__help">
                Synthesizes distinct procedural audio cues when selecting nodes: pure chime for nominal, dissonant warble for high load, downward sweep for critical/meltdown.
              </p>
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
                  <span>{settings.soundBeaconOnSelect ? 'BEACONS ACTIVE' : 'DISABLED'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone: Reset Data */}
          <div className="ct-field">
            <label className="ct-field__label text-red-400">
              <Trash2 size={15} className="inline mr-1" />
              Reset All Saved Data
            </label>
            <p className="ct-field__help">
              Permanently clears the saved cluster slot, high scores, and audio preferences. This cannot be undone.
            </p>
            <div className="ct-field__row">
              {resetArm ? (
                <>
                  <button
                    type="button"
                    className="ct-btn ct-btn--danger"
                    onClick={handleResetData}
                  >
                    Confirm: Purge All Storage
                  </button>
                  <button
                    type="button"
                    className="ct-btn"
                    onClick={() => setResetArm(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ct-btn ct-btn--danger"
                  onClick={() => setResetArm(true)}
                >
                  <RotateCcw size={14} />
                  <span>Reset All Data</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
