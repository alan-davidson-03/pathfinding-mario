import { TERRAIN_TYPES, getTerrain } from './terrain.js';

export class Grid {
  constructor(cols = 12, rows = 8) {
    this.cols = cols;
    this.rows = rows;
    this.start = { x: 1, y: 3 };
    this.goal = { x: cols - 2, y: 3 };
    this.cells = [];
    this.init();
  }

  init() {
    this.cells = [];
    for (let y = 0; y < this.rows; y++) {
      const row = [];
      for (let x = 0; x < this.cols; x++) {
        row.push(this.createCell(x, y, 'GRASS'));
      }
      this.cells.push(row);
    }
  }

  createCell(x, y, terrainType = 'GRASS') {
    const terrain = getTerrain(terrainType);
    return {
      x,
      y,
      terrain: terrain.id,
      cost: terrain.cost,
      walkable: terrain.walkable,
      dist: Infinity,
      prev: null,
      state: 'unvisited', // 'unvisited' | 'frontier' | 'visited' | 'current' | 'path'
      inPath: false
    };
  }

  resize(newCols, newRows) {
    const oldCells = this.cells;
    this.cols = newCols;
    this.rows = newRows;
    this.cells = [];

    for (let y = 0; y < this.rows; y++) {
      const row = [];
      for (let x = 0; x < this.cols; x++) {
        if (oldCells[y] && oldCells[y][x]) {
          const old = oldCells[y][x];
          row.push(this.createCell(x, y, old.terrain));
        } else {
          row.push(this.createCell(x, y, 'GRASS'));
        }
      }
      this.cells.push(row);
    }

    // Keep start and goal within bounds
    this.start.x = Math.min(this.start.x, this.cols - 1);
    this.start.y = Math.min(this.start.y, this.rows - 1);
    this.goal.x = Math.min(this.goal.x, this.cols - 1);
    this.goal.y = Math.min(this.goal.y, this.rows - 1);

    if (this.start.x === this.goal.x && this.start.y === this.goal.y) {
      this.goal.x = Math.max(0, this.start.x - 1);
    }
  }

  getCell(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return null;
    return this.cells[y][x];
  }

  setTerrain(x, y, terrainType) {
    const cell = this.getCell(x, y);
    if (!cell) return false;

    // Do not convert start/goal into walls
    if (terrainType === 'WALL' && ((x === this.start.x && y === this.start.y) || (x === this.goal.x && y === this.goal.y))) {
      return false;
    }

    const terrain = getTerrain(terrainType);
    cell.terrain = terrain.id;
    cell.cost = terrain.cost;
    cell.walkable = terrain.walkable;
    return true;
  }

  setStart(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
    if (x === this.goal.x && y === this.goal.y) return false;
    const cell = this.getCell(x, y);
    if (!cell.walkable) {
      this.setTerrain(x, y, 'GRASS');
    }
    this.start = { x, y };
    return true;
  }

  setGoal(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
    if (x === this.start.x && y === this.start.y) return false;
    const cell = this.getCell(x, y);
    if (!cell.walkable) {
      this.setTerrain(x, y, 'GRASS');
    }
    this.goal = { x, y };
    return true;
  }

  resetAlgorithmState() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.cells[y][x];
        cell.dist = Infinity;
        cell.prev = null;
        cell.state = 'unvisited';
        cell.inPath = false;
      }
    }
  }

  clearWalls() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.cells[y][x].terrain === 'WALL') {
          this.setTerrain(x, y, 'GRASS');
        }
      }
    }
    this.resetAlgorithmState();
  }

  clearAllToGrass() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.setTerrain(x, y, 'GRASS');
      }
    }
    this.resetAlgorithmState();
  }

  getNeighbors(x, y) {
    // 4 orthogonal directions (Up, Right, Down, Left)
    const deltas = [
      { dx: 0, dy: -1, dir: 'up' },
      { dx: 1, dy: 0, dir: 'right' },
      { dx: 0, dy: 1, dir: 'down' },
      { dx: -1, dy: 0, dir: 'left' }
    ];

    const neighbors = [];
    for (const d of deltas) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      const neighbor = this.getCell(nx, ny);
      if (neighbor) {
        neighbors.push({ cell: neighbor, dir: d.dir });
      }
    }
    return neighbors;
  }

  loadPreset(presetId) {
    this.resetAlgorithmState();

    if (presetId === 'lava-trap') {
      // 12x8 layout highlighting Dijkstra choosing longer road over direct lava
      this.resize(12, 8);
      this.clearAllToGrass();
      this.start = { x: 1, y: 3 };
      this.goal = { x: 10, y: 3 };

      // Put a solid thick band of lava in the direct middle
      for (let x = 3; x <= 8; x++) {
        this.setTerrain(x, 3, 'LAVA');
        this.setTerrain(x, 4, 'MUD');
      }

      // Create a pleasant cobblestone road looping around the top
      for (let x = 1; x <= 10; x++) {
        this.setTerrain(x, 1, 'ROAD');
      }
      this.setTerrain(1, 2, 'ROAD');
      this.setTerrain(10, 2, 'ROAD');

      // Add decorative walls framing the dungeon
      this.setTerrain(3, 2, 'WALL');
      this.setTerrain(8, 2, 'WALL');
      this.setTerrain(3, 5, 'WALL');
      this.setTerrain(8, 5, 'WALL');

    } else if (presetId === 'swamp-pass') {
      this.resize(12, 8);
      this.clearAllToGrass();
      this.start = { x: 1, y: 1 };
      this.goal = { x: 10, y: 6 };

      // Diagonal marsh river
      for (let y = 0; y < 8; y++) {
        this.setTerrain(5, y, 'MUD');
        this.setTerrain(6, y, 'MUD');
      }

      // Sand crossing bridge
      this.setTerrain(5, 4, 'SAND');
      this.setTerrain(6, 4, 'SAND');

      // Cobblestone leading up to it
      for (let x = 1; x <= 4; x++) this.setTerrain(x, 4, 'ROAD');
      for (let x = 7; x <= 10; x++) this.setTerrain(x, 4, 'ROAD');

      // Random decorative walls
      this.setTerrain(3, 1, 'WALL');
      this.setTerrain(3, 2, 'WALL');
      this.setTerrain(8, 6, 'WALL');
      this.setTerrain(8, 7, 'WALL');

    } else if (presetId === 'labyrinth') {
      this.resize(14, 9);
      this.clearAllToGrass();
      this.start = { x: 1, y: 1 };
      this.goal = { x: 12, y: 7 };

      // Maze walls
      const walls = [
        [3, 0], [3, 1], [3, 2], [3, 3], [3, 4],
        [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7],
        [10, 1], [10, 2], [10, 3], [10, 4],
        [5, 6], [5, 7], [5, 8],
        [1, 5], [2, 5]
      ];
      for (const [wx, wy] of walls) {
        this.setTerrain(wx, wy, 'WALL');
      }

      // Pockets of sand & road
      this.setTerrain(1, 2, 'ROAD');
      this.setTerrain(1, 3, 'ROAD');
      this.setTerrain(2, 3, 'ROAD');
      this.setTerrain(4, 5, 'SAND');
      this.setTerrain(6, 1, 'SAND');
      this.setTerrain(9, 6, 'MUD');
      this.setTerrain(11, 7, 'ROAD');

    } else if (presetId === 'cost-tradeoff') {
      this.resize(12, 8);
      this.clearAllToGrass();
      this.start = { x: 1, y: 4 };
      this.goal = { x: 10, y: 4 };

      // Top route: Short (6 cells), but 3 Lava + 2 Mud (Cost: 3*10 + 2*5 + 1 = 41)
      for (let x = 3; x <= 5; x++) this.setTerrain(x, 3, 'LAVA');
      this.setTerrain(6, 3, 'MUD');
      this.setTerrain(7, 3, 'MUD');

      // Middle: Blocked by wall barrier
      for (let x = 3; x <= 8; x++) this.setTerrain(x, 4, 'WALL');

      // Bottom route: Longer (12 cells), but all Stone Road (Cost: 12*1 = 12)
      for (let x = 2; x <= 9; x++) this.setTerrain(x, 6, 'ROAD');
      this.setTerrain(2, 5, 'ROAD');
      this.setTerrain(9, 5, 'ROAD');

    } else if (presetId === 'blank') {
      this.resize(12, 8);
      this.clearAllToGrass();
      this.start = { x: 1, y: 3 };
      this.goal = { x: 10, y: 3 };
    }
  }

  randomizeTerrain() {
    this.resetAlgorithmState();
    const terrainKeys = ['GRASS', 'GRASS', 'ROAD', 'SAND', 'MUD', 'LAVA', 'WALL'];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if ((x === this.start.x && y === this.start.y) || (x === this.goal.x && y === this.goal.y)) {
          this.setTerrain(x, y, 'GRASS');
          continue;
        }
        const pick = terrainKeys[Math.floor(Math.random() * terrainKeys.length)];
        this.setTerrain(x, y, pick);
      }
    }
  }
}
