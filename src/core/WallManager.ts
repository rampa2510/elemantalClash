import { PlayerState } from '../types/player';
import { Card, WallState } from '../types/cards';
import { WALL_HP, WALL_DECAY_PER_TURN } from '../config/constants';
import { gameEvents } from '../utils/EventEmitter';

/**
 * Manages wall placement, damage, and decay
 */
export class WallManager {
  /**
   * Check if player can place a wall
   */
  static canPlaceWall(player: PlayerState): boolean {
    return player.field.wall === null;
  }

  /**
   * Place a wall for a player
   * Returns true if successful, false if wall already exists
   */
  static placeWall(player: PlayerState, card: Card, turnNumber: number): boolean {
    if (!this.canPlaceWall(player)) {
      return false;
    }

    if (card.subtype !== 'wall') {
      return false;
    }

    player.field.wall = {
      cardId: card.id,
      element: card.element,
      maxHP: WALL_HP,
      currentHP: WALL_HP,
      turnPlaced: turnNumber,
    };

    gameEvents.emit('WALL_PLACED', {
      playerId: player.id,
      element: card.element,
      hp: WALL_HP,
    });

    return true;
  }

  /**
   * Damage a wall
   * Returns the overflow damage that hits the base
   */
  static damageWall(player: PlayerState, damage: number): number {
    const wall = player.field.wall;
    if (!wall) {
      return damage; // No wall, all damage goes through
    }

    const wallHP = wall.currentHP;

    if (wallHP >= damage) {
      // Wall absorbs all damage
      wall.currentHP -= damage;

      gameEvents.emit('WALL_DAMAGED', {
        playerId: player.id,
        damage,
        remainingHP: wall.currentHP,
      });

      // Check if wall is destroyed
      if (wall.currentHP <= 0) {
        this.destroyWall(player);
      }

      return 0; // No overflow
    } else {
      // Wall is destroyed, overflow damage
      const overflow = damage - wallHP;
      this.destroyWall(player);
      return overflow;
    }
  }

  /**
   * Apply wall decay at end of turn
   */
  static applyDecay(player: PlayerState): void {
    const wall = player.field.wall;
    if (!wall) return;

    const previousHP = wall.currentHP;
    wall.currentHP -= WALL_DECAY_PER_TURN;

    gameEvents.emit('WALL_DECAYED', {
      playerId: player.id,
      decay: WALL_DECAY_PER_TURN,
      previousHP,
      newHP: wall.currentHP,
    });

    if (wall.currentHP <= 0) {
      this.destroyWall(player);
    }
  }

  /**
   * Destroy a wall
   */
  static destroyWall(player: PlayerState): void {
    if (!player.field.wall) return;

    const element = player.field.wall.element;
    player.field.wall = null;

    gameEvents.emit('WALL_DESTROYED', {
      playerId: player.id,
      element,
    });
  }

  /**
   * Repair wall to full HP (for repair miner)
   */
  static repairWall(player: PlayerState): boolean {
    const wall = player.field.wall;
    if (!wall) return false;

    const previousHP = wall.currentHP;
    wall.currentHP = wall.maxHP;

    gameEvents.emit('WALL_DAMAGED', {
      playerId: player.id,
      damage: -(wall.maxHP - previousHP), // Negative damage = heal
      remainingHP: wall.currentHP,
    });

    return true;
  }

  /**
   * Get wall HP (or 0 if no wall)
   */
  static getWallHP(player: PlayerState): number {
    return player.field.wall?.currentHP ?? 0;
  }

  /**
   * Check if player has a wall
   */
  static hasWall(player: PlayerState): boolean {
    return player.field.wall !== null;
  }
}
