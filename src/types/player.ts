import { Card, CardInstance, WallState, MinerState } from './cards';

// Player stats
export interface PlayerStats {
  baseHP: number;        // Current HP (0-20)
  maxHP: number;         // Maximum HP (20)
  energy: number;        // Current energy (0-10)
  maxEnergy: number;     // Maximum energy (10)
}

// Player's field state
export interface PlayerField {
  wall: WallState | null;         // Only one wall allowed
  miner: MinerState | null;       // Only one miner allowed
  activeDeflection: boolean;      // Deflection card played this turn (clears at end)
  activeDeflectionMiner: boolean; // Deflection miner payout active this turn (clears at end)
}

// Full player state
export interface PlayerState {
  id: string;
  name: string;
  isLocal: boolean;       // true for local player in hot-seat
  isAI: boolean;          // true for AI opponent

  stats: PlayerStats;
  field: PlayerField;

  deck: Card[];           // Cards remaining in deck
  hand: Card[];           // Cards in hand (max 4)
  discard: Card[];        // Cards already played

  selectedCard: Card | null;  // Card selected this turn
  hasLockedIn: boolean;       // Has confirmed selection
}

// Create initial player state
export function createInitialPlayerState(
  id: string,
  name: string,
  deck: Card[],
  isLocal: boolean = true,
  isAI: boolean = false
): PlayerState {
  return {
    id,
    name,
    isLocal,
    isAI,
    stats: {
      baseHP: 20,
      maxHP: 20,
      energy: 5,
      maxEnergy: 10,
    },
    field: {
      wall: null,
      miner: null,
      activeDeflection: false,
      activeDeflectionMiner: false,
    },
    deck: [...deck],  // Copy deck
    hand: [],
    discard: [],
    selectedCard: null,
    hasLockedIn: false,
  };
}
