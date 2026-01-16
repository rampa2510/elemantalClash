import Phaser from 'phaser';
import { COLORS, FONTS, MESSAGE_ANIMATION, GAME_WIDTH, GAME_HEIGHT } from '../../config/constants';

/**
 * Toast notification for user feedback
 * Based on phaser3-card-game-skill patterns
 * Enhanced with directional messages for player vs opponent
 */
export class Toast {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000): void {
    const { width } = this.scene.cameras.main;

    const colors = {
      success: 0x51cf66,
      error: 0xff6b6b,
      info: 0x4dabf7,
      warning: 0xffd43b,
    };

    const container = this.scene.add.container(width / 2, -50);
    container.setDepth(2000);

    // Calculate text width for dynamic sizing
    const tempText = this.scene.add.text(0, 0, message, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
    });
    const textWidth = tempText.width;
    tempText.destroy();

    const bgWidth = Math.max(200, textWidth + 40);

    const bg = this.scene.add.graphics();
    bg.fillStyle(colors[type], 0.95);
    bg.fillRoundedRect(-bgWidth / 2, -22, bgWidth, 44, 8);
    bg.lineStyle(2, 0xffffff, 0.2);
    bg.strokeRoundedRect(-bgWidth / 2, -22, bgWidth, 44, 8);

    const text = this.scene.add.text(0, 0, message, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, text]);

    // Slide in from top
    this.scene.tweens.add({
      targets: container,
      y: 60,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Auto dismiss after duration
    this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: container,
        y: -50,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeIn',
        onComplete: () => container.destroy(),
      });
    });
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  /**
   * Show player message in bottom zone with upward arrow
   */
  showPlayerMessage(
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ): void {
    this.showDirectionalMessage(message, type, 'player');
  }

  /**
   * Show opponent message in top zone with downward arrow
   */
  showOpponentMessage(
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ): void {
    this.showDirectionalMessage(message, type, 'opponent');
  }

  /**
   * Show directional message with spatial positioning
   */
  private showDirectionalMessage(
    message: string,
    type: 'success' | 'error' | 'info',
    direction: 'player' | 'opponent'
  ): void {
    const colors = {
      success: COLORS.messagePlayer,
      error: COLORS.messageOpponent,
      info: COLORS.messageNeutral,
    };

    const icons = {
      player: '▲',
      opponent: '▼',
    };

    const arrowColors = {
      player: COLORS.arrowUp,
      opponent: COLORS.arrowDown,
    };

    // Position based on direction
    const targetY = direction === 'player'
      ? GAME_HEIGHT - 250  // Bottom zone
      : 60;                // Top zone

    const startY = direction === 'player'
      ? GAME_HEIGHT        // Start below screen
      : -50;               // Start above screen

    const container = this.scene.add.container(GAME_WIDTH / 2, startY);
    container.setDepth(2000);

    // Add direction arrow
    const arrow = this.scene.add.text(-140, 0, icons[direction], {
      fontSize: '18px',
      color: `#${arrowColors[direction].toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Enhanced message with icons
    const enhancedMessage = this.addMessageIcons(message);
    const tempText = this.scene.add.text(0, 0, enhancedMessage, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: FONTS.family,
    });
    const textWidth = tempText.width;
    tempText.destroy();

    const bgWidth = Math.max(250, textWidth + 60);

    const bg = this.scene.add.graphics();
    bg.fillStyle(colors[type], 0.95);
    bg.fillRoundedRect(-bgWidth / 2, -22, bgWidth, 44, 8);
    bg.lineStyle(2, 0xffffff, 0.2);
    bg.strokeRoundedRect(-bgWidth / 2, -22, bgWidth, 44, 8);

    const text = this.scene.add.text(0, 0, enhancedMessage, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: FONTS.family,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, arrow, text]);

    // Slide in with bounce
    this.scene.tweens.add({
      targets: container,
      y: targetY,
      duration: MESSAGE_ANIMATION.slideInDuration,
      ease: MESSAGE_ANIMATION.slideInEase,
    });

    // Auto dismiss
    this.scene.time.delayedCall(MESSAGE_ANIMATION.displayDuration, () => {
      const exitY = direction === 'player'
        ? GAME_HEIGHT - 200
        : 10;

      this.scene.tweens.add({
        targets: container,
        y: exitY,
        alpha: 0,
        duration: MESSAGE_ANIMATION.slideOutDuration,
        ease: MESSAGE_ANIMATION.slideOutEase,
        onComplete: () => container.destroy(),
      });
    });
  }

  /**
   * Add emoji icons to message based on keywords
   */
  private addMessageIcons(message: string): string {
    const iconMap: Record<string, string> = {
      'dealt': '⚔️',
      'blocked': '🛡️',
      'Bot': '⚙️',
      'healed': '💚',
      'destroyed': '💀',
    };

    let enhanced = message;
    Object.entries(iconMap).forEach(([keyword, icon]) => {
      if (message.includes(keyword) && !message.includes(icon)) {
        // Add icon before the keyword
        enhanced = enhanced.replace(keyword, `${icon} ${keyword}`);
      }
    });

    return enhanced;
  }
}
