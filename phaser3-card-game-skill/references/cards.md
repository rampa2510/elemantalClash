# Cards Reference

## TypeScript Interfaces

```typescript
// src/types/card.types.ts

export type CardType = 'Attack' | 'Defense' | 'Miner';
export type AttackSubtype = 'Continuous' | 'Projectile';
export type DefenseSubtype = 'Wall' | 'Deflection';
export type Element = 'Fire' | 'Water' | 'Earth' | 'Air' | 'Lightning' | 'Ice';
export type CardState = 'IN_DECK' | 'IN_HAND' | 'SELECTED' | 'PLAYED' | 'ACTIVE' | 'DISCARDED' | 'DESTROYED';
export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface ICardData {
  id: string;
  name: string;
  description: string;
  type: CardType;
  subtype?: AttackSubtype | DefenseSubtype;
  element: Element;
  cost: number;
  damage?: number;
  hp?: number;
  decay?: number;      // Walls lose this HP per turn
  duration?: number;   // Miners active for this many turns
  abilities: IAbility[];
  rarity: Rarity;
  artworkKey: string;  // Texture atlas frame key
}

export interface IAbility {
  id: string;
  name: string;
  trigger: 'ON_PLAY' | 'ON_DAMAGE' | 'START_OF_TURN' | 'END_OF_TURN' | 'ON_DESTROY';
  effect: IEffect;
  targetType: 'SELF' | 'OPPONENT' | 'ALL_ALLIES' | 'ALL_ENEMIES';
}

export interface IEffect {
  type: 'DAMAGE' | 'HEAL' | 'BUFF' | 'DEBUFF' | 'DRAW' | 'SPAWN' | 'SHIELD';
  value: number;
  duration?: number;
}

export interface ICardInstance {
  instanceId: string;
  cardData: ICardData;
  state: CardState;
  currentHp?: number;    // For walls
  turnsRemaining?: number; // For miners
}

export interface ISerializedCard {
  cardId: string;
  instanceId: string;
  state: CardState;
  currentHp?: number;
  turnsRemaining?: number;
}
```

## Card Class Implementation

```typescript
// src/game/cards/Card.ts
import Phaser from 'phaser';
import { ICardData, CardState } from '@/types/card.types';
import { GAME_CONSTANTS } from '@/config/Constants';

export class Card extends Phaser.GameObjects.Container {
  public readonly instanceId: string;
  public readonly cardData: ICardData;
  
  private _state: CardState = 'IN_DECK';
  private cardBack: Phaser.GameObjects.Image;
  private cardFront: Phaser.GameObjects.Image;
  private cardFrame: Phaser.GameObjects.Image;
  private nameText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;
  private glowSprite: Phaser.GameObjects.Image | null = null;
  
  private isFaceUp = false;
  private isSelected = false;
  private originalY = 0;

  // Valid state transitions
  private static readonly VALID_TRANSITIONS: Record<CardState, CardState[]> = {
    'IN_DECK': ['IN_HAND'],
    'IN_HAND': ['SELECTED', 'PLAYED', 'DISCARDED'],
    'SELECTED': ['IN_HAND', 'PLAYED'],
    'PLAYED': ['ACTIVE', 'DISCARDED', 'DESTROYED'],
    'ACTIVE': ['DISCARDED', 'DESTROYED'],
    'DISCARDED': ['IN_DECK'],
    'DESTROYED': []
  };

  constructor(scene: Phaser.Scene, x: number, y: number, cardData: ICardData) {
    super(scene, x, y);
    
    this.cardData = cardData;
    this.instanceId = `${cardData.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.createVisuals();
    this.setupInteraction();
    
    scene.add.existing(this);
  }

  private createVisuals(): void {
    const { CARD_WIDTH, CARD_HEIGHT } = GAME_CONSTANTS;
    
    // Card back (visible when face down)
    this.cardBack = this.scene.add.image(0, 0, 'card-back');
    this.cardBack.setDisplaySize(CARD_WIDTH, CARD_HEIGHT);
    
    // Card front container
    this.cardFrame = this.scene.add.image(0, 0, 'cards', `frame-${this.cardData.element.toLowerCase()}`);
    this.cardFrame.setDisplaySize(CARD_WIDTH, CARD_HEIGHT);
    this.cardFrame.setVisible(false);
    
    this.cardFront = this.scene.add.image(0, -20, 'cards', this.cardData.artworkKey);
    this.cardFront.setDisplaySize(CARD_WIDTH - 20, CARD_HEIGHT / 2);
    this.cardFront.setVisible(false);
    
    // Card name
    this.nameText = this.scene.add.text(0, 50, this.cardData.name, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: CARD_WIDTH - 10 }
    }).setOrigin(0.5);
    this.nameText.setVisible(false);
    
    // Stats display
    const statsStr = this.getStatsString();
    this.statsText = this.scene.add.text(0, 75, statsStr, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#ffcc00',
      align: 'center'
    }).setOrigin(0.5);
    this.statsText.setVisible(false);
    
    // Add all to container
    this.add([this.cardBack, this.cardFrame, this.cardFront, this.nameText, this.statsText]);
    
    // Set container size for interactions
    this.setSize(CARD_WIDTH, CARD_HEIGHT);
  }

  private getStatsString(): string {
    const { type, damage, hp, decay, duration } = this.cardData;
    
    switch (type) {
      case 'Attack':
        return `⚔️ ${damage}`;
      case 'Defense':
        return hp ? `🛡️ ${hp} HP${decay ? ` (-${decay}/turn)` : ''}` : '🔄 Deflect';
      case 'Miner':
        return `⛏️ ${duration} turns`;
      default:
        return '';
    }
  }

  private setupInteraction(): void {
    this.setInteractive({ useHandCursor: true });
    
    this.on('pointerover', this.onHoverStart, this);
    this.on('pointerout', this.onHoverEnd, this);
    this.on('pointerdown', this.onTap, this);
  }

  private onHoverStart(): void {
    if (this._state !== 'IN_HAND' || !this.isFaceUp) return;
    
    this.originalY = this.y;
    this.scene.tweens.add({
      targets: this,
      y: this.y - 30,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 150,
      ease: 'Quad.easeOut'
    });
    this.setDepth(100);
  }

  private onHoverEnd(): void {
    if (this._state !== 'IN_HAND' && this._state !== 'SELECTED') return;
    
    if (!this.isSelected) {
      this.scene.tweens.add({
        targets: this,
        y: this.originalY,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Quad.easeOut'
      });
      this.setDepth(this.getData('handIndex') || 0);
    }
  }

  private onTap(): void {
    this.emit('card-tapped', this);
  }

  // Public API

  get state(): CardState {
    return this._state;
  }

  public transitionTo(newState: CardState): boolean {
    const validNextStates = Card.VALID_TRANSITIONS[this._state];
    if (!validNextStates.includes(newState)) {
      console.warn(`Invalid state transition: ${this._state} → ${newState}`);
      return false;
    }
    
    const oldState = this._state;
    this._state = newState;
    this.emit('state-changed', { from: oldState, to: newState, card: this });
    return true;
  }

  public async flip(): Promise<void> {
    return new Promise(resolve => {
      // First half: scale to 0
      this.scene.tweens.add({
        targets: this,
        scaleX: 0,
        duration: 150,
        ease: 'Quad.easeIn',
        onComplete: () => {
          // Swap visibility
          this.isFaceUp = !this.isFaceUp;
          this.cardBack.setVisible(!this.isFaceUp);
          this.cardFrame.setVisible(this.isFaceUp);
          this.cardFront.setVisible(this.isFaceUp);
          this.nameText.setVisible(this.isFaceUp);
          this.statsText.setVisible(this.isFaceUp);
          
          // Second half: scale back to 1
          this.scene.tweens.add({
            targets: this,
            scaleX: 1,
            duration: 150,
            ease: 'Quad.easeOut',
            onComplete: () => resolve()
          });
        }
      });
    });
  }

  public select(): void {
    if (this.isSelected) return;
    
    this.isSelected = true;
    this._state = 'SELECTED';
    
    // Add glow effect
    if (!this.glowSprite) {
      this.glowSprite = this.scene.add.image(0, 0, 'ui', 'card-glow');
      this.glowSprite.setDisplaySize(GAME_CONSTANTS.CARD_WIDTH + 20, GAME_CONSTANTS.CARD_HEIGHT + 20);
      this.glowSprite.setTint(0x00ff88);
      this.glowSprite.setAlpha(0.7);
      this.addAt(this.glowSprite, 0);
    }
    this.glowSprite.setVisible(true);
    
    // Lift card
    this.scene.tweens.add({
      targets: this,
      y: this.originalY - 50,
      duration: 200,
      ease: 'Back.easeOut'
    });
  }

  public deselect(): void {
    if (!this.isSelected) return;
    
    this.isSelected = false;
    this._state = 'IN_HAND';
    
    if (this.glowSprite) {
      this.glowSprite.setVisible(false);
    }
    
    this.scene.tweens.add({
      targets: this,
      y: this.originalY,
      duration: 200,
      ease: 'Quad.easeOut'
    });
  }

  public setFaceUp(faceUp: boolean): void {
    this.isFaceUp = faceUp;
    this.cardBack.setVisible(!faceUp);
    this.cardFrame.setVisible(faceUp);
    this.cardFront.setVisible(faceUp);
    this.nameText.setVisible(faceUp);
    this.statsText.setVisible(faceUp);
  }

  public serialize(): ISerializedCard {
    return {
      cardId: this.cardData.id,
      instanceId: this.instanceId,
      state: this._state
    };
  }

  public updateStats(hp?: number): void {
    if (hp !== undefined && this.cardData.type === 'Defense') {
      this.statsText.setText(`🛡️ ${hp} HP`);
    }
  }

  public disableInteraction(): void {
    this.disableInteractive();
    this.setAlpha(0.6);
  }

  public enableInteraction(): void {
    this.setInteractive({ useHandCursor: true });
    this.setAlpha(1);
  }
}
```

## Deck Class

```typescript
// src/game/cards/Deck.ts
import { Card } from './Card';
import { ICardData } from '@/types/card.types';

export class Deck {
  private cards: Card[] = [];
  private discardPile: Card[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, cardDataList: ICardData[]) {
    this.scene = scene;
    this.initializeDeck(cardDataList);
  }

  private initializeDeck(cardDataList: ICardData[]): void {
    // Create card instances (off-screen)
    this.cards = cardDataList.map(data => new Card(this.scene, -200, -200, data));
    this.shuffle();
  }

  public shuffle(): void {
    // Fisher-Yates shuffle
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  public draw(count: number = 1): Card[] {
    const drawn: Card[] = [];
    
    for (let i = 0; i < count; i++) {
      if (this.cards.length === 0) {
        if (this.discardPile.length === 0) {
          console.warn('Deck and discard pile are both empty');
          break;
        }
        this.reshuffleDiscardPile();
      }
      
      const card = this.cards.pop()!;
      card.transitionTo('IN_HAND');
      drawn.push(card);
    }
    
    return drawn;
  }

  public addToDiscard(card: Card): void {
    card.transitionTo('DISCARDED');
    card.setFaceUp(false);
    this.discardPile.push(card);
  }

  private reshuffleDiscardPile(): void {
    console.log('Reshuffling discard pile into deck');
    this.discardPile.forEach(card => card.transitionTo('IN_DECK'));
    this.cards = [...this.discardPile];
    this.discardPile = [];
    this.shuffle();
  }

  public get remaining(): number {
    return this.cards.length;
  }

  public get discardCount(): number {
    return this.discardPile.length;
  }

  public peek(count: number = 1): ICardData[] {
    return this.cards.slice(-count).map(c => c.cardData);
  }
}
```

## Hand Class with Layout

```typescript
// src/game/cards/Hand.ts
import Phaser from 'phaser';
import { Card } from './Card';
import { GAME_CONSTANTS } from '@/config/Constants';

export class Hand {
  private cards: Card[] = [];
  private scene: Phaser.Scene;
  private centerX: number;
  private baseY: number;
  private maxCards: number;
  private selectedCard: Card | null = null;

  constructor(
    scene: Phaser.Scene, 
    centerX: number, 
    baseY: number, 
    maxCards: number = GAME_CONSTANTS.MAX_HAND_SIZE
  ) {
    this.scene = scene;
    this.centerX = centerX;
    this.baseY = baseY;
    this.maxCards = maxCards;
  }

  public addCard(card: Card, animate = true): boolean {
    if (this.cards.length >= this.maxCards) {
      console.warn('Hand is full');
      return false;
    }
    
    this.cards.push(card);
    card.on('card-tapped', this.onCardTapped, this);
    
    if (animate) {
      this.animateLayout();
    } else {
      this.updateLayout();
    }
    
    return true;
  }

  public addCards(cards: Card[], staggerDelay = 100): Promise<void> {
    return new Promise(resolve => {
      cards.forEach((card, index) => {
        this.scene.time.delayedCall(index * staggerDelay, () => {
          this.addCard(card, true);
          if (index === cards.length - 1) {
            this.scene.time.delayedCall(400, resolve);
          }
        });
      });
    });
  }

  public removeCard(card: Card): void {
    const index = this.cards.indexOf(card);
    if (index === -1) return;
    
    this.cards.splice(index, 1);
    card.off('card-tapped', this.onCardTapped, this);
    
    if (this.selectedCard === card) {
      this.selectedCard = null;
    }
    
    this.animateLayout();
  }

  private updateLayout(): void {
    const positions = this.calculatePositions();
    
    this.cards.forEach((card, index) => {
      const pos = positions[index];
      card.setPosition(pos.x, pos.y);
      card.setRotation(pos.rotation);
      card.setDepth(index);
      card.setData('handIndex', index);
      card.setData('originalY', pos.y);
    });
  }

  private animateLayout(): void {
    const positions = this.calculatePositions();
    
    this.cards.forEach((card, index) => {
      const pos = positions[index];
      
      this.scene.tweens.add({
        targets: card,
        x: pos.x,
        y: pos.y,
        rotation: pos.rotation,
        duration: 250,
        ease: 'Quad.easeOut',
        onComplete: () => {
          card.setDepth(index);
          card.setData('handIndex', index);
          card.setData('originalY', pos.y);
        }
      });
    });
  }

  private calculatePositions(): { x: number; y: number; rotation: number }[] {
    const cardCount = this.cards.length;
    if (cardCount === 0) return [];
    
    const { CARD_WIDTH } = GAME_CONSTANTS;
    
    // Fan layout parameters
    const maxSpacing = 80;
    const minSpacing = 40;
    const spacing = Math.max(minSpacing, Math.min(maxSpacing, 400 / cardCount));
    const maxRotation = 0.12; // radians (~7 degrees)
    const curveHeight = 25;
    
    const totalWidth = (cardCount - 1) * spacing;
    const startX = this.centerX - totalWidth / 2;
    
    return this.cards.map((_, index) => {
      // Normalize index to -1...1 range
      const t = cardCount > 1 ? (index / (cardCount - 1)) * 2 - 1 : 0;
      
      return {
        x: startX + index * spacing,
        y: this.baseY - curveHeight * (1 - t * t), // Parabolic curve
        rotation: -t * maxRotation
      };
    });
  }

  private onCardTapped(card: Card): void {
    if (this.selectedCard === card) {
      // Deselect
      card.deselect();
      this.selectedCard = null;
    } else {
      // Deselect previous
      if (this.selectedCard) {
        this.selectedCard.deselect();
      }
      // Select new
      card.select();
      this.selectedCard = card;
    }
    
    this.scene.events.emit('hand-selection-changed', this.selectedCard);
  }

  public getSelectedCard(): Card | null {
    return this.selectedCard;
  }

  public clearSelection(): void {
    if (this.selectedCard) {
      this.selectedCard.deselect();
      this.selectedCard = null;
    }
  }

  public disableAllCards(): void {
    this.cards.forEach(card => card.disableInteraction());
  }

  public enableAllCards(): void {
    this.cards.forEach(card => card.enableInteraction());
  }

  public get count(): number {
    return this.cards.length;
  }

  public get isFull(): boolean {
    return this.cards.length >= this.maxCards;
  }

  public getCards(): readonly Card[] {
    return this.cards;
  }
}
```

## Card Database Example

```typescript
// src/game/cards/CardDatabase.ts
import { ICardData } from '@/types/card.types';

export const CARD_DATABASE: ICardData[] = [
  // ATTACKS - Continuous
  {
    id: 'fire_slash',
    name: 'Fire Slash',
    description: 'A blazing continuous attack',
    type: 'Attack',
    subtype: 'Continuous',
    element: 'Fire',
    cost: 2,
    damage: 5,
    abilities: [],
    rarity: 'Common',
    artworkKey: 'attack-fire-slash'
  },
  {
    id: 'water_stream',
    name: 'Water Stream',
    description: 'A pressurized water beam',
    type: 'Attack',
    subtype: 'Continuous',
    element: 'Water',
    cost: 2,
    damage: 4,
    abilities: [{
      id: 'piercing',
      name: 'Piercing',
      trigger: 'ON_PLAY',
      effect: { type: 'DAMAGE', value: 1 },
      targetType: 'OPPONENT'
    }],
    rarity: 'Common',
    artworkKey: 'attack-water-stream'
  },
  
  // ATTACKS - Projectile
  {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    description: 'A fast projectile that bypasses walls',
    type: 'Attack',
    subtype: 'Projectile',
    element: 'Lightning',
    cost: 3,
    damage: 6,
    abilities: [],
    rarity: 'Rare',
    artworkKey: 'attack-lightning-bolt'
  },
  
  // DEFENSES - Wall
  {
    id: 'stone_wall',
    name: 'Stone Wall',
    description: 'A sturdy wall that decays over time',
    type: 'Defense',
    subtype: 'Wall',
    element: 'Earth',
    cost: 3,
    hp: 10,
    decay: 2,
    abilities: [],
    rarity: 'Common',
    artworkKey: 'defense-stone-wall'
  },
  {
    id: 'ice_barrier',
    name: 'Ice Barrier',
    description: 'A frozen wall that slows attackers',
    type: 'Defense',
    subtype: 'Wall',
    element: 'Ice',
    cost: 4,
    hp: 8,
    decay: 1,
    abilities: [{
      id: 'chill',
      name: 'Chill',
      trigger: 'ON_DAMAGE',
      effect: { type: 'DEBUFF', value: -1, duration: 1 },
      targetType: 'OPPONENT'
    }],
    rarity: 'Rare',
    artworkKey: 'defense-ice-barrier'
  },
  
  // DEFENSES - Deflection
  {
    id: 'wind_deflect',
    name: 'Wind Deflection',
    description: 'Redirects projectile attacks',
    type: 'Defense',
    subtype: 'Deflection',
    element: 'Air',
    cost: 2,
    abilities: [],
    rarity: 'Common',
    artworkKey: 'defense-wind-deflect'
  },
  
  // MINERS
  {
    id: 'flame_miner',
    name: 'Flame Miner',
    description: 'Generates fire attacks over time',
    type: 'Miner',
    element: 'Fire',
    cost: 4,
    duration: 3,
    damage: 3,
    abilities: [{
      id: 'generate',
      name: 'Generate Attack',
      trigger: 'START_OF_TURN',
      effect: { type: 'SPAWN', value: 1 },
      targetType: 'SELF'
    }],
    rarity: 'Epic',
    artworkKey: 'miner-flame'
  },
  {
    id: 'crystal_miner',
    name: 'Crystal Miner',
    description: 'Generates powerful attacks but is fragile',
    type: 'Miner',
    element: 'Earth',
    cost: 5,
    duration: 4,
    damage: 5,
    abilities: [{
      id: 'generate',
      name: 'Generate Attack',
      trigger: 'START_OF_TURN',
      effect: { type: 'SPAWN', value: 1 },
      targetType: 'SELF'
    }],
    rarity: 'Legendary',
    artworkKey: 'miner-crystal'
  }
];

export function getCardById(id: string): ICardData | undefined {
  return CARD_DATABASE.find(card => card.id === id);
}

export function getCardsByElement(element: string): ICardData[] {
  return CARD_DATABASE.filter(card => card.element === element);
}

export function getCardsByType(type: string): ICardData[] {
  return CARD_DATABASE.filter(card => card.type === type);
}
```

## Element Color Palette

```typescript
// src/config/ElementColors.ts
export const ELEMENT_COLORS = {
  Fire: {
    primary: 0xff4400,
    secondary: 0xff8800,
    accent: 0xffcc00,
    glow: 0xfacc22
  },
  Water: {
    primary: 0x1e90ff,
    secondary: 0x00bfff,
    accent: 0x87ceeb,
    glow: 0x4169e1
  },
  Earth: {
    primary: 0x8b4513,
    secondary: 0x228b22,
    accent: 0xdaa520,
    glow: 0x6b8e23
  },
  Air: {
    primary: 0xe0ffff,
    secondary: 0xb0e0e6,
    accent: 0xffffff,
    glow: 0x87ceeb
  },
  Lightning: {
    primary: 0xffff00,
    secondary: 0x00ffff,
    accent: 0xffffcc,
    glow: 0xf0e68c
  },
  Ice: {
    primary: 0xadd8e6,
    secondary: 0x87ceeb,
    accent: 0xffffff,
    glow: 0xe0ffff
  }
} as const;

export type ElementColorKey = keyof typeof ELEMENT_COLORS;
```
