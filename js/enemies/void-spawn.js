// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Void Spawn (Tier 5: The Void)
// Ethereal, phase in/out, invincible 50% of time.
// Enhanced: teleport behind player, visual clone (confusion),
// phase in/out with new position on each cycle.
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

    // === NEW: Visual clone (doesn't deal damage, causes confusion) ===
    this.clone = null;
    this.cloneTimer = 0;
    this.cloneInterval = 180; // Spawn clone every 3 seconds

    // === NEW: Teleport behind player frequently ===
    this.behindTeleportTimer = 150 + Math.floor(Math.random() * 60);

    // === NEW: Phase to new position (not just drift) ===
    this._phaseNewX = 0;
    this._phaseNewY = 0;
  }

  update() {
    if (this.dead) {
      // Clean up clone on death
      this.clone = null;
      this.deathTimer++;
      return;
    }

    this.stateTimer++;
    this.animFrame++;

    const player = GAME.player;
    const hasPlayer = player && !player.dead;

    // === CLONE SPAWNING ===
    this.cloneTimer++;
    if (this.cloneTimer >= this.cloneInterval && !this.phased) {
      this.cloneTimer = 0;
      // Spawn a visual clone that doesn't deal damage
      if (hasPlayer) {
        const cloneOffset = (Math.random() > 0.5 ? 1 : -1) * (80 + Math.random() * 60);
        this.clone = {
          x: player.x + cloneOffset,
          y: this.groundY - this.height,
          life: 120, // 2 seconds
        };
        ParticleSystem.addTeleportEffect(this.clone.x + this.width / 2, this.clone.y + this.height / 2, '#ff00ff');
      }
    }
    // Update clone lifetime
    if (this.clone) {
      this.clone.life--;
      if (this.clone.life <= 0) {
        this.clone = null;
      }
    }

    // === PHASE TOGGLE with new position ===
    this.phaseTimer++;
    if (this.phaseTimer >= this.phaseInterval) {
      this.phaseTimer = 0;
      this.phased = !this.phased;

      if (!this.phased) {
        // Phase IN: brief vulnerable window
        this.vulnerableWindow = 15;
        // Appear at new position
        if (hasPlayer) {
          // Teleport to a position near player but not on top
          const offsetX = (Math.random() - 0.5) * 120;
          this._phaseNewX = player.x + offsetX;
          this._phaseNewX = Math.max(20, Math.min(GAME.width - this.width - 20, this._phaseNewX));
          this._phaseNewY = this.groundY - this.height;
          this.x = this._phaseNewX;
          this.y = this._phaseNewY;
          ParticleSystem.addTeleportEffect(this.x + this.width / 2, this.y + this.height / 2, '#aa00ff');
        }
      } else {
        // Phase OUT: become invincible, drift
        ParticleSystem.addTeleportEffect(this.x + this.width / 2, this.y + this.height / 2, '#8800ff');
      }
    }
    if (this.vulnerableWindow > 0) this.vulnerableWindow--;

    if (this.teleportCooldown > 0) this.teleportCooldown--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.flashWhite > 0) this.flashWhite--;

    if (this.phased) {
      // Invisible and invincible — drift toward player's new position
      this.invincible = true;
      if (hasPlayer) {
        this.x += (player.x - this.x) * 0.02;
        this.y += (player.y - this.y) * 0.02;
      }
      return;
    }

    this.invincible = false;

    // === TELEPORT BEHIND PLAYER frequently ===
    this.behindTeleportTimer--;
    if (this.behindTeleportTimer <= 0 && hasPlayer) {
      this.behindTeleportTimer = 150 + Math.floor(Math.random() * 60);
      // Teleport behind the player
      const behindX = player.facingRight
        ? player.x - 50 - Math.random() * 30
        : player.x + player.width + 20 + Math.random() * 30;
      ParticleSystem.addTeleportEffect(this.x + this.width / 2, this.y + this.height / 2, '#8800ff');
      this.x = Math.max(10, Math.min(GAME.width - this.width - 10, behindX));
      this.y = this.groundY - this.height;
      ParticleSystem.addTeleportEffect(this.x + this.width / 2, this.y + this.height / 2, '#aa00ff');
      SFX.playImpact('light');

      // Attack immediately after teleporting behind
      if (this.attackCooldown <= 0) {
        this.attackPlayer();
        this.teleportCooldown = 90;
      }
      return;
    }

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

    // === RENDER CLONE (visual only, no damage) ===
    if (this.clone && !this.phased) {
      const cloneAlpha = Math.min(1, this.clone.life / 30) * 0.5;
      ctx.globalAlpha = cloneAlpha;
      this.renderVoidAt(ctx, this.clone.x, this.clone.y);
      // Clone label
      ctx.fillStyle = `rgba(200, 0, 255, ${cloneAlpha * 0.5})`;
      ctx.fillRect(this.clone.x + this.width / 2 - 2, this.clone.y - 6, 4, 2);
      ctx.globalAlpha = 1;
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
    this.renderVoidAt(ctx, Math.round(this.x), Math.round(this.y));
  }

  renderVoidAt(ctx, x, y) {
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
