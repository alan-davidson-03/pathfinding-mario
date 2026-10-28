# ⚔️ Dijkstra's Dungeon: Interactive AI Pathfinding Game

An interactive, visual 2D dungeon crawler game that brings **Dijkstra's Shortest Path Algorithm** to life with dynamic terrain movement costs, step-by-step relaxation tracking, real-time Min-Heap inspection, and AI character animation.

![Dijkstra Dungeon](https://img.shields.io/badge/Algorithm-Dijkstra%20Min--Heap-amber)
![Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20Vanilla%20CSS%20%7C%20ES6%20Modules-emerald)
![Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API%20Synth-violet)

---

## 🌟 Project Overview

Traditional pathfinding visualizers treat all grid tiles as having equal cost ($1$). In real-world applications and game AI, characters traverse complex environments with varying friction, hazards, and terrain types.

In **Dijkstra's Dungeon**, the AI character must travel from **Start ($S$)** to the **Treasure Goal ($G$)**. Rather than naively picking the route with the fewest tiles, Dijkstra's algorithm calculates the path with the **lowest total movement cost**.

For example:
- A direct straight-line route of **5 tiles through Lava** ($5 \times 10 = 50\text{ cost}$)
- An indirect detour of **10 tiles through Grass / Road** ($10 \times 1 = 10\text{ cost}$)

Dijkstra correctly chooses the **10-tile detour**, saving 40 movement cost! The game features an integrated **BFS Comparison Mode** that visually and mathematically proves this difference in real time.

---

## 🗺️ Terrain System & Movement Costs

| Terrain | Icon | Movement Cost | Walkable | Description |
|---|:---:|:---:|:---:|---|
| **Grass Meadow** | 🌿 | **1** | Yes | Open lush plains, standard movement |
| **Stone Road** | 🪨 | **1** | Yes | Smooth paved cobblestone highway |
| **Desert Sand** | 🏜️ | **3** | Yes | Shifting dunes, moderate drag |
| **Deep Mud** | 🪵 | **5** | Yes | Soggy bog marshland, heavy resistance |
| **Molten Lava** | 🔥 | **10** | Yes | Hazardous magma, extreme movement cost |
| **Dungeon Wall** | 🧱 | **$\infty$** | No | Solid stone masonry ramparts (Blocked) |

---

## 🧠 Dijkstra's Algorithm Implementation

The game includes an authentic implementation of Dijkstra's algorithm using a **Binary Min-Heap Priority Queue** for $O((V + E)\log V)$ performance:

1. **Distance Table (`dist[u]`)**:
   - `dist[start] = 0`
   - `dist[all other nodes] = Infinity`
2. **Priority Queue (`MinHeap`)**:
   - Stores pairs `(node, distance)`.
   - Repeatedly extracts the node `u` with the smallest known distance.
3. **Edge Relaxation**:
   - For every walkable neighbor `v` of `u`:
     $$\text{tentativeCost} = \text{dist}[u] + \text{cost}(v)$$
   - If $\text{tentativeCost} < \text{dist}[v]$:
     - $\text{dist}[v] \leftarrow \text{tentativeCost}$
     - $\text{prev}[v] \leftarrow u$
     - Insert `v` into the priority queue with priority $\text{tentativeCost}$.
4. **Previous-Node Table (`prev[u]`) & Path Reconstruction**:
   - Traces backwards from `Goal` $\rightarrow \text{prev}[\text{Goal}] \rightarrow \dots \rightarrow \text{Start}$.
   - Reverses the sequence to yield the optimal path.

---

## 🎮 Key Features

- **Dynamic Terrain Painting**:
  - Click and drag across the dungeon grid to paint any terrain type or place walls.
  - Drag the **Start ($\🧙$)** and **Goal ($\🏆$)** markers to any tile.
- **Interactive Step-by-Step Execution**:
  - **Run Dijkstra**: Fluid animated exploration with glowing frontier waves.
  - **Single Step**: Step through individual edge relaxations one at a time.
  - **Instant Solve**: Compute results instantly with high-precision microsecond timing.
  - **Speed Slider**: Real-time control from slow deliberate teaching speed to turbo mode.
- **Live Educational HUD & Inspector**:
  - **Pseudocode Tracker**: Real-time line highlighting matching the algorithm's state machine.
  - **Live Relaxation Activity Feed**: Explains why edges were updated or rejected.
  - **Cell Inspector**: Hover over any tile to view its $(x, y)$ coordinate, terrain, cost, distance, and parent node.
  - **BFS Comparison Banner**: Proves the mathematical superiority of weighted Dijkstra over unweighted BFS.
- **AI Hero Animation & Celebration**:
  - The AI adventurer moves tile-by-tile along the calculated shortest path with directional sprites, dust particles, and victory confetti upon claiming the treasure.
- **Zero-Dependency Web Audio Synth**:
  - Retro sound effects generated entirely with the browser's Web Audio API (tile placement pitch, exploration ticks, victory fanfare).
- **Curated Scenarios**:
  - *The Lava Trap*: Highlighting cost vs cell count.
  - *The Swamp Passage*: Deep marsh with a narrow sand crossing.
  - *Dungeon Labyrinth*: Stone wall maze.
  - *Cost Tradeoff Challenge*: Competing short-hazardous vs long-safe routes.
  - *Blank Canvas*: Clean slate for custom designs.

---

## 🚀 How to Run

Because this project is built using modern native Web technologies (HTML5 Canvas, Vanilla CSS, and ES6 Modules), it requires **zero installation steps, zero npm packages, and zero build compilation**.

### Option 1: Using Python HTTP Server (Recommended)
Open a terminal in this directory and run:
```bash
python -m http.server 8080
```
Then navigate to:
```
http://localhost:8080/index.html
```

### Option 2: Direct File / Any Static Server
Open [index.html](file:///d:/projects/FINAL/PathFinding%20Algorithm/index.html) in any modern web browser (Chrome, Edge, Firefox, Brave, Safari).
