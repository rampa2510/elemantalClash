import { BaseScene } from './BaseScene';
import { SceneKeys } from '../core/SceneKeys';
import { Button } from '../ui/components';
import { COLORS } from '../config/constants';
import { settingsManager } from '../managers/SettingsManager';

interface TutorialSlide {
  title: string;
  content: string[];
  icon?: string;
}

interface TutorialSceneData {
  fadeIn?: boolean;
  returnToMultiplayer?: boolean;
  sessionId?: string;
}

/**
 * Tutorial scene - explains game mechanics
 */
export class TutorialScene extends BaseScene {
  private currentSlide: number = 0;
  private slides: TutorialSlide[] = [];
  private contentContainer!: Phaser.GameObjects.Container;
  private slideIndicator!: Phaser.GameObjects.Text;
  private backButton!: Button;
  private prevArrow!: Phaser.GameObjects.Text;
  private nextArrow!: Phaser.GameObjects.Text;

  // Multiplayer context
  private returnToMultiplayer: boolean = false;
  private sessionId: string | null = null;

  // Keyboard navigation
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyEscape!: Phaser.Input.Keyboard.Key;

  // Medium Issue #1 fix: Store handler references for proper cleanup
  private keyLeftHandler?: () => void;
  private keyRightHandler?: () => void;
  private keyEscapeHandler?: () => void;

  constructor() {
    super({ key: SceneKeys.TUTORIAL });
  }

  create(data?: TutorialSceneData): void {
    super.create();

    // Check for multiplayer context
    if (data?.returnToMultiplayer && data?.sessionId) {
      this.returnToMultiplayer = true;
      this.sessionId = data.sessionId;
    }

    if (this.shouldFadeIn(data)) {
      this.fadeIn();
    }

    this.initSlides();
    this.createUI();
    this.setupKeyboardNavigation();
    this.showSlide(0);
  }

  private initSlides(): void {
    this.slides = [
      {
        title: 'OBJECTIVE',
        content: [
          "Reduce your opponent's Base HP to 0",
          'Each player starts with 20 HP',
          'Simultaneous turn-based gameplay',
          '10 seconds to select your card each turn',
        ],
      },
      {
        title: 'ENERGY SYSTEM',
        content: [
          'Start with 5 Energy, max 10',
          'Gain 2-3 Energy each turn (avg 2.5)',
          'Cards cost Energy to play',
          'Manage your Energy wisely!',
        ],
      },
      {
        title: 'BLASTS ⚔️',
        content: [
          'Cost: 5 Energy | Damage: 8',
          'Heavy damage attack',
          'Blocked completely by Shields',
          'Reduced by 2 with Dodge',
        ],
      },
      {
        title: 'SHOTS ⚔️',
        content: [
          'Cost: 3 Energy | Damage: 3',
          'Quick attack - IGNORES Shields!',
          'Blocked 100% by Dodge',
          'Consistent chip damage',
        ],
      },
      {
        title: 'SHIELDS 🛡️',
        content: [
          'Cost: 2 Energy | HP: 12',
          'Blocks Blasts completely',
          'Decays 4 HP each turn (3 turns max)',
          'Only ONE Shield at a time',
        ],
      },
      {
        title: 'DODGES 🛡️',
        content: [
          'Cost: 1 Energy (cheapest!)',
          'Blocks Shots 100%',
          'Reduces Blasts by 2 damage',
          'Lasts only ONE turn',
        ],
      },
      {
        title: 'BOTS ⛏️',
        content: [
          'Dodge Bot (2): Blocks Shots every 2 turns',
          'Shot Bot (3): Attacks 3 dmg every 2 turns',
          'Repair Bot (3): Heals Shield every 2 turns',
          'Blast Bot (5): Attacks 8 dmg every 3 turns',
        ],
      },
      {
        title: 'BOT RULES ⛏️',
        content: [
          'Only ONE Bot allowed at a time',
          'DIES if your base takes ANY damage!',
          'Protect your Bot with Shields!',
          'Bots generate value over time',
        ],
      },
      {
        title: 'READY TO PLAY?',
        content: [
          'Draft 6 cards to build your deck',
          'Use strategy to outplay your opponent',
          'Both players act simultaneously',
          'Good luck!',
        ],
      },
    ];
  }

  private createUI(): void {
    // Background
    this.createGradientBackground();

    // Content container
    this.contentContainer = this.add.container(0, 0);

    // Navigation arrows
    this.createNavButtons();

    // Back to menu button (or start game if multiplayer)
    const buttonText = this.returnToMultiplayer ? 'START GAME' : 'BACK TO MENU';
    this.backButton = new Button(this, {
      x: this.centerX,
      y: this.screenHeight - 70,
      width: 200,
      height: 45,
      text: buttonText,
      onClick: () => this.handleExit(),
    });

    // Slide indicator
    this.slideIndicator = this.add.text(this.centerX, this.screenHeight - 30, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#b8c5d6',
    }).setOrigin(0.5);

    // Keyboard hint
    this.add.text(this.centerX, this.screenHeight - 120, '← → Arrow keys to navigate | ESC to go back', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666',
    }).setOrigin(0.5);
  }

  private createNavButtons(): void {
    // Previous button
    this.prevArrow = this.add.text(50, this.centerY, '◀', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#ffffff',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.prevSlide())
      .on('pointerover', () => this.prevArrow.setColor('#ffd43b'))
      .on('pointerout', () => this.prevArrow.setColor('#ffffff'));

    // Next button
    this.nextArrow = this.add.text(this.screenWidth - 50, this.centerY, '▶', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#ffffff',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.nextSlide())
      .on('pointerover', () => this.nextArrow.setColor('#ffd43b'))
      .on('pointerout', () => this.nextArrow.setColor('#ffffff'));
  }

  private setupKeyboardNavigation(): void {
    if (!this.input.keyboard) return;

    this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keyEscape = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Medium Issue #1 fix: Store handlers for proper cleanup
    this.keyLeftHandler = () => this.prevSlide();
    this.keyRightHandler = () => this.nextSlide();
    this.keyEscapeHandler = () => this.handleExit();

    this.keyLeft.on('down', this.keyLeftHandler);
    this.keyRight.on('down', this.keyRightHandler);
    this.keyEscape.on('down', this.keyEscapeHandler);
  }

  /**
   * Handle exit from tutorial (either back to menu or to connecting scene)
   */
  private handleExit(): void {
    if (this.returnToMultiplayer && this.sessionId) {
      // Return to multiplayer flow (Phase 2: Use dynamic player name)
      this.transitionTo(SceneKeys.CONNECTING, {
        sessionId: this.sessionId,
        playerName: settingsManager.getPlayerName(),
      });
    } else {
      // Return to menu
      this.transitionTo(SceneKeys.MENU);
    }
  }

  private showSlide(index: number): void {
    this.currentSlide = index;
    this.contentContainer.removeAll(true);

    const slide = this.slides[index];

    // Title
    const title = this.add.text(this.centerX, 80, slide.title, {
      fontFamily: 'Arial',
      fontSize: '36px',
      color: '#ffd43b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.contentContainer.add(title);

    // Content lines with staggered fade-in
    slide.content.forEach((line, i) => {
      const text = this.add.text(this.centerX, 180 + i * 50, line, {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0);
      this.contentContainer.add(text);

      // Staggered fade-in animation
      this.addTween({
        targets: text,
        alpha: 1,
        duration: 300,
        delay: i * 100,
        ease: 'Quad.easeOut',
      });
    });

    // Update indicator
    this.slideIndicator.setText(`${index + 1} / ${this.slides.length}`);

    // Update arrow visibility
    this.prevArrow.setAlpha(index > 0 ? 1 : 0.3);
    this.nextArrow.setAlpha(index < this.slides.length - 1 ? 1 : 0.3);
  }

  private nextSlide(): void {
    if (this.currentSlide < this.slides.length - 1) {
      this.showSlide(this.currentSlide + 1);
    }
  }

  private prevSlide(): void {
    if (this.currentSlide > 0) {
      this.showSlide(this.currentSlide - 1);
    }
  }

  shutdown(): void {
    this.backButton?.destroy();

    // Medium Issue #1 fix: Properly remove keyboard listeners
    if (this.input.keyboard) {
      if (this.keyLeft && this.keyLeftHandler) {
        this.keyLeft.off('down', this.keyLeftHandler);
        this.keyLeftHandler = undefined;
      }
      if (this.keyRight && this.keyRightHandler) {
        this.keyRight.off('down', this.keyRightHandler);
        this.keyRightHandler = undefined;
      }
      if (this.keyEscape && this.keyEscapeHandler) {
        this.keyEscape.off('down', this.keyEscapeHandler);
        this.keyEscapeHandler = undefined;
      }
    }
  }
}
