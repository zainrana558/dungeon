// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Animation & Rendering System
// Programmatic pixel-art sprite drawing + animation states
// ============================================================

const AnimationSystem = {
  // Draw a pixel-art rectangle (snapped to pixel grid)
  pixelRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  },

  // Draw pixel-art character from pixel data
  drawPixelData(ctx, data, x, y, scale = 1) {
    for (const px of data) {
      ctx.fillStyle = px.c;
      ctx.fillRect(
        Math.round(x + px.x * scale),
        Math.round(y + px.y * scale),
        Math.round(px.w * scale),
        Math.round(px.h * scale)
      );
    }
  },

  // Draw health bar
  drawHealthBar(ctx, x, y, w, h, current, max, color = '#ff3333', bgColor = '#1a1a1a') {
    const barW = w - 2;
    ctx.fillStyle = bgColor;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));

    const fillW = Math.max(0, (current / max) * barW);
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x + 1), Math.round(y + 1), Math.round(fillW), Math.round(h - 2));

    // Segmentation lines
    ctx.fillStyle = bgColor;
    for (let i = 1; i < 10; i++) {
      const sx = x + 1 + (barW / 10) * i;
      ctx.fillRect(Math.round(sx), Math.round(y + 1), 1, Math.round(h - 2));
    }
  },

  // Draw a block character (Knight-style)
  drawBlockCharacter(ctx, x, y, w, h, color, detailColor, facingRight = true) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(fx - 2, fy + h - 2, w + 4, 4);

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(fx, fy, w, h);

    // Armor details
    ctx.fillStyle = detailColor;
    ctx.fillRect(fx + 2, fy + 2, w - 4, 3);       // shoulder line
    ctx.fillRect(fx + 2, fy + h - 6, w - 4, 3);    // belt

    // Head (separate from body for most chars)
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(fx + w / 2 - 4, fy - 8, 8, 8);
  },

  // Draw a lean/fast character (Assassin-style)
  drawLeanCharacter(ctx, x, y, w, h, color, accentColor, facingRight = true) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Leaner shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(fx, fy + h - 2, w, 3);

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(fx + 2, fy, w - 4, h);

    // Accent stripes
    ctx.fillStyle = accentColor;
    ctx.fillRect(fx + 2, fy + h * 0.3, w - 4, 2);
    ctx.fillRect(fx + 2, fy + h * 0.7, w - 4, 1);

    // Head
    ctx.fillStyle = '#f0e6d3';
    ctx.fillRect(fx + w / 2 - 3, fy - 7, 6, 7);

    // Scarf
    ctx.fillStyle = accentColor;
    ctx.fillRect(fx + (facingRight ? w : -3), fy + 2, 6, 3);
  },

  // Draw a floating character (Mage-style)
  drawFloatCharacter(ctx, x, y, w, h, color, glowColor, floatOffset = 0) {
    const fx = Math.round(x);
    const fy = Math.round(y) + Math.sin(floatOffset * 0.1) * 2;

    // Glow beneath
    ctx.fillStyle = glowColor;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(fx - 4, fy + h, w + 8, 3);
    ctx.globalAlpha = 1;

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(fx, fy, w, h);

    // Glowing accents
    ctx.fillStyle = glowColor;
    ctx.fillRect(fx + 1, fy + 1, 2, h - 2);
    ctx.fillRect(fx + w - 3, fy + 1, 2, h - 2);

    // Head
    ctx.fillStyle = '#f8f0ff';
    ctx.fillRect(fx + w / 2 - 4, fy - 7, 8, 7);

    // Sparkles
    ctx.fillStyle = glowColor;
    ctx.globalAlpha = 0.5 + Math.sin(floatOffset * 0.2) * 0.3;
    ctx.fillRect(fx - 2, fy - 2, 2, 2);
    ctx.fillRect(fx + w, fy + h / 2, 2, 2);
    ctx.globalAlpha = 1;
  },

  // Draw mounted character (Paladin-style)
  drawMountedCharacter(ctx, x, y, w, h, riderColor, mountColor, facingRight = true) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Mount body (horse)
    ctx.fillStyle = mountColor;
    ctx.fillRect(fx, fy + h * 0.4, w, h * 0.6);

    // Mount legs
    const legPhase = Math.sin(GAME.frameCount * 0.1) * 2;
    ctx.fillStyle = mountColor;
    ctx.fillRect(fx + 2, fy + h, 4, 8 + legPhase);
    ctx.fillRect(fx + w - 6, fy + h, 4, 8 - legPhase);

    // Mount head
    ctx.fillStyle = mountColor;
    ctx.fillRect(fx + (facingRight ? w : -6), fy + h * 0.3, 8, 6);

    // Rider body
    ctx.fillStyle = riderColor;
    ctx.fillRect(fx + 2, fy, w - 4, h * 0.5);

    // Rider head
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(fx + w / 2 - 3, fy - 6, 6, 7);
  },

  // Draw a massive character (Warrior-style)
  drawMassiveCharacter(ctx, x, y, w, h, color, detailColor, facingRight = true) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Heavy shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(fx - 3, fy + h, w + 6, 5);

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(fx, fy, w, h);

    // Musculature
    ctx.fillStyle = detailColor;
    ctx.fillRect(fx + w * 0.3, fy, w * 0.4, h);
    ctx.fillRect(fx + 2, fy + h * 0.2, w - 4, 2);
    ctx.fillRect(fx + 2, fy + h * 0.6, w - 4, 3);

    // Head
    ctx.fillStyle = '#c4956b';
    ctx.fillRect(fx + w / 2 - 5, fy - 9, 10, 9);

    // Beard
    ctx.fillStyle = detailColor;
    ctx.fillRect(fx + w / 2 - 3, fy + 1, 6, 4);
  },

  // Draw a skeletal character (Necromancer/Lich)
  drawSkeletalCharacter(ctx, x, y, w, h, boneColor, robeColor, floatOffset = 0) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Robe
    ctx.fillStyle = robeColor;
    ctx.fillRect(fx, fy + h * 0.2, w, h * 0.8);

    // Robe details
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(fx + 2, fy + h * 0.5, w - 4, 1);

    // Skeletal body
    ctx.fillStyle = boneColor;
    ctx.fillRect(fx + w * 0.3, fy, w * 0.4, h * 0.4);

    // Skull
    ctx.fillStyle = boneColor;
    ctx.fillRect(fx + w / 2 - 4, fy - 7, 8, 7);
    // Eyes
    ctx.fillStyle = '#0f0';
    ctx.fillRect(fx + w / 2 - 2, fy - 4, 2, 2);
    ctx.fillRect(fx + w / 2 + 1, fy - 4, 2, 2);
  },

  // Draw weapon
  drawWeapon(ctx, x, y, type, facingRight = true) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    switch (type) {
      case 'sword':
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(fx + (facingRight ? 0 : -16), fy, 16, 3);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(fx + (facingRight ? -2 : 14), fy - 1, 4, 5);
        break;
      case 'dagger':
        ctx.fillStyle = '#e0e0e0';
        const tipX = facingRight ? fx + 14 : fx - 14;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tipX, fy + 1);
        ctx.lineTo(fx, fy + 2);
        ctx.fill();
        break;
      case 'axe':
        ctx.fillStyle = '#808080';
        ctx.fillRect(fx + (facingRight ? 0 : -10), fy, 10, 3);
        ctx.fillStyle = '#a0a0a0';
        ctx.fillRect(fx + (facingRight ? 2 : -14), fy - 4, 12, 11);
        break;
      case 'staff':
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(fx, fy - 20, 3, 24);
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(fx - 1, fy - 23, 5, 5);
        break;
      case 'lance':
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(fx + (facingRight ? 0 : -24), fy, 24, 3);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(fx + (facingRight ? -2 : 22), fy - 2, 4, 7);
        break;
      case 'flail':
        ctx.fillStyle = '#808080';
        ctx.fillRect(fx, fy - 8, 2, 12);
        ctx.fillStyle = '#909090';
        ctx.fillRect(fx - 2, fy + 4, 6, 6);
        break;
    }
  },

  // Draw hit effect
  drawHitEffect(ctx, x, y, type = 'normal') {
    const fx = Math.round(x);
    const fy = Math.round(y);

    switch (type) {
      case 'normal':
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          ctx.fillRect(fx + Math.cos(angle) * 4, fy + Math.sin(angle) * 4, 3, 3);
        }
        ctx.globalAlpha = 1;
        break;
      case 'counter':
        ctx.fillStyle = '#ff4444';
        ctx.globalAlpha = 0.9;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          ctx.fillRect(fx + Math.cos(angle) * 6, fy + Math.sin(angle) * 6, 4, 4);
        }
        ctx.globalAlpha = 1;
        break;
      case 'ko':
        // Shatter effect — drawn by particle system
        break;
      case 'block':
        ctx.fillStyle = '#4488ff';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(fx - 8, fy - 8, 16, 16);
        ctx.globalAlpha = 1;
        break;
    }
  },

  // Draw floor/ground
  drawFloor(ctx, floorType, offsetY = 0) {
    const groundY = GAME.height - 80 + offsetY;

    switch (floorType) {
      case 'horde':
        // Cave floor
        ctx.fillStyle = '#3a3028';
        ctx.fillRect(0, groundY, GAME.width, 80);
        ctx.fillStyle = '#2a2018';
        for (let i = 0; i < GAME.width; i += 40) {
          const h = 3 + Math.sin(i * 0.3 + GAME.frameCount * 0.02) * 2;
          ctx.fillRect(i, groundY, 40, h);
        }
        // Stalactites
        ctx.fillStyle = '#4a3a2a';
        for (let i = 100; i < GAME.width - 100; i += 120 + Math.random() * 80) {
          ctx.fillRect(i, 0, 6, 20 + Math.random() * 30);
        }
        break;
      case 'brute':
        // Colosseum sand
        ctx.fillStyle = '#c4a44a';
        ctx.fillRect(0, groundY, GAME.width, 80);
        ctx.fillStyle = '#b4943a';
        for (let i = 0; i < GAME.width; i += 20) {
          ctx.fillRect(i, groundY + (i % 40 === 0 ? 0 : 2), 20, 2);
        }
        break;
      case 'plague':
        // Library floor
        ctx.fillStyle = '#2a2040';
        ctx.fillRect(0, groundY, GAME.width, 80);
        ctx.fillStyle = 'rgba(0, 255, 100, 0.05)';
        ctx.fillRect(0, groundY, GAME.width, 80);
        // Floating books
        for (let i = 0; i < 5; i++) {
          const bx = (i * 200 + GAME.frameCount * 0.3) % GAME.width;
          ctx.fillStyle = '#4a3060';
          ctx.fillRect(bx, groundY - 80 + Math.sin(GAME.frameCount * 0.02 + i) * 15, 10, 8);
        }
        break;
      case 'feral':
        // Volcano
        ctx.fillStyle = '#1a1008';
        ctx.fillRect(0, groundY, GAME.width, 80);
        ctx.fillStyle = '#ff4400';
        ctx.globalAlpha = 0.1 + Math.sin(GAME.frameCount * 0.05) * 0.05;
        ctx.fillRect(0, groundY, GAME.width, 80);
        ctx.globalAlpha = 1;
        // Lava veins
        ctx.fillStyle = '#ff6600';
        for (let i = 50; i < GAME.width; i += 160) {
          ctx.fillRect(i, groundY + 10 + Math.sin(i) * 20, 3, 30);
        }
        break;
      case 'void':
        // Void realm
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, groundY, GAME.width, 80);
        // Glitching tiles
        for (let i = 0; i < GAME.width; i += 48) {
          ctx.fillStyle = Math.random() > 0.5 ? '#1a0a2a' : '#0a0a2a';
          ctx.fillRect(i, groundY, 48, 80);
        }
        break;
      case 'boss':
        // Boss room — dark, imposing
        ctx.fillStyle = '#111118';
        ctx.fillRect(0, groundY, GAME.width, 80);
        ctx.fillStyle = '#222230';
        for (let i = 0; i < GAME.width; i += 32) {
          ctx.fillRect(i, groundY, 32, 3);
        }
        break;
      case 'bonfire':
        // Rest floor — warm
        ctx.fillStyle = '#2a2010';
        ctx.fillRect(0, groundY, GAME.width, 80);
        break;
    }
  },

  // Draw bonfire
  drawBonfire(ctx, x, y) {
    const fx = Math.round(x);
    const fy = Math.round(y);
    const flame = Math.sin(GAME.frameCount * 0.15) * 0.5 + 0.5;

    // Logs
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(fx - 12, fy + 10, 24, 6);
    ctx.fillRect(fx - 8, fy + 8, 16, 6);

    // Fire
    ctx.fillStyle = `rgba(255, ${100 + Math.floor(flame * 80)}, 0, 0.8)`;
    ctx.fillRect(fx - 6, fy - 12 - flame * 8, 12, 20 + flame * 8);
    ctx.fillStyle = `rgba(255, ${180 + Math.floor(flame * 75)}, 50, 0.6)`;
    ctx.fillRect(fx - 3, fy - 8 - flame * 4, 6, 12 + flame * 4);

    // Glow
    ctx.fillStyle = `rgba(255, 150, 30, 0.05)`;
    ctx.fillRect(fx - 30, fy - 30, 60, 60);
  },

  // Frame-dependent blink/flash effect
  isBlinking(frameCount, every = 30) {
    return Math.floor(frameCount / every) % 2 === 0;
  }
};

const AN = AnimationSystem;
