// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Skeleton (Tier 3: The Plague)
// Fragile, resurrect once unless finished with heavy attack.
// ============================================================

class Skeleton extends Enemy {
  constructor(config = {}) {
    super({
      id: 'skeleton',
      name: 'Skeleton',
      type: 'skeleton',
      tier: 3,
      width: 24,
      height: 38,
      maxHP: 20,
      damage: 7,
      walkSpeed: 1.8,
      aggression: 50,
      fear: 20,
      greed: 10,
      patience: 40,
      hurtbox: { x: 0, y: 0, w: 24, h: 38 },
      ...config,
    });

    this.canResurrect = true;
    this.resurrecting = false;
    this.finishedByHeavy = false;
  }

  die() {
    if (this.canResurrect && !this.finishedByHeavy) {
      // Don't truly die — resurrect
      this.resurrecting = true;
      this.canResurrect = false;
      this.dead = false; // Keep alive for resurrection

      // Resurrect after 60 frames
      setTimeout(() => {
        if (this.dead || this.resurrecting === false) return;
        this.hp = this.maxHP * 0.5;
        this.state = 'idle';
        this.resurrecting = false;
        ParticleSystem.addDustPuff(this.x + this.width / 2, this.y + this.height);
        SFX.playSpecial('skeleton');
      }, 1000);
    } else {
      // True death
      super.die();
      this.canResurrect = false;
    }
  }

  takeDamage(amount, attacker, attack) {
    // Heavy attack finishes permanently
    if (attack && attack.damage >= 14) {
      this.finishedByHeavy = true;
    }
    super.takeDamage(amount, attacker, attack);
  }

  updateAI() {
    const player = GAME.player;
    if (!player || player.dead) return;

    if (this.resurrecting) return;

    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    this.facingRight = dx > 0;

    // Shamble straight forward
    if (dist > 40) {
      this.x += this.facingRight ? this.walkSpeed : -this.walkSpeed;
      this.state = 'walk';
    } else if (this.attackCooldown <= 0) {
      this.attackCooldown = 45 + Math.random() * 20;
      this.state = 'attack';
      this.currentAttacks.push(CMB.createAttack(this, {
        startup: 8, active: 4, recovery: 10,
        damage: this.damage,
        hitbox: { x: 18, y: 5, w: 20, h: 20 },
        knockback: 3, hitstun: 12,
        whooshFrame: 6,
      }));
    } else {
      this.state = 'idle';
    }

    // Dash sideways if projectile approaches
    for (const proj of CMB.projectiles) {
      if (proj.ownerIsPlayer) {
        const pdx = proj.x - this.x;
        if (Math.abs(pdx) < 60 && Math.abs(proj.y - this.y) < 30) {
          this.x += pdx > 0 ? -3 : 3;
        }
      }
    }
  }

  renderEnemy(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const shamble = this.state === 'walk' ? Math.sin(this.animFrame * 0.15) * 2 : 0;

    AN.drawSkeletalCharacter(ctx, x, y + shamble, this.width, this.height, '#c8b898', '#4a4a4a');

    // Resurrection glow
    if (this.resurrecting) {
      ctx.fillStyle = 'rgba(0, 255, 50, 0.2)';
      ctx.fillRect(x - 4, y - 4, this.width + 8, this.height + 8);
    }

    if (this.canResurrect) {
      // Faint green glow = can resurrect
      ctx.fillStyle = 'rgba(0, 255, 50, 0.08)';
      ctx.fillRect(x - 2, y - 2, this.width + 4, this.height + 4);
    }
  }
};
