// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Orc Grunt (Tier 2: The Brute)
// Slow, armored, telegraphed overhead chops. Guards rhythmically.
// ============================================================

class Orc extends Enemy {
  constructor(config = {}) {
    super({
      id: 'orc',
      name: 'Orc Grunt',
      type: 'orc',
      tier: 2,
      width: 34,
      height: 44,
      maxHP: 50,
      damage: 12,
      walkSpeed: 1.2,
      aggression: 60,
      fear: 10,
      greed: 30,
      patience: 80,
      hurtbox: { x: 0, y: 0, w: 34, h: 44 },
      ...config,
    });

    // Block cycle: guard 2s, drop 0.5s, repeat
    this.blockTimer = 120;
    this.blockDuration = 120;
    this.blockGap = 30;
    this.isBlocking = true;
  }

  updateAI() {
    const player = GAME.player;
    if (!player || player.dead) return;

    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    this.facingRight = dx > 0;

    // Slow advance
    if (dist > 70) {
      this.x += this.facingRight ? this.walkSpeed : -this.walkSpeed;
      this.state = 'walk';
    } else if (dist < 40 && this.attackCooldown <= 0) {
      // Overhead chop — telegraphed
      this.attackCooldown = 80;
      this.state = 'attack';
      this.currentAttacks.push(CMB.createAttack(this, {
        startup: 18, active: 6, recovery: 22,
        damage: this.damage,
        hitbox: { x: 22, y: -5, w: 32, h: 35 },
        knockback: 7, hitstun: 20,
        whooshFrame: 14,
      }));
    } else {
      this.state = 'idle';
    }
  }

  renderEnemy(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 2, y + this.height - 2, this.width - 4, 4);

    // Legs (thick)
    ctx.fillStyle = '#5a6a4a';
    ctx.fillRect(x + 6, y + this.height - 18, 8, 18);
    ctx.fillRect(x + this.width - 14, y + this.height - 18, 8, 18);

    // Body (muscular, grey-green)
    ctx.fillStyle = '#6a8a5a';
    ctx.fillRect(x + 4, y + 8, this.width - 8, this.height - 28);

    // Armor
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(x + 3, y + 10, this.width - 6, 4);
    ctx.fillRect(x + 8, y + 16, this.width - 16, 8);

    // Spiked pauldron
    ctx.fillStyle = '#6a6a6a';
    ctx.fillRect(x + this.width - 12, y + 6, 12, 8);
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + this.width - 12 + i * 4, y + 4, 2, 4);
    }

    // Head
    ctx.fillStyle = '#6a8a5a';
    ctx.fillRect(x + this.width / 2 - 7, y - 6, 14, 14);

    // Broken yellow tusks
    ctx.fillStyle = '#ddcc88';
    ctx.fillRect(x + this.width / 2, y + 4, 3, 4);
    ctx.fillRect(x + this.width / 2 + 5, y + 4, 2, 3);

    // Eyes (red)
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x + this.width / 2 - 4, y - 2, 3, 2);
    ctx.fillRect(x + this.width / 2 + 2, y - 2, 3, 2);

    // Block visual (shield raised)
    if (this.isBlocking) {
      const shieldX = this.facingRight ? x - 10 : x + this.width;
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(shieldX, y + 8, 12, 24);
      ctx.fillStyle = '#6a4a2a';
      ctx.fillRect(shieldX + 2, y + 12, 8, 16);
    }

    // Axe (two-handed, massive)
    const axeX = this.facingRight ? x + this.width : x - 16;
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(axeX, y + 4, 4, 30);
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(axeX - 4, y, 12, 10);

    // Overhead chop telegraph (axe raised high)
    if (this.state === 'attack' && this.currentAttacks.length > 0 && this.currentAttacks[0].phase === 'startup') {
      ctx.fillStyle = '#7a7a7a';
      ctx.fillRect(axeX, y - 10, 4, 30);
      ctx.fillRect(axeX - 4, y - 14, 12, 10);
    }
  }
};
