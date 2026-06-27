// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — THE MAGE (Codename: Conductor)
// The Weaver of Reality — frost nova, arcane orb, spell weave
// ============================================================

class Mage extends Character {
  constructor(config = {}) {
    super({
      id: 'mage',
      name: 'The Mage',
      type: 'mage',
      width: 28,
      height: 48,
      walkSpeed: 2.8,
      accelFrames: 8,
      decelFrames: 6,
      airControl: 0.8, // Design doc: 80% air control, she floats
      jumpVelocity: -10,
      maxHP: 75,
      baseDamage: 8,
      hurtbox: { x: 2, y: 0, w: 24, h: 48 },
      hiddenAbilityHP: 0.35,
      ...config,
    });

    this.floatOffset = 2;       // Hovers 2px above floor
    this.spellCounter = 0;      // For Spell Weave (10th cast)
    this.arcaneOrb = null;      // Active orb projectile reference
    this.groundY = GAME.height - 140;
    this._floating = true;
  }

  getLightAttackConfig() {
    return {
      startup: 6, active: 3, recovery: 8, damage: 6,
      hitbox: { x: 22, y: 8, w: 24, h: 16 },
      knockback: 2, hitstun: 10,
      whooshFrame: 4,
    };
  }

  getHeavyAttackConfig() {
    return {
      startup: 14, active: 6, recovery: 18, damage: 14,
      hitbox: { x: 24, y: 6, w: 30, h: 22 },
      knockback: 5, hitstun: 16,
      whooshFrame: 10,
    };
  }

  // Frost Nova (Special - Close) or Arcane Orb (Special - Ranged)
  getSpecialAttackConfig() {
    // Check direction: if holding back, cast frost nova; if forward/neutral, arcane orb
    if (IN.isBuffered('BACK', 8)) {
      return this.getFrostNovaConfig();
    } else {
      return this.getArcaneOrbConfig();
    }
  }

  // Frost Nova: 360° ice ring, freezes for 20f, 0 damage
  getFrostNovaConfig() {
    return {
      startup: 10, active: 4, recovery: 20, damage: 0,
      hitbox: { x: -30, y: -20, w: 88, h: 68 }, // Full 360° around mage
      knockback: 0, hitstun: 0,
      freezes: true, freezeDuration: 20,
      whooshFrame: 6,
      animData: 'frostNova',
    };
  }

  // Arcane Orb: slow traveling projectile (6px/f), detonate on second press
  getArcaneOrbConfig() {
    return {
      startup: 15, active: 1, recovery: 10, damage: 15,
      hitbox: { x: 24, y: 6, w: 12, h: 12 },
      knockback: 4, hitstun: 14,
      isProjectile: true,
      whooshFrame: 12,
      animData: 'arcaneOrb',
    };
  }

  getGrabConfig() {
    return {
      startup: 8, active: 3, recovery: 16, damage: 8,
      hitbox: { x: 12, y: 5, w: 18, h: 26 },
      knockback: 3, hitstun: 14,
      isGrab: true,
    };
  }

  // --- MOVEMENT (Floating) ---

  updateMovement() {
    super.updateMovement();
    // Hover 2px above floor - override groundY
    this.groundY = GAME.height - 140 - this.floatOffset;
  }

  // --- SPECIAL ATTACK OVERRIDE ---

  specialAttack() {
    if (this.specialCooldown > 0) return;

    // If arcane orb is already out, detonate it
    if (this.arcaneOrb) {
      this.detonateOrb();
      return;
    }

    const config = this.getSpecialAttackConfig();
    const attack = this.startAttack(config);

    if (attack && config.animData === 'arcaneOrb') {
      this.specialCooldown = 40;
      this.spellCounter++;
      this.checkSpellWeave();

      // Spawn the orb projectile
      CMB.spawnProjectile({
        x: this.x + (this.facingRight ? this.width : -12),
        y: this.y + this.height * 0.3,
        vx: this.facingRight ? 6 : -6, // 6px/f as per design doc
        vy: 0,
        w: 10, h: 10,
        damage: 15,
        owner: this,
        ownerIsPlayer: true,
        life: 180,
        color: '#00ccff',
        glow: 'rgba(0, 200, 255, 0.4)',
        phaseThrough: false,
        onExpire: (target, proj) => {
          this.arcaneOrb = null;
        },
      });

      // Store reference to last spawned orb
      this.arcaneOrb = CMB.projectiles[CMB.projectiles.length - 1];
    } else if (attack) {
      this.specialCooldown = 35;
      this.spellCounter++;
      this.checkSpellWeave();
    }

    return attack;
  }

  detonateOrb() {
    if (!this.arcaneOrb) return;

    // Remove the orb projectile
    const idx = CMB.projectiles.indexOf(this.arcaneOrb);
    if (idx >= 0) {
      const orb = this.arcaneOrb;
      CMB.projectiles.splice(idx, 1);

      // 120px explosion, 25 damage
      CMB.addExplosion(orb.x, orb.y, 120, 25, this, true);
      ParticleSystem.addExplosion(orb.x, orb.y, 60, '#00ccff');
      GAME.triggerShake(2, 6);
      SFX.playImpact('heavy');

      this.arcaneOrb = null;
    }
  }

  // --- HIDDEN ABILITY: Spell Weave ---
  // On 10th spell: next cast fires twice for free
  // Screen splits in half momentarily

  checkSpellWeave() {
    if (this.spellCounter >= 10 && !this.hiddenAbilityActive) {
      this.spellCounter = 0;
      this.activateHiddenAbility();
    }
  }

  activateHiddenAbility() {
    super.activateHiddenAbility();
    this.hiddenAbilityTimer = 1; // One-use: fires on next cast
    GAME.triggerFlash('rgba(100, 0, 255, 0.15)', 15);
  }

  specialAttack() {
    if (this.specialCooldown > 0) return;

    // If arcane orb is already out, detonate it
    if (this.arcaneOrb) {
      this.detonateOrb();
      if (this.hiddenAbilityActive) {
        // Double detonate!
        this.deactivateHiddenAbility();
      }
      return;
    }

    const config = this.getSpecialAttackConfig();
    const attack = this.startAttack(config);

    if (attack && config.animData === 'arcaneOrb') {
      this.specialCooldown = 40;
      this.spellCounter++;
      this.checkSpellWeave();

      // Spawn orb
      this.spawnArcaneOrb();

      // Spell Weave: spawn second orb for free
      if (this.hiddenAbilityActive) {
        setTimeout(() => this.spawnArcaneOrb(), 100);
        this.deactivateHiddenAbility();
      }
    } else if (attack && config.animData === 'frostNova') {
      this.specialCooldown = 35;
      this.spellCounter++;
      this.checkSpellWeave();

      // Frost nova effect
      ParticleSystem.addFreezeEffect(this.x + this.width / 2, this.y + this.height / 2);

      // Spell Weave: double nova
      if (this.hiddenAbilityActive) {
        setTimeout(() => {
          ParticleSystem.addFreezeEffect(this.x + this.width / 2, this.y + this.height / 2);
        }, 150);
        this.deactivateHiddenAbility();
      }
    }

    return attack;
  }

  spawnArcaneOrb() {
    CMB.spawnProjectile({
      x: this.x + (this.facingRight ? this.width : -12),
      y: this.y + this.height * 0.3,
      vx: this.facingRight ? 6 : -6,
      vy: 0,
      w: 10, h: 10,
      damage: 15,
      owner: this,
      ownerIsPlayer: true,
      life: 180,
      color: '#00ccff',
      glow: 'rgba(0, 200, 255, 0.4)',
      onExpire: () => { this.arcaneOrb = null; },
    });
    this.arcaneOrb = CMB.projectiles[CMB.projectiles.length - 1];
  }

  // --- RENDERING ---

  renderCharacter(ctx, x, y, alpha = 0) {
    // Float 2px above ground with sine wave
    const floatY = y + Math.sin(this.animFrame * 0.08) * 2;

    // Blue afterglow particles beneath (rendered BEFORE sprite)
    const glowAlpha = 0.08 + Math.sin(this.animFrame * 0.05) * 0.04;
    ctx.fillStyle = `rgba(0, 200, 255, ${glowAlpha})`;
    ctx.fillRect(x - 6, floatY + this.height - 2, this.width + 12, 4);
    ctx.fillStyle = `rgba(0, 100, 255, ${glowAlpha * 0.5})`;
    ctx.fillRect(x - 8, floatY + this.height, this.width + 16, 3);

    // Base sprite from animation system
    const frameIdx = AN.getAnimFrame(AN.SPRITES.mage, this.animFrame, 1);
    AN.drawSprite(ctx, AN.SPRITES.mage, x, floatY, 1, frameIdx, !this.facingRight);

    // Staff orb pulse (rendered on top of sprite at staff position)
    const pulse = Math.sin(this.animFrame * 0.1) * 0.3 + 0.7;
    const staffX = x + (this.facingRight ? -6 : this.width);
    ctx.fillStyle = `rgba(0, 255, 255, ${pulse})`;
    ctx.fillRect(staffX - 2, floatY - 16, 7, 7);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(staffX, floatY - 14, 3, 3);

    // Sparkle particles from hair
    if (this.state === 'idle' && GAME.frameCount % 20 === 0) {
      ParticleSystem.addSparks(x + this.width / 2 + (Math.random() - 0.5) * 4,
                               floatY - 6, 1);
    }
  }

  // Victory: twirls staff, floats upward and vanishes off screen
  renderVictoryPose(ctx, x, y, timer) {
    const ascendY = Math.max(-100, y - timer * 2);
    this.renderCharacter(ctx, x, ascendY);
    if (timer > 60) {
      ctx.globalAlpha = Math.max(0, 1 - (timer - 60) / 20);
    }
  }
};
