# AI Opponent Reference

## AI Architecture Overview

For a turn-based card game like Elemental Clash, a **rule-based AI with heuristic evaluation** provides the best balance of:
- Implementation simplicity
- Predictable but challenging behavior
- Easy difficulty tuning
- Low computational overhead

More advanced approaches (Minimax, MCTS) are overkill for simultaneous-reveal games where perfect information isn't available.

## Difficulty Configuration

```typescript
// src/ai/DifficultyConfig.ts
export interface DifficultyConfig {
  level: 'easy' | 'medium' | 'hard';
  mistakeRate: number;        // Chance of making a suboptimal play
  thinkingDelay: [number, number]; // Min/max fake thinking time (ms)
  evaluationNoise: number;    // Random noise added to card scores
  usesCounterPlay: boolean;   // Whether AI tries to counter player patterns
  usesBluffing: boolean;      // Whether AI uses unpredictable plays
}

export const DIFFICULTY_PRESETS: Record<string, DifficultyConfig> = {
  easy: {
    level: 'easy',
    mistakeRate: 0.35,
    thinkingDelay: [500, 1500],
    evaluationNoise: 20,
    usesCounterPlay: false,
    usesBluffing: false
  },
  medium: {
    level: 'medium',
    mistakeRate: 0.15,
    thinkingDelay: [1000, 2500],
    evaluationNoise: 10,
    usesCounterPlay: true,
    usesBluffing: false
  },
  hard: {
    level: 'hard',
    mistakeRate: 0.05,
    thinkingDelay: [1500, 3500],
    evaluationNoise: 3,
    usesCounterPlay: true,
    usesBluffing: true
  }
};
```

## Card Heuristics

```typescript
// src/ai/CardHeuristics.ts
import { ICardData, CardType } from '@/types/card.types';
import { GameState } from '@/game/state/GameState';

export interface CardScore {
  card: ICardData;
  score: number;
  reasoning: string[];
}

export class CardHeuristics {
  // Base values by card type/subtype
  private static readonly BASE_VALUES: Record<string, number> = {
    'Attack_Continuous': 8,
    'Attack_Projectile': 10,
    'Defense_Wall': 7,
    'Defense_Deflection': 9,
    'Miner': 12
  };

  evaluateCard(card: ICardData, state: GameState): CardScore {
    const reasoning: string[] = [];
    let score = this.getBaseValue(card);
    reasoning.push(`Base value: ${score}`);

    // Health-based modifiers
    score += this.evaluateHealthContext(card, state, reasoning);
    
    // Board state modifiers
    score += this.evaluateBoardContext(card, state, reasoning);
    
    // Turn timing modifiers
    score += this.evaluateTurnContext(card, state, reasoning);
    
    // Synergy modifiers
    score += this.evaluateSynergies(card, state, reasoning);

    return { card, score, reasoning };
  }

  private getBaseValue(card: ICardData): number {
    const key = card.type === 'Miner' 
      ? 'Miner' 
      : `${card.type}_${card.subtype}`;
    return CardHeuristics.BASE_VALUES[key] || 5;
  }

  private evaluateHealthContext(
    card: ICardData, 
    state: GameState, 
    reasoning: string[]
  ): number {
    let modifier = 0;
    const myHealth = state.aiPlayer.health;
    const opponentHealth = state.humanPlayer.health;

    // Low health: prioritize defense
    if (myHealth <= 10) {
      if (card.type === 'Defense') {
        modifier += 8;
        reasoning.push('Critical health: +8 for defense');
      }
    } else if (myHealth <= 20) {
      if (card.type === 'Defense') {
        modifier += 4;
        reasoning.push('Low health: +4 for defense');
      }
    }

    // Opponent low health: prioritize attack
    if (opponentHealth <= 10) {
      if (card.type === 'Attack') {
        modifier += 10;
        reasoning.push('Opponent critical: +10 for attack');
      }
    } else if (opponentHealth <= 20) {
      if (card.type === 'Attack') {
        modifier += 5;
        reasoning.push('Opponent low: +5 for attack');
      }
    }

    return modifier;
  }

  private evaluateBoardContext(
    card: ICardData, 
    state: GameState, 
    reasoning: string[]
  ): number {
    let modifier = 0;

    // Has incoming projectile: walls are valuable
    if (state.incomingProjectile && card.subtype === 'Wall') {
      modifier += 15;
      reasoning.push('Incoming projectile: +15 for wall');
    }

    // Has active wall: attacks are more valuable
    if (state.aiPlayer.activeWalls.length > 0 && card.type === 'Attack') {
      modifier += 3;
      reasoning.push('Protected by wall: +3 for attack');
    }

    // Opponent has wall: projectile bypasses
    if (state.humanPlayer.activeWalls.length > 0) {
      if (card.subtype === 'Projectile') {
        modifier += 6;
        reasoning.push('Opponent has wall: +6 for projectile');
      } else if (card.subtype === 'Continuous') {
        modifier -= 4;
        reasoning.push('Opponent has wall: -4 for continuous');
      }
    }

    // Has active miners: protect them
    if (state.aiPlayer.activeMiners.length > 0 && card.type === 'Defense') {
      modifier += 4;
      reasoning.push('Protecting miners: +4 for defense');
    }

    return modifier;
  }

  private evaluateTurnContext(
    card: ICardData, 
    state: GameState, 
    reasoning: string[]
  ): number {
    let modifier = 0;

    // Early game: miners are very valuable
    if (state.turnNumber <= 3 && card.type === 'Miner') {
      modifier += 8;
      reasoning.push('Early game: +8 for miner');
    }

    // Late game: miners are less valuable
    if (state.turnNumber >= 8 && card.type === 'Miner') {
      modifier -= 5;
      reasoning.push('Late game: -5 for miner');
    }

    // Endgame: prioritize finishing attacks
    if (state.turnNumber >= 10 && card.type === 'Attack') {
      modifier += 3;
      reasoning.push('Endgame: +3 for attack');
    }

    return modifier;
  }

  private evaluateSynergies(
    card: ICardData, 
    state: GameState, 
    reasoning: string[]
  ): number {
    let modifier = 0;

    // Element synergies (if relevant to your game)
    // Example: Fire cards after other fire cards
    const lastPlayedElement = state.aiPlayer.lastPlayedElement;
    if (lastPlayedElement === card.element) {
      modifier += 2;
      reasoning.push('Element chain: +2');
    }

    return modifier;
  }
}
```

## AI Player Implementation

```typescript
// src/ai/AIPlayer.ts
import { ICardData } from '@/types/card.types';
import { GameState } from '@/game/state/GameState';
import { CardHeuristics, CardScore } from './CardHeuristics';
import { DifficultyConfig, DIFFICULTY_PRESETS } from './DifficultyConfig';

export class AIPlayer {
  private heuristics: CardHeuristics;
  private config: DifficultyConfig;
  private playerHistory: ICardData[] = [];

  constructor(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.heuristics = new CardHeuristics();
    this.config = DIFFICULTY_PRESETS[difficulty];
  }

  async selectCard(hand: ICardData[], state: GameState): Promise<ICardData> {
    // Simulate thinking time
    await this.simulateThinking();
    
    // Evaluate all cards
    const scores = hand.map(card => this.heuristics.evaluateCard(card, state));
    
    // Add noise based on difficulty
    const noisyScores = this.addNoise(scores);
    
    // Apply counter-play if enabled
    if (this.config.usesCounterPlay) {
      this.applyCounterPlay(noisyScores, state);
    }
    
    // Sort by score
    noisyScores.sort((a, b) => b.score - a.score);
    
    // Check for intentional mistake
    if (Math.random() < this.config.mistakeRate) {
      console.log('[AI] Making intentional mistake');
      const randomIndex = Math.floor(Math.random() * Math.min(3, noisyScores.length));
      return noisyScores[randomIndex].card;
    }
    
    // Apply bluffing
    if (this.config.usesBluffing && Math.random() < 0.15) {
      console.log('[AI] Bluffing with unexpected play');
      return this.selectBluffCard(noisyScores);
    }
    
    // Return best card
    const selected = noisyScores[0].card;
    console.log('[AI] Selected:', selected.name, 'Score:', noisyScores[0].score);
    console.log('[AI] Reasoning:', noisyScores[0].reasoning);
    
    return selected;
  }

  private async simulateThinking(): Promise<void> {
    const [min, max] = this.config.thinkingDelay;
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private addNoise(scores: CardScore[]): CardScore[] {
    return scores.map(s => ({
      ...s,
      score: s.score + (Math.random() - 0.5) * this.config.evaluationNoise * 2
    }));
  }

  private applyCounterPlay(scores: CardScore[], state: GameState): void {
    // Analyze player patterns
    const recentPlayerCards = state.humanPlayer.recentCards.slice(-3);
    
    // If player has been aggressive, boost defense
    const attackCount = recentPlayerCards.filter(c => c.type === 'Attack').length;
    if (attackCount >= 2) {
      scores.forEach(s => {
        if (s.card.type === 'Defense') {
          s.score += 5;
          s.reasoning.push('Counter-play: +5 (player aggressive)');
        }
      });
    }
    
    // If player has been defensive, use projectiles
    const defenseCount = recentPlayerCards.filter(c => c.type === 'Defense').length;
    if (defenseCount >= 2) {
      scores.forEach(s => {
        if (s.card.subtype === 'Projectile') {
          s.score += 5;
          s.reasoning.push('Counter-play: +5 (player defensive)');
        }
      });
    }
  }

  private selectBluffCard(scores: CardScore[]): ICardData {
    // Choose a card that's not the obvious choice
    const midRange = scores.slice(1, Math.ceil(scores.length / 2));
    if (midRange.length > 0) {
      return midRange[Math.floor(Math.random() * midRange.length)].card;
    }
    return scores[0].card;
  }

  recordPlayerCard(card: ICardData): void {
    this.playerHistory.push(card);
    if (this.playerHistory.length > 10) {
      this.playerHistory.shift();
    }
  }

  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.config = DIFFICULTY_PRESETS[difficulty];
  }
}
```

## Integration with Game Scene

```typescript
// In GameScene.ts
class GameScene extends BaseScene {
  private aiPlayer: AIPlayer | null = null;
  private isVsAI: boolean = false;

  create(data: { vsAI?: boolean; difficulty?: string }): void {
    super.create();
    
    if (data.vsAI) {
      this.isVsAI = true;
      this.aiPlayer = new AIPlayer(data.difficulty as any || 'medium');
    }
    
    // ... rest of setup
  }

  private async handleSelectionPhase(): Promise<void> {
    if (this.isVsAI && this.aiPlayer) {
      // AI makes selection in background
      this.aiSelectCard();
    }
    
    // Enable player input
    this.hand.enableAllCards();
  }

  private async aiSelectCard(): Promise<void> {
    const aiHand = this.getAIHand();
    const gameState = this.buildGameState();
    
    const selectedCard = await this.aiPlayer!.selectCard(aiHand, gameState);
    
    // Simulate AI locking in
    this.aiSelectedCard = selectedCard;
    
    // Random delay before lock-in (feels more human)
    const lockDelay = 2000 + Math.random() * 5000;
    
    this.time.delayedCall(lockDelay, () => {
      if (this.turnPhase === 'selection') {
        this.aiLockedIn = true;
        this.checkBothLockedIn();
      }
    });
  }

  private buildGameState(): GameState {
    return {
      turnNumber: this.turnNumber,
      aiPlayer: {
        health: this.aiHealth,
        activeWalls: this.aiWalls,
        activeMiners: this.aiMiners,
        lastPlayedElement: this.aiLastElement,
        recentCards: []
      },
      humanPlayer: {
        health: this.playerHealth,
        activeWalls: this.playerWalls,
        activeMiners: this.playerMiners,
        recentCards: this.playerRecentCards
      },
      incomingProjectile: this.hasIncomingProjectile
    };
  }
}
```

## Advanced: Monte Carlo Tree Search (Optional)

For more sophisticated AI (not recommended for simultaneous-reveal games):

```typescript
// src/ai/MCTS.ts
interface MCTSNode {
  state: GameState;
  parent: MCTSNode | null;
  children: MCTSNode[];
  visits: number;
  wins: number;
  move: ICardData | null;
}

export class MCTS {
  private explorationConstant = 1.41; // sqrt(2)
  private maxIterations = 1000;
  private maxTime = 2000; // ms

  search(rootState: GameState, availableCards: ICardData[]): ICardData {
    const root: MCTSNode = {
      state: rootState,
      parent: null,
      children: [],
      visits: 0,
      wins: 0,
      move: null
    };

    const startTime = Date.now();
    let iterations = 0;

    while (iterations < this.maxIterations && Date.now() - startTime < this.maxTime) {
      const node = this.select(root);
      const expanded = this.expand(node, availableCards);
      const result = this.simulate(expanded);
      this.backpropagate(expanded, result);
      iterations++;
    }

    // Return most visited child
    const bestChild = root.children.reduce((best, child) => 
      child.visits > best.visits ? child : best
    );

    return bestChild.move!;
  }

  private select(node: MCTSNode): MCTSNode {
    while (node.children.length > 0) {
      node = this.selectBestChild(node);
    }
    return node;
  }

  private selectBestChild(node: MCTSNode): MCTSNode {
    return node.children.reduce((best, child) => {
      const ucb1 = this.calculateUCB1(child, node.visits);
      const bestUcb1 = this.calculateUCB1(best, node.visits);
      return ucb1 > bestUcb1 ? child : best;
    });
  }

  private calculateUCB1(node: MCTSNode, parentVisits: number): number {
    if (node.visits === 0) return Infinity;
    
    const exploitation = node.wins / node.visits;
    const exploration = this.explorationConstant * Math.sqrt(Math.log(parentVisits) / node.visits);
    
    return exploitation + exploration;
  }

  private expand(node: MCTSNode, availableCards: ICardData[]): MCTSNode {
    // Create child for each possible move
    for (const card of availableCards) {
      const childState = this.applyMove(node.state, card);
      const child: MCTSNode = {
        state: childState,
        parent: node,
        children: [],
        visits: 0,
        wins: 0,
        move: card
      };
      node.children.push(child);
    }
    
    // Return random child
    return node.children[Math.floor(Math.random() * node.children.length)];
  }

  private simulate(node: MCTSNode): number {
    // Random playout until game ends
    let state = { ...node.state };
    
    while (!this.isGameOver(state)) {
      const randomMove = this.getRandomMove(state);
      state = this.applyMove(state, randomMove);
    }
    
    return this.getWinner(state) === 'ai' ? 1 : 0;
  }

  private backpropagate(node: MCTSNode, result: number): void {
    while (node !== null) {
      node.visits++;
      node.wins += result;
      node = node.parent!;
    }
  }

  // These methods need game-specific implementation
  private applyMove(state: GameState, card: ICardData): GameState {
    // Return new state after playing card
    return state; // Placeholder
  }

  private isGameOver(state: GameState): boolean {
    return state.aiPlayer.health <= 0 || state.humanPlayer.health <= 0;
  }

  private getWinner(state: GameState): 'ai' | 'human' {
    return state.humanPlayer.health <= 0 ? 'ai' : 'human';
  }

  private getRandomMove(state: GameState): ICardData {
    // Return random valid card
    return {} as ICardData; // Placeholder
  }
}
```

## Personality-Based AI (Optional)

```typescript
// src/ai/AIPersonality.ts
export type AIPersonality = 'aggressive' | 'defensive' | 'balanced' | 'random';

export const PERSONALITY_MODIFIERS: Record<AIPersonality, Record<string, number>> = {
  aggressive: {
    'Attack_Continuous': +5,
    'Attack_Projectile': +8,
    'Defense_Wall': -3,
    'Defense_Deflection': -2,
    'Miner': +2
  },
  defensive: {
    'Attack_Continuous': -2,
    'Attack_Projectile': +0,
    'Defense_Wall': +8,
    'Defense_Deflection': +6,
    'Miner': +4
  },
  balanced: {
    'Attack_Continuous': +0,
    'Attack_Projectile': +0,
    'Defense_Wall': +0,
    'Defense_Deflection': +0,
    'Miner': +0
  },
  random: {
    'Attack_Continuous': +0,
    'Attack_Projectile': +0,
    'Defense_Wall': +0,
    'Defense_Deflection': +0,
    'Miner': +0
  }
};

export function applyPersonality(
  scores: CardScore[], 
  personality: AIPersonality
): void {
  const modifiers = PERSONALITY_MODIFIERS[personality];
  
  for (const score of scores) {
    const key = score.card.type === 'Miner' 
      ? 'Miner' 
      : `${score.card.type}_${score.card.subtype}`;
    
    score.score += modifiers[key] || 0;
  }
  
  // Random personality adds significant noise
  if (personality === 'random') {
    for (const score of scores) {
      score.score += (Math.random() - 0.5) * 30;
    }
  }
}
```

## Debug Visualization (Development)

```typescript
// src/ai/AIDebugOverlay.ts
export class AIDebugOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private enabled: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(10, 10);
    this.container.setDepth(9999);
    this.container.setVisible(false);
  }

  toggle(): void {
    this.enabled = !this.enabled;
    this.container.setVisible(this.enabled);
  }

  showScores(scores: CardScore[]): void {
    if (!this.enabled) return;
    
    this.container.removeAll(true);
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(0, 0, 250, scores.length * 25 + 30);
    this.container.add(bg);
    
    const title = this.scene.add.text(10, 5, 'AI Evaluation', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffff00'
    });
    this.container.add(title);
    
    scores.forEach((score, index) => {
      const text = this.scene.add.text(
        10, 
        30 + index * 25,
        `${score.card.name}: ${score.score.toFixed(1)}`,
        { fontSize: '12px', color: '#ffffff' }
      );
      this.container.add(text);
    });
  }
}
```
