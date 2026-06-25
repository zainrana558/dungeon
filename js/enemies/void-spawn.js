// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Void Spawn (Tier 5: The Void)
// Ethereal, phase in/out, invincible 50% of time. Only damageable right after attack.
// ============================================================

class VoidSpawn extends Enemy {
  constructor(config = {}) {
    super({
      id: 'voidspawn',
      name: 'Void Spawn',
      type: 'void',
      tier: 5,
      width: 26,
      height: 36,
      maxHP: 25,
      damage: 14,
      walkSpeed: 2.5,
      aggression: 80,
      fear: 5,
      greed: 5,
      patience: 50,
      hurtbox: { x: 0, y: 0, w: 26, h: 36 },
      ...config,
    });

    this.phased = false;
    this.phaseTimer = 0;
    this.phaseInterval = 60; // Switch every 60 frames
    this.vulnerableWindow = 0;
    this.teleportCooldown = 0;
  }

  update() {
    if (this.dead) {
      this.deathTimer++;
      return;
    }

    this.stateTimer++;
    this.animFrame++;

    // Phase toggle
    this.phaseTimer++;
    if (this.phaseTimer >= this.phaseInterval) {
      this.phaseTimer = 0;
      this.phased = !this.phased;
      // Brief vulnerable window right after phasing in
      if (!this.phased) this.vulnerableWindow = 15;
    }
    if (this.vulnerableWindow > 0) this.vulnerableWindow--;

    if (this.teleportCooldown > 0) this.teleportCooldown--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.flashWhite > 0) this.flashWhite--;

    if (this.phased) {
      // Invisible and invincible — drift toward player
      this.invincible = true;
      const player = GAME.player;
      if (player && !player.dead) {
        this.x += (player.x - this.x) * 0.02;
        this.y += (player.y - this.y) * 0.02;
      }
      return;
    }

    this.invincible = false;

    // Attack right after appearing
    if (this.attackCooldown <= 0 && this.vulnerableWindow > 0) {
      this.attackPlayer();
      this.teleportCooldown = 90;
    }

    // Teleport occasionally
    if (this.teleportCooldown <= 0) {
      this.teleportCooldown = 120 + Math.random() * 60;
      this.phased = true;
      this.phaseTimer = 0;
      ParticleSystem.addTeleportEffect(this.x + this.width / 2, this.y + this.height / 2, '#8800ff');
    }
  }

  attackPlayer() {
    this.attackCooldown = 30;
    this.state = 'attack';
    this.currentAttacks.push(CMB.createAttack(this, {
      startup: 6, active: 4, recovery: 8,
      damage: this.damage,
      hitbox: { x: 18, y: 5, w: 24, h: 20 },
      knockback: 6, hitstun: 16,
      whooshFrame: 4,
    }));
  }

  takeDamage(amount, attacker, attack) {
    // Can only be damaged during vulnerable window (right after attacking)
    if (this.vulnerableWindow <= 0 && !this.phased) {
      // Phase out on hit attempt
      this.phased = true;
      this.phaseTimer = 0;
      ParticleSystem.addTeleportEffect(this.x + this.width / 2, this.y + this.height / 2, '#ff00ff');
      return;
    }
    super.takeDamage(amount, attacker, attack);
  }

  render(ctx) {
    if (this.dead) {
      if (this.deathTimer > 30) return;
      ctx.globalAlpha = 1 - this.deathTimer / 30;
      this.renderVoid(ctx);
      ctx.globalAlpha = 1;
      return;
    }

    if (this.phased) {
      ctx.globalAlpha = 0.15;
      this.renderVoid(ctx);
      ctx.globalAlpha = 1;
      return;
    }

    // Blink during phasing transitions
    if (this.phaseTimer < 5 || this.phaseTimer > 55) {
      ctx.globalAlpha = 0.3 + Math.abs(Math.sin(this.phaseTimer * 0.1)) * 0.7;
    }

    this.renderVoid(ctx);
    ctx.globalAlpha = 1;
  }

  renderVoid(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    // Ethereal body
    const flicker = Math.sin(this.animFrame * 0.3) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(60, 0, 80, ${flicker})`;
    ctx.fillRect(x, y, this.width, this.height);

    // Jagged edges
    ctx.fillStyle = 'rgba(100, 0, 120, 0.6)';
    ctx.fillRect(x, y, this.width, 4);
    ctx.fillRect(x, y + this.height / 2 - 2, this.width, 2);
    ctx.fillRect(x + this.width / 2 - 3, y + this.height - 4, 6, 4);

    // White slash eyes (blink in and out)
    if (Math.floor(this.animFrame / 10) % 3 !== 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + this.width / 2 - 5, y + 6, 3, 2);
      ctx.fillRect(x + this.width / 2 + 2, y + 6, 3, 2);
    }

    // Glowing edges
    ctx.fillStyle = 'rgba(150, 0, 200, 0.3)';
    ctx.fillRect(x - 2, y - 2, this.width + 4, 2);
    ctx.fillRect(x - 2, y + this.height, this.width + 4, 2);
    ctx.fillRect(x - 2, y, 2, this.height);
    ctx.fillRect(x + this.width, y, 2, this.height);

    // Vulnerable window indicator
    if (this.vulnerableWindow > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x - 2, y - 2, this.width + 4, this.height + 4);
    }
  }
};
