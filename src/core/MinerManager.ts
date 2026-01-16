import { PlayerState } from '../types/player';
import { Card, MinerState, CardSubtype } from '../types/cards';
import {
  DEFLECTION_MINER_INTERVAL,
  PROJECTILE_MINER_INTERVAL,
  CONTINUOUS_MINER_INTERVAL,
  REPAIR_MINER_INTERVAL,
} from '../config/constants';
import { gameEvents } from '../utils/EventEmitter';

/**
 * Manages miner placement, payouts, and death
 */
export class MinerManager {
  /**
   * Check if player can place a miner
   */
  static canPlaceMiner(player: PlayerState): boolean {
    return player.field.miner === null;
  }

  /**
   * Get payout interval for a miner type
   */
  static getPayoutInterval(minerType: CardSubtype): number {
    switch (minerType) {
      case 'deflection_miner':
        return DEFLECTION_MINER_INTERVAL;
      case 'projectile_miner':
        return PROJECTILE_MINER_INTERVAL;
      case 'continuous_miner':
        return CONTINUOUS_MINER_INTERVAL;
      case 'repair_miner':
        return REPAIR_MINER_INTERVAL;
      default:
        return 0;
    }
  }

  /**
   * Place a miner for a player
   * Returns true if successful, false if miner already exists
   */
  static placeMiner(player: PlayerState, card: Card, turnNumber: number): boolean {
    if (!this.canPlaceMiner(player)) {
      return false;
    }

    if (card.type !== 'miner') {
      return false;
    }

    const interval = this.getPayoutInterval(card.subtype);

    player.field.miner = {
      cardId: card.id,
      minerType: card.subtype,
      element: card.element,
      turnsUntilPayout: interval,
      payoutInterval: interval,
      turnPlaced: turnNumber,
    };

    gameEvents.emit('MINER_PLACED', {
      playerId: player.id,
      minerType: card.subtype,
      element: card.element,
      interval,
    });

    return true;
  }

  /**
   * Process miner payout countdown
   * Returns true if payout triggers this turn
   */
  static tickMiner(player: PlayerState): boolean {
    const miner = player.field.miner;
    if (!miner) return false;

    miner.turnsUntilPayout--;

    if (miner.turnsUntilPayout <= 0) {
      // Reset countdown
      miner.turnsUntilPayout = miner.payoutInterval;
      return true;
    }

    return false;
  }

  /**
   * Get the payout effect for a miner
   */
  static getPayoutEffect(miner: MinerState): string {
    switch (miner.minerType) {
      case 'deflection_miner':
        return 'deflection_protection';
      case 'projectile_miner':
        return 'free_projectile';
      case 'continuous_miner':
        return 'free_continuous';
      case 'repair_miner':
        return 'repair_wall';
      default:
        return 'none';
    }
  }

  /**
   * Check if miner is protected (placed this turn)
   * Miners get 1-turn grace period after placement
   */
  static isMinerProtected(player: PlayerState, currentTurn: number): boolean {
    if (!player.field.miner) return false;
    return player.field.miner.turnPlaced === currentTurn;
  }

  /**
   * Kill a player's miner (called when base takes damage)
   * Returns true if miner was killed, false if protected or no miner
   */
  static killMiner(player: PlayerState, currentTurn?: number): boolean {
    if (!player.field.miner) return false;

    // Miner is protected on the turn it was placed
    if (currentTurn !== undefined && this.isMinerProtected(player, currentTurn)) {
      gameEvents.emit('MINER_PROTECTED', {
        playerId: player.id,
        minerType: player.field.miner.minerType,
        reason: 'placement_protection',
      });
      return false;
    }

    const minerType = player.field.miner.minerType;
    player.field.miner = null;

    gameEvents.emit('MINER_KILLED', {
      playerId: player.id,
      minerType,
      reason: 'base_damage',
    });
    return true;
  }

  /**
   * Check if player has a miner
   */
  static hasMiner(player: PlayerState): boolean {
    return player.field.miner !== null;
  }

  /**
   * Check if player has deflection miner (for auto-blocking projectiles)
   */
  static hasDeflectionMiner(player: PlayerState): boolean {
    return player.field.miner?.minerType === 'deflection_miner';
  }

  /**
   * Get turns until next payout (or 0 if no miner)
   */
  static getTurnsUntilPayout(player: PlayerState): number {
    return player.field.miner?.turnsUntilPayout ?? 0;
  }

  /**
   * Check if miner will payout this turn (before ticking)
   */
  static willPayoutThisTurn(player: PlayerState): boolean {
    return player.field.miner?.turnsUntilPayout === 1;
  }

  /**
   * Check if deflection miner protection is currently active
   */
  static hasActiveDeflectionMiner(player: PlayerState): boolean {
    return player.field.activeDeflectionMiner;
  }

  /**
   * Get miner type (or null if no miner)
   */
  static getMinerType(player: PlayerState): CardSubtype | null {
    return player.field.miner?.minerType ?? null;
  }
}
