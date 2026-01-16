import { GameState, TurnPhase } from '../types/gameState';
import { PlayerState } from '../types/player';
import { Card } from '../types/cards';
import { TURN_TIMER_SECONDS } from '../config/constants';
import { gameEvents } from '../utils/EventEmitter';
import { EnergySystem } from './EnergySystem';
import { WallManager } from './WallManager';
import { MinerManager } from './MinerManager';
import { DeckManager } from './DeckManager';
import { CombatResolver } from './CombatResolver';

/**
 * Manages turn phases, timer, and turn resolution
 */
export class TurnManager {
  private gameState: GameState;
  private timerCallback: (() => void) | null = null;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  /**
   * Start a new turn
   */
  startTurn(): void {
    const turn = this.gameState.currentTurn;
    turn.phase = 'selection';
    turn.timerStartTime = Date.now();
    turn.timerDuration = TURN_TIMER_SECONDS * 1000;
    turn.player1Action = null;
    turn.player2Action = null;
    turn.player1Locked = false;
    turn.player2Locked = false;

    // For hot-seat, start with player 1
    if (this.gameState.isHotSeat) {
      turn.currentSelectingPlayer = 1;
    }

    // Step 1: Energy regeneration (alternating 2/3 pattern = 2.5 avg per turn)
    EnergySystem.regenerate(this.gameState.player1, turn.turnNumber);
    EnergySystem.regenerate(this.gameState.player2, turn.turnNumber);

    gameEvents.emit('TURN_START', {
      turnNumber: turn.turnNumber,
    });

    gameEvents.emit('TURN_PHASE_CHANGE', {
      from: 'turnEnd',
      to: 'selection',
    });
  }

  /**
   * Select a card for a player
   */
  selectCard(playerId: string, card: Card | null): boolean {
    const player = this.getPlayer(playerId);
    if (!player) return false;

    // Validate card is in hand and fully playable (affordable + action can succeed)
    if (card) {
      const inHand = player.hand.some((c) => c.id === card.id);
      if (!inHand) return false;

      // Full playability check - includes singleton restrictions
      if (!EnergySystem.isCardPlayable(player, card)) return false;
    }

    player.selectedCard = card;

    gameEvents.emit('CARD_SELECTED', {
      playerId,
      card,
    });

    return true;
  }

  /**
   * Lock in a player's action
   */
  lockAction(playerId: string): boolean {
    const turn = this.gameState.currentTurn;

    if (playerId === this.gameState.player1.id) {
      turn.player1Locked = true;
      turn.player1Action = {
        playerId,
        selectedCard: this.gameState.player1.selectedCard,
        timestamp: Date.now(),
      };
    } else if (playerId === this.gameState.player2.id) {
      turn.player2Locked = true;
      turn.player2Action = {
        playerId,
        selectedCard: this.gameState.player2.selectedCard,
        timestamp: Date.now(),
      };
    } else {
      return false;
    }

    gameEvents.emit('ACTION_LOCKED', {
      playerId,
    });

    // Check if both players locked (or hot-seat progression)
    if (this.gameState.isHotSeat) {
      if (turn.currentSelectingPlayer === 1 && turn.player1Locked) {
        // Switch to player 2
        turn.currentSelectingPlayer = 2;
        turn.timerStartTime = Date.now(); // Reset timer
        gameEvents.emit('PASS_TO_PLAYER', { player: 2 });
      } else if (turn.currentSelectingPlayer === 2 && turn.player2Locked) {
        // Both done, proceed to resolution
        this.startResolution();
      }
    } else {
      // Online mode: both must be locked
      if (turn.player1Locked && turn.player2Locked) {
        this.startResolution();
      }
    }

    return true;
  }

  /**
   * Handle timer expiration
   */
  onTimerExpired(): void {
    const turn = this.gameState.currentTurn;

    if (this.gameState.isHotSeat) {
      // Auto-lock current player with their selection (or pass)
      if (turn.currentSelectingPlayer === 1 && !turn.player1Locked) {
        this.lockAction(this.gameState.player1.id);
      } else if (turn.currentSelectingPlayer === 2 && !turn.player2Locked) {
        this.lockAction(this.gameState.player2.id);
      }
    } else {
      // Lock both players
      if (!turn.player1Locked) {
        this.lockAction(this.gameState.player1.id);
      }
      if (!turn.player2Locked) {
        this.lockAction(this.gameState.player2.id);
      }
    }

    gameEvents.emit('TIMER_EXPIRED', {});
  }

  /**
   * Start resolution phase
   */
  private startResolution(): void {
    const turn = this.gameState.currentTurn;
    turn.phase = 'reveal';

    gameEvents.emit('TURN_PHASE_CHANGE', {
      from: 'selection',
      to: 'reveal',
    });

    // Emit card reveal event
    gameEvents.emit('CARDS_REVEALED', {
      player1Card: turn.player1Action?.selectedCard ?? null,
      player2Card: turn.player2Action?.selectedCard ?? null,
    });

    // After reveal animation, proceed to resolution
    // In a real implementation, this would be delayed for animation
    this.resolveActions();
  }

  /**
   * Resolve the turn actions
   */
  private resolveActions(): void {
    const turn = this.gameState.currentTurn;
    turn.phase = 'resolution';

    const p1Card = turn.player1Action?.selectedCard ?? null;
    const p2Card = turn.player2Action?.selectedCard ?? null;

    // Energy is spent per-action, only if the action succeeds
    // This prevents wasting energy on failed wall/miner placements

    // Step 4: Place defenses (walls) - spend energy only if placement succeeds
    if (p1Card?.subtype === 'wall') {
      if (WallManager.placeWall(this.gameState.player1, p1Card, turn.turnNumber)) {
        EnergySystem.spendEnergy(this.gameState.player1, p1Card);
      }
    }
    if (p2Card?.subtype === 'wall') {
      if (WallManager.placeWall(this.gameState.player2, p2Card, turn.turnNumber)) {
        EnergySystem.spendEnergy(this.gameState.player2, p2Card);
      }
    }

    // Activate deflection for this turn (always succeeds, spend energy)
    if (p1Card?.subtype === 'deflection') {
      this.gameState.player1.field.activeDeflection = true;
      EnergySystem.spendEnergy(this.gameState.player1, p1Card);
    }
    if (p2Card?.subtype === 'deflection') {
      this.gameState.player2.field.activeDeflection = true;
      EnergySystem.spendEnergy(this.gameState.player2, p2Card);
    }

    // Step 5: Place miners - spend energy only if placement succeeds
    if (p1Card?.type === 'miner') {
      if (MinerManager.placeMiner(this.gameState.player1, p1Card, turn.turnNumber)) {
        EnergySystem.spendEnergy(this.gameState.player1, p1Card);
      }
    }
    if (p2Card?.type === 'miner') {
      if (MinerManager.placeMiner(this.gameState.player2, p2Card, turn.turnNumber)) {
        EnergySystem.spendEnergy(this.gameState.player2, p2Card);
      }
    }

    // Step 5b: Activate deflection miner protection BEFORE attacks (if payout this turn)
    // This must happen before attacks so the protection is active when projectiles are blocked
    if (MinerManager.hasDeflectionMiner(this.gameState.player1) &&
        MinerManager.willPayoutThisTurn(this.gameState.player1)) {
      this.gameState.player1.field.activeDeflectionMiner = true;
      gameEvents.emit('MINER_PAYOUT', {
        playerId: this.gameState.player1.id,
        minerType: 'deflection_miner',
        effect: 'deflection_protection',
      });
    }
    if (MinerManager.hasDeflectionMiner(this.gameState.player2) &&
        MinerManager.willPayoutThisTurn(this.gameState.player2)) {
      this.gameState.player2.field.activeDeflectionMiner = true;
      gameEvents.emit('MINER_PAYOUT', {
        playerId: this.gameState.player2.id,
        minerType: 'deflection_miner',
        effect: 'deflection_protection',
      });
    }

    // Step 6: Resolve attacks (always succeed, spend energy)
    // Pass turn number for miner protection (miners placed this turn are protected)
    if (p1Card?.type === 'attack') {
      EnergySystem.spendEnergy(this.gameState.player1, p1Card);
      CombatResolver.resolveAttack(
        this.gameState.player1,
        p1Card,
        this.gameState.player2,
        p2Card,
        turn.turnNumber
      );
    }
    if (p2Card?.type === 'attack') {
      EnergySystem.spendEnergy(this.gameState.player2, p2Card);
      CombatResolver.resolveAttack(
        this.gameState.player2,
        p2Card,
        this.gameState.player1,
        p1Card,
        turn.turnNumber
      );
    }

    // Step 7: Repair miner payouts BEFORE wall decay
    // This ensures repair miner can save a wall from being destroyed by decay
    this.processRepairMinerPayouts();

    // Step 8: Wall decay
    WallManager.applyDecay(this.gameState.player1);
    WallManager.applyDecay(this.gameState.player2);

    // Step 9: Other miner payouts (attack miners)
    this.processAttackMinerPayouts();

    // Step 10: Victory check
    const winner = CombatResolver.checkVictory(this.gameState);
    if (winner) {
      this.gameState.phase = 'gameOver';
      return;
    }

    // Step 11: Clear deflection and deflection miner protection (one-turn only)
    this.gameState.player1.field.activeDeflection = false;
    this.gameState.player2.field.activeDeflection = false;
    this.gameState.player1.field.activeDeflectionMiner = false;
    this.gameState.player2.field.activeDeflectionMiner = false;

    // Clear selected cards
    this.gameState.player1.selectedCard = null;
    this.gameState.player2.selectedCard = null;

    // No card draw needed - all 6 cards always visible

    // Save turn to history
    this.gameState.turnHistory.push([
      turn.player1Action!,
      turn.player2Action!,
    ]);

    // Step 13: Advance turn
    this.endTurn();
  }

  /**
   * Process repair miner payouts (before wall decay)
   * This ensures repair miners can save walls from decay destruction
   */
  private processRepairMinerPayouts(): void {
    // Player 1 repair miner
    if (MinerManager.getMinerType(this.gameState.player1) === 'repair_miner') {
      const shouldPayout = MinerManager.tickMiner(this.gameState.player1);
      if (shouldPayout) {
        this.executeMinerPayout(this.gameState.player1, this.gameState.player2);
      }
    }

    // Player 2 repair miner
    if (MinerManager.getMinerType(this.gameState.player2) === 'repair_miner') {
      const shouldPayout = MinerManager.tickMiner(this.gameState.player2);
      if (shouldPayout) {
        this.executeMinerPayout(this.gameState.player2, this.gameState.player1);
      }
    }
  }

  /**
   * Process attack miner payouts (after wall decay)
   * This includes projectile, continuous, and deflection miners
   */
  private processAttackMinerPayouts(): void {
    // Player 1 attack miner
    const p1MinerType = MinerManager.getMinerType(this.gameState.player1);
    if (p1MinerType && p1MinerType !== 'repair_miner') {
      const shouldPayout = MinerManager.tickMiner(this.gameState.player1);
      if (shouldPayout) {
        this.executeMinerPayout(this.gameState.player1, this.gameState.player2);
      }
    }

    // Player 2 attack miner
    const p2MinerType = MinerManager.getMinerType(this.gameState.player2);
    if (p2MinerType && p2MinerType !== 'repair_miner') {
      const shouldPayout = MinerManager.tickMiner(this.gameState.player2);
      if (shouldPayout) {
        this.executeMinerPayout(this.gameState.player2, this.gameState.player1);
      }
    }
  }

  /**
   * Execute a miner payout
   */
  private executeMinerPayout(owner: PlayerState, opponent: PlayerState): void {
    const miner = owner.field.miner;
    if (!miner) return;

    const effect = MinerManager.getPayoutEffect(miner);
    const turnNumber = this.gameState.currentTurn.turnNumber;

    gameEvents.emit('MINER_PAYOUT', {
      playerId: owner.id,
      minerType: miner.minerType,
      effect,
    });

    switch (miner.minerType) {
      case 'deflection_miner':
        // Activate projectile protection for this turn
        owner.field.activeDeflectionMiner = true;
        break;

      case 'projectile_miner':
        // Fire free projectile at opponent
        CombatResolver.resolveMinerAttack(
          owner,
          'projectile',
          opponent,
          opponent.selectedCard,
          turnNumber
        );
        break;

      case 'continuous_miner':
        // Fire free continuous at opponent
        CombatResolver.resolveMinerAttack(
          owner,
          'continuous',
          opponent,
          opponent.selectedCard,
          turnNumber
        );
        break;

      case 'repair_miner':
        // Repair wall to full HP
        WallManager.repairWall(owner);
        break;
    }
  }

  /**
   * End the current turn
   */
  private endTurn(): void {
    const turn = this.gameState.currentTurn;
    turn.phase = 'turnEnd';

    gameEvents.emit('TURN_END', {
      turnNumber: turn.turnNumber,
    });

    // Increment turn number
    turn.turnNumber++;

    // Start next turn
    this.startTurn();
  }

  /**
   * Get player by ID
   */
  private getPlayer(playerId: string): PlayerState | null {
    if (playerId === this.gameState.player1.id) {
      return this.gameState.player1;
    }
    if (playerId === this.gameState.player2.id) {
      return this.gameState.player2;
    }
    return null;
  }

  /**
   * Get current turn number
   */
  getTurnNumber(): number {
    return this.gameState.currentTurn.turnNumber;
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): TurnPhase {
    return this.gameState.currentTurn.phase;
  }

  /**
   * Get time remaining in selection phase (seconds)
   */
  getTimeRemaining(): number {
    const turn = this.gameState.currentTurn;
    const elapsed = Date.now() - turn.timerStartTime;
    const remaining = Math.max(0, turn.timerDuration - elapsed);
    return Math.ceil(remaining / 1000);
  }
}
