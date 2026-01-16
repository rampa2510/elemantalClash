import Phaser from 'phaser';
import { COLORS, FONTS, FONT_SIZES, TIMING } from '../../config/constants';
import { audioManager } from '../../audio';
import proceduralSFX from '../../audio/ProceduralSFX';

export interface ButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  textStyle?: Phaser.Types.GameObjects.Text.TextStyle;
  normalColor?: number;
  hoverColor?: number;
  pressedColor?: number;
  disabledColor?: number;
  borderColor?: number;
  hoverBorderColor?: number;
  onClick?: () => void;
}

/**
 * Enhanced Button component with tactile feedback
 * - Lift on hover (-4px Y, expanded shadow)
 * - Press depth (+2px Y, compressed shadow)
 * - Bounce easing on release
 * - Layered shadows for depth
 */
export class Button {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private shadowGraphics: Phaser.GameObjects.Graphics;
  private background: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private config: Required<ButtonConfig>;
  private isEnabled: boolean = true;
  private isPressed: boolean = false;
  private baseY: number;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    this.scene = scene;
    this.baseY = config.y;
    this.config = {
      textStyle: {
        fontSize: `${FONT_SIZES.md}px`,
        color: '#ffffff',
        fontFamily: FONTS.family,
        fontStyle: 'bold',
      },
      normalColor: COLORS.cardBg,
      hoverColor: 0x3d3d54,
      pressedColor: 0x1d1d34,
      disabledColor: 0x1a1a2e,
      borderColor: 0x666666,
      hoverBorderColor: COLORS.energyBar,
      onClick: () => {},
      ...config,
    };

    this.container = this.scene.add.container(config.x, config.y);
    this.shadowGraphics = this.scene.add.graphics();
    this.background = this.scene.add.graphics();
    this.label = this.scene.add.text(0, 0, '', this.config.textStyle).setOrigin(0.5);

    this.createComponents();
    this.setupInteraction();
  }

  private createComponents(): void {
    const { width, height, text, normalColor, borderColor } = this.config;

    // Draw shadow first (behind background)
    this.drawShadow('rest');

    // Draw background
    this.drawBackground(normalColor, borderColor);

    // Label
    this.label.setText(text);

    this.container.add([this.shadowGraphics, this.background, this.label]);
    this.container.setSize(width, height);
    this.container.setInteractive({ useHandCursor: true });
  }

  private drawShadow(state: 'rest' | 'hover' | 'pressed'): void {
    const { width, height } = this.config;
    this.shadowGraphics.clear();

    if (state === 'rest') {
      // Layered shadow - rest state
      this.shadowGraphics.fillStyle(0x000000, 0.15);
      this.shadowGraphics.fillRoundedRect(-width / 2 + 2, -height / 2 + 4, width, height, 10);
      this.shadowGraphics.fillStyle(0x000000, 0.1);
      this.shadowGraphics.fillRoundedRect(-width / 2 + 1, -height / 2 + 2, width, height, 10);
    } else if (state === 'hover') {
      // Expanded shadow on hover
      this.shadowGraphics.fillStyle(0x000000, 0.2);
      this.shadowGraphics.fillRoundedRect(-width / 2 + 4, -height / 2 + 8, width, height, 10);
      this.shadowGraphics.fillStyle(0x000000, 0.15);
      this.shadowGraphics.fillRoundedRect(-width / 2 + 2, -height / 2 + 4, width, height, 10);
      this.shadowGraphics.fillStyle(0x000000, 0.1);
      this.shadowGraphics.fillRoundedRect(-width / 2 + 1, -height / 2 + 2, width, height, 10);
    } else if (state === 'pressed') {
      // Minimal shadow when pressed
      this.shadowGraphics.fillStyle(0x000000, 0.2);
      this.shadowGraphics.fillRoundedRect(-width / 2 + 1, -height / 2 + 1, width, height, 10);
    }
  }

  private drawBackground(fillColor: number, strokeColor: number, strokeAlpha: number = 0.5): void {
    const { width, height } = this.config;

    this.background.clear();
    this.background.fillStyle(fillColor, 1);
    this.background.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    this.background.lineStyle(2, strokeColor, strokeAlpha);
    this.background.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
  }

  private setupInteraction(): void {
    this.container.on('pointerover', () => {
      if (!this.isEnabled) return;

      // Play procedural hover sound (Tone.js synthesis)
      proceduralSFX.hover();

      // Visual updates
      this.drawBackground(this.config.hoverColor, this.config.hoverBorderColor, 1);
      this.drawShadow('hover');
      this.label.setColor('#ffd43b');

      // Lift effect
      this.scene.tweens.add({
        targets: this.container,
        y: this.baseY - 4,
        duration: TIMING.normal,
        ease: 'Power2',
      });
    });

    this.container.on('pointerout', () => {
      if (!this.isEnabled) return;
      this.isPressed = false;

      // Reset visual state
      this.drawBackground(this.config.normalColor, this.config.borderColor);
      this.drawShadow('rest');
      this.label.setColor('#ffffff');

      // Return to base position
      this.scene.tweens.add({
        targets: this.container,
        y: this.baseY,
        scaleX: 1,
        scaleY: 1,
        duration: TIMING.normal,
        ease: 'Power2',
      });
    });

    this.container.on('pointerdown', () => {
      if (!this.isEnabled) return;
      this.isPressed = true;

      // Press visual state
      this.drawBackground(this.config.pressedColor, this.config.hoverBorderColor, 1);
      this.drawShadow('pressed');

      // Press down effect
      this.scene.tweens.add({
        targets: this.container,
        y: this.baseY + 2,
        scaleX: 0.98,
        scaleY: 0.98,
        duration: TIMING.instant,
        ease: 'Power2',
      });
    });

    this.container.on('pointerup', () => {
      if (!this.isEnabled || !this.isPressed) return;
      this.isPressed = false;

      // Play procedural click sound (Tone.js synthesis, infinite variations)
      proceduralSFX.click();

      // Bounce release
      this.scene.tweens.add({
        targets: this.container,
        y: this.baseY - 4,
        scaleX: 1,
        scaleY: 1,
        duration: TIMING.normal,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Restore hover shadow
          this.drawShadow('hover');
        }
      });

      this.drawBackground(this.config.hoverColor, this.config.hoverBorderColor, 1);
      this.config.onClick?.();
    });
  }

  // Public API

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;

    if (enabled) {
      this.container.setInteractive({ useHandCursor: true });
      this.drawBackground(this.config.normalColor, this.config.borderColor);
      this.drawShadow('rest');
      this.label.setAlpha(1);
    } else {
      this.container.disableInteractive();
      this.drawBackground(this.config.disabledColor, this.config.borderColor, 0.3);
      this.drawShadow('rest');
      this.label.setAlpha(0.5);
    }
  }

  setText(text: string): void {
    this.label.setText(text);
  }

  setPosition(x: number, y: number): void {
    this.baseY = y;
    this.container.setPosition(x, y);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  destroy(): void {
    this.container.destroy();
  }
}
