import Phaser from 'phaser';
import { COLORS, FONTS, FONT_SIZES, TIMING } from '../../config/constants';

export interface HealthBarConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  maxHealth: number;
  showText?: boolean;
  backgroundColor?: number;
  healthColor?: number;
  damageColor?: number;
  borderColor?: number;
}

/**
 * Enhanced health bar with damage effects
 * - Flash white on damage
 * - Shake animation when hit
 * - Low health pulsing glow
 * - Smooth color transitions
 */
export class HealthBar {
  private scene: Phaser.Scene;
  private config: Required<HealthBarConfig>;

  private container: Phaser.GameObjects.Container;
  private shadowGraphics: Phaser.GameObjects.Graphics;
  private background: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;
  private damagePreview: Phaser.GameObjects.Graphics;
  private flashOverlay: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private healthText: Phaser.GameObjects.Text | null = null;

  private currentHealth: number;
  private displayHealth: number;
  private previewHealth: number | null = null;
  private baseX: number;
  private baseY: number;
  private lowHealthTween: Phaser.Tweens.Tween | null = null;
  private glowAlpha: number = 0;

  // Shimmer effect properties
  private shimmerGraphics: Phaser.GameObjects.Graphics;
  private shimmerX: number = 0;
  private shimmerTween: Phaser.Tweens.Tween | null = null;
  private lastShimmerUpdate: number = 0;
  private static readonly SHIMMER_UPDATE_INTERVAL = 33; // ~30fps

  constructor(scene: Phaser.Scene, config: HealthBarConfig) {
    this.scene = scene;
    this.baseX = config.x;
    this.baseY = config.y;
    this.config = {
      showText: true,
      backgroundColor: 0x333333,
      healthColor: COLORS.healthBar,
      damageColor: COLORS.healthBarLow,
      borderColor: 0x666666,
      ...config,
    };

    this.currentHealth = config.maxHealth;
    this.displayHealth = config.maxHealth;

    this.container = this.scene.add.container(config.x, config.y);
    this.shadowGraphics = this.scene.add.graphics();
    this.glowGraphics = this.scene.add.graphics();
    this.background = this.scene.add.graphics();
    this.damagePreview = this.scene.add.graphics();
    this.healthBar = this.scene.add.graphics();
    this.shimmerGraphics = this.scene.add.graphics();
    this.flashOverlay = this.scene.add.graphics();

    this.createComponents();
    this.startShimmerAnimation();
  }

  private createComponents(): void {
    const { width, height } = this.config;

    // Shadow for depth
    this.shadowGraphics.fillStyle(0x000000, 0.2);
    this.shadowGraphics.fillRoundedRect(2, 3, width, height, 4);

    // Background
    this.background.fillStyle(this.config.backgroundColor);
    this.background.fillRoundedRect(0, 0, width, height, 4);
    this.background.lineStyle(2, this.config.borderColor);
    this.background.strokeRoundedRect(0, 0, width, height, 4);

    // Text
    if (this.config.showText) {
      this.healthText = this.scene.add
        .text(width / 2, height / 2, `${this.currentHealth}/${this.config.maxHealth}`, {
          fontSize: `${FONT_SIZES.xs}px`,
          fontFamily: FONTS.family,
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
    }

    this.container.add([
      this.shadowGraphics,
      this.glowGraphics,
      this.background,
      this.damagePreview,
      this.healthBar,
      this.shimmerGraphics,
      this.flashOverlay,
      ...(this.healthText ? [this.healthText] : []),
    ]);

    this.draw();
  }

  private draw(): void {
    const { width, height } = this.config;
    const padding = 3;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;

    // Clear graphics
    this.healthBar.clear();
    this.damagePreview.clear();
    this.glowGraphics.clear();

    // Calculate percentages
    const healthPercent = Math.max(0, this.displayHealth / this.config.maxHealth);
    const previewPercent =
      this.previewHealth !== null
        ? Math.max(0, this.previewHealth / this.config.maxHealth)
        : healthPercent;

    // Draw damage preview (if active)
    if (this.previewHealth !== null && this.previewHealth < this.displayHealth) {
      this.damagePreview.fillStyle(this.config.damageColor, 0.5);
      this.damagePreview.fillRoundedRect(padding, padding, innerWidth * healthPercent, innerHeight, 2);
    }

    // Determine health bar color (smooth transition)
    const color = this.getHealthColor(healthPercent);

    // Draw health bar
    this.healthBar.fillStyle(color);
    this.healthBar.fillRoundedRect(padding, padding, innerWidth * healthPercent, innerHeight, 2);

    // Low health glow effect
    if (healthPercent <= 0.25 && healthPercent > 0) {
      this.drawLowHealthGlow();
    }

    // Update text
    if (this.healthText) {
      this.healthText.setText(`${Math.round(this.displayHealth)}/${this.config.maxHealth}`);
    }
  }

  private drawLowHealthGlow(): void {
    const { width, height } = this.config;

    // Pulsing red glow around the bar
    this.glowGraphics.lineStyle(4, COLORS.healthBarLow, this.glowAlpha * 0.6);
    this.glowGraphics.strokeRoundedRect(-2, -2, width + 4, height + 4, 6);
  }

  private getHealthColor(percent: number): number {
    // Smooth color interpolation
    if (percent > 0.5) {
      // Green to Yellow (50-100%)
      const t = (percent - 0.5) * 2;
      return this.interpolateColor(COLORS.healthBarMid, COLORS.healthBar, t);
    } else if (percent > 0.25) {
      // Yellow to Red (25-50%)
      const t = (percent - 0.25) * 4;
      return this.interpolateColor(COLORS.healthBarLow, COLORS.healthBarMid, t);
    }
    return COLORS.healthBarLow;
  }

  private interpolateColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  private flashDamage(): void {
    const { width, height } = this.config;

    // Flash white overlay
    this.flashOverlay.clear();
    this.flashOverlay.fillStyle(0xffffff, 0.7);
    this.flashOverlay.fillRoundedRect(0, 0, width, height, 4);

    // Fade out
    this.scene.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: TIMING.fast,
      ease: 'Power2',
      onComplete: () => {
        this.flashOverlay.clear();
        this.flashOverlay.setAlpha(1);
      },
    });
  }

  private shakeBar(): void {
    const intensity = 3;
    const duration = 50;

    this.scene.tweens.add({
      targets: this.container,
      x: this.baseX + intensity,
      duration: duration,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.container.x = this.baseX;
      },
    });
  }

  private startLowHealthPulse(): void {
    if (this.lowHealthTween) return;

    this.lowHealthTween = this.scene.tweens.add({
      targets: this,
      glowAlpha: 1,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.draw(),
    });
  }

  private stopLowHealthPulse(): void {
    if (this.lowHealthTween) {
      this.lowHealthTween.stop();
      this.lowHealthTween = null;
      this.glowAlpha = 0;
    }
  }

  /**
   * Start the shimmer highlight animation
   * Creates a crawling white highlight band across the health bar
   */
  private startShimmerAnimation(): void {
    if (this.shimmerTween) return;

    const { width } = this.config;

    // Reset shimmer position
    this.shimmerX = -30;

    // Create continuous shimmer animation
    this.shimmerTween = this.scene.tweens.add({
      targets: this,
      shimmerX: width + 30,
      duration: 2500,
      ease: 'Linear',
      repeat: -1,
      delay: 500,
      onUpdate: () => {
        // Throttle shimmer drawing to 30fps for performance
        const now = performance.now();
        if (now - this.lastShimmerUpdate >= HealthBar.SHIMMER_UPDATE_INTERVAL) {
          this.drawShimmer();
          this.lastShimmerUpdate = now;
        }
      },
      onRepeat: () => {
        this.shimmerX = -30;
      },
    });
  }

  /**
   * Draw the shimmer highlight effect
   */
  private drawShimmer(): void {
    const { width, height } = this.config;
    const padding = 3;
    const innerHeight = height - padding * 2;
    const healthPercent = Math.max(0, this.displayHealth / this.config.maxHealth);

    this.shimmerGraphics.clear();

    // Only draw shimmer if there's health to show
    if (healthPercent <= 0) return;

    // Calculate shimmer bounds (within the health bar fill area)
    const healthWidth = (width - padding * 2) * healthPercent;
    const shimmerWidth = 20;

    // Only draw if shimmer is within the health bar
    if (this.shimmerX < padding || this.shimmerX > padding + healthWidth) return;

    // Create shimmer gradient band
    const shimmerCenterX = this.shimmerX;

    // Create a mask-like effect by drawing multiple vertical lines with varying alpha
    for (let i = 0; i < shimmerWidth; i++) {
      const lineX = shimmerCenterX - shimmerWidth / 2 + i;

      // Skip if outside health bar bounds
      if (lineX < padding || lineX > padding + healthWidth - 1) continue;

      // Calculate alpha based on position in shimmer band (bell curve)
      const normalizedPos = i / shimmerWidth;
      const alpha = Math.sin(normalizedPos * Math.PI) * 0.25;

      this.shimmerGraphics.fillStyle(0xffffff, alpha);
      this.shimmerGraphics.fillRect(lineX, padding, 1, innerHeight);
    }
  }

  /**
   * Stop shimmer animation
   */
  private stopShimmerAnimation(): void {
    if (this.shimmerTween) {
      this.shimmerTween.stop();
      this.shimmerTween = null;
    }
    this.shimmerGraphics.clear();
  }

  // Public API

  setHealth(value: number, animated: boolean = true): void {
    const clampedValue = Phaser.Math.Clamp(value, 0, this.config.maxHealth);
    const previousHealth = this.currentHealth;
    this.currentHealth = clampedValue;
    this.previewHealth = null;

    // Check for damage
    const tookDamage = clampedValue < previousHealth;

    // Handle low health pulse
    const healthPercent = clampedValue / this.config.maxHealth;
    if (healthPercent <= 0.25 && healthPercent > 0) {
      this.startLowHealthPulse();
    } else {
      this.stopLowHealthPulse();
    }

    if (animated && previousHealth !== clampedValue) {
      // Flash and shake on damage
      if (tookDamage) {
        this.flashDamage();
        this.shakeBar();
      }

      this.scene.tweens.add({
        targets: this,
        displayHealth: clampedValue,
        duration: TIMING.dramatic,
        ease: 'Quad.easeOut',
        onUpdate: () => this.draw(),
      });
    } else {
      this.displayHealth = clampedValue;
      this.draw();
    }
  }

  previewDamage(damage: number): void {
    this.previewHealth = Math.max(0, this.currentHealth - damage);
    this.draw();
  }

  clearPreview(): void {
    this.previewHealth = null;
    this.draw();
  }

  get health(): number {
    return this.currentHealth;
  }

  setPosition(x: number, y: number): void {
    this.baseX = x;
    this.baseY = y;
    this.container.setPosition(x, y);
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  destroy(): void {
    this.stopLowHealthPulse();
    this.stopShimmerAnimation();
    this.container.destroy();
  }
}
