/**
 * Super Mario Bros — Playable Platformer Engine for Presentations
 * Built with HTML5 Canvas & Web Audio API (Zero external assets required).
 * Fully featured: Pipes, Gaps/Pits, Piranha Plants, Koopa Shell Kicking,
 * Mystery Blocks, Coins, Super Mushrooms, Star Power, and Flagpole Victory!
 */

export class MarioGame {
  constructor(canvas, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.dpr = window.devicePixelRatio || 1;

    // Fixed virtual arcade resolution (16:9)
    this.viewWidth = 800;
    this.viewHeight = 450;
    this.cameraX = 0;
    this.groundY = 340; // Ground top is prominent at y=340 (110px thick ground)

    // Game state
    this.state = 'PLAYING'; // 'PLAYING' | 'STAGE_CLEAR' | 'GAME_OVER'
    this.currentLevel = 0;
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.time = 400;
    this.lastTimeTick = 0;

    // Mario player object
    this.mario = {
      x: 50,
      y: 290,
      w: 24,
      h: 30,
      vx: 0,
      vy: 0,
      isGrounded: false,
      isJumping: false,
      facing: 'right', // 'left' | 'right'
      state: 'small', // 'small' | 'super' | 'star'
      starTimer: 0,
      invulnerable: 0,
      runFrame: 0,
      animTimer: 0,
      isDead: false,
      deathTimer: 0,
      onPole: false,
      poleProgress: 0
    };

    // Input state
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      sprint: false
    };

    // Physics constants - Fast & responsive platformer controls
    this.gravity = 0.58;
    this.accel = 0.68;
    this.friction = 0.88;
    this.maxSpeed = 5.6; // Increased running speed
    this.sprintMaxSpeed = 8.2; // Blazing sprint speed
    this.jumpForce = -12.0;

    // World elements
    this.blocks = [];
    this.pipes = [];
    this.gaps = [];
    this.enemies = [];
    this.items = []; // Mushrooms, Stars, Shells
    this.particles = [];
    this.floatingTexts = [];
    this.flagpole = null;
    this.castle = null;

    // Level names
    this.levelNames = [
      "World 1-1: Mushroom Kingdom",
      "World 1-2: Underground Caverns",
      "World 1-3: Bowser's Fortress"
    ];

    this.bindInputs();
    this.loadLevel(0);
    this.startLoop();
  }

  loadLevel(index) {
    if (index < 0 || index >= this.levelNames.length) index = 0;
    this.currentLevel = index;
    this.state = 'PLAYING';
    this.cameraX = 0;
    this.time = 400;
    this.lastTimeTick = performance.now();

    // Reset Mario
    this.mario.x = 50;
    this.mario.y = this.groundY - 32;
    this.mario.vx = 0;
    this.mario.vy = 0;
    this.mario.h = this.mario.state === 'super' ? 42 : 30;
    this.mario.isGrounded = false;
    this.mario.isDead = false;
    this.mario.deathTimer = 0;
    this.mario.onPole = false;
    this.mario.facing = 'right';
    this.mario.starTimer = 0;

    this.blocks = [];
    this.pipes = [];
    this.gaps = [];
    this.enemies = [];
    this.items = [];
    this.particles = [];
    this.floatingTexts = [];

    if (index === 0) {
      this.buildWorld1_1();
    } else if (index === 1) {
      this.buildWorld1_2();
    } else {
      this.buildWorld1_3();
    }

    this.resizeCanvas();
    this.updateHUD();
  }

  buildWorld1_1() {
    this.theme = 'overworld';
    const gy = this.groundY; // 340

    // --- GROUND SECTION 1: x = 0 to x = 400 ---
    this.addGround(0, 400, gy);

    // Mystery & Brick block cluster near start (x=160 to x=280)
    this.addBlock(160, 220, 'question', 'coin');
    this.addBlock(200, 220, 'brick');
    this.addBlock(240, 220, 'question', 'mushroom');
    this.addBlock(280, 220, 'brick');
    // High Mystery block with Star Power!
    this.addBlock(240, 130, 'question', 'star');

    // First Goomba walking under blocks
    this.addEnemy(250, gy - 28, 'goomba');

    // --- FIRST GREEN WARP PIPE (x = 340) ---
    // Pipe sits right at the end of section 1, right before the first gap!
    this.addPipe(340, gy - 65, 65, false);

    // --- FIRST GAP / PIT (x = 400 to x = 520) ---
    // A clear 120px gap with NO ground! Blue sky abyss!
    this.gaps.push({ x: 400, w: 120 });
    // Floating coins arcing over the gap
    this.addLooseCoin(430, 260);
    this.addLooseCoin(460, 230);
    this.addLooseCoin(490, 260);

    // --- GROUND SECTION 2: x = 520 to x = 1000 ---
    this.addGround(520, 1000, gy);

    // Second Pipe with animated Piranha Plant!
    this.addPipe(570, gy - 80, 80, true);

    // Question block & Goomba
    this.addBlock(680, 220, 'question', 'coin');
    this.addEnemy(660, gy - 28, 'goomba');

    // Koopa Troopa (Turtle) walking on ground!
    this.addEnemy(760, gy - 30, 'koopa');

    // Third tall pipe
    this.addPipe(880, gy - 100, 100, false);

    // --- SECOND GAP / PIT (x = 1000 to x = 1140) ---
    this.gaps.push({ x: 1000, w: 140 });
    // Suspended question block & brick pathway across second gap
    this.addBlock(1030, 230, 'brick');
    this.addBlock(1070, 230, 'question', 'coin');
    this.addBlock(1110, 230, 'brick');

    // --- GROUND SECTION 3: x = 1140 to x = 2400 ---
    this.addGround(1140, 2400, gy);

    // More blocks & enemies
    this.addBlock(1260, 220, 'brick');
    this.addBlock(1300, 220, 'question', 'coin');
    this.addBlock(1340, 220, 'brick');
    this.addBlock(1380, 220, 'brick');
    this.addEnemy(1280, gy - 28, 'goomba');
    this.addEnemy(1330, gy - 28, 'goomba');

    // Pipe 4 with Piranha plant
    this.addPipe(1520, gy - 75, 75, true);

    // Enemy Koopa
    this.addEnemy(1680, gy - 30, 'koopa');

    // Pyramid Staircase leading up to Flagpole
    const sx = 1850;
    for (let step = 1; step <= 7; step++) {
      for (let y = 0; y < step; y++) {
        this.addBlock(sx + (step - 1) * 32, gy - (y + 1) * 32, 'stair');
      }
    }

    // Flagpole
    this.flagpole = {
      x: 2160,
      y: gy - 240,
      h: 240,
      flagY: gy - 220
    };

    // Castle
    this.castle = {
      x: 2260,
      y: gy - 130,
      w: 130,
      h: 130
    };
  }

  buildWorld1_2() {
    this.theme = 'underground';
    const gy = this.groundY;

    // Solid underground floor with cavern pits
    this.addGround(0, 500, gy);
    this.gaps.push({ x: 500, w: 100 });
    this.addGround(600, 1400, gy);
    this.gaps.push({ x: 1400, w: 120 });
    this.addGround(1520, 2500, gy);

    // Ceiling bricks
    for (let x = 0; x < 2500; x += 32) {
      this.addBlock(x, 0, 'ceiling');
      this.addBlock(x, 32, 'ceiling');
    }

    // Pipes
    this.addPipe(350, gy - 70, 70, false);
    this.addPipe(800, gy - 90, 90, true);
    this.addPipe(1200, gy - 60, 60, false);

    // Floating brick runways with loose coins
    for (let x = 700; x < 950; x += 32) {
      this.addBlock(x, 210, 'brick');
      this.addLooseCoin(x + 8, 170);
    }
    this.addBlock(800, 120, 'question', 'star');

    // Enemies
    this.addEnemy(420, gy - 28, 'goomba');
    this.addEnemy(650, gy - 30, 'koopa');
    this.addEnemy(950, gy - 28, 'goomba');
    this.addEnemy(1000, gy - 28, 'goomba');

    // End flagpole & castle
    this.flagpole = {
      x: 2160,
      y: gy - 240,
      h: 240,
      flagY: gy - 220
    };
    this.castle = {
      x: 2260,
      y: gy - 130,
      w: 130,
      h: 130
    };
  }

  buildWorld1_3() {
    this.theme = 'castle';
    const gy = this.groundY;

    // Castle stones with lava pits
    this.addGround(0, 420, gy);
    this.gaps.push({ x: 420, w: 130 });
    this.addGround(550, 1200, gy);
    this.gaps.push({ x: 1200, w: 140 });
    this.addGround(1340, 2500, gy);

    // Castle blocks
    for (let x = 650; x < 900; x += 32) {
      this.addBlock(x, 220, 'brick');
    }
    this.addBlock(780, 130, 'question', 'star');

    // Enemies
    this.addEnemy(320, gy - 30, 'koopa');
    this.addEnemy(700, gy - 28, 'goomba');
    this.addEnemy(850, gy - 28, 'goomba');
    this.addEnemy(1000, gy - 30, 'koopa');

    this.flagpole = {
      x: 2160,
      y: gy - 240,
      h: 240,
      flagY: gy - 220
    };
    this.castle = {
      x: 2260,
      y: gy - 130,
      w: 130,
      h: 130
    };
  }

  addGround(xStart, xEnd, y) {
    const tileW = 32;
    for (let x = xStart; x < xEnd; x += tileW) {
      const w = Math.min(tileW, xEnd - x);
      this.blocks.push({
        x,
        y,
        w,
        h: 130, // Extends all the way down to bottom of canvas
        type: 'ground',
        solid: true,
        bumpY: 0
      });
    }
  }

  addBlock(x, y, type, content = null) {
    this.blocks.push({
      x,
      y,
      w: 32,
      h: 32,
      type,
      content,
      solid: true,
      bumpY: 0,
      hit: false
    });
  }

  addLooseCoin(x, y) {
    this.blocks.push({
      x,
      y,
      w: 24,
      h: 24,
      type: 'coin_loose',
      solid: false,
      hit: false,
      bumpY: 0
    });
  }

  addPipe(x, y, height, hasPiranha = false) {
    this.blocks.push({
      x,
      y,
      w: 56,
      h: height,
      type: 'pipe',
      solid: true,
      hasPiranha,
      piranhaOffset: 0,
      piranhaTimer: Math.random() * 100,
      bumpY: 0
    });
  }

  addEnemy(x, y, type) {
    this.enemies.push({
      x,
      y,
      w: 28,
      h: type === 'koopa' ? 32 : 28,
      type, // 'goomba' | 'koopa' | 'shell'
      vx: -1.2,
      alive: true,
      squished: false,
      squishTimer: 0,
      shellMoving: false
    });
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      const gameView = document.getElementById('gameView');
      if (!gameView || gameView.classList.contains('hidden-view')) return;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.keys.left = true;
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.keys.right = true;
          e.preventDefault();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          if (!this.keys.up && this.mario.isGrounded) {
            this.mario.vy = this.jumpForce;
            this.mario.isGrounded = false;
            this.mario.isJumping = true;
            this.playJumpSound();
            this.createDust(this.mario.x + this.mario.w / 2, this.mario.y + this.mario.h);
          }
          this.keys.up = true;
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.keys.down = true;
          e.preventDefault();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyJ':
          this.keys.sprint = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.keys.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.keys.right = false;
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          this.keys.up = false;
          if (this.mario.vy < -3) {
            this.mario.vy *= 0.45;
          }
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.keys.down = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyJ':
          this.keys.sprint = false;
          break;
      }
    });

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    if (!container) return;

    // Use container width or max 860px
    const availableWidth = container.clientWidth;
    const targetW = Math.max(640, Math.min(880, availableWidth));
    const targetH = Math.round(targetW * (450 / 800));

    this.canvas.width = targetW * this.dpr;
    this.canvas.height = targetH * this.dpr;
    this.canvas.style.width = '100%';
    this.canvas.style.maxWidth = `${targetW}px`;
    this.canvas.style.height = 'auto';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  startLoop() {
    const loop = (time) => {
      this.update(time);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(time) {
    if (this.state === 'GAME_OVER') return;

    // Countdown timer
    if (this.state === 'PLAYING') {
      if (time - this.lastTimeTick >= 1000) {
        this.time = Math.max(0, this.time - 1);
        this.lastTimeTick = time;
        if (this.time === 0) {
          this.handleMarioDeath("Time's Up!");
        }
        this.updateHUD();
      }
    }

    // Mario dead physics
    if (this.mario.isDead) {
      this.mario.deathTimer += 1;
      if (this.mario.deathTimer > 18) {
        this.mario.vy += this.gravity;
        this.mario.y += this.mario.vy;
      }
      if (this.mario.deathTimer > 110) {
        this.lives--;
        if (this.lives > 0) {
          this.loadLevel(this.currentLevel);
        } else {
          this.state = 'GAME_OVER';
          this.showEndGameModal({ won: false, reason: "Game Over! You ran out of lives." });
        }
      }
      return;
    }

    // Star power timer decay
    if (this.mario.starTimer > 0) {
      this.mario.starTimer--;
      // Spawn star sparkles
      if (Math.random() < 0.3) {
        this.createStarSparkle(this.mario.x + Math.random() * this.mario.w, this.mario.y + Math.random() * this.mario.h);
      }
    }

    // Flagpole slide sequence
    if (this.mario.onPole) {
      if (this.flagpole && this.flagpole.flagY < this.flagpole.y + this.flagpole.h - 30) {
        this.flagpole.flagY += 3;
      }
      if (this.mario.y < (this.flagpole ? this.flagpole.y + this.flagpole.h - this.mario.h : 300)) {
        this.mario.y += 3;
      } else {
        // Walk into castle
        this.mario.facing = 'right';
        this.mario.x += 3.5;
        if (this.castle && this.mario.x >= this.castle.x + 50) {
          this.state = 'STAGE_CLEAR';
          this.playStageClearFanfare();
          this.showEndGameModal({
            won: true,
            score: this.score + this.time * 50,
            coins: this.coins,
            level: this.levelNames[this.currentLevel]
          });
        }
      }
      return;
    }

    // Acceleration & sprint speed
    let currentMax = this.keys.sprint ? this.sprintMaxSpeed : this.maxSpeed;
    if (this.mario.starTimer > 0) currentMax *= 1.25; // 25% faster with Star!

    if (this.keys.left) {
      this.mario.vx -= this.accel;
      if (this.mario.vx < -currentMax) this.mario.vx = -currentMax;
      this.mario.facing = 'left';
    } else if (this.keys.right) {
      this.mario.vx += this.accel;
      if (this.mario.vx > currentMax) this.mario.vx = currentMax;
      this.mario.facing = 'right';
    } else {
      this.mario.vx *= this.friction;
      if (Math.abs(this.mario.vx) < 0.1) this.mario.vx = 0;
    }

    // Gravity
    this.mario.vy += this.gravity;
    if (this.mario.vy > 12) this.mario.vy = 12;

    // Running animation
    if (Math.abs(this.mario.vx) > 0.5 && this.mario.isGrounded) {
      this.mario.animTimer += Math.abs(this.mario.vx);
      if (this.mario.animTimer > 8) {
        this.mario.animTimer = 0;
        this.mario.runFrame = (this.mario.runFrame + 1) % 3;
      }
    } else {
      this.mario.runFrame = 0;
    }

    // Horizontal movement & collision
    this.mario.x += this.mario.vx;
    this.checkHorizontalCollisions();

    // Prevent camera backward scrolling
    if (this.mario.x < this.cameraX) {
      this.mario.x = this.cameraX;
      this.mario.vx = 0;
    }

    // Vertical movement & collision
    this.mario.y += this.mario.vy;
    this.mario.isGrounded = false;
    this.checkVerticalCollisions();

    // Fell down a pit / gap!
    if (this.mario.y > this.viewHeight + 40) {
      this.handleMarioDeath("Fell into a pit!");
      return;
    }

    // Invulnerability decay
    if (this.mario.invulnerable > 0) {
      this.mario.invulnerable--;
    }

    // Camera follow (moves forward smoothly)
    const targetCamX = this.mario.x - 280;
    if (targetCamX > this.cameraX) {
      this.cameraX = targetCamX;
    }

    // Flagpole grab check
    if (this.flagpole && !this.mario.onPole) {
      if (this.mario.x + this.mario.w >= this.flagpole.x && this.mario.x <= this.flagpole.x + 16) {
        if (this.mario.y + this.mario.h >= this.flagpole.y) {
          this.mario.onPole = true;
          this.mario.vx = 0;
          this.mario.vy = 0;
          this.score += 2000;
          this.addFloatingText(this.mario.x, this.mario.y, "+2000pts", "#facc15");
          this.playFlagpoleSound();
        }
      }
    }

    // Update Enemies & Shells
    this.updateEnemies();

    // Update Items (Mushrooms, Stars)
    this.updateItems();

    // Update Blocks bump recovery & Piranha Plants
    this.updateBlocks();

    // Update Particles & Floating Text
    this.updateParticles();
  }

  checkHorizontalCollisions() {
    for (const b of this.blocks) {
      if (!b.solid) continue;
      if (
        this.mario.x < b.x + b.w &&
        this.mario.x + this.mario.w > b.x &&
        this.mario.y < b.y + b.h &&
        this.mario.y + this.mario.h > b.y
      ) {
        if (this.mario.vx > 0) {
          this.mario.x = b.x - this.mario.w;
          this.mario.vx = 0;
        } else if (this.mario.vx < 0) {
          this.mario.x = b.x + b.w;
          this.mario.vx = 0;
        }
      }
    }
  }

  checkVerticalCollisions() {
    for (const b of this.blocks) {
      if (!b.solid) {
        if (b.type === 'coin_loose' && !b.hit) {
          if (
            this.mario.x < b.x + b.w &&
            this.mario.x + this.mario.w > b.x &&
            this.mario.y < b.y + b.h &&
            this.mario.y + this.mario.h > b.y
          ) {
            b.hit = true;
            this.coins++;
            this.score += 200;
            this.playCoinSound();
            this.addFloatingText(b.x, b.y, "+200", "#facc15");
            this.updateHUD();
          }
        }
        continue;
      }

      if (
        this.mario.x + this.mario.w > b.x + 2 &&
        this.mario.x < b.x + b.w - 2 &&
        this.mario.y < b.y + b.h &&
        this.mario.y + this.mario.h > b.y
      ) {
        if (this.mario.vy > 0) {
          // Landing on block / pipe top
          this.mario.y = b.y - this.mario.h;
          this.mario.vy = 0;
          this.mario.isGrounded = true;
          this.mario.isJumping = false;
        } else if (this.mario.vy < 0) {
          // Hitting block from below
          this.mario.y = b.y + b.h;
          this.mario.vy = 1;
          this.handleBlockHit(b);
        }
      }
    }
  }

  handleBlockHit(block) {
    if (block.type === 'question' && !block.hit) {
      block.hit = true;
      block.bumpY = -8;
      if (block.content === 'coin') {
        this.coins++;
        this.score += 200;
        this.playCoinSound();
        this.createCoinParticle(block.x + 8, block.y - 16);
        this.addFloatingText(block.x, block.y - 20, "+200", "#facc15");
      } else if (block.content === 'mushroom') {
        this.playPowerUpAppearsSound();
        this.spawnMushroom(block.x + 4, block.y - 32);
      } else if (block.content === 'star') {
        this.playPowerUpAppearsSound();
        this.spawnStar(block.x + 4, block.y - 32);
      }
      this.updateHUD();
    } else if (block.type === 'brick') {
      block.bumpY = -6;
      if (this.mario.state === 'super' || this.mario.starTimer > 0) {
        this.playBlockBreakSound();
        block.solid = false;
        block.broken = true;
        this.createBrickDebris(block.x + 16, block.y + 16);
        this.score += 50;
      } else {
        this.playBumpSound();
      }
    } else {
      this.playBumpSound();
    }
  }

  spawnMushroom(x, y) {
    this.items.push({
      x,
      y,
      w: 24,
      h: 24,
      type: 'mushroom',
      vx: 1.6,
      vy: 0
    });
  }

  spawnStar(x, y) {
    this.items.push({
      x,
      y,
      w: 24,
      h: 24,
      type: 'star',
      vx: 2.2,
      vy: -5,
      bounce: 0
    });
  }

  updateItems() {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.vy = (it.vy || 0) + this.gravity;
      it.y += it.vy;

      // Floor collision
      for (const b of this.blocks) {
        if (b.solid && it.x + it.w > b.x && it.x < b.x + b.w && it.y + it.h > b.y && it.y < b.y + b.h) {
          it.y = b.y - it.h;
          if (it.type === 'star') {
            it.vy = -6.5; // Star bounces!
          } else {
            it.vy = 0;
          }
        }
      }

      it.x += it.vx;

      // Reverse on wall or pipe
      for (const b of this.blocks) {
        if (!b.solid) continue;
        if (it.x < b.x + b.w && it.x + it.w > b.x && it.y < b.y + b.h && it.y + it.h > b.y) {
          it.vx = -it.vx;
          if (it.vx > 0) it.x = b.x + b.w;
          else it.x = b.x - it.w;
        }
      }

      // Mario touches item
      if (
        this.mario.x < it.x + it.w &&
        this.mario.x + this.mario.w > it.x &&
        this.mario.y < it.y + it.h &&
        this.mario.y + this.mario.h > it.y
      ) {
        this.items.splice(i, 1);
        if (it.type === 'mushroom') {
          this.mario.state = 'super';
          this.mario.h = 42;
          this.mario.y -= 12;
          this.score += 1000;
          this.playPowerUpSound();
          this.addFloatingText(this.mario.x, this.mario.y, "SUPER MARIO! 🍄", "#ef4444");
        } else if (it.type === 'star') {
          this.mario.starTimer = 700; // ~12 seconds
          this.score += 1000;
          this.playPowerUpSound();
          this.addFloatingText(this.mario.x, this.mario.y, "STAR POWER! 🌟", "#facc15");
        }
        this.updateHUD();
      }
    }
  }

  updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Squished goomba death timer
      if (e.squished) {
        e.squishTimer++;
        if (e.squishTimer > 25) {
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // Enemy horizontal movement
      e.x += e.vx;

      // Reverse at walls, pipes, or pits
      for (const b of this.blocks) {
        if (!b.solid) continue;
        if (e.x < b.x + b.w && e.x + e.w > b.x && e.y < b.y + b.h && e.y + e.h > b.y) {
          e.vx = -e.vx;
          if (e.vx > 0) e.x = b.x + b.w;
          else e.x = b.x - e.w;
        }
      }

      // Falling off pit
      if (e.y > this.viewHeight + 50) {
        this.enemies.splice(i, 1);
        continue;
      }

      // Shell sliding collision with other enemies
      if (e.type === 'shell' && e.shellMoving) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          if (i === j) continue;
          const target = this.enemies[j];
          if (
            e.x < target.x + target.w &&
            e.x + e.w > target.x &&
            e.y < target.y + target.h &&
            e.y + e.h > target.y
          ) {
            // Shell knocks out enemy!
            this.enemies.splice(j, 1);
            this.score += 500;
            this.playStompSound();
            this.addFloatingText(target.x, target.y, "+500", "#facc15");
            if (j < i) i--;
          }
        }
      }

      // Collision with Mario
      if (
        this.mario.x < e.x + e.w &&
        this.mario.x + this.mario.w > e.x &&
        this.mario.y < e.y + e.h &&
        this.mario.y + this.mario.h > e.y
      ) {
        // If Mario has Star Power -> Instantly knock out enemy!
        if (this.mario.starTimer > 0) {
          this.enemies.splice(i, 1);
          this.score += 200;
          this.playStompSound();
          this.createBrickDebris(e.x + 14, e.y + 14);
          this.addFloatingText(e.x, e.y, "+200", "#facc15");
          continue;
        }

        // Mario stomps enemy from above!
        if (this.mario.vy > 0 && this.mario.y + this.mario.h - this.mario.vy <= e.y + 14) {
          this.mario.vy = -7.5; // bounce Mario high!
          if (e.type === 'goomba') {
            e.squished = true;
            this.score += 100;
            this.playStompSound();
            this.addFloatingText(e.x, e.y, "+100", "#f8fafc");
          } else if (e.type === 'koopa') {
            // Turn Koopa into a shell!
            e.type = 'shell';
            e.h = 24;
            e.y += 8;
            e.vx = 0;
            e.shellMoving = false;
            this.score += 150;
            this.playStompSound();
            this.addFloatingText(e.x, e.y, "SHELL!", "#22c55e");
          } else if (e.type === 'shell') {
            // Stop or kick shell
            if (e.shellMoving) {
              e.shellMoving = false;
              e.vx = 0;
            } else {
              e.shellMoving = true;
              e.vx = this.mario.facing === 'left' ? -7.5 : 7.5;
              this.playStompSound();
            }
          }
          this.updateHUD();
        } else {
          // Mario touches shell while it's stationary -> KICK IT!
          if (e.type === 'shell' && !e.shellMoving) {
            e.shellMoving = true;
            e.vx = this.mario.facing === 'left' ? -7.5 : 7.5;
            this.playStompSound();
            this.addFloatingText(e.x, e.y, "KICK!", "#facc15");
          } else if (this.mario.invulnerable <= 0) {
            // Mario takes damage
            if (this.mario.state === 'super') {
              this.mario.state = 'small';
              this.mario.h = 30;
              this.mario.invulnerable = 60;
              this.playPowerDownSound();
            } else {
              this.handleMarioDeath("Touched an enemy!");
            }
          }
        }
      }
    }
  }

  updateBlocks() {
    this.blocks.forEach(b => {
      if (b.bumpY < 0) {
        b.bumpY += 1.5;
        if (b.bumpY > 0) b.bumpY = 0;
      }

      // Piranha Plant animation in pipes
      if (b.hasPiranha) {
        b.piranhaTimer += 0.05;
        // Check if Mario is too close to pipe (stays inside)
        const dist = Math.abs((b.x + b.w / 2) - (this.mario.x + this.mario.w / 2));
        if (dist > 70) {
          b.piranhaOffset = Math.sin(b.piranhaTimer) * 28;
          if (b.piranhaOffset < 0) b.piranhaOffset = 0;
        } else {
          b.piranhaOffset = 0;
        }

        // Piranha plant bites Mario if touched
        if (b.piranhaOffset > 10 && this.mario.invulnerable <= 0) {
          const px = b.x + 14;
          const py = b.y - b.piranhaOffset;
          if (
            this.mario.x < px + 28 &&
            this.mario.x + this.mario.w > px &&
            this.mario.y < py + 28 &&
            this.mario.y + this.mario.h > py
          ) {
            if (this.mario.starTimer > 0) {
              b.hasPiranha = false;
              this.score += 200;
              this.playStompSound();
            } else if (this.mario.state === 'super') {
              this.mario.state = 'small';
              this.mario.h = 30;
              this.mario.invulnerable = 60;
              this.playPowerDownSound();
            } else {
              this.handleMarioDeath("Bitten by a Piranha Plant!");
            }
          }
        }
      }
    });
  }

  handleMarioDeath(reason) {
    if (this.mario.isDead) return;
    this.mario.isDead = true;
    this.mario.vy = -9.5;
    this.mario.deathTimer = 0;
    this.playDeathSound();
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.alpha -= p.fade;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 0.8;
      ft.life--;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  createDust(x, y) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 1.5,
        size: 3 + Math.random() * 2,
        color: '#f8fafc',
        alpha: 0.8,
        fade: 0.04
      });
    }
  }

  createCoinParticle(x, y) {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: -6,
      size: 10,
      isCoin: true,
      color: '#facc15',
      alpha: 1,
      fade: 0.03
    });
  }

  createBrickDebris(x, y) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x,
        y,
        vx: (i < 2 ? -2.5 : 2.5) + (Math.random() - 0.5),
        vy: (i % 2 === 0 ? -6 : -4),
        size: 8,
        color: '#b91c1c',
        alpha: 1,
        fade: 0.02
      });
    }
  }

  createStarSparkle(x, y) {
    const colors = ['#facc15', '#ec4899', '#38bdf8', '#4ade80'];
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      fade: 0.05
    });
  }

  addFloatingText(x, y, text, color = '#facc15') {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 40,
      maxLife: 40
    });
  }

  draw() {
    const ctx = this.ctx;
    const scale = this.canvas.width / (this.viewWidth * this.dpr);
    ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

    ctx.save();
    ctx.scale(scale, scale);

    // 1. Draw Sky Background
    this.drawBackground();

    // 2. Translate by Camera
    ctx.translate(-this.cameraX, 0);

    // 3. Draw Pit Gaps (Dark abyss & cliff borders)
    this.drawGaps();

    // 4. Draw Background Scenery (Hills, Bushes, Clouds)
    this.drawScenery();

    // 5. Draw Flagpole & Castle
    this.drawFlagpoleAndCastle();

    // 6. Draw Blocks, Ground & Pipes
    this.drawBlocks();

    // 7. Draw Items (Mushrooms, Stars)
    this.drawItems();

    // 8. Draw Enemies & Shells
    this.drawEnemies();

    // 9. Draw Mario
    this.drawMario();

    // 10. Draw Particles & Floating Text
    this.drawEffects();

    ctx.restore();
  }

  drawBackground() {
    const ctx = this.ctx;
    if (this.theme === 'overworld') {
      ctx.fillStyle = '#5c94fc'; // Classic NES Mario sky blue
    } else if (this.theme === 'underground') {
      ctx.fillStyle = '#020617'; // Dark cavern
    } else {
      ctx.fillStyle = '#1c1917'; // Castle stone
    }
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
  }

  drawGaps() {
    const ctx = this.ctx;
    const pitTop = this.groundY;
    const pitH = this.viewHeight - pitTop + 20;

    for (const g of this.gaps) {
      // Pit abyss (dark gradient falling into deep darkness)
      const grad = ctx.createLinearGradient(0, pitTop, 0, this.viewHeight);
      if (this.theme === 'castle') {
        grad.addColorStop(0, '#450a0a');
        grad.addColorStop(0.5, '#dc2626');
        grad.addColorStop(1, '#ef4444');
      } else {
        grad.addColorStop(0, 'rgba(15, 23, 42, 0.5)');
        grad.addColorStop(0.3, 'rgba(10, 15, 30, 0.9)');
        grad.addColorStop(1, '#020617');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(g.x, pitTop, g.w, pitH);

      // Left cliff edge shadow & drop-off strip
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(g.x, pitTop, 6, pitH);

      // Right cliff edge highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(g.x + g.w - 4, pitTop, 4, pitH);
    }
  }

  drawScenery() {
    if (this.theme !== 'overworld') return;

    // Clouds
    for (let i = 0; i < 16; i++) {
      const cx = i * 260 + 40;
      const cy = 55 + (i % 3) * 35;
      this.drawCloud(cx, cy);
    }

    // Green hills (sitting properly on ground, skipping gaps)
    for (let i = 0; i < 10; i++) {
      const hx = i * 380 + 120;
      const inGap = this.gaps.some(g => hx >= g.x - 55 && hx <= g.x + g.w + 55);
      if (!inGap) {
        this.drawHill(hx, this.groundY);
      }
    }

    // Bushes along the ground (skipping gaps)
    for (let i = 0; i < 12; i++) {
      const bx = i * 320 + 200;
      const inGap = this.gaps.some(g => bx >= g.x - 30 && bx <= g.x + g.w + 30);
      if (!inGap) {
        this.drawBush(bx, this.groundY);
      }
    }
  }

  drawCloud(x, y) {
    const ctx = this.ctx;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.arc(x + 16, y - 6, 20, 0, Math.PI * 2);
    ctx.arc(x + 36, y, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHill(x, groundY) {
    const ctx = this.ctx;
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(x, groundY, 65, Math.PI, 0, false);
    ctx.fill();
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  drawBush(x, groundY) {
    const ctx = this.ctx;
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x, groundY, 18, Math.PI, 0, false);
    ctx.arc(x + 20, groundY - 6, 22, Math.PI, 0, false);
    ctx.arc(x + 42, groundY, 18, Math.PI, 0, false);
    ctx.fill();
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawBlocks() {
    const ctx = this.ctx;
    for (const b of this.blocks) {
      if (b.broken) continue;
      // Frustum culling
      if (b.x + b.w < this.cameraX - 60 || b.x > this.cameraX + this.viewWidth + 60) continue;

      const bump = b.bumpY || 0;
      const drawY = b.y + bump;

      if (b.type === 'ground') {
        // Authentic Super Mario ground with rich textures
        const dirtColor = this.theme === 'underground' ? '#1e293b' : (this.theme === 'castle' ? '#3f3f46' : '#d97706');
        const grassColor = this.theme === 'underground' ? '#3b82f6' : (this.theme === 'castle' ? '#71717a' : '#22c55e');
        const grassTop = this.theme === 'underground' ? '#60a5fa' : (this.theme === 'castle' ? '#a1a1aa' : '#4ade80');
        const grassShadow = this.theme === 'underground' ? '#1d4ed8' : (this.theme === 'castle' ? '#27272a' : '#15803d');

        // Solid soil base filling down to canvas bottom
        ctx.fillStyle = dirtColor;
        ctx.fillRect(b.x, drawY, b.w, b.h);

        // Top lush green grass layer (9px)
        ctx.fillStyle = grassColor;
        ctx.fillRect(b.x, drawY, b.w, 9);
        // Grass top highlight (2px)
        ctx.fillStyle = grassTop;
        ctx.fillRect(b.x, drawY, b.w, 3);
        // Grass shadow line (2px)
        ctx.fillStyle = grassShadow;
        ctx.fillRect(b.x, drawY + 9, b.w, 3);

        // Brick mortar patterns on dirt (32x32 tiles)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x, drawY, b.w, b.h);
        ctx.strokeRect(b.x, drawY, b.w, 32);
        ctx.strokeRect(b.x, drawY + 32, b.w, 32);
        ctx.strokeRect(b.x, drawY + 64, b.w, 32);

        // Highlight pebbles on dirt
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.fillRect(b.x + 5, drawY + 16, 4, 4);
        ctx.fillRect(b.x + 18, drawY + 46, 4, 4);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(b.x + 10, drawY + 18, 4, 3);
        ctx.fillRect(b.x + 22, drawY + 48, 4, 3);
      } else if (b.type === 'pipe') {
        // --- 3D Green Super Mario Pipe ---
        // 1. Draw Piranha Plant if peeking out of pipe
        if (b.hasPiranha && b.piranhaOffset > 0) {
          const px = b.x + 14;
          const py = drawY - b.piranhaOffset;
          // Stem
          ctx.fillStyle = '#16a34a';
          ctx.fillRect(px + 8, py + 18, 12, b.piranhaOffset + 4);
          // Red round head with white spots
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(px + 14, py + 10, 14, 0, Math.PI * 2);
          ctx.fill();
          // White polka dots
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px + 8, py + 6, 3, 0, Math.PI * 2);
          ctx.arc(px + 20, py + 8, 3, 0, Math.PI * 2);
          ctx.arc(px + 14, py + 14, 3, 0, Math.PI * 2);
          ctx.fill();
          // Sharp white teeth
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(px + 6, py + 12);
          ctx.lineTo(px + 10, py + 17);
          ctx.lineTo(px + 14, py + 12);
          ctx.lineTo(px + 18, py + 17);
          ctx.lineTo(px + 22, py + 12);
          ctx.fill();
        }

        // 2. Pipe Body
        ctx.fillStyle = '#15803d'; // Dark green base
        ctx.fillRect(b.x, drawY, b.w, b.h);
        ctx.fillStyle = '#22c55e'; // Bright green cylinder highlight
        ctx.fillRect(b.x + 6, drawY, b.w - 18, b.h);
        ctx.fillStyle = '#4ade80'; // Shiny white-green reflection stripe
        ctx.fillRect(b.x + 10, drawY, 8, b.h);

        // 3. Pipe Rim Lip (Wider top)
        ctx.fillStyle = '#15803d';
        ctx.fillRect(b.x - 4, drawY, b.w + 8, 22);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(b.x - 2, drawY, b.w + 4, 20);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(b.x + 8, drawY, 8, 20);

        // Black outlines
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(b.x - 4, drawY, b.w + 8, 22);
        ctx.strokeRect(b.x, drawY + 22, b.w, b.h - 22);
      } else if (b.type === 'question') {
        if (b.hit) {
          // Empty brown block
          ctx.fillStyle = '#78350f';
          ctx.fillRect(b.x, drawY, b.w, b.h);
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x, drawY, b.w, b.h);
          // Rivets in corners
          ctx.fillStyle = '#451a03';
          ctx.fillRect(b.x + 3, drawY + 3, 3, 3);
          ctx.fillRect(b.x + b.w - 6, drawY + 3, 3, 3);
          ctx.fillRect(b.x + 3, drawY + b.h - 6, 3, 3);
          ctx.fillRect(b.x + b.w - 6, drawY + b.h - 6, 3, 3);
        } else {
          // Golden glowing [?] block
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(b.x, drawY, b.w, b.h);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(b.x + 2, drawY + 2, b.w - 4, 3);
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x, drawY, b.w, b.h);

          // Embossed rivets in corners
          ctx.fillStyle = '#78350f';
          ctx.fillRect(b.x + 3, drawY + 3, 3, 3);
          ctx.fillRect(b.x + b.w - 6, drawY + 3, 3, 3);
          ctx.fillRect(b.x + 3, drawY + b.h - 6, 3, 3);
          ctx.fillRect(b.x + b.w - 6, drawY + b.h - 6, 3, 3);

          // Centered '?' symbol
          ctx.fillStyle = '#78350f';
          ctx.font = 'bold 20px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', b.x + b.w / 2, drawY + b.h / 2);
        }
      } else if (b.type === 'brick' || b.type === 'stair') {
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(b.x, drawY, b.w, b.h);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(b.x + 2, drawY + 2, b.w - 4, 2);
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x, drawY, b.w, b.h);
        // Brick mortar lines
        ctx.beginPath();
        ctx.moveTo(b.x, drawY + 16);
        ctx.lineTo(b.x + b.w, drawY + 16);
        ctx.moveTo(b.x + 16, drawY);
        ctx.lineTo(b.x + 16, drawY + 16);
        ctx.moveTo(b.x + 8, drawY + 16);
        ctx.lineTo(b.x + 8, drawY + 32);
        ctx.stroke();
      } else if (b.type === 'coin_loose' && !b.hit) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(b.x + 12, drawY + 12, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  drawFlagpoleAndCastle() {
    const ctx = this.ctx;
    if (this.flagpole) {
      // Flagpole rod
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(this.flagpole.x + 6, this.flagpole.y, 4, this.flagpole.h);

      // Gold ball on top
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(this.flagpole.x + 8, this.flagpole.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Green flag
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(this.flagpole.x + 6, this.flagpole.flagY);
      ctx.lineTo(this.flagpole.x - 30, this.flagpole.flagY + 15);
      ctx.lineTo(this.flagpole.x + 6, this.flagpole.flagY + 30);
      ctx.fill();
    }

    if (this.castle) {
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(this.castle.x, this.castle.y, this.castle.w, this.castle.h);

      // Battlements
      for (let bx = 0; bx < this.castle.w; bx += 24) {
        ctx.fillRect(this.castle.x + bx, this.castle.y - 14, 14, 14);
      }

      // Castle arch door
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(this.castle.x + this.castle.w / 2, this.castle.y + this.castle.h - 30, 20, Math.PI, 0);
      ctx.rect(this.castle.x + this.castle.w / 2 - 20, this.castle.y + this.castle.h - 30, 40, 30);
      ctx.fill();
    }
  }

  drawItems() {
    const ctx = this.ctx;
    for (const it of this.items) {
      if (it.type === 'mushroom') {
        // Red Super Mushroom
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(it.x + 12, it.y + 10, 12, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(it.x + 4, it.y + 10, 16, 12);
        // White dots
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(it.x + 12, it.y + 6, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (it.type === 'star') {
        // Golden Star with eyes
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        const cx = it.x + 12;
        const cy = it.y + 12;
        for (let i = 0; i < 5; i++) {
          const r = i % 2 === 0 ? 12 : 5;
          const a = (i * Math.PI) / 2.5 - Math.PI / 2;
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 3, cy - 2, 2, 4);
        ctx.fillRect(cx + 2, cy - 2, 2, 4);
      }
    }
  }

  drawEnemies() {
    const ctx = this.ctx;
    for (const e of this.enemies) {
      if (e.type === 'goomba') {
        if (e.squished) {
          // Flat squished Goomba
          ctx.fillStyle = '#9a3412';
          ctx.fillRect(e.x, e.y + 18, e.w, 10);
        } else {
          // Classic Goomba
          ctx.fillStyle = '#9a3412';
          ctx.beginPath();
          ctx.arc(e.x + e.w / 2, e.y + 12, 14, Math.PI, 0);
          ctx.lineTo(e.x + e.w, e.y + 22);
          ctx.lineTo(e.x, e.y + 22);
          ctx.closePath();
          ctx.fill();

          // White eyes & pupils
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(e.x + 4, e.y + 10, 4, 7);
          ctx.fillRect(e.x + e.w - 8, e.y + 10, 4, 7);
          ctx.fillStyle = '#000000';
          ctx.fillRect(e.x + 6, e.y + 12, 2, 5);
          ctx.fillRect(e.x + e.w - 6, e.y + 12, 2, 5);

          // Walking feet
          ctx.fillStyle = '#1c1917';
          ctx.fillRect(e.x + 2, e.y + 22, 9, 6);
          ctx.fillRect(e.x + e.w - 11, e.y + 22, 9, 6);
        }
      } else if (e.type === 'koopa') {
        // Green Koopa Troopa (Turtle)
        // Green Shell
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(e.x + 12, e.y + 18, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Yellow head & beak
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(e.x + (e.vx < 0 ? 6 : 18), e.y + 8, 8, 0, Math.PI * 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = '#000000';
        ctx.fillRect(e.x + (e.vx < 0 ? 4 : 18), e.y + 6, 2, 4);

        // Feet
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(e.x + 4, e.y + 26, 8, 6);
        ctx.fillRect(e.x + 16, e.y + 26, 8, 6);
      } else if (e.type === 'shell') {
        // Retracted Turtle Shell (Kickable!)
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(e.x + 14, e.y + 12, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Hexagon center pattern
        ctx.fillStyle = '#eab308';
        ctx.fillRect(e.x + 10, e.y + 8, 8, 8);
      }
    }
  }

  drawMario() {
    const m = this.mario;
    const ctx = this.ctx;

    // Flashing when invulnerable
    if (m.invulnerable > 0 && Math.floor(m.invulnerable / 4) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(m.x + m.w / 2, m.y + m.h / 2);

    if (m.facing === 'left') {
      ctx.scale(-1, 1);
    }

    const hw = m.w / 2;
    const hh = m.h / 2;

    if (m.isDead) {
      // Classic Mario death pose
      ctx.fillStyle = '#e52521';
      ctx.fillRect(-hw, -hh, m.w, m.h);
      ctx.restore();
      return;
    }

    // Star Power rainbow color cycling!
    let shirtColor = '#e52521';
    let overallsColor = '#2563eb';
    if (m.starTimer > 0) {
      const rainbow = ['#e52521', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
      const cIdx = Math.floor(m.starTimer / 6) % rainbow.length;
      shirtColor = rainbow[cIdx];
      overallsColor = rainbow[(cIdx + 2) % rainbow.length];
    }

    // 1. Hat & Cap
    ctx.fillStyle = shirtColor;
    ctx.fillRect(-hw + 2, -hh, m.w - 2, 8);
    ctx.fillRect(-hw + 4, -hh + 4, m.w + 2, 4); // brim

    // 2. Face & Nose
    ctx.fillStyle = '#fed7aa'; // Skin tone
    ctx.fillRect(-hw + 4, -hh + 8, m.w - 6, 8);
    ctx.fillRect(hw - 2, -hh + 9, 5, 5); // Nose
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-hw + 8, -hh + 12, 10, 4); // Mustache
    ctx.fillRect(-hw + 10, -hh + 8, 3, 4); // Eye

    // 3. Shirt & Torso
    ctx.fillStyle = shirtColor;
    ctx.fillRect(-hw + 2, -hh + 16, m.w - 4, m.h - 22);

    // 4. Overalls
    ctx.fillStyle = overallsColor;
    ctx.fillRect(-hw + 4, -hh + 18, m.w - 8, m.h - 22);
    // Yellow buttons
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-hw + 5, -hh + 20, 2, 2);
    ctx.fillRect(hw - 7, -hh + 20, 2, 2);

    // 5. Shoes
    ctx.fillStyle = '#78350f';
    if (!m.isGrounded) {
      // Jump pose with legs spread
      ctx.fillRect(-hw, hh - 6, 9, 6);
      ctx.fillRect(hw - 7, hh - 8, 9, 6);
    } else if (m.runFrame === 1) {
      ctx.fillRect(-hw - 2, hh - 6, 10, 6);
      ctx.fillRect(hw - 6, hh - 6, 10, 6);
    } else {
      ctx.fillRect(-hw, hh - 6, 9, 6);
      ctx.fillRect(hw - 9, hh - 6, 9, 6);
    }

    ctx.restore();
  }

  drawEffects() {
    const ctx = this.ctx;

    // Particles
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      if (p.isCoin) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.restore();
    });

    // Floating Texts
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillStyle = ft.color;
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  updateHUD() {
    const scoreEl = document.getElementById('marioScoreVal');
    const coinsEl = document.getElementById('marioCoinsVal');
    const worldEl = document.getElementById('marioWorldVal');
    const timeEl = document.getElementById('marioTimeVal');
    const livesEl = document.getElementById('marioLivesVal');

    if (scoreEl) scoreEl.textContent = String(this.score).padStart(6, '0');
    if (coinsEl) coinsEl.textContent = `🪙 x ${String(this.coins).padStart(2, '0')}`;
    if (worldEl) worldEl.textContent = `1-${this.currentLevel + 1}`;
    if (timeEl) timeEl.textContent = String(this.time).padStart(3, '0');
    if (livesEl) livesEl.textContent = `❤️ x ${this.lives}`;
  }

  showEndGameModal(data) {
    const modal = document.getElementById('gameEndModal');
    if (!modal) return;

    const titleEl = document.getElementById('endModalTitle');
    const badgeEl = document.getElementById('endModalBadge');
    const descEl = document.getElementById('endModalDesc');
    const statsEl = document.getElementById('endModalStats');
    const nextBtn = document.getElementById('btnNextLevel');

    if (data.won) {
      titleEl.innerHTML = `🌟 STAGE CLEAR!`;
      badgeEl.className = 'end-badge victory';
      badgeEl.textContent = 'SUPER MARIO CHAMPION ⭐⭐⭐';
      descEl.textContent = `You cleared ${data.level} like a true Mario pro!`;

      statsEl.innerHTML = `
        <div class="end-stat-card">
          <span class="end-stat-label">Total Score</span>
          <span class="end-stat-val text-gold">${data.score}</span>
        </div>
        <div class="end-stat-card">
          <span class="end-stat-label">Coins Collected</span>
          <span class="end-stat-val text-cyan">${data.coins} 🪙</span>
        </div>
      `;

      if (this.currentLevel < this.levelNames.length - 1) {
        nextBtn.style.display = 'inline-flex';
      } else {
        nextBtn.style.display = 'none';
      }
    } else {
      titleEl.innerHTML = `💀 GAME OVER`;
      badgeEl.className = 'end-badge defeat';
      badgeEl.textContent = 'TRY AGAIN';
      descEl.textContent = data.reason;

      statsEl.innerHTML = `
        <div class="end-stat-card">
          <span class="end-stat-label">Final Score</span>
          <span class="end-stat-val text-gold">${this.score}</span>
        </div>
        <div class="end-stat-card">
          <span class="end-stat-label">Coins</span>
          <span class="end-stat-val">${this.coins} 🪙</span>
        </div>
      `;
      nextBtn.style.display = 'none';
    }

    modal.classList.add('visible');
  }

  // Audio Synthesizers
  playJumpSound() {
    if (!this.audio || this.audio.muted) return;
    this.audio.init();
    if (!this.audio.ctx) return;
    const ctx = this.audio.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  }

  playCoinSound() {
    if (!this.audio || this.audio.muted) return;
    this.audio.init();
    if (!this.audio.ctx) return;
    const ctx = this.audio.ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
    osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  playStompSound() {
    if (!this.audio || this.audio.muted) return;
    this.audio.playTone(180, 'triangle', 0.1, 0.2);
  }

  playBumpSound() {
    if (!this.audio || this.audio.muted) return;
    this.audio.playTone(110, 'square', 0.08, 0.15);
  }

  playBlockBreakSound() {
    if (!this.audio || this.audio.muted) return;
    this.audio.playTone(220, 'sawtooth', 0.12, 0.18);
  }

  playPowerUpAppearsSound() {
    if (!this.audio || this.audio.muted) return;
    this.audio.playTone(587, 'triangle', 0.15, 0.14);
  }

  playPowerUpSound() {
    if (!this.audio || this.audio.muted) return;
    const notes = [330, 392, 659, 523, 587, 784];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.audio.playTone(freq, 'triangle', 0.1, 0.15);
      }, idx * 60);
    });
  }

  playPowerDownSound() {
    if (!this.audio || this.audio.muted) return;
    this.audio.playTone(140, 'sawtooth', 0.2, 0.2);
  }

  playFlagpoleSound() {
    if (!this.audio || this.audio.muted) return;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.audio.playTone(freq, 'triangle', 0.12, 0.18);
      }, idx * 80);
    });
  }

  playStageClearFanfare() {
    if (!this.audio || this.audio.muted) return;
    const chords = [
      { f: 523.25, t: 0 },
      { f: 659.25, t: 120 },
      { f: 783.99, t: 240 },
      { f: 1046.50, t: 360 },
      { f: 1046.50, t: 550 }
    ];
    chords.forEach(c => {
      setTimeout(() => {
        this.audio.playTone(c.f, 'triangle', 0.25, 0.2);
      }, c.t);
    });
  }

  playDeathSound() {
    if (!this.audio || this.audio.muted) return;
    const notes = [500, 450, 400, 350, 300, 250, 200];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.audio.playTone(f, 'sawtooth', 0.1, 0.16);
      }, i * 90);
    });
  }
}
