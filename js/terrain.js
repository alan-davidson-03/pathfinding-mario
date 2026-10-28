/**
 * Terrain system definitions with movement costs and visual styling
 */
export const TERRAIN_TYPES = {
  GRASS: {
    id: 'GRASS',
    name: 'Grass Meadow',
    cost: 1,
    walkable: true,
    color: '#15803d',       // Vibrant green
    lightColor: '#22c55e',
    borderColor: '#166534',
    icon: '🌿',
    description: 'Fresh plains with standard movement cost',
    badgeClass: 'badge-grass'
  },
  ROAD: {
    id: 'ROAD',
    name: 'Stone Road',
    cost: 1,
    walkable: true,
    color: '#475569',       // Cobblestone slate
    lightColor: '#64748b',
    borderColor: '#334155',
    icon: '🪨',
    description: 'Paved cobblestone, smooth travel',
    badgeClass: 'badge-road'
  },
  SAND: {
    id: 'SAND',
    name: 'Desert Sand',
    cost: 3,
    walkable: true,
    color: '#ca8a04',       // Warm desert gold
    lightColor: '#eab308',
    borderColor: '#a16207',
    icon: '🏜️',
    description: 'Shifting dunes, slow movement',
    badgeClass: 'badge-sand'
  },
  MUD: {
    id: 'MUD',
    name: 'Deep Mud',
    cost: 5,
    walkable: true,
    color: '#713f12',       // Bog brown
    lightColor: '#854d0e',
    borderColor: '#542d0a',
    icon: '🪵',
    description: 'Thick soggy swamp, difficult terrain',
    badgeClass: 'badge-mud'
  },
  LAVA: {
    id: 'LAVA',
    name: 'Molten Lava',
    cost: 10,
    walkable: true,
    color: '#dc2626',       // Fiery crimson
    lightColor: '#f97316',
    borderColor: '#991b1b',
    icon: '🔥',
    description: 'Hazardous heat! Walkable but extremely high cost',
    badgeClass: 'badge-lava'
  },
  WALL: {
    id: 'WALL',
    name: 'Dungeon Wall',
    cost: Infinity,
    walkable: false,
    color: '#0f172a',       // Deep obsidian wall
    lightColor: '#1e293b',
    borderColor: '#020617',
    icon: '🧱',
    description: 'Solid stone rampart, impassable',
    badgeClass: 'badge-wall'
  }
};

export function getTerrain(typeId) {
  return TERRAIN_TYPES[typeId] || TERRAIN_TYPES.GRASS;
}
