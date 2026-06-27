// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Screen System
// Victory, Defeat, and Continue screens
// ============================================================

const ScreenSystem = {
  // Victory state
  victoryTimer: 0,
  victoryPoseStarted: false,
  victoryTextRevealed: 0,  // How many letters of "VICTORY" shown
  victoryStatValues: null,  // Count-up target values
  victoryStatDisplay: null, // Current displayed numbers

  // Victory particles
  victoryConfetti: [],
  victorySparkles: [],

  // Defeat state
  defeatTimer: 0,
  bossApproaching: false,
  defeatStamped: false,
  defeatScreenAlpha: 0,
  defeatBreathPhase: 0,
  defeatBreathTimer: 0,

  // Boss silhouette approach
  bossApproachProgress: 0,

  // Continue screen state
  continueTimer: 0,
  continueOption: 0,
  continueHighlightY: 0,
  continueHighlightTargetY: 0,
  continueCandleFlicker: 0,

  init() {
    this.victoryTimer = 0;
    this.defeatTimer = 0;
    this.continueTimer = 0;
  },

  // ============================================================
  // VICTORY SCREEN
  // ============================================================

  initVictory() {
    this.victoryTimer = 0;
    this.victoryPoseStarted = false;
    this.victoryTextRevealed = 0;
    this.victoryConfetti = [];
    this.victorySparkles = [];

    // Init count-up targets
    this.victoryStatTargets = {
      floors: 25,
      shards: GAME.soulShards,
      score: GAME.score,
    };
    this.victoryStatDisplay = {
      floors: 0,
      shards: 0,
      score: 0,
    };

    GAME.state = 'VICTORY';
    ParticleSystem.addHolyLight(GAME.width / 2, GAME.height / 2);
    SFX.playSpecial('victory');
  },

  updateVictory() {
    this.victoryTimer++;

    // Spawn confetti
    if (this.victoryTimer > 30 && this.victoryTimer < 200) {
      if (GAME.frameCount % 3 === 0) {
        this.victoryConfetti.push({
          x: Math.random() * GAME.width,
          y: -10,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 1.5 + 0.5,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.1,
          color: ['#ffd700', '#ff4444', '#44ff44', '#4488ff', '#ff44ff', '#44ffff'][Math.floor(Math.random() * 6)],
          size: 2 + Math.random() * 3,
          life: 120 + Math.random() * 60,
          maxLife: 180,
        });
      }
    }

    // Spawn sparkles
    if (this.victoryTimer > 40 && GAME.frameCount % 5 === 0) {
      ParticleSystem.addSparks(
        GAME.width / 2 + (Math.random() - 0.5) * 400,
        GAME.height / 2 + (Math.random() - 0.5) * 300,
        1
      );
    }

    // Occasional holy light bursts
    if (this.victoryTimer > 50 && this.victoryTimer % 40 === 0) {
      ParticleSystem.addHolyLight(
        GAME.width * 0.2 + Math.random() * GAME.width * 0.6,
        GAME.height * 0.2 + Math.random() * GAME.height * 0.4
      );
    }

    // Update confetti
    for (let i = this.victoryConfetti.length - 1; i >= 0; i--) {
      const c = this.victoryConfetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.rotation += c.rotSpeed;
      c.life--;
      if (c.life <= 0) this.victoryConfetti.splice(i, 1);
    }

    // Letter-by-letter text reveal
    if (this.victoryTimer > 50) {
      const revealFrame = 50;
      const revealProgress = this.victoryTimer - revealFrame;
      // "V I C T O R Y" — each letter takes 8 frames, with pauses
      const letterSchedule = [0, 10, 20, 30, 45, 58, 70]; // cumulative frames for each letter
      for (let i = 6; i >= 0; i--) {
        if (revealProgress >= letterSchedule[i]) {
          this.victoryTextRevealed = i + 1;
          break;
        }
      }
    }

    // Count-up stats
    if (this.victoryTimer > 90) {
      this.victoryStatDisplay.floors = Math.min(
        this.victoryStatTargets.floors,
        Math.floor(this.victoryStatDisplay.floors + (this.victoryStatTargets.floors / 60))
      );
      this.victoryStatDisplay.shards = Math.min(
        this.victoryStatTargets.shards,
        Math.ceil(this.victoryStatDisplay.shards + (this.victoryStatTargets.shards / 40))
      );
      this.victoryStatDisplay.score = Math.min(
        this.victoryStatTargets.score,
        Math.ceil(this.victoryStatDisplay.score + (this.victoryStatTargets.score / 50))
      );
    }

    // Return to menu after delay
    if (this.victoryTimer > 250) {
      if (IN.isBuffered('LIGHT', 4) || IN.isBuffered('HEAVY', 4) || IN.isBuffered('SPECIAL', 4)) {
        GAME.state = 'MENU';
        GAME.player = null;
        GAME.boss = null;
        GAME.enemies = [];
        SFX.playUIConfirm();
      }
    }
  },

  renderVictory(ctx) {
    const w = GAME.width;
    const h = GAME.height;
    const timer = this.victoryTimer;

    // ---------- BACKGROUND TRANSITION ----------
    // black → dark blue → gold-tinted reveal
    if (timer < 40) {
      // Pure black to deep navy
      const t = timer / 40;
      const rv = Math.floor(t * 10);
      const gv = Math.floor(t * 5);
      const bv = Math.floor(t * 40);
      ctx.fillStyle = `rgb(${rv}, ${gv}, ${bv})`;
      ctx.fillRect(0, 0, w, h);
    } else if (timer < 80) {
      // Deep navy to blue with gold tint
      const t = (timer - 40) / 40;
      const rv = Math.floor(10 + t * 25);
      const gv = Math.floor(5 + t * 20);
      const bv = Math.floor(40 + t * 30);
      ctx.fillStyle = `rgb(${rv}, ${gv}, ${bv})`;
      ctx.fillRect(0, 0, w, h);
    } else {
      // Blue with golden tint
      const goldPhase = Math.sin(timer * 0.02) * 0.1 + 0.5;
      ctx.fillStyle = `rgb(${Math.floor(15 + goldPhase * 40)}, ${Math.floor(12 + goldPhase * 30)}, ${Math.floor(50 + goldPhase * 40)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Subtle radial glow from center
    if (timer > 50) {
      const centerGlow = ctx.createRadialGradient(w / 2, h * 0.3, 20, w / 2, h * 0.3, w);
      centerGlow.addColorStop(0, 'rgba(255, 200, 50, 0.06)');
      centerGlow.addColorStop(0.5, 'rgba(255, 150, 20, 0.03)');
      centerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, w, h);
    }

    // ---------- GOLDEN BORDER GLOW ----------
    if (timer > 70) {
      const borderPulse = Math.sin(timer * 0.03) * 0.2 + 0.5;
      const borderAlpha = Math.min(1, (timer - 70) / 40) * borderPulse;

      ctx.fillStyle = `rgba(255, 200, 50, ${borderAlpha * 0.4})`;
      // Top and bottom borders
      ctx.fillRect(0, 0, w, 3);
      ctx.fillRect(0, h - 3, w, 3);
      // Left and right borders
      ctx.fillRect(0, 0, 3, h);
      ctx.fillRect(w - 3, 0, 3, h);

      // Corner accents
      const cornerPulse = Math.sin(timer * 0.05) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 220, 60, ${borderAlpha * cornerPulse})`;
      const cornerSize = 16;
      ctx.fillRect(0, 0, cornerSize, 1);
      ctx.fillRect(0, 0, 1, cornerSize);
      ctx.fillRect(w - cornerSize, 0, cornerSize, 1);
      ctx.fillRect(w - 1, 0, 1, cornerSize);
      ctx.fillRect(0, h - 1, cornerSize, 1);
      ctx.fillRect(0, h - cornerSize, 1, cornerSize);
      ctx.fillRect(w - cornerSize, h - 1, cornerSize, 1);
      ctx.fillRect(w - 1, h - cornerSize, 1, cornerSize);
    }

    // ---------- CONFETTI PARTICLES ----------
    for (const c of this.victoryConfetti) {
      const alpha = c.life / c.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
      ctx.restore();
    }

    // ---------- PLAYER VICTORY POSE ----------
    if (GAME.player && timer > 20) {
      const px = w / 2 - GAME.player.width / 2;
      const py = h - 140;

      // Player-specific victory pose
      GAME.player.y = py;
      GAME.player.groundY = py;
      GAME.player.facingRight = true;

      // Victory glow behind player
      const poseProgress = Math.min(1, (timer - 20) / 50);
      ctx.fillStyle = `rgba(255, 200, 50, ${0.05 + poseProgress * 0.1})`;
      ctx.fillRect(px - 20, py - 10, GAME.player.width + 40, GAME.player.height + 20);

      GAME.player.renderVictoryPose(ctx, px, py, timer - 20);

      // Holy light rays from behind player
      if (timer > 60) {
        for (let i = 0; i < 5; i++) {
          const rayX = px + GAME.player.width / 2;
          const rayY = py;
          const rayAngle = -Math.PI / 2 + (i - 2) * 0.15;
          const rayLen = 60 + Math.sin(timer * 0.05 + i) * 10;
          ctx.strokeStyle = `rgba(255, 220, 100, 0.1)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(rayX, rayY);
          ctx.lineTo(rayX + Math.cos(rayAngle) * rayLen, rayY + Math.sin(rayAngle) * rayLen);
          ctx.stroke();
        }
      }
    }

    // ---------- "VICTORY" TEXT LETTER BY LETTER ----------
    if (timer > 50) {
      const victoryText = 'VICTORY';
      const letterX = w / 2;
      const letterY = 70;
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';

      // Gold glow behind letters
      for (let i = 0; i < this.victoryTextRevealed; i++) {
        const charWidth = ctx.measureText(victoryText[i]).width;
        const spacing = ctx.measureText(victoryText).width / victoryText.length;

        // Letter glow
        const letterAlpha = Math.min(1, (this.victoryTextRevealed - i) * 0.4);
        ctx.fillStyle = `rgba(255, 200, 40, ${letterAlpha * 0.3})`;
        const charOffset = (i - victoryText.length / 2 + 0.5) * spacing;
        ctx.fillText(victoryText[i], letterX + charOffset + 1, letterY + 1);

        // Main letter
        ctx.fillStyle = '#ffd700';
        ctx.fillText(victoryText[i], letterX + charOffset, letterY);
      }
    }

    // ---------- STATS WITH COUNT-UP ----------
    if (timer > 90) {
      const statX = w / 2;
      const statY = 120;
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';

      const statAlpha = Math.min(1, (timer - 90) / 30);
      ctx.fillStyle = `rgba(255, 255, 255, ${statAlpha})`;

      ctx.fillText(`FLOORS CLEARED: ${this.victoryStatDisplay.floors} / 25`, statX, statY);
      ctx.fillText(`SOUL SHARDS: ${this.victoryStatDisplay.shards}`, statX, statY + 22);
      ctx.fillText(`SCORE: ${this.victoryStatDisplay.score}`, statX, statY + 44);

      // Stat underline decorations
      if (timer > 120) {
        ctx.fillStyle = `rgba(255, 200, 50, ${statAlpha * 0.3})`;
        ctx.fillRect(statX - 80, statY + 50, 160, 1);

        // Rank
        if (timer > 140) {
          const rankAlpha = Math.min(1, (timer - 140) / 30);
          ctx.fillStyle = `rgba(255, 215, 0, ${rankAlpha})`;
          ctx.font = '16px monospace';
          ctx.fillText('RANK: S', statX, statY + 70);

          // Sparkle on rank display
          if (timer > 155 && timer < 160) {
            ctx.fillStyle = 'rgba(255, 255, 200, 0.3)';
            ctx.fillRect(statX - 60, statY + 55, 120, 30);
          }
        }
      }
    }

    // ---------- "SYSTEM OVERRIDE" MESSAGE ----------
    if (timer > 170) {
      const soAlpha = Math.min(1, (timer - 170) / 40);
      const soPulse = Math.sin(timer * 0.06) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 68, 255, ${soAlpha * soPulse})`;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM OVERRIDE. USER WINS.', w / 2, h - 80);
    }

    // ---------- RETURN PROMPT ----------
    if (timer > 250 && Math.floor(timer / 30) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS J/K/L TO RETURN TO MENU', w / 2, h - 40);
    }

    ctx.textAlign = 'left';
  },

  // ============================================================
  // DEFEAT SCREEN
  // ============================================================

  initDefeat() {
    this.defeatTimer = 0;
    this.bossApproaching = false;
    this.defeatStamped = false;
    this.defeatScreenAlpha = 0;
    this.defeatBreathPhase = 0;
    this.defeatBreathTimer = 0;
    this.bossApproachProgress = 0;
    TowerSystem.recordDeath();
    SFX.stopBossMusic();
  },

  updateDefeat() {
    this.defeatTimer++;

    // Slow fade to dark
    this.defeatScreenAlpha = Math.min(1, this.defeatTimer / 120);

    // Breathing animation for slumped character
    this.defeatBreathTimer++;
    if (this.defeatBreathTimer > 50) {
      this.defeatBreathPhase = (this.defeatBreathPhase + 1) % 2;
      this.defeatBreathTimer = 0;
    }

    // Boss approaches camera
    if (this.defeatTimer > 50) {
      this.bossApproaching = true;
      this.bossApproachProgress = Math.min(1, (this.defeatTimer - 50) / 60);
    }

    // "DEFEATED" stamps onto screen
    if (this.defeatTimer > 25) {
      this.defeatStamped = true;
    }

    // Transition to continue screen
    if (this.defeatTimer > 150) {
      GAME.state = 'CONTINUE';
      this.continueTimer = 0;
      this.continueOption = 0;
    }
  },

  renderDefeat(ctx) {
    const w = GAME.width;
    const h = GAME.height;
    const timer = this.defeatTimer;

    // ---------- SLOW MOTION FADE TO DARK ----------
    ctx.fillStyle = `rgba(0, 0, 0, ${0.3 + this.defeatScreenAlpha * 0.7})`;
    ctx.fillRect(0, 0, w, h);

    // Red vignette at edges
    const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.5, w / 2, h / 2, w);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, `rgba(80, 0, 0, ${this.defeatScreenAlpha * 0.4})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // Slow blood drip from top
    if (timer > 10) {
      for (let i = 0; i < 3; i++) {
        const dripX = w * 0.2 + i * w * 0.3;
        const dripY = (timer * 0.6 - i * 40) % h;
        ctx.fillStyle = 'rgba(150, 0, 0, 0.15)';
        ctx.fillRect(dripX, Math.max(0, dripY - 15), 2, 15);
      }
    }

    // ---------- CHARACTER SLUMPS AGAINST WALL ----------
    if (GAME.player) {
      const px = w / 5;
      const py = h - 140;

      // Character slumped pose
      GAME.player.renderDefeatPose(ctx, px, py, timer);

      // Chest breathing — subtle 1px rise/fall
      if (timer < 120) {
        const breathOffset = this.defeatBreathPhase === 0 ? 0 : 1;
        const chestX = px + GAME.player.width / 2 - 6;
        const chestY = py + GAME.player.height * 0.25 - breathOffset;

        ctx.fillStyle = `rgba(255, 255, 255, 0.08)`;
        ctx.fillRect(chestX, chestY, 8, 4);
        // Breath puff
        if (this.defeatBreathTimer < 5 && this.defeatBreathPhase === 1) {
          ctx.fillStyle = `rgba(200, 200, 220, 0.05)`;
          ctx.fillRect(chestX + 4, chestY - 2, 3, 3);
        }
      }
    }

    // ---------- BOSS SILHOUETTE GROWS LARGER ----------
    if (this.bossApproaching && GAME.boss) {
      const bp = this.bossApproachProgress;
      // Cubic easing for slow-then-fast approach
      const easeProgress = bp * bp * (3 - 2 * bp);
      const scale = 1.0 + easeProgress * 3.5;
      const bsx = w - 80 - scale * 25;
      const bsy = h - 120 - scale * 15;

      ctx.save();
      ctx.globalAlpha = Math.min(1, (timer - 50) / 40);

      // Boss dark silhouette
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.translate(bsx + scale * 30, bsy + scale * 20);
      ctx.scale(scale, scale);

      // Render boss as silhouette (override colors to dark)
      const boss = GAME.boss;
      if (boss.renderEnemy) {
        ctx.fillStyle = '#000000';
        boss.renderEnemy(ctx);
      }

      ctx.restore();

      // Red eyes appearing from darkness
      if (bp > 0.4) {
        const eyeAlpha = Math.min(1, (bp - 0.4) * 3);
        ctx.fillStyle = `rgba(255, 0, 0, ${eyeAlpha * 0.8})`;
        const eyeY = bsy - 40;
        ctx.fillRect(w - 180, eyeY, 6, 4);
        ctx.fillRect(w - 200, eyeY, 6, 4);

        // Eye glow
        ctx.fillStyle = `rgba(255, 30, 30, ${eyeAlpha * 0.15})`;
        ctx.fillRect(w - 210, eyeY - 4, 50, 12);
      }

      // Screen rumble as boss gets closer
      if (bp > 0.7 && GAME.frameCount % 8 < 2) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
        ctx.fillRect(0, 0, w, h);
      }
    }

    // ---------- "DEFEATED" STAMP ----------
    if (this.defeatStamped) {
      const stampProgress = Math.min(1, (timer - 25) / 15);
      const stampScale = stampProgress < 0.3
        ? stampProgress / 0.3 * 2.5  // Overshoot
        : 1 + (1 - stampProgress) * 0.1; // Settle

      ctx.save();
      ctx.translate(w / 2, 80);
      ctx.scale(stampScale, stampScale);
      ctx.textAlign = 'center';

      // Stamp shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.font = 'bold 42px monospace';
      ctx.fillText('DEFEATED', 2, 2);

      // Impact flash
      if (stampProgress < 0.4) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-100, -30, 200, 50);
      }

      // Stamp body (red with blood-drip effect)
      const stampPulse = Math.sin(timer * 0.05) * 0.15 + 0.85;
      ctx.fillStyle = `rgba(220, 20, 20, ${stampPulse})`;
      ctx.font = 'bold 42px monospace';
      ctx.fillText('DEFEATED', 0, 0);

      // Inner glow
      ctx.fillStyle = `rgba(255, 50, 50, ${stampPulse * 0.4})`;
      ctx.fillText('DEFEATED', 0, -1);

      // Diagonal impact lines
      if (stampProgress > 0.5) {
        ctx.strokeStyle = `rgba(255, 50, 50, 0.2)`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const lx = -120 + i * 80;
          ctx.beginPath();
          ctx.moveTo(lx, -40);
          ctx.lineTo(lx + 30, 40);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // ---------- SCREEN DARKENING ----------
    if (timer > 110) {
      const finalFade = Math.min(1, (timer - 110) / 40);
      ctx.fillStyle = `rgba(0, 0, 0, ${finalFade * 0.6})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.textAlign = 'left';
  },

  // ============================================================
  // CONTINUE SCREEN
  // ============================================================

  updateContinue() {
    this.continueTimer++;

    // Smooth highlight lerp
    const continueMy = GAME.height / 2;
    this.continueHighlightY += (this.continueHighlightTargetY - this.continueHighlightY) * 0.25;

    if (IN.isBuffered('UP', 4)) {
      this.continueOption = (this.continueOption - 1 + 2) % 2;
      this.continueHighlightTargetY = continueMy + 20 + this.continueOption * 35;
      SFX.playUISelect();
    }
    if (IN.isBuffered('DOWN', 4)) {
      this.continueOption = (this.continueOption + 1) % 2;
      this.continueHighlightTargetY = continueMy + 20 + this.continueOption * 35;
      SFX.playUISelect();
    }

    if (IN.isBuffered('LIGHT', 4) || IN.isBuffered('HEAVY', 4)) {
      SFX.playUIConfirm();
      if (this.continueOption === 0) {
        // Retry current floor
        GAME.player.hp = GAME.player.maxHP;
        GAME.player.state = 'idle';
        GAME.player.dead = false;
        GAME.player.poseTimer = 0;
        GAME.player.y = GAME.player.groundY;
        GAME.state = 'PLAYING';
        TowerSystem.loadFloor(TowerSystem.currentFloor);
        HUDSystem.reset();
      } else {
        // Return to menu
        GAME.player = null;
        GAME.boss = null;
        GAME.enemies = [];
        GAME.state = 'MENU';
      }
    }
  },

  renderContinue(ctx) {
    const w = GAME.width;
    const h = GAME.height;
    const t = this.continueTimer;

    // ---------- DARK ATMOSPHERIC OVERLAY ----------
    // Dark gradient
    const darkGrad = ctx.createLinearGradient(0, 0, 0, h);
    darkGrad.addColorStop(0, '#000005');
    darkGrad.addColorStop(0.5, '#080810');
    darkGrad.addColorStop(1, '#050510');
    ctx.fillStyle = darkGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle fog particles
    for (let i = 0; i < 12; i++) {
      const fx = (i * 157 + 73) % w;
      const fy = (t * 0.2 + i * 97) % (h * 2) - h * 0.5;
      const fa = Math.sin(t * 0.02 + i) * 0.03 + 0.04;
      ctx.fillStyle = `rgba(100, 80, 150, ${fa})`;
      ctx.fillRect(Math.round(fx), Math.round(fy), 3 + (i % 3) * 2, 1);
    }

    // ---------- "CONTINUE?" WITH CANDLE-LIGHT FLICKER ----------
    const candleFlicker = Math.sin(t * 0.15) * Math.cos(t * 0.11 + 0.7) * 0.3 + 0.7;

    ctx.fillStyle = `rgba(255, 200, 100, ${candleFlicker * 0.15})`;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';

    // Candle glow behind text
    const textY = h / 2 - 40;
    const glowRadius = 100;
    const glow = ctx.createRadialGradient(w / 2, textY, 5, w / 2, textY, glowRadius);
    glow.addColorStop(0, `rgba(255, 170, 60, ${candleFlicker * 0.12})`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(w / 2 - glowRadius, textY - glowRadius, glowRadius * 2, glowRadius * 2);

    // Candle icon
    const candleX = w / 2 - 90;
    const candleY = textY - 24;
    // Wax
    ctx.fillStyle = '#e8d8c0';
    ctx.fillRect(candleX - 2, candleY, 4, 10);
    // Wick
    ctx.fillStyle = '#333';
    ctx.fillRect(candleX, candleY - 1, 1, 3);
    // Flame
    const flameH = 4 + candleFlicker * 3;
    const flameSway = Math.sin(t * 0.2) * 1.5;
    ctx.fillStyle = `rgba(255, ${180 + Math.floor(candleFlicker * 70)}, 40, 0.9)`;
    ctx.fillRect(candleX + flameSway - 1, candleY - flameH, 3, flameH);
    ctx.fillStyle = `rgba(255, 255, ${180 + Math.floor(candleFlicker * 50)}, 0.7)`;
    ctx.fillRect(candleX + flameSway, candleY - flameH + 1, 1, flameH - 2);

    // Candle on right side
    const candle2X = w / 2 + 86;
    ctx.fillStyle = '#e8d8c0';
    ctx.fillRect(candle2X - 2, candleY, 4, 10);
    ctx.fillStyle = '#333';
    ctx.fillRect(candle2X, candleY - 1, 1, 3);
    const flame2H = 4 + (1 - candleFlicker) * 3;
    const flame2Sway = Math.sin(t * 0.25 + 1) * 1.5;
    ctx.fillStyle = `rgba(255, ${180 + Math.floor((1 - candleFlicker) * 70)}, 40, 0.9)`;
    ctx.fillRect(candle2X + flame2Sway - 1, candleY - flame2H, 3, flame2H);
    ctx.fillStyle = `rgba(255, 255, ${180 + Math.floor((1 - candleFlicker) * 50)}, 0.7)`;
    ctx.fillRect(candle2X + flame2Sway, candleY - flame2H + 1, 1, flame2H - 2);

    // "CONTINUE?" text
    ctx.fillStyle = `rgba(255, 210, 120, ${0.8 + candleFlicker * 0.2})`;
    ctx.font = 'bold 24px monospace';
    ctx.fillText('CONTINUE?', w / 2, textY);

    // Floor number
    ctx.fillStyle = `rgba(200, 170, 140, 0.7)`;
    ctx.font = '12px monospace';
    ctx.fillText(`FLOOR ${TowerSystem.currentFloor}`, w / 2, textY + 20);

    // Decorative line
    const linePulse = Math.sin(t * 0.04) * 0.1 + 0.2;
    ctx.fillStyle = `rgba(255, 180, 50, ${linePulse})`;
    ctx.fillRect(w / 2 - 60, textY + 26, 120, 1);

    // ---------- OPTIONS WITH SMOOTH HIGHLIGHT ----------
    const options = ['RETRY', 'QUIT TO MENU'];
    const optionsY = h / 2 + 20;

    for (let i = 0; i < options.length; i++) {
      const oy = optionsY + i * 35;
      if (i === this.continueOption) {
        // Highlight bar
        const barX = w / 2 - 70;
        const barW = 140;
        const barH = 20;
        ctx.fillStyle = 'rgba(255, 180, 60, 0.1)';
        ctx.fillRect(barX, oy - barH / 2, barW, barH);
        ctx.fillStyle = 'rgba(255, 200, 80, 0.2)';
        ctx.fillRect(barX, oy - barH / 2, barW, 1);
        ctx.fillRect(barX, oy + barH / 2, barW, 1);

        // Option text
        ctx.fillStyle = '#ffd700';
        ctx.font = '14px monospace';
        ctx.fillText(options[i], w / 2, oy);
      } else {
        ctx.fillStyle = '#554433';
        ctx.font = '14px monospace';
        ctx.fillText(options[i], w / 2, oy);
      }
    }

    // Bottom prompt
    ctx.fillStyle = '#332211';
    ctx.font = '9px monospace';
    ctx.fillText('J/K TO SELECT  |  ↑ ↓ TO NAVIGATE', w / 2, h - 20);

    ctx.textAlign = 'left';
  },
};

const SCR = ScreenSystem;
