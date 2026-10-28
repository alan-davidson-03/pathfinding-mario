import { PriorityQueue } from './priorityQueue.js';

/**
 * Dijkstra's Algorithm Engine
 * Provides both an asynchronous step generator for step-by-step animation
 * and a synchronous runner for instant calculations.
 */
export class DijkstraEngine {
  /**
   * Generator function yielding discrete steps of the Dijkstra process.
   * Enables fine-grained animation, pausing, stepping, and educational inspections.
   *
   * @param {Grid} grid - The grid instance
   * @yields {Object} Step state descriptor
   */
  static *runGenerator(grid) {
    const startTime = performance.now();
    grid.resetAlgorithmState();

    const startCell = grid.getCell(grid.start.x, grid.start.y);
    const goalCell = grid.getCell(grid.goal.x, grid.goal.y);

    if (!startCell || !goalCell) {
      yield { type: 'ERROR', message: 'Invalid start or goal node.' };
      return;
    }

    // Distance Table & Priority Queue
    startCell.dist = 0;
    startCell.state = 'frontier';

    const pq = new PriorityQueue();
    // Item format in pq: { x, y, dist }
    pq.push({ x: startCell.x, y: startCell.y }, 0);

    const visitedSet = new Set();
    let nodesExplored = 0;

    yield {
      type: 'INIT',
      current: startCell,
      pqSize: pq.size(),
      dist: 0,
      codeLine: 1, // 'Init distances and Priority Queue'
      explanation: `Initialized Dijkstra. Start node (${startCell.x}, ${startCell.y}) set to cost 0.`
    };

    while (!pq.isEmpty()) {
      const currentCoord = pq.pop();
      const currentCell = grid.getCell(currentCoord.x, currentCoord.y);
      const coordKey = `${currentCell.x},${currentCell.y}`;

      // If already visited with a lower or equal distance, skip (standard lazy-deletion PQ Dijkstra)
      if (visitedSet.has(coordKey)) {
        continue;
      }

      visitedSet.add(coordKey);
      nodesExplored++;
      currentCell.state = 'current';

      yield {
        type: 'VISIT_NODE',
        current: currentCell,
        dist: currentCell.dist,
        nodesExplored,
        pqSize: pq.size(),
        codeLine: 2, // 'u = extractMin(Q)'
        explanation: `Extracting node (${currentCell.x}, ${currentCell.y}) with lowest known distance ${currentCell.dist}.`
      };

      // Check if goal reached!
      if (currentCell.x === goalCell.x && currentCell.y === goalCell.y) {
        currentCell.state = 'visited';
        const path = DijkstraEngine.reconstructPath(goalCell, grid);
        const totalCost = goalCell.dist;
        const execTime = performance.now() - startTime;

        yield {
          type: 'PATH_FOUND',
          path,
          totalCost,
          nodesExplored,
          execTime,
          codeLine: 6, // 'Reconstruct shortest path'
          explanation: `🎯 Destination reached! Minimum movement cost is ${totalCost}.`
        };
        return;
      }

      // Explore neighbors (orthogonal 4 directions)
      const neighbors = grid.getNeighbors(currentCell.x, currentCell.y);

      for (const { cell: neighbor } of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;

        // Skip non-walkable walls
        if (!neighbor.walkable) {
          yield {
            type: 'SKIP_WALL',
            current: currentCell,
            neighbor,
            codeLine: 3,
            explanation: `Neighbor (${neighbor.x}, ${neighbor.y}) is a Wall (impassable). Skipped.`
          };
          continue;
        }

        // Skip already finalized nodes
        if (visitedSet.has(neighborKey)) {
          yield {
            type: 'SKIP_SETTLED',
            current: currentCell,
            neighbor,
            codeLine: 3,
            explanation: `Neighbor (${neighbor.x}, ${neighbor.y}) is already settled. Skipped.`
          };
          continue;
        }

        // Relaxation step: newCost = dist[u] + cost(v)
        const tentativeCost = currentCell.dist + neighbor.cost;

        yield {
          type: 'EXAMINE_NEIGHBOR',
          current: currentCell,
          neighbor,
          tentativeCost,
          currentDist: neighbor.dist,
          codeLine: 4, // 'alt = dist[u] + cost(neighbor)'
          explanation: `Checking neighbor (${neighbor.x}, ${neighbor.y}) [${neighbor.terrain}, cost +${neighbor.cost}]. Potential cost: ${currentCell.dist} + ${neighbor.cost} = ${tentativeCost}.`
        };

        if (tentativeCost < neighbor.dist) {
          const oldDist = neighbor.dist;
          neighbor.dist = tentativeCost;
          neighbor.prev = { x: currentCell.x, y: currentCell.y };
          neighbor.state = 'frontier';

          pq.push({ x: neighbor.x, y: neighbor.y }, tentativeCost);

          yield {
            type: 'RELAX_SUCCESS',
            current: currentCell,
            neighbor,
            newCost: tentativeCost,
            oldDist: oldDist === Infinity ? '∞' : oldDist,
            pqSize: pq.size(),
            codeLine: 5, // 'if alt < dist[v]: dist[v] = alt; prev[v] = u'
            explanation: `✅ Relaxation successful! Updated (${neighbor.x}, ${neighbor.y}) cost to ${tentativeCost} (was ${oldDist === Infinity ? '∞' : oldDist}). Added to Min-Heap.`
          };
        } else {
          yield {
            type: 'RELAX_IGNORED',
            current: currentCell,
            neighbor,
            tentativeCost,
            codeLine: 4,
            explanation: `❌ Ignored: Tentative cost ${tentativeCost} is >= existing distance ${neighbor.dist}.`
          };
        }
      }

      // Mark current cell as visited/settled
      currentCell.state = 'visited';
    }

    // If priority queue exhausts without reaching goal
    const execTime = performance.now() - startTime;
    yield {
      type: 'NO_PATH',
      nodesExplored,
      execTime,
      codeLine: 7,
      explanation: 'No walkable path exists to the goal node.'
    };
  }

  /**
   * Fast synchronous Dijkstra solver for instant calculation or background comparison
   */
  static solveInstant(grid) {
    const startTime = performance.now();
    grid.resetAlgorithmState();

    const startCell = grid.getCell(grid.start.x, grid.start.y);
    const goalCell = grid.getCell(grid.goal.x, grid.goal.y);

    if (!startCell || !goalCell) return { found: false };

    startCell.dist = 0;
    const pq = new PriorityQueue();
    pq.push({ x: startCell.x, y: startCell.y }, 0);
    const visitedSet = new Set();
    let nodesExplored = 0;

    while (!pq.isEmpty()) {
      const coord = pq.pop();
      const cell = grid.getCell(coord.x, coord.y);
      const key = `${cell.x},${cell.y}`;

      if (visitedSet.has(key)) continue;
      visitedSet.add(key);
      nodesExplored++;
      cell.state = 'visited';

      if (cell.x === goalCell.x && cell.y === goalCell.y) {
        const path = DijkstraEngine.reconstructPath(goalCell, grid);
        const execTime = performance.now() - startTime;
        return {
          found: true,
          path,
          totalCost: goalCell.dist,
          pathLength: path.length,
          nodesExplored,
          execTime
        };
      }

      for (const { cell: neighbor } of grid.getNeighbors(cell.x, cell.y)) {
        if (!neighbor.walkable || visitedSet.has(`${neighbor.x},${neighbor.y}`)) continue;
        const alt = cell.dist + neighbor.cost;
        if (alt < neighbor.dist) {
          neighbor.dist = alt;
          neighbor.prev = { x: cell.x, y: cell.y };
          neighbor.state = 'frontier';
          pq.push({ x: neighbor.x, y: neighbor.y }, alt);
        }
      }
    }

    return {
      found: false,
      nodesExplored,
      execTime: performance.now() - startTime
    };
  }

  /**
   * Breadth-First Search (BFS) solver
   * Treats all walkable cells as uniform cost (cost = 1) to find the path
   * with the fewest tiles. Useful for side-by-side comparison with Dijkstra!
   */
  static solveUnweightedBFS(grid) {
    const startCell = grid.getCell(grid.start.x, grid.start.y);
    const goalCell = grid.getCell(grid.goal.x, grid.goal.y);

    if (!startCell || !goalCell) return { found: false };

    const queue = [{ x: startCell.x, y: startCell.y }];
    const visited = new Map();
    visited.set(`${startCell.x},${startCell.y}`, null);

    let found = false;

    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr.x === goalCell.x && curr.y === goalCell.y) {
        found = true;
        break;
      }

      for (const { cell: neighbor } of grid.getNeighbors(curr.x, curr.y)) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (neighbor.walkable && !visited.has(key)) {
          visited.set(key, curr);
          queue.push({ x: neighbor.x, y: neighbor.y });
        }
      }
    }

    if (!found) return { found: false };

    // Reconstruct BFS path
    const path = [];
    let curr = { x: goalCell.x, y: goalCell.y };
    let totalTerrainCost = 0;

    while (curr) {
      path.unshift(curr);
      const parent = visited.get(`${curr.x},${curr.y}`);
      if (parent) {
        // Cost incurred when moving into curr cell
        const cell = grid.getCell(curr.x, curr.y);
        totalTerrainCost += cell.cost;
      }
      curr = parent;
    }

    return {
      found: true,
      path,
      pathLength: path.length,
      totalCost: totalTerrainCost
    };
  }

  /**
   * Trace back parent pointers from goal to start
   */
  static reconstructPath(goalCell, grid) {
    const path = [];
    let current = goalCell;

    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current.inPath = true;
      current.state = 'path';
      if (!current.prev) break;
      current = grid.getCell(current.prev.x, current.prev.y);
    }

    return path;
  }
}
