import { BaseScene } from './BaseScene';
import { SceneKeys } from '../core/SceneKeys';
import { Button } from '../ui/components';
import { COLORS, DOUBLE_LOSS_MESSAGES, FONTS, FONT_SIZES, TIMING } from '../config/constants';
import { gameRandom } from '../utils/RandomGenerator';
import proceduralSFX from '../audio/ProceduralSFX';
import { PostFXPipeline } from '../shaders/PostFXPipeline';
import { musicManager } from '../audio/MusicManager';

interface GameOverData {
  winner: string | null;
  isDoubleKO: boolean;
  player1HP: number;
  player2HP: number;
  fadeIn?: boolean;
}

/**
 * Enhanced game over scene with celebrations
 * - Screen flash before reveal
 * - Confetti burst on victory
 * - Trophy animation
 * - Count-up HP stats
 */
export class GameOverScene extends BaseScene {
  private winner: string | null = null;
  private isDoubleKO: boolean = false;
  private player1HP: number = 0;
  private player2HP: number = 0;
  private buttons: Button[] = [];
  private displayedP1HP: number = 0;
  private displayedP2HP: number = 0;
  private p1HPText!: Phaser.GameObjects.Text;
  private p2HPText!: Phaser.GameObjects.Text;
  private postFX!: PostFXPipeline;

  constructor() {
    super({ key: SceneKeys.GAME_OVER });
  }

  init(data: GameOverData): void {
    this.winner = data.winner;
    this.isDoubleKO = data.isDoubleKO;
    this.player1HP = data.player1HP;
    this.player2HP = data.player2HP;
    this.displayedP1HP = 0;
    this.displayedP2HP = 0;
  }

  create(data?: GameOverData): void {
    super.create();

    // Fade out gameplay music
    musicManager.fadeOut(3);

    // Initial white flash
    if (!this.prefersReducedMotion) {
      this.cameras.main.flash(TIMING.fast, 255, 255, 255);
    }

    if (this.shouldFadeIn(data)) {
      this.fadeIn();
    }

    // Initialize AAA Post-Processing Effects
    this.initializePostFX();

    // Apply victory/defeat PostFX presets for AAA visual impact
    if (this.postFX) {
      const isVictory = this.winner === 'player1';
      if (this.isDoubleKO) {
        // Double KO: Use defeat dimming effect
        this.postFX.defeatDim();
      } else if (isVictory) {
        // Victory: Golden glow effect
        this.postFX.victoryGlow();
      } else {
        // Defeat: Desaturated, dim effect
        this.postFX.defeatDim();
      }
    }

    this.createBackground();

    // Delayed reveal for dramatic effect
    this.time.delayedCall(TIMING.slow, () => {
      if (this.isDoubleKO) {
        this.createDoubleKODisplay();
      } else {
        this.createVictoryDisplay();
      }

      this.createButtons();
    });
  }

  private createBackground(): void {
    const graphics = this.add.graphics();

    if (this.isDoubleKO) {
      // Dark red gradient for double KO
      graphics.fillGradientStyle(0x1a0a0a, 0x1a0a0a, 0x2a1515, 0x2a1515, 1);
    } else if (this.winner === 'player1') {
      // Victory gradient (gold tint)
      graphics.fillGradientStyle(0x1a1a0a, 0x1a1a0a, 0x252520, 0x252520, 1);
    } else {
      // Defeat gradient
      graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d2d44, 0x2d2d44, 1);
    }

    graphics.fillRect(0, 0, this.screenWidth, this.screenHeight);
  }

  private createVictoryDisplay(): void {
    const isVictory = this.winner === 'player1';
    const winnerName = isVictory ? 'YOU' : 'AI';

    // 🎵 Play victory fanfare or defeat sound
    if (isVictory) {
      proceduralSFX.victoryFanfare();
    } else {
      proceduralSFX.defeatSound();
    }

    // Trophy/Crown for victory
    if (isVictory && !this.prefersReducedMotion) {
      this.createTrophyAnimation();
      this.createConfettiBurst();
    }

    // Winner name with scale-in animation
    const winnerText = this.add.text(this.centerX, 120, winnerName, {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.xxl}px`,
      color: '#ffd43b',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: winnerText,
      scaleX: 1,
      scaleY: 1,
      duration: TIMING.slow,
      ease: 'Back.easeOut',
    });

    // "WIN!" or "WINS!" text (grammar: "YOU WIN!" vs "AI WINS!")
    const winVerb = isVictory ? 'WIN!' : 'WINS!';
    const winsText = this.add.text(this.centerX, 185, winVerb, {
      fontFamily: FONTS.family,
      fontSize: '64px',
      color: isVictory ? '#51cf66' : '#ff6b6b',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: winsText,
      scaleX: 1,
      scaleY: 1,
      duration: TIMING.slow,
      delay: TIMING.normal,
      ease: 'Back.easeOut',
    });

    // Final HP display with count-up
    this.createHPDisplay();

    // Subtle pulse on win text
    if (isVictory && !this.prefersReducedMotion) {
      this.tweens.add({
        targets: winsText,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: TIMING.dramatic,
      });
    }
  }

  private createTrophyAnimation(): void {
    // Crown/Trophy emoji with bounce-in
    const trophy = this.add.text(this.centerX, 50, '👑', {
      fontSize: '48px',
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: trophy,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: TIMING.slow,
      delay: TIMING.normal,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Gentle floating animation
        this.tweens.add({
          targets: trophy,
          y: 45,
          scaleX: 1.25,
          scaleY: 1.25,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
    });

    // Add sparkle effect around trophy
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const sparkle = this.add.text(
        this.centerX + Math.cos(angle) * 40,
        50 + Math.sin(angle) * 25,
        '✨',
        { fontSize: '16px' }
      ).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: sparkle,
        alpha: { from: 0, to: 1 },
        duration: 400,
        delay: TIMING.slow + i * 100,
        yoyo: true,
        repeat: -1,
        hold: 200,
      });
    }
  }

  private createConfettiBurst(): void {
    // Create confetti texture if needed
    if (!this.textures.exists('confetti')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffffff);
      graphics.fillRect(0, 0, 8, 8);
      graphics.generateTexture('confetti', 8, 8);
      graphics.destroy();
    }

    // Central burst effect
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffd700];

    const confetti = this.add.particles(this.centerX, 200, 'confetti', {
      color: colors,
      lifespan: 2500,
      speed: { min: 150, max: 350 },
      angle: { min: 220, max: 320 },
      scale: { start: 0.6, end: 0.2 },
      gravityY: 200,
      rotate: { min: 0, max: 360 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    });

    // Burst in waves
    confetti.explode(40);

    this.time.delayedCall(200, () => confetti.explode(30));
    this.time.delayedCall(400, () => confetti.explode(20));

    // Cleanup
    this.time.delayedCall(3000, () => confetti.destroy());

    // Side bursts
    const leftBurst = this.add.particles(100, 300, 'confetti', {
      color: colors,
      lifespan: 2000,
      speed: { min: 100, max: 250 },
      angle: { min: 270, max: 330 },
      scale: { start: 0.5, end: 0.1 },
      gravityY: 150,
      rotate: { min: 0, max: 360 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    });

    const rightBurst = this.add.particles(this.screenWidth - 100, 300, 'confetti', {
      color: colors,
      lifespan: 2000,
      speed: { min: 100, max: 250 },
      angle: { min: 210, max: 270 },
      scale: { start: 0.5, end: 0.1 },
      gravityY: 150,
      rotate: { min: 0, max: 360 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    });

    this.time.delayedCall(300, () => {
      leftBurst.explode(25);
      rightBurst.explode(25);
    });

    this.time.delayedCall(3000, () => {
      leftBurst.destroy();
      rightBurst.destroy();
    });
  }

  private createDoubleKODisplay(): void {
    // 🎵 Play dramatic defeat sound for double KO
    proceduralSFX.defeatSound();

    // Screen shake for double KO
    if (!this.prefersReducedMotion) {
      this.cameras.main.shake(500, 0.02);
    }

    // Double KO announcement with dramatic fade in
    const doubleText = this.add.text(this.centerX, 100, 'DOUBLE', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.xxl}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const koText = this.add.text(this.centerX, 160, 'KNOCKOUT', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.xxl}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: doubleText,
      alpha: 1,
      duration: TIMING.slow,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: koText,
      alpha: 1,
      duration: TIMING.slow,
      delay: TIMING.normal,
      ease: 'Power2',
    });

    // Anti-war message
    const message = gameRandom.pick(DOUBLE_LOSS_MESSAGES);

    const messageText = this.add.text(this.centerX, 260, message, {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.sm}px`,
      color: '#b8c5d6',
      wordWrap: { width: 600 },
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: messageText,
      alpha: 1,
      duration: TIMING.dramatic,
      delay: TIMING.slow,
      ease: 'Power2',
    });

    // Skull emoji with pulse
    const skulls = this.add.text(this.centerX, 350, '💀 💀', {
      fontSize: '48px',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: skulls,
      alpha: 1,
      duration: TIMING.slow,
      delay: TIMING.dramatic,
      ease: 'Power2',
    });

    if (!this.prefersReducedMotion) {
      this.tweens.add({
        targets: skulls,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        delay: TIMING.dramatic + TIMING.slow,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createHPDisplay(): void {
    const y = 280;

    // Final score display
    const titleText = this.add.text(this.centerX, y, 'FINAL HP', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.md}px`,
      color: '#b8c5d6',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: titleText,
      alpha: 1,
      duration: TIMING.normal,
      delay: TIMING.dramatic,
      ease: 'Power2',
    });

    // Your HP with count-up
    const p1Color = this.winner === 'player1' ? '#51cf66' : '#ff6b6b';
    this.p1HPText = this.add.text(this.centerX - 100, y + 45, 'YOU: 0', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.lg}px`,
      color: p1Color,
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    // VS
    const vsText = this.add.text(this.centerX, y + 45, 'vs', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.md}px`,
      color: '#b8c5d6',
    }).setOrigin(0.5).setAlpha(0);

    // AI HP with count-up
    const p2Color = this.winner === 'player2' ? '#51cf66' : '#ff6b6b';
    this.p2HPText = this.add.text(this.centerX + 100, y + 45, 'AI: 0', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.lg}px`,
      color: p2Color,
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    // Fade in HP displays
    this.tweens.add({
      targets: [this.p1HPText, vsText, this.p2HPText],
      alpha: 1,
      duration: TIMING.normal,
      delay: TIMING.dramatic + TIMING.normal,
      ease: 'Power2',
    });

    // Count-up animation for HP values
    this.time.delayedCall(TIMING.dramatic + TIMING.slow, () => {
      this.countUpHP();
    });
  }

  private countUpHP(): void {
    // Count up player 1 HP
    this.tweens.add({
      targets: this,
      displayedP1HP: this.player1HP,
      duration: 800,
      ease: 'Power2',
      onUpdate: () => {
        this.p1HPText.setText(`YOU: ${Math.round(this.displayedP1HP)}`);
      },
    });

    // Count up player 2 HP
    this.tweens.add({
      targets: this,
      displayedP2HP: this.player2HP,
      duration: 800,
      ease: 'Power2',
      onUpdate: () => {
        this.p2HPText.setText(`AI: ${Math.round(this.displayedP2HP)}`);
      },
    });
  }

  private createButtons(): void {
    const buttonY = this.screenHeight - 120;
    const buttonSpacing = 180;

    // Delay button appearance for dramatic effect
    this.time.delayedCall(TIMING.dramatic * 2, () => {
      // Play Again button (goes to Draft)
      const playAgainButton = new Button(this, {
        x: this.centerX - buttonSpacing / 2,
        y: buttonY,
        width: 150,
        height: 50,
        text: 'PLAY AGAIN',
        onClick: () => this.transitionTo(SceneKeys.DRAFT),
      });
      this.buttons.push(playAgainButton);

      // Main Menu button
      const menuButton = new Button(this, {
        x: this.centerX + buttonSpacing / 2,
        y: buttonY,
        width: 150,
        height: 50,
        text: 'MAIN MENU',
        onClick: () => this.transitionTo(SceneKeys.MENU),
      });
      this.buttons.push(menuButton);
    });
  }

  /**
   * Initialize post-processing effects pipeline
   */
  private initializePostFX(): void {
    try {
      // Apply the custom post-processing pipeline to the main camera
      this.cameras.main.setPostPipeline(PostFXPipeline);

      // Get reference to the pipeline for dynamic control
      const pipelines = this.cameras.main.getPostPipeline(PostFXPipeline);
      if (Array.isArray(pipelines)) {
        this.postFX = pipelines[0] as PostFXPipeline;
      } else {
        this.postFX = pipelines as PostFXPipeline;
      }
    } catch (error) {
      console.warn('PostFX Pipeline not available (WebGL required):', error);
    }
  }

  shutdown(): void {
    this.buttons.forEach((btn) => btn.destroy());
    this.buttons = [];
  }
}
