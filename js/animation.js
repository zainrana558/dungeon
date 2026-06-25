// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Animation & Rendering Engine
// Real pixel-art sprites, multi-frame animation, screen FX
// ============================================================

const AnimationSystem = (() => {
  // ============================================================
  // COLOR PALETTE
  // ============================================================
  const C = {
    // Knights
    STEEL:      '#6a6a7a',
    STEEL_LIT:  '#7a7a8a',
    STEEL_DARK: '#4a4a5a',
    STEEL_EDGE: '#8a8a9a',
    CRIMSON:    '#8b2020',
    CRIMSON_L:  '#aa3030',
    CRIMSON_D:  '#6a1010',
    GOLD:       '#ffd700',
    GOLD_DARK:  '#cc8800',
    GOLD_LIT:   '#ffed4a',
    LEATHER:    '#5a4030',
    LEATHER_L:  '#7a5a40',
    HELM_DARK:  '#3a3a3a',

    // Skin tones
    SKIN_PALE:  '#f8f0ff',
    SKIN_LIGHT: '#f0e6d3',
    SKIN_TAN:   '#d4a574',
    SKIN_DARK:  '#c4956b',
    SKIN_ETHR:  '#f8f0ff',

    // Assassin
    SHADOW:     '#1a1a2e',
    SHADOW_L:   '#2a2a40',
    SCARF_RED:  '#cc3333',
    SCARF_DK:   '#881111',
    DAGGER:     '#d0d0d0',
    DAGGER_L:   '#f0f0f0',

    // Mage
    INDIGO:     '#1a1040',
    INDIGO_L:   '#2a2060',
    INDIGO_D:   '#0a0820',
    CYAN:       '#00ffff',
    CYAN_B:     '#0088cc',
    CYAN_D:     '#006688',
    HAIR_W:     '#f0f0ff',
    HAIR_S:     '#d0d0ff',
    STAFF_W:    '#6a3a1a',
    STAFF_D:    '#4a2010',

    // Necromancer
    ROT_GREEN:  '#1a2a1a',
    ROT_DARK:   '#0a1a0a',
    ROT_EDGE:   '#2a4a2a',
    BONE:       '#8a9a7a',
    BONE_L:     '#aabaaa',
    BONE_D:     '#6a7a5a',
    WISP:       '#00ff66',
    WISP_DIM:   '#008833',
    MIASMA:     '#1a001a',
    CROWN_B:    '#b8b080',

    // Paladin
    HOLY_GOLD:  '#e8c840',
    HOLY_DK:    '#a08020',
    HOLY_LIT:   '#f0e060',
    HORSE_BR:   '#5a4530',
    HORSE_DK:   '#4a3520',
    HORSE_LT:   '#6a5540',
    MANE:       '#3a2510',
    PLATE_G:    '#c8a830',
    STEAM:      '#e8e8f0',

    // Warrior
    FUR:        '#5a4a3a',
    FUR_DARK:   '#3a2a1a',
    FUR_LIT:    '#7a6a5a',
    SKIN_RAGE:  '#c46040',
    SKIN_VEIN:  '#8a2020',
    AXE_IRON:   '#808080',
    AXE_EDGE:   '#b0b0b0',
    AXE_DARK:   '#505050',
    IRON:       '#606060',

    // Environment
    CAVE:       '#3a3028',
    CAVE_DARK:  '#2a2018',
    SAND:       '#c4a44a',
    SAND_DARK:  '#b4943a',
    VOID_PURP:  '#1a1040',
    VOLCANO:    '#1a1008',
    LAVA:       '#ff4400',
    LAVA_B:     '#ff6600',
    BOSS_DARK:  '#111118',
    BOSS_LIT:   '#222230',
    BONFIRE_W:  '#2a2010',
  };

  // ============================================================
  // PIXEL RENDERING ENGINE
  // ============================================================

  /** Draw a single pixel (aligned to integer grid) */
  function putPixel(ctx, x, y, color, alpha = 1) {
    if (alpha < 1) { ctx.globalAlpha = alpha; }
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    if (alpha < 1) { ctx.globalAlpha = 1; }
  }

  /** Draw a pixel rect snapped to grid */
  function pixelRect(ctx, x, y, w, h, color, alpha = 1) {
    if (alpha < 1) { ctx.globalAlpha = alpha; }
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    if (alpha < 1) { ctx.globalAlpha = 1; }
  }

  /** Draw from array of {x, y, c} pixel tuples */
  function drawPixelData(ctx, data, x, y, scale = 1, flipX = false) {
    const ox = Math.round(x);
    const oy = Math.round(y);
    for (const px of data) {
      const px_x = flipX ? -px.x : px.x;
      ctx.fillStyle = px.c;
      ctx.fillRect(
        Math.round(ox + px_x * scale),
        Math.round(oy + px.y * scale),
        Math.round(scale),
        Math.round(scale)
      );
    }
  }

  /** Normalize a sprite grid so all rows have the same width */
  function normalizeGrid(grid, targetWidth) {
    const w = targetWidth || Math.max(...grid.map(r => r.length));
    for (const row of grid) {
      while (row.length < w) row.push('_');
    }
    return grid;
  }

  /** Draw from 2D array of color strings (row-major) */
  function drawPixelGrid(ctx, grid, x, y, scale = 1, flipX = false) {
    const ox = Math.round(x);
    const oy = Math.round(y);
    const maxCols = Math.max(...grid.map(r => r.length));
    for (let row = 0; row < grid.length; row++) {
      const cols = grid[row];
      for (let col = 0; col < cols.length; col++) {
        const c = cols[col];
        if (!c || c === '·' || c === '.' || c === '_') continue;
        const px = flipX ? (maxCols - 1 - col) : col;
        ctx.fillStyle = c;
        ctx.fillRect(ox + px * scale, oy + row * scale, scale, scale);
      }
    }
  }

  // ============================================================
  // CHARACTER SPRITE DATA — pixel-art sprites as color grids
  // Each row is a string, each char is a color code:
  //   K=steel, k=dark steel, C=crimson, G=gold, S=skin, H=helm
  //   A=shadow, D=dagger, R=red scarf
  //   M=indigo, B=blue/cyan, W=white hair, T=tan staff
  //   N=rot green, b=bone, w=wisp green, c=crown
  //   P=plate gold, Hr=horse brown, Ma=mane, L=lance
  //   F=fur, V=vein red, I=iron/axe, s=rage skin
  //   '_' = transparent
  // ============================================================

  // KNIGHT 36x52 → pixel grid
  const SPRITE_KNIGHT_IDLE = buildKnightSprite();
  const SPRITE_KNIGHT_WALK = buildKnightWalkFrames();
  const SPRITE_KNIGHT_ATTACK = buildKnightAttackFrames();

  function buildKnightSprite() {
    // 36 wide x 52 tall pixel art knight
    const s = C;
    const R = [];
    // Row-by-row: top of helm down to boots
    // helm crown
    R.push('________________GG________________'); // 0
    R.push('_______________GGGGGG_______________'); // 1  helm top
    R.push('______________GGGGGGGG______________'); // 2
    R.push('_____________GGSHHHSGG_____________'); // 3
    R.push('____________SSSHHHHHSSS____________'); // 4  helm face
    R.push('____________SSHHHGGHHSS____________'); // 5  golden eyes area
    R.push('____________SHHGGGGGHHS____________'); // 6
    R.push('___________SHSHHEEHHSSS____________'); // 7  eye slits (E=dark)
    R.push('___________SHHHHGGHHHSS____________'); // 8
    R.push('__________SSSHHHHHHHSSS____________'); // 9
    R.push('__________SSSHHHHHHHHSS____________'); // 10 helm bottom
    R.push('_________KKKKSSSSSSKKKK____________'); // 11 neck/gorget
    // Pauldrons + shoulders
    R.push('________KKKKKKKKKKKKKKK____________'); // 12
    R.push('_______KKSSKSSSSSSKKSSK____________'); // 13 shoulders
    R.push('______KKSSKSSSSSSSSKSSKK___________'); // 14
    R.push('_____KKSSSKSSSSSSSSKSSSKK__________'); // 15
    // Chest plate
    R.push('_____KKKKKSSSSLSSSKSSKKK__________'); // 16  L=lit steel
    R.push('_____KKKKSSSSLLLSSSSSKKK__________'); // 17
    R.push('_____KKKKSSSSLLLSSSSSKKK____CC____'); // 18  cloak starts
    R.push('_____KKKKSSSSSSSSSSSKKKK___CCCC___'); // 19
    R.push('_____KKKKKKSSSSSSSKKKKKK__CCCCCC__'); // 20  belt area
    R.push('______KKKKKGGGGGGGKKKKK__CCCCCCC_'); // 21  G=gold belt
    R.push('______KKKKKKGGGGGKKKKKK_CCCCCCCC_'); // 22
    // Legs + tassets
    R.push('_______KKKSKSSSSSKKSKK_CCCCCCCCC_'); // 23
    R.push('_______KKKSKSSSSSKKSKK__CCCCCCCC_'); // 24
    R.push('________KKSKKKKKKKKSKK__CCCCCCCC_'); // 25
    R.push('________KKSSKKKKKKSSKK___CCCCCCC_'); // 26
    R.push('_________KKSKKSSSKKSSK____CCCCCC_'); // 27
    R.push('_________KKSSKSSSKSSKK____CCCCC__'); // 28
    R.push('__________KKSSSSSKKSSK_____CCC___'); // 29
    R.push('__________KKKKKKKKKKKK___________'); // 30
    // Greaves
    R.push('___________KKSSKKSSKK____________'); // 31
    R.push('___________KKKSSSSSKK____________'); // 32
    R.push('___________KKKSSSSSKK____________'); // 33
    R.push('___________KKKSSSSSKK____________'); // 34
    R.push('___________KKKKSSSKKK____________'); // 35
    R.push('____________KKKSSSKK_____________'); // 36
    R.push('____________KKKKKSSK_____________'); // 37
    // Sabatons (boots)
    R.push('____________KKKKSSKK_____________'); // 38
    R.push('____________HHHKSSKHH____________'); // 39 H=dark boots
    R.push('____________HHHSSSHHH____________'); // 40
    R.push('____________HHHSSSHHH____________'); // 41
    R.push('____________HHHSSSHHH____________'); // 42
    R.push('_____________HHSSSHH_____________'); // 43
    // Shadow
    R.push('_____________HHSSSHH_____________'); // 44
    R.push('______________HHHHH______________'); // 45
    // Sword on right side
    R.push('_______________________SSLL______'); // 46 sword blade
    R.push('_______________________SSLLL_____'); // 47
    R.push('_______________________SSLLL_____'); // 48
    R.push('______________________GSSLL______'); // 49 guard
    R.push('______________________TTGS_______'); // 50 handle T=leather
    R.push('______________________TTT________'); // 51 pommel
    return normalizeGrid(R.map(r => r.split('')));
  }

  function buildKnightWalkFrames() {
    // Generate 4 walk frames with different leg positions
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const base = buildKnightSprite();
      const legPhase = f * (Math.PI / 2);
      // Modify leg rows (31-43) based on frame
      const legShift = Math.round(Math.sin(legPhase) * 3);
      const legShift2 = Math.round(Math.sin(legPhase + Math.PI) * 3);
      // Stretch/squash legs
      for (let r = 30; r <= 43; r++) {
        // Shift some leg pixels left/right for stride
        if (r >= 31 && r <= 36) {
          // Front leg stance
          for (let c = 0; c < 18; c++) {
            if (base[r][c] === 'K' || base[r][c] === 'k' || base[r][c] === 'S') {
              base[r][c + Math.max(0, legShift)] = base[r][c];
              if (legShift > 0) base[r][c] = '_';
            }
          }
        } else if (r >= 36 && r <= 43) {
          // Back leg
          for (let c = 18; c < 36; c++) {
            if (base[r][c] === 'K' || base[r][c] === 'k' || base[r][c] === 'S' || base[r][c] === 'H') {
              base[r][c + Math.min(0, legShift2)] = base[r][c];
              if (legShift2 < 0) base[r][c] = '_';
            }
          }
        }
      }
      frames.push(base);
    }
    return frames.map(f => normalizeGrid(f));
  }

  function buildKnightAttackFrames() {
    // 3 phases: windup (0-1), swing (2-3), recovery (4)
    const frames = [];
    for (let f = 0; f < 5; f++) {
      const base = buildKnightSprite();
      if (f < 2) {
        // Windup: sword raised behind
        for (let r = 46; r < 52; r++) { for (let c = 30; c < 36; c++) base[r][c] = '_'; }
        // Sword behind head
        for (let r = 0; r < 5; r++) {
          for (let c = 30; c < 36; c++) {
            if (r >= 1 && r <= 3) base[r][30 + (3-r)] = 'S';
          }
        }
      } else if (f < 4) {
        // Swing: sword arcing forward
        for (let r = 46; r < 52; r++) { for (let c = 30; c < 36; c++) base[r][c] = '_'; }
        // Arc in front at different angles
        const arcX = 30 + (f - 2) * 6;
        base[15][arcX] = 'S'; base[15][arcX+1] = 'S';
        base[14][arcX+1] = 'S'; base[14][arcX+2] = 'S';
        base[13][arcX+2] = 'S';
        // Weapon trail
        base[15][arcX+2] = 'L'; base[15][arcX+3] = 'L';
      } else {
        // Recovery: sword returning to rest
        for (let r = 46; r < 52; r++) {
          base[r][30] = '_'; base[r][31] = '_';
        }
        base[48][29] = 'S'; base[48][30] = 'S';
      }
      frames.push(base);
    }
    return frames.map(f => normalizeGrid(f));
  }

  // ASSASSIN 28x46
  function buildAssassinIdleFrames() {
    const s = C;
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const bobOffset = Math.round(Math.sin(f * Math.PI / 2) * 2); // 2px oscillation
      const R = [];
      // Hood
      R.push('__________AA__________'); // 0 hood peak
      R.push('_________AAAA_________'); // 1
      R.push('________AAAAAA________'); // 2
      R.push('_______AAAAAAAA_______'); // 3
      R.push('_______AAARRRAA_______'); // 4 red scarf showing
      R.push('______AARRRRRRAA______'); // 5
      R.push('______ARSSSRRRAA______'); // 6 face S=skin
      R.push('______ASSRSSSRRA______'); // 7
      R.push('______ASSSESSSAA______'); // 8 E=eye dark
      R.push('______ASSSESSSAA______'); // 9
      R.push('______AASSSSSAAA______'); // 10
      R.push('_______AAASSSAA_______'); // 11 chin
      R.push('_______AAAAARRR_______'); // 12 scarf wraps
      R.push('______AAAARRRRRA______'); // 13
      R.push('_____AAAARRRRRRAA_____'); // 14
      R.push('_____AADDAARRRRDA_____'); // 15 D=daggers
      R.push('_____AADDDAAADDDA_____'); // 16 body
      R.push('_____AADDDAAADDDA_____'); // 17
      R.push('______AADDAAAADD______'); // 18
      R.push('______AAAADDDAAA______'); // 19
      R.push('_______AAADDAA_______'); // 20 belt
      R.push('_______AALLLAA_______'); // 21 L=lit
      R.push('________AAARRR_______'); // 22
      R.push('________AAAARR_______'); // 23 scarf trail
      R.push('________AAARRRR______'); // 24
      R.push('_________AAARRR______'); // 25
      R.push('_________AARRRR______'); // 26
      R.push('_________AAARRR______'); // 27
      R.push('_________AAARR_______'); // 28
      R.push('__________AARR_______'); // 29
      R.push('__________AAAR_______'); // 30
      R.push('__________AARR_______'); // 31
      R.push('___________AAR_______'); // 32
      R.push('___________ARR_______'); // 33
      R.push('___________AAR_______'); // 34
      R.push('____________AR_______'); // 35
      R.push('____________AA_______'); // 36
      // Legs
      R.push('____________AA_______'); // 37
      R.push('___________AAAA______'); // 38
      R.push('___________A__A______'); // 39
      R.push('___________A__A______'); // 40
      R.push('__________AA__AA_____'); // 41
      R.push('__________DA__DA_____'); // 42 boots
      R.push('__________DDDDDD_____'); // 43
      R.push('___________DDDD______'); // 44 shadow
      R.push('____________DD_______'); // 45

      // Apply bob
      const R_final = R.map((r, i) => {
        const row = r.split('');
        // Shift body rows up/down based on bob
        return row;
      });

      if (bobOffset > 0) {
        // Pad top
        R_final.unshift(['_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_']);
        R_final.pop();
      } else if (bobOffset < 0) {
        R_final.push(['_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_']);
        R_final.shift();
      }
      frames.push(R_final);
    }
    return frames.map(f => normalizeGrid(f));
  }

  // MAGE 28x44
  function buildMageIdleFrames() {
    const s = C;
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const floatOff = Math.round(Math.sin(f * Math.PI / 2) * 2);
      const R = [];
      // Floating hair + sparkles
      R.push('__________WW__________'); // 0
      R.push('_________WW__W________'); // 1 sparkle
      R.push('________WWWW_W________'); // 2
      R.push('_______WWWWWWW________'); // 3
      R.push('________WW_WWW________'); // 4
      R.push('________WSSSW_________'); // 5 face
      R.push('________SSBSS_________'); // 6 B=cyan eyes
      R.push('________SSSSS_________'); // 7
      R.push('________SSSSS_________'); // 8
      R.push('_______MMSSSMM________'); // 9 collar
      R.push('_______MMMMMMM________'); // 10 robe
      R.push('______MMMMGMMMM_______'); // 11 G=gold detail
      R.push('______MMMGMMMMM_______'); // 12
      R.push('______MMMMGMMMM_______'); // 13
      R.push('_____MMMMMMMMMM_______'); // 14
      R.push('_____MMMGMMGMMM_______'); // 15 gold stars
      R.push('_____MMMMGMMMMM_______'); // 16
      R.push('_____MMMMGMMMMM_______'); // 17
      R.push('______MMMMGMMMM_______'); // 18
      R.push('______MMMMMMMMM__T____'); // 19 T=staff
      R.push('_______MMMMMMMM_TT____'); // 20
      R.push('_______MMMMMM__TT_____'); // 21
      R.push('________MMMMM__TT_____'); // 22
      R.push('________MMMM___TT_____'); // 23
      R.push('________MMMM___TT_____'); // 24
      R.push('_________MM____TT_____'); // 25
      R.push('_________MM____TT_____'); // 26
      R.push('_________MM____TT_____'); // 27
      R.push('_________MM____TT_____'); // 28
      R.push('__________M___BBB_____'); // 29 B=blue orb
      R.push('______________BBBB____'); // 30
      R.push('______________BWWB____'); // 31
      R.push('______________BBBB____'); // 32
      R.push('_______________BB_____'); // 33
      // Afterglow
      R.push('_______________BB_____'); // 34
      R.push('_____________BBBB_____'); // 35
      R.push('_____________BBBB_____'); // 36
      R.push('______________BB______'); // 37
      // Feet barely touch ground
      R.push('_____________M__M_____'); // 38
      R.push('_____________MMMM_____'); // 39
      R.push('_____________MMMM_____'); // 40
      R.push('______________MM______'); // 41 shadow
      R.push('______________MM______'); // 42
      R.push('_______________M______'); // 43

      const R_final = R.map(r => r.split(''));
      if (floatOff > 0) {
        // Float up: remove bottom rows, add space at top
        R_final.pop(); R_final.pop();
        R_final.unshift(Array(28).fill('_')); R_final.unshift(Array(28).fill('_'));
      } else {
        R_final.unshift(Array(28).fill('_')); R_final.unshift(Array(28).fill('_'));
        R_final.pop(); R_final.pop();
      }
      frames.push(R_final);
    }
    return frames.map(f => normalizeGrid(f));
  }

  // NECROMANCER 30x48
  function buildNecromancerIdleFrames() {
    const s = C;
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const sway = Math.round(Math.sin(f * Math.PI / 2) * 2);
      const R = [];
      // Bone crown
      R.push('__________cccc__________'); // 0 c=bone crown
      R.push('_________cbbbbc_________'); // 1 b=bone
      R.push('________cbbbbbbc________'); // 2
      R.push('________cbcbcbcbc_______'); // 3 crown points
      R.push('________bbbbbbbbb_______'); // 4
      R.push('________bbbeeeebbb______'); // 5 e=empty eye
      R.push('________bbeeeeeeb_______'); // 6 skull
      R.push('________bbbeeeeebb______'); // 7
      R.push('________bbbbeebbb_______'); // 8 jaw
      R.push('_________bbbbbbb________'); // 9
      R.push('_______NNNNbbNNNN_______'); // 10 N=rot robe
      R.push('______NNNNNNNNNNN_______'); // 11
      R.push('______NNNbbbbNNNN_______'); // 12 ribcage showing
      R.push('_____NNNNbbbbNNNN_______'); // 13
      R.push('_____NNNbbbbbbNNN_______'); // 14
      R.push('_____NNNbbbbbbNNN_______'); // 15
      R.push('_____NNNNbbbbNNNN_______'); // 16
      R.push('______NNNNNNNNNN________'); // 17
      R.push('______NNNttNNNttN_______'); // 18 t=tear
      R.push('_______NNNttNNNN________'); // 19
      R.push('_______NNNttNNNN________'); // 20
      R.push('_______NNN__NNNN________'); // 21
      R.push('________NN__NNN_________'); // 22
      R.push('________NN__NNN_________'); // 23
      R.push('________NN__NNN_________'); // 24
      R.push('_________N__NN__________'); // 25
      R.push('_________NNNNN__________'); // 26
      R.push('_________N__NN__________'); // 27 leg bones
      R.push('_________N__NN__________'); // 28
      R.push('_________N__NN__________'); // 29
      R.push('_________N__NN__________'); // 30
      R.push('_________N__NN__________'); // 31
      R.push('_________b___bb_________'); // 32 bone feet
      R.push('_________b___bb_________'); // 33
      R.push('_________bbbbbb_________'); // 34
      // Wisps
      R.push('__w______bbbbbb____w___'); // 35 w=wisp
      R.push('_www_____bbbbbb___www__'); // 36
      R.push('__w______bbbbbb____w___'); // 37
      // Shadow
      R.push('_________bbbbbb_________'); // 38
      R.push('__________bbbb__________'); // 39
      R.push('__________bbbb__________'); // 40
      // Wisp glow
      R.push('____w____bbbb______w____'); // 41
      R.push('___w_____bbbb_____w_____'); // 42
      R.push('____w______________w____'); // 43
      R.push('_____w____________w_____'); // 44
      R.push('______w__________w______'); // 45
      R.push('_______ww______ww_______'); // 46
      R.push('________wwwwwwww________'); // 47

      const R_final = R.map(r => r.split(''));
      // Apply sway by shifting rows slightly
      for (let i = 0; i < R_final.length; i++) {
        if (sway > 0 && i > 8) {
          R_final[i].unshift('_');
          R_final[i].pop();
        } else if (sway < 0 && i > 8) {
          R_final[i].push('_');
          R_final[i].shift();
        }
      }
      frames.push(R_final);
    }
    return frames.map(f => normalizeGrid(f));
  }

  // PALADIN 44x52 (mounted)
  function buildPaladinIdleFrames() {
    const s = C;
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const bob = Math.round(Math.sin(f * Math.PI / 2));
      const R = [];
      // Rider head + helm
      R.push('________________PP________________'); // 0 P=plate gold
      R.push('_______________PPPP_______________'); // 1 helm top
      R.push('______________PPPPPP______________'); // 2
      R.push('_____________PPPSSPPP_____________'); // 3 S=skin
      R.push('_____________PPSSSSPP_____________'); // 4
      R.push('_____________PPSSSSPP_____________'); // 5
      R.push('_____________PPSSSSPP_____________'); // 6
      R.push('______________PPSSPP______________'); // 7 neck
      // Rider body (plate armor)
      R.push('_____________PPPPPPPP_____________'); // 8
      R.push('____________PPPPPPPPPP____________'); // 9
      R.push('___________PPPPPPPPPPPP___________'); // 10 breastplate
      R.push('__________PPPGGGGGGGPPP___________'); // 11 G=gold trim
      R.push('__________PPPGGGGGGGPPP___________'); // 12
      R.push('__________PPPPPGGGPPPPP___________'); // 13
      // Lance arm
      R.push('_________PPPPPPPPPPPPPP__________'); // 14
      R.push('_________PPPPPPPPPPPPPP__LL______'); // 15 L=lance
      R.push('_________PPPPLLLLLPPPPP_LLLL_____'); // 16
      R.push('_________PPPPLLLLLLLPPPLLLLLL____'); // 17
      R.push('__________PPPLLLLLLLL_LLLLLLLL___'); // 18
      // Horse head
      R.push('__________HrHrHr________LLLLLLL__'); // 19 Hr=horse
      R.push('_________HrHrHrHrHr______LLLLLL__'); // 20
      R.push('___HrHr_HrHrMaMaHrHr______LL_____'); // 21 Ma=mane
      R.push('__HrHrHrHrHrMaMaHrHr_____________'); // 22
      R.push('_HrHrHrHrHrHrHrHrHr______________'); // 23
      // Horse neck + chest
      R.push('HrHrHrHrHrHrHrHrHrHr______________'); // 24
      R.push('HrHrHrHrHrHrHrHrHrHr______________'); // 25
      // Horse body
      R.push('HrHrHrHrHrHrHrHrHrHrHrHr___________'); // 26
      R.push('_HrHrHrHrHrPPP_HrHrHrHrHr__________'); // 27 rider lap
      R.push('_HrHrHrHrPPPPPP_HrHrHrHrHr_________'); // 28
      R.push('_HrHrHrHrPPPPPP_HrHrHrHrHr_________'); // 29
      R.push('_HrHrHrHrHrHrHrHrHrHrHrHrHr________'); // 30
      R.push('__HrHrHrHrHrHrHrHrHrHrHrHr_________'); // 31
      R.push('__HrHrHrHrHrHrHrHrHrHrHrHr_________'); // 32
      R.push('__HrHrHrHrHrHrHrHrHrHrHrHr_________'); // 33
      // Horse legs (4-beat trot)
      R.push('___Hr__HrHr__HrHr__Hr___Hr________'); // 34
      R.push('___Hr__HrHr__HrHr__Hr___Hr________'); // 35
      R.push('___Hr__HrHr__HrHr__Hr___Hr________'); // 36
      R.push('___Hr__HrHr__HrHr__Hr___Hr________'); // 37
      R.push('___Hr__HrHr__HrHr__Hr___Hr________'); // 38
      R.push('___Hr__HrHr__HrHr__Hr___Hr________'); // 39
      R.push('___Hr__HrHr__HrHr__Hr___Hr________'); // 40
      R.push('___Hr__HrHr__HrHr__Hr___Hr________'); // 41
      R.push('___Hr__HrHr__HrHr__Hr___Hr________'); // 42
      R.push('___Hh__HhHh__HhHh__Hh___Hh________'); // 43 hooves Hh
      R.push('___Hh__HhHh__HhHh__Hh___Hh________'); // 44
      R.push('___Hh__HhHh__HhHh__Hh___Hh________'); // 45
      R.push('____HhHhHhHhHhHhHhHhHhHhHh_______'); // 46 shadow
      R.push('_____HhHhHhHhHhHhHhHhHhHh________'); // 47
      R.push('______HhHhHhHhHhHhHhHh___________'); // 48
      R.push('_______dddddddddddd_____________'); // 49 steam d
      R.push('________dddddddddd______________'); // 50 steam
      R.push('_________dddddd_________________'); // 51

      const R_final = R.map(r => r.split(''));
      // Apply trot bob
      if (bob > 0) {
        R_final.unshift(Array(44).fill('_'));
        R_final.pop();
      } else if (bob < 0) {
        R_final.push(Array(44).fill('_'));
        R_final.shift();
      }
      frames.push(R_final);
    }
    return frames.map(f => normalizeGrid(f));
  }

  // WARRIOR 42x56
  function buildWarriorIdleFrames() {
    const s = C;
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const lean = f * 0.5; // 30° forward lean over cycle
      const R = [];
      // Massive frame
      R.push('_________________FF_________________'); // 0 F=fur
      R.push('________________FFFF_______________'); // 1
      R.push('_______________FFFFFF______________'); // 2 fur headwrap
      R.push('______________FFssssFF_____________'); // 3 s=skin
      R.push('_____________FFssssssFF____________'); // 4 face
      R.push('_____________FsssEEsssF____________'); // 5 E=rage eyes
      R.push('_____________FssVEEVssF____________'); // 6 V=vein
      R.push('_____________FFssssssFF____________'); // 7
      R.push('______________FFssssFF_____________'); // 8
      R.push('_____________FFFFFFF___FF__________'); // 9
      R.push('____________FFFFFFFF__FFFF_________'); // 10
      R.push('___________FFFFFsssFFFFF___________'); // 11 neck
      R.push('__________FFFFFsssssFFFF___________'); // 12
      R.push('_________FFFFFFsssssFFFFF__________'); // 13 shoulders
      R.push('________FFFFFFFFsVVsFFFFF__________'); // 14 V=veins on shoulders
      R.push('_______FFFFFssssVVsssFFFFF_________'); // 15
      R.push('_______FFFFsssssssssVSFFFF_________'); // 16 chest
      R.push('______FFFFFsssssssssssFFFF_________'); // 17
      R.push('______FFFFFsssssssssssFFFF_________'); // 18
      R.push('______FFFFFVVsssssssFFFFF__________'); // 19 veins
      R.push('_______FFFFFsssVVsssFFFF___________'); // 20 abs
      R.push('_______FFFFFFFFsVssFFFFFFFF________'); // 21
      R.push('________FFFFFFFFFFFFFFFFFF_________'); // 22
      R.push('________FFFFFFFFFFFGGFFFF__________'); // 23 G=belt
      R.push('_________FFFFFGGGGGGFFFF___________'); // 24
      R.push('_________FFFFFFFFFFFIIIF____II_____'); // 25 I=axe handle
      R.push('_________FFFFFFFFIIIFFII___III_____'); // 26
      R.push('__________FFFFFFFFIFFIII_IIII______'); // 27
      R.push('__________FFFFFFFFFIIII_IIII_______'); // 28
      R.push('__________F__FF__FFFFII_IIII_______'); // 29 legs
      R.push('__________F__FF__FFFF_II_III_______'); // 30
      R.push('__________F__FF__FFFF___III________'); // 31
      R.push('__________F__FF__FFFF___III________'); // 32
      R.push('__________F__FF__FFFF____II________'); // 33
      R.push('__________F__FF__FFFF____II________'); // 34
      R.push('__________F__FF__FFFF_____I________'); // 35
      R.push('__________F__FF__FFFF_____I________'); // 36
      R.push('__________F__FF__FFFF_____I________'); // 37
      R.push('__________F__FF__FFFF____I_________'); // 38
      R.push('__________F__FF__FFFF____I_________'); // 39
      R.push('___________F_FF__FF_____I__________'); // 40
      R.push('___________F_FF__FF_____I__________'); // 41
      R.push('___________F_FF__FF_____I__________'); // 42
      // Axe blade
      R.push('__________IIIIIIFF__FF__II_________'); // 43
      R.push('_________IIIIIIIII_FF__II__________'); // 44
      R.push('_________IIeIIeIII__F__II__________'); // 45 e=axe edge lit
      R.push('_________IIeIIeIII_____II__________'); // 46
      R.push('_________IIIIIIIII_____II__________'); // 47
      R.push('__________IIIIIIII_____II__________'); // 48
      R.push('__________IIIIIIII______I__________'); // 49
      R.push('___________IIIIIII______I__________'); // 50
      R.push('____________IIII_______________'); // 51 shadow
      R.push('____________IIII_______________'); // 52
      R.push('_____________II_________________'); // 53
      R.push('_____________II_________________'); // 54
      R.push('______________I_________________'); // 55

      const R_final = R.map(r => {
        let row = r.split('');
        // Apply forward lean: shift upper rows right
        if (lean > 0) {
          const shiftRows = Math.floor(20 * lean / 2);
          for (let i = 0; i < row.length; i++) {
            if (i < shiftRows) {
              row.unshift('_');
              row.pop();
            }
          }
        }
        return row;
      });
      frames.push(R_final);
    }
    return frames.map(f => normalizeGrid(f));
  }

  // ============================================================
  // SPRITE CACHE + FRAME MANAGEMENT
  // ============================================================
  const spriteCache = {};

  function getSprite(spriteKey) {
    if (!spriteCache[spriteKey]) {
      switch (spriteKey) {
        case 'knight_idle': spriteCache[spriteKey] = [SPRITE_KNIGHT_IDLE]; break;
        case 'knight_walk': spriteCache[spriteKey] = SPRITE_KNIGHT_WALK; break;
        case 'knight_attack': spriteCache[spriteKey] = SPRITE_KNIGHT_ATTACK; break;
        case 'assassin_idle': spriteCache[spriteKey] = buildAssassinIdleFrames(); break;
        case 'mage_idle': spriteCache[spriteKey] = buildMageIdleFrames(); break;
        case 'necromancer_idle': spriteCache[spriteKey] = buildNecromancerIdleFrames(); break;
        case 'paladin_idle': spriteCache[spriteKey] = buildPaladinIdleFrames(); break;
        case 'warrior_idle': spriteCache[spriteKey] = buildWarriorIdleFrames(); break;
        default: spriteCache[spriteKey] = [SPRITE_KNIGHT_IDLE];
      }
    }
    return spriteCache[spriteKey];
  }

  /** Get current frame index for multi-frame animation */
  function getAnimFrame(spriteKey, frameCount, speed = 1) {
    const frames = getSprite(spriteKey);
    if (frames.length <= 1) return 0;
    return Math.floor(frameCount / Math.max(1, Math.round(12 / speed))) % frames.length;
  }

  /** Draw a sprite from the grid system */
  function drawSprite(ctx, spriteKey, x, y, scale = 1, frameIdx = 0, flipX = false) {
    const frames = getSprite(spriteKey);
    const frame = frames[Math.min(frameIdx, frames.length - 1)];
    drawPixelGrid(ctx, frame, x, y, scale, flipX);
  }

  // ============================================================
  // CHARACTER DRAWING FUNCTIONS
  // (preserving existing API signatures + enhanced pixel art)
  // ============================================================

  function drawBlockCharacter(ctx, x, y, w, h, color, detailColor, facingRight = true) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Shadow
    pixelRect(ctx, fx - 2, fy + h - 2, w + 4, 4, 'rgba(0,0,0,0.3)');

    // Body - pixel art style with shading
    for (let py = 0; py < h; py++) {
      const shade = py < 3 ? C.STEEL_LIT : py < h * 0.3 ? color : py < h * 0.7 ? color : C.STEEL_DARK;
      ctx.fillStyle = shade;
      ctx.fillRect(fx + 1, fy + py, w - 2, 1);
    }

    // Armor edge highlights
    pixelRect(ctx, fx, fy, w, 1, C.STEEL_EDGE);
    pixelRect(ctx, fx, fy, 1, h, C.STEEL_EDGE);
    pixelRect(ctx, fx + w - 1, fy, 1, h, C.STEEL_DARK);

    // Shoulder line
    pixelRect(ctx, fx + 2, fy + 3, w - 4, 2, detailColor);
    pixelRect(ctx, fx + 2, fy + 4, w - 4, 1, C.GOLD);

    // Belt
    pixelRect(ctx, fx + 2, fy + h - 8, w - 4, 3, detailColor);
    pixelRect(ctx, fx + w/2 - 3, fy + h - 9, 6, 5, C.GOLD_DARK);
    pixelRect(ctx, fx + w/2 - 2, fy + h - 8, 4, 3, C.GOLD);

    // Head
    const headW = 10, headH = 10;
    const hx = fx + w/2 - headW/2;
    const hy = fy - headH;
    pixelRect(ctx, hx, hy, headW, headH, C.SKIN_TAN);
    pixelRect(ctx, hx + 1, hy, headW - 2, 1, C.SKIN_LIGHT); // highlight
    // Eyes
    const eyeY = hy + 3;
    if (facingRight) {
      pixelRect(ctx, hx + 6, eyeY, 2, 1, C.HELM_DARK);
      pixelRect(ctx, hx + 8, eyeY, 1, 1, C.STEEL_DARK);
    } else {
      pixelRect(ctx, hx + 2, eyeY, 2, 1, C.HELM_DARK);
      pixelRect(ctx, hx + 1, eyeY, 1, 1, C.STEEL_DARK);
    }
  }

  function drawLeanCharacter(ctx, x, y, w, h, color, accentColor, facingRight = true) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Lean shadow
    pixelRect(ctx, fx, fy + h - 1, w, 3, 'rgba(0,0,0,0.2)');

    // Body
    for (let py = 0; py < h; py++) {
      ctx.fillStyle = py < 2 ? C.SHADOW_L : color;
      ctx.fillRect(fx + 3, fy + py, w - 6, 1);
    }
    pixelRect(ctx, fx + 2, fy, 1, h, C.SHADOW_L); // edge highlight
    pixelRect(ctx, fx + w - 3, fy, 1, h, C.SHADOW);

    // Accent stripes
    pixelRect(ctx, fx + 4, fy + h * 0.25, w - 8, 2, accentColor);
    pixelRect(ctx, fx + 4, fy + h * 0.5, w - 8, 1, accentColor);
    pixelRect(ctx, fx + 4, fy + h * 0.7, w - 8, 1, accentColor);

    // Head
    const headW = 8, headH = 8;
    const hx = fx + w/2 - headW/2;
    const hy = fy - headH;
    pixelRect(ctx, hx, hy, headW, headH, C.SKIN_PALE);
    pixelRect(ctx, hx, hy + 3, 2, 1, C.HELM_DARK);  // eyes
    pixelRect(ctx, hx + headW - 2, hy + 3, 2, 1, C.HELM_DARK);

    // Scarf
    const scarfX = fx + (facingRight ? w - 2 : -4);
    pixelRect(ctx, scarfX, fy + 3, 6, 3, accentColor);
    pixelRect(ctx, scarfX + 1, fy + 1, 4, 5, C.SCARF_DK);
  }

  function drawFloatCharacter(ctx, x, y, w, h, color, glowColor, floatOffset = 0) {
    const fx = Math.round(x);
    const fy = Math.round(y) + Math.sin(floatOffset * 0.1) * 2;

    // Afterglow beneath
    ctx.globalAlpha = 0.12 + Math.sin(floatOffset * 0.05) * 0.04;
    pixelRect(ctx, fx - 6, fy + h - 2, w + 12, 4, glowColor);
    ctx.globalAlpha = 0.06;
    pixelRect(ctx, fx - 8, fy + h, w + 16, 3, glowColor);
    ctx.globalAlpha = 1;

    // Body with gradient shading
    for (let py = 0; py < h; py++) {
      const shade = py < 3 ? C.INDIGO_L : py < h * 0.5 ? color : C.INDIGO_D;
      ctx.fillStyle = shade;
      ctx.fillRect(fx + 1, fy + py, w - 2, 1);
    }

    // Glowing edge accents
    pixelRect(ctx, fx, fy + h * 0.3, 2, 3, glowColor);
    pixelRect(ctx, fx + w - 2, fy + h * 0.5, 2, 3, glowColor);

    // Head
    const headW = 10, headH = 8;
    const hx = fx + w/2 - headW/2;
    const hy = fy - headH;
    pixelRect(ctx, hx, hy, headW, headH, C.SKIN_ETHR);
    // Bright eyes
    pixelRect(ctx, hx + 2, hy + 3, 2, 1, C.CYAN);
    pixelRect(ctx, hx + headW - 4, hy + 3, 2, 1, C.CYAN);

    // Sparkles
    ctx.globalAlpha = 0.4 + Math.sin(floatOffset * 0.2) * 0.3;
    pixelRect(ctx, fx - 3, fy + 2, 2, 2, glowColor);
    pixelRect(ctx, fx + w + 2, fy + h * 0.4, 2, 2, glowColor);
    pixelRect(ctx, fx + 4, fy - 4, 1, 1, C.CYAN);
    ctx.globalAlpha = 1;
  }

  function drawMountedCharacter(ctx, x, y, w, h, riderColor, mountColor, facingRight = true) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Horse body shadow
    pixelRect(ctx, fx, fy + h, w, 5, 'rgba(0,0,0,0.3)');

    // Horse body
    const horseH = h * 0.55;
    const bodyY = fy + h * 0.35;
    for (let py = 0; py < horseH; py++) {
      ctx.fillStyle = py < 2 ? C.HORSE_LT : mountColor;
      ctx.fillRect(fx + 2, bodyY + py, w - 4, 1);
    }

    // Horse legs (with animation phase from GAME.frameCount if available)
    const legPhase = typeof GAME !== 'undefined' ? Math.sin(GAME.frameCount * 0.1) * 3 : 0;
    pixelRect(ctx, fx + 4, fy + h - 4, 5, 10 + legPhase, mountColor);
    pixelRect(ctx, fx + w - 10, fy + h - 4, 5, 10 - legPhase, mountColor);
    // Hooves
    pixelRect(ctx, fx + 4, fy + h + 6 + legPhase, 5, 3, C.HELM_DARK);
    pixelRect(ctx, fx + w - 10, fy + h + 6 - legPhase, 5, 3, C.HELM_DARK);

    // Mane
    pixelRect(ctx, fx + (facingRight ? w - 2 : -8), fy + h * 0.3, 8, 10, C.MANE);

    // Horse head
    const headX = fx + (facingRight ? w : -12);
    pixelRect(ctx, headX, fy + h * 0.2, 12, 10, mountColor);
    // Eye
    pixelRect(ctx, headX + (facingRight ? 8 : 2), fy + h * 0.2 + 3, 2, 1, C.HORSE_DK);

    // Rider body
    const riderW = w * 0.6;
    const riderX = fx + (w - riderW) / 2;
    for (let py = 0; py < h * 0.45; py++) {
      ctx.fillStyle = py < 2 ? C.HOLY_LIT : riderColor;
      ctx.fillRect(riderX + 1, fy + py, riderW - 2, 1);
    }

    // Rider head
    const rHeadW = 8, rHeadH = 8;
    const rhx = riderX + riderW/2 - rHeadW/2;
    const rhy = fy - rHeadH;
    pixelRect(ctx, rhx, rhy, rHeadW, rHeadH, C.SKIN_TAN);
    pixelRect(ctx, rhx + 3, rhy + 3, 2, 1, C.HOLY_DK); // eyes

    // Lance
    if (facingRight) {
      pixelRect(ctx, fx + w, fy + h * 0.1, 20, 3, C.STEEL);
      pixelRect(ctx, fx + w + 20, fy + h * 0.1 - 1, 4, 5, C.CRIMSON);
    } else {
      pixelRect(ctx, fx - 20, fy + h * 0.1, 20, 3, C.STEEL);
      pixelRect(ctx, fx - 24, fy + h * 0.1 - 1, 4, 5, C.CRIMSON);
    }
  }

  function drawMassiveCharacter(ctx, x, y, w, h, color, detailColor, facingRight = true) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Heavy shadow
    pixelRect(ctx, fx - 4, fy + h, w + 8, 6, 'rgba(0,0,0,0.4)');

    // Body with musculature
    for (let py = 0; py < h; py++) {
      const shade = py < 4 ? C.FUR_LIT : py < h * 0.4 ? color : detailColor;
      ctx.fillStyle = shade;
      ctx.fillRect(fx + 2, fy + py, w - 4, 1);
    }

    // Shoulder bulk
    pixelRect(ctx, fx - 2, fy, w + 4, 4, C.FUR_LIT);
    pixelRect(ctx, fx - 1, fy, 1, h * 0.5, C.FUR_LIT);

    // Musculature lines
    pixelRect(ctx, fx + w * 0.25, fy + h * 0.15, w * 0.5, 1, C.SKIN_DARK);
    pixelRect(ctx, fx + w * 0.2, fy + h * 0.3, w * 0.6, 3, C.SKIN_DARK);
    pixelRect(ctx, fx + w * 0.2, fy + h * 0.5, w * 0.6, 2, C.SKIN_VEIN);

    // Belt
    pixelRect(ctx, fx + 4, fy + h * 0.55, w - 8, 4, C.LEATHER_DARK);
    pixelRect(ctx, fx + w/2 - 4, fy + h * 0.55, 8, 5, C.GOLD_DARK);

    // Head
    const headW = 12, headH = 11;
    const hx = fx + w/2 - headW/2;
    const hy = fy - headH;
    pixelRect(ctx, hx, hy, headW, headH, C.SKIN_RAGE);
    // Beard
    pixelRect(ctx, hx + 3, fy + 1, 6, 5, detailColor);
    // Eyes (rage)
    pixelRect(ctx, hx + 2, hy + 3, 3, 2, C.CRIMSON);
    pixelRect(ctx, hx + headW - 5, hy + 3, 3, 2, C.CRIMSON);
    pixelRect(ctx, hx + 3, hy + 3, 2, 1, C.SKIN_VEIN);

    // Veins on body
    pixelRect(ctx, fx + w * 0.3, fy + h * 0.25, 1, 5, C.SKIN_VEIN);
    pixelRect(ctx, fx + w * 0.6, fy + h * 0.3, 1, 4, C.SKIN_VEIN);
  }

  function drawSkeletalCharacter(ctx, x, y, w, h, boneColor, robeColor, floatOffset = 0) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Robe
    for (let py = 0; py < h * 0.8; py++) {
      ctx.fillStyle = py < 3 ? C.ROT_EDGE : robeColor;
      ctx.fillRect(fx + 1, fy + h * 0.15 + py, w - 2, 1);
    }

    // Tattered edge
    pixelRect(ctx, fx, fy + h * 0.9, 3, 3, robeColor);
    pixelRect(ctx, fx + w/2 - 2, fy + h * 0.9, 4, 4, robeColor);
    pixelRect(ctx, fx + w - 3, fy + h * 0.9, 3, 3, robeColor);
    pixelRect(ctx, fx, fy + h - 1, 4, 3, C.ROT_DARK);
    pixelRect(ctx, fx + w - 4, fy + h - 1, 4, 3, C.ROT_DARK);

    // Belt
    pixelRect(ctx, fx + 3, fy + h * 0.5, w - 6, 2, C.ROT_DARK);

    // Ribcage visible
    pixelRect(ctx, fx + w * 0.25, fy + h * 0.15, w * 0.5, h * 0.35, boneColor);
    pixelRect(ctx, fx + w * 0.28, fy + h * 0.18, 2, h * 0.28, C.BONE_D);
    pixelRect(ctx, fx + w * 0.38, fy + h * 0.18, 2, h * 0.28, C.BONE_D);
    pixelRect(ctx, fx + w * 0.48, fy + h * 0.18, 2, h * 0.28, C.BONE_D);
    pixelRect(ctx, fx + w * 0.58, fy + h * 0.18, 2, h * 0.28, C.BONE_D);

    // Skull
    const skullW = 10, skullH = 9;
    const sx = fx + w/2 - skullW/2;
    const sy = fy - skullH;
    pixelRect(ctx, sx, sy, skullW, skullH, boneColor);
    pixelRect(ctx, sx + 1, sy, skullW - 2, 1, C.BONE_L); // highlight

    // Eye sockets (glowing)
    pixelRect(ctx, sx + 2, sy + 3, 3, 3, '#1a0000');
    pixelRect(ctx, sx + skullW - 5, sy + 3, 3, 3, '#1a0000');
    pixelRect(ctx, sx + 3, sy + 4, 1, 2, C.WISP); // glowing pupils
    pixelRect(ctx, sx + skullW - 4, sy + 4, 1, 2, C.WISP);

    // Crown
    pixelRect(ctx, sx, sy - 3, skullW, 3, C.CROWN_B);
    pixelRect(ctx, sx + 1, sy - 4, 2, 4, C.CROWN_B);
    pixelRect(ctx, sx + 3, sy - 5, 2, 5, C.CROWN_B);
    pixelRect(ctx, sx + 6, sy - 4, 2, 4, C.CROWN_B);
    pixelRect(ctx, sx + 8, sy - 3, 1, 3, C.CROWN_B);

    // Wisps
    const wispAlpha = 0.1 + Math.sin((floatOffset || 0) * 0.1) * 0.05;
    ctx.globalAlpha = wispAlpha + 0.05;
    pixelRect(ctx, fx - 6, fy + h * 0.2, 3, 5, C.WISP);
    pixelRect(ctx, fx + w + 3, fy + h * 0.4, 2, 4, C.WISP);
    ctx.globalAlpha = wispAlpha;
    pixelRect(ctx, fx + 6, fy + h * 0.6, 2, 3, C.WISP_DIM);
    ctx.globalAlpha = 1;
  }

  // ============================================================
  // WEAPON RENDERING
  // ============================================================
  function drawWeapon(ctx, x, y, type, facingRight = true) {
    const fx = Math.round(x);
    const fy = Math.round(y);

    switch (type) {
      case 'sword':
        // Blade
        ctx.fillStyle = C.STEEL_EDGE;
        ctx.fillRect(fx + (facingRight ? 0 : -16), fy, 16, 2);
        ctx.fillRect(fx + (facingRight ? 0 : -16), fy + 1, 16, 1);
        // Blade edge highlight
        ctx.fillStyle = C.DAGGER_L;
        ctx.fillRect(fx + (facingRight ? 0 : -16), fy, 16, 1);
        // Crossguard
        ctx.fillStyle = C.GOLD;
        ctx.fillRect(fx + (facingRight ? -2 : 14), fy - 1, 4, 5);
        ctx.fillStyle = C.GOLD_LIT;
        ctx.fillRect(fx + (facingRight ? -1 : 15), fy - 1, 2, 3);
        // Grip
        ctx.fillStyle = C.LEATHER;
        ctx.fillRect(fx + (facingRight ? -4 : 12), fy - 2, 4, 8);
        // Pommel
        ctx.fillStyle = C.GOLD_DARK;
        ctx.fillRect(fx + (facingRight ? -5 : 11), fy + 6, 6, 3);
        break;

      case 'dagger':
        // Lean blade
        ctx.fillStyle = C.DAGGER;
        const tipX = facingRight ? fx + 16 : fx - 16;
        for (let i = 0; i < 3; i++) {
          const px = facingRight ? fx + 4 + i * 4 : fx - 4 - i * 4;
          ctx.fillRect(px, fy + i, 4, 2 - (i > 1 ? 1 : 0), C.DAGGER);
        }
        ctx.fillRect(fx + (facingRight ? 0 : -10), fy, 10, 3, C.DAGGER);
        // Edge highlight
        ctx.fillRect(fx + (facingRight ? 0 : -10), fy, 10, 1, C.DAGGER_L);
        // Hilt
        ctx.fillStyle = C.LEATHER_DARK;
        ctx.fillRect(fx + (facingRight ? -2 : 8), fy - 1, 3, 5);
        // Dagger flip glow
        ctx.fillStyle = C.CRIMSON_L;
        ctx.fillRect(fx + (facingRight ? -1 : 9), fy, 1, 3);
        break;

      case 'axe':
        // Handle
        ctx.fillStyle = C.LEATHER;
        ctx.fillRect(fx + 4, fy - 6, 3, 16);
        // Axe head
        ctx.fillStyle = C.AXE_IRON;
        ctx.fillRect(fx + (facingRight ? 2 : -14), fy - 8, 12, 12);
        // Axe edge (sharp side)
        ctx.fillStyle = C.AXE_EDGE;
        ctx.fillRect(fx + (facingRight ? 2 : -14), fy - 8, 12, 3);
        ctx.fillRect(fx + (facingRight ? 2 : -14), fy - 8, 3, 12);
        // Detail notch
        ctx.fillStyle = C.AXE_DARK;
        ctx.fillRect(fx + 5, fy - 5, 6, 6);
        break;

      case 'staff':
        // Staff shaft with wood grain
        ctx.fillStyle = C.STAFF_W;
        ctx.fillRect(fx, fy - 22, 3, 26);
        ctx.fillStyle = C.STAFF_D;
        ctx.fillRect(fx + 2, fy - 22, 1, 26);
        // Crystal orb
        ctx.fillStyle = C.CYAN;
        ctx.fillRect(fx - 2, fy - 24, 7, 7);
        ctx.fillStyle = C.CYAN_B;
        ctx.fillRect(fx - 1, fy - 23, 5, 5);
        // Orb core (bright)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx + 1, fy - 22, 2, 3);
        break;

      case 'lance':
        // Long shaft
        ctx.fillStyle = C.LEATHER_L;
        ctx.fillRect(fx + (facingRight ? 0 : -26), fy - 2, 26, 3);
        // Metal tip
        ctx.fillStyle = C.STEEL_EDGE;
        ctx.fillRect(fx + (facingRight ? 26 : -30), fy - 1, 4, 5);
        // Pennant
        ctx.fillStyle = C.CRIMSON;
        ctx.fillRect(fx + (facingRight ? -5 : 17), fy - 4, 6, 10);
        ctx.fillStyle = C.CRIMSON_L;
        ctx.fillRect(fx + (facingRight ? -4 : 18), fy - 3, 3, 8);
        break;

      case 'flail':
        // Handle
        ctx.fillStyle = C.LEATHER;
        ctx.fillRect(fx - 1, fy - 10, 3, 14);
        // Chain
        ctx.fillStyle = C.AXE_IRON;
        ctx.fillRect(fx, fy + 4, 2, 6);
        // Spiked ball
        ctx.fillStyle = C.AXE_IRON;
        ctx.fillRect(fx - 3, fy + 8, 8, 8);
        ctx.fillStyle = C.AXE_EDGE;
        ctx.fillRect(fx - 3, fy + 8, 8, 2);
        // Spikes
        ctx.fillRect(fx - 4, fy + 9, 2, 2);
        ctx.fillRect(fx + 4, fy + 9, 2, 2);
        ctx.fillRect(fx - 2, fy + 6, 2, 2);
        ctx.fillRect(fx + 2, fy + 14, 2, 2);
        break;
    }
  }

  // ============================================================
  // HIT EFFECTS
  // ============================================================
  function drawHitEffect(ctx, x, y, type = 'normal') {
    const fx = Math.round(x);
    const fy = Math.round(y);

    switch (type) {
      case 'normal':
        // Star burst of pixels
        ctx.fillStyle = '#ffffff';
        const angles = [0, 0.785, 1.571, 2.356, 3.142, 3.927, 4.712, 5.498];
        for (const a of angles) {
          const dist = 6;
          ctx.fillRect(fx + Math.cos(a) * dist, fy + Math.sin(a) * dist, 3, 3);
          ctx.fillRect(fx + Math.cos(a) * (dist - 2), fy + Math.sin(a) * (dist - 2), 2, 2);
        }
        // Center flash
        ctx.fillStyle = 'rgba(255,255,200,0.9)';
        ctx.fillRect(fx - 2, fy - 2, 4, 4);
        break;

      case 'counter':
        // Jagged red explosion
        ctx.fillStyle = C.CRIMSON_L;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const d = 5 + (i % 3) * 3;
          ctx.fillRect(fx + Math.cos(a) * d, fy + Math.sin(a) * d, 4, 4);
        }
        // Inner white core
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx - 2, fy - 2, 5, 5);
        ctx.fillStyle = 'rgba(255,255,100,0.8)';
        ctx.fillRect(fx - 3, fy - 3, 7, 7);
        break;

      case 'block':
        // Diamond shield shape
        ctx.fillStyle = '#4488ff';
        ctx.fillRect(fx - 10, fy - 6, 20, 3);
        ctx.fillRect(fx - 8, fy - 3, 16, 3);
        ctx.fillRect(fx - 9, fy, 18, 3);
        ctx.fillRect(fx - 10, fy + 3, 20, 3);
        // Inner highlight
        ctx.fillStyle = '#88bbff';
        ctx.fillRect(fx - 6, fy - 3, 12, 2);
        ctx.fillRect(fx - 5, fy, 10, 2);
        break;

      case 'ko':
        // Shatter: debris radiating outward
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = 5 + Math.random() * 12;
          const s = 1 + Math.floor(Math.random() * 3);
          ctx.fillRect(fx + Math.cos(a) * d, fy + Math.sin(a) * d, s, s);
        }
        break;
    }
  }

  // ============================================================
  // FLOOR / ENVIRONMENT RENDERING
  // ============================================================
  function drawFloor(ctx, floorType, offsetY = 0) {
    const G = typeof GAME !== 'undefined' ? GAME : { width: 960, height: 540, frameCount: 0 };
    const groundY = G.height - 80 + offsetY;

    switch (floorType) {
      case 'horde':
        // Cave floor with texture
        ctx.fillStyle = C.CAVE;
        ctx.fillRect(0, groundY, G.width, 80);
        // Stone texture
        ctx.fillStyle = C.CAVE_DARK;
        for (let i = 0; i < G.width; i += 32) {
          const h = 2 + Math.sin(i * 0.4 + G.frameCount * 0.02) * 2;
          ctx.fillRect(i, groundY, 32, h);
          if (i % 64 === 0) {
            ctx.fillRect(i + 8, groundY + 20, 16, 2);
            ctx.fillRect(i + 4, groundY + 35, 24, 1);
          }
        }
        // Stalactites
        ctx.fillStyle = '#4a3a2a';
        for (let i = 60; i < G.width - 60; i += 100 + Math.floor(Math.sin(i * 0.7) * 40)) {
          const sh = 15 + Math.floor(Math.sin(i * 1.3) * 15);
          ctx.fillRect(i, 0, 4, sh);
          ctx.fillRect(i + 4, 0, 2, sh * 0.7);
        }
        // Stalactite highlights
        ctx.fillStyle = '#5a4a3a';
        for (let i = 60; i < G.width - 60; i += 100 + Math.floor(Math.sin(i * 0.7) * 40)) {
          const sh = 15 + Math.floor(Math.sin(i * 1.3) * 15);
          ctx.fillRect(i, 0, 1, sh);
        }
        break;

      case 'brute':
        // Colosseum sand
        ctx.fillStyle = C.SAND;
        ctx.fillRect(0, groundY, G.width, 80);
        // Sand texture
        ctx.fillStyle = C.SAND_DARK;
        for (let i = 0; i < G.width; i += 16) {
          ctx.fillRect(i, groundY + (i % 32 === 0 ? 1 : 3), 16, 2);
          ctx.fillRect(i + 4, groundY + 15 + (i % 20), 4, 1);
          ctx.fillRect(i + 8, groundY + 40 + (i % 15), 6, 1);
        }
        // Stone slabs at edges
        ctx.fillStyle = '#8a7a5a';
        ctx.fillRect(0, groundY, 20, 80);
        ctx.fillRect(G.width - 20, groundY, 20, 80);
        ctx.fillStyle = '#7a6a4a';
        ctx.fillRect(0, groundY, 2, 80);
        ctx.fillRect(18, groundY, 2, 80);
        ctx.fillRect(G.width - 20, groundY, 2, 80);
        ctx.fillRect(G.width - 2, groundY, 2, 80);
        // Pillar shadows
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(40, groundY, 12, 80);
        ctx.fillRect(G.width - 52, groundY, 12, 80);
        break;

      case 'plague':
        // Library floor - dark wood planks
        ctx.fillStyle = '#2a2040';
        ctx.fillRect(0, groundY, G.width, 80);
        // Floorboards
        ctx.fillStyle = '#221838';
        for (let i = 0; i < G.width; i += 48) {
          ctx.fillRect(i, groundY + 2, 46, 2);
          ctx.fillRect(i + 2, groundY + 20, 44, 1);
          ctx.fillRect(i, groundY + 40, 46, 2);
          ctx.fillRect(i + 4, groundY + 60, 42, 1);
        }
        // Faint green glow
        ctx.fillStyle = 'rgba(0, 255, 100, 0.03)';
        ctx.fillRect(0, groundY, G.width, 80);
        // Floating books
        for (let i = 0; i < 6; i++) {
          const bx = (i * 160 + G.frameCount * 0.2) % G.width;
          const by = groundY - 70 + Math.sin(G.frameCount * 0.015 + i * 1.5) * 20;
          ctx.fillStyle = '#4a3060';
          ctx.fillRect(bx, by, 12, 8);
          ctx.fillStyle = '#5a4070';
          ctx.fillRect(bx, by, 12, 1);
          // Pages
          ctx.fillStyle = '#6a5080';
          ctx.fillRect(bx + 1, by + 2, 10, 1);
          ctx.fillRect(bx + 1, by + 4, 10, 1);
          ctx.fillRect(bx + 1, by + 6, 10, 1);
        }
        break;

      case 'feral':
        // Volcano
        ctx.fillStyle = C.VOLCANO;
        ctx.fillRect(0, groundY, G.width, 80);
        // Scorched rock texture
        ctx.fillStyle = '#2a1505';
        for (let i = 0; i < G.width; i += 40) {
          ctx.fillRect(i, groundY + (i % 80 === 0 ? 5 : 2), 40, 3 + (i % 2) * 3);
        }
        // Lava glow pulse
        ctx.fillStyle = `rgba(255, 68, 0, ${0.08 + Math.sin(G.frameCount * 0.04) * 0.04})`;
        ctx.fillRect(0, groundY, G.width, 80);
        // Lava veins
        ctx.fillStyle = C.LAVA_B;
        for (let i = 40; i < G.width; i += 140) {
          const lh = 25 + Math.sin(i * 0.5) * 15;
          ctx.fillRect(i, groundY + 30, 4, lh);
          ctx.fillStyle = C.LAVA;
          ctx.fillRect(i + 1, groundY + 32, 2, lh - 4);
        }
        // Ember particles
        ctx.fillStyle = 'rgba(255, 150, 20, 0.4)';
        for (let i = 0; i < 5; i++) {
          const ex = (i * 190 + G.frameCount * 0.5) % G.width;
          const ey = groundY + 40 + Math.sin(G.frameCount * 0.1 + i) * 15;
          ctx.fillRect(ex, ey, 2, 2);
        }
        break;

      case 'void':
        // Void realm
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, groundY, G.width, 80);
        // Glitch tiles
        for (let i = 0; i < G.width; i += 40) {
          const glitch = Math.sin(i * 0.3 + G.frameCount * 0.05) > 0;
          ctx.fillStyle = glitch ? '#1a0a2a' : '#0a0a2a';
          ctx.fillRect(i, groundY, 40, 80);
          if (Math.sin(i * 0.7 + G.frameCount * 0.03) > 0.5) {
            ctx.fillStyle = 'rgba(100, 0, 255, 0.05)';
            ctx.fillRect(i, groundY + 20, 40, 3);
          }
        }
        // Distortion lines
        ctx.fillStyle = 'rgba(60, 20, 100, 0.15)';
        for (let i = 0; i < 3; i++) {
          const dy = groundY + 20 + i * 20 + Math.sin(G.frameCount * 0.02 + i) * 4;
          ctx.fillRect(0, dy, G.width, 1);
        }
        break;

      case 'boss':
        // Boss room
        ctx.fillStyle = C.BOSS_DARK;
        ctx.fillRect(0, groundY, G.width, 80);
        // Stone tiles
        ctx.fillStyle = C.BOSS_LIT;
        for (let i = 0; i < G.width; i += 48) {
          ctx.fillRect(i, groundY, 47, 4);
          ctx.fillRect(i + 2, groundY + 6, 43, 1);
        }
        // Central dais detail
        const midX = G.width / 2;
        ctx.fillStyle = '#2a2840';
        ctx.fillRect(midX - 40, groundY, 80, 8);
        ctx.fillStyle = '#3a3850';
        ctx.fillRect(midX - 20, groundY - 2, 40, 4);
        // Ominous glow
        ctx.fillStyle = `rgba(255, 0, 50, ${0.03 + Math.sin(G.frameCount * 0.03) * 0.02})`;
        ctx.fillRect(midX - 60, groundY, 120, 80);
        break;

      case 'bonfire':
        // Rest area
        ctx.fillStyle = C.BONFIRE_W;
        ctx.fillRect(0, groundY, G.width, 80);
        // Warm stone tiles
        ctx.fillStyle = '#3a3020';
        for (let i = 0; i < G.width; i += 40) {
          ctx.fillRect(i, groundY, 39, 4);
        }
        // Subtle warm glow
        ctx.fillStyle = 'rgba(255, 140, 30, 0.04)';
        ctx.fillRect(0, groundY - 20, G.width, 100);
        break;
    }
  }

  // ============================================================
  // BONFIRE
  // ============================================================
  function drawBonfire(ctx, x, y) {
    const fx = Math.round(x);
    const fy = Math.round(y);
    const G = typeof GAME !== 'undefined' ? GAME : { frameCount: 0 };
    const fc = G.frameCount;
    const flame = Math.sin(fc * 0.12) * 0.4 + 0.6;

    // Glow circle
    const glowGrad = ctx.createRadialGradient(fx, fy, 5, fx, fy, 50);
    glowGrad.addColorStop(0, 'rgba(255, 180, 30, 0.12)');
    glowGrad.addColorStop(0.5, 'rgba(255, 120, 10, 0.04)');
    glowGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(fx - 50, fy - 50, 100, 100);

    // Logs
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(fx - 14, fy + 12, 28, 6);
    ctx.fillRect(fx - 10, fy + 9, 20, 6);
    // Log bark detail
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(fx - 12, fy + 13, 24, 1);
    ctx.fillRect(fx - 8, fy + 10, 16, 1);

    // Fire base
    ctx.fillStyle = `rgba(255, ${80 + Math.floor(flame * 60)}, 0, 0.7)`;
    ctx.fillRect(fx - 8, fy + 2, 16, 12);

    // Fire middle
    for (let i = 0; i < 5; i++) {
      const fx2 = fx - 5 + i * 2.5;
      const fh = 10 + Math.sin(fc * 0.15 + i * 0.8) * 6 + flame * 4;
      const r = 220 + Math.floor(Math.sin(fc * 0.14 + i) * 35);
      const g = 120 + Math.floor(flame * 60);
      ctx.fillStyle = `rgba(${r}, ${g}, 20, 0.7)`;
      ctx.fillRect(fx2, fy - fh, 3, fh + 6);
    }

    // Fire tips (yellow/white)
    for (let i = 0; i < 3; i++) {
      const tx = fx - 3 + i * 3;
      const th = 6 + Math.sin(fc * 0.18 + i * 1.2) * 4;
      ctx.fillStyle = `rgba(255, ${200 + Math.floor(flame * 55)}, ${60 + Math.floor(flame * 30)}, 0.7)`;
      ctx.fillRect(tx, fy - 4 - th, 2, th);
    }

    // Sparks rising
    for (let i = 0; i < 5; i++) {
      const sx = fx - 6 + (i * 3 + Math.sin(fc * 0.2 + i) * 4);
      const sy = fy - 15 - (fc * 0.4 + i * 8) % 30;
      ctx.fillStyle = `rgba(255, ${180 + i * 15}, 30, ${0.6 - (fc * 0.4 + i * 8) % 30 / 30 * 0.4})`;
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  // ============================================================
  // HEALTH BAR
  // ============================================================
  function drawHealthBar(ctx, x, y, w, h, current, max, color = '#ff3333', bgColor = '#1a1a1a') {
    const fx = Math.round(x);
    const fy = Math.round(y);
    const barW = w - 2;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(fx, fy, w, h);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(fx + 1, fy + 1, w - 2, h - 2);

    // Fill
    const fillW = Math.max(0, (current / max) * barW);
    if (fillW > 0) {
      // Gradient fill for depth
      ctx.fillStyle = color;
      ctx.fillRect(fx + 1, fy + 1, fillW, h - 2);
      // Highlight on top edge
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(fx + 1, fy + 1, fillW, 1);
      // Dark bottom edge
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(fx + 1, fy + h - 2, fillW, 1);
    }

    // Segmentation lines
    ctx.fillStyle = bgColor;
    for (let i = 1; i < 10; i++) {
      const sx = fx + 1 + (barW / 10) * i;
      ctx.fillRect(Math.round(sx), fy + 1, 1, h - 2);
    }

    // Outer border highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(fx, fy, w, 1);
    ctx.fillRect(fx, fy, 1, h);
  }

  // ============================================================
  // SCREEN EFFECTS
  // ============================================================

  /** Apply CRT scanlines overlay to entire canvas */
  function drawCRTScanlines(ctx, width, height, intensity = 0.08) {
    ctx.fillStyle = `rgba(0, 0, 0, ${intensity})`;
    for (let y = 0; y < height; y += 2) {
      ctx.fillRect(0, y, width, 1);
    }
  }

  /** Apply vignette (dark edges) */
  function drawVignette(ctx, width, height, intensity = 0.3) {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.35,
      width / 2, height / 2, width * 0.75
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, `rgba(0,0,0,0)`);
    gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  /** Apply chromatic aberration (RGB channel shift) at screen edges */
  function drawChromaticAberration(ctx, width, height, intensity = 1) {
    if (intensity <= 0) return;

    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.putImageData(imageData, 0, 0);

      // Clear and redraw with channel shifts
      ctx.clearRect(0, 0, width, height);

      // Red channel (shift slightly right)
      ctx.globalAlpha = 0.4;
      ctx.drawImage(tempCanvas, intensity, 0);

      // Blue channel (shift slightly left)
      ctx.globalAlpha = 0.4;
      ctx.drawImage(tempCanvas, -intensity, 0);

      // Green channel center
      ctx.globalAlpha = 0.6;
      ctx.drawImage(tempCanvas, 0, 0);

      ctx.globalAlpha = 1;
    } catch (e) {
      // Fallback: simple offset rectangles
    }
  }

  /** Full post-processing pipeline */
  function applyScreenEffects(ctx, width, height, playerHP = 0, playerMaxHP = 100) {
    // CRT scanlines
    drawCRTScanlines(ctx, width, height, 0.06);

    // Vignette (stronger at low HP)
    const hpRatio = playerMaxHP > 0 ? playerHP / playerMaxHP : 1;
    const vignetteIntensity = 0.15 + (1 - hpRatio) * 0.35;
    drawVignette(ctx, width, height, vignetteIntensity);

    // Chromatic aberration when low HP (< 25%)
    if (hpRatio < 0.25) {
      const caIntensity = Math.floor((1 - hpRatio / 0.25) * 2);
      drawChromaticAberration(ctx, width, height, Math.min(caIntensity, 2));
    }
  }

  // ============================================================
  // HURTBOX / HITBOX DEBUG VISUALIZATION
  // ============================================================

  /** Draw hurtbox with pixel-art style dashed border */
  function drawHurtboxDebug(ctx, x, y, w, h, color = '#00ff00', label = '') {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Dashed border (pixel-art style: 4px on, 4px off)
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    // Draw dashed manually for pixel-perfect rendering
    const dashLen = 4;
    const gapLen = 4;
    // Top
    for (let i = 0; i < w; i += dashLen + gapLen) {
      const segW = Math.min(dashLen, w - i);
      ctx.fillStyle = color;
      ctx.fillRect(fx + i, fy, segW, 1);
    }
    // Bottom
    for (let i = 0; i < w; i += dashLen + gapLen) {
      const segW = Math.min(dashLen, w - i);
      ctx.fillStyle = color;
      ctx.fillRect(fx + i, fy + h - 1, segW, 1);
    }
    // Left
    for (let i = 0; i < h; i += dashLen + gapLen) {
      const segH = Math.min(dashLen, h - i);
      ctx.fillStyle = color;
      ctx.fillRect(fx, fy + i, 1, segH);
    }
    // Right
    for (let i = 0; i < h; i += dashLen + gapLen) {
      const segH = Math.min(dashLen, h - i);
      ctx.fillStyle = color;
      ctx.fillRect(fx + w - 1, fy + i, 1, segH);
    }

    // Fill with low alpha
    ctx.fillStyle = color.replace(')', ', 0.08)').replace('rgb', 'rgba');
    if (!ctx.fillStyle.includes('rgba')) {
      ctx.fillStyle = `rgba(0, 255, 0, 0.08)`;
    }
    ctx.fillRect(fx + 1, fy + 1, w - 2, h - 2);

    // Corner pixels (emphasized)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx, fy, 1, 1);
    ctx.fillRect(fx + w - 1, fy, 1, 1);
    ctx.fillRect(fx, fy + h - 1, 1, 1);
    ctx.fillRect(fx + w - 1, fy + h - 1, 1, 1);

    // Label
    if (label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '6px monospace';
      ctx.fillText(label, fx + 2, fy - 2);
    }
  }

  /** Draw hitbox with solid pixel-art style border */
  function drawHitboxDebug(ctx, x, y, w, h, color = '#ff0000', label = '') {
    const fx = Math.round(x);
    const fy = Math.round(y);

    // Solid border
    ctx.fillStyle = color;
    ctx.fillRect(fx, fy, w, 1);       // top
    ctx.fillRect(fx, fy + h - 1, w, 1); // bottom
    ctx.fillRect(fx, fy, 1, h);        // left
    ctx.fillRect(fx + w - 1, fy, 1, h); // right

    // Interior glow
    ctx.fillStyle = `rgba(255, 50, 50, 0.12)`;
    ctx.fillRect(fx + 1, fy + 1, w - 2, h - 2);

    // Active frame markers (corner brackets)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx, fy, 4, 1);
    ctx.fillRect(fx, fy, 1, 4);
    ctx.fillRect(fx + w - 4, fy, 4, 1);
    ctx.fillRect(fx + w - 1, fy, 1, 4);
    ctx.fillRect(fx, fy + h - 1, 4, 1);
    ctx.fillRect(fx, fy + h - 4, 1, 4);
    ctx.fillRect(fx + w - 4, fy + h - 1, 4, 1);
    ctx.fillRect(fx + w - 1, fy + h - 4, 1, 4);

    if (label) {
      ctx.fillStyle = '#ff8888';
      ctx.font = '6px monospace';
      ctx.fillText(label, fx + 2, fy - 2);
    }
  }

  /** Draw full debug overlay for a character */
  function drawCharacterDebug(ctx, char, showHurtbox = true, showHitbox = true) {
    if (showHurtbox && char.hurtbox) {
      const hb = char.hurtbox;
      drawHurtboxDebug(ctx, char.x + hb.x, char.y + hb.y, hb.w, hb.h, '#00ff00', 'HURT');
    }
    if (showHitbox && char.currentHitbox) {
      const atk = char.currentHitbox;
      drawHitboxDebug(ctx, atk.x, atk.y, atk.w, atk.h, '#ff0000',
        char.currentAttacks && char.currentAttacks.length > 0 ?
        char.currentAttacks[0].phase : 'HIT');
    }
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  function isBlinking(frameCount, every = 30) {
    return Math.floor(frameCount / every) % 2 === 0;
  }

  /** Generate pixel-art dust puff (array of pixel tuples) */
  function dustPuffPixels(x, y, count = 5) {
    const pixels = [];
    for (let i = 0; i < count; i++) {
      pixels.push({
        x: Math.floor(Math.random() * 8 - 4),
        y: Math.floor(Math.random() * 6 - 3),
        c: `rgba(180, 160, 140, ${0.3 + Math.random() * 0.4})`
      });
    }
    return pixels;
  }

  /** Draw dust particles at a position */
  function drawDustPuff(ctx, x, y, frameCount = 0) {
    const alpha = Math.max(0, 1 - frameCount / 20);
    const scale = 1 + frameCount * 0.1;
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 6; i++) {
      const dx = (Math.random() - 0.5) * 12 * scale;
      const dy = (Math.random() - 0.5) * 8 * scale;
      ctx.fillStyle = `rgba(200, 180, 150, ${alpha * 0.5})`;
      ctx.fillRect(Math.round(x + dx), Math.round(y + dy), 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  /** Screen shake helper — returns {x, y} offset */
  function getShakeOffset(intensity, duration) {
    if (duration <= 0) return { x: 0, y: 0 };
    return {
      x: Math.floor((Math.random() * 2 - 1) * intensity),
      y: Math.floor((Math.random() * 2 - 1) * intensity)
    };
  }

  // ============================================================
  // ANIMATION STATE TRACKING (for use by character classes)
  // ============================================================

  /** Breathing cycle: returns {expand: 0|1} for idle breathing animation */
  function breathingPhase(frameCount, cycleFrames = 45) {
    const phase = Math.floor(frameCount / (cycleFrames / 2)) % 2;
    return phase; // 0 = exhale, 1 = inhale
  }

  /** Idle weight shift: returns offset and timer state */
  function weightShift(frameCount, shiftEvery = 45) {
    return {
      shifting: frameCount % shiftEvery < 4,
      shiftProgress: (frameCount % shiftEvery) / 4,
      side: Math.floor(frameCount / shiftEvery) % 2  // 0=left, 1=right
    };
  }

  /** Walk cycle leg positions (4-phase) */
  function walkLegPhase(frameCount, speed = 1) {
    const phase = (frameCount * speed) % 4;
    return {
      frontLeg: Math.sin(phase * Math.PI / 2),
      backLeg: Math.sin((phase + 2) * Math.PI / 2),
      phase: Math.floor(phase)
    };
  }

  /** Attack animation phase timing */
  function attackPhase(frameCount, startup, active, recovery) {
    if (frameCount < startup) return 'startup';
    if (frameCount < startup + active) return 'active';
    if (frameCount < startup + active + recovery) return 'recovery';
    return 'complete';
  }

  /** Smooth interpolation for animation blending */
  function lerp(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    // Core rendering
    pixelRect,
    drawPixelData,
    drawPixelGrid,
    putPixel,

    // Sprite system
    drawSprite,
    getSprite,
    getAnimFrame,

    // Sprite keys for character rendering
    SPRITES: {
      knight: 'knight_idle',
      knight_walk: 'knight_walk',
      knight_attack: 'knight_attack',
      assassin: 'assassin_idle',
      mage: 'mage_idle',
      necromancer: 'necromancer_idle',
      paladin: 'paladin_idle',
      warrior: 'warrior_idle',
    },

    // Character rendering (existing signatures preserved)
    drawBlockCharacter,
    drawLeanCharacter,
    drawFloatCharacter,
    drawMountedCharacter,
    drawMassiveCharacter,
    drawSkeletalCharacter,

    // Weapons & effects
    drawWeapon,
    drawHitEffect,

    // Environment
    drawFloor,
    drawBonfire,

    // UI
    drawHealthBar,

    // Screen effects
    drawCRTScanlines,
    drawVignette,
    drawChromaticAberration,
    applyScreenEffects,

    // Debug visualization
    drawHurtboxDebug,
    drawHitboxDebug,
    drawCharacterDebug,

    // Utilities
    isBlinking,
    dustPuffPixels,
    drawDustPuff,
    getShakeOffset,
    breathingPhase,
    weightShift,
    walkLegPhase,
    attackPhase,
    lerp,

    // Color palette (read-only reference)
    C,
  };
})();

// ============================================================
// EXPORT
// ============================================================
const AN = AnimationSystem;
