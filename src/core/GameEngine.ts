import { GameState, GamePhase, createInitialGameState } from '../types/gameState';
import { PlayerState, createInitialPlayerState } from '../types/player';
import { Card } from '../types/cards';
import { TurnManager } from './TurnManager';
import { DraftManager } from './DraftManager';
import { DeckManager } from './DeckManager';
import { CardFactory } from './CardFactory';
import { gameEvents } from '../utils/EventEmitter';
import { DOUBLE_LOSS_MESSAGES } from '../config/constants';
import { gameRandom } from '../utils/RandomGenerator';

/**
 * Main game engine - orchestrates all game systems
 */
export class GameEngine {
  private gameState: GameState | null = null;
  private turnManager: TurnManager | null = null;
  private player1Draft: DraftManager | null = null;
  private player2Draft: DraftManager | null = null;

  /**
   * Start a new game with two players
   */
  startGame(
    player1Name: string,
    player2Name: string,
    player1Deck: Card[],
    player2Deck: Card[],
    isHotSeat: boolean = true
  ): GameState {
    // Create player states
    const player1 = createInitialPlayerState('player1', player1Name, player1Deck, true, false);
    const player2 = createInitialPlayerState('player2', player2Name, player2Deck, !isHotSeat, false);

    // Initialize hands
    DeckManager.initializeHand(player1);
    DeckManager.initializeHand(player2);

    // Create game state
    this.gameState = createInitialGameState(player1, player2, isHotSeat);

    // Create turn manager
    this.turnManager = new TurnManager(this.gameState);

    // Emit game start event
    gameEvents.emit('GAME_PHASE_CHANGE', {
      from: 'menu',
      to: 'playing',
    });

    // Start first turn
    this.turnManager.startTurn();

    return this.gameState;
  }

  /**
   * Start game with draft phase
   */
  startDraft(player1Name: string, player2Name: string): void {
    this.player1Draft = new DraftManager('player1');
    this.player2Draft = new DraftManager('player2');

    gameEvents.emit('GAME_PHASE_CHANGE', {
      from: 'menu',
      to: 'draft',
    });
  }

  /**
   * Get draft manager for a player
   */
  getDraftManager(playerId: string): DraftManager | null {
    if (playerId === 'player1') return this.player1Draft;
    if (playerId === 'player2') return this.player2Draft;
    return null;
  }

  /**
   * Complete draft and start game
   */
  completeDraft(player1Name: string, player2Name: string): GameState | null {
    if (!this.player1Draft || !this.player2Draft) {
      return null;
    }

    if (!this.player1Draft.isComplete() || !this.player2Draft.isComplete()) {
      return null;
    }

    const player1Deck = this.player1Draft.getSelectedDeck();
    const player2Deck = this.player2Draft.getSelectedDeck();

    return this.startGame(player1Name, player2Name, player1Deck, player2Deck, true);
  }

  /**
   * Start a quick game with starter decks (for testing)
   */
  startQuickGame(player1Name: string, player2Name: string): GameState {
    const deck1 = CardFactory.createStarterDeck();
    const deck2 = CardFactory.createStarterDeck();
    return this.startGame(player1Name, player2Name, deck1, deck2, true);
  }

  /**
   * Get current game state
   */
  getGameState(): GameState | null {
    return this.gameState;
  }

  /**
   * Get turn manager
   */
  getTurnManager(): TurnManager | null {
    return this.turnManager;
  }

  /**
   * Select a card for current player (hot-seat mode)
   */
  selectCard(playerId: string, card: Card | null): boolean {
    if (!this.turnManager) return false;
    return this.turnManager.selectCard(playerId, card);
  }

  /**
   * Lock in current selection
   */
  lockIn(playerId: string): boolean {
    if (!this.turnManager) return false;
    return this.turnManager.lockAction(playerId);
  }

  /**
   * Handle timer expiration
   */
  handleTimerExpired(): void {
    this.turnManager?.onTimerExpired();
  }

  /**
   * Get current player for hot-seat mode
   */
  getCurrentPlayer(): PlayerState | null {
    if (!this.gameState) return null;

    const currentPlayerNum = this.gameState.currentTurn.currentSelectingPlayer;
    return currentPlayerNum === 1 ? this.gameState.player1 : this.gameState.player2;
  }

  /**
   * Get opponent for hot-seat mode
   */
  getOpponent(): PlayerState | null {
    if (!this.gameState) return null;

    const currentPlayerNum = this.gameState.currentTurn.currentSelectingPlayer;
    return currentPlayerNum === 1 ? this.gameState.player2 : this.gameState.player1;
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return this.gameState?.phase === 'gameOver';
  }

  /**
   * Get winner ID (or null if draw/ongoing)
   */
  getWinner(): string | null {
    return this.gameState?.winner ?? null;
  }

  /**
   * Check if double KO occurred
   */
  isDoubleKO(): boolean {
    return this.gameState?.isDoubleKO ?? false;
  }

  /**
   * Get random anti-war message for double KO
   */
  getDoubleKOMessage(): string {
    return gameRandom.pick(DOUBLE_LOSS_MESSAGES);
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): PlayerState | null {
    if (!this.gameState) return null;
    if (playerId === 'player1') return this.gameState.player1;
    if (playerId === 'player2') return this.gameState.player2;
    return null;
  }

  /**
   * Get current turn number
   */
  getTurnNumber(): number {
    return this.gameState?.currentTurn.turnNumber ?? 0;
  }

  /**
   * Get time remaining in current selection phase
   */
  getTimeRemaining(): number {
    return this.turnManager?.getTimeRemaining() ?? 0;
  }

  /**
   * Reset game
   */
  reset(): void {
    this.gameState = null;
    this.turnManager = null;
    this.player1Draft = null;
    this.player2Draft = null;

    gameEvents.emit('GAME_PHASE_CHANGE', {
      from: 'gameOver',
      to: 'menu',
    });
  }
}

// Global game engine instance
export const gameEngine = new GameEngine();
