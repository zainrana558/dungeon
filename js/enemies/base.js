// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Enemy Base Class
// Internal Drives (Aggression, Fear, Greed, Patience)
// Fixed-timestep interpolation support
// ============================================================

class Enemy {
  constructor(config) {
    this.id = config.id || 'enemy_' + Math.random().toString(36).substr(2, 6);
    this.name = config.name || 'Enemy';
    this.characterType = config.type || 'enemy';
    this.tier = config.tier || 1;

    this.x = config.x || 400;
    this.y = config.y || GAME.height - 140;
    this.width = config.width || 28;
    this.height = config.height || 40;
    this.groundY = this.y;

    // Interpolation: previous position for smooth rendering between physics ticks
    this.prevX = this.x;
    this.prevY = this.y;

    // Stats
    this.maxHP = config.maxHP || 30;
    this.hp = this.maxHP;
    this.damage = config.damage || 5;

    // Movement
    this.walkSpeed = config.walkSpeed || 1.5;
    this.facingRight = true;
    this.vx = 0;
    this.vy = 0;
    this.grounded = true;

    // Smooth AI movement tracking
    this._aiTargetSpeed = 0;
    this._aiAccelFrames = config.aiAccelFrames || 10;

    // Hurtbox
    this.hurtbox = config.hurtbox || { x: 0, y: 0, w: 28, h: 40 };

    // AI Drives (Aggression, Fear, Greed, Patience) — values 0-100
    this.drives = {
      aggression: config.aggression || 50,
      fear: config.fear || 30,
      greed: config.greed || 20,
      patience: config.patience || 40,
    };

    // Combat state
    this.state = 'idle';
    this.stateTimer = 0;
    this.attackCooldown = 0;
    this.currentAttacks = [];
    this.hitstunRemaining = 0;
    this.knockbackX = 0;
    this.invincible = false;
    this.invincibleTimer = 0;

    // Blocking (for orcs)
    this.isBlocking = false;
    this.blockTimer = 0;
    this.blockDuration = 120;
    this.blockGap = 30;

    // Visual
    this.flashWhite = 0;
    this.animFrame = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.fearActive = false;

    // Specific behavior flags
    this.behaviorFlags = {};
  }

  update() {
    // Save previous position for interpolation
    this.prevX = this.x;
    this.prevY = this.y;

    if (this.dead) {
      this.deathTimer++;
      return;
    }

    this.stateTimer++;
    this.animFrame++;

    // Timers
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.invincibleTimer > 0) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }
    if (this.flashWhite > 0) this.flashWhite--;

    // Hitstun
    if (this.hitstunRemaining > 0) {
      this.hitstunRemaining--;
      this.x += this.knockbackX;
      this.knockbackX *= 0.85;
      if (this.hitstunRemaining <= 0) this.state = 'idle';
      this.applyGravity();
      return;
    }

    // Process attacks
    for (let i = this.currentAttacks.length - 1; i >= 0; i--) {
      if (!CMB.updateAttack(this.currentAttacks[i])) {
        this.currentAttacks.splice(i, 1);
      }
    }

    if (this.currentAttacks.length === 0 && this.state === 'attack') {
      this.state = 'idle';
    }

    // AI behavior
    this.updateAI();

    // Process hit detection against player
    if (this.state === 'attack' && this.currentAttacks.length > 0) {
      CMB.processAttacks(this, this.currentAttacks, [GAME.player]);
    }

    this.applyGravity();
    this.x = Math.max(0, Math.min(this.x, GAME.width - this.width));

    // Block cycle for orcs
    if (this.blockTimer > 0) {
      this.blockTimer--;
      if (this.blockTimer <= 0) {
        this.isBlocking = !this.isBlocking;
        this.blockTimer = this.isBlocking ? this.blockDuration : this.blockGap;
      }
    }
  }

  applyGravity() {
    if (!this.grounded) {
      this.vy += 0.6;
      this.y += this.vy;
    }
    // Threshold-based ground detection
    if (this.y >= this.groundY - 0.5) {
      this.y = this.groundY;
      this.vy = 0;
      this.grounded = true;
    }
  }

  // Override per enemy type
  updateAI() {
    // Basic AI: move toward player with EXPONENTIAL SMOOTHING
    const player = GAME.player;
    if (!player || player.dead) return;

    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    this.facingRight = dx > 0;

    // Fear: if HP low and fear drive high, retreat
    if (this.hp < this.maxHP * 0.3 && this.drives.fear > 50 && !this.fearActive) {
      this.fearActive = true;
      this.walkSpeed *= 1.3;
    }

    const preferredDist = 60;
    if (dist > preferredDist + 20) {
      // Move toward player with exponential smoothing
      this._aiTargetSpeed = this.facingRight ? this.walkSpeed : -this.walkSpeed;
      this._smoothApproach();
      this.state = 'walk';
    } else if (dist < preferredDist - 20 && this.fearActive) {
      this._aiTargetSpeed = this.facingRight ? -this.walkSpeed : this.walkSpeed;
      this._smoothApproach();
    } else if (dist <= preferredDist && this.attackCooldown <= 0) {
      this.attackPlayer();
      this._aiTargetSpeed = 0;
    } else if (dist > preferredDist) {
      this._aiTargetSpeed = this.facingRight ? this.walkSpeed : -this.walkSpeed;
      this._smoothApproach();
      this.state = 'walk';
    } else {
      this._aiTargetSpeed = 0;
      this._smoothApproach();
      this.state = 'idle';
    }
  }

  /** Exponential smoothing for natural enemy movement */
  _smoothApproach() {
    const accelFactor = 1 - Math.exp(-1 / this._aiAccelFrames);
    this.vx += (this._aiTargetSpeed - this.vx) * accelFactor;
    this.x += this.vx;
  }

  attackPlayer() {
    this.attackCooldown = 40 + Math.floor(Math.random() * 30);
    this.state = 'attack';
    this.currentAttacks.push(CMB.createAttack(this, {
      startup: 8, active: 4, recovery: 10,
      damage: this.damage,
      hitbox: { x: 20, y: 5, w: 25, h: 20 },
      knockback: 4, hitstun: 12,
      whooshFrame: 6,
    }));
  }

  takeDamage(amount, attacker, attack) {
    if (this.dead || this.invincible) return;

    // Block check
    if (this.isBlocking && attack && !attack.guardCrush) {
      ParticleSystem.addSparks(this.x + this.width / 2, this.y + this.height / 2, 3);
      SFX.playImpact('light');
      return;
    }

    this.hp -= amount;
    this.flashWhite = 4;
    this.hitstunRemaining = 8;
    this.knockbackX = (attacker && attacker.x < this.x) ? 3 : -3;
    this.state = 'hitstun';
    ParticleSystem.addBloodSplatter(this.x + this.width / 2, this.y + this.height * 0.3, 4);

    // Fear drive increases when hit
    this.drives.fear = Math.min(100, this.drives.fear + 5);
    this.drives.aggression = Math.min(100, this.drives.aggression + 3);

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.deathTimer = 0;
      this.die();
    }
  }

  die() {
    ParticleSystem.addBloodSplatter(this.x + this.width / 2, this.y + this.height / 2, 10);
    SFX.playGrunt(this.characterType, 10);
  }

  applyKnockback(kbx, hitstun) {
    this.knockbackX = kbx;
    this.hitstunRemaining = hitstun;
    this.state = 'hitstun';
  }

  get deathAnimComplete() {
    return this.deathTimer > 40;
  }

  render(ctx, alpha = 0) {
    if (this.dead) {
      if (this.deathTimer > 40) return;
      this.renderDeath(ctx);
      return;
    }

    if (this.flashWhite > 0 && this.flashWhite % 2 === 0) {
      ctx.globalAlpha = 0.7;
    }

    // Interpolated position for smooth rendering
    const ix = Math.round(this.prevX + (this.x - this.prevX) * alpha);
    const iy = Math.round(this.prevY + (this.y - this.prevY) * alpha);
    this.renderEnemy(ctx, ix, iy);

    ctx.globalAlpha = 1;
  }

  renderEnemy(ctx, x, y) {
    ctx.fillStyle = '#884422';
    ctx.fillRect(x, y, this.width, this.height);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(x + 2, y + 2, 4, 4);
    ctx.fillRect(x + this.width - 6, y + 2, 4, 4);
  }

  renderDeath(ctx) {
    const alpha = 1 - this.deathTimer / 40;
    const x = Math.round(this.x);
    const y = Math.round(this.y) + this.deathTimer;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#664422';
    ctx.fillRect(x, y, this.width, this.height * alpha);
    ctx.globalAlpha = 1;
  }
};
