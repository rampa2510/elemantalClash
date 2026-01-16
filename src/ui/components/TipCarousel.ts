import Phaser from 'phaser';
import { themeManager } from '../../managers/ThemeManager';

/**
 * TipCarousel - Rotating strategy tips display
 * Auto-rotates every 6 seconds with manual navigation
 */
export class TipCarousel {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private width: number;
  private compact: boolean;

  private container!: Phaser.GameObjects.Container;
  private tipText!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;
  private prevButton!: Phaser.GameObjects.Text;
  private nextButton!: Phaser.GameObjects.Text;
  private dotsContainer!: Phaser.GameObjects.Container;

  private currentTipIndex: number = 0;
  private autoRotateTimer: Phaser.Time.TimerEvent | null = null;
  private fadeTween: Phaser.Tweens.Tween | null = null;

  private readonly STRATEGY_TIPS = [
    'Walls protect your miners from direct attacks!',
    'Deflection cards counter projectiles perfectly',
    'Energy miners provide long-term economic advantage',
    'Save energy for emergency defense options',
    'Projectiles ignore walls - deadly chip damage!',
    'Earth walls have the most HP but cost more',
    'Fire deals extra damage but has low HP',
    'Water balances offense and defense well',
    'Air is fast and cheap, great for early game',
    'Combo elements for maximum strategic depth',
  ];

  constructor(scene: Phaser.Scene, x: number, y: number, width: number = 500, compact: boolean = false) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.compact = compact;

    this.create();
    this.startAutoRotate();
  }

  private create(): void {
    const colors = themeManager.getColors();

    // Dimensions based on compact mode
    const titleOffsetY = this.compact ? -30 : -45;
    const bgHeight = this.compact ? 80 : 120;
    const tipFontSize = this.compact ? '14px' : '16px';
    const counterOffsetY = this.compact ? 28 : 35;
    const dotsOffsetY = this.compact ? 40 : 52;

    // Container for all carousel elements
    this.container = this.scene.add.container(this.x, this.y);

    // Background panel
    const bg = this.scene.add.rectangle(0, 0, this.width, bgHeight, 0x000000, 0.3);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(0, titleOffsetY, 'STRATEGY TIPS', {
      fontFamily: 'Arial',
      fontSize: this.compact ? '12px' : '14px',
      color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(title);

    // Tip text (main content)
    this.tipText = this.scene.add.text(0, 0, this.STRATEGY_TIPS[0], {
      fontFamily: 'Arial',
      fontSize: tipFontSize,
      color: `#${colors.text.toString(16).padStart(6, '0')}`,
      align: 'center',
      wordWrap: { width: this.width - 80 },
    }).setOrigin(0.5);
    this.container.add(this.tipText);

    // Counter text (e.g., "1 / 10")
    this.counterText = this.scene.add.text(0, counterOffsetY, `${this.currentTipIndex + 1} / ${this.STRATEGY_TIPS.length}`, {
      fontFamily: 'Arial',
      fontSize: this.compact ? '10px' : '12px',
      color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
    this.container.add(this.counterText);

    // Navigation buttons
    this.createNavigationButtons();

    // Dots indicator
    this.createDotsIndicator(dotsOffsetY);
  }

  private createNavigationButtons(): void {
    const colors = themeManager.getColors();
    const buttonY = 0;
    const buttonX = this.width / 2 - 30;

    // Previous button
    this.prevButton = this.scene.add.text(-buttonX, buttonY, '◀', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.prevButton.on('pointerdown', () => {
      this.showPreviousTip();
    });

    this.prevButton.on('pointerover', () => {
      this.prevButton.setScale(1.2);
    });

    this.prevButton.on('pointerout', () => {
      this.prevButton.setScale(1);
    });

    // Next button
    this.nextButton = this.scene.add.text(buttonX, buttonY, '▶', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.nextButton.on('pointerdown', () => {
      this.showNextTip();
    });

    this.nextButton.on('pointerover', () => {
      this.nextButton.setScale(1.2);
    });

    this.nextButton.on('pointerout', () => {
      this.nextButton.setScale(1);
    });

    this.container.add([this.prevButton, this.nextButton]);
  }

  private createDotsIndicator(offsetY: number = 52): void {
    this.dotsContainer = this.scene.add.container(0, offsetY);
    const colors = themeManager.getColors();

    const dotSpacing = 12;
    const totalWidth = (this.STRATEGY_TIPS.length - 1) * dotSpacing;
    const startX = -totalWidth / 2;

    for (let i = 0; i < this.STRATEGY_TIPS.length; i++) {
      const dot = this.scene.add.circle(
        startX + i * dotSpacing,
        0,
        3,
        i === this.currentTipIndex ? colors.fire : colors.textSecondary,
        i === this.currentTipIndex ? 1 : 0.4
      );
      this.dotsContainer.add(dot);
    }

    this.container.add(this.dotsContainer);
  }

  private updateDotsIndicator(): void {
    const colors = themeManager.getColors();
    const dots = this.dotsContainer.list as Phaser.GameObjects.Arc[];

    dots.forEach((dot, index) => {
      if (index === this.currentTipIndex) {
        dot.setFillStyle(colors.fire, 1);
        dot.setRadius(4);
      } else {
        dot.setFillStyle(colors.textSecondary, 0.4);
        dot.setRadius(3);
      }
    });
  }

  private showNextTip(): void {
    this.currentTipIndex = (this.currentTipIndex + 1) % this.STRATEGY_TIPS.length;
    this.updateTipDisplay();
    this.resetAutoRotateTimer();
  }

  private showPreviousTip(): void {
    this.currentTipIndex = (this.currentTipIndex - 1 + this.STRATEGY_TIPS.length) % this.STRATEGY_TIPS.length;
    this.updateTipDisplay();
    this.resetAutoRotateTimer();
  }

  private updateTipDisplay(): void {
    // Fade out
    if (this.fadeTween) {
      this.fadeTween.stop();
    }

    this.fadeTween = this.scene.tweens.add({
      targets: this.tipText,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        // Update text
        this.tipText.setText(this.STRATEGY_TIPS[this.currentTipIndex]);
        this.counterText.setText(`${this.currentTipIndex + 1} / ${this.STRATEGY_TIPS.length}`);
        this.updateDotsIndicator();

        // Fade in
        this.fadeTween = this.scene.tweens.add({
          targets: this.tipText,
          alpha: 1,
          duration: 200,
        });
      },
    });
  }

  private startAutoRotate(): void {
    // Auto-rotate every 6 seconds
    this.autoRotateTimer = this.scene.time.addEvent({
      delay: 6000,
      callback: () => {
        this.showNextTip();
      },
      loop: true,
    });
  }

  private resetAutoRotateTimer(): void {
    // High Bug #5 fix: Remove old timer before creating new one to prevent leak
    if (this.autoRotateTimer) {
      this.autoRotateTimer.remove();
      this.autoRotateTimer = null;
    }

    // Create new timer
    this.autoRotateTimer = this.scene.time.addEvent({
      delay: 6000,
      callback: () => {
        this.showNextTip();
      },
      loop: true,
    });
  }

  public destroy(): void {
    if (this.autoRotateTimer) {
      this.autoRotateTimer.remove();
      this.autoRotateTimer = null;
    }

    if (this.fadeTween) {
      this.fadeTween.stop();
      this.fadeTween = null;
    }

    if (this.container) {
      this.container.destroy(true);
    }
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
