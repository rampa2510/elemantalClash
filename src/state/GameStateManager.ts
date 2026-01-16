import { GameState, GamePhase, TurnPhase, createInitialGameState } from '../types/gameState';
import { PlayerState } from '../types/player';
import { Card } from '../types/cards';
import { gameEvents } from '../utils/EventEmitter';

/**
 * Central state management for the game
 */
export class GameStateManager {
  private state: GameState | null = null;
  private subscribers: Set<(state: GameState) => void> = new Set();

  /**
   * Initialize game state
   */
  initialize(player1: PlayerState, player2: PlayerState, isHotSeat: boolean = true): GameState {
    this.state = createInitialGameState(player1, player2, isHotSeat);
    this.notifySubscribers();
    return this.state;
  }

  /**
   * Get current state
   */
  getState(): GameState | null {
    return this.state;
  }

  /**
   * Get player 1
   */
  getPlayer1(): PlayerState | null {
    return this.state?.player1 ?? null;
  }

  /**
   * Get player 2
   */
  getPlayer2(): PlayerState | null {
    return this.state?.player2 ?? null;
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): PlayerState | null {
    if (!this.state) return null;
    if (playerId === 'player1' || playerId === this.state.player1.id) {
      return this.state.player1;
    }
    if (playerId === 'player2' || playerId === this.state.player2.id) {
      return this.state.player2;
    }
    return null;
  }

  /**
   * Get opponent for a player
   */
  getOpponent(playerId: string): PlayerState | null {
    if (!this.state) return null;
    if (playerId === 'player1' || playerId === this.state.player1.id) {
      return this.state.player2;
    }
    if (playerId === 'player2' || playerId === this.state.player2.id) {
      return this.state.player1;
    }
    return null;
  }

  /**
   * Set game phase
   */
  setPhase(phase: GamePhase): void {
    if (!this.state) return;
    const oldPhase = this.state.phase;
    this.state.phase = phase;

    gameEvents.emit('GAME_PHASE_CHANGE', {
      from: oldPhase,
      to: phase,
    });

    this.notifySubscribers();
  }

  /**
   * Set turn phase
   */
  setTurnPhase(phase: TurnPhase): void {
    if (!this.state) return;
    const oldPhase = this.state.currentTurn.phase;
    this.state.currentTurn.phase = phase;

    gameEvents.emit('TURN_PHASE_CHANGE', {
      from: oldPhase,
      to: phase,
    });

    this.notifySubscribers();
  }

  /**
   * Get current turn number
   */
  getTurnNumber(): number {
    return this.state?.currentTurn.turnNumber ?? 0;
  }

  /**
   * Get current turn phase
   */
  getTurnPhase(): TurnPhase | null {
    return this.state?.currentTurn.phase ?? null;
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return this.state?.phase === 'gameOver';
  }

  /**
   * Get winner
   */
  getWinner(): string | null {
    return this.state?.winner ?? null;
  }

  /**
   * Check if double KO
   */
  isDoubleKO(): boolean {
    return this.state?.isDoubleKO ?? false;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: GameState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(): void {
    if (this.state) {
      this.subscribers.forEach((callback) => callback(this.state!));
    }
  }

  /**
   * Force update notification
   */
  forceUpdate(): void {
    this.notifySubscribers();
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = null;
    this.notifySubscribers();
  }

  /**
   * Create snapshot for network sync
   */
  createSnapshot(): string {
    if (!this.state) return '';
    return JSON.stringify(this.state);
  }

  /**
   * Restore from snapshot
   */
  restoreFromSnapshot(snapshot: string): boolean {
    try {
      this.state = JSON.parse(snapshot);
      this.notifySubscribers();
      return true;
    } catch {
      return false;
    }
  }
}

// Global state manager instance
export const gameStateManager = new GameStateManager();
