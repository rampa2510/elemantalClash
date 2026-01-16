import { Card } from '../types/cards';
import {
  WALL_COST,
  WALL_HP,
  DEFLECTION_COST,
  CONTINUOUS_COST,
  CONTINUOUS_DAMAGE,
  PROJECTILE_COST,
  PROJECTILE_DAMAGE,
  DEFLECTION_MINER_COST,
  PROJECTILE_MINER_COST,
  PROJECTILE_MINER_INTERVAL,
  CONTINUOUS_MINER_COST,
  CONTINUOUS_MINER_INTERVAL,
  REPAIR_MINER_COST,
  REPAIR_MINER_INTERVAL,
} from './constants';

// === ROUND 1: SHIELDS (cosmetic difference only) ===
export const WALL_OPTIONS: Card[] = [
  {
    id: 'wall_fire',
    name: 'Fire Shield',
    element: 'fire',
    type: 'defense',
    subtype: 'wall',
    cost: WALL_COST,
    power: WALL_HP,
    description: 'Blocks Blasts completely. Fades over time.',
  },
  {
    id: 'wall_water',
    name: 'Water Shield',
    element: 'water',
    type: 'defense',
    subtype: 'wall',
    cost: WALL_COST,
    power: WALL_HP,
    description: 'Blocks Blasts completely. Fades over time.',
  },
  {
    id: 'wall_earth',
    name: 'Stone Shield',
    element: 'earth',
    type: 'defense',
    subtype: 'wall',
    cost: WALL_COST,
    power: WALL_HP,
    description: 'Blocks Blasts completely. Fades over time.',
  },
  {
    id: 'wall_ice',
    name: 'Ice Shield',
    element: 'ice',
    type: 'defense',
    subtype: 'wall',
    cost: WALL_COST,
    power: WALL_HP,
    description: 'Blocks Blasts completely. Fades over time.',
  },
];

// === ROUND 2: DODGES (cosmetic difference only) ===
export const DEFLECTION_OPTIONS: Card[] = [
  {
    id: 'deflect_air',
    name: 'Air Dodge',
    element: 'air',
    type: 'defense',
    subtype: 'deflection',
    cost: DEFLECTION_COST,
    power: 0,
    description: 'Evades Shots completely. Softens Blasts.',
  },
  {
    id: 'deflect_water',
    name: 'Water Dodge',
    element: 'water',
    type: 'defense',
    subtype: 'deflection',
    cost: DEFLECTION_COST,
    power: 0,
    description: 'Evades Shots completely. Softens Blasts.',
  },
  {
    id: 'deflect_fire',
    name: 'Fire Dodge',
    element: 'fire',
    type: 'defense',
    subtype: 'deflection',
    cost: DEFLECTION_COST,
    power: 0,
    description: 'Evades Shots completely. Softens Blasts.',
  },
  {
    id: 'deflect_earth',
    name: 'Earth Dodge',
    element: 'earth',
    type: 'defense',
    subtype: 'deflection',
    cost: DEFLECTION_COST,
    power: 0,
    description: 'Evades Shots completely. Softens Blasts.',
  },
];

// === ROUND 3: BLASTS - Heavy attack (5 cost, 8 damage) ===
export const CONTINUOUS_OPTIONS: Card[] = [
  {
    id: 'cont_fire',
    name: 'Fire Blast',
    element: 'fire',
    type: 'attack',
    subtype: 'continuous',
    cost: CONTINUOUS_COST,
    power: CONTINUOUS_DAMAGE,
    description: 'Heavy 8 damage. Stopped by Shields.',
  },
  {
    id: 'cont_water',
    name: 'Water Blast',
    element: 'water',
    type: 'attack',
    subtype: 'continuous',
    cost: CONTINUOUS_COST,
    power: CONTINUOUS_DAMAGE,
    description: 'Heavy 8 damage. Stopped by Shields.',
  },
  {
    id: 'cont_earth',
    name: 'Earth Blast',
    element: 'earth',
    type: 'attack',
    subtype: 'continuous',
    cost: CONTINUOUS_COST,
    power: CONTINUOUS_DAMAGE,
    description: 'Heavy 8 damage. Stopped by Shields.',
  },
  {
    id: 'cont_ice',
    name: 'Ice Blast',
    element: 'ice',
    type: 'attack',
    subtype: 'continuous',
    cost: CONTINUOUS_COST,
    power: CONTINUOUS_DAMAGE,
    description: 'Heavy 8 damage. Stopped by Shields.',
  },
];

// === ROUND 4: SHOTS - Quick attack (3 cost, 3 damage) ===
export const PROJECTILE_OPTIONS: Card[] = [
  {
    id: 'proj_fire',
    name: 'Fire Shot',
    element: 'fire',
    type: 'attack',
    subtype: 'projectile',
    cost: PROJECTILE_COST,
    power: PROJECTILE_DAMAGE,
    description: 'Quick 3 damage. Ignores Shields. Stopped by Dodge.',
  },
  {
    id: 'proj_ice',
    name: 'Ice Shot',
    element: 'ice',
    type: 'attack',
    subtype: 'projectile',
    cost: PROJECTILE_COST,
    power: PROJECTILE_DAMAGE,
    description: 'Quick 3 damage. Ignores Shields. Stopped by Dodge.',
  },
  {
    id: 'proj_lightning',
    name: 'Thunder Shot',
    element: 'lightning',
    type: 'attack',
    subtype: 'projectile',
    cost: PROJECTILE_COST,
    power: PROJECTILE_DAMAGE,
    description: 'Quick 3 damage. Ignores Shields. Stopped by Dodge.',
  },
  {
    id: 'proj_earth',
    name: 'Rock Shot',
    element: 'earth',
    type: 'attack',
    subtype: 'projectile',
    cost: PROJECTILE_COST,
    power: PROJECTILE_DAMAGE,
    description: 'Quick 3 damage. Ignores Shields. Stopped by Dodge.',
  },
];

// === ROUND 5-6: BOTS (persistent helpers with unique abilities) ===
export const MINER_OPTIONS: Card[] = [
  {
    id: 'miner_deflect',
    name: 'Dodge Bot',
    element: 'lightning',
    type: 'miner',
    subtype: 'deflection_miner',
    cost: DEFLECTION_MINER_COST,
    power: 0,
    payoutInterval: 2,
    description: 'Blocks incoming Shots every 2 turns. Dies if your base takes any hit.',
  },
  {
    id: 'miner_proj',
    name: 'Shot Bot',
    element: 'fire',
    type: 'miner',
    subtype: 'projectile_miner',
    cost: PROJECTILE_MINER_COST,
    power: 0,
    payoutInterval: PROJECTILE_MINER_INTERVAL,
    description: 'Attacks enemy with 3 damage every 2 turns. Dies if your base takes any hit.',
  },
  {
    id: 'miner_cont',
    name: 'Blast Bot',
    element: 'fire',
    type: 'miner',
    subtype: 'continuous_miner',
    cost: CONTINUOUS_MINER_COST,
    power: 0,
    payoutInterval: CONTINUOUS_MINER_INTERVAL,
    description: 'Attacks enemy with 8 damage every 3 turns. Dies if your base takes any hit.',
  },
  {
    id: 'miner_repair',
    name: 'Repair Bot',
    element: 'earth',
    type: 'miner',
    subtype: 'repair_miner',
    cost: REPAIR_MINER_COST,
    power: 0,
    payoutInterval: REPAIR_MINER_INTERVAL,
    description: 'Heals your Wall to full HP every 2 turns. Dies if your base takes any hit.',
  },
];

// All card pools by category
export const CARD_POOLS = {
  wall: WALL_OPTIONS,
  deflection: DEFLECTION_OPTIONS,
  continuous: CONTINUOUS_OPTIONS,
  projectile: PROJECTILE_OPTIONS,
  miner: MINER_OPTIONS,
};

// Get all cards (for wildcard generation)
export function getAllCards(): Card[] {
  return [
    ...WALL_OPTIONS,
    ...DEFLECTION_OPTIONS,
    ...CONTINUOUS_OPTIONS,
    ...PROJECTILE_OPTIONS,
    ...MINER_OPTIONS,
  ];
}

// Get cards by category
export function getCardsByCategory(category: keyof typeof CARD_POOLS): Card[] {
  return CARD_POOLS[category] || [];
}
