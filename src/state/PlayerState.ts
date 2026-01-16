import { PlayerState, PlayerStats, PlayerField, createInitialPlayerState } from '../types/player';
import { Card, WallState, MinerState } from '../types/cards';
import { BASE_HP, START_ENERGY, MAX_ENERGY } from '../config/constants';

/**
 * Helper functions for player state operations
 */
export class PlayerStateHelper {
  /**
   * Create a fresh player state
   */
  static create(
    id: string,
    name: string,
    deck: Card[],
    isLocal: boolean = true,
    isAI: boolean = false
  ): PlayerState {
    return createInitialPlayerState(id, name, deck, isLocal, isAI);
  }

  /**
   * Clone a player state (deep copy)
   */
  static clone(player: PlayerState): PlayerState {
    return {
      ...player,
      stats: { ...player.stats },
      field: {
        wall: player.field.wall ? { ...player.field.wall } : null,
        miner: player.field.miner ? { ...player.field.miner } : null,
        activeDeflection: player.field.activeDeflection,
        activeDeflectionMiner: player.field.activeDeflectionMiner,
      },
      deck: [...player.deck],
      hand: [...player.hand],
      discard: [...player.discard],
    };
  }

  /**
   * Get HP percentage (0-100)
   */
  static getHPPercent(player: PlayerState): number {
    return (player.stats.baseHP / player.stats.maxHP) * 100;
  }

  /**
   * Get energy percentage (0-100)
   */
  static getEnergyPercent(player: PlayerState): number {
    return (player.stats.energy / player.stats.maxEnergy) * 100;
  }

  /**
   * Check if player is alive
   */
  static isAlive(player: PlayerState): boolean {
    return player.stats.baseHP > 0;
  }

  /**
   * Check if player can do anything this turn
   */
  static canAct(player: PlayerState): boolean {
    // Player can always pass, so always true
    return true;
  }

  /**
   * Get wall HP percentage (0-100, or 0 if no wall)
   */
  static getWallHPPercent(player: PlayerState): number {
    if (!player.field.wall) return 0;
    return (player.field.wall.currentHP / player.field.wall.maxHP) * 100;
  }

  /**
   * Get a summary of player's current state
   */
  static getSummary(player: PlayerState): string {
    const parts: string[] = [
      `HP: ${player.stats.baseHP}/${player.stats.maxHP}`,
      `Energy: ${player.stats.energy}/${player.stats.maxEnergy}`,
      `Hand: ${player.hand.length} cards`,
      `Deck: ${player.deck.length} cards`,
    ];

    if (player.field.wall) {
      parts.push(`Wall: ${player.field.wall.currentHP}/${player.field.wall.maxHP} HP`);
    }

    if (player.field.miner) {
      parts.push(`Miner: ${player.field.miner.minerType}`);
    }

    return parts.join(' | ');
  }

  /**
   * Reset player to initial state (for rematch)
   */
  static reset(player: PlayerState, deck: Card[]): void {
    player.stats.baseHP = BASE_HP;
    player.stats.energy = START_ENERGY;
    player.field.wall = null;
    player.field.miner = null;
    player.field.activeDeflection = false;
    player.field.activeDeflectionMiner = false;
    player.deck = [...deck];
    player.hand = [];
    player.discard = [];
    player.selectedCard = null;
    player.hasLockedIn = false;
  }
}
