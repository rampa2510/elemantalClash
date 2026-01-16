import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../../config/constants';

export interface ModalButton {
  text: string;
  onClick: () => void;
  primary?: boolean;
}

export interface ModalConfig {
  title: string;
  message: string;
  buttons?: ModalButton[];
  width?: number;
  height?: number;
}

/**
 * Modal dialog component with overlay and animation
 * Based on phaser3-card-game-skill and ui-ux-mastery patterns
 */
export class Modal {
  private scene: Phaser.Scene;
  private overlay!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.Container;
  private onCloseCallback: (() => void) | null = null;
  private isClosing: boolean = false;

  constructor(scene: Phaser.Scene, config: ModalConfig) {
    this.scene = scene;
    this.create(config);
  }

  private create(config: ModalConfig): void {
    const modalWidth = config.width || 400;
    const modalHeight = config.height || 250;
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Dark overlay (blocks clicks behind)
    this.overlay = this.scene.add.rectangle(
      centerX,
      centerY,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0
    );
    this.overlay.setInteractive(); // Block clicks
    this.overlay.setDepth(1000);

    // Panel container
    this.panel = this.scene.add.container(centerX, centerY);
    this.panel.setDepth(1001);

    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.cardBg, 1);
    bg.fillRoundedRect(-modalWidth / 2, -modalHeight / 2, modalWidth, modalHeight, 16);
    bg.lineStyle(2, COLORS.text, 0.3);
    bg.strokeRoundedRect(-modalWidth / 2, -modalHeight / 2, modalWidth, modalHeight, 16);

    // Title
    const title = this.scene.add.text(0, -modalHeight / 2 + 35, config.title, {
      fontSize: '24px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Divider line
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, COLORS.text, 0.2);
    divider.lineBetween(-modalWidth / 2 + 20, -modalHeight / 2 + 60, modalWidth / 2 - 20, -modalHeight / 2 + 60);

    // Message
    const message = this.scene.add.text(0, -10, config.message, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#b8c5d6',
      align: 'center',
      wordWrap: { width: modalWidth - 60 },
    }).setOrigin(0.5);

    this.panel.add([bg, title, divider, message]);

    // Buttons
    const buttons = config.buttons || [{ text: 'OK', onClick: () => this.close(), primary: true }];
    const buttonWidth = 100;
    const buttonHeight = 40;
    const buttonSpacing = 20;
    const totalButtonWidth = buttons.length * buttonWidth + (buttons.length - 1) * buttonSpacing;
    let buttonX = -totalButtonWidth / 2 + buttonWidth / 2;

    buttons.forEach((btnConfig) => {
      const button = this.createButton(
        buttonX,
        modalHeight / 2 - 50,
        buttonWidth,
        buttonHeight,
        btnConfig.text,
        btnConfig.onClick,
        btnConfig.primary ?? false
      );
      this.panel.add(button);
      buttonX += buttonWidth + buttonSpacing;
    });

    // Animate in
    this.animateIn();
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    onClick: () => void,
    primary: boolean
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    const fillColor = primary ? COLORS.energyBar : 0x4a4a5a;
    const textColor = primary ? '#000000' : '#ffffff';

    bg.fillStyle(fillColor, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);

    const label = this.scene.add.text(0, 0, text, {
      fontSize: '16px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: textColor,
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    // Hover effects
    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(primary ? 0xffe066 : 0x5a5a6a, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(fillColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    });

    container.on('pointerdown', () => {
      if (this.isClosing) return;
      onClick();
    });

    return container;
  }

  private animateIn(): void {
    // Initial state
    this.panel.setScale(0.8);
    this.panel.setAlpha(0);
    this.overlay.setAlpha(0);

    // Animate overlay
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 0.7,
      duration: 200,
    });

    // Animate panel
    this.scene.tweens.add({
      targets: this.panel,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  close(): void {
    if (this.isClosing) return;
    this.isClosing = true;

    // Animate out
    this.scene.tweens.add({
      targets: [this.overlay, this.panel],
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.overlay.destroy();
        this.panel.destroy();
        this.onCloseCallback?.();
      },
    });

    this.scene.tweens.add({
      targets: this.panel,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 200,
    });
  }

  setOnClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }
}
