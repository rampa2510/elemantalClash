import { Card, CardInstance } from '../types/cards';
import {
  WALL_OPTIONS,
  DEFLECTION_OPTIONS,
  CONTINUOUS_OPTIONS,
  PROJECTILE_OPTIONS,
  MINER_OPTIONS,
  getAllCards,
} from '../config/cardDefinitions';
import { gameRandom } from '../utils/RandomGenerator';

let instanceCounter = 0;

/**
 * Creates card instances from card definitions
 */
export class CardFactory {
  /**
   * Create a card instance from a card definition
   */
  static createInstance(card: Card): CardInstance {
    return {
      instanceId: `card_${++instanceCounter}_${Date.now()}`,
      card,
    };
  }

  /**
   * Get card by ID
   */
  static getCardById(id: string): Card | undefined {
    return getAllCards().find((c) => c.id === id);
  }

  /**
   * Get all wall cards
   */
  static getWallCards(): Card[] {
    return [...WALL_OPTIONS];
  }

  /**
   * Get all deflection cards
   */
  static getDeflectionCards(): Card[] {
    return [...DEFLECTION_OPTIONS];
  }

  /**
   * Get all continuous attack cards
   */
  static getContinuousCards(): Card[] {
    return [...CONTINUOUS_OPTIONS];
  }

  /**
   * Get all projectile attack cards
   */
  static getProjectileCards(): Card[] {
    return [...PROJECTILE_OPTIONS];
  }

  /**
   * Get all miner cards
   */
  static getMinerCards(): Card[] {
    return [...MINER_OPTIONS];
  }

  /**
   * Get random cards from a category
   */
  static getRandomCards(cards: Card[], count: number): Card[] {
    const shuffled = gameRandom.shuffled(cards);
    return shuffled.slice(0, count);
  }

  /**
   * Create a default starter deck (for testing)
   * Follows deck rules: 1 Shield + 1 Dodge + 1 Blast + 1 Shot + 2 Bots
   */
  static createStarterDeck(): Card[] {
    return [
      WALL_OPTIONS[0],        // Fire Shield
      DEFLECTION_OPTIONS[0],  // Air Dodge
      CONTINUOUS_OPTIONS[0],  // Fire Blast
      PROJECTILE_OPTIONS[0],  // Fire Shot
      MINER_OPTIONS[0],       // Dodge Bot
      MINER_OPTIONS[1],       // Shot Bot
    ];
  }

  /**
   * Create a random balanced deck
   * ENFORCES: 1 Shield + 1 Dodge + 1 Blast + 1 Shot + 2 different Bots
   */
  static createRandomDeck(): Card[] {
    // Pick 2 different bots
    const shuffledMiners = gameRandom.shuffled([...MINER_OPTIONS]);
    const bot1 = shuffledMiners[0];
    const bot2 = shuffledMiners[1];

    return [
      gameRandom.pick(WALL_OPTIONS),       // 1 Shield
      gameRandom.pick(DEFLECTION_OPTIONS), // 1 Dodge
      gameRandom.pick(CONTINUOUS_OPTIONS), // 1 Blast
      gameRandom.pick(PROJECTILE_OPTIONS), // 1 Shot
      bot1,                                // Bot #1
      bot2,                                // Bot #2 (different from #1)
    ];
  }

  /**
   * Validate a deck
   * Rules: 6 cards total = 1 Shield + 1 Dodge + 1 Blast + 1 Shot + 2 Bots
   */
  static validateDeck(deck: Card[]): { valid: boolean; error?: string } {
    if (deck.length !== 6) {
      return { valid: false, error: `Deck must have exactly 6 cards, got ${deck.length}` };
    }

    // Count each type
    const walls = deck.filter(c => c.subtype === 'wall').length;
    const deflections = deck.filter(c => c.subtype === 'deflection').length;
    const continuous = deck.filter(c => c.subtype === 'continuous').length;
    const projectiles = deck.filter(c => c.subtype === 'projectile').length;
    const miners = deck.filter(c => c.type === 'miner').length;

    if (walls !== 1) {
      return { valid: false, error: `Deck must have exactly 1 Shield, got ${walls}` };
    }
    if (deflections !== 1) {
      return { valid: false, error: `Deck must have exactly 1 Dodge, got ${deflections}` };
    }
    if (continuous !== 1) {
      return { valid: false, error: `Deck must have exactly 1 Blast, got ${continuous}` };
    }
    if (projectiles !== 1) {
      return { valid: false, error: `Deck must have exactly 1 Shot, got ${projectiles}` };
    }
    if (miners !== 2) {
      return { valid: false, error: `Deck must have exactly 2 Bots, got ${miners}` };
    }

    // Check that the 2 bots are different
    const minerCards = deck.filter(c => c.type === 'miner');
    if (minerCards.length === 2 && minerCards[0].id === minerCards[1].id) {
      return { valid: false, error: 'Deck must have 2 different Bots' };
    }

    return { valid: true };
  }
}
