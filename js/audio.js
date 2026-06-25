// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Audio System
// Synthesized chip-tune waveforms, frame-synced sound effects
// ============================================================

const AudioSystem = {
  ctx: null,
  masterVolume: 0.5,
  muted: false,

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

  // Boss music (simple generated melody loop)
  playBossMusic() {
    if (!this.ctx || this.muted) return;
    this.ensureContext();

    // Boss music is a low drone with occasional hits
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.Q.setValueAtTime(5, now);
    gain.gain.setValueAtTime(this.masterVolume * 0.06, now);

    osc.start(now);

    // Store for later cleanup
    this._bossOsc = osc;
    this._bossGain = gain;
  },

  stopBossMusic() {
    if (this._bossOsc) {
      try { this._bossOsc.stop(); } catch (e) {}
      this._bossOsc = null;
      this._bossGain = null;
    }
  },

  // Toggle mute
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
};

const SFX = AudioSystem;
