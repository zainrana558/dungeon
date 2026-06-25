// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Base Character Class
// 3-phase attacks, movement physics, hurtboxes, animation states
// ============================================================

class Character {
  constructor(config) {
    // Identity
    this.id = config.id || 'char_' + Math.random().toString(36).substr(2, 6);
    this.name = config.name || 'Unknown';
    this.characterType = config.type || 'default';
    this.facingRight = true;

    // Position & Size
    this.x = config.x || 400;
    this.y = config.y || GAME.height - 140;
    this.width = config.width || 32;
    this.height = config.height || 48;
    this.groundY = this.y;

    // Movement physics (design doc specifications)
    this.walkSpeed = config.walkSpeed || 3.5;        // px/frame
    this.accelFrames = config.accelFrames || 8;       // frames to reach max speed
    this.decelFrames = config.decelFrames || 8;        // frames to stop
    this.airControl = config.airControl || 0.6;        // multiplier in air
    this.jumpVelocity = config.jumpVelocity || -12;
    this.jumpFrames = config.jumpFrames || 20;

    // Current movement state
    this.vx = 0;
    this.vy = 0;
    this.grounded = true;
    this.currentSpeed = 0;

    // Stats
    this.maxHP = config.maxHP || 100;
    this.hp = this.maxHP;
    this.damage = config.baseDamage || 10;

    // Hurtbox (relative to position)
    this.hurtbox = config.hurtbox || { x: 0, y: 0, w: 32, h: 48 };

    // Combat state
    this.state = 'idle'; // idle | walk | attack | block | hitstun | knockdown | dead
    this.stateTimer = 0;
    this.currentAttacks = [];   // Active attack objects
    this.comboCount = 0;
    this.comboTimer = 0;

    // Blocking
    this.isBlocking = false;
    this.blockStun = 0;

    // Hitstun / Knockback
    this.hitstunRemaining = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;

    // Invincibility
    this.invincible = false;
    this.invincibleTimer = 0;

    // Attack cooldowns
    this.attackCooldown = 0;
    this.specialCooldown = 0;

    // Hidden ability state
    this.hiddenAbilityReady = false;
    this.hiddenAbilityActive = false;
    this.hiddenAbilityTimer = 0;
    this.hiddenAbilityHPCheck = config.hiddenAbilityHP || 0.4; // %HP to trigger
    this.specialCount = 0; // For counting spell casts etc.

    // Animation
    this.animFrame = 0;
    this.animTimer = 0;
    this.breathPhase = 0;     // For idle breathing
    this.breathTimer = 0;
    this.flashWhite = 0;      // White flash on hit
    this.idleShiftTimer = 0;  // Weight shift timer

    // Victory/Defeat
    this.victoryPose = false;
    this.defeatPose = false;
    this.poseTimer = 0;
  }

  // ============================================================
  // MAIN UPDATE
  // ============================================================

  update() {
    if (this.state === 'dead') {
      this.updateDeath();
      return;
    }

    this.stateTimer++;
    this.animFrame++;

    // Timers
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.specialCooldown > 0) this.specialCooldown--;
    if (this.invincibleTimer > 0) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }
    if (this.flashWhite > 0) this.flashWhite--;
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    // Hitstun
    if (this.hitstunRemaining > 0) {
      this.hitstunRemaining--;
      this.x += this.knockbackX;
      this.y += this.knockbackY;
      this.knockbackX *= 0.85;
      this.knockbackY *= 0.85;
      if (this.hitstunRemaining <= 0) {
        this.state = 'idle';
      }
      this.updateGrounded();
      return;
    }

    // Block stun
    if (this.blockStun > 0) {
      this.blockStun--;
      return;
    }

    // Hidden ability update
    if (this.hiddenAbilityActive) {
      this.hiddenAbilityTimer--;
      if (this.hiddenAbilityTimer <= 0) {
        this.deactivateHiddenAbility();
      }
    }

    // Auto-check hidden ability trigger
    if (!this.hiddenAbilityActive && this.hp <= this.maxHP * this.hiddenAbilityHPCheck
        && !this.hiddenAbilityReady) {
      this.hiddenAbilityReady = true;
      this.activateHiddenAbility();
    }

    // Process active attacks
    for (let i = this.currentAttacks.length - 1; i >= 0; i--) {
      if (!CMB.updateAttack(this.currentAttacks[i])) {
        this.currentAttacks.splice(i, 1);
      }
    }

    // If attacking, handle attack state
    if (this.currentAttacks.length > 0) {
      this.updateAttacking();
    } else if (this.state === 'attack') {
      this.state = 'idle';
    }

    // Movement
    this.updateMovement();
    this.updateGrounded();

    // Process hit detection against enemies
    if (this.state === 'attack') {
      const targets = [...GAME.enemies];
      if (GAME.boss && !GAME.boss.dead) targets.push(GAME.boss);
      CMB.processAttacks(this, this.currentAttacks, targets);
    }

    // Clamp to screen bounds
    this.x = Math.max(0, Math.min(this.x, GAME.width - this.width));

    // Idle animations
    if (this.state === 'idle') {
      this.breathTimer++;
      if (this.breathTimer > 45) {
        this.breathPhase = (this.breathPhase + 1) % 2;
        this.breathTimer = 0;
      }
      this.idleShiftTimer++;
    }
  }

  // ============================================================
  // MOVEMENT
  // ============================================================

  updateMovement() {
    // Only move if not attacking, in hitstun, or dead
    if (this.state === 'attack' || this.state === 'hitstun' || this.state === 'dead') return;
    if (this.blockStun > 0) return;

    // Read input direction
    const dirX = IN.direction.x;
    const dirY = IN.direction.y;

    // Check block
    this.isBlocking = IN.isBlocking() && this.grounded && this.state !== 'attack';

    // Horizontal movement with acceleration
    const targetSpeed = dirX * this.walkSpeed;
    const accel = this.grounded ? (this.walkSpeed / this.accelFrames) : (this.walkSpeed / this.accelFrames * this.airControl);
    const decel = this.grounded ? (this.walkSpeed / this.decelFrames) : (this.walkSpeed / this.decelFrames * this.airControl * 0.7);

    if (Math.abs(targetSpeed) > 0.01) {
      // Accelerating toward target speed
      this.currentSpeed += (targetSpeed > this.currentSpeed ? 1 : -1) * Math.min(accel, Math.abs(targetSpeed - this.currentSpeed));
      this.state = this.state === 'idle' || this.state === 'walk' ? 'walk' : this.state;
    } else {
      // Decelerating to stop
      if (Math.abs(this.currentSpeed) < decel) {
        this.currentSpeed = 0;
        if (this.state === 'walk') this.state = 'idle';
      } else {
        this.currentSpeed -= Math.sign(this.currentSpeed) * decel;
      }
    }

    this.x += this.currentSpeed;

    // Update facing direction
    if (this.currentSpeed > 0.5) this.facingRight = true;
    if (this.currentSpeed < -0.5) this.facingRight = false;

    // Jump
    if (this.grounded && IN.isBuffered('UP', 6) && this.state !== 'attack') {
      this.vy = this.jumpVelocity;
      this.grounded = false;
      IN.setCoyote(this.id, 6); // Set coyote buffer
    }

    // Air movement
    if (!this.grounded) {
      this.vy += 0.6; // Gravity
      this.y += this.vy;
      this.x += dirX * this.walkSpeed * this.airControl * 0.5;
    }

    // Footstep sounds
    if (this.grounded && Math.abs(this.currentSpeed) > 0.5 && GAME.frameCount % 18 === 0) {
      SFX.playFootstep(this.getFootstepWeight());
    }
  }

  updateGrounded() {
    if (this.y >= this.groundY) {
      this.y = this.groundY;
      this.vy = 0;
      if (!this.grounded) {
        this.grounded = true;
        ParticleSystem.addDustPuff(this.x + this.width / 2, this.y + this.height);
      }
    }
  }

  getFootstepWeight() {
    return 'medium'; // Override per character
  }

  // ============================================================
  // ATTACK SYSTEM
  // ============================================================

  // Begin an attack
  startAttack(attackConfig) {
    if (this.state === 'hitstun' || this.state === 'dead') return false;
    if (this.hiddenAbilityActive && this.hiddenAbilityBlocksAttacks) return false;

    // Mash protection check
    if (GAME._mashActive && this.comboCount > 3) return false;

    const attack = CMB.createAttack(this, attackConfig);
    this.currentAttacks.push(attack);
    this.state = 'attack';
    this.comboCount++;
    this.comboTimer = 60; // 1 second combo window

    return attack;
  }

  // Light attack (quick, low damage)
  lightAttack() {
    if (this.attackCooldown > 0) return;
    return this.startAttack(this.getLightAttackConfig());
  }

  // Heavy attack (slow, high damage)
  heavyAttack() {
    if (this.attackCooldown > 0) return;
    return this.startAttack(this.getHeavyAttackConfig());
  }

  // Special move
  specialAttack() {
    if (this.specialCooldown > 0) return;
    return this.startAttack(this.getSpecialAttackConfig());
  }

  // Grab
  grabAttack() {
    if (this.attackCooldown > 0) return;
    return this.startAttack(this.getGrabConfig());
  }

  // Override these per character
  getLightAttackConfig() { return { startup: 5, active: 3, recovery: 8, damage: 8, hitbox: { x: 20, y: 10, w: 30, h: 20 } }; }
  getHeavyAttackConfig() { return { startup: 13, active: 5, recovery: 21, damage: 18, hitbox: { x: 20, y: 10, w: 40, h: 25 } }; }
  getSpecialAttackConfig() { return { startup: 12, active: 4, recovery: 20, damage: 15, hitbox: { x: 20, y: 5, w: 50, h: 35 } }; }
  getGrabConfig() { return { startup: 8, active: 3, recovery: 16, damage: 12, hitbox: { x: 15, y: 5, w: 20, h: 30 }, isGrab: true }; }

  updateAttacking() {
    // Characters can override to add per-frame behavior during attacks
  }

  // ============================================================
  // DAMAGE & DEFENSE
  // ============================================================

  takeDamage(amount, attacker, attack) {
    if (this.dead || this.state === 'dead') return;
    if (this.invincible) return;

    // Check blocking
    if (this.isBlocking && this.isBlockingAttack(attacker)) {
      this.onBlocked(attacker, attack);
      return;
    }

    // Apply damage
    const actualDamage = this.hiddenAbilityActive ? amount * (this.hiddenAbilityDR || 0.5) : amount;
    this.hp -= actualDamage;

    // Visual feedback
    this.flashWhite = 6;
    ParticleSystem.addBloodSplatter(this.x + this.width / 2, this.y + this.height * 0.3);

    // Knockback
    const dir = (attacker && attacker.x) ? (attacker.x < this.x ? 1 : -1) : (this.facingRight ? -1 : 1);
    this.applyKnockback(dir * 4, 12);

    // Check death
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  applyKnockback(kbx, hitstun) {
    this.knockbackX = kbx;
    this.knockbackY = -3;
    this.hitstunRemaining = hitstun;
    this.state = 'hitstun';
    this.currentAttacks = [];
  }

  isBlockingAttack(attacker) {
    // Must be facing the attacker
    if (attacker) {
      const attackerOnRight = attacker.x > this.x;
      return this.facingRight === attackerOnRight;
    }
    return true;
  }

  onBlocked(attacker, attack) {
    this.blockStun = 8;
  }

  die() {
    this.state = 'dead';
    this.hp = 0;
    this.poseTimer = 0;
    this.currentAttacks = [];
    ParticleSystem.addBloodSplatter(this.x + this.width / 2, this.y + this.height / 2, 15);
    if (this === GAME.player) {
      ParticleSystem.triggerScreenShatter();
      SFX.playImpact('ko');
      GAME.triggerHitstop(20);
    }
  }

  updateDeath() {
    this.poseTimer++;
    // Fall animation
    if (this.poseTimer < 30 && this.y < this.groundY + 10) {
      this.y += 1;
    }
  }

  get deathAnimComplete() {
    return this.poseTimer > 60;
  }

  // ============================================================
  // HIDDEN ABILITY
  // ============================================================

  activateHiddenAbility() {
    this.hiddenAbilityActive = true;
    this.hiddenAbilityTimer = 300; // 5 seconds default (300 frames)
    this.hiddenAbilityReady = false;
    SFX.playSpecial(this.characterType);
  }

  deactivateHiddenAbility() {
    this.hiddenAbilityActive = false;
    this.hiddenAbilityTimer = 0;
  }

  hiddenAbilityBlocksAttacks = false;
  hiddenAbilityDR = 1.0;

  // ============================================================
  // RENDERING
  // ============================================================

  render(ctx) {
    if (this.state === 'dead' && this.deathAnimComplete) return;

    ctx.save();

    const fx = Math.round(this.x);
    const fy = Math.round(this.y);

    // White flash on damage
    if (this.flashWhite > 0 && this.flashWhite % 2 === 0) {
      ctx.globalAlpha = 0.7;
    }

    // Invincibility blink
    if (this.invincible && Math.floor(this.stateTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }

    this.renderCharacter(ctx, fx, fy);
    ctx.restore();
  }

  // Override per character
  renderCharacter(ctx, x, y) {
    AN.drawBlockCharacter(ctx, x, y, this.width, this.height, '#888888', '#666666', this.facingRight);
  }

  // ============================================================
  // VICTORY / DEFEAT ANIMATIONS
  // ============================================================

  renderVictoryPose(ctx, x, y, timer) {
    // Override per character
  }

  renderDefeatPose(ctx, x, y, timer) {
    // Fall down animation
    if (timer < 20) {
      this.y = this.groundY;
      AN.drawBlockCharacter(ctx, x, y, this.width, this.height, '#666666', '#444444', true);
      // Falling over
      const progress = timer / 20;
      ctx.save();
      ctx.translate(x + this.width / 2, y + this.height);
      ctx.rotate(progress * Math.PI / 2);
      AN.drawBlockCharacter(ctx, -this.width / 2, -this.height, this.width, this.height, '#666666', '#444444', true);
      ctx.restore();
    }
  }
};

// ============================================================
// Character Factory
// ============================================================
const CharacterFactory = {
  create(type, config = {}) {
    switch (type) {
      case 'knight': return new Knight(config);
      case 'assassin': return new Assassin(config);
      case 'mage': return new Mage(config);
      case 'necromancer': return new Necromancer(config);
      case 'paladin': return new Paladin(config);
      case 'warrior': return new Warrior(config);
      default: return new Knight(config);
    }
  }
};
