// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Wyvern Hatchling (Tier 4: The Feral)
// Flies off-screen, dives. 3s hover, then dive. Block/dodge before impact.
// ============================================================

class Wyvern extends Enemy {
  constructor(config = {}) {
    super({
      id: 'wyvern',
      name: 'Wyvern Hatchling',
      type: 'wyvern',
      tier: 4,
      width: 36,
      height: 24,
      maxHP: 35,
      damage: 10,
      walkSpeed: 0,
      aggression: 70,
      fear: 15,
      greed: 20,
      patience: 30,
      hurtbox: { x: 0, y: 0, w: 36, h: 24 },
      ...config,
    });

    this.flying = true;
    this.hoverTimer = 0;
    this.hoverDuration = 180; // 3 seconds at 60fps
    this.divePhase = 'hover'; // hover | diving | recovering
    this.diveTarget = null;
    this.diveSpeed = 8;
    this.grounded = false;
  }

  update() {
    if (this.dead) {
      // Fall out of sky
      this.y += 4;
      this.deathTimer++;
      if (this.y > GAME.height) {
        this.deathTimer = 999;
      }
      return;
    }

    this.stateTimer++;
    this.animFrame++;

    if (this.flashWhite > 0) this.flashWhite--;

    switch (this.divePhase) {
      case 'hover':
        this.hoverTimer++;
        // Float at top of screen
        this.y = 60 + Math.sin(this.hoverTimer * 0.05) * 20;
        this.x += Math.sin(this.hoverTimer * 0.03) * 1.5;

        // After hover duration, start diving
        if (this.hoverTimer >= this.hoverDuration) {
          this.divePhase = 'diving';
          this.diveTarget = {
            x: GAME.player ? GAME.player.x + GAME.player.width / 2 : GAME.width / 2,
            y: GAME.player ? GAME.player.y : GAME.height - 80,
          };

          // Shadow warning on ground
          this._diveShadow = { x: this.x, life: 30 };
        }
        break;

      case 'diving':
        // Dive toward target
        const dx = this.diveTarget.x - this.x;
        const dy = this.diveTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 2) {
          this.x += (dx / dist) * this.diveSpeed;
          this.y += (dy / dist) * this.diveSpeed;
        } else {
          // Impact
          this.divePhase = 'recovering';
          this.hoverTimer = 0;
          GAME.triggerShake(2, 6);
          SFX.playImpact('heavy');
          ParticleSystem.addDustPuff(this.x + this.width / 2, GAME.height - 80, 10);

          // Hit player if close
          if (GAME.player && !GAME.player.dead) {
            const pdx = GAME.player.x + GAME.player.width / 2 - this.x;
            const pdy = GAME.player.y + GAME.player.height / 2 - this.y;
            if (Math.sqrt(pdx * pdx + pdy * pdy) < 50) {
              GAME.player.takeDamage(this.damage, this, null);
            }
          }
        }
        break;

      case 'recovering':
        this.hoverTimer++;
        this.y -= 2;
        if (this.hoverTimer > 30) {
          this.divePhase = 'hover';
          this.hoverTimer = 0;
        }
        break;
    }

    // Death from falling damage when flying
    if (this.y > GAME.height + 50) {
      this.dead = true;
      this.deathTimer = 999;
    }
  }

  die() {
    this.dead = true;
    this.deathTimer = 0;
    ParticleSystem.addBloodSplatter(this.x + this.width / 2, this.y + this.height / 2, 8);
  }

  render(ctx) {
    if (this.dead) {
      if (this.deathTimer > 40) return;
      const alpha = 1 - this.deathTimer / 40;
      ctx.globalAlpha = alpha;
      this.renderWyvern(ctx);
      ctx.globalAlpha = 1;
      return;
    }

    // Dive shadow on ground
    if (this.divePhase === 'hover' && this._diveShadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(this._diveShadow.x - 15, GAME.height - 82, 30, 6);
    } else if (this.divePhase === 'diving' && this.diveTarget) {
      const shadowY = GAME.height - 80;
      const altitudeRatio = (this.y - shadowY) / (60 - shadowY);
      ctx.fillStyle = `rgba(0,0,0,${0.3 * altitudeRatio})`;
      ctx.fillRect(this.x - 15 * altitudeRatio, shadowY, 30 * altitudeRatio, 4);
    }

    if (this.flashWhite > 0 && this.flashWhite % 2 === 0) {
      ctx.globalAlpha = 0.7;
    }

    this.renderWyvern(ctx);
    ctx.globalAlpha = 1;
  }

  renderWyvern(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    // Wings
    const wingFlap = Math.sin(this.hoverTimer * 0.2) * 8;
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(x - 8, y - 6 + wingFlap, 8, 16);
    ctx.fillRect(x + this.width, y - 6 - wingFlap, 8, 16);
    // Wing membrane
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(x - 10, y, 10, 10);
    ctx.fillRect(x + this.width, y, 10, 10);

    // Body
    ctx.fillStyle = '#3a5a3a';
    ctx.fillRect(x + 4, y + 2, this.width - 8, this.height - 6);

    // Head
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(x + (this.facingRight ? this.width - 8 : 0), y - 2, 10, 8);

    // Beak
    ctx.fillStyle = '#cccc44';
    ctx.fillRect(x + (this.facingRight ? this.width : -6), y + 2, 6, 3);

    // Eyes
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(x + (this.facingRight ? this.width - 4 : 4), y, 3, 2);

    // Tail
    ctx.fillStyle = '#3a5a3a';
    ctx.fillRect(x + (this.facingRight ? 0 : this.width - 8), y + this.height - 4, 10, 4);

    // Fire breath hint
    if (this.divePhase === 'diving') {
      ctx.fillStyle = 'rgba(255, 100, 0, 0.4)';
      ctx.fillRect(x + (this.facingRight ? this.width : -10), y + 6, 10, 3);
    }
  }
};
