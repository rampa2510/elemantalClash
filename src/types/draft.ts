import { Card } from './cards';

// Draft round categories
export type DraftCategory =
  | 'wall'
  | 'deflection'
  | 'continuous'
  | 'projectile'
  | 'miner'
  | 'miner2';  // Second miner selection (must be different from first)

// Draft round configuration
export interface DraftRound {
  round: number;           // 1-6
  category: DraftCategory;
  timerSeconds: number;    // 12 or 15
  options: Card[];         // 4 cards to choose from
}

// Draft state
export interface DraftState {
  playerId: string;            // Which player is drafting
  currentRound: number;        // 1-6
  timeRemaining: number;       // Seconds left
  timerStartTime: number;      // When timer started
  selectedCards: Card[];       // Cards picked so far (0-6)
  currentOptions: Card[];      // Current 4 options
  currentCategory: DraftCategory;
  currentTipIndex: number;     // Which tip is showing (rotates)
  isComplete: boolean;         // All 6 cards picked
  autoSelected: boolean;       // Was current card auto-selected on timeout?
}

// Create initial draft state
export function createInitialDraftState(playerId: string): DraftState {
  return {
    playerId,
    currentRound: 1,
    timeRemaining: 12,
    timerStartTime: Date.now(),
    selectedCards: [],
    currentOptions: [],
    currentCategory: 'wall',
    currentTipIndex: 0,
    isComplete: false,
    autoSelected: false,
  };
}

// Draft round definitions
// Fixed deck structure: 1 Wall, 1 Dodge, 1 Blast, 1 Shot, 2 different Bots
export const DRAFT_ROUND_CONFIG: Omit<DraftRound, 'options'>[] = [
  { round: 1, category: 'wall', timerSeconds: 12 },
  { round: 2, category: 'deflection', timerSeconds: 12 },
  { round: 3, category: 'continuous', timerSeconds: 12 },
  { round: 4, category: 'projectile', timerSeconds: 12 },
  { round: 5, category: 'miner', timerSeconds: 15 },
  { round: 6, category: 'miner2', timerSeconds: 15 },  // Must pick different miner
];
