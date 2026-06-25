// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — THE ASSASSIN (Codename: Razor)
// A Blade in the Dark — feint dash, shadow swap, mirage clone
// ============================================================

class Assassin extends Character {
  constructor(config = {}) {
    super({
      id: 'assassin',
      name: 'The Assassin',
      type: 'assassin',
      width: 28,
      height: 46,
      walkSpeed: 4.0,
      accelFrames: 5,
      decelFrames: 8,
      airControl: 0.75,
      jumpVelocity: -13,
      maxHP: 80,
      baseDamage: 9,
      hurtbox: { x: 2, y: 0, w: 24, h: 46 },
      hiddenAbilityHP: 0.3,
      ...config,
    });

    this.backstabCount = 0;
    this.mirageClone = null;
    this.mirageActive = false;
    this.feinting = false;
    this.feintWindow = 0;
    this.daggerFlipTimer = 0;
  }

  // Light: quick dagger slash
  getLightAttackConfig() {
    return {
      startup: 4, active: 2, recovery: 6, damage: 6,
      hitbox: { x: 20, y: 8, w: 22, h: 16 },
      knockback: 2, hitstun: 10,
      whooshFrame: 2,
    };
  }

  // Heavy: double slash
  getHeavyAttackConfig() {
    return {
      startup: 10, active: 6, recovery: 16, damage: 14,
      hitbox: { x: 22, y: 6, w: 28, h: 24 },
      knockback: 5, hitstun: 18,
      whooshFrame: 7,
    };
  }

  // Shadow Swap (Special): throws kunai, teleports on hit
  getSpecialAttackConfig() {
    return {
      startup: 12, active: 1, recovery: 8, damage: 10,
      hitbox: { x: 24, y: 10, w: 22, h: 12 },
      knockback: 3, hitstun: 10,
      isProjectile: true,
      whooshFrame: 8,
      animData: 'shadowSwap',
    };
  }

  getGrabConfig() {
    return {
      startup: 6, active: 2, recovery: 12, damage: 10,
      hitbox: { x: 12, y: 5, w: 18, h: 26 },
      knockback: 3, hitstun: 14,
      isGrab: true,
    };
  }

  // --- MOVEMENT WITH FEINT ---

  updateMovement() {
    super.updateMovement();

    // Dagger flip idle habit (every 5 seconds)
    this.daggerFlipTimer++;
    if (this.state === 'idle' && this.daggerFlipTimer > 300) {
      this.daggerFlipTimer = 0;
    }

    // Feint Step Dash: double-tap forward, can cancel with back on frame 5
    if (this.feintWindow > 0) {
      this.feintWindow--;
      if (IN.isBuffered('BACK', 1) && this.feintWindow >= 7) {
        // Cancel into backflip (frame 5 of dash)
        this.cancelFeint();
      }
    }

    if (this.grounded && this.state !== 'attack' && !this.feinting) {
      if (this._lastDashFrame && GAME.frameCount - this._lastDashFrame < 12) {
        if (IN.isBuffered('FORWARD', 2)) {
          this.startFeintDash();
        }
      }
      if (IN.isBuffered('FORWARD', 2)) {
        this._lastDashFrame = GAME.frameCount;
      }
    }
  }

  startFeintDash() {
    this.invincible = true;
    this.invincibleTimer = 10; // 4f startup + 6f active
    this.feinting = true;
    this.feintWindow = 10;

    const dashDist = 70;
    this.x += this.facingRight ? dashDist : -dashDist;
    ParticleSystem.addDustPuff(this.x - (this.facingRight ? dashDist : -dashDist) + this.width / 2, this.y + this.height);

    // After dash completes
    setTimeout(() => {
      if (this.feinting) {
        this.feinting = false;
        this.invincible = false;
      }
    }, 167);
  }

  cancelFeint() {
    // Backflip: shrink hurtbox 40% for 12 frames
    this.feinting = false;
    this.x -= this.facingRight ? 30 : -30;
    this.vy = -8;
    this.grounded = false;
    this._originalHurtbox = { ...this.hurtbox };
    this.hurtbox = { x: this.width * 0.3, y: this.height * 0.3, w: this.width * 0.4, h: this.height * 0.4 };
    this.invincible = true;
    this.invincibleTimer = 12;

    setTimeout(() => {
      this.hurtbox = this._originalHurtbox;
      this.invincible = false;
    }, 200);
  }

  // --- SPECIAL: Shadow Swap ---

  specialAttack() {
    if (this.specialCooldown > 0) return;
    const result = this.startAttack(this.getSpecialAttackConfig());
    if (result) {
      this.specialCooldown = 30;
    }
    return result;
  }

  updateAttacking() {
    if (this.currentAttacks.length > 0) {
      const atk = this.currentAttacks[0];
      if (atk.animData === 'shadowSwap') {
        // On frame 14: dissolve into crows
        if (atk.currentFrame === 14 && atk.hasHit) {
          this.shadowSwapTeleport();
        }
        // Frame 16: reappear behind enemy
        if (atk.currentFrame === 16 && atk.hasHit) {
          // Teleport already handled
        }
      }
    }
  }

  shadowSwapTeleport() {
    const target = GAME.boss || GAME.enemies[0];
    if (target) {
      ParticleSystem.addShadowCrows(this.x + this.width / 2, this.y + this.height / 2, 12);
      this.x = target.x + (this.facingRight ? -50 : target.width + 20);
      this.y = target.y;
      this.facingRight = target.x > this.x;
      ParticleSystem.addShadowCrows(this.x + this.width / 2, this.y + this.height / 2, 8);

      // Track backstab
      this.backstabCount++;
      if (this.backstabCount >= 3) {
        this.hiddenAbilityReady = true;
      }
    }
  }

  // --- HIDDEN ABILITY: Mirage ---
  // After 3 backstabs: Light+Heavy creates 1HP clone with 6-frame delay

  activateHiddenAbility() {
    super.activateHiddenAbility();
    this.hiddenAbilityTimer = 600; // 10 seconds
    this.mirageActive = true;
    this.backstabCount = 0;
  }

  deactivateHiddenAbility() {
    super.deactivateHiddenAbility();
    this.mirageActive = false;
    this.mirageClone = null;
  }

  update() {
    super.update();

    // Mirage clone management
    if (this.mirageActive && !this.mirageClone) {
      // Light+Heavy creates clone
      if (IN.isBuffered('LIGHT', 3) && IN.isBuffered('HEAVY', 3)) {
        this.createMirageClone();
      }
    }

    // Update clone
    if (this.mirageClone) {
      this.mirageClone.life--;
      if (this.mirageClone.life <= 0 || this.mirageClone.hp <= 0) {
        if (this.mirageClone.hp <= 0) {
          // Clone shrapnel explosion!
          CMB.addExplosion(this.mirageClone.x, this.mirageClone.y, 150, 15, this, true);
          ParticleSystem.addExplosion(this.mirageClone.x, this.mirageClone.y, 80, '#8800ff');
        }
        this.mirageClone = null;
      }
    }
  }

  createMirageClone() {
    this.mirageClone = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      hp: 1,
      life: 300, // 5 seconds
      facingRight: this.facingRight,
      history: [], // Store 6-frame delayed positions
    };

    // Store last 6 frames of position
    for (let i = 0; i < 6; i++) {
      this.mirageClone.history.push({ x: this.x, y: this.y, facingRight: this.facingRight });
    }
  }

  // --- RENDERING ---

  renderCharacter(ctx, x, y) {
    // Shadow (smaller, lighter)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 2, y + this.height - 2, this.width - 4, 3);

    // Legs (athletic, coiled)
    const bob = this.state === 'idle' ? Math.sin(this.animFrame * 0.2) * 2 : 0;
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(x + 4, y + this.height - 18 + bob, 6, 18);
    ctx.fillRect(x + this.width - 10, y + this.height - 18 - bob, 6, 18);

    // Boots
    ctx.fillStyle = '#1a0a2a';
    ctx.fillRect(x + 3, y + this.height - 2, 7, 4);
    ctx.fillRect(x + this.width - 10, y + this.height - 2, 7, 4);

    // Body (midnight purple leather)
    ctx.fillStyle = '#2a1a4a';
    ctx.fillRect(x + 3, y + 8, this.width - 6, this.height - 28);

    // Leather armor detail
    ctx.fillStyle = '#3a2a5a';
    ctx.fillRect(x + 3, y + 12, this.width - 6, 2);

    // Belt
    ctx.fillStyle = '#1a0a2a';
    ctx.fillRect(x + 3, y + this.height - 22, this.width - 6, 3);

    // Arms
    ctx.fillStyle = '#2a1a4a';
    ctx.fillRect(x + this.width - 8, y + 14, 8, 8);

    // Head
    ctx.fillStyle = '#f0e6d3'; // Pale skin
    ctx.fillRect(x + this.width / 2 - 4, y - 4, 8, 10);

    // Shock-white hair
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + this.width / 2 - 4, y - 7, 8, 4);

    // Blood-orange scarf (always moving)
    const scarfWave = Math.sin(this.animFrame * 0.3) * 2;
    ctx.fillStyle = '#ff4400';
    ctx.fillRect(x + (this.facingRight ? this.width - 1 : -5 + scarfWave),
                 y + 12 + scarfWave * 0.5, 6 + Math.abs(scarfWave), 4);
    // Scarf trail
    ctx.fillStyle = 'rgba(255, 68, 0, 0.5)';
    ctx.fillRect(x + (this.facingRight ? this.width + 1 : -10), y + 14, 8, 3);

    // Daggers
    const daggerX = this.facingRight ? x + this.width : x - 10;
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(daggerX + (this.facingRight ? 0 : -2), y + 16, 10, 2);
    // Dagger handle
    ctx.fillStyle = '#4a2a2a';
    ctx.fillRect(daggerX + (this.facingRight ? -2 : 8), y + 15, 3, 4);

    // Dagger flip animation
    if (Math.floor(this.daggerFlipTimer / 10) % 2 === 0) {
      // Flipping
      const flipAngle = Math.sin(this.daggerFlipTimer * 0.5) * 0.5;
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(daggerX + (this.facingRight ? 0 : -12),
                   y + 15 + flipAngle * 4, 10, 2);
    }
  }

  render(ctx) {
    // Render mirage clone first (behind main character)
    if (this.mirageClone) {
      const mc = this.mirageClone;
      ctx.globalAlpha = 0.4;
      this.renderCharacter(ctx, mc.x, mc.y);
      ctx.globalAlpha = 1;
    }
    super.render(ctx);
  }

  // Victory: crouches over body, plucks soul pixel, crushes it
  renderVictoryPose(ctx, x, y, timer) {
    this.renderCharacter(ctx, x, y);
    if (timer > 30 && timer < 60) {
      // Plucking soul
      const soulX = x + (this.facingRight ? this.width + 20 : -25);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(soulX, y + 20 - (timer - 30) * 2, 3, 3);
    } else if (timer >= 60) {
      // Crushing soul in palm
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = Math.max(0, 1 - (timer - 60) / 15);
      ctx.fillRect(this.facingRight ? x + this.width : x - 5, y + 16, 3, 3);
      ctx.globalAlpha = 1;
    }
  }
};
