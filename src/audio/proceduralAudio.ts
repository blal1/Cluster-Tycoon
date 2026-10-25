/**
 * Cluster Tycoon - 100% Procedural Web Audio Engine
 * All sound effects, dynamic server hum, and generative ambient music
 * are synthesized entirely in real-time with the Web Audio API.
 * No external audio files or network fetches required.
 */

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Dynamic server hum components
  private serverHumOsc: OscillatorNode | null = null;
  private serverHumSub: OscillatorNode | null = null;
  private serverHumGain: GainNode | null = null;
  private serverHumFilter: BiquadFilterNode | null = null;
  private serverHumNoiseSource: AudioBufferSourceNode | null = null;
  private serverHumNoiseGain: GainNode | null = null;

  // Generative music components
  private musicActive = false;
  private musicIntervalId: number | null = null;
  private musicChords: number[][] = [
    // Ambient Cyber D minor / F / Bb / C progressions (Hz)
    [146.83, 220.0, 261.63, 349.23], // Dm7
    [174.61, 261.63, 329.63, 392.0],  // Fmaj7
    [116.54, 174.61, 233.08, 293.66], // Bbmaj7
    [130.81, 196.0, 261.63, 329.63],  // C add9
  ];
  private currentChordIdx = 0;

  // Settings cache
  private masterVol = 0.85;
  private sfxVol = 0.9;
  private musicVol = 0.7;
  private musicEnabled = true;
  private vibrationEnabled = true;
  private speechSynthesisEnabled = false;
  private soundBeaconOnSelect = true;

  constructor() {
    // Lazily initialized on first user interaction
  }

  public init(): boolean {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();

      // Master output bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music Bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicEnabled ? this.musicVol : 0, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // Pre-compute 1 second of white noise for audio bursts
      this.noiseBuffer = this.generateNoiseBuffer();

      // Start continuous background ambient music if enabled
      if (this.musicEnabled) {
        this.startMusic();
      }

      return true;
    } catch (err) {
      console.warn('Procedural audio initialization error:', err);
      return false;
    }
  }

  private ensureContext(): { ctx: AudioContext; sfxBus: GainNode } | null {
    if (!this.init() || !this.ctx || !this.sfxGain) return null;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return { ctx: this.ctx, sfxBus: this.sfxGain };
  }

  private generateNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 49734321;
    for (let i = 0; i < bufferSize; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 4294967295) * 2 - 1;
    }
    return buffer;
  }

  public updateSettings(settings: {
    masterVolume: number;
    sfxVolume: number;
    musicEnabled: boolean;
    musicVolume: number;
    vibrationEnabled: boolean;
    speechSynthesisEnabled?: boolean;
    soundBeaconOnSelect?: boolean;
  }) {
    this.masterVol = Math.max(0, Math.min(1, settings.masterVolume));
    this.sfxVol = Math.max(0, Math.min(1, settings.sfxVolume));
    this.musicVol = Math.max(0, Math.min(1, settings.musicVolume));
    this.musicEnabled = settings.musicEnabled;
    this.vibrationEnabled = settings.vibrationEnabled;
    if (settings.speechSynthesisEnabled !== undefined) {
      this.speechSynthesisEnabled = settings.speechSynthesisEnabled;
    }
    if (settings.soundBeaconOnSelect !== undefined) {
      this.soundBeaconOnSelect = settings.soundBeaconOnSelect;
    }

    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.masterGain) this.masterGain.gain.setTargetAtTime(this.masterVol, now, 0.05);
      if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(this.sfxVol, now, 0.05);
      if (this.musicGain) {
        this.musicGain.gain.setTargetAtTime(this.musicEnabled ? this.musicVol : 0, now, 0.05);
      }
    }

    if (this.musicEnabled && !this.musicActive) {
      this.startMusic();
    } else if (!this.musicEnabled && this.musicActive) {
      this.stopMusic();
    }
  }

  // ==========================================
  // ACCESSIBILITY VOICE & AUDITORY BEACONS
  // ==========================================

  public speakText(text: string, priority: 'normal' | 'urgent' = 'normal') {
    if (!this.speechSynthesisEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      if (priority === 'urgent') {
        window.speechSynthesis.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignored if browser speech synthesis blocked
    }
  }

  public playNodeBeacon(status: 'nominal' | 'warning' | 'critical' | 'meltdown' | 'offline') {
    if (!this.soundBeaconOnSelect) return;
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    if (status === 'nominal') {
      // Clean ascending chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.04);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(now);
      osc.stop(now + 0.17);
    } else if (status === 'warning') {
      // Dissonant minor second pulse
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'triangle';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(587, now);
      osc2.frequency.setValueAtTime(622, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(sfxBus);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.23);
      osc2.stop(now + 0.23);
    } else if (status === 'critical' || status === 'meltdown') {
      // Urgent sawtooth alarm chirp
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1174, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(now);
      osc.stop(now + 0.26);
    } else {
      // Muted low click for offline
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  }

  // ==========================================
  // PROCEDURAL SOUND EFFECTS
  // ==========================================

  public playClick() {
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    // Relay switch click: high transient blip + bandpass noise burst
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.025);
    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    osc.connect(oscGain);
    oscGain.connect(sfxBus);
    osc.start(now);
    osc.stop(now + 0.03);

    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3400, now);
      filter.Q.value = 6;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(sfxBus);
      noise.start(now);
      noise.stop(now + 0.025);
    }
  }

  public playHover() {
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(4200, now);
    osc.frequency.exponentialRampToValueAtTime(2600, now + 0.018);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
    osc.connect(gain);
    gain.connect(sfxBus);
    osc.start(now);
    osc.stop(now + 0.02);
  }

  public playSelect() {
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    // Dual affirmative computer chirp (C6 -> G6)
    [
      { freq: 1046.5, time: 0, dur: 0.05, gain: 0.25 },
      { freq: 1567.98, time: 0.04, dur: 0.06, gain: 0.22 },
    ].forEach((tone) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(tone.freq, now + tone.time);
      gain.gain.setValueAtTime(0.0001, now + tone.time);
      gain.gain.linearRampToValueAtTime(tone.gain, now + tone.time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.time + tone.dur);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(now + tone.time);
      osc.stop(now + tone.time + tone.dur + 0.01);
    });
  }

  public playConnect() {
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    // Ascending power link triad (E5 -> G#5 -> B5)
    [
      { freq: 659.25, time: 0 },
      { freq: 830.61, time: 0.05 },
      { freq: 987.77, time: 0.1 },
    ].forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0.0001, now + time);
      gain.gain.linearRampToValueAtTime(0.3, now + time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + 0.12);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(now + time);
      osc.stop(now + time + 0.14);
    });
  }

  public playDeploy() {
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    // Heavy server rack thud + servo click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    gain.connect(sfxBus);
    osc.start(now);
    osc.stop(now + 0.15);

    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.09);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(sfxBus);
      noise.start(now);
      noise.stop(now + 0.1);
    }
  }

  public playDelete() {
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    // Cable snap / de-allocation buzz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(sfxBus);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playDenied() {
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    // Harsh double buzz
    [0, 0.09].forEach((time) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now + time);
      osc.frequency.linearRampToValueAtTime(130, now + time + 0.07);
      gain.gain.setValueAtTime(0.28, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.07);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(now + time);
      osc.stop(now + time + 0.08);
    });
  }

  public playMeltdown() {
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    // Oscillating emergency klaxon alarm
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(620, now);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(7, now); // 7Hz oscillation
    lfoGain.gain.setValueAtTime(260, now);

    lfo.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    osc.connect(gain);
    gain.connect(sfxBus);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.88);
    osc.stop(now + 0.88);
  }

  public playIncidentAlert() {
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    // Urgent radar ping
    [0, 0.14, 0.28].forEach((time, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx % 2 === 0 ? 880 : 660, now + time);
      gain.gain.setValueAtTime(0.35, now + time);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + 0.1);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(now + time);
      osc.stop(now + time + 0.11);
    });
  }

  public playInvoiceChime() {
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    // Dramatic financial notification chord
    [349.23, 440.0, 523.25, 698.46].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.001, now + i * 0.04);
      gain.gain.linearRampToValueAtTime(0.28, now + i * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 0.45);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.48);
    });
  }

  public playPaySuccess() {
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    // Cash register bell ding + major chord resolution
    [1046.5, 1318.51, 1567.98, 2093.0].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  public playGlitchHit() {
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(sfxBus);
    osc.start(now);
    osc.stop(now + 0.28);

    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(4500, now);
      filter.frequency.linearRampToValueAtTime(400, now + 0.25);
      filter.Q.value = 4;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(sfxBus);
      noise.start(now);
      noise.stop(now + 0.26);
    }
  }

  public playDigitalTear() {
    const handle = this.ensureContext();
    if (!handle) return;
    const { ctx, sfxBus } = handle;
    const now = ctx.currentTime;

    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2500, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(sfxBus);
      noise.start(now);
      noise.stop(now + 0.09);
    }

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);
    oscGain.gain.setValueAtTime(0.25, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(oscGain);
    oscGain.connect(sfxBus);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // ==========================================
  // DYNAMIC SERVER RACK HUM & FAN AMBIENCE
  // ==========================================

  public updateServerHum(clusterLoad: number) {
    if (!this.init() || !this.ctx || !this.sfxGain) return;
    const load = Math.max(0, Math.min(1, clusterLoad));
    const now = this.ctx.currentTime;

    if (!this.serverHumOsc) {
      // Main transformer 60Hz hum
      this.serverHumOsc = this.ctx.createOscillator();
      this.serverHumOsc.type = 'sawtooth';
      this.serverHumOsc.frequency.setValueAtTime(58, now);

      // Sub-bass rumble
      this.serverHumSub = this.ctx.createOscillator();
      this.serverHumSub.type = 'sine';
      this.serverHumSub.frequency.setValueAtTime(29, now);

      // Low-pass filter simulating chassis casing
      this.serverHumFilter = this.ctx.createBiquadFilter();
      this.serverHumFilter.type = 'lowpass';
      this.serverHumFilter.frequency.setValueAtTime(220, now);
      this.serverHumFilter.Q.setValueAtTime(1.2, now);

      this.serverHumGain = this.ctx.createGain();
      this.serverHumGain.gain.setValueAtTime(0.001, now);

      this.serverHumOsc.connect(this.serverHumFilter);
      this.serverHumSub.connect(this.serverHumFilter);
      this.serverHumFilter.connect(this.serverHumGain);
      this.serverHumGain.connect(this.sfxGain);

      this.serverHumOsc.start(now);
      this.serverHumSub.start(now);

      // Add gentle filtered white noise for fan air turbulence
      if (this.noiseBuffer) {
        this.serverHumNoiseSource = this.ctx.createBufferSource();
        this.serverHumNoiseSource.buffer = this.noiseBuffer;
        this.serverHumNoiseSource.loop = true;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(800, now);
        noiseFilter.Q.setValueAtTime(0.8, now);

        this.serverHumNoiseGain = this.ctx.createGain();
        this.serverHumNoiseGain.gain.setValueAtTime(0.001, now);

        this.serverHumNoiseSource.connect(noiseFilter);
        noiseFilter.connect(this.serverHumNoiseGain);
        this.serverHumNoiseGain.connect(this.sfxGain);
        this.serverHumNoiseSource.start(now);
      }
    }

    // Adapt tone and volume based on cluster workload
    const targetGain = 0.01 + load * 0.08;
    const targetFreq = 58 + load * 22; // 58Hz to 80Hz under full load
    const targetFilterFreq = 220 + load * 600; // Fans open up under heat
    const targetNoiseGain = 0.008 + load * 0.04;

    this.serverHumGain?.gain.setTargetAtTime(targetGain, now, 0.4);
    this.serverHumOsc?.frequency.setTargetAtTime(targetFreq, now, 0.6);
    this.serverHumFilter?.frequency.setTargetAtTime(targetFilterFreq, now, 0.5);
    this.serverHumNoiseGain?.gain.setTargetAtTime(targetNoiseGain, now, 0.4);
  }

  public stopServerHum() {
    if (!this.ctx || !this.serverHumGain) return;
    const now = this.ctx.currentTime;
    this.serverHumGain.gain.setTargetAtTime(0.0001, now, 0.2);
    if (this.serverHumNoiseGain) {
      this.serverHumNoiseGain.gain.setTargetAtTime(0.0001, now, 0.2);
    }
  }

  // ==========================================
  // GENERATIVE PROCEDURAL AMBIENT MUSIC
  // ==========================================

  public startMusic() {
    if (this.musicActive) return;
    if (!this.init() || !this.ctx || !this.musicGain) return;

    this.musicActive = true;
    this.scheduleNextAmbientChord();

    // Loop a generative ambient chord sequence every 7 seconds
    this.musicIntervalId = window.setInterval(() => {
      if (this.musicActive && this.musicEnabled) {
        this.scheduleNextAmbientChord();
      }
    }, 7000);
  }

  public stopMusic() {
    this.musicActive = false;
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  private scheduleNextAmbientChord() {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const chord = this.musicChords[this.currentChordIdx];
    this.currentChordIdx = (this.currentChordIdx + 1) % this.musicChords.length;

    const chordDuration = 6.8;

    // Play soft multi-oscillator pad for the chord
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      // Slight detune for analog warmth
      osc.detune.setValueAtTime((idx - 1.5) * 4, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.linearRampToValueAtTime(800, now + chordDuration * 0.4);
      filter.frequency.linearRampToValueAtTime(380, now + chordDuration);

      // Slow breathing swell
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.065 / chord.length, now + chordDuration * 0.35);
      gain.gain.linearRampToValueAtTime(0.0001, now + chordDuration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + chordDuration + 0.1);
    });
  }

  // ==========================================
  // HAPTIC VIBRATION
  // ==========================================

  public triggerVibrate(pattern: number | number[]) {
    if (!this.vibrationEnabled) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignored on unsupported devices
      }
    }
  }
}

export const audio = new ProceduralAudioEngine();
