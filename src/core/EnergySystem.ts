import { PlayerState } from '../types/player';
import { Card } from '../types/cards';
import { MAX_ENERGY, ENERGY_PER_TURN_ODD, ENERGY_PER_TURN_EVEN } from '../config/constants';
import { gameEvents } from '../utils/EventEmitter';

/**
 * Manages energy for players
 */
export class EnergySystem {
  /**
   * Check if player can afford a card
   */
  static canAfford(player: PlayerState, card: Card): boolean {
    return player.stats.energy >= card.cost;
  }

  /**
   * Spend energy for a card
   * Returns true if successful, false if not enough energy
   */
  static spendEnergy(player: PlayerState, card: Card): boolean {
    if (!this.canAfford(player, card)) {
      return false;
    }

    const previousEnergy = player.stats.energy;
    player.stats.energy -= card.cost;

    gameEvents.emit('ENERGY_SPENT', {
      playerId: player.id,
      amount: card.cost,
      previousEnergy,
      newEnergy: player.stats.energy,
      cardId: card.id,
    });

    return true;
  }

  /**
   * Get energy for a specific turn (alternating 2/3 pattern = 2.5 avg)
   */
  static getEnergyForTurn(turnNumber: number): number {
    // Odd turns (1, 3, 5...) = 2 energy, Even turns (2, 4, 6...) = 3 energy
    return turnNumber % 2 === 1 ? ENERGY_PER_TURN_ODD : ENERGY_PER_TURN_EVEN;
  }

  /**
   * Regenerate energy at start of turn
   */
  static regenerate(player: PlayerState, turnNumber: number): void {
    const energyThisTurn = this.getEnergyForTurn(turnNumber);
    const previousEnergy = player.stats.energy;
    const gained = Math.min(energyThisTurn, MAX_ENERGY - player.stats.energy);
    player.stats.energy = Math.min(MAX_ENERGY, player.stats.energy + energyThisTurn);

    if (gained > 0) {
      gameEvents.emit('ENERGY_GAINED', {
        playerId: player.id,
        amount: gained,
        previousEnergy,
        newEnergy: player.stats.energy,
        reason: 'turn_start',
      });
    }
  }

  /**
   * Add energy directly (for future abilities)
   */
  static addEnergy(player: PlayerState, amount: number): void {
    const previousEnergy = player.stats.energy;
    const gained = Math.min(amount, MAX_ENERGY - player.stats.energy);
    player.stats.energy = Math.min(MAX_ENERGY, player.stats.energy + amount);

    if (gained > 0) {
      gameEvents.emit('ENERGY_GAINED', {
        playerId: player.id,
        amount: gained,
        previousEnergy,
        newEnergy: player.stats.energy,
        reason: 'bonus',
      });
    }
  }

  /**
   * Check if a specific card is playable (affordable AND action can succeed)
   */
  static isCardPlayable(player: PlayerState, card: Card): boolean {
    // Check energy cost
    if (!this.canAfford(player, card)) return false;

    // Check wall singleton - can't play wall if one already exists
    if (card.subtype === 'wall' && player.field.wall !== null) return false;

    // Check miner singleton - can't play miner if one already exists
    if (card.type === 'miner' && player.field.miner !== null) return false;

    return true;
  }

  /**
   * Get playable cards from hand (cards player can afford and can actually play)
   */
  static getPlayableCards(player: PlayerState): Card[] {
    return player.hand.filter((card) => this.isCardPlayable(player, card));
  }

  /**
   * Check if player has any playable cards
   */
  static hasPlayableCards(player: PlayerState): boolean {
    return this.getPlayableCards(player).length > 0;
  }
}
