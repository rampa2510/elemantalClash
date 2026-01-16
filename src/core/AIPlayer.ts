import { PlayerState } from '../types/player';
import { Card } from '../types/cards';
import { EnergySystem } from './EnergySystem';
import { gameRandom } from '../utils/RandomGenerator';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

/**
 * AI Player for single-player mode
 */
export class AIPlayer {
  private difficulty: AIDifficulty;

  constructor(difficulty: AIDifficulty = 'medium') {
    this.difficulty = difficulty;
  }

  /**
   * Choose a card to play
   */
  chooseCard(aiState: PlayerState, opponentState: PlayerState): Card | null {
    console.log(`🤖 AI (${this.difficulty}) choosing card...`);

    let chosenCard: Card | null = null;

    switch (this.difficulty) {
      case 'easy':
        chosenCard = this.chooseCardEasy(aiState, opponentState);
        break;
      case 'medium':
        chosenCard = this.chooseCardMedium(aiState, opponentState);
        break;
      case 'hard':
        chosenCard = this.chooseCardHard(aiState, opponentState);
        break;
      default:
        chosenCard = this.chooseCardMedium(aiState, opponentState);
    }

    if (chosenCard) {
      console.log(`   Selected: ${chosenCard.name} (${chosenCard.type})`);
    } else {
      console.log('   No playable cards - passing');
    }

    return chosenCard;
  }

  /**
   * Easy AI: Intentionally bad decisions (90% player win rate)
   * Phase 3: Rewritten to make AI lose most of the time
   */
  private chooseCardEasy(aiState: PlayerState, opponentState: PlayerState): Card | null {
    const playable = EnergySystem.getPlayableCards(aiState);
    if (playable.length === 0) return null;

    // 90% chance: Pick worst card (intentionally bad play)
    if (gameRandom.chance(0.9)) {
      return this.pickWorstCard(playable, aiState, opponentState);
    }

    // 10% chance: Pick mediocre card (to avoid being too obvious)
    return this.pickMediocreCard(playable, aiState, opponentState);
  }

  /**
   * Pick the worst card for the current situation
   * Strategy: Do exactly what you SHOULDN'T do
   */
  private pickWorstCard(
    playable: Card[],
    aiState: PlayerState,
    opponentState: PlayerState
  ): Card {
    // 1. Attack when opponent has walls (waste damage on walls)
    if (opponentState.field.wall && opponentState.field.wall.currentHP > 0) {
      const attacks = playable.filter(c => c.type === 'attack');
      if (attacks.length > 0) {
        // Pick weakest attack (most inefficient)
        const weakest = attacks.reduce((worst, card) =>
          (card.cost < worst.cost) ? card : worst
        );
        return weakest;
      }
    }

    // 2. Build miners when low HP (economy over survival - bad!)
    if (aiState.stats.baseHP < 15) {
      const miners = playable.filter(c => c.type === 'miner');
      if (miners.length > 0) {
        return gameRandom.pick(miners);
      }
    }

    // 3. Play expensive cards when low resources (bad economy)
    if (aiState.stats.energy < 5) {
      const expensive = playable.filter(c => c.cost >= 4);
      if (expensive.length > 0) {
        return gameRandom.pick(expensive);
      }
    }

    // 4. Ignore defending when low HP (no survival instinct)
    if (aiState.stats.baseHP < 10) {
      const attacks = playable.filter(c => c.type === 'attack');
      if (attacks.length > 0) {
        return gameRandom.pick(attacks);
      }
    }

    // 5. Place wall when already have one (wasted card)
    if (aiState.field.wall) {
      const walls = playable.filter(c => c.subtype === 'wall');
      if (walls.length > 0) {
        return gameRandom.pick(walls);
      }
    }

    // Fallback: Random card (still bad, but less predictably so)
    return gameRandom.pick(playable);
  }

  /**
   * Pick a mediocre card (simple logic without strategic depth)
   * This makes AI look like it's trying but not thinking deeply
   */
  private pickMediocreCard(
    playable: Card[],
    aiState: PlayerState,
    opponentState: PlayerState
  ): Card {
    // Simple defensive logic when very low HP
    if (aiState.stats.baseHP < 8) {
      const defenses = playable.filter(c => c.type === 'defense');
      if (defenses.length > 0) {
        return gameRandom.pick(defenses);
      }
    }

    // Build miners when resources are high (somewhat reasonable)
    if (aiState.stats.energy > 7 && !aiState.field.miner) {
      const miners = playable.filter(c => c.type === 'miner');
      if (miners.length > 0) {
        return gameRandom.pick(miners);
      }
    }

    // Attack by default
    const attacks = playable.filter(c => c.type === 'attack');
    if (attacks.length > 0) {
      return gameRandom.pick(attacks);
    }

    // Fallback: Pick any card
    return gameRandom.pick(playable);
  }

  /**
   * Medium AI: Basic strategy
   * IMPORTANT: AI should NEVER pass when it has playable cards
   */
  private chooseCardMedium(aiState: PlayerState, opponentState: PlayerState): Card | null {
    const playable = EnergySystem.getPlayableCards(aiState);

    // If no playable cards, must pass
    if (playable.length === 0) {
      return null;
    }

    // If only one playable card, play it (never pass when we can play)
    if (playable.length === 1) {
      return playable[0];
    }

    // If opponent has a miner, prioritize attacks
    if (opponentState.field.miner) {
      const attacks = playable.filter((c) => c.type === 'attack');
      if (attacks.length > 0) {
        // Prefer projectile to bypass wall
        const projectiles = attacks.filter((c) => c.subtype === 'projectile');
        if (projectiles.length > 0) {
          return gameRandom.pick(projectiles);
        }
        return gameRandom.pick(attacks);
      }
    }

    // If we don't have a wall and have low HP, prioritize wall
    if (!aiState.field.wall && aiState.stats.baseHP <= 12) {
      const walls = playable.filter((c) => c.subtype === 'wall');
      if (walls.length > 0 && gameRandom.chance(0.7)) {
        return gameRandom.pick(walls);
      }
    }

    // If opponent's wall is weak (low HP), use continuous
    if (opponentState.field.wall && opponentState.field.wall.currentHP <= 4) {
      const continuous = playable.filter((c) => c.subtype === 'continuous');
      if (continuous.length > 0 && gameRandom.chance(0.8)) {
        return gameRandom.pick(continuous);
      }
    }

    // If we don't have a miner, consider placing one
    if (!aiState.field.miner) {
      const miners = playable.filter((c) => c.type === 'miner');
      if (miners.length > 0 && gameRandom.chance(0.4)) {
        return gameRandom.pick(miners);
      }
    }

    // Default: weighted selection by type with guaranteed fallback
    const attacks = playable.filter((c) => c.type === 'attack');
    const defenses = playable.filter((c) => c.type === 'defense');
    const miners = playable.filter((c) => c.type === 'miner');

    const roll = gameRandom.next();

    if (roll < 0.4 && attacks.length > 0) {
      return gameRandom.pick(attacks);
    } else if (roll < 0.7 && defenses.length > 0) {
      return gameRandom.pick(defenses);
    } else if (miners.length > 0) {
      return gameRandom.pick(miners);
    }

    // Guaranteed fallback: always play something if we have cards
    // Try each type in order of preference
    if (attacks.length > 0) return gameRandom.pick(attacks);
    if (defenses.length > 0) return gameRandom.pick(defenses);
    if (miners.length > 0) return gameRandom.pick(miners);

    // Ultimate fallback: pick any playable card
    return gameRandom.pick(playable);
  }

  /**
   * Hard AI: Advanced strategy
   * IMPORTANT: AI should NEVER pass when it has playable cards
   */
  private chooseCardHard(aiState: PlayerState, opponentState: PlayerState): Card | null {
    const playable = EnergySystem.getPlayableCards(aiState);

    // If no playable cards, must pass
    if (playable.length === 0) {
      return null;
    }

    // If only one playable card, play it
    if (playable.length === 1) {
      return playable[0];
    }

    // Score each card based on current game state
    const scores = playable.map((card) => ({
      card,
      score: this.scoreCard(card, aiState, opponentState),
    }));

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Pick top card with some randomness
    if (scores.length > 1 && gameRandom.chance(0.2)) {
      return scores[1].card;
    }

    // Guaranteed to return top-scoring card
    return scores[0].card;
  }

  /**
   * Score a card based on game state
   */
  private scoreCard(card: Card, aiState: PlayerState, opponentState: PlayerState): number {
    let score = 0;

    // Base score for card type
    switch (card.type) {
      case 'attack':
        score += 50;
        break;
      case 'defense':
        score += 30;
        break;
      case 'miner':
        score += 40;
        break;
    }

    // Adjust for attacks
    if (card.type === 'attack') {
      // Bonus if opponent has miner (killing miner is valuable)
      if (opponentState.field.miner) {
        score += 30;
      }

      // Projectile bonus if opponent has wall
      if (card.subtype === 'projectile' && opponentState.field.wall) {
        score += 25;
      }

      // Continuous bonus if opponent wall is weak
      if (card.subtype === 'continuous') {
        const wallHP = opponentState.field.wall?.currentHP ?? 0;
        if (wallHP > 0 && wallHP <= 4) {
          score += 40; // Will break wall and deal overflow
        } else if (wallHP === 0) {
          score += 20; // Direct damage
        }
      }

      // Penalty if opponent might have deflection
      const opponentDeflections = opponentState.hand.filter(
        (c) => c.subtype === 'deflection'
      );
      if (opponentDeflections.length > 0 && card.subtype === 'projectile') {
        score -= 15;
      }
    }

    // Adjust for defense
    if (card.subtype === 'wall') {
      // Penalty if we already have wall
      if (aiState.field.wall) {
        score -= 50;
      } else {
        // Bonus if low HP
        if (aiState.stats.baseHP <= 10) {
          score += 30;
        }
      }
    }

    if (card.subtype === 'deflection') {
      // Bonus if opponent likely to attack
      const opponentAttacks = opponentState.hand.filter((c) => c.type === 'attack');
      if (opponentAttacks.length > 2) {
        score += 20;
      }
    }

    // Adjust for miners
    if (card.type === 'miner') {
      // Penalty if we already have miner
      if (aiState.field.miner) {
        score -= 50;
      } else {
        // Bonus if we have wall protection
        if (aiState.field.wall && aiState.field.wall.currentHP >= 8) {
          score += 25;
        }

        // Penalty if low HP (miner will likely die)
        if (aiState.stats.baseHP <= 8) {
          score -= 20;
        }
      }
    }

    // Energy efficiency
    const energyRatio = card.cost / aiState.stats.energy;
    if (energyRatio > 0.8) {
      score -= 10; // Penalty for using too much energy
    }

    return score;
  }

  /**
   * Set difficulty
   */
  setDifficulty(difficulty: AIDifficulty): void {
    this.difficulty = difficulty;
  }

  /**
   * Get difficulty
   */
  getDifficulty(): AIDifficulty {
    return this.difficulty;
  }
}
