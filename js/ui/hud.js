// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — HUD System
// Liquid-fill health bars, portraits, boss bar, circular timer
// Combo counter with pop, soul gem icons, stone tablet floor
// ============================================================

const HUDSystem = {
  // 36-second round timer
  roundTime: 0,
  maxRoundTime: 2160,
  timerWarning: false,
  timerCritical: false,

  // Combo pop animation state
  lastComboCount: 0,
  comboPopScale: 1,
  comboTargetScale: 1,

  init() {
    this.roundTime = 0;
    this.lastComboCount = 0;
    this.comboPopScale = 1;
    this.comboTargetScale = 1;
  },

  update() {
    if (GAME.state !== 'PLAYING') return;
    const player = GAME.player;
    if (!player) return;

    this.roundTime++;

    // Timer urgency thresholds
    this.timerWarning = this.roundTime > this.maxRoundTime * 0.7;
    this.timerCritical = this.roundTime > this.maxRoundTime * 0.9;

    // Timer tick SFX
    if (this.timerWarning && GAME.frameCount % 60 === 0) {
      SFX.playTimerTick(this.timerCritical ? 1 : 0.3);
    }
    if (this.timerCritical && GAME.frameCount % 15 === 0) {
      SFX.playTimerTick(1);
    }

    // Time out → player loses
    if (this.roundTime >= this.maxRoundTime) {
      this.roundTime = 0;
      GAME.player.die();
    }

    // --- Combo pop animation ---
    if (player.comboCount > this.lastComboCount) {
      this.comboTargetScale = 1.6;
      // Spawn impact ring on big combo milestones
      if (player.comboCount >= 5 && player.comboCount % 5 === 0) {
        ParticleSystem.addImpactRing(
          GAME.width / 2, GAME.height - 50,
          40 + player.comboCount * 3,
          '#ffcc00'
        );
      }
    }
    this.lastComboCount = player.comboCount;

    // Smooth spring decay for combo scale
    this.comboPopScale += (this.comboTargetScale - this.comboPopScale) * 0.25;
    this.comboTargetScale += (1 - this.comboTargetScale) * 0.08;
    if (Math.abs(this.comboTargetScale - 1) < 0.005) {
      this.comboTargetScale = 1;
      this.comboPopScale = 1;
    }

    // --- Low-HP vignette CSS class ---
    const hpPercent = player.hp / player.maxHP;
    if (hpPercent < 0.25 && hpPercent > 0) {
      document.body.classList.add('low-hp');
    } else {
      document.body.classList.remove('low-hp');
    }

    // --- Boss low-HP CSS class ---
    if (GAME.boss && !GAME.boss.dead && GAME.boss.hp / GAME.boss.maxHP < 0.3) {
      document.body.classList.add('boss-critical');
    } else {
      document.body.classList.remove('boss-critical');
    }
  },

  reset() {
    this.roundTime = 0;
    this.timerWarning = false;
    this.timerCritical = false;
  },

  // ═══════════════════════════════════════════
  // DRAWING HELPERS
  // ═══════════════════════════════════════════

  // --- Pixel-art character portrait (18x18) ---
  drawPlayerPortrait(ctx, x, y, characterType) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Character-specific palette
    let hair = '#4a3728', skin = '#d4a574', eyes = '#4466cc', armor = '#556';
    switch (characterType) {
      case 'knight':     hair = '#d4a030'; skin = '#d4a574'; eyes = '#4466cc'; armor = '#667788'; break;
      case 'assassin':   hair = '#1a1a2e'; skin = '#f0e6d3'; eyes = '#44aa44'; armor = '#2a2a3e'; break;
      case 'mage':       hair = '#f8f0ff'; skin = '#f8f0ff'; eyes = '#8844ff'; armor = '#4a3080'; break;
      case 'necromancer': hair = '#333344'; skin = '#c0c0c0'; eyes = '#00ff44'; armor = '#2a2040'; break;
      case 'paladin':    hair = '#ffd700'; skin = '#d4a574'; eyes = '#ffaa00'; armor = '#c0c0d0'; break;
      case 'warrior':    hair = '#8B4513'; skin = '#c4956b'; eyes = '#ff4400'; armor = '#884422'; break;
    }

    const s = 18; // portrait size

    // Background
    ctx.fillStyle = '#111118';
    ctx.fillRect(fx, fy, s, s);

    // Hair (top and sides)
    ctx.fillStyle = hair;
    ctx.fillRect(fx + 2, fy + 1, s - 4, 5);    // top
    ctx.fillRect(fx, fy + 2, 3, 6);             // left side
    ctx.fillRect(fx + s - 3, fy + 2, 3, 6);     // right side

    // Face
    ctx.fillStyle = skin;
    ctx.fillRect(fx + 3, fy + 5, s - 6, 8);

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx + 5, fy + 7, 3, 2);
    ctx.fillRect(fx + s - 8, fy + 7, 3, 2);
    ctx.fillStyle = eyes;
    ctx.fillRect(fx + 6, fy + 7, 2, 2);
    ctx.fillRect(fx + s - 7, fy + 7, 2, 2);

    // Eyebrows
    ctx.fillStyle = hair;
    ctx.fillRect(fx + 4, fy + 5, 5, 1);
    ctx.fillRect(fx + s - 9, fy + 5, 5, 1);

    // Mouth (determined expression)
    ctx.fillStyle = '#6b4030';
    ctx.fillRect(fx + s / 2 - 2, fy + 11, 4, 1);

    // Armor collar
    ctx.fillStyle = armor;
    ctx.fillRect(fx + 1, fy + s - 3, s - 2, 3);

    // Border
    ctx.strokeStyle = '#333344';
    ctx.lineWidth = 1;
    ctx.strokeRect(fx + 0.5, fy + 0.5, s - 1, s - 1);
  },

  // --- Liquid-fill health bar with wave animation ---
  drawLiquidHealthBar(ctx, x, y, w, h, current, max, color, isLowHP) {
    const fx = Math.round(x);
    const fy = Math.round(y);
    const percent = Math.max(0, current / max);
    const fillW = Math.max(0, Math.round(percent * w));
    const t = GAME.frameCount * 0.07;
    const waveAmp = isLowHP ? 3.5 : 1.8;
    const waveFreq = isLowHP ? 0.15 : 0.1;

    // Outer border (dark metal)
    ctx.fillStyle = '#111118';
    ctx.fillRect(fx - 2, fy - 2, w + 4, h + 4);
    ctx.fillStyle = '#222230';
    ctx.fillRect(fx - 1, fy - 1, w + 2, h + 2);

    // Empty interior
    ctx.fillStyle = '#08080f';
    ctx.fillRect(fx, fy, w, h);

    if (fillW > 0) {
      // Main body fill
      ctx.fillStyle = color;
      ctx.fillRect(fx, fy + 3, fillW, h - 3);

      // Animated wave surface
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(fx, fy + h);
      ctx.lineTo(fx, fy + 4);
      for (let px = fx; px <= fx + fillW; px += 2) {
        const wy = fy + 2 + Math.sin(px * waveFreq + t) * waveAmp;
        ctx.lineTo(px, wy);
      }
      ctx.lineTo(fx + fillW, fy + h);
      ctx.closePath();
      ctx.fill();

      // Wave crest highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(fx, fy + 4);
      for (let px = fx; px <= fx + fillW; px += 2) {
        const wy = fy + 2 + Math.sin(px * waveFreq + t) * waveAmp;
        ctx.lineTo(px, wy - 1);
      }
      ctx.lineTo(fx + fillW, fy + 4);
      ctx.closePath();
      ctx.fill();

      // Top edge shine line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(fx, fy + 1, fillW, 1);

      // Floating bubble particles in the liquid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let i = 0; i < 4; i++) {
        const bx = fx + ((GAME.frameCount * (0.4 + i * 0.27) + i * 37) % fillW);
        const by = fy + h - 4 - ((Math.sin(GAME.frameCount * 0.04 + i * 1.7) * 0.5 + 0.5) * (h - 8));
        ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
      }
    }

    // Section dividers
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    const divs = 10;
    for (let i = 1; i < divs; i++) {
      const sx = fx + (w / divs) * i;
      ctx.fillRect(Math.round(sx) - 0.5, fy, 1, h);
    }

    // HP number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(current)}`, fx + w / 2, fy + h - 3);
    ctx.textAlign = 'left';
  },

  // --- Boss health bar — cracked edges, pulsing, skulls ---
  drawBossHealthBar(ctx, x, y, w, h, current, max) {
    const fx = Math.round(x);
    const fy = Math.round(y);
    const percent = Math.max(0, current / max);
    const fillW = Math.max(0, Math.round(percent * (w - 4)));
    const isLow = percent < 0.3;
    const pulse = isLow ? Math.sin(GAME.frameCount * 0.18) * 0.5 + 0.5 : 0;
    const flashOn = isLow && Math.floor(GAME.frameCount / 12) % 2 === 0;

    // Dramatic outer border with jagged top edge
    ctx.fillStyle = '#06060d';
    ctx.fillRect(fx - 6, fy - 8, w + 12, h + 16);

    // Cracked border body (jagged top & bottom)
    ctx.fillStyle = '#18182a';
    ctx.beginPath();
    ctx.moveTo(fx - 4, fy + h + 4);
    ctx.lineTo(fx - 4, fy - 4);
    for (let px = fx - 4; px <= fx + w + 4; px += 10) {
      const jag = (Math.sin(px * 1.9 + GAME.frameCount * 0.015) * 3);
      ctx.lineTo(px + 5, fy - 4 + jag);
    }
    ctx.lineTo(fx + w + 4, fy + h + 4);
    for (let px = fx + w + 4; px >= fx - 4; px -= 10) {
      const jag = (Math.cos(px * 2.1 + GAME.frameCount * 0.02) * 2);
      ctx.lineTo(px + 5, fy + h + 4 + jag);
    }
    ctx.closePath();
    ctx.fill();

    // Inner bar background
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(fx, fy, w, h);

    // Low-HP red glow behind bar
    if (isLow) {
      ctx.fillStyle = `rgba(255, 20, 10, ${0.25 + pulse * 0.35})`;
      ctx.fillRect(fx - 6, fy - 6, w + 12, h + 12);
    }

    // Health fill with gradient simulation
    if (fillW > 0) {
      const bossBase = percent > 0.5 ? '#cc1a1a' : percent > 0.25 ? '#e64400' : '#ff0a0a';
      const strips = 5;
      for (let i = 0; i < strips; i++) {
        const a = 1 - (i / strips) * 0.3;
        ctx.fillStyle = i === 0 ? bossBase : `rgba(220, 30, 20, ${a})`;
        const sh = Math.ceil(h / strips);
        ctx.fillRect(fx, fy + i * sh, fillW, sh);
      }

      // Damage shimmer traveling across
      const shimmerX = (GAME.frameCount * 3.5) % (w + 80) - 40;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(fx + shimmerX, fy, 22, h);

      // Crack lines across the fill (always visible, more when low)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.lineWidth = 1;
      const cracks = 2 + (isLow ? 4 : 0);
      for (let i = 0; i < cracks; i++) {
        const cx = fx + (i + 0.5) * (fillW / (cracks + 1)) + Math.sin(GAME.frameCount * 0.07 + i) * 4;
        ctx.beginPath();
        ctx.moveTo(cx, fy);
        ctx.lineTo(cx + 4, fy + h * 0.35);
        ctx.lineTo(cx - 2, fy + h * 0.65);
        ctx.lineTo(cx + 3, fy + h);
        ctx.stroke();
        // Branch crack
        if (isLow) {
          ctx.beginPath();
          ctx.moveTo(cx + 4, fy + h * 0.35);
          ctx.lineTo(cx + 10, fy + h * 0.55);
          ctx.stroke();
        }
      }

      // Flash overlay when boss HP is critically low
      if (isLow && flashOn) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
        ctx.fillRect(fx, fy, w, h);
      }
    }

    // Boss HP text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(current)} / ${max}`, fx + w / 2, fy + h - 3);
    ctx.textAlign = 'left';

    // Name above
    const bossName = GAME.boss ? GAME.boss.name.toUpperCase() : 'BOSS';
    ctx.fillStyle = isLow ? '#ff3333' : '#ddcccc';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(bossName, fx + w / 2, fy - 10);
    ctx.textAlign = 'left';

    // Skull icons at ends
    this.drawSkullIcon(ctx, fx - 16, fy + h / 2 - 6, 12);
    this.drawSkullIcon(ctx, fx + w + 4, fy + h / 2 - 6, 12);
  },

  // --- Small pixel skull icon ---
  drawSkullIcon(ctx, x, y, size) {
    const fx = Math.round(x);
    const fy = Math.round(y);
    ctx.fillStyle = '#667';
    ctx.fillRect(fx + 2, fy, size - 4, size - 3);
    ctx.fillRect(fx + 3, fy + size - 4, size - 6, 3);
    ctx.fillStyle = '#000';
    ctx.fillRect(fx + 3, fy + 2, 2, 2);
    ctx.fillRect(fx + size - 5, fy + 2, 2, 2);
  },

  // --- Circular clock timer ---
  drawCircularTimer(ctx, cx, cy, radius) {
    const timeLeft = Math.max(0, this.maxRoundTime - this.roundTime);
    const percent = timeLeft / this.maxRoundTime;
    const seconds = Math.ceil(timeLeft / 60);

    // Outer shadow ring
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fill();

    // Clock face background
    ctx.fillStyle = '#0e0e1e';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner face
    ctx.fillStyle = '#111128';
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
    ctx.fill();

    // Tick marks (36 = every ~1 second of 36s round)
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2 - Math.PI / 2;
      const inner = radius - 5;
      const outer = radius - 1;
      const tickGone = (1 - i / 36) > percent;
      const isMajor = i % 6 === 0;

      ctx.strokeStyle = tickGone
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = isMajor ? 2 : 0.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }

    // Filled arc (depletes clockwise from top)
    let arcColor;
    if (this.timerCritical) {
      arcColor = Math.floor(GAME.frameCount / 8) % 2 === 0 ? '#ff0000' : '#ff4444';
    } else if (this.timerWarning) {
      arcColor = '#ff8800';
    } else {
      arcColor = '#44aacc';
    }

    const startAngle = -Math.PI / 2;
    const filledAngle = startAngle + Math.PI * 2 * (1 - percent);

    // Background thin ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2.5, 0, Math.PI * 2);
    ctx.stroke();

    // Filled arc
    if (percent > 0) {
      ctx.strokeStyle = arcColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 2.5, startAngle, filledAngle, false);
      ctx.stroke();

      // Glow on filled arc
      ctx.strokeStyle = arcColor;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 2.5, startAngle, filledAngle, false);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Inner dark center
    ctx.fillStyle = '#080818';
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 6, 0, Math.PI * 2);
    ctx.fill();

    // Time text
    let textColor;
    if (this.timerCritical) {
      textColor = Math.floor(GAME.frameCount / 8) % 2 === 0 ? '#ff0000' : '#ffffff';
    } else if (this.timerWarning) {
      textColor = '#ffaa00';
    } else {
      textColor = '#ffffff';
    }

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    ctx.fillStyle = textColor;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(timeStr, cx, cy + 4);
    ctx.textAlign = 'left';
  },

  // --- Glowing soul-shard gem icon ---
  drawSoulGem(ctx, x, y, size) {
    const fx = Math.round(x);
    const fy = Math.round(y);
    const glow = Math.sin(GAME.frameCount * 0.06) * 0.25 + 0.75;
    const h = Math.floor(size / 2);

    // Outer glow halo
    ctx.fillStyle = `rgba(255, 215, 0, ${0.18 * glow})`;
    ctx.fillRect(fx - 4, fy - 4, size + 8, size + 8);

    // Diamond shape (pixel stacks)
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(fx + h - 1, fy - 2, 2, 2);          // tip top
    ctx.fillRect(fx + h - 2, fy, 4, 2);
    ctx.fillRect(fx + h - 3, fy + 2, 6, 2);          // widest
    ctx.fillRect(fx + h - 3, fy + 4, 6, 2);
    ctx.fillRect(fx + h - 2, fy + 6, 4, 2);
    ctx.fillRect(fx + h - 1, fy + 8, 2, 2);          // tip bottom

    // Facet shading
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(fx + h + 1, fy, 1, 2);
    ctx.fillRect(fx + h + 2, fy + 2, 1, 2);
    ctx.fillRect(fx + h + 2, fy + 4, 1, 2);

    // Shine sparkle
    ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * glow})`;
    ctx.fillRect(fx + h - 1, fy - 1, 1, 1);
    ctx.fillRect(fx + h - 2, fy + 1, 1, 1);

    // Inner glow pulse
    ctx.fillStyle = `rgba(255, 255, 200, ${0.25 * glow})`;
    ctx.fillRect(fx + h - 2, fy + 2, 4, 4);
  },

  // --- Stone tablet floor indicator ---
  drawStoneTablet(ctx, x, y, w, h) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Tablet body
    ctx.fillStyle = '#3a3028';
    ctx.fillRect(fx, fy, w, h);

    // Grain/texture
    ctx.fillStyle = '#2e241c';
    ctx.fillRect(fx + 3, fy + 2, w - 6, 1);
    ctx.fillRect(fx + 5, fy + h - 4, w - 10, 1);

    // Chipped top edge
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(fx + 3, fy, 8, 2);
    ctx.fillRect(fx + w / 2 - 6, fy, 12, 1);
    ctx.fillRect(fx + w - 11, fy, 8, 2);

    // Chipped bottom edge
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(fx + 5, fy + h - 2, 6, 2);
    ctx.fillRect(fx + w - 11, fy + h - 2, 6, 2);

    // Highlight along top-left
    ctx.fillStyle = '#5a4a38';
    ctx.fillRect(fx + 1, fy + 1, 1, h - 3);
    ctx.fillRect(fx + 1, fy + 1, w - 3, 1);

    // Border stroke
    ctx.strokeStyle = '#1a1008';
    ctx.lineWidth = 1;
    ctx.strokeRect(fx + 0.5, fy + 0.5, w - 1, h - 1);

    // Floor text
    ctx.fillStyle = '#e8d8c0';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`FLOOR ${TowerSystem.currentFloor} / 25`, fx + w / 2, fy + h / 2 + 5);
    ctx.textAlign = 'left';
  },

  // ═══════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════

  render(ctx) {
    if (!GAME.player) return;

    const player = GAME.player;
    const hpPercent = player.hp / player.maxHP;
    const isLowHP = hpPercent < 0.25 && hpPercent > 0;

    // ═══ PLAYER HEALTH BAR (top-left) + PORTRAIT ═══
    const barX = 60;
    const barY = 16;
    const barW = 210;
    const barH = 20;

    // Portrait to the left
    this.drawPlayerPortrait(ctx, barX - 44, barY, player.characterType || 'knight');

    // Player name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText((player.name || 'PLAYER').toUpperCase(), barX, barY - 4);

    // Health bar color
    let hpColor;
    if (hpPercent > 0.6) hpColor = '#dd2222';
    else if (hpPercent > 0.3) hpColor = '#ee6600';
    else hpColor = '#ee0000';

    // Low-HP pulse override
    if (isLowHP && Math.sin(GAME.frameCount * 0.22) > 0) {
      hpColor = '#ff4444';
    }

    this.drawLiquidHealthBar(ctx, barX, barY, barW, barH, player.hp, player.maxHP, hpColor, isLowHP);

    // Hidden ability indicator
    if (player.hiddenAbilityActive) {
      const haX = barX + barW + 6;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
      ctx.fillRect(haX, barY, 4, barH);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('ULT', haX - 2, barY - 4);
    }

    // ═══ BOSS HEALTH BAR (top center) ═══
    if (GAME.boss && !GAME.boss.dead) {
      const bossW = 350;
      const bossH = 18;
      const bossX = GAME.width / 2 - bossW / 2;
      const bossY = 8;
      this.drawBossHealthBar(ctx, bossX, bossY, bossW, bossH, GAME.boss.hp, GAME.boss.maxHP);
    }

    // ═══ CIRCULAR TIMER (right side) ═══
    const timerCX = GAME.width - 40;
    const timerCY = 42;
    const timerR = 30;
    this.drawCircularTimer(ctx, timerCX, timerCY, timerR);

    // ═══ COMBO COUNTER (center-bottom, pop animation) ═══
    if (player.comboCount > 1) {
      const comboAlpha = Math.min(1, player.comboTimer / 25);
      const s = this.comboPopScale;

      ctx.save();
      const ccx = GAME.width / 2;
      const ccy = GAME.height - 52;
      ctx.translate(ccx, ccy);
      ctx.scale(s, s);

      // Glow aura behind combo
      const gAlpha = 0.25 * comboAlpha;
      ctx.fillStyle = `rgba(255, 200, 20, ${gAlpha})`;
      ctx.fillRect(-55, -16, 110, 32);

      // Combo number
      ctx.fillStyle = `rgba(255, 210, 30, ${comboAlpha})`;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${player.comboCount}x`, 0, 8);

      // COMBO label below
      ctx.fillStyle = `rgba(255, 170, 20, ${comboAlpha * 0.85})`;
      ctx.font = 'bold 8px monospace';
      ctx.fillText('COMBO', 0, 18);

      ctx.restore();
    }

    // ═══ SOUL SHARDS (bottom-left, gem icon) ═══
    const gemX = 18;
    const gemY = GAME.height - 30;
    this.drawSoulGem(ctx, gemX, gemY, 10);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${GAME.soulShards}`, gemX + 18, gemY + 11);

    // ═══ FLOOR INDICATOR (bottom-right, stone tablet) ═══
    const tabletW = 150;
    const tabletH = 24;
    const tabletX = GAME.width - tabletW - 16;
    const tabletY = GAME.height - 38;
    this.drawStoneTablet(ctx, tabletX, tabletY, tabletW, tabletH);

    // ═══ ENEMY MINI HEALTH BARS ═══
    for (const enemy of GAME.enemies) {
      if (enemy.dead) continue;
      const ehpW = Math.min(enemy.width + 12, 46);
      const ePct = enemy.hp / enemy.maxHP;
      const eColor = ePct > 0.5 ? '#dd3333' : '#ee5500';
      const ebX = Math.round(enemy.x + enemy.width / 2 - ehpW / 2);
      const ebY = Math.round(enemy.y - 10);
      const ebH = 5;

      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(ebX - 1, ebY - 1, ehpW + 2, ebH + 2);
      ctx.fillStyle = '#111120';
      ctx.fillRect(ebX, ebY, ehpW, ebH);
      if (ePct > 0) {
        ctx.fillStyle = eColor;
        ctx.fillRect(ebX, ebY, Math.max(1, Math.round(ehpW * ePct)), ebH);
      }
    }
  },
};

const HUD = HUDSystem;
