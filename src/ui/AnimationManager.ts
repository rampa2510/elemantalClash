import Phaser from 'phaser';
import { COLORS, TIMING } from '../config/constants';

/**
 * Element-specific particle configurations
 */
const ELEMENT_PARTICLES: Record<string, Phaser.Types.GameObjects.Particles.ParticleEmitterConfig> = {
  fire: {
    color: [0xff4400, 0xff8800, 0xffcc00],
    lifespan: 600,
    speed: { min: 50, max: 150 },
    scale: { start: 0.5, end: 0 },
    gravityY: -100,
    blendMode: 'ADD',
    alpha: { start: 1, end: 0 },
  },
  water: {
    color: [0x00bfff, 0x1e90ff, 0x4169e1],
    lifespan: 800,
    speed: { min: 30, max: 100 },
    scale: { start: 0.4, end: 0.1 },
    gravityY: 200,
    blendMode: 'NORMAL',
    alpha: { start: 0.8, end: 0 },
  },
  earth: {
    color: [0x8b4513, 0x654321, 0x228b22],
    lifespan: 500,
    speed: { min: 100, max: 250 },
    scale: { start: 0.6, end: 0.2 },
    gravityY: 400,
    blendMode: 'NORMAL',
    alpha: { start: 1, end: 0 },
  },
  air: {
    color: [0xe0ffff, 0xb0e0e6, 0x87ceeb],
    lifespan: 1200,
    speed: { min: 20, max: 80 },
    scale: { start: 0.3, end: 0.1 },
    gravityY: -20,
    blendMode: 'ADD',
    alpha: { start: 0.6, end: 0 },
  },
  lightning: {
    color: [0xffff00, 0x00ffff, 0xffffff],
    lifespan: 200,
    speed: { min: 200, max: 400 },
    scale: { start: 0.8, end: 0 },
    blendMode: 'ADD',
    alpha: { start: 1, end: 0 },
  },
  ice: {
    color: [0xadd8e6, 0x87ceeb, 0xffffff],
    lifespan: 1000,
    speed: { min: 30, max: 80 },
    scale: { start: 0.4, end: 0.1 },
    gravityY: 50,
    blendMode: 'ADD',
    alpha: { start: 0.9, end: 0 },
  },
};

/**
 * Manages game animations and visual effects
 */
export class AnimationManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Screen shake effect for damage
   */
  shakeScreen(intensity: number = 0.01, duration: number = 200): void {
    this.scene.cameras.main.shake(duration, intensity);
  }

  /**
   * Flash the screen
   */
  flashScreen(duration: number = 200, color: number = 0xffffff): void {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    this.scene.cameras.main.flash(duration, r, g, b);
  }

  /**
   * Card flip animation (scale-based)
   */
  async flipCard(
    container: Phaser.GameObjects.Container,
    onFlip: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      // Phase 1: Scale to zero
      this.scene.tweens.add({
        targets: container,
        scaleX: 0,
        duration: 150,
        ease: 'Quad.easeIn',
        onComplete: () => {
          // Call the flip callback to swap visuals
          onFlip();

          // Phase 2: Scale back
          this.scene.tweens.add({
            targets: container,
            scaleX: 1,
            duration: 150,
            ease: 'Quad.easeOut',
            onComplete: () => resolve(),
          });
        },
      });
    });
  }

  /**
   * Card hover lift effect
   */
  hoverLift(
    target: Phaser.GameObjects.Container,
    lift: number = -15
  ): Phaser.Tweens.Tween {
    return this.scene.tweens.add({
      targets: target,
      y: target.y + lift,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 150,
      ease: 'Quad.easeOut',
    });
  }

  /**
   * Card hover drop (return to original)
   */
  hoverDrop(
    target: Phaser.GameObjects.Container,
    originalY: number
  ): Phaser.Tweens.Tween {
    return this.scene.tweens.add({
      targets: target,
      y: originalY,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Quad.easeOut',
    });
  }

  /**
   * Card selection bounce effect
   */
  selectBounce(target: Phaser.GameObjects.Container): Phaser.Tweens.Tween {
    return this.scene.tweens.add({
      targets: target,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      ease: 'Back.easeOut',
      yoyo: true,
    });
  }

  /**
   * Element-specific particle burst
   */
  createElementBurst(x: number, y: number, element: string, count: number = 30): void {
    const config = ELEMENT_PARTICLES[element.toLowerCase()] || ELEMENT_PARTICLES.fire;

    // Create a simple particle texture if not exists
    if (!this.scene.textures.exists('particle')) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture('particle', 8, 8);
      graphics.destroy();
    }

    const particles = this.scene.add.particles(x, y, 'particle', {
      ...config,
      emitting: false,
    });

    particles.explode(count);

    // Auto-cleanup
    this.scene.time.delayedCall((config.lifespan as number) + 200, () => {
      particles.destroy();
    });
  }

  /**
   * Enhanced dramatic element reveal effect
   * Creates a more impactful burst with element-specific patterns
   */
  createDramaticElementReveal(x: number, y: number, element: string): void {
    const elementLower = element.toLowerCase();

    // Create particle texture if needed
    if (!this.scene.textures.exists('particle')) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture('particle', 8, 8);
      graphics.destroy();
    }

    // Element-specific reveal animations
    switch (elementLower) {
      case 'fire':
        this.createFireReveal(x, y);
        break;
      case 'water':
        this.createWaterReveal(x, y);
        break;
      case 'ice':
        this.createIceReveal(x, y);
        break;
      case 'lightning':
        this.createLightningReveal(x, y);
        break;
      case 'earth':
        this.createEarthReveal(x, y);
        break;
      case 'air':
        this.createAirReveal(x, y);
        break;
      default:
        this.createElementBurst(x, y, element, 40);
    }
  }

  private createFireReveal(x: number, y: number): void {
    // Outward explosion with flames rising
    const flames = this.scene.add.particles(x, y, 'particle', {
      color: [0xff4400, 0xff8800, 0xffcc00],
      lifespan: 800,
      speed: { min: 80, max: 200 },
      scale: { start: 0.8, end: 0 },
      gravityY: -150,
      blendMode: 'ADD',
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    flames.explode(50);

    // Secondary glow ring
    const ring = this.scene.add.graphics();
    ring.lineStyle(6, 0xff6600, 0.8);
    ring.strokeCircle(x, y, 10);
    ring.setDepth(50);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 8,
      scaleY: 8,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    this.scene.time.delayedCall(1000, () => flames.destroy());
  }

  private createWaterReveal(x: number, y: number): void {
    // Ripple rings expanding outward
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 100, () => {
        const ring = this.scene.add.graphics();
        ring.lineStyle(4 - i, 0x4dabf7, 0.8 - i * 0.2);
        ring.strokeCircle(x, y, 5);
        ring.setDepth(50);

        this.scene.tweens.add({
          targets: ring,
          scaleX: 10 + i * 2,
          scaleY: 10 + i * 2,
          alpha: 0,
          duration: 500 + i * 100,
          ease: 'Quad.easeOut',
          onComplete: () => ring.destroy(),
        });
      });
    }

    // Droplets
    const droplets = this.scene.add.particles(x, y, 'particle', {
      color: [0x00bfff, 0x1e90ff, 0x4169e1],
      lifespan: 600,
      speed: { min: 50, max: 120 },
      scale: { start: 0.5, end: 0.1 },
      gravityY: 200,
      alpha: { start: 0.9, end: 0 },
      emitting: false,
    });
    droplets.explode(30);

    this.scene.time.delayedCall(800, () => droplets.destroy());
  }

  private createIceReveal(x: number, y: number): void {
    // Crystallization effect - particles that briefly expand then shrink
    const crystals = this.scene.add.particles(x, y, 'particle', {
      color: [0xadd8e6, 0x87ceeb, 0xffffff],
      lifespan: 800,
      speed: { min: 40, max: 100 },
      scale: { start: 0.2, end: 0.6 },
      blendMode: 'ADD',
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    crystals.explode(40);

    // Frost ring
    const frost = this.scene.add.graphics();
    frost.lineStyle(8, 0xadd8e6, 0.6);
    frost.strokeCircle(x, y, 15);
    frost.setDepth(50);

    this.scene.tweens.add({
      targets: frost,
      scaleX: 5,
      scaleY: 5,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => frost.destroy(),
    });

    this.scene.time.delayedCall(1000, () => crystals.destroy());
  }

  private createLightningReveal(x: number, y: number): void {
    // Flash
    this.scene.cameras.main.flash(100, 255, 255, 200);

    // Electric arcs
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const endX = x + Math.cos(angle) * 80;
      const endY = y + Math.sin(angle) * 80;

      const arc = this.scene.add.graphics();
      arc.lineStyle(3, 0xffff00, 1);

      // Jagged lightning path
      arc.beginPath();
      arc.moveTo(x, y);
      const midX = (x + endX) / 2 + Phaser.Math.Between(-20, 20);
      const midY = (y + endY) / 2 + Phaser.Math.Between(-20, 20);
      arc.lineTo(midX, midY);
      arc.lineTo(endX, endY);
      arc.strokePath();
      arc.setDepth(50);

      this.scene.tweens.add({
        targets: arc,
        alpha: 0,
        duration: 200,
        delay: 50,
        onComplete: () => arc.destroy(),
      });
    }

    // Electric particles
    const sparks = this.scene.add.particles(x, y, 'particle', {
      color: [0xffff00, 0x00ffff, 0xffffff],
      lifespan: 300,
      speed: { min: 150, max: 350 },
      scale: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    sparks.explode(30);

    this.scene.time.delayedCall(500, () => sparks.destroy());
  }

  private createEarthReveal(x: number, y: number): void {
    // Ground shake
    this.scene.cameras.main.shake(200, 0.01);

    // Rock particles bursting upward then falling
    const rocks = this.scene.add.particles(x, y, 'particle', {
      color: [0x8b4513, 0x654321, 0xa0522d],
      lifespan: 800,
      speed: { min: 100, max: 250 },
      scale: { start: 0.8, end: 0.3 },
      gravityY: 400,
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    rocks.explode(35);

    // Dust cloud
    const dust = this.scene.add.graphics();
    dust.fillStyle(0x8b7355, 0.3);
    dust.fillCircle(x, y, 20);
    dust.setDepth(45);

    this.scene.tweens.add({
      targets: dust,
      scaleX: 6,
      scaleY: 4,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => dust.destroy(),
    });

    this.scene.time.delayedCall(1000, () => rocks.destroy());
  }

  private createAirReveal(x: number, y: number): void {
    // Swirl pattern
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const startRadius = 20;
      const endRadius = 80;

      const swirl = this.scene.add.graphics();
      swirl.fillStyle(0xb8c5d6, 0.5);
      swirl.fillCircle(x + Math.cos(angle) * startRadius, y + Math.sin(angle) * startRadius, 4);
      swirl.setDepth(50);

      this.scene.tweens.add({
        targets: swirl,
        x: Math.cos(angle + Math.PI / 2) * endRadius,
        y: Math.sin(angle + Math.PI / 2) * endRadius,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 600,
        ease: 'Quad.easeOut',
        onComplete: () => swirl.destroy(),
      });
    }

    // Wind particles
    const wind = this.scene.add.particles(x, y, 'particle', {
      color: [0xe0ffff, 0xb0e0e6, 0x87ceeb],
      lifespan: 1000,
      speed: { min: 30, max: 80 },
      scale: { start: 0.4, end: 0.1 },
      gravityY: -30,
      blendMode: 'ADD',
      alpha: { start: 0.7, end: 0 },
      angle: { min: 0, max: 360 },
      emitting: false,
    });
    wind.explode(25);

    this.scene.time.delayedCall(1200, () => wind.destroy());
  }

  /**
   * Camera zoom for dramatic reveal
   */
  cameraZoomReveal(zoomLevel: number = 1.05, duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      this.scene.cameras.main.zoomTo(zoomLevel, duration, 'Quad.easeOut');
      this.scene.time.delayedCall(duration + 200, () => {
        this.scene.cameras.main.zoomTo(1, duration, 'Quad.easeIn', true, () => resolve());
      });
    });
  }

  /**
   * Winner highlight glow effect
   */
  createWinnerGlow(container: Phaser.GameObjects.Container): Phaser.Tweens.Tween {
    const glow = this.scene.add.graphics();
    glow.lineStyle(8, 0xffd700, 0.8);
    glow.strokeRoundedRect(-55, -75, 110, 150, 10);
    container.add(glow);

    return this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.8, to: 0.3 },
      duration: 500,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Damage flash on target
   */
  flashDamage(target: Phaser.GameObjects.GameObject): void {
    this.scene.tweens.add({
      targets: target,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 2,
      ease: 'Linear',
    });
  }

  /**
   * Move card to center with lift
   */
  async playCardToCenter(
    card: Phaser.GameObjects.Container,
    centerX: number,
    centerY: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const startY = card.y;

      // First: lift slightly
      this.scene.tweens.add({
        targets: card,
        y: startY - 50,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 100,
        ease: 'Quad.easeOut',
        onComplete: () => {
          // Then: move to center
          this.scene.tweens.add({
            targets: card,
            x: centerX,
            y: centerY,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 350,
            ease: 'Cubic.easeOut',
            onComplete: () => resolve(),
          });
        },
      });
    });
  }

  /**
   * Victory celebration
   */
  async playVictory(): Promise<void> {
    // Screen flash
    this.scene.cameras.main.flash(500, 255, 215, 0);

    // Create confetti particles
    if (!this.scene.textures.exists('confetti')) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xffffff);
      graphics.fillRect(0, 0, 6, 6);
      graphics.generateTexture('confetti', 6, 6);
      graphics.destroy();
    }

    const { width } = this.scene.cameras.main;

    const confetti = this.scene.add.particles(width / 2, -50, 'confetti', {
      color: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff],
      lifespan: 3000,
      speed: { min: 100, max: 300 },
      angle: { min: 80, max: 100 },
      scale: { start: 0.5, end: 0.2 },
      gravityY: 150,
      rotate: { min: 0, max: 360 },
      quantity: 5,
      frequency: 50,
    });

    // Stop after 2 seconds
    await this.delay(2000);
    confetti.stop();

    // Cleanup after particles finish
    await this.delay(3500);
    confetti.destroy();
  }

  /**
   * Defeat effect
   */
  playDefeat(): void {
    this.scene.cameras.main.shake(500, 0.02);
    this.scene.cameras.main.fade(1000, 0, 0, 0);
  }

  /**
   * Helper: delay promise
   */
  delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.scene.time.delayedCall(ms, resolve);
    });
  }

  /**
   * Kill all tweens on a target
   */
  killTweensOf(target: object | object[]): void {
    this.scene.tweens.killTweensOf(target);
  }

  /**
   * Safe tween - kills existing tweens on target first
   */
  safeTween(
    targets: object | object[],
    config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>
  ): Phaser.Tweens.Tween {
    this.scene.tweens.killTweensOf(targets);
    return this.scene.tweens.add({
      targets,
      ...config,
    });
  }

  /**
   * Flash screen red for damage taken
   */
  flashDamageScreen(intensity: number = 0.3): void {
    const { width, height } = this.scene.cameras.main;
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0xff0000, intensity);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(500);

    this.scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => overlay.destroy(),
    });
  }

  /**
   * Staggered animation for multiple targets
   */
  async staggeredTween(
    targets: object[],
    config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>,
    staggerMs: number = 50
  ): Promise<void> {
    const promises = targets.map((target, index) => {
      return new Promise<void>((resolve) => {
        this.scene.time.delayedCall(index * staggerMs, () => {
          this.scene.tweens.add({
            targets: target,
            ...config,
            onComplete: () => resolve(),
          });
        });
      });
    });

    await Promise.all(promises);
  }

  /**
   * Pulse effect for emphasis
   */
  pulse(target: Phaser.GameObjects.Components.Transform, scale: number = 1.1): Phaser.Tweens.Tween {
    return this.scene.tweens.add({
      targets: target,
      scaleX: scale,
      scaleY: scale,
      duration: 150,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.easeOut',
    });
  }

  /**
   * Fade in effect
   */
  fadeIn(target: Phaser.GameObjects.Components.Alpha, duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      target.setAlpha(0);
      this.scene.tweens.add({
        targets: target,
        alpha: 1,
        duration,
        ease: 'Quad.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  /**
   * Fade out effect
   */
  fadeOut(target: Phaser.GameObjects.Components.Alpha, duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: target,
        alpha: 0,
        duration,
        ease: 'Quad.easeIn',
        onComplete: () => resolve(),
      });
    });
  }

  /**
   * Slide in from off-screen
   */
  slideIn(
    target: Phaser.GameObjects.GameObject,
    from: 'left' | 'right' | 'top' | 'bottom',
    duration: number = 400
  ): Promise<void> {
    const { width, height } = this.scene.cameras.main;
    const targetX = (target as Phaser.GameObjects.Container).x;
    const targetY = (target as Phaser.GameObjects.Container).y;

    const offsets = {
      left: { x: -width, y: 0 },
      right: { x: width, y: 0 },
      top: { x: 0, y: -height },
      bottom: { x: 0, y: height },
    };

    const offset = offsets[from];
    (target as Phaser.GameObjects.Container).setPosition(targetX + offset.x, targetY + offset.y);

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: target,
        x: targetX,
        y: targetY,
        duration,
        ease: 'Back.easeOut',
        onComplete: () => resolve(),
      });
    });
  }
}
