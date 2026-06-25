// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — HUD System
// Health bars, timer, combo counter, soul shards
// ============================================================

const HUDSystem = {
  // 36-second round timer
  roundTime: 0,
  maxRoundTime: 2160, // 36 seconds * 60fps
  timerWarning: false,
  timerCritical: false,

  init() {
    this.roundTime = 0;
  },

  update() {
    if (GAME.state !== 'PLAYING') return;

    this.roundTime++;

    // Timer urgency
    this.timerWarning = this.roundTime > this.maxRoundTime * 0.7; // ~10s left
    this.timerCritical = this.roundTime > this.maxRoundTime * 0.9; // ~3s left

    // Timer click (design doc: soft click, increases in volume)
    if (this.timerWarning && GAME.frameCount % 60 === 0) {
      SFX.playTimerTick(this.timerCritical ? 1 : 0.3);
    }
    if (this.timerCritical && GAME.frameCount % 15 === 0) {
      // Frantic staccato tick-tick-tick
      SFX.playTimerTick(1);
    }

    // Time out: player loses
    if (this.roundTime >= this.maxRoundTime) {
      this.roundTime = 0;
      GAME.player.die();
    }
  },

  reset() {
    this.roundTime = 0;
    this.timerWarning = false;
    this.timerCritical = false;
  },

  render(ctx) {
    if (!GAME.player) return;

    const player = GAME.player;

    // === PLAYER HEALTH BAR (top-left) ===
    const barX = 20;
    const barY = 15;
    const barW = 250;
    const barH = 18;

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    // Health fill
    const hpPercent = player.hp / player.maxHP;
    let hpColor;
    if (hpPercent > 0.6) hpColor = '#ff3333';
    else if (hpPercent > 0.3) hpColor = '#ffaa00';
    else hpColor = '#ff0000';

    // Low HP pulsing
    if (hpPercent < 0.25 && Math.sin(GAME.frameCount * 0.3) > 0) {
      hpColor = '#ff8888';
    }

    AN.drawHealthBar(ctx, barX, barY, barW, barH, player.hp, player.maxHP, hpColor);

    // Player name
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px monospace';
    ctx.fillText(player.name.toUpperCase(), barX, barY - 4);

    // HP text
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHP}`, barX + barW / 2, barY + 13);
    ctx.textAlign = 'left';

    // Hidden ability indicator
    if (player.hiddenAbilityActive) {
      const haX = barX + barW + 10;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.fillRect(haX, barY, 4, barH);
      ctx.fillStyle = '#ffd700';
      ctx.font = '8px monospace';
      ctx.fillText('ULT', haX - 2, barY - 3);
    }

    // === BOSS HEALTH BAR (top-right, if boss) ===
    if (GAME.boss && !GAME.boss.dead) {
      const bossBarW = 300;
      const bossBarX = GAME.width - bossBarW - 20;
      const bHp = GAME.boss.hp / GAME.boss.maxHP;
      const bossColor = bHp > 0.5 ? '#ff4444' : bHp > 0.25 ? '#ff8800' : '#ff0000';

      AN.drawHealthBar(ctx, bossBarX, barY, bossBarW, barH, GAME.boss.hp, GAME.boss.maxHP, bossColor);

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(GAME.boss.name.toUpperCase(), GAME.width - 20, barY - 4);
      ctx.textAlign = 'left';
    }

    // === ROUND TIMER (top-center) ===
    const timeLeft = Math.max(0, Math.ceil((this.maxRoundTime - this.roundTime) / 60));
    const timerX = GAME.width / 2;
    const timerY = 20;

    ctx.font = this.timerCritical ? 'bold 18px monospace' : '14px monospace';
    ctx.textAlign = 'center';

    if (this.timerCritical) {
      // Flashing red
      if (Math.floor(GAME.frameCount / 15) % 2 === 0) {
        ctx.fillStyle = '#ff0000';
      } else {
        ctx.fillStyle = '#ffffff';
      }
    } else if (this.timerWarning) {
      ctx.fillStyle = '#ffaa00';
    } else {
      ctx.fillStyle = '#ffffff';
    }

    ctx.fillText(`${timeLeft}`, timerX, timerY);
    ctx.textAlign = 'left';

    // === ENEMY HEALTH BARS (above enemies) ===
    for (const enemy of GAME.enemies) {
      if (enemy.dead) continue;
      const ehpW = Math.min(enemy.width + 10, 40);
      AN.drawHealthBar(ctx, enemy.x + enemy.width / 2 - ehpW / 2, enemy.y - 10,
                       ehpW, 5, enemy.hp, enemy.maxHP, '#ff5555');
    }

    // === SOUL SHARD COUNTER ===
    ctx.fillStyle = '#ffd700';
    ctx.font = '12px monospace';
    ctx.fillText(`✦ ${GAME.soulShards}`, 20, GAME.height - 15);

    // === FLOOR INDICATOR ===
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(`FLOOR ${TowerSystem.currentFloor} / 25`, GAME.width / 2 - 30, GAME.height - 15);

    // === COMBO COUNTER ===
    if (player.comboCount > 1) {
      const comboAlpha = player.comboTimer / 60;
      ctx.fillStyle = `rgba(255, 200, 50, ${comboAlpha})`;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${player.comboCount}x COMBO`, GAME.width / 2, GAME.height - 40);
      ctx.textAlign = 'left';
    }
  },
};

const HUD = HUDSystem;
