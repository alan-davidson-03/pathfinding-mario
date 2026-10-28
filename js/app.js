import { Grid } from './grid.js';
import { DijkstraEngine } from './dijkstra.js';
import { DungeonRenderer } from './renderer.js';
import { SoundFX } from './audio.js';
import { TERRAIN_TYPES, getTerrain } from './terrain.js';
import { MarioGame } from './game.js';

class DungeonApp {
  constructor() {
    this.canvas = document.getElementById('dungeonCanvas');
    this.grid = new Grid(12, 8);
    this.renderer = new DungeonRenderer(this.canvas);
    this.renderer.setGrid(this.grid);
    this.audio = new SoundFX();

    // Mode management: 'PATH' | 'GAME'
    this.mode = 'PATH';
    this.gameCanvas = document.getElementById('gameCanvas');
    this.game = new MarioGame(this.gameCanvas, this.audio);

    // Application state
    this.state = 'IDLE'; // 'IDLE' | 'RUNNING' | 'PAUSED' | 'MOVING_HERO' | 'COMPLETED'
    this.activeTool = 'GRASS'; // 'GRASS' | 'ROAD' | 'SAND' | 'MUD' | 'LAVA' | 'WALL' | 'START' | 'GOAL' | 'ERASER'
    this.isMouseDown = false;
    this.draggingTarget = null; // 'START' | 'GOAL' | null

    // Algorithm animation runner
    this.generator = null;
    this.timerId = null;
    this.speedMs = 35; // delay between steps
    this.stats = {
      pathCost: 0,
      pathLength: 0,
      nodesExplored: 0,
      pqSize: 0,
      execTime: 0
    };

    // Hero movement animation
    this.heroPath = [];
    this.heroStepIndex = 0;
    this.heroMoveTimer = null;

    this.initDOM();
    this.bindEvents();
    this.loadPreset('lava-trap');
    this.initWelcomeModal();
  }

  initDOM() {
    // Mode Switcher & Views
    this.btnSwitchPath = document.getElementById('btnSwitchPath');
    this.btnSwitchGame = document.getElementById('btnSwitchGame');
    this.pathfindingView = document.getElementById('pathfindingView');
    this.gameView = document.getElementById('gameView');
    this.headerPresetGroup = document.getElementById('headerPresetGroup');
    this.headerGridSizeGroup = document.getElementById('headerGridSizeGroup');

    // Welcome Modal elements
    this.welcomeModal = document.getElementById('welcomeModal');
    this.btnLaunchPath = document.getElementById('btnLaunchPath');
    this.btnLaunchGame = document.getElementById('btnLaunchGame');
    this.cardChoosePath = document.getElementById('cardChoosePath');
    this.cardChooseGame = document.getElementById('cardChooseGame');

    // Mario arcade controls
    this.gameLevelSelect = document.getElementById('gameLevelSelect');
    this.btnGameRestart = document.getElementById('btnGameRestart');
    this.btnGameNext = document.getElementById('btnGameNext');
    this.gameEndModal = document.getElementById('gameEndModal');
    this.btnModalRetry = document.getElementById('btnModalRetry');
    this.btnNextLevel = document.getElementById('btnNextLevel');
    this.btnModalInspect = document.getElementById('btnModalInspect');
    this.marioWorldHeading = document.getElementById('marioWorldHeading');

    // Mario on-screen touch/mouse buttons
    this.btnMarioLeft = document.getElementById('btnMarioLeft');
    this.btnMarioRight = document.getElementById('btnMarioRight');
    this.btnMarioJump = document.getElementById('btnMarioJump');
    this.btnMarioSprint = document.getElementById('btnMarioSprint');

    // Cache UI elements
    this.btnRun = document.getElementById('btnRun');
    this.btnPause = document.getElementById('btnPause');
    this.btnStep = document.getElementById('btnStep');
    this.btnInstant = document.getElementById('btnInstant');
    this.btnReset = document.getElementById('btnReset');
    this.btnClearWalls = document.getElementById('btnClearWalls');
    this.btnRandomize = document.getElementById('btnRandomize');
    this.presetSelect = document.getElementById('presetSelect');
    this.gridSizeSelect = document.getElementById('gridSizeSelect');
    this.speedSlider = document.getElementById('speedSlider');
    this.speedValue = document.getElementById('speedValue');

    this.chkCosts = document.getElementById('chkCosts');
    this.chkDistances = document.getElementById('chkDistances');
    this.chkArrows = document.getElementById('chkArrows');
    this.chkBFS = document.getElementById('chkBFS');
    this.btnAudioToggle = document.getElementById('btnAudioToggle');

    // Stats elements
    this.statCost = document.getElementById('statCost');
    this.statLength = document.getElementById('statLength');
    this.statExplored = document.getElementById('statExplored');
    this.statFrontier = document.getElementById('statFrontier');
    this.statTime = document.getElementById('statTime');

    // Pseudocode & Live inspector
    this.codeLines = document.querySelectorAll('.code-line');
    this.logContainer = document.getElementById('activityLog');
    this.cellInspector = document.getElementById('cellInspector');
    this.comparisonBanner = document.getElementById('comparisonBanner');
  }

  bindEvents() {
    // Window resize
    window.addEventListener('resize', () => {
      this.renderer.resizeCanvas();
    });

    // Tool Palette buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        const targetBtn = e.currentTarget;
        targetBtn.classList.add('active');
        this.activeTool = targetBtn.dataset.tool;
        this.audio.playTone(520, 'sine', 0.04, 0.05);
      });
    });

    // Controls
    this.btnRun.addEventListener('click', () => this.startAlgorithm());
    this.btnPause.addEventListener('click', () => this.togglePause());
    this.btnStep.addEventListener('click', () => this.stepAlgorithm());
    this.btnInstant.addEventListener('click', () => this.instantSolve());
    this.btnReset.addEventListener('click', () => this.resetSimulation());
    this.btnClearWalls.addEventListener('click', () => {
      this.grid.clearWalls();
      this.resetSimulation();
      this.audio.playTone(260, 'sine', 0.08, 0.1);
    });
    this.btnRandomize.addEventListener('click', () => {
      this.grid.randomizeTerrain();
      this.resetSimulation();
      this.audio.playTone(390, 'triangle', 0.08, 0.1);
    });

    // Presets
    this.presetSelect.addEventListener('change', (e) => {
      this.loadPreset(e.target.value);
    });

    // Grid Size
    this.gridSizeSelect.addEventListener('change', (e) => {
      const [cols, rows] = e.target.value.split('x').map(Number);
      this.grid.resize(cols, rows);
      this.renderer.setGrid(this.grid);
      this.resetSimulation();
    });

    // Speed slider
    this.speedSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      // Slider 1-100: invert so right is faster
      this.speedMs = Math.max(0, Math.floor(160 * Math.pow((100 - val) / 100, 2)));
      this.speedValue.textContent = val >= 98 ? 'Turbo' : `${val}%`;
    });

    // Toggles
    this.chkCosts.addEventListener('change', (e) => {
      this.renderer.showCosts = e.target.checked;
    });
    this.chkDistances.addEventListener('change', (e) => {
      this.renderer.showDistances = e.target.checked;
    });
    this.chkArrows.addEventListener('change', (e) => {
      this.renderer.showArrows = e.target.checked;
    });
    this.chkBFS.addEventListener('change', (e) => {
      this.renderer.showBFSOverlay = e.target.checked;
      this.updateBFSComparison();
    });
    this.btnAudioToggle.addEventListener('click', () => {
      const muted = !this.audio.muted;
      this.audio.setMuted(muted);
      this.btnAudioToggle.textContent = muted ? '🔇 Sound Off' : '🔊 Sound On';
      this.btnAudioToggle.classList.toggle('active', !muted);
    });

    // Canvas Mouse & Touch Painting
    this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handlePointerMove(e));
    window.addEventListener('mouseup', () => this.handlePointerUp());

    // Canvas Touch
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handlePointerDown(touch);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handlePointerMove(touch);
    }, { passive: false });

    window.addEventListener('touchend', () => this.handlePointerUp());

    // Cell Inspector on Mouse Hover
    this.canvas.addEventListener('mousemove', (e) => {
      const cell = this.renderer.screenToCell(e.clientX, e.clientY);
      this.updateCellInspector(cell);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.updateCellInspector(null);
    });

    // Mode Switcher buttons
    if (this.btnSwitchPath) {
      this.btnSwitchPath.addEventListener('click', () => this.switchMode('PATH'));
    }
    if (this.btnSwitchGame) {
      this.btnSwitchGame.addEventListener('click', () => this.switchMode('GAME'));
    }

    // Welcome Modal buttons & card clicks
    if (this.btnLaunchPath) {
      this.btnLaunchPath.addEventListener('click', () => {
        this.closeWelcomeModal();
        this.switchMode('PATH');
      });
    }
    if (this.cardChoosePath) {
      this.cardChoosePath.addEventListener('click', (e) => {
        if (e.target !== this.btnLaunchPath) {
          this.closeWelcomeModal();
          this.switchMode('PATH');
        }
      });
    }

    if (this.btnLaunchGame) {
      this.btnLaunchGame.addEventListener('click', () => {
        this.closeWelcomeModal();
        this.switchMode('GAME');
      });
    }
    if (this.cardChooseGame) {
      this.cardChooseGame.addEventListener('click', (e) => {
        if (e.target !== this.btnLaunchGame) {
          this.closeWelcomeModal();
          this.switchMode('GAME');
        }
      });
    }

    // Game level select
    if (this.gameLevelSelect) {
      this.gameLevelSelect.addEventListener('change', (e) => {
        const lvl = parseInt(e.target.value, 10);
        this.game.loadLevel(lvl);
      });
    }

    // Mario Stage select
    if (this.gameLevelSelect) {
      this.gameLevelSelect.addEventListener('change', (e) => {
        const lvl = parseInt(e.target.value, 10);
        this.game.loadLevel(lvl);
        if (this.marioWorldHeading) {
          this.marioWorldHeading.textContent = `🍄 Super Mario Bros — World 1-${lvl + 1}`;
        }
      });
    }

    if (this.btnGameRestart) {
      this.btnGameRestart.addEventListener('click', () => {
        this.game.loadLevel(this.game.currentLevel);
      });
    }
    if (this.btnGameNext) {
      this.btnGameNext.addEventListener('click', () => {
        const next = (this.game.currentLevel + 1) % this.game.levelNames.length;
        if (this.gameLevelSelect) this.gameLevelSelect.value = next;
        this.game.loadLevel(next);
        if (this.marioWorldHeading) {
          this.marioWorldHeading.textContent = `🍄 Super Mario Bros — World 1-${next + 1}`;
        }
      });
    }

    // Mario On-Screen Buttons
    const bindBtnHold = (btn, onDown, onUp) => {
      if (!btn) return;
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); onDown(); });
      btn.addEventListener('mouseup', (e) => { e.preventDefault(); onUp(); });
      btn.addEventListener('mouseleave', (e) => { e.preventDefault(); onUp(); });
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); }, { passive: false });
      btn.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); }, { passive: false });
    };

    bindBtnHold(this.btnMarioLeft, () => { this.game.keys.left = true; }, () => { this.game.keys.left = false; });
    bindBtnHold(this.btnMarioRight, () => { this.game.keys.right = true; }, () => { this.game.keys.right = false; });
    bindBtnHold(this.btnMarioSprint, () => { this.game.keys.sprint = true; }, () => { this.game.keys.sprint = false; });
    bindBtnHold(
      this.btnMarioJump,
      () => {
        if (this.game.mario.isGrounded) {
          this.game.mario.vy = this.game.jumpForce;
          this.game.mario.isGrounded = false;
          this.game.mario.isJumping = true;
          this.game.playJumpSound();
        }
        this.game.keys.up = true;
      },
      () => {
        this.game.keys.up = false;
        if (this.game.mario.vy < -3) this.game.mario.vy *= 0.45;
      }
    );

    // End Game Modal buttons
    if (this.btnModalRetry) {
      this.btnModalRetry.addEventListener('click', () => {
        if (this.gameEndModal) this.gameEndModal.classList.remove('visible');
        this.game.loadLevel(this.game.currentLevel);
      });
    }
    if (this.btnNextLevel) {
      this.btnNextLevel.addEventListener('click', () => {
        if (this.gameEndModal) this.gameEndModal.classList.remove('visible');
        const next = Math.min(this.game.levelNames.length - 1, this.game.currentLevel + 1);
        if (this.gameLevelSelect) this.gameLevelSelect.value = next;
        this.game.loadLevel(next);
        if (this.marioWorldHeading) {
          this.marioWorldHeading.textContent = `🍄 Super Mario Bros — World 1-${next + 1}`;
        }
      });
    }
    if (this.btnModalInspect) {
      this.btnModalInspect.addEventListener('click', () => {
        if (this.gameEndModal) this.gameEndModal.classList.remove('visible');
        this.switchMode('PATH');
      });
    }
  }

  initWelcomeModal() {
    if (this.welcomeModal) {
      setTimeout(() => {
        this.welcomeModal.classList.add('visible');
      }, 150);
    }
  }

  closeWelcomeModal() {
    if (this.welcomeModal) {
      this.welcomeModal.classList.remove('visible');
    }
  }

  switchMode(newMode) {
    this.mode = newMode;
    if (newMode === 'PATH') {
      if (this.btnSwitchPath) this.btnSwitchPath.classList.add('active');
      if (this.btnSwitchGame) this.btnSwitchGame.classList.remove('active');
      if (this.pathfindingView) this.pathfindingView.classList.remove('hidden-view');
      if (this.gameView) this.gameView.classList.add('hidden-view');
      if (this.headerPresetGroup) this.headerPresetGroup.style.display = 'flex';
      if (this.headerGridSizeGroup) this.headerGridSizeGroup.style.display = 'flex';
      this.renderer.resizeCanvas();
      this.audio.playTone(480, 'sine', 0.05, 0.08);
    } else if (newMode === 'GAME') {
      if (this.btnSwitchGame) this.btnSwitchGame.classList.add('active');
      if (this.btnSwitchPath) this.btnSwitchPath.classList.remove('active');
      if (this.gameView) this.gameView.classList.remove('hidden-view');
      if (this.pathfindingView) this.pathfindingView.classList.add('hidden-view');
      if (this.headerPresetGroup) this.headerPresetGroup.style.display = 'none';
      if (this.headerGridSizeGroup) this.headerGridSizeGroup.style.display = 'none';
      this.game.loadLevel(this.game.currentLevel);
      this.game.resizeCanvas();
      this.audio.playTone(659, 'triangle', 0.08, 0.12);
    }
  }

  handlePointerDown(e) {
    if (this.state === 'RUNNING' || this.state === 'MOVING_HERO') return;
    const cellCoord = this.renderer.screenToCell(e.clientX, e.clientY);
    if (!cellCoord) return;

    this.isMouseDown = true;

    // Check if dragging start or goal
    if (cellCoord.x === this.grid.start.x && cellCoord.y === this.grid.start.y) {
      this.draggingTarget = 'START';
      return;
    }
    if (cellCoord.x === this.grid.goal.x && cellCoord.y === this.grid.goal.y) {
      this.draggingTarget = 'GOAL';
      return;
    }

    this.draggingTarget = null;
    this.applyTool(cellCoord.x, cellCoord.y);
  }

  handlePointerMove(e) {
    if (!this.isMouseDown) return;
    const cellCoord = this.renderer.screenToCell(e.clientX, e.clientY);
    if (!cellCoord) return;

    if (this.draggingTarget === 'START') {
      if (this.grid.setStart(cellCoord.x, cellCoord.y)) {
        this.renderer.hero.x = cellCoord.x;
        this.renderer.hero.y = cellCoord.y;
        this.resetSimulation();
        this.audio.playTone(440, 'triangle', 0.03, 0.08);
      }
      return;
    }

    if (this.draggingTarget === 'GOAL') {
      if (this.grid.setGoal(cellCoord.x, cellCoord.y)) {
        this.resetSimulation();
        this.audio.playTone(550, 'triangle', 0.03, 0.08);
      }
      return;
    }

    this.applyTool(cellCoord.x, cellCoord.y);
  }

  handlePointerUp() {
    this.isMouseDown = false;
    this.draggingTarget = null;
  }

  applyTool(x, y) {
    if (this.activeTool === 'START') {
      this.grid.setStart(x, y);
      this.renderer.hero.x = x;
      this.renderer.hero.y = y;
      this.resetSimulation();
      this.audio.playTone(440, 'sine', 0.04, 0.08);
      return;
    }
    if (this.activeTool === 'GOAL') {
      this.grid.setGoal(x, y);
      this.resetSimulation();
      this.audio.playTone(550, 'sine', 0.04, 0.08);
      return;
    }
    if (this.activeTool === 'ERASER') {
      this.grid.setTerrain(x, y, 'GRASS');
      this.resetSimulation();
      this.audio.playTone(300, 'sine', 0.03, 0.05);
      return;
    }

    // Paint selected terrain
    const changed = this.grid.setTerrain(x, y, this.activeTool);
    if (changed) {
      this.resetSimulation();
      this.audio.playPaint(this.activeTool);
    }
  }

  loadPreset(presetId) {
    this.resetSimulation();
    this.grid.loadPreset(presetId);
    this.renderer.setGrid(this.grid);
    this.renderer.hero.x = this.grid.start.x;
    this.renderer.hero.y = this.grid.start.y;
    this.gridSizeSelect.value = `${this.grid.cols}x${this.grid.rows}`;
    this.log(`Loaded scenario: "${presetId.replace('-', ' ').toUpperCase()}"`);
    this.updateBFSComparison();
  }

  startAlgorithm() {
    if (this.state === 'RUNNING') return;

    if (this.state === 'PAUSED' && this.generator) {
      // Resume from paused
      this.setState('RUNNING');
      this.scheduleNextStep();
      return;
    }

    this.resetSimulation();
    this.setState('RUNNING');
    this.generator = DijkstraEngine.runGenerator(this.grid);
    this.log('🚀 Initiating Dijkstra shortest path search...');
    this.scheduleNextStep();
  }

  scheduleNextStep() {
    if (this.state !== 'RUNNING') return;

    if (this.speedMs <= 2) {
      // Run multiple steps per frame in turbo mode
      for (let i = 0; i < 15; i++) {
        if (!this.executeStep()) return;
      }
      this.timerId = requestAnimationFrame(() => this.scheduleNextStep());
    } else {
      this.timerId = setTimeout(() => {
        if (this.executeStep()) {
          this.scheduleNextStep();
        }
      }, this.speedMs);
    }
  }

  stepAlgorithm() {
    if (this.state === 'IDLE' || this.state === 'COMPLETED') {
      this.resetSimulation();
      this.generator = DijkstraEngine.runGenerator(this.grid);
      this.setState('PAUSED');
    } else if (this.state === 'RUNNING') {
      this.togglePause();
      return;
    }
    this.executeStep();
  }

  togglePause() {
    if (this.state === 'RUNNING') {
      this.setState('PAUSED');
      if (this.timerId) clearTimeout(this.timerId);
      this.log('⏸ Algorithm execution paused.');
    } else if (this.state === 'PAUSED') {
      this.setState('RUNNING');
      this.log('▶ Resuming algorithm execution...');
      this.scheduleNextStep();
    }
  }

  executeStep() {
    if (!this.generator) return false;

    const { value: step, done } = this.generator.next();

    if (done || !step) {
      this.setState('COMPLETED');
      return false;
    }

    this.highlightCodeLine(step.codeLine);

    if (step.explanation) {
      this.log(step.explanation);
    }

    if (step.type === 'VISIT_NODE') {
      this.stats.nodesExplored = step.nodesExplored;
      this.stats.pqSize = step.pqSize;
      this.updateStatsDisplay();
      this.audio.playExplore(step.dist);
    } else if (step.type === 'RELAX_SUCCESS') {
      this.stats.pqSize = step.pqSize;
      this.updateStatsDisplay();
      this.audio.playRelax();
    } else if (step.type === 'PATH_FOUND') {
      this.stats.pathCost = step.totalCost;
      this.stats.pathLength = step.path.length;
      this.stats.nodesExplored = step.nodesExplored;
      this.stats.execTime = step.execTime;
      this.updateStatsDisplay();

      this.audio.playPathFound();
      this.updateBFSComparison();

      // Launch animated AI character
      this.animateHeroAlongPath(step.path);
      return false;

    } else if (step.type === 'NO_PATH') {
      this.stats.nodesExplored = step.nodesExplored;
      this.stats.execTime = step.execTime;
      this.updateStatsDisplay();
      this.setState('COMPLETED');
      this.log('⚠️ No walkable path could reach the Goal!');
      this.audio.playTone(180, 'sawtooth', 0.25, 0.15);
      return false;
    }

    return true;
  }

  instantSolve() {
    this.resetSimulation();
    this.setState('IDLE');

    const result = DijkstraEngine.solveInstant(this.grid);
    if (result.found) {
      this.stats.pathCost = result.totalCost;
      this.stats.pathLength = result.pathLength;
      this.stats.nodesExplored = result.nodesExplored;
      this.stats.execTime = result.execTime;
      this.updateStatsDisplay();
      this.audio.playPathFound();
      this.updateBFSComparison();
      this.log(`✨ Instantly solved in ${result.execTime.toFixed(2)}ms! Lowest movement cost: ${result.totalCost}`);
      this.animateHeroAlongPath(result.path);
    } else {
      this.log('⚠️ No valid path to goal.');
      this.audio.playTone(180, 'sawtooth', 0.25, 0.15);
    }
  }

  animateHeroAlongPath(path) {
    if (!path || path.length === 0) {
      this.setState('COMPLETED');
      return;
    }

    this.setState('MOVING_HERO');
    this.heroPath = path;
    this.heroStepIndex = 0;
    this.renderer.hero.active = true;
    this.renderer.hero.x = path[0].x;
    this.renderer.hero.y = path[0].y;

    const moveNext = () => {
      if (this.heroStepIndex >= this.heroPath.length - 1) {
        // Reached destination!
        this.setState('COMPLETED');
        this.renderer.spawnVictoryConfetti(this.grid.goal.x, this.grid.goal.y);
        this.audio.playVictory();
        this.log('🎉 AI Adventurer reached the Treasure Chest safely!');
        return;
      }

      this.heroStepIndex++;
      const current = this.heroPath[this.heroStepIndex - 1];
      const next = this.heroPath[this.heroStepIndex];

      // Facing orientation
      if (next.x > current.x) this.renderer.hero.facing = 'right';
      else if (next.x < current.x) this.renderer.hero.facing = 'left';

      // Animate movement interpolation
      const stepDuration = 180;
      const startTime = performance.now();

      const animateMove = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / stepDuration);
        // Smooth ease-in-out
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        this.renderer.hero.x = current.x + (next.x - current.x) * ease;
        this.renderer.hero.y = current.y + (next.y - current.y) * ease;

        if (t < 1) {
          requestAnimationFrame(animateMove);
        } else {
          this.renderer.hero.x = next.x;
          this.renderer.hero.y = next.y;
          this.renderer.spawnStepParticles(next.x, next.y);
          this.audio.playHeroStep();
          this.heroMoveTimer = setTimeout(moveNext, 40);
        }
      };

      requestAnimationFrame(animateMove);
    };

    this.heroMoveTimer = setTimeout(moveNext, 120);
  }

  resetSimulation() {
    if (this.timerId) clearTimeout(this.timerId);
    if (this.heroMoveTimer) clearTimeout(this.heroMoveTimer);
    this.generator = null;
    this.grid.resetAlgorithmState();
    this.renderer.hero.active = false;
    this.renderer.hero.x = this.grid.start.x;
    this.renderer.hero.y = this.grid.start.y;
    this.stats = { pathCost: 0, pathLength: 0, nodesExplored: 0, pqSize: 0, execTime: 0 };
    this.updateStatsDisplay();
    this.highlightCodeLine(null);
    this.setState('IDLE');
  }

  setState(newState) {
    this.state = newState;

    this.btnRun.disabled = (newState === 'RUNNING' || newState === 'MOVING_HERO');
    this.btnPause.disabled = (newState !== 'RUNNING' && newState !== 'PAUSED');
    this.btnStep.disabled = (newState === 'RUNNING' || newState === 'MOVING_HERO');
    this.btnInstant.disabled = (newState === 'RUNNING' || newState === 'MOVING_HERO');

    this.btnPause.textContent = newState === 'PAUSED' ? '▶ Resume' : '⏸ Pause';
  }

  updateStatsDisplay() {
    this.statCost.textContent = this.stats.pathCost;
    this.statLength.textContent = this.stats.pathLength;
    this.statExplored.textContent = this.stats.nodesExplored;
    this.statFrontier.textContent = this.stats.pqSize;
    this.statTime.textContent = `${this.stats.execTime.toFixed(2)} ms`;
  }

  highlightCodeLine(lineNum) {
    this.codeLines.forEach(line => {
      if (lineNum && Number(line.dataset.line) === lineNum) {
        line.classList.add('active');
      } else {
        line.classList.remove('active');
      }
    });
  }

  log(msg) {
    if (!this.logContainer) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = msg;
    this.logContainer.prepend(entry);

    // Keep log clean and fast
    while (this.logContainer.children.length > 30) {
      this.logContainer.removeChild(this.logContainer.lastChild);
    }
  }

  updateCellInspector(coord) {
    if (!coord) {
      this.cellInspector.innerHTML = `<span class="inspector-hint">Hover over any tile to inspect graph properties</span>`;
      return;
    }

    const cell = this.grid.getCell(coord.x, coord.y);
    if (!cell) return;

    const terrain = getTerrain(cell.terrain);
    const isStart = coord.x === this.grid.start.x && coord.y === this.grid.start.y;
    const isGoal = coord.x === this.grid.goal.x && coord.y === this.grid.goal.y;

    const role = isStart ? '🧙 Start' : isGoal ? '🏆 Goal' : terrain.name;
    const distText = cell.dist === Infinity ? '∞ (Unreached)' : `${cell.dist}`;
    const parentText = cell.prev ? `(${cell.prev.x}, ${cell.prev.y})` : 'None';

    this.cellInspector.innerHTML = `
      <div class="inspector-row">
        <strong>${role}</strong> <span class="inspector-coord">(${cell.x}, ${cell.y})</span>
      </div>
      <div class="inspector-details">
        <span>Movement Cost: <strong>+${cell.cost === Infinity ? 'Blocked' : cell.cost}</strong></span>
        <span>Known Distance: <strong>${distText}</strong></span>
        <span>Previous Node: <strong>${parentText}</strong></span>
        <span>State: <strong class="state-${cell.state}">${cell.state.toUpperCase()}</strong></span>
      </div>
    `;
  }

  updateBFSComparison() {
    const dijkstraSol = DijkstraEngine.solveInstant(this.grid);
    const bfsSol = DijkstraEngine.solveUnweightedBFS(this.grid);

    this.renderer.bfsPath = bfsSol.found ? bfsSol.path : null;

    if (!dijkstraSol.found || !bfsSol.found) {
      this.comparisonBanner.innerHTML = `<span>⚔️ Dynamic Analysis: Modify terrain to test shortest path vs cheapest path!</span>`;
      return;
    }

    const costDiff = bfsSol.totalCost - dijkstraSol.totalCost;
    const tileDiff = dijkstraSol.pathLength - bfsSol.pathLength;

    if (costDiff > 0) {
      this.comparisonBanner.innerHTML = `
        <div class="comparison-highlight success">
          <strong>⚖️ Dijkstra Proves Weighted Superiority!</strong>
          BFS took fewer tiles (<strong>${bfsSol.pathLength}</strong> vs <strong>${dijkstraSol.pathLength}</strong>), but stepped through expensive hazards! Total Cost: BFS = <span class="cost-high">${bfsSol.totalCost}</span> vs Dijkstra = <span class="cost-low">${dijkstraSol.totalCost}</span> (Saved <strong>${costDiff}</strong> cost!).
        </div>
      `;
    } else if (costDiff === 0 && tileDiff === 0) {
      this.comparisonBanner.innerHTML = `
        <div class="comparison-highlight neutral">
          <strong>⚖️ Paths Identical:</strong> Both Dijkstra and BFS chose the same route of <strong>${dijkstraSol.pathLength}</strong> tiles with cost <strong>${dijkstraSol.totalCost}</strong>.
        </div>
      `;
    } else {
      this.comparisonBanner.innerHTML = `
        <div class="comparison-highlight info">
          <strong>⚖️ Dijkstra Optimal:</strong> Found optimal route with cost <strong>${dijkstraSol.totalCost}</strong> across <strong>${dijkstraSol.pathLength}</strong> tiles.
        </div>
      `;
    }
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new DungeonApp();
});
