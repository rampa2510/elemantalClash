import { Card, AttackResult } from './cards';
import { TurnPhase, GamePhase } from './gameState';

// Game event types
export type GameEventType =
  // Phase changes
  | 'GAME_PHASE_CHANGE'
  | 'TURN_PHASE_CHANGE'
  | 'TURN_START'
  | 'TURN_END'

  // Player actions
  | 'CARD_SELECTED'
  | 'CARD_DESELECTED'
  | 'ACTION_LOCKED'
  | 'PASS_TO_PLAYER'

  // Combat events
  | 'CARDS_REVEALED'
  | 'ATTACK_RESOLVED'
  | 'DAMAGE_DEALT'
  | 'DAMAGE_BLOCKED'

  // Wall events
  | 'WALL_PLACED'
  | 'WALL_DAMAGED'
  | 'WALL_DESTROYED'
  | 'WALL_DECAYED'

  // Miner events
  | 'MINER_PLACED'
  | 'MINER_PAYOUT'
  | 'MINER_KILLED'
  | 'MINER_PROTECTED'

  // Energy events
  | 'ENERGY_SPENT'
  | 'ENERGY_GAINED'

  // Timer events
  | 'TIMER_TICK'
  | 'TIMER_WARNING'
  | 'TIMER_EXPIRED'

  // Game end
  | 'VICTORY'
  | 'DEFEAT'
  | 'DOUBLE_KO'

  // Network events
  | 'NETWORK_CONNECTED'
  | 'NETWORK_DISCONNECTED'
  | 'NETWORK_ERROR'
  | 'NETWORK_RECONNECTING'
  | 'OPPONENT_JOINED'
  | 'OPPONENT_LEFT'
  | 'STATE_SYNCED'
  | 'REMOTE_PLAYER_ACTION'

  // Multiplayer draft events
  | 'OPPONENT_DRAFT_COMPLETE'
  | 'BOTH_DRAFTS_COMPLETE'

  // Multiplayer gameplay events
  | 'OPPONENT_CARD_SELECTED'
  | 'OPPONENT_CARD_LOCKED'
  | 'BOTH_CARDS_LOCKED_HOST'
  | 'BOTH_CARDS_LOCKED_CLIENT'

  // Multiplayer sync events
  | 'HOST_STATE_UPDATE'
  | 'HOST_GAME_EVENT'

  // Settings
  | 'THEME_CHANGED';

// Base game event
export interface GameEvent<T = unknown> {
  type: GameEventType;
  payload: T;
  timestamp: number;
}

// Typed event payloads
export interface PhaseChangePayload {
  from: GamePhase | TurnPhase;
  to: GamePhase | TurnPhase;
}

export interface CardSelectedPayload {
  playerId: string;
  card: Card;
}

export interface DamagePayload {
  targetId: string;
  amount: number;
  source: 'attack' | 'miner_payout';
  attackType?: 'continuous' | 'projectile';
}

export interface WallEventPayload {
  playerId: string;
  wallHP?: number;
  damage?: number;
}

export interface MinerEventPayload {
  playerId: string;
  minerType: string;
  payoutEffect?: string;
}

export interface TimerPayload {
  remaining: number;
  total: number;
}

export interface VictoryPayload {
  winnerId: string;
  winnerName: string;
  loserId: string;
  loserName: string;
  finalHP: {
    winner: number;
    loser: number;
  };
}

export interface DoubleKOPayload {
  player1Id: string;
  player2Id: string;
  message: string;
}

export interface ThemeChangePayload {
  theme: 'dark' | 'light';
  colors: any;
}

// Event listener type
export type GameEventListener<T = unknown> = (event: GameEvent<T>) => void;
