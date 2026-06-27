// FloorRenderer — Enhanced floor/level visual rendering
// Pre-calculates static elements; animates torch flicker and dust particles per frame.
var FloorRenderer = (function() {
  var W = 960, H = 540;
  var GROUND_Y = H - 65; // y=475
  var FLOOR_H = H - GROUND_Y; // 65px tall floor strip
  var TILE = 16;
  var COLS = Math.ceil(W / TILE); // 60
  var ROWS = Math.ceil(FLOOR_H / TILE); // ~5

  // Tile colour palettes per floor type
  var PALETTES = {
    horde:    { a: '#2a2520', b: '#332e28', accent: '#3a3530' },
    brute:    { a: '#3a3020', b: '#443a2a', accent: '#504530' },
    plague:   { a: '#1a1a28', b: '#222233', accent: '#2a2a40' },
    feral:    { a: '#1a2818', b: '#223520', accent: '#2a4028' },
    void:     { a: '#0a0818', b: '#12102a', accent: '#1a1838' },
    boss:     { a: '#1a1018', b: '#221828', accent: '#2a2030' },
    bonfire:  { a: '#2a2018', b: '#332820', accent: '#3a3028' }
  };

  // Torch positions (x, y offset from ground)
  var TORCH_POSITIONS = [
    { x: 120,  yOff: 10 },
    { x: 480,  yOff: 10 },
    { x: 840,  yOff: 10 },
    { x: 300,  yOff: 5  }
  ];

  // State
  var currentType = null;
  var currentFloor = 0;
  var frame = 0;

  // Pre-calculated static data
  var tiles = [];        // 2D array of tile info
  var wallSegments = []; // wall/pillar rectangles
  var decorations = [];  // floor decoration objects
  var bloodStains = [];  // blood stain positions

  // Dynamic state
  var particles = [];
  var PARTICLE_COUNT = 18;

  // Seeded random for deterministic static generation
  var _seed = 12345;
  function seededRandom() {
    _seed = (_seed * 16807 + 0) % 2147483647;
    return (_seed - 1) / 2147483646;
  }

  // --- INIT ---
  function init(floorType, floorNum) {
    currentType = floorType || 'horde';
    currentFloor = floorNum || 1;
    _seed = floorNum * 7 + floorType.charCodeAt(0) * 13 + 42;

    generateTiles();
    generateWalls();
    generateDecorations();
    generateBloodStains();
    initParticles();
  }

  function generateTiles() {
    tiles = [];
    var pal = PALETTES[currentType] || PALETTES.horde;
    var colors = [pal.a, pal.b, pal.a, pal.b, pal.accent];

    for (var r = 0; r < ROWS; r++) {
      tiles[r] = [];
      for (var c = 0; c < COLS; c++) {
        tiles[r][c] = {
          color: colors[Math.floor(seededRandom() * colors.length)],
          crack: seededRandom() < 0.08,
          moss: seededRandom() < 0.06,
          rune: seededRandom() < 0.05,
          vein: seededRandom() < 0.04,
          sand: seededRandom() < 0.10,
          root: seededRandom() < 0.05,
          glowLine: seededRandom() < 0.06,
          goldenGlow: seededRandom() < 0.04,
          variation: seededRandom()
        };
      }
    }
  }

  function generateWalls() {
    wallSegments = [];
    var wallH = GROUND_Y;

    // Dark wall base
    wallSegments.push({ x: 0, y: 0, w: W, h: wallH, color: '#0e0e14' });

    // Pillar variations
    var pillarSpacing = 160 + Math.floor(seededRandom() * 60);
    for (var px = 40; px < W - 40; px += pillarSpacing) {
      var pw = 20 + Math.floor(seededRandom() * 16);
      var shade = 14 + Math.floor(seededRandom() * 8);
      var hex = shade.toString(16);
      var hexB = (shade + 4).toString(16);
      wallSegments.push({
        x: px, y: 0, w: pw, h: wallH,
        color: '#' + hex + hex + hexB
      });
      // Pillar edge highlight
      wallSegments.push({
        x: px, y: 0, w: 2, h: wallH,
        color: 'rgba(255,255,255,0.03)'
      });
      pillarSpacing = 140 + Math.floor(seededRandom() * 80);
    }

    // Side wall darkening strips
    wallSegments.push({ x: 0, y: 0, w: 16, h: H, color: 'rgba(0,0,0,0.35)' });
    wallSegments.push({ x: W - 16, y: 0, w: 16, h: H, color: 'rgba(0,0,0,0.35)' });

    // Floor edge line
    var edgeColor = '#1a1a20';
    if (currentType === 'brute') edgeColor = '#5a4a2a';
    else if (currentType === 'plague') edgeColor = '#1a1a30';
    else if (currentType === 'void') edgeColor = '#0a0820';
    else if (currentType === 'boss') edgeColor = '#1a0a18';
    else if (currentType === 'bonfire') edgeColor = '#2a1a10';
    wallSegments.push({ x: 0, y: GROUND_Y - 2, w: W, h: 2, color: edgeColor });
  }

  function generateDecorations() {
    decorations = [];
    var count = 8 + Math.floor(seededRandom() * 10);

    for (var i = 0; i < count; i++) {
      var dx = 20 + Math.floor(seededRandom() * (W - 40));
      var dy = GROUND_Y + 4 + Math.floor(seededRandom() * (FLOOR_H - 12));
      var type = 'generic';

      switch (currentType) {
        case 'plague':
          type = seededRandom() < 0.5 ? 'bone' : 'skull';
          break;
        case 'horde':
          type = seededRandom() < 0.5 ? 'crack_detail' : 'moss_detail';
          break;
        case 'brute':
          type = 'weapon_rack';
          break;
        case 'void':
          type = 'glowing_rune';
          break;
        case 'boss':
          type = seededRandom() < 0.4 ? 'blood_stain_detail' : 'candle';
          break;
        case 'feral':
          type = seededRandom() < 0.5 ? 'moss_detail' : 'root_detail';
          break;
        case 'bonfire':
          type = 'ember_detail';
          break;
      }

      decorations.push({
        x: dx, y: dy, type: type,
        size: 2 + Math.floor(seededRandom() * 4),
        variation: seededRandom()
      });
    }
  }

  function generateBloodStains() {
    bloodStains = [];
    var count = 3 + Math.floor(seededRandom() * 5);
    for (var i = 0; i < count; i++) {
      bloodStains.push({
        x: 60 + Math.floor(seededRandom() * (W - 120)),
        y: GROUND_Y + 5 + Math.floor(seededRandom() * (FLOOR_H - 15)),
        w: 6 + Math.floor(seededRandom() * 14),
        h: 3 + Math.floor(seededRandom() * 5),
        alpha: 0.08 + seededRandom() * 0.12
      });
    }
  }

  function initParticles() {
    particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle());
    }
  }

  function createParticle() {
    return {
      x: Math.random() * W,
      y: GROUND_Y - 10 - Math.random() * 80,
      vy: -(0.2 + Math.random() * 0.3),
      vx: (Math.random() - 0.5) * 0.3,
      life: 0,
      maxLife: 120 + Math.floor(Math.random() * 180),
      size: 1 + Math.random() * 1.5,
      alpha: 0
    };
  }

  // --- UPDATE ---
  function update() {
    frame++;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx + Math.sin(frame * 0.02 + i * 1.7) * 0.15;
      p.y += p.vy;
      p.life++;

      // Fade in/out
      var lifeRatio = p.life / p.maxLife;
      if (lifeRatio < 0.15) {
        p.alpha = lifeRatio / 0.15;
      } else if (lifeRatio > 0.8) {
        p.alpha = (1.0 - lifeRatio) / 0.2;
      } else {
        p.alpha = 1.0;
      }

      // Recycle expired particles
      if (p.life >= p.maxLife) {
        particles[i] = createParticle();
      }
    }
  }

  // --- RENDER ---
  function render(ctx, floorType, floorNum) {
    if (!currentType) init(floorType, floorNum);

    // Re-init if floor changed
    if (floorType !== currentType || floorNum !== currentFloor) {
      init(floorType, floorNum);
    }

    drawBackgroundWalls(ctx);
    drawTiledFloor(ctx);
    drawFloorDecorations(ctx);
    drawBloodStains(ctx);
    drawTorchGlows(ctx);
    drawParticles(ctx);
    drawFloorEdgeHighlight(ctx);
  }

  function drawBackgroundWalls(ctx) {
    for (var i = 0; i < wallSegments.length; i++) {
      var s = wallSegments[i];
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.w, s.h);
    }
  }

  function drawTiledFloor(ctx) {
    var pal = PALETTES[currentType] || PALETTES.horde;
    ctx.fillStyle = pal.a;
    ctx.fillRect(0, GROUND_Y, W, FLOOR_H);

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var t = tiles[r][c];
        var tx = c * TILE;
        var ty = GROUND_Y + r * TILE;

        // Tile fill
        ctx.fillStyle = t.color;
        ctx.fillRect(tx, ty, TILE, TILE);

        // Tile grid lines (subtle)
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(tx, ty, TILE, 1);
        ctx.fillRect(tx, ty, 1, TILE);

        // Per-type decorations on tiles
        if (currentType === 'horde' && t.crack) {
          drawCrack(ctx, tx, ty, t.variation);
        }
        if ((currentType === 'horde' || currentType === 'feral') && t.moss) {
          drawMoss(ctx, tx, ty, t.variation);
        }
        if (currentType === 'brute' && t.sand) {
          drawSandPattern(ctx, tx, ty, t.variation);
        }
        if (currentType === 'plague' && t.rune) {
          drawRune(ctx, tx, ty, t.variation);
        }
        if (currentType === 'feral' && t.root) {
          drawRoot(ctx, tx, ty, t.variation);
        }
        if (currentType === 'void' && t.glowLine) {
          drawGlowLine(ctx, tx, ty, t.variation);
        }
        if (currentType === 'boss' && t.vein) {
          drawVein(ctx, tx, ty, t.variation);
        }
        if (currentType === 'bonfire' && t.goldenGlow) {
          drawGoldenGlow(ctx, tx, ty, t.variation);
        }
      }
    }
  }

  function drawCrack(ctx, tx, ty, v) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    var sx = tx + 3 + v * 8;
    var sy = ty + 2 + v * 6;
    ctx.fillRect(sx, sy, 1, 1);
    ctx.fillRect(sx + 1, sy + 1, 1, 1);
    ctx.fillRect(sx + 2, sy + 2, 2, 1);
    ctx.fillRect(sx + 1, sy + 3, 1, 1);
  }

  function drawMoss(ctx, tx, ty, v) {
    ctx.fillStyle = 'rgba(40,80,30,0.3)';
    var mx = tx + v * 10;
    var my = ty + v * 8;
    ctx.fillRect(mx, my, 3, 2);
    ctx.fillRect(mx + 1, my + 2, 2, 1);
  }

  function drawSandPattern(ctx, tx, ty, v) {
    ctx.fillStyle = 'rgba(200,180,120,0.15)';
    for (var i = 0; i < 3; i++) {
      var dx = tx + ((v * 100 + i * 5) % 12);
      var dy = ty + ((v * 77 + i * 7) % 12);
      ctx.fillRect(dx, dy, 2, 1);
    }
  }

  function drawRune(ctx, tx, ty, v) {
    var pulse = Math.sin(frame * 0.04 + v * 10) * 0.15 + 0.35;
    ctx.fillStyle = 'rgba(100,200,255,' + pulse.toFixed(3) + ')';
    ctx.fillRect(tx + 5 + v * 3, ty + 4, 6, 1);
    ctx.fillRect(tx + 7 + v * 2, ty + 5, 1, 4);
    ctx.fillRect(tx + 4 + v * 3, ty + 7, 6, 1);
  }

  function drawRoot(ctx, tx, ty, v) {
    ctx.fillStyle = 'rgba(30,50,20,0.4)';
    ctx.fillRect(tx + v * 8, ty + 6, 12, 1);
    ctx.fillRect(tx + v * 8 + 4, ty + 7, 1, 3);
    ctx.fillRect(tx + v * 8 + 8, ty + 7, 1, 2);
  }

  function drawGlowLine(ctx, tx, ty, v) {
    var pulse = Math.sin(frame * 0.06 + v * 8) * 0.2 + 0.4;
    ctx.fillStyle = 'rgba(150,80,255,' + pulse.toFixed(3) + ')';
    ctx.fillRect(tx + 2, ty + 8, 12, 1);
    ctx.fillRect(tx + 7, ty + 3, 1, 10);
  }

  function drawVein(ctx, tx, ty, v) {
    var pulse = Math.sin(frame * 0.03 + v * 6) * 0.1 + 0.2;
    ctx.fillStyle = 'rgba(180,30,30,' + pulse.toFixed(3) + ')';
    ctx.fillRect(tx + 1 + v * 5, ty + 4, 10, 1);
    ctx.fillRect(tx + 5 + v * 3, ty + 5, 1, 6);
    ctx.fillRect(tx + 8 + v * 2, ty + 7, 1, 3);
  }

  function drawGoldenGlow(ctx, tx, ty, v) {
    var pulse = Math.sin(frame * 0.05 + v * 7) * 0.15 + 0.25;
    ctx.fillStyle = 'rgba(255,180,60,' + pulse.toFixed(3) + ')';
    ctx.fillRect(tx + 4, ty + 4, 8, 8);
  }

  function drawFloorDecorations(ctx) {
    for (var i = 0; i < decorations.length; i++) {
      var d = decorations[i];
      switch (d.type) {
        case 'bone':
          ctx.fillStyle = 'rgba(200,190,170,0.3)';
          ctx.fillRect(d.x, d.y, d.size + 2, 2);
          ctx.fillRect(d.x - 1, d.y - 1, 1, 4);
          ctx.fillRect(d.x + d.size + 2, d.y - 1, 1, 4);
          break;

        case 'skull':
          ctx.fillStyle = 'rgba(210,200,180,0.35)';
          ctx.fillRect(d.x, d.y, 4, 4);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(d.x + 1, d.y + 1, 1, 1);
          ctx.fillRect(d.x + 3, d.y + 1, 1, 1);
          break;

        case 'crack_detail':
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(d.x, d.y, d.size + 4, 1);
          ctx.fillRect(d.x + d.size, d.y + 1, 1, 3);
          ctx.fillRect(d.x + d.size + 3, d.y + 2, 1, 2);
          break;

        case 'moss_detail':
          ctx.fillStyle = 'rgba(30,70,25,0.3)';
          ctx.fillRect(d.x, d.y, d.size + 2, 3);
          ctx.fillStyle = 'rgba(40,90,35,0.2)';
          ctx.fillRect(d.x + 1, d.y + 3, d.size, 1);
          break;

        case 'weapon_rack':
          ctx.fillStyle = 'rgba(80,60,40,0.25)';
          ctx.fillRect(d.x, d.y, 2, 10);
          ctx.fillRect(d.x + 10, d.y, 2, 10);
          ctx.fillRect(d.x, d.y, 12, 2);
          ctx.fillStyle = 'rgba(150,140,130,0.3)';
          ctx.fillRect(d.x + 3, d.y + 2, 1, 7);
          ctx.fillRect(d.x + 6, d.y + 2, 1, 6);
          ctx.fillRect(d.x + 9, d.y + 2, 1, 8);
          break;

        case 'glowing_rune':
          var rp = Math.sin(frame * 0.04 + d.variation * 10) * 0.2 + 0.4;
          ctx.fillStyle = 'rgba(130,60,255,' + rp.toFixed(3) + ')';
          ctx.fillRect(d.x, d.y, 8, 1);
          ctx.fillRect(d.x + 3, d.y - 2, 1, 5);
          ctx.fillRect(d.x + 4, d.y + 1, 1, 5);
          ctx.fillStyle = 'rgba(130,60,255,' + (rp * 0.3).toFixed(3) + ')';
          ctx.fillRect(d.x - 2, d.y - 4, 12, 9);
          break;

        case 'blood_stain_detail':
          ctx.fillStyle = 'rgba(120,10,10,' + (0.15 + d.variation * 0.1).toFixed(3) + ')';
          ctx.fillRect(d.x, d.y, d.size + 3, d.size);
          ctx.fillRect(d.x + 1, d.y - 1, d.size, 1);
          break;

        case 'candle':
          var cp = Math.sin(frame * 0.1 + d.variation * 8) * 0.2 + 0.6;
          ctx.fillStyle = 'rgba(200,180,150,0.3)';
          ctx.fillRect(d.x, d.y, 2, 5);
          ctx.fillStyle = 'rgba(255,200,80,' + cp.toFixed(3) + ')';
          ctx.fillRect(d.x, d.y - 2, 2, 2);
          ctx.fillStyle = 'rgba(255,150,30,' + (cp * 0.4).toFixed(3) + ')';
          ctx.fillRect(d.x - 1, d.y - 4, 4, 3);
          break;

        case 'root_detail':
          ctx.fillStyle = 'rgba(25,45,15,0.35)';
          ctx.fillRect(d.x, d.y, d.size + 6, 2);
          ctx.fillRect(d.x + d.size + 2, d.y + 2, 1, 3);
          ctx.fillRect(d.x + d.size + 5, d.y + 1, 1, 4);
          break;

        case 'ember_detail':
          var ep = Math.sin(frame * 0.08 + d.variation * 12) * 0.3 + 0.5;
          ctx.fillStyle = 'rgba(255,120,30,' + ep.toFixed(3) + ')';
          ctx.fillRect(d.x, d.y, 2, 2);
          break;
      }
    }
  }

  function drawBloodStains(ctx) {
    for (var i = 0; i < bloodStains.length; i++) {
      var b = bloodStains[i];
      ctx.fillStyle = 'rgba(100,10,10,' + b.alpha.toFixed(3) + ')';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(80,5,5,' + (b.alpha * 0.6).toFixed(3) + ')';
      ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, Math.max(1, b.h - 2));
    }
  }

  function drawTorchGlows(ctx) {
    var torchCount = currentType === 'boss' ? 4 :
                     currentType === 'bonfire' ? 2 :
                     currentType === 'void' ? 3 : TORCH_POSITIONS.length;

    for (var i = 0; i < torchCount; i++) {
      var tp = TORCH_POSITIONS[i];
      var flicker = Math.sin(frame * 0.1 + i * 1.5) * 0.15 + 0.85;
      var radius = (50 + i * 5) * flicker;

      var r, g, b, a;
      switch (currentType) {
        case 'void':
          r = 80; g = 40; b = 200; a = 0.12 * flicker;
          break;
        case 'plague':
          r = 60; g = 180; b = 80; a = 0.1 * flicker;
          break;
        case 'boss':
          r = 200; g = 40; b = 40; a = 0.14 * flicker;
          break;
        case 'bonfire':
          r = 255; g = 180; b = 60; a = 0.2 * flicker;
          radius *= 1.3;
          break;
        default:
          r = 255; g = 160; b = 60; a = 0.12 * flicker;
      }

      var grad = ctx.createRadialGradient(tp.x, GROUND_Y + tp.yOff, 0, tp.x, GROUND_Y + tp.yOff, radius);
      grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')');
      grad.addColorStop(0.5, 'rgba(' + r + ',' + g + ',' + b + ',' + (a * 0.4).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
      ctx.fillStyle = grad;
      ctx.fillRect(tp.x - radius, GROUND_Y + tp.yOff - radius, radius * 2, radius * 2);

      // Torch base bright pixel
      if (currentType === 'void') {
        ctx.fillStyle = 'rgba(160,100,255,' + (0.5 * flicker).toFixed(3) + ')';
      } else {
        ctx.fillStyle = 'rgba(255,200,100,' + (0.6 * flicker).toFixed(3) + ')';
      }
      ctx.fillRect(tp.x - 1, GROUND_Y + tp.yOff - 8, 3, 3);
    }
  }

  function drawParticles(ctx) {
    var pr, pg, pb, baseAlpha;
    switch (currentType) {
      case 'horde':    pr = 140; pg = 120; pb = 90;  baseAlpha = 0.18; break;
      case 'brute':    pr = 200; pg = 180; pb = 140; baseAlpha = 0.15; break;
      case 'plague':   pr = 80;  pg = 200; pb = 80;  baseAlpha = 0.14; break;
      case 'feral':    pr = 100; pg = 160; pb = 80;  baseAlpha = 0.16; break;
      case 'void':     pr = 130; pg = 80;  pb = 220; baseAlpha = 0.15; break;
      case 'boss':     pr = 200; pg = 60;  pb = 60;  baseAlpha = 0.16; break;
      case 'bonfire':  pr = 255; pg = 180; pb = 80;  baseAlpha = 0.2;  break;
      default:         pr = 160; pg = 160; pb = 160; baseAlpha = 0.15; break;
    }

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.alpha <= 0) continue;
      var a = (p.alpha * baseAlpha).toFixed(3);
      ctx.fillStyle = 'rgba(' + pr + ',' + pg + ',' + pb + ',' + a + ')';
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
    }
  }

  function drawFloorEdgeHighlight(ctx) {
    // Subtle highlight line at the top of the floor
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, GROUND_Y, W, 1);

    // Bottom darkness fade
    var bottomGrad = ctx.createLinearGradient(0, H - 10, 0, H);
    bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
    bottomGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, H - 10, W, 10);
  }

  // Public API
  return {
    init: init,
    render: render,
    update: update
  };
})();