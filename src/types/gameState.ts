import { PlayerState } from './player';
import { TurnAction } from './cards';

// Game phases
export type GamePhase =
  | 'menu'           // Main menu
  | 'tutorial'       // Tutorial screen
  | 'draft'          // Deck building
  | 'playing'        // Main gameplay
  | 'gameOver';      // Victory/defeat

// Turn phases within gameplay
export type TurnPhase =
  | 'selection'      // Players selecting cards (10s timer)
  | 'reveal'         // Showing both cards
  | 'resolution'     // Applying effects
  | 'turnEnd';       // Cleanup, next turn prep

// Current turn state
export interface TurnState {
  turnNumber: number;
  phase: TurnPhase;
  timerStartTime: number;      // Timestamp when timer started
  timerDuration: number;       // Duration in ms (10000)

  // Which player is selecting (for hot-seat mode)
  currentSelectingPlayer: 1 | 2;

  // Actions submitted
  player1Action: TurnAction | null;
  player2Action: TurnAction | null;

  // Lock status
  player1Locked: boolean;
  player2Locked: boolean;
}

// Full game state
export interface GameState {
  gameId: string;
  phase: GamePhase;

  player1: PlayerState;
  player2: PlayerState;

  currentTurn: TurnState;
  turnHistory: TurnAction[][];  // History of all turns

  winner: string | null;        // Player ID of winner (null if ongoing)
  isDoubleKO: boolean;          // Both players reached 0 HP

  // Hot-seat mode flag
  isHotSeat: boolean;
}

// Create initial game state
export function createInitialGameState(
  player1: PlayerState,
  player2: PlayerState,
  isHotSeat: boolean = true
): GameState {
  return {
    gameId: generateGameId(),
    phase: 'playing',
    player1,
    player2,
    currentTurn: {
      turnNumber: 1,
      phase: 'selection',
      timerStartTime: Date.now(),
      timerDuration: 10000,
      currentSelectingPlayer: 1,
      player1Action: null,
      player2Action: null,
      player1Locked: false,
      player2Locked: false,
    },
    turnHistory: [],
    winner: null,
    isDoubleKO: false,
    isHotSeat,
  };
}

// Generate unique game ID
function generateGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
