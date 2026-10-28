import { TERRAIN_TYPES, getTerrain } from './terrain.js';

export class DungeonRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = null;
    this.tileSize = 64;
    this.dpr = window.devicePixelRatio || 1;

    // Polyfill roundRect if older browser
    if (!CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
        this.beginPath();
        this.moveTo(x + r.tl, y);
        this.lineTo(x + w - r.tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
        this.lineTo(x + w, y + h - r.br);
        this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
        this.lineTo(x + r.bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
        this.lineTo(x, y + r.tl);
        this.quadraticCurveTo(x, y, x + r.tl, y);
        this.closePath();
        return this;
      };
    }

    // View toggles
    this.showCosts = true;
    this.showDistances = true;
    this.showArrows = false;
    this.showBFSOverlay = false;

    // External path data
    this.bfsPath = null;

    // AI Hero animation state
    this.hero = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      active: false,
      progress: 0,
      facing: 'right', // 'left' | 'right'
      bob: 0
    };

    // Particle system for goal victory and walking dust
    this.particles = [];
    this.animTime = 0;

    this.initLoop();
  }

  setGrid(grid) {
    this.grid = grid;
    this.resizeCanvas();
    if (grid) {
      this.hero.x = grid.start.x;
      this.hero.y = grid.start.y;
    }
  }

  resizeCanvas() {
    if (!this.grid) return;
    const container = this.canvas.parentElement;
    const maxAvailableWidth = container ? container.clientWidth - 32 : 900;

    // Compute ideal tile size based on container width
    const targetTileSize = Math.max(38, Math.min(68, Math.floor(maxAvailableWidth / this.grid.cols)));
    this.tileSize = targetTileSize;

    const width = this.grid.cols * this.tileSize;
    const height = this.rows ? this.grid.rows * this.tileSize : this.grid.rows * this.tileSize;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  initLoop() {
    const loop = (timestamp) => {
      this.animTime = timestamp * 0.003;
      this.updateParticles();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity || 0.1;
      p.alpha -= p.fade || 0.02;
      p.size = Math.max(0, p.size * 0.97);
      if (p.alpha <= 0 || p.size <= 0.2) {
        this.particles.splice(i, 1);
      }
    }
  }

  spawnStepParticles(x, y) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: (x + 0.5) * this.tileSize + (Math.random() - 0.5) * 16,
        y: (y + 0.8) * this.tileSize + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 1.2,
        gravity: 0.05,
        size: 3 + Math.random() * 3,
        alpha: 0.8,
        fade: 0.04,
        color: 'rgba(255, 235, 150, 0.8)'
      });
    }
  }

  spawnVictoryConfetti(x, y) {
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#fbbf24'];
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: (x + 0.5) * this.tileSize,
        y: (y + 0.5) * this.tileSize,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        gravity: 0.15,
        size: 4 + Math.random() * 4,
        alpha: 1,
        fade: 0.015,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  screenToCell(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((screenX - rect.left) / this.tileSize);
    const y = Math.floor((screenY - rect.top) / this.tileSize);
    if (!this.grid || x < 0 || x >= this.grid.cols || y < 0 || y >= this.grid.rows) {
      return null;
    }
    return { x, y };
  }

  render() {
    if (!this.grid) return;
    const ctx = this.ctx;
    const width = this.grid.cols * this.tileSize;
    const height = this.grid.rows * this.tileSize;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw base terrain tiles
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        this.renderTile(x, y, this.grid.cells[y][x]);
      }
    }

    // 2. Draw BFS Comparison Path if enabled
    if (this.showBFSOverlay && this.bfsPath && this.bfsPath.length > 1) {
      this.renderComparisonPath(this.bfsPath, '#ec4899', 'BFS (Fewest Tiles)');
    }

    // 3. Draw Dijkstra Shortest Path
    this.renderShortestPath();

    // 4. Draw Goal (Treasure Chest)
    this.renderGoalMarker(this.grid.goal.x, this.grid.goal.y);

    // 5. Draw Start Marker
    this.renderStartMarker(this.grid.start.x, this.grid.start.y);

    // 6. Draw AI Hero Character
    this.renderHeroCharacter();

    // 7. Draw Particles
    this.renderParticles();
  }

  renderTile(x, y, cell) {
    const ctx = this.ctx;
    const px = x * this.tileSize;
    const py = y * this.tileSize;
    const s = this.tileSize;
    const terrain = getTerrain(cell.terrain);

    // Base background
    ctx.fillStyle = terrain.color;
    ctx.fillRect(px, py, s, s);

    // Texture decoration based on terrain
    this.renderTerrainTexture(ctx, px, py, s, cell.terrain);

    // Grid border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);

    // Dijkstra state visualizer overlay
    if (cell.state === 'frontier') {
      const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 4 + (x + y));
      ctx.fillStyle = `rgba(139, 92, 246, ${0.28 + pulse * 0.18})`;
      ctx.fillRect(px, py, s, s);
      ctx.strokeStyle = `rgba(192, 132, 252, ${0.8 + pulse * 0.2})`;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
    } else if (cell.state === 'visited') {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
      ctx.fillRect(px, py, s, s);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 1, py + 1, s - 2, s - 2);
    } else if (cell.state === 'current') {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.55)';
      ctx.fillRect(px, py, s, s);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
    }

    // Cost Badge (e.g. +1, +3, +5, +10)
    if (this.showCosts && cell.walkable) {
      this.renderCostPill(ctx, px, py, s, cell.cost);
    }

    // Distance Label: d: 14
    if (this.showDistances && cell.dist !== Infinity && cell.walkable) {
      this.renderDistanceLabel(ctx, px, py, s, cell.dist);
    }

    // Directional Pointer Arrow to previous node
    if (this.showArrows && cell.prev && cell.walkable) {
      this.renderParentArrow(ctx, px, py, s, cell.x, cell.y, cell.prev.x, cell.prev.y);
    }
  }

  renderTerrainTexture(ctx, px, py, s, terrainId) {
    if (terrainId === 'WALL') {
      // Brick pattern with 3D bevel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(px, py, s, 3);
      ctx.fillRect(px, py, 3, s);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(px, py + s - 3, s, 3);
      ctx.fillRect(px + s - 3, py, 3, s);

      // Brick seams
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, py + s * 0.5);
      ctx.lineTo(px + s, py + s * 0.5);
      ctx.moveTo(px + s * 0.5, py);
      ctx.lineTo(px + s * 0.5, py + s * 0.5);
      ctx.moveTo(px + s * 0.25, py + s * 0.5);
      ctx.lineTo(px + s * 0.25, py + s);
      ctx.moveTo(px + s * 0.75, py + s * 0.5);
      ctx.lineTo(px + s * 0.75, py + s);
      ctx.stroke();

    } else if (terrainId === 'LAVA') {
      // Glowing animated magma embers
      const glow = 0.5 + 0.5 * Math.sin(this.animTime * 2.5 + (px + py) * 0.05);
      ctx.fillStyle = `rgba(249, 115, 22, ${0.35 + glow * 0.3})`;
      ctx.beginPath();
      ctx.arc(px + s * 0.4, py + s * 0.4, s * 0.25, 0, Math.PI * 2);
      ctx.arc(px + s * 0.75, py + s * 0.75, s * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Lava cracks
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + s * 0.2, py + s * 0.3);
      ctx.lineTo(px + s * 0.5, py + s * 0.6);
      ctx.lineTo(px + s * 0.8, py + s * 0.4);
      ctx.stroke();

    } else if (terrainId === 'ROAD') {
      // Cobblestone slabs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 4, py + 4, s * 0.42, s * 0.42);
      ctx.strokeRect(px + s * 0.52, py + 4, s * 0.42, s * 0.42);
      ctx.strokeRect(px + 4, py + s * 0.52, s * 0.42, s * 0.42);
      ctx.strokeRect(px + s * 0.52, py + s * 0.52, s * 0.42, s * 0.42);

    } else if (terrainId === 'MUD') {
      // Mud rings / ripples
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.beginPath();
      ctx.arc(px + s * 0.3, py + s * 0.65, s * 0.16, 0, Math.PI * 2);
      ctx.arc(px + s * 0.7, py + s * 0.35, s * 0.2, 0, Math.PI * 2);
      ctx.fill();

    } else if (terrainId === 'SAND') {
      // Dune wave stripes
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px + 3, py + s * 0.3);
      ctx.quadraticCurveTo(px + s * 0.5, py + s * 0.15, px + s - 3, py + s * 0.35);
      ctx.moveTo(px + 3, py + s * 0.7);
      ctx.quadraticCurveTo(px + s * 0.5, py + s * 0.55, px + s - 3, py + s * 0.75);
      ctx.stroke();

    } else if (terrainId === 'GRASS') {
      // Grass tufts
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px + s * 0.3, py + s * 0.6);
      ctx.lineTo(px + s * 0.25, py + s * 0.45);
      ctx.moveTo(px + s * 0.3, py + s * 0.6);
      ctx.lineTo(px + s * 0.38, py + s * 0.48);
      ctx.stroke();
    }
  }

  renderCostPill(ctx, px, py, s, cost) {
    const pillW = s < 50 ? 20 : 26;
    const pillH = s < 50 ? 13 : 16;
    const pillX = px + s - pillW - 3;
    const pillY = py + 3;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 4);
    ctx.fill();

    ctx.fillStyle = cost === 1 ? '#a7f3d0' : cost <= 3 ? '#fef08a' : cost <= 5 ? '#fdba74' : '#fca5a5';
    ctx.font = `bold ${s < 50 ? 9 : 11}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${cost}`, pillX + pillW / 2, pillY + pillH / 2);
  }

  renderDistanceLabel(ctx, px, py, s, dist) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.beginPath();
    const w = s < 50 ? 22 : 32;
    const h = s < 50 ? 12 : 15;
    ctx.roundRect(px + 3, py + s - h - 3, w, h, 4);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.font = `600 ${s < 50 ? 8 : 10}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`d:${dist}`, px + 3 + w / 2, py + s - h / 2 - 3);
  }

  renderParentArrow(ctx, px, py, s, cx, cy, pxCoord, pyCoord) {
    const dx = pxCoord - cx;
    const dy = pyCoord - cy;
    const fromX = px + s * 0.5;
    const fromY = py + s * 0.5;
    const toX = fromX + dx * (s * 0.32);
    const toY = fromY + dy * (s * 0.32);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const headLen = 4;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  renderShortestPath() {
    if (!this.grid) return;
    const path = [];

    // Collect all cells marked as 'path' in order
    const goalCell = this.grid.getCell(this.grid.goal.x, this.grid.goal.y);
    if (!goalCell || goalCell.dist === Infinity || !goalCell.inPath) return;

    let curr = goalCell;
    while (curr) {
      path.unshift(curr);
      if (!curr.prev) break;
      curr = this.grid.getCell(curr.prev.x, curr.prev.y);
    }

    if (path.length <= 1) return;

    const ctx = this.ctx;
    const s = this.tileSize;

    // Outer luminous glow
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path.forEach((c, idx) => {
      const cx = (c.x + 0.5) * s;
      const cy = (c.y + 0.5) * s;
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();

    // Inner bright neon line with animated dash offset
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -this.animTime * 18;
    ctx.stroke();
    ctx.restore();

    // Node waypoint beads along path
    path.forEach((c, idx) => {
      const cx = (c.x + 0.5) * s;
      const cy = (c.y + 0.5) * s;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cx, cy, s < 50 ? 3.5 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  renderComparisonPath(path, color, label) {
    if (!path || path.length <= 1) return;
    const ctx = this.ctx;
    const s = this.tileSize;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.setLineDash([4, 4]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path.forEach((c, idx) => {
      const cx = (c.x + 0.5) * s;
      const cy = (c.y + 0.5) * s;
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
    ctx.restore();
  }

  renderStartMarker(x, y) {
    const ctx = this.ctx;
    const s = this.tileSize;
    const cx = (x + 0.5) * s;
    const cy = (y + 0.5) * s;

    // Glowing green ring
    ctx.save();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Start Badge label
    ctx.fillStyle = '#10b981';
    ctx.font = `bold ${s < 50 ? 11 : 14}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START', cx, cy - s * 0.26);

    ctx.font = `${s < 50 ? 16 : 22}px sans-serif`;
    ctx.fillText('🧙', cx, cy + s * 0.08);
    ctx.restore();
  }

  renderGoalMarker(x, y) {
    const ctx = this.ctx;
    const s = this.tileSize;
    const cx = (x + 0.5) * s;
    const cy = (y + 0.5) * s;

    // Pulsing aura
    const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 3);
    ctx.save();
    ctx.fillStyle = `rgba(245, 158, 11, ${0.2 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.44 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Goal Badge label
    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${s < 50 ? 11 : 14}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GOAL', cx, cy - s * 0.26);

    ctx.font = `${s < 50 ? 18 : 24}px sans-serif`;
    ctx.fillText('🏆', cx, cy + s * 0.08);
    ctx.restore();
  }

  renderHeroCharacter() {
    if (!this.hero.active) return;
    const ctx = this.ctx;
    const s = this.tileSize;
    const cx = (this.hero.x + 0.5) * s;
    const cy = (this.hero.y + 0.5) * s + Math.sin(this.animTime * 12) * 3;

    ctx.save();
    // Shadow under hero
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, (this.hero.y + 0.85) * s, s * 0.22, s * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hero aura
    ctx.fillStyle = 'rgba(99, 102, 241, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.36, 0, Math.PI * 2);
    ctx.fill();

    // Hero Avatar
    ctx.font = `${s < 50 ? 22 : 28}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Flip sprite if facing left
    if (this.hero.facing === 'left') {
      ctx.scale(-1, 1);
      ctx.fillText('🧙‍♂️', -cx, cy);
    } else {
      ctx.fillText('🧙‍♂️', cx, cy);
    }
    ctx.restore();
  }

  renderParticles() {
    const ctx = this.ctx;
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}
