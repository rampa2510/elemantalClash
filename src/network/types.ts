import { Card } from '../types/cards';

/**
 * Network message types for multiplayer communication
 */
export type NetworkMessageType =
  // Connection lifecycle
  | 'PING'
  | 'PONG'
  | 'CONNECTION_ACK'

  // Game setup
  | 'PLAYER_INFO'
  | 'DRAFT_COMPLETE'
  | 'GAME_START'
  | 'INITIAL_STATE'

  // Gameplay sync
  | 'PLAYER_ACTION'
  | 'STATE_UPDATE'
  | 'TURN_ADVANCE'
  | 'GAME_EVENT'

  // Error handling
  | 'DESYNC_DETECTED'
  | 'REQUEST_RESYNC'
  | 'ERROR';

/**
 * Base network message structure
 */
export interface NetworkMessage<T = unknown> {
  type: NetworkMessageType;
  payload: T;
  timestamp: number;
  senderId: string;
  messageId: string;  // For deduplication
}

/**
 * Connection state enum
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  PEER_DISCONNECTED = 'peer_disconnected'
}

/**
 * Player info payload
 */
export interface PlayerInfoPayload {
  playerId: string;
  playerName: string;
}

/**
 * Draft complete payload
 */
export interface DraftCompletePayload {
  playerId: string;
  deck: Card[];
}

/**
 * Game start payload
 */
export interface GameStartPayload {
  player1Name: string;
  player2Name: string;
  player1Deck: Card[];
  player2Deck: Card[];
}

/**
 * Initial state payload (full game state snapshot)
 */
export interface InitialStatePayload {
  snapshot: string;  // JSON serialized GameState
}

/**
 * Player action payload
 */
export interface PlayerActionPayload {
  playerId: string;
  action: 'select' | 'lock' | 'pass';
  card: Card | null;
  timestamp: number;
}

/**
 * State update payload (partial state change)
 */
export interface StateUpdatePayload {
  snapshot: string;  // JSON serialized GameState
}

/**
 * Turn advance payload
 */
export interface TurnAdvancePayload {
  turnNumber: number;
  serverTime: number;  // For timer sync
}

/**
 * Game event payload
 */
export interface GameEventPayload {
  event: string;
  data: unknown;
}

/**
 * Error payload
 */
export interface ErrorPayload {
  code: string;
  message: string;
  fatal: boolean;
}

/**
 * Network event types (for local event emitter)
 */
export type NetworkEventType =
  | 'NETWORK_CONNECTED'
  | 'NETWORK_DISCONNECTED'
  | 'NETWORK_ERROR'
  | 'NETWORK_RECONNECTING'
  | 'OPPONENT_JOINED'
  | 'OPPONENT_LEFT'
  | 'STATE_SYNCED'
  | 'REMOTE_PLAYER_ACTION';

/**
 * Network event payload (for local event emitter)
 */
export interface NetworkEventPayload {
  playerId?: string;
  state?: ConnectionState;
  error?: string;
  data?: unknown;
}

/**
 * Network configuration options
 */
export interface NetworkConfig {
  debug?: boolean;
  heartbeatInterval?: number;  // milliseconds
  heartbeatTimeout?: number;   // milliseconds
  reconnectAttempts?: number;
  reconnectDelay?: number;     // milliseconds
  messageTimeout?: number;     // milliseconds
}

/**
 * Default network configuration
 */
export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  debug: false,
  heartbeatInterval: 3000,     // 3 seconds
  heartbeatTimeout: 5000,      // 5 seconds
  reconnectAttempts: 3,
  reconnectDelay: 1000,        // 1 second base (exponential backoff)
  messageTimeout: 10000        // 10 seconds
};
