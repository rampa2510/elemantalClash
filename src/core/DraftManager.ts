import { DraftState, DraftCategory, DRAFT_ROUND_CONFIG, createInitialDraftState } from '../types/draft';
import { Card } from '../types/cards';
import {
  WALL_OPTIONS,
  DEFLECTION_OPTIONS,
  CONTINUOUS_OPTIONS,
  PROJECTILE_OPTIONS,
  MINER_OPTIONS,
} from '../config/cardDefinitions';
import { DRAFT_TIMER_SECONDS_SHORT, DRAFT_TIMER_SECONDS_LONG, DRAFT_TIPS } from '../config/constants';
import { gameRandom } from '../utils/RandomGenerator';
import { gameEvents } from '../utils/EventEmitter';

/**
 * Manages the 6-round draft system
 */
export class DraftManager {
  private draftState: DraftState;

  constructor(playerId: string) {
    this.draftState = createInitialDraftState(playerId);
    this.setupRound(1);
  }

  /**
   * Get current draft state
   */
  getState(): DraftState {
    return { ...this.draftState };
  }

  /**
   * Setup a specific round
   */
  private setupRound(roundNumber: number): void {
    if (roundNumber > 6) {
      this.draftState.isComplete = true;
      return;
    }

    const config = DRAFT_ROUND_CONFIG[roundNumber - 1];
    this.draftState.currentRound = roundNumber;
    this.draftState.currentCategory = config.category;
    this.draftState.timeRemaining = config.timerSeconds;
    this.draftState.timerStartTime = Date.now();
    this.draftState.currentTipIndex = 0;
    this.draftState.autoSelected = false;

    // Get options for this round
    this.draftState.currentOptions = this.getOptionsForCategory(config.category);
  }

  /**
   * Get card options for a category
   */
  private getOptionsForCategory(category: DraftCategory): Card[] {
    switch (category) {
      case 'wall':
        return gameRandom.shuffled([...WALL_OPTIONS]).slice(0, 4);
      case 'deflection':
        return gameRandom.shuffled([...DEFLECTION_OPTIONS]).slice(0, 4);
      case 'continuous':
        return gameRandom.shuffled([...CONTINUOUS_OPTIONS]).slice(0, 4);
      case 'projectile':
        return gameRandom.shuffled([...PROJECTILE_OPTIONS]).slice(0, 4);
      case 'miner':
        return [...MINER_OPTIONS]; // All 4 miners, they're different
      case 'miner2':
        return this.getSecondMinerOptions();
      default:
        return [];
    }
  }

  /**
   * Get second miner options (excludes the miner already selected)
   */
  private getSecondMinerOptions(): Card[] {
    // Filter out the miner that was already selected in round 5
    const selectedMiner = this.draftState.selectedCards.find((c) => c.type === 'miner');
    return MINER_OPTIONS.filter((m) => m.id !== selectedMiner?.id);
  }

  /**
   * Select a card
   */
  selectCard(card: Card): boolean {
    // Validate card is in current options
    if (!this.draftState.currentOptions.some((c) => c.id === card.id)) {
      return false;
    }

    // Add to selected cards
    this.draftState.selectedCards.push(card);

    gameEvents.emit('CARD_SELECTED', {
      playerId: this.draftState.playerId,
      card,
      round: this.draftState.currentRound,
    });

    // Advance to next round
    this.setupRound(this.draftState.currentRound + 1);

    return true;
  }

  /**
   * Handle timeout - auto-select random card
   */
  handleTimeout(): Card {
    const randomCard = gameRandom.pick(this.draftState.currentOptions);
    this.draftState.autoSelected = true;
    this.selectCard(randomCard);
    return randomCard;
  }

  /**
   * Rotate to next tip
   */
  rotateTip(): void {
    const tips = this.getTipsForCategory(this.draftState.currentCategory);
    this.draftState.currentTipIndex = (this.draftState.currentTipIndex + 1) % tips.length;
  }

  /**
   * Get current tip
   */
  getCurrentTip(): string {
    const tips = this.getTipsForCategory(this.draftState.currentCategory);
    return tips[this.draftState.currentTipIndex] || '';
  }

  /**
   * Get tips for a category
   */
  private getTipsForCategory(category: DraftCategory): string[] {
    // miner2 uses the same tips as miner
    const tipCategory = category === 'miner2' ? 'miner' : category;
    return DRAFT_TIPS[tipCategory] || [];
  }

  /**
   * Get timer duration for current round
   */
  getTimerDuration(): number {
    const round = this.draftState.currentRound;
    return round >= 5 ? DRAFT_TIMER_SECONDS_LONG : DRAFT_TIMER_SECONDS_SHORT;
  }

  /**
   * Get time remaining (seconds)
   */
  getTimeRemaining(): number {
    const elapsed = (Date.now() - this.draftState.timerStartTime) / 1000;
    return Math.max(0, this.getTimerDuration() - elapsed);
  }

  /**
   * Check if draft is complete
   */
  isComplete(): boolean {
    return this.draftState.isComplete;
  }

  /**
   * Get selected deck
   */
  getSelectedDeck(): Card[] {
    return [...this.draftState.selectedCards];
  }

  /**
   * Get current round number
   */
  getCurrentRound(): number {
    return this.draftState.currentRound;
  }

  /**
   * Get current category
   */
  getCurrentCategory(): DraftCategory {
    return this.draftState.currentCategory;
  }

  /**
   * Get current options
   */
  getCurrentOptions(): Card[] {
    return [...this.draftState.currentOptions];
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(): string {
    const names: Record<DraftCategory, string> = {
      wall: 'SHIELD',
      deflection: 'DODGE',
      continuous: 'BLAST',
      projectile: 'SHOT',
      miner: 'BOT #1',
      miner2: 'BOT #2',
    };
    return names[this.draftState.currentCategory];
  }
}
