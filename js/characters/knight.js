// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — THE KNIGHT (Codename: Anvil)
// The Weight of Oaths — shield, guard crush, indomitable
// ============================================================

class Knight extends Character {
  constructor(config = {}) {
    super({
      id: 'knight',
      name: 'The Knight',
      type: 'knight',
      width: 36,
      height: 52,
      walkSpeed: 2.5,
      accelFrames: 12,
      decelFrames: 15,
      airControl: 0.6,
      jumpVelocity: -11,
      maxHP: 120,
      baseDamage: 12,
      hurtbox: { x: 0, y: 0, w: 36, h: 52 },
      hiddenAbilityHP: 0.4,
      ...config,
    });

    this.shieldUp = false;
    this.guardStepActive = false;
    this.guardStepCooldown = 0;
  }

  // --- ATTACK CONFIGS (Fibonacci: 5/3/8 light, 13/8/21 heavy) ---

  getLightAttackConfig() {
    return {
      startup: 5, active: 3, recovery: 8, damage: 8,
      hitbox: { x: 28, y: 8, w: 28, h: 20 },
      knockback: 3, hitstun: 12,
      whooshFrame: 3,
    };
  }

  getHeavyAttackConfig() {
    return {
      startup: 13, active: 8, recovery: 21, damage: 20,
      hitbox: { x: 30, y: 5, w: 36, h: 30 },
      knockback: 8, hitstun: 22,
      whooshFrame: 10,
    };
  }

  // Shield Bash (Special) — design doc: 12f startup, 4f active, 20f recovery
  getSpecialAttackConfig() {
    return {
      startup: 12, active: 4, recovery: 20, damage: 14,
      hitbox: { x: 24, y: 8, w: 40, h: 24 },
      knockback: 6, hitstun: 16,
      guardCrush: true,  // Breaks blocks
      whooshFrame: 10,
      animData: 'shieldBash',
    };
  }

  getGrabConfig() {
    return {
      startup: 8, active: 3, recovery: 16, damage: 12,
      hitbox: { x: 15, y: 5, w: 22, h: 30 },
      knockback: 4, hitstun: 18,
      isGrab: true,
    };
  }

  // --- MOVEMENT ---

  updateMovement() {
    super.updateMovement();

    // Guard Step Dash (special forward dash with shield)
    if (this.guardStepCooldown > 0) this.guardStepCooldown--;

    if (this.grounded && this.state !== 'attack' && this.guardStepCooldown <= 0 &&
        IN.isBuffered('FORWARD', 4) && IN.isBuffered('FORWARD', 2)) {
      // Double-tap forward triggers guard step
      if (this._lastForwardFrame && GAME.frameCount - this._lastForwardFrame < 15) {
        this.startGuardStep();
      }
      this._lastForwardFrame = GAME.frameCount;
    }
  }

  startGuardStep() {
    this.guardStepActive = true;
    this.guardStepCooldown = 40;
    this.invincible = true;
    this.invincibleTimer = 14; // 6f startup + 8f active

    // Dash forward
    this.x += this.facingRight ? 60 : -60;
    ParticleSystem.addDustPuff(this.x + this.width / 2, this.y + this.height);

    // Guard Crush: if attacking during last 4 frames
    setTimeout(() => {
      this.guardStepActive = false;
    }, 233); // 14 frames at ~16.67ms
  }

  updateAttacking() {
    if (this.currentAttacks.length > 0) {
      const atk = this.currentAttacks[0];
      if (atk.animData === 'shieldBash' && atk.phase === 'startup') {
        // Shoulder tuck, shield glows
        this.shieldUp = true;
      }
      if (atk.phase === 'recovery') {
        this.shieldUp = false;
      }
    }
  }

  // --- HIDDEN ABILITY: Indomitable ---
  // At 40% HP: cannot be knocked down for 5s, attacks push back 10px, walk drops to 0.8px/f

  activateHiddenAbility() {
    super.activateHiddenAbility();
    this.invincible = true;
    this.invincibleTimer = this.hiddenAbilityTimer;
    this.hiddenAbilityDR = 0.5;
    this._originalWalkSpeed = this.walkSpeed;
    this.walkSpeed = 0.8;
    SFX.playSpecial('knight');
  }

  deactivateHiddenAbility() {
    super.deactivateHiddenAbility();
    this.walkSpeed = this._originalWalkSpeed || 2.5;
    this.invincible = false;
  }

  takeDamage(amount, attacker, attack) {
    if (this.hiddenAbilityActive) {
      // Indomitable: push back instead of knockdown
      const dir = attacker.x < this.x ? 1 : -1;
      this.x += dir * 10;
      super.takeDamage(amount * 0.5, attacker, attack);
      this.hitstunRemaining = 0;
      this.state = 'idle';
      return;
    }
    super.takeDamage(amount, attacker, attack);
  }

  getFootstepWeight() { return 'heavy'; }

  isBlockingAttack(attacker) {
    // Knight recovers 5f faster from blocked shield bash
    return super.isBlockingAttack(attacker);
  }

  // --- RENDERING ---

  renderCharacter(ctx, x, y, alpha = 0) {
    // Base sprite from animation system — uses pixel-art sprite grid
    const spriteKey = this.state === 'walk' ? AN.SPRITES.knight_walk :
                      this.state === 'attack' ? AN.SPRITES.knight_attack : AN.SPRITES.knight;
    const frameIdx = this.state === 'walk'
      ? AN.getAnimFrame(spriteKey, this.animFrame, 1)
      : 0;

    AN.drawSprite(ctx, spriteKey, x, y, 1, frameIdx, !this.facingRight);

    // Shield (left side) — rendered on top of sprite
    if (this.isBlocking || this.shieldUp) {
      const shieldX = this.facingRight ? x - 10 : x + this.width + 2;
      ctx.fillStyle = '#8a8a8a';
      ctx.fillRect(shieldX, y + 10, 10, 28);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(shieldX + 2, y + 14, 6, 4);
      if (this.hiddenAbilityActive) {
        // Golden shimmer
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fillRect(shieldX - 1, y + 9, 12, 30);
      }
    }

    // Breathing idle: chest plate expands 1px
    if (this.state === 'idle') {
      const breath = AN.breathingPhase(this.animFrame, 45);
      if (breath) {
        ctx.fillStyle = 'rgba(122, 122, 138, 0.3)';
        ctx.fillRect(x + 6, y + 13, this.width - 12, 1);
      }
    }
  }

  // Victory: kneels, plants sword, bows head, prays
  renderVictoryPose(ctx, x, y, timer) {
    if (timer > 40) {
      // Praying position
      this.renderCharacter(ctx, x, y);
      // Head bowed
      const headX = x + this.width / 2;
      ctx.fillStyle = '#5a5a6a';
      ctx.fillRect(headX - 7, y - 2, 14, 6);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(headX - 2, y, 2, 1);
    } else {
      // Kneeling down
      const progress = timer / 40;
      this.renderCharacter(ctx, x, y - progress * 10);
    }
  }
};
