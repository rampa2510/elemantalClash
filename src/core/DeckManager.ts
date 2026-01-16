import { PlayerState } from '../types/player';
import { Card } from '../types/cards';
import { HAND_SIZE } from '../config/constants';
import { gameRandom } from '../utils/RandomGenerator';

/**
 * Manages deck/hand - all 6 cards always visible (no draw mechanics)
 */
export class DeckManager {
  /**
   * Initialize a player's hand with ALL cards from deck
   * All 6 cards are always visible - pure strategy game
   */
  static initializeHand(player: PlayerState): void {
    // Move all deck cards to hand - all cards always visible
    player.hand = [...player.deck];
    player.deck = []; // Deck is empty, all cards in hand
  }

  /**
   * @deprecated - Cards are no longer removed in the 6-card visible system
   */
  static removeFromHand(_player: PlayerState, _card: Card): boolean {
    // No-op: Cards stay in hand forever (singleton restrictions via EnergySystem)
    return true;
  }

  /**
   * @deprecated - No card drawing in 6-card visible system
   */
  static refillHand(_player: PlayerState): number {
    // No-op: All cards always visible
    return 0;
  }

  /**
   * @deprecated - No shuffling needed
   */
  static shuffleDeck(_player: PlayerState): void {
    // No-op
  }

  /**
   * @deprecated - No card drawing
   */
  static drawCard(_player: PlayerState): Card | null {
    return null;
  }

  /**
   * @deprecated - No card drawing
   */
  static drawCards(_player: PlayerState, _count: number): Card[] {
    return [];
  }

  /**
   * Get remaining deck size
   */
  static getDeckSize(player: PlayerState): number {
    return player.deck.length;
  }

  /**
   * Get hand size
   */
  static getHandSize(player: PlayerState): number {
    return player.hand.length;
  }

  /**
   * Check if hand is full
   */
  static isHandFull(player: PlayerState): boolean {
    return player.hand.length >= HAND_SIZE;
  }

  /**
   * Check if deck is empty
   */
  static isDeckEmpty(player: PlayerState): boolean {
    return player.deck.length === 0;
  }

  /**
   * Shuffle discard pile back into deck
   */
  static reshuffleDiscard(player: PlayerState): void {
    player.deck = [...player.deck, ...player.discard];
    player.discard = [];
    this.shuffleDeck(player);
  }
}
