// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Audio System
// Synthesized chip-tune waveforms, frame-synced sound effects
// ============================================================

const AudioSystem = {
  ctx: null,
  masterVolume: 0.5,
  _targetVolume: 0.5,
  muted: false,

  // Ambient state
  _ambientNodes: [],
  _ambientGain: null,
  _ambientActive: false,
  _chirpInterval: null,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not available');
      this.ctx = null;
    }
  },

  // Ensure audio context is running (browsers require user interaction)
  ensureContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  // --- HELPERS ---

  // Create a white noise AudioBuffer of the given duration
  _createNoiseBuffer(duration) {
    const bufferSize = Math.ceil(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  },

  // Bird-like chirp used by 'feral' ambient
  _playChirp(destinationNode) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const baseFreq = 2000 + Math.random() * 2000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(destinationNode);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.1);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
  },

  // --- AMBIENT BACKGROUND DRONE ---

  playAmbient(floorType) {
    if (!this.ctx) return;
    this.ensureContext();
    this.stopAmbient(); // Stop any existing ambient first

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Master gain for this ambient layer
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.masterVolume, now);
    masterGain.connect(ctx.destination);

    const nodes = [];

    switch (floorType) {
      case 'horde': {
        // Low rumble: 40Hz sine, very quiet, continuous
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(40, now);
        gain.gain.setValueAtTime(0.05, now);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        nodes.push(osc);
        break;
      }

      case 'brute': {
        // Crowd murmur: filtered noise, very quiet
        const noiseBuffer = this._createNoiseBuffer(2);
        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.Q.setValueAtTime(1, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.04, now);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        source.start(now);
        nodes.push(source);
        break;
      }

      case 'plague': {
        // Eerie wind: filtered noise with slow modulation
        const noiseBuffer = this._createNoiseBuffer(2);
        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, now);
        filter.Q.setValueAtTime(2, now);
        // LFO for slow filter modulation
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.3, now);
        lfoGain.gain.setValueAtTime(200, now);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.04, now);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        lfo.start(now);
        source.start(now);
        nodes.push(source, lfo);
        break;
      }

      case 'feral': {
        // Nature sounds: filtered noise with bird-like chirps
        const noiseBuffer = this._createNoiseBuffer(2);
        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.Q.setValueAtTime(0.5, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.03, now);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        source.start(now);
        nodes.push(source);

        // Schedule periodic bird-like chirps
        this._chirpInterval = setInterval(() => {
          if (!this._ambientActive) return;
          this._playChirp(masterGain);
        }, 1500 + Math.random() * 2000);
        break;
      }

      case 'void': {
        // Deep space hum: 60Hz + 80Hz sine, very quiet
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(60, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(80, now);
        gain.gain.setValueAtTime(0.04, now);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(masterGain);
        osc1.start(now);
        osc2.start(now);
        nodes.push(osc1, osc2);
        break;
      }

      case 'boss': {
        // Dark drone: sawtooth 55Hz, low pass filtered
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(55, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        filter.Q.setValueAtTime(5, now);
        gain.gain.setValueAtTime(0.05, now);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        nodes.push(osc);
        break;
      }

      default: {
        // Generic: subtle sine hum
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(50, now);
        gain.gain.setValueAtTime(0.03, now);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        nodes.push(osc);
        break;
      }
    }

    this._ambientNodes = nodes;
    this._ambientGain = masterGain;
    this._ambientActive = true;
  },

  stopAmbient() {
    // Stop all ambient audio nodes
    for (const node of this._ambientNodes) {
      try { node.stop(); } catch (e) {}
    }
    this._ambientNodes = [];

    // Clear chirp interval
    if (this._chirpInterval) {
      clearInterval(this._chirpInterval);
      this._chirpInterval = null;
    }

    // Fade out ambient gain then disconnect
    if (this._ambientGain) {
      try {
        this._ambientGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        const g = this._ambientGain;
        setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 600);
      } catch (e) {}
      this._ambientGain = null;
    }

    this._ambientActive = false;
  },

  // --- SYNTHESIZED SOUND EFFECTS ---

  // Impact: Square-wave "crunch" (design doc: 4-frame duration)
  playImpact(type = 'normal') {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'heavy':
        osc.type = 'square';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);
        gain.gain.setValueAtTime(this.masterVolume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      case 'light':
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
        gain.gain.setValueAtTime(this.masterVolume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      case 'counter':
        // Louder, more dramatic
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.14);
        gain.gain.setValueAtTime(this.masterVolume * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);

        // Secondary tone for counter-hit
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(800, now);
        osc2.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain2.gain.setValueAtTime(this.masterVolume * 0.2, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc2.start(now);
        osc2.stop(now + 0.1);
        break;
      case 'ko':
        osc.type = 'square';
        osc.frequency.setValueAtTime(40, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
        gain.gain.setValueAtTime(this.masterVolume * 0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
    }
  },

  // Whoosh: White noise burst (design doc: 2 frames before hit)
  playWhoosh(type = 'heavy') {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const duration = type === 'heavy' ? 0.05 : 0.03;

    // Generate white noise
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(type === 'heavy' ? 500 : 800, now);
    filter.Q.setValueAtTime(1, now);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(this.masterVolume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.start(now);
    source.stop(now + duration);
  },

  // Character grunt: 8-bit voice chirp (design doc: 6 variants per char,
  // pitch tied to damage taken)
  playGrunt(characterType = 'default', damage = 5) {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Higher damage = higher pitch squeak
    const basePitch = 200 + damage * 20;
    const variant = Math.floor(Math.random() * 6);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';

    // Different characters have different grunt characteristics
    switch (characterType) {
      case 'knight':
        osc.frequency.setValueAtTime(basePitch * 0.8, now);
        osc.frequency.exponentialRampToValueAtTime(basePitch * 0.5, now + 0.06);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        break;
      case 'assassin':
        osc.frequency.setValueAtTime(basePitch * 1.3, now);
        osc.frequency.exponentialRampToValueAtTime(basePitch * 0.9, now + 0.04);
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, now);
        break;
      case 'mage':
        osc.frequency.setValueAtTime(basePitch * 1.1, now);
        osc.frequency.exponentialRampToValueAtTime(basePitch * 0.7, now + 0.05);
        osc.type = 'triangle';
        break;
      case 'warrior':
        osc.frequency.setValueAtTime(basePitch * 0.6, now);
        osc.frequency.exponentialRampToValueAtTime(basePitch * 0.3, now + 0.08);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        break;
      default:
        osc.frequency.setValueAtTime(basePitch, now);
        osc.frequency.exponentialRampToValueAtTime(basePitch * 0.6, now + 0.05);
    }

    // Add slight vibrato based on variant
    if (variant % 2 === 0) {
      osc.frequency.setValueAtTime(osc.frequency.value + (variant - 2) * 20, now + 0.02);
    }

    gain.gain.setValueAtTime(this.masterVolume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.08);
  },

  // Footstep (design doc: Warrior steps cause low-freq screen shake)
  playFootstep(weight = 'medium') {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';

    switch (weight) {
      case 'heavy':
        osc.frequency.setValueAtTime(40, now);
        gain.gain.setValueAtTime(this.masterVolume * 0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        break;
      case 'light':
        osc.frequency.setValueAtTime(120, now);
        gain.gain.setValueAtTime(this.masterVolume * 0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        break;
      default:
        osc.frequency.setValueAtTime(80, now);
        gain.gain.setValueAtTime(this.masterVolume * 0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    }

    osc.start(now);
    osc.stop(now + 0.08);
  },

  // UI sound: menu select
  playUISelect() {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.setValueAtTime(800, now + 0.03);
    gain.gain.setValueAtTime(this.masterVolume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.start(now);
    osc.stop(now + 0.06);
  },

  // UI sound: menu confirm
  playUIConfirm() {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;

    [400, 600, 800].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(this.masterVolume * 0.15, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.08);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.08);
    });
  },

  // Timer tick (design doc: soft click, increases volume near end)
  playTimerTick(urgency = 0) {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const vol = this.masterVolume * (0.05 + urgency * 0.15);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(1000 + urgency * 200, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc.start(now);
    osc.stop(now + 0.02);
  },

  // Special ability activation
  playSpecial(type = 'default') {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Rising arpeggio
    const notes = [200, 300, 400, 600, 800];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(this.masterVolume * 0.12, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.1);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.1);
    });
  },

  // Block: Short metallic clank (square 800Hz → 200Hz, 0.03s)
  playBlock() {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
    gain.gain.setValueAtTime(this.masterVolume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.start(now);
    osc.stop(now + 0.03);
  },

  // Dash: Whoosh noise burst (bandpass 600Hz, 0.04s)
  playDash() {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const duration = 0.04;
    const bufferSize = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.Q.setValueAtTime(1, now);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(this.masterVolume * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.start(now);
    source.stop(now + duration);
  },

  // Level up: Ascending C-E-G-C arpeggio (triangle wave, cheerful)
  playLevelUp() {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const notes = [262, 330, 392, 523]; // C4 - E4 - G4 - C5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(this.masterVolume * 0.2, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.1);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.1);
    });
  },

  // Bonfire: Warm crackle (3 quick filtered noise bursts)
  playBonfire() {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;
    for (let b = 0; b < 3; b++) {
      const duration = 0.08;
      const bufferSize = Math.ceil(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      source.buffer = buffer;
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800 + Math.random() * 1200, now + b * 0.1);
      filter.Q.setValueAtTime(0.5, now + b * 0.1);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      const t = now + b * 0.1;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.15, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      source.start(t);
      source.stop(t + duration);
    }
  },

  // Death: Descending tones with second layer
  playDeath() {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Primary descending tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
    gain.gain.setValueAtTime(this.masterVolume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);

    // Second layer: lower sawtooth, slower descent
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(200, now);
    osc2.frequency.exponentialRampToValueAtTime(40, now + 0.5);
    gain2.gain.setValueAtTime(this.masterVolume * 0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.start(now);
    osc2.stop(now + 0.5);
  },

  // Menu move: Very soft click (sine 1000Hz, 0.015s, 0.05 volume)
  playMenuMove() {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    gain.gain.setValueAtTime(this.masterVolume * 0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    osc.start(now);
    osc.stop(now + 0.015);
  },

  // --- BOSS MUSIC (3-layer drone with LFO + filter sweep) ---

  playBossMusic() {
    if (!this.ctx || this.muted) return;
    this.ensureContext();
    this.stopBossMusic();

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Output gain (total ~0.07)
    const outputGain = ctx.createGain();
    outputGain.gain.setValueAtTime(this.masterVolume * 0.07, now);
    outputGain.connect(ctx.destination);

    // Shared filter with sweep (100Hz–400Hz)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, now);
    filter.Q.setValueAtTime(3, now);
    filter.connect(outputGain);

    // Filter sweep LFO (0.05Hz → slow ~20s cycle)
    const filterLfo = ctx.createOscillator();
    const filterLfoGain = ctx.createGain();
    filterLfo.type = 'sine';
    filterLfo.frequency.setValueAtTime(0.05, now);
    filterLfoGain.gain.setValueAtTime(150, now); // 250 ± 150 = 100–400
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(filter.frequency);
    filterLfo.start(now);

    // Layer 1: Bass drone — 55Hz sawtooth
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(55, now);
    bassGain.gain.setValueAtTime(0.5, now);
    bassOsc.connect(bassGain);
    bassGain.connect(filter);
    bassOsc.start(now);

    // Layer 2: Mid pulse — 110Hz square, amplitude modulated by LFO
    const midOsc = ctx.createOscillator();
    const midGain = ctx.createGain();
    const ampLfo = ctx.createOscillator();
    const ampLfoGain = ctx.createGain();
    midOsc.type = 'square';
    midOsc.frequency.setValueAtTime(110, now);
    midGain.gain.setValueAtTime(0.3, now);
    ampLfo.type = 'sine';
    ampLfo.frequency.setValueAtTime(0.5, now); // 2-second modulation cycle
    ampLfoGain.gain.setValueAtTime(0.3, now);
    ampLfo.connect(ampLfoGain);
    ampLfoGain.connect(midGain.gain);
    midOsc.connect(midGain);
    midGain.connect(filter);
    ampLfo.start(now);
    midOsc.start(now);

    // Layer 3: High shimmer — 220Hz triangle, very quiet (bypasses filter)
    const highOsc = ctx.createOscillator();
    const highGain = ctx.createGain();
    highOsc.type = 'triangle';
    highOsc.frequency.setValueAtTime(220, now);
    highGain.gain.setValueAtTime(0.08, now);
    highOsc.connect(highGain);
    highGain.connect(outputGain); // Direct to output for bright shimmer
    highOsc.start(now);

    // Store all nodes for cleanup
    this._bossNodes = [bassOsc, midOsc, highOsc, filterLfo, ampLfo];
    this._bossGain = outputGain;
  },

  stopBossMusic() {
    if (this._bossNodes) {
      this._bossNodes.forEach(n => { try { n.stop(); } catch (e) {} });
      this._bossNodes = null;
    }
    if (this._bossGain) {
      try { this._bossGain.disconnect(); } catch (e) {}
      this._bossGain = null;
    }
    this._bossOsc = null; // Legacy compat
  },

  // --- MASTER VOLUME CONTROL ---

  // Set target volume (0–1), will smoothly transition via update()
  setVolume(v) {
    this._targetVolume = Math.max(0, Math.min(1, v));
  },

  // --- PER-FRAME UPDATE (call from engine loop) ---

  update() {
    // Smooth volume transition (exponential lerp, ~10 frames to converge)
    if (Math.abs(this.masterVolume - this._targetVolume) > 0.001) {
      this.masterVolume += (this._targetVolume - this.masterVolume) * 0.15;
    } else {
      this.masterVolume = this._targetVolume;
    }

    // Sync continuous sounds to current master volume
    if (this.ctx) {
      const now = this.ctx.currentTime;

      if (this._ambientGain && this._ambientActive) {
        this._ambientGain.gain.setValueAtTime(this.masterVolume, now);
      }

      if (this._bossGain) {
        this._bossGain.gain.setValueAtTime(this.masterVolume * 0.07, now);
      }
    }
  },

  // Toggle mute
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
};

const SFX = AudioSystem;