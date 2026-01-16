import Phaser from 'phaser';

export type CardState = 'IN_DECK' | 'IN_HAND' | 'SELECTED' | 'PLAYED' | 'DISCARDED' | 'DESTROYED';

export interface ICardData {
  id: string;
  name: string;
  type: 'Attack' | 'Defense' | 'Miner';
  element: string;
  damage?: number;
  hp?: number;
  artworkKey: string;
}

export class Card extends Phaser.GameObjects.Container {
  public readonly instanceId: string;
  public readonly cardData: ICardData;
  
  private _state: CardState = 'IN_DECK';
  private cardBack: Phaser.GameObjects.Image;
  private cardFront: Phaser.GameObjects.Image;
  private isFaceUp = false;

  private static readonly VALID_TRANSITIONS: Record<CardState, CardState[]> = {
    'IN_DECK': ['IN_HAND'],
    'IN_HAND': ['SELECTED', 'PLAYED', 'DISCARDED'],
    'SELECTED': ['IN_HAND', 'PLAYED'],
    'PLAYED': ['DISCARDED', 'DESTROYED'],
    'DISCARDED': ['IN_DECK'],
    'DESTROYED': []
  };

  constructor(scene: Phaser.Scene, x: number, y: number, cardData: ICardData) {
    super(scene, x, y);
    
    this.cardData = cardData;
    this.instanceId = `${cardData.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create card back
    this.cardBack = scene.add.image(0, 0, 'card-back');
    
    // Create card front
    this.cardFront = scene.add.image(0, 0, 'cards', cardData.artworkKey);
    this.cardFront.setVisible(false);
    
    this.add([this.cardBack, this.cardFront]);
    
    // CRITICAL: Set size and interactive AFTER adding children
    this.setSize(this.cardBack.width, this.cardBack.height);
    this.setInteractive({ useHandCursor: true });
    
    scene.add.existing(this);
  }

  get state(): CardState {
    return this._state;
  }

  public transitionTo(newState: CardState): boolean {
    const validNextStates = Card.VALID_TRANSITIONS[this._state];
    if (!validNextStates.includes(newState)) {
      console.warn(`Invalid transition: ${this._state} → ${newState}`);
      return false;
    }
    
    this._state = newState;
    this.emit('state-changed', { from: this._state, to: newState });
    return true;
  }

  public async flip(): Promise<void> {
    return new Promise(resolve => {
      // Kill any existing tweens on this card
      this.scene.tweens.killTweensOf(this);
      
      // Scale to 0
      this.scene.tweens.add({
        targets: this,
        scaleX: 0,
        duration: 150,
        ease: 'Quad.easeIn',
        onComplete: () => {
          // Swap visibility
          this.isFaceUp = !this.isFaceUp;
          this.cardBack.setVisible(!this.isFaceUp);
          this.cardFront.setVisible(this.isFaceUp);
          
          // Scale back to 1
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

  public setFaceUp(faceUp: boolean): void {
    this.isFaceUp = faceUp;
    this.cardBack.setVisible(!faceUp);
    this.cardFront.setVisible(faceUp);
  }
}
