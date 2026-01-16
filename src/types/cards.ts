// Element types (cosmetic in v1)
export type Element = 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'ice';

// Card types
export type CardType = 'attack' | 'defense' | 'miner';

// Card subtypes
export type CardSubtype =
  | 'continuous'        // Attack: 8 damage, blocked by wall
  | 'projectile'        // Attack: 3 damage, bypasses wall
  | 'wall'              // Defense: 12 HP, decays 4/turn
  | 'deflection'        // Defense: blocks projectile 100%, reduces continuous by 2
  | 'deflection_miner'  // Miner: auto-deflects projectiles
  | 'projectile_miner'  // Miner: free projectile every 2 turns
  | 'continuous_miner'  // Miner: free continuous every 3 turns
  | 'repair_miner';     // Miner: repairs wall every 2 turns

// Card definition
export interface Card {
  id: string;
  name: string;
  element: Element;
  type: CardType;
  subtype: CardSubtype;
  cost: number;
  power: number;  // Damage for attacks, HP for walls, 0 for others
  description: string;
  payoutInterval?: number;  // For miners
}

// Card instance in a player's hand/deck
export interface CardInstance {
  instanceId: string;  // Unique per instance
  card: Card;
}

// Wall state on the battlefield
export interface WallState {
  cardId: string;
  element: Element;
  maxHP: number;
  currentHP: number;
  turnPlaced: number;
}

// Miner state on the battlefield
export interface MinerState {
  cardId: string;
  minerType: CardSubtype;
  element: Element;
  turnsUntilPayout: number;
  payoutInterval: number;
  turnPlaced: number;
}

// Turn action submitted by a player
export interface TurnAction {
  playerId: string;
  selectedCard: Card | null;  // null = pass
  timestamp: number;
}

// Result of an attack resolution
export interface AttackResult {
  attackerId: string;
  defenderId: string;
  attackType: CardSubtype;
  rawDamage: number;
  finalDamage: number;
  damageToWall: number;
  damageToBase: number;
  wallDestroyed: boolean;
  minerKilled: boolean;
  blockedBy: 'wall' | 'deflection' | 'deflection_miner' | null;
}
