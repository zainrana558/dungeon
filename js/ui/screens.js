// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Screen System
// Victory, Defeat, and Continue screens
// ============================================================

const ScreenSystem = {
  // Victory state
  victoryTimer: 0,
  victoryPoseStarted: false,

  // Defeat state
  defeatTimer: 0,
  bossApproaching: false,

  // Continue screen state
  continueTimer: 0,
  continueOption: 0,

  init() {
    this.victoryTimer = 0;
    this.defeatTimer = 0;
    this.continueTimer = 0;
  },

  // ============================================================
  // VICTORY
  // ============================================================

  initVictory() {
    this.victoryTimer = 0;
    this.victoryPoseStarted = false;
    GAME.state = 'VICTORY';
    ParticleSystem.addHolyLight(GAME.width / 2, GAME.height / 2);
    SFX.playSpecial('victory');
  },

  updateVictory() {
    this.victoryTimer++;
    if (this.victoryTimer > 180) {
      // Return to menu
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
    const timer = this.victoryTimer;

    // Background fades: black → white → blue
    let bgColor;
    if (timer < 30) bgColor = '#000000';
    else if (timer < 60) bgColor = `rgb(${Math.floor((timer-30)/30*255)}, ${Math.floor((timer-30)/30*255)}, ${Math.floor((timer-30)/30*255)})`;
    else bgColor = '#334488';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, GAME.width, GAME.height);

    // Player victory pose
    if (GAME.player && timer > 20) {
      const px = GAME.width / 2 - GAME.player.width / 2;
      const py = GAME.height - 150;
      GAME.player.renderVictoryPose(ctx, px, py, timer - 20);
    }

    // "VICTORY" text (appears after pose starts)
    if (timer > 40) {
      const textScale = Math.min(1, (timer - 40) / 60);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VICTORY', GAME.width / 2, 80);
    }

    // Stats
    if (timer > 80) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      ctx.fillText(`FLOORS CLEARED: 25 / 25`, GAME.width / 2, 130);
      ctx.fillText(`SOUL SHARDS: ${GAME.soulShards}`, GAME.width / 2, 150);
      ctx.fillText(`SCORE: ${GAME.score}`, GAME.width / 2, 170);
    }

    // "System Override. User wins." — Archdemon message
    if (timer > 100) {
      ctx.fillStyle = '#ff44ff';
      ctx.font = '12px monospace';
      ctx.fillText('SYSTEM OVERRIDE. USER WINS.', GAME.width / 2, 210);
    }

    // "Press any button to continue"
    if (timer > 180 && Math.floor(timer / 30) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.fillText('PRESS J/K/L TO RETURN TO MENU', GAME.width / 2, GAME.height - 40);
    }

    ctx.textAlign = 'left';
  },

  // ============================================================
  // DEFEAT
  // ============================================================

  initDefeat() {
    this.defeatTimer = 0;
    this.bossApproaching = false;
    TowerSystem.recordDeath();
    SFX.stopBossMusic();
  },

  updateDefeat() {
    this.defeatTimer++;

    // Boss walks toward camera
    if (this.defeatTimer > 40 && !this.bossApproaching) {
      this.bossApproaching = true;
    }

    // Transition to continue screen
    if (this.defeatTimer > 120) {
      GAME.state = 'CONTINUE';
      this.continueTimer = 0;
      this.continueOption = 0;
    }
  },

  renderDefeat(ctx) {
    const timer = this.defeatTimer;

    // Dim screen
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, GAME.width, GAME.height);

    // Player slumped against wall (design doc: still breathing)
    if (GAME.player) {
      const px = GAME.width / 4;
      const py = GAME.height - 140;
      GAME.player.renderDefeatPose(ctx, px, py, timer);

      // Chest breathing movement
      if (timer % 60 < 2) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(px + GAME.player.width / 2 - 4, py + 5, 8, 1);
      }
    }

    // Boss approaching camera (grows in pixel size)
    if (this.bossApproaching && GAME.boss) {
      const scale = 1 + (timer - 40) / 30;
      const bsx = GAME.width - 100 - scale * 20;
      const bsy = GAME.height - 140 - scale * 10;

      ctx.save();
      ctx.translate(bsx, bsy);
      ctx.scale(scale, scale);
      GAME.boss.renderEnemy(ctx);
      ctx.restore();

      // Boss roar effect
      if (timer % 80 < 5) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(0, 0, GAME.width, GAME.height);
      }
    }

    // "DEFEATED" text
    if (timer > 10) {
      ctx.fillStyle = '#ff3333';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DEFEATED', GAME.width / 2, 80);
    }
    ctx.textAlign = 'left';
  },

  // ============================================================
  // CONTINUE SCREEN
  // ============================================================

  updateContinue() {
    this.continueTimer++;

    if (IN.isBuffered('UP', 4)) {
      this.continueOption = (this.continueOption - 1 + 2) % 2;
      SFX.playUISelect();
    }
    if (IN.isBuffered('DOWN', 4)) {
      this.continueOption = (this.continueOption + 1) % 2;
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, GAME.width, GAME.height);

    const options = ['CONTINUE', 'QUIT TO MENU'];
    const mx = GAME.width / 2;
    const my = GAME.height / 2;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CONTINUE?', mx, my - 40);

    ctx.fillStyle = '#888888';
    ctx.font = '12px monospace';
    ctx.fillText(`FLOOR ${TowerSystem.currentFloor}`, mx, my - 15);

    for (let i = 0; i < options.length; i++) {
      const oy = my + 20 + i * 35;
      if (i === this.continueOption) {
        ctx.fillStyle = Math.floor(this.continueTimer / 30) % 2 === 0 ? '#ffd700' : '#ffaa00';
        ctx.fillText(`▶ ${options[i]}`, mx, oy);
      } else {
        ctx.fillStyle = '#555577';
        ctx.fillText(`  ${options[i]}`, mx, oy);
      }
    }

    ctx.textAlign = 'left';
  },
};

const SCR = ScreenSystem;
