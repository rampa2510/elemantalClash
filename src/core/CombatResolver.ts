import { PlayerState } from '../types/player';
import { Card, AttackResult } from '../types/cards';
import { GameState } from '../types/gameState';
import {
  DEFLECTION_VS_CONTINUOUS,
  PROJECTILE_DAMAGE,
  CONTINUOUS_DAMAGE,
  WALL_HP,
} from '../config/constants';
import { gameEvents } from '../utils/EventEmitter';
import { WallManager } from './WallManager';
import { MinerManager } from './MinerManager';

/**
 * Resolves combat between players
 * This is the core game logic for turn resolution
 */
export class CombatResolver {
  /**
   * Resolve an attack from attacker to defender
   */
  static resolveAttack(
    attacker: PlayerState,
    attackCard: Card,
    defender: PlayerState,
    defenderCard: Card | null,
    currentTurn?: number
  ): AttackResult {
    const result: AttackResult = {
      attackerId: attacker.id,
      defenderId: defender.id,
      attackType: attackCard.subtype as 'continuous' | 'projectile',
      rawDamage: attackCard.power,
      finalDamage: attackCard.power,
      damageToWall: 0,
      damageToBase: 0,
      wallDestroyed: false,
      minerKilled: false,
      blockedBy: null,
    };

    // Check if defender played deflection this turn
    const hasDeflection = defenderCard?.subtype === 'deflection';

    if (attackCard.subtype === 'continuous') {
      // === CONTINUOUS ATTACK LOGIC ===

      // Deflection reduces damage by 2
      if (hasDeflection) {
        result.finalDamage = Math.max(0, result.finalDamage - DEFLECTION_VS_CONTINUOUS);
        result.blockedBy = 'deflection';
      }

      // Wall blocks continuous attacks
      if (defender.field.wall && defender.field.wall.currentHP > 0) {
        const wallHP = defender.field.wall.currentHP;

        if (wallHP >= result.finalDamage) {
          // Wall absorbs all damage
          result.damageToWall = result.finalDamage;
          result.damageToBase = 0;
          defender.field.wall.currentHP -= result.finalDamage;

          gameEvents.emit('WALL_DAMAGED', {
            playerId: defender.id,
            damage: result.finalDamage,
            remainingHP: defender.field.wall.currentHP,
          });

          // Emit blocked event for turn summary
          gameEvents.emit('DAMAGE_BLOCKED', {
            targetId: defender.id,
            amount: result.finalDamage,
            blockedBy: 'wall',
            attackType: 'continuous',
          });

          // Check if wall destroyed
          if (defender.field.wall.currentHP <= 0) {
            WallManager.destroyWall(defender);
            result.wallDestroyed = true;
          }
        } else {
          // Wall is destroyed, overflow to base
          result.damageToWall = wallHP;
          result.damageToBase = result.finalDamage - wallHP;
          result.wallDestroyed = true;
          WallManager.destroyWall(defender);
        }
      } else {
        // No wall, all damage to base
        result.damageToBase = result.finalDamage;
      }

    } else if (attackCard.subtype === 'projectile') {
      // === PROJECTILE ATTACK LOGIC ===

      // Deflection blocks projectile 100%
      if (hasDeflection) {
        result.finalDamage = 0;
        result.damageToBase = 0;
        result.blockedBy = 'deflection';

        gameEvents.emit('DAMAGE_BLOCKED', {
          targetId: defender.id,
          amount: result.rawDamage,
          blockedBy: 'deflection',
          attackType: 'projectile',
        });
        return result;
      }

      // Deflection Miner blocks projectiles (only on payout turns)
      if (MinerManager.hasActiveDeflectionMiner(defender)) {
        result.finalDamage = 0;
        result.damageToBase = 0;
        result.blockedBy = 'deflection_miner';

        gameEvents.emit('DAMAGE_BLOCKED', {
          targetId: defender.id,
          amount: result.rawDamage,
          blockedBy: 'deflection_miner',
          attackType: 'projectile',
        });
        return result;
      }

      // Projectile BYPASSES wall entirely
      result.damageToBase = result.finalDamage;
    }

    // Apply damage to base
    if (result.damageToBase > 0) {
      defender.stats.baseHP -= result.damageToBase;

      gameEvents.emit('DAMAGE_DEALT', {
        targetId: defender.id,
        amount: result.damageToBase,
        source: 'attack',
        attackType: result.attackType,
      });

      // CRITICAL: If base takes ANY damage, miner dies (unless protected)
      if (MinerManager.hasMiner(defender)) {
        const killed = MinerManager.killMiner(defender, currentTurn);
        result.minerKilled = killed;
      }
    }

    return result;
  }

  /**
   * Resolve a free attack from a miner payout
   */
  static resolveMinerAttack(
    attacker: PlayerState,
    attackType: 'projectile' | 'continuous',
    defender: PlayerState,
    defenderCard: Card | null,
    currentTurn?: number
  ): AttackResult {
    // Create a virtual card for the miner attack
    const virtualCard: Card = {
      id: `miner_${attackType}`,
      name: attackType === 'projectile' ? 'Miner Projectile' : 'Miner Continuous',
      element: 'fire',
      type: 'attack',
      subtype: attackType,
      cost: 0,
      power: attackType === 'projectile' ? PROJECTILE_DAMAGE : CONTINUOUS_DAMAGE,
      description: 'Attack from miner payout',
    };

    return this.resolveAttack(attacker, virtualCard, defender, defenderCard, currentTurn);
  }

  /**
   * Check victory conditions
   * Returns: 'player1' | 'player2' | 'draw' | null
   */
  static checkVictory(gameState: GameState): string | null {
    const p1Dead = gameState.player1.stats.baseHP <= 0;
    const p2Dead = gameState.player2.stats.baseHP <= 0;

    if (p1Dead && p2Dead) {
      gameState.isDoubleKO = true;
      gameEvents.emit('DOUBLE_KO', {
        player1Id: gameState.player1.id,
        player2Id: gameState.player2.id,
      });
      return 'draw';
    }

    if (p1Dead) {
      gameState.winner = gameState.player2.id;
      gameEvents.emit('VICTORY', {
        winnerId: gameState.player2.id,
        winnerName: gameState.player2.name,
        loserId: gameState.player1.id,
        loserName: gameState.player1.name,
        finalHP: {
          winner: gameState.player2.stats.baseHP,
          loser: gameState.player1.stats.baseHP,
        },
      });
      return 'player2';
    }

    if (p2Dead) {
      gameState.winner = gameState.player1.id;
      gameEvents.emit('VICTORY', {
        winnerId: gameState.player1.id,
        winnerName: gameState.player1.name,
        loserId: gameState.player2.id,
        loserName: gameState.player2.name,
        finalHP: {
          winner: gameState.player1.stats.baseHP,
          loser: gameState.player2.stats.baseHP,
        },
      });
      return 'player1';
    }

    return null;
  }
}
