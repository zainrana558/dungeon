// ============================================================
// BOSS 4: THE ELDER DRAGON (Ignis the Ashen) — Floor 20
// 3-phase: Grounded → Flying → Enraged. Massive. Predictive pathing.
// ============================================================

class ElderDragon extends Enemy {
  constructor(config = {}) {
    super({
      id: 'dragon',
      name: 'Elder Dragon Ignis',
      type: 'dragon',
      tier: 'boss',
      width: 96,
      height: 64,
      maxHP: 400,
      damage: 20,
      walkSpeed: 1.5,
      aggression: 95,
      fear: 0,
      greed: 40,
      patience: 60,
      hurtbox: { x: 0, y: 0, w: 96, h: 64 },
      ...config,
    });

    // Phase tracking
    this.phase = 1; // 1=grounded, 2=flying, 3=enraged
    this.phaseTransitioning = false;

    // Attack patterns
    this.biteTimer = 0;
    this.tailSweepTimer = 0;
    this.fireballTimer = 0;
    this.flameBreathTimer = 0;
    this.flameSweeping = false;
    this.flameSweepDir = 1;

    // Lava visuals
    this.lavaGlow = 0;
    this.steamVents = [];
    for (let i = 0; i < 5; i++) {
      this.steamVents.push({ x: 80 + i * 160, timer: 60 + i * 30 });
    }
  }

  updateAI() {
    const player = GAME.player;
    if (!player || player.dead) return;

    this.facingRight = player.x > this.x;

    // Phase transitions
    const hpPercent = this.hp / this.maxHP;

    if (hpPercent <= 0.3 && this.phase !== 3) {
      this.transitionToPhase(3);
    } else if (hpPercent <= 0.7 && this.phase === 1) {
      this.transitionToPhase(2);
    }

    // Steam vents
    for (const vent of this.steamVents) {
      vent.timer--;
      if (vent.timer <= 0) {
        vent.timer = 180 + Math.random() * 120;
      }
    }

    // Execute phase-specific behavior
    switch (this.phase) {
      case 1: this.updatePhase1(); break;
      case 2: this.updatePhase2(); break;
      case 3: this.updatePhase3(); break;
    }
  }

  transitionToPhase(newPhase) {
    if (this.phaseTransitioning) return;
    this.phaseTransitioning = true;
    this.phase = newPhase;
    GAME.triggerShake(5, 20);
    SFX.playSpecial('dragon');

    if (newPhase === 2) {
      this.y -= 40; // Fly up
      this.grounded = false;
    } else if (newPhase === 3) {
      this.y = this.groundY; // Land enraged
      this.grounded = true;
      this.walkSpeed *= 1.3;
      this.damage *= 1.3;
    }

    setTimeout(() => { this.phaseTransitioning = false; }, 1000);
  }

  // Phase 1: Grounded — bites and tail sweeps
  updatePhase1() {
    const player = GAME.player;
    const dx = player.x - this.x;
    const dist = Math.abs(dx);

    this.biteTimer--;
    this.tailSweepTimer--;

    // Bite: lower half
    if (this.biteTimer <= 0 && dist < 80 && player.y > this.y + this.height * 0.5) {
      this.biteTimer = 80 + Math.random() * 40;
      this.biteAttack();
    }

    // Tail sweep: behind
    if (this.tailSweepTimer <= 0 && player.x < this.x !== this.facingRight) {
      this.tailSweepTimer = 100 + Math.random() * 60;
      this.tailSweepAttack();
    }
  }

  // Phase 2: Flying — shadows, predictive fireballs
  updatePhase2() {
    this.fireballTimer--;

    if (this.fireballTimer <= 0) {
      this.fireballTimer = 60;
      this.dropFireball();
    }

    // Drift overhead
    this.x += (GAME.player.x - this.x) * 0.01;
    this.y = 60 + Math.sin(GAME.frameCount * 0.03) * 15;
  }

  // Phase 3: Enraged — horizontal flame breath
  updatePhase3() {
    this.flameBreathTimer--;

    if (this.flameBreathTimer <= 0) {
      this.flameBreathTimer = 120;
      this.startFlameBreath();
    }

    if (this.flameSweeping) {
      this.flameSweepDir *= -1; // Sweep left-to-right then right-to-left
      this.x += this.flameSweepDir * 2;

      // Flame covers bottom 2/3 of screen
      if (GAME.player && GAME.player.y > this.y + this.height * 0.3) {
        if (GAME.frameCount % 10 === 0) {
          GAME.player.takeDamage(3, this, null);
        }
      }
    }

    // Stop sweeping after duration
    if (this.flameBreathTimer < 90) {
      this.flameSweeping = false;
    }
  }

  biteAttack() {
    this.currentAttacks.push(CMB.createAttack(this, {
      startup: 15, active: 6, recovery: 20,
      damage: 22,
      hitbox: { x: 10, y: 30, w: 70, h: 30 },
      knockback: 8, hitstun: 22,
      whooshFrame: 12,
    }));
  }

  tailSweepAttack() {
    this.currentAttacks.push(CMB.createAttack(this, {
      startup: 12, active: 8, recovery: 18,
      damage: 16,
      hitbox: { x: -40, y: 10, w: 50, h: 30 },
      knockback: 10, hitstun: 20,
      whooshFrame: 8,
    }));
  }

  dropFireball() {
    const player = GAME.player;
    // Predictive: aims 50px ahead of player
    const targetX = player.x + (player.currentSpeed || 0) * 15 + 50 * (player.facingRight ? 1 : -1);

    // Shadow
    CMB.spawnProjectile({
      x: targetX, y: -10,
      vx: 0, vy: 4,
      w: 16, h: 16,
      damage: 18,
      owner: this,
      ownerIsPlayer: false,
      life: 120,
      color: '#ff4400',
      glow: 'rgba(255, 100, 0, 0.6)',
    });
  }

  startFlameBreath() {
    this.flameSweeping = true;
    this.flameSweepDir = 1;
  }

  render(ctx) {
    if (this.dead) return;

    const x = Math.round(this.x);
    const y = Math.round(this.y);

    // Volcano background
    ctx.fillStyle = 'rgba(255, 40, 0, 0.03)';
    ctx.fillRect(0, 0, GAME.width, GAME.height);

    // Steam vents
    for (const vent of this.steamVents) {
      if (vent.timer < 30) {
        ctx.fillStyle = `rgba(200, 200, 200, ${vent.timer / 30 * 0.2})`;
        ctx.fillRect(vent.x, this.groundY - 30, 15, 30);
      }
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 5, y + this.height - 2, this.width + 10, 5);

    // Body (massive, dark grey with glowing orange cracks)
    ctx.fillStyle = '#3a3838';
    ctx.fillRect(x + 4, y + 10, this.width - 8, this.height - 20);

    // Lava cracks
    const lavaPulse = Math.sin(GAME.frameCount * 0.08) * 0.3 + 0.5;
    ctx.fillStyle = `rgba(255, 100, 0, ${lavaPulse})`;
    ctx.fillRect(x + 10, y + 20, this.width - 20, 3);
    ctx.fillRect(x + 20, y + 30, this.width - 40, 2);
    ctx.fillRect(x + 15, y + 40, this.width - 30, 3);

    // Wings
    ctx.fillStyle = '#2a2a2a';
    const wingFlap = this.phase === 2 ? Math.sin(GAME.frameCount * 0.1) * 15 : 5;
    ctx.fillRect(x - 20, y - 10 + wingFlap, 30, 40);
    ctx.fillRect(x + this.width - 10, y - 10 - wingFlap, 30, 40);

    // Legs
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x + 10, y + this.height - 16, 14, 16);
    ctx.fillRect(x + this.width - 24, y + this.height - 16, 14, 16);

    // Tail
    ctx.fillStyle = '#3a3838';
    ctx.fillRect(x - 30, y + 20, 40, 12);
    // Tail tip
    ctx.fillStyle = '#4a4038';
    ctx.fillRect(x - 34, y + 16, 8, 20);

    // Neck and head
    ctx.fillStyle = '#3a3838';
    ctx.fillRect(x + (this.facingRight ? this.width - 20 : -20), y + 4, 28, 16);

    // Head
    ctx.fillStyle = '#3a3838';
    ctx.fillRect(x + (this.facingRight ? this.width - 10 : -30), y - 4, 24, 20);

    // Molten gold eyes
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + (this.facingRight ? this.width + 4 : -24), y + 2, 4, 3);
    // Eye glow
    ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.fillRect(x + (this.facingRight ? this.width + 2 : -26), y, 8, 7);

    // Nostril smoke
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x + (this.facingRight ? this.width + 4 : -28), y + 8, 4, 3);
    ctx.fillRect(x + (this.facingRight ? this.width + 6 : -30), y + 7, 3, 2);

    // Phase 3 enrage visual
    if (this.phase === 3) {
      ctx.fillStyle = 'rgba(255, 50, 0, 0.1)';
      ctx.fillRect(x - 10, y - 10, this.width + 20, this.height + 20);
    }

    // Flame breath visual
    if (this.flameSweeping) {
      const flameAlpha = 0.3 + Math.sin(GAME.frameCount * 0.3) * 0.1;
      ctx.fillStyle = `rgba(255, 100, 0, ${flameAlpha})`;
      ctx.fillRect(0, y + this.height * 0.3, GAME.width, GAME.height * 0.7);
      ctx.fillStyle = `rgba(255, 200, 50, ${flameAlpha * 0.5})`;
      ctx.fillRect(0, y + this.height * 0.5, GAME.width, GAME.height * 0.5);
    }
  }

  die() {
    this.dead = true;
    this.deathTimer = 0;
    // Volcano erupts
    GAME.triggerShake(8, 40);
    GAME.triggerFlash('rgba(255, 100, 0, 0.3)', 30);
    ParticleSystem.addExplosion(this.x + this.width / 2, this.y + this.height / 2, 100, '#ff4400');
    SFX.playImpact('ko');
  }
};
