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

    // Blocking (for orcs and patient enemies)
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

    // Patience wait counter (used by enhanced AI)
    this._patienceWait = null;

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

    // Smart reactive block cycle — only for patient enemies
    if (this.drives.patience > 50) {
      const player = GAME.player;
      const playerFacingUs = player && (
        (player.facingRight && player.x < this.x) ||
        (!player.facingRight && player.x > this.x)
      );
      const playerInRange = player && Math.abs(player.x - this.x) < 100;
      const playerAttacking = player && player.state === 'attack';

      // 6-frame read window: start blocking when player begins attack
      if (!this.isBlocking && playerFacingUs && playerInRange && playerAttacking && this.blockTimer <= 0) {
        if (player.currentAttacks && player.currentAttacks.length > 0) {
          const latestAttack = player.currentAttacks[player.currentAttacks.length - 1];
          if (latestAttack && latestAttack.timer <= 6) {
            this.isBlocking = true;
            this.blockTimer = this.blockDuration;
          }
        }
      }

      // Cycle out of block
      if (this.isBlocking) {
        this.blockTimer--;
        if (this.blockTimer <= 0) {
          this.isBlocking = false;
          this.blockTimer = this.blockGap;
        }
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

  // Enhanced AI: drive-based behavior with patience, aggression, fear, greed
  updateAI() {
    const player = GAME.player;
    if (!player || player.dead) return;

    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    this.facingRight = dx > 0;

    // === FEAR RETREAT ===
    // When HP < 30% and fear > 50, 20% chance per frame to back away
    if (this.hp < this.maxHP * 0.3 && this.drives.fear > 50) {
      if (!this.fearActive) {
        this.fearActive = true;
        this.walkSpeed *= 1.3;
      }
      if (Math.random() < 0.2) {
        this._aiTargetSpeed = this.facingRight ? -this.walkSpeed : this.walkSpeed;
        this._smoothApproach();
        this.state = 'walk';
        return;
      }
    }

    // === AGGRESSION VARIABILITY ===
    // Higher aggression = faster approach speed
    const aggroMult = 0.7 + (this.drives.aggression / 100) * 0.6;
    const effectiveSpeed = this.walkSpeed * aggroMult;

    // === STAGGERED APPROACH ===
    // Only 2 enemies can be in attack range at once
    const attackRange = 80;
    let enemiesInAttackRange = 0;
    if (GAME.enemies) {
      for (const e of GAME.enemies) {
        if (e === this || e.dead) continue;
        const eDist = Math.abs(e.x - player.x);
        if (eDist < attackRange) enemiesInAttackRange++;
      }
    }
    const canAttack = enemiesInAttackRange < 2;

    // === PATIENCE SYSTEM ===
    // Wait patience * 0.5 frames before attacking (creates tension)
    const preferredDist = 60;
    if (dist <= preferredDist + 20 && dist >= preferredDist - 20 && this._patienceWait == null) {
      this._patienceWait = Math.floor(this.drives.patience * 0.5);
    }
    if (dist > preferredDist + 40) {
      this._patienceWait = null;
    }

    // === GREED FLANKING ===
    // High greed enemies approach at a vertical offset instead of straight line
    let flankingY = 0;
    if (this.drives.greed > 60 && dist > 80) {
      const flankDir = ((this.id.charCodeAt(this.id.length - 1) || 0) % 2 === 0) ? -1 : 1;
      flankingY = flankDir * 0.8;
    }

    // === MOVEMENT & ATTACK ===
    if (dist > preferredDist + 20) {
      this._aiTargetSpeed = this.facingRight ? effectiveSpeed : -effectiveSpeed;
      this._smoothApproach();
      this.y += flankingY;
      this.state = 'walk';
    } else if (dist < preferredDist - 20 && this.fearActive) {
      this._aiTargetSpeed = this.facingRight ? -effectiveSpeed : effectiveSpeed;
      this._smoothApproach();
    } else if (dist <= preferredDist && this.attackCooldown <= 0 && canAttack) {
      // Patience check: must wait before attacking
      if (this._patienceWait != null && this._patienceWait > 0) {
        this._patienceWait--;
        this._aiTargetSpeed = 0;
        this._smoothApproach();
        this.state = 'idle';
      } else {
        // ATTACK VARIETY: 30% chance for heavy attack (longer range, more recovery)
        if (Math.random() < 0.3) {
          this.heavyAttackPlayer();
        } else {
          this.attackPlayer();
        }
        this._patienceWait = null;
        this._aiTargetSpeed = 0;
      }
    } else if (dist > preferredDist) {
      this._aiTargetSpeed = this.facingRight ? effectiveSpeed : -effectiveSpeed;
      this._smoothApproach();
      this.y += flankingY;
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
    // Aggression reduces cooldown (higher aggression = more frequent attacks)
    const aggroCooldownReduction = Math.floor((this.drives.aggression / 100) * 20);
    this.attackCooldown = Math.max(20, 40 + Math.floor(Math.random() * 30) - aggroCooldownReduction);
    this.state = 'attack';
    this.currentAttacks.push(CMB.createAttack(this, {
      startup: 8, active: 4, recovery: 10,
      damage: this.damage,
      hitbox: { x: 20, y: 5, w: 25, h: 20 },
      knockback: 4, hitstun: 12,
      whooshFrame: 6,
    }));
  }

  /** Heavy attack: longer range, more recovery, guard crush. Used by base AI variety. */
  heavyAttackPlayer() {
    const aggroCooldownReduction = Math.floor((this.drives.aggression / 100) * 15);
    this.attackCooldown = Math.max(30, 60 + Math.floor(Math.random() * 20) - aggroCooldownReduction);
    this.state = 'attack';
    this.currentAttacks.push(CMB.createAttack(this, {
      startup: 14, active: 5, recovery: 22,
      damage: this.damage * 1.6,
      hitbox: { x: 18, y: 0, w: 40, h: 28 },
      knockback: 7, hitstun: 18,
      whooshFrame: 10,
      guardCrush: true,
    }));
    SFX.playImpact('heavy');
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
