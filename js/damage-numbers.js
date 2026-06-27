// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Floating Damage Numbers
// Pop animation, per-type colors/sizes, shadow outlines, drift
// ============================================================

const DamageNumbers = {
  numbers: [],

  // Type config: color, font size, extra scale
  TYPES: {
    damage:  { color: '#ffffff', size: 12, scale: 1.0 },
    heavy:   { color: '#ffff44', size: 14, scale: 1.15 },
    counter: { color: '#ff3366', size: 15, scale: 1.2 },
    heal:    { color: '#44ff66', size: 12, scale: 1.0 },
    blocked: { color: '#888888', size: 10, scale: 0.85 },
    ko:      { color: '#ffaa00', size: 20, scale: 1.4 },
  },

  LIFETIME: 45,
  RISE_SPEED: 1.5,
  DRIFT_RANGE: 0.3,
  FADE_START: 0.8, // fade begins at 80% of lifetime (last 20%)

  init() {
    this.numbers = [];
  },

  /**
   * Spawn a floating damage/heal/block number.
   * @param {number} x         World X
   * @param {number} y         World Y
   * @param {number|string} amount  Damage value or text like 'BLOCKED'
   * @param {string} type      'damage'|'heavy'|'counter'|'heal'|'blocked'|'ko'
   */
  add(x, y, amount, type) {
    const cfg = this.TYPES[type] || this.TYPES.damage;

    const num = {
      x: x,
      y: y,
      text: String(amount),
      type: type,
      color: cfg.color,
      size: cfg.size,
      baseScale: cfg.scale,
      life: this.LIFETIME,
      maxLife: this.LIFETIME,
      frame: 0,
      driftX: (Math.random() - 0.5) * 2 * this.DRIFT_RANGE, // fixed per-number drift
    };

    this.numbers.push(num);

    // KO extras: screen flash + sparks + shake
    if (type === 'ko') {
      GAME.triggerFlash('rgba(255, 200, 0, 0.25)', 8);
      GAME.triggerShake(4, 10);
      ParticleSystem.addSparks(x, y, 12, -Math.PI / 2, 1.0);
    }
  },

  update() {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.frame++;
      n.y -= this.RISE_SPEED;
      n.x += n.driftX;
      n.life--;

      if (n.life <= 0) {
        this.numbers.splice(i, 1);
      }
    }
  },

  render(ctx) {
    for (const n of this.numbers) {
      // Pop scale: exponential decay from 1.8 -> 1.0
      const popScale = 1 + 0.8 * Math.exp(-n.frame * 0.3);
      const scale = popScale * n.baseScale;

      // Alpha: full until last 20% of lifetime, then fade
      const lifeRatio = n.life / n.maxLife;
      let alpha = 1;
      if (lifeRatio < (1 - this.FADE_START)) {
        alpha = lifeRatio / (1 - this.FADE_START);
      }

      const fontSize = Math.round(n.size * scale);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold ' + fontSize + 'px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      var px = Math.round(n.x);
      var py = Math.round(n.y);

      // Shadow/outline: draw text in black offset by (1,1)
      ctx.fillStyle = '#000000';
      ctx.fillText(n.text, px + 1, py + 1);

      // Main colored text
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, px, py);

      ctx.restore();
    }
  },
};
