import { networkManager } from './NetworkManager';
import { gameEvents } from '../utils/EventEmitter';
import { Card, CardInstance } from '../types/cards';
import { CardFactory } from '../core/CardFactory';

/**
 * MultiplayerGameCoordinator - Bridge between game logic and network layer
 * Coordinates draft sync, gameplay actions, and turn resolution
 */
export class MultiplayerGameCoordinator {
  private isMultiplayer: boolean = false;
  private isHost: boolean = false;
  private playerId: string = '';

  // Draft state
  private myDeck: CardInstance[] = [];
  private opponentDeck: string[] = []; // Card IDs from network
  private draftComplete: boolean = false;
  private opponentDraftComplete: boolean = false;
  private gameStarting: boolean = false; // Guard against double draft completion

  // Gameplay state
  private mySelectedCard: CardInstance | null = null;
  private myCardLocked: boolean = false;
  private opponentCardSelected: boolean = false;
  private opponentCardLocked: boolean = false;
  private lastOpponentCardId: string = ''; // Store opponent's card ID for resolution

  // Event cleanup
  private cleanupListeners: (() => void)[] = [];

  /**
   * Initialize multiplayer session
   */
  initializeSession(isHost: boolean, playerId: string): void {
    this.isMultiplayer = true;
    this.isHost = isHost;
    this.playerId = playerId;

    this.draftComplete = false;
    this.opponentDraftComplete = false;
    this.myCardLocked = false;
    this.opponentCardLocked = false;

    this.setupNetworkListeners();
    console.log(`[MultiplayerCoordinator] Session initialized - ${isHost ? 'HOST' : 'CLIENT'}, ID: ${playerId}`);
  }

  /**
   * Setup network message listeners
   */
  private setupNetworkListeners(): void {
    // Draft phase messages
    const cleanup1 = networkManager.on('DRAFT_COMPLETE', (msg) => {
      this.handleOpponentDraftComplete(msg.payload);
    });

    // Gameplay messages
    const cleanup2 = networkManager.on('PLAYER_ACTION', (msg) => {
      this.handleOpponentAction(msg.payload);
    });

    const cleanup3 = networkManager.on('STATE_UPDATE', (msg) => {
      this.handleStateUpdate(msg.payload);
    });

    const cleanup4 = networkManager.on('GAME_EVENT', (msg) => {
      this.handleGameEvent(msg.payload);
    });

    this.cleanupListeners.push(cleanup1, cleanup2, cleanup3, cleanup4);
  }

  // ====== DRAFT PHASE ======

  /**
   * Send my completed draft deck to opponent
   */
  sendDraftComplete(deck: CardInstance[]): void {
    if (!this.isMultiplayer) return;

    this.myDeck = deck;
    this.draftComplete = true;

    // Send deck to opponent (only card IDs, not full instances for security)
    const deckCardIds = deck.map(card => card.card.id);

    networkManager.send({
      type: 'DRAFT_COMPLETE',
      payload: {
        playerId: this.playerId,
        deck: deckCardIds,
      },
    });

    console.log('[MultiplayerCoordinator] Draft complete, sent to opponent');
    this.checkBothDraftsComplete();
  }

  /**
   * Handle opponent's draft completion
   */
  private handleOpponentDraftComplete(data: any): void {
    console.log('[MultiplayerCoordinator] Opponent draft complete received');
    this.opponentDeck = data.deck; // Store opponent's card IDs
    this.opponentDraftComplete = true;

    gameEvents.emit('OPPONENT_DRAFT_COMPLETE', { deck: data.deck });
    this.checkBothDraftsComplete();
  }

  /**
   * Check if both players completed draft
   */
  private checkBothDraftsComplete(): void {
    if (this.draftComplete && this.opponentDraftComplete && !this.gameStarting) {
      this.gameStarting = true; // Prevent double-triggering
      console.log('[MultiplayerCoordinator] Both drafts complete, starting game');
      gameEvents.emit('BOTH_DRAFTS_COMPLETE', {
        myDeck: this.myDeck,
        opponentDeck: this.opponentDeck,
      });
    }
  }

  /**
   * Check if waiting for opponent's draft
   */
  isWaitingForOpponentDraft(): boolean {
    return this.draftComplete && !this.opponentDraftComplete;
  }

  /**
   * Initialize draft phase (convenience method)
   */
  initializeDraftPhase(isHost: boolean): void {
    // Just use initializeSession with a generated player ID
    const playerId = isHost ? 'host' : 'client';
    this.initializeSession(isHost, playerId);
  }

  /**
   * Initialize gameplay phase (after draft complete)
   */
  initializeGameplayPhase(): void {
    // Reset gameplay state
    this.myCardLocked = false;
    this.opponentCardLocked = false;
    this.opponentCardSelected = false;
    console.log('[MultiplayerCoordinator] Gameplay phase initialized');
  }

  /**
   * Check if opponent has completed their draft
   */
  isOpponentDraftComplete(): boolean {
    return this.opponentDraftComplete;
  }

  /**
   * Get opponent's deck as Card array
   * Converts card IDs back to full Card objects
   * Medium Issue #2 fix: Strict validation to prevent corrupted decks
   */
  getOpponentDeck(): Card[] {
    if (!this.opponentDeck || this.opponentDeck.length === 0) {
      console.warn('[MultiplayerCoordinator] Opponent deck not available yet');
      return [];
    }

    const cards: Card[] = [];

    for (const cardId of this.opponentDeck) {
      const card = CardFactory.getCardById(cardId);
      if (!card) {
        // Medium Issue #2 fix: Throw error instead of silent failure
        const error = `Invalid card ID from opponent: ${cardId}`;
        console.error('[MultiplayerCoordinator]', error);
        throw new Error(error);
      }
      cards.push(card);
    }

    // Medium Issue #2 fix: Validate deck size
    if (cards.length !== 6) {
      const error = `Opponent deck has ${cards.length} cards, expected 6`;
      console.error('[MultiplayerCoordinator]', error);
      throw new Error(error);
    }

    return cards;
  }

  // ====== GAMEPLAY PHASE ======

  /**
   * Broadcast card selection (not locked yet)
   */
  broadcastCardSelection(cardInstanceId: string | null): void {
    if (!this.isMultiplayer) return;

    this.mySelectedCard = null; // We only track the selection state, not the full card for security

    networkManager.send({
      type: 'PLAYER_ACTION',
      payload: {
        action: 'SELECT_CARD',
        playerId: this.playerId,
        selected: cardInstanceId !== null,
      },
    });
  }

  /**
   * Broadcast card lock-in
   */
  broadcastCardLock(cardInstance: CardInstance): void {
    if (!this.isMultiplayer) return;

    this.mySelectedCard = cardInstance;
    this.myCardLocked = true;

    // Only send card ID, not full instance (host validates)
    networkManager.send({
      type: 'PLAYER_ACTION',
      payload: {
        action: 'LOCK_CARD',
        playerId: this.playerId,
        cardId: cardInstance.card.id,
        cardInstanceId: cardInstance.instanceId,
      },
    });

    console.log('[MultiplayerCoordinator] Card locked, sent to opponent');

    // Check if both players are now locked (handles race condition when local player locks second)
    if (this.myCardLocked && this.opponentCardLocked) {
      if (this.isHost) {
        console.log('[MultiplayerCoordinator] Both cards locked (local second), host resolving turn');
        gameEvents.emit('BOTH_CARDS_LOCKED_HOST', {
          myCard: this.mySelectedCard,
          opponentCardId: this.lastOpponentCardId,
        });
      } else {
        console.log('[MultiplayerCoordinator] Both cards locked (local second), waiting for host');
        gameEvents.emit('BOTH_CARDS_LOCKED_CLIENT', {});
      }
    }
  }

  /**
   * Handle opponent's action
   */
  private handleOpponentAction(data: any): void {
    if (data.action === 'SELECT_CARD') {
      this.opponentCardSelected = data.selected;
      gameEvents.emit('OPPONENT_CARD_SELECTED', { selected: data.selected });
    } else if (data.action === 'LOCK_CARD') {
      // Phase 4: Validate card exists in opponent's deck
      const validCard = this.opponentDeck?.includes(data.cardId);
      if (!validCard) {
        console.error('[MultiplayerCoordinator] Invalid card from opponent:', {
          cardId: data.cardId,
          opponentDeck: this.opponentDeck
        });
        gameEvents.emit('NETWORK_ERROR', {
          payload: { error: 'Opponent sent invalid card' }
        });
        networkManager.disconnect();
        return;
      }

      // Store opponent's card ID for resolution
      this.lastOpponentCardId = data.cardId;
      this.opponentCardLocked = true;
      gameEvents.emit('OPPONENT_CARD_LOCKED', {
        cardId: data.cardId,
        cardInstanceId: data.cardInstanceId,
      });

      // If both locked, trigger turn resolution (host-authoritative)
      if (this.myCardLocked && this.opponentCardLocked) {
        if (this.isHost) {
          console.log('[MultiplayerCoordinator] Both cards locked, host resolving turn');
          gameEvents.emit('BOTH_CARDS_LOCKED_HOST', {
            myCard: this.mySelectedCard,
            opponentCardId: data.cardId,
          });
        } else {
          console.log('[MultiplayerCoordinator] Both cards locked, waiting for host resolution');
          gameEvents.emit('BOTH_CARDS_LOCKED_CLIENT', {});
        }
      }
    }
  }

  /**
   * Broadcast state update (host only)
   */
  broadcastStateUpdate(state: any): void {
    if (!this.isMultiplayer || !this.isHost) return;

    networkManager.send({
      type: 'STATE_UPDATE',
      payload: {
        state,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Handle state update from host (client only)
   */
  private handleStateUpdate(data: any): void {
    if (this.isHost) return; // Only clients handle state updates

    console.log('[MultiplayerCoordinator] State update received from host');
    gameEvents.emit('HOST_STATE_UPDATE', { state: data.state });
  }

  /**
   * Broadcast game event (combat results, HP changes, etc.)
   */
  broadcastGameEvent(eventType: string, eventData: any): void {
    if (!this.isMultiplayer || !this.isHost) return;

    networkManager.send({
      type: 'GAME_EVENT',
      payload: {
        eventType,
        data: eventData,
      },
    });
  }

  /**
   * Handle game event from host
   */
  private handleGameEvent(data: any): void {
    if (this.isHost) return; // Only clients handle game events

    console.log('[MultiplayerCoordinator] Game event received:', data.eventType);
    gameEvents.emit('HOST_GAME_EVENT', {
      eventType: data.eventType,
      data: data.data,
    });
  }

  /**
   * Reset turn state for next turn
   */
  resetTurnState(): void {
    this.mySelectedCard = null;
    this.myCardLocked = false;
    this.opponentCardSelected = false;
    this.opponentCardLocked = false;
  }

  /**
   * Check if opponent has selected a card
   */
  isOpponentCardSelected(): boolean {
    return this.opponentCardSelected;
  }

  /**
   * Check if opponent has locked their card
   */
  isOpponentCardLocked(): boolean {
    return this.opponentCardLocked;
  }

  /**
   * Check if both players have locked
   */
  areBothCardsLocked(): boolean {
    return this.myCardLocked && this.opponentCardLocked;
  }

  /**
   * Get multiplayer status
   */
  isActive(): boolean {
    return this.isMultiplayer;
  }

  /**
   * Get host status
   */
  isHostPlayer(): boolean {
    return this.isHost;
  }

  /**
   * Get player ID
   */
  getPlayerId(): string {
    return this.playerId;
  }

  /**
   * Clean up
   */
  cleanup(): void {
    this.cleanupListeners.forEach(cleanup => cleanup());
    this.cleanupListeners = [];

    this.isMultiplayer = false;
    this.myDeck = [];
    this.opponentDeck = [];
    this.draftComplete = false;
    this.opponentDraftComplete = false;
    this.resetTurnState();

    console.log('[MultiplayerCoordinator] Cleaned up');
  }
}

// Export singleton instance
export const multiplayerCoordinator = new MultiplayerGameCoordinator();
