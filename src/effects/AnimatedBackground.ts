import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/constants';

/**
 * Animated Background Manager
 *
 * Creates atmospheric, animated backgrounds:
 * - Animated gradient blobs (Stripe-inspired mesh gradients)
 * - Floating ambient particles
 * - Depth parallax layers
 * - Element-specific color themes
 */
export class AnimatedBackground {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private time: number = 0;
  private blobs: Blob[] = [];
  private ambientParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private gridLines: Phaser.GameObjects.Graphics | null = null;

  // Element color themes
  private elementThemes: Record<string, { primary: number; secondary: number; accent: number }> = {
    fire: { primary: 0xff6b35, secondary: 0xff8c42, accent: 0xffd93d },
    water: { primary: 0x4dabf7, secondary: 0x74c0fc, accent: 0xa5d8ff },
    earth: { primary: 0x8b5a2b, secondary: 0xa0522d, accent: 0xcd853f },
    air: { primary: 0xb8c5d6, secondary: 0xdee2e6, accent: 0xf1f3f5 },
    lightning: { primary: 0xffd43b, secondary: 0xfff59d, accent: 0xffffff },
    ice: { primary: 0x74c0fc, secondary: 0xa5d8ff, accent: 0xe7f5ff },
    neutral: { primary: 0x5a5a7a, secondary: 0x4a4a6a, accent: 0x6a6a9a },
    // Critical HP theme - urgent, dangerous red
    critical: { primary: 0xff0000, secondary: 0x8b0000, accent: 0xff4444 },
  };

  private currentTheme: string = 'neutral';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(-10); // Behind everything

    this.initializeBlobs();
    this.createGridOverlay();
  }

  /**
   * Initialize animated gradient blobs
   */
  private initializeBlobs(): void {
    const theme = this.elementThemes[this.currentTheme];

    // Create 4 floating gradient blobs
    this.blobs = [
      {
        x: GAME_WIDTH * 0.3,
        y: GAME_HEIGHT * 0.3,
        radius: 250,
        color: theme.primary,
        speedX: 0.3,
        speedY: 0.2,
        phase: 0,
      },
      {
        x: GAME_WIDTH * 0.7,
        y: GAME_HEIGHT * 0.6,
        radius: 200,
        color: theme.secondary,
        speedX: -0.25,
        speedY: 0.15,
        phase: Math.PI / 2,
      },
      {
        x: GAME_WIDTH * 0.5,
        y: GAME_HEIGHT * 0.8,
        radius: 180,
        color: theme.accent,
        speedX: 0.2,
        speedY: -0.3,
        phase: Math.PI,
      },
      {
        x: GAME_WIDTH * 0.2,
        y: GAME_HEIGHT * 0.7,
        radius: 150,
        color: theme.primary,
        speedX: -0.15,
        speedY: 0.25,
        phase: Math.PI * 1.5,
      },
    ];
  }

  /**
   * Create subtle grid overlay for depth
   */
  private createGridOverlay(): void {
    this.gridLines = this.scene.add.graphics();
    this.gridLines.setDepth(-9);
    this.gridLines.setAlpha(0.03);

    // Horizontal lines
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      this.gridLines.lineStyle(1, 0xffffff, 0.5);
      this.gridLines.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Vertical lines
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      this.gridLines.lineStyle(1, 0xffffff, 0.5);
      this.gridLines.lineBetween(x, 0, x, GAME_HEIGHT);
    }
  }

  /**
   * Create ambient floating particles
   */
  createAmbientParticles(): void {
    // Generate particle texture if not exists
    if (!this.scene.textures.exists('bg_particle')) {
      const particleGraphics = this.scene.make.graphics({ x: 0, y: 0 });
      particleGraphics.fillStyle(0xffffff, 0.8);
      particleGraphics.fillCircle(4, 4, 3);
      particleGraphics.generateTexture('bg_particle', 8, 8);
      particleGraphics.destroy();
    }

    const theme = this.elementThemes[this.currentTheme];

    this.ambientParticles = this.scene.add.particles(0, 0, 'bg_particle', {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: 0, max: GAME_HEIGHT },
      lifespan: 6000,
      speedY: { min: -15, max: -30 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.15, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      frequency: 400,
      tint: theme.accent,
    });

    this.ambientParticles.setDepth(-8);
  }

  /**
   * Update animated background (call in scene update)
   */
  update(delta: number): void {
    this.time += delta * 0.001; // Convert to seconds

    this.graphics.clear();

    // Draw base gradient
    this.drawBaseGradient();

    // Update and draw animated blobs
    this.updateBlobs(delta);
  }

  /**
   * Draw base dark gradient background
   */
  private drawBaseGradient(): void {
    // Vertical gradient from dark to slightly darker
    const topColor = COLORS.background;  // 0x1a1a2e
    const bottomColor = 0x12121e;  // Slightly brighter than before for better blob visibility

    // Create gradient with horizontal bars (simulated gradient)
    const steps = 20;
    const stepHeight = GAME_HEIGHT / steps;

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(topColor),
        Phaser.Display.Color.ValueToColor(bottomColor),
        1,
        t
      );
      const hexColor = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

      this.graphics.fillStyle(hexColor, 1);
      this.graphics.fillRect(0, i * stepHeight, GAME_WIDTH, stepHeight + 1);
    }
  }

  /**
   * Update blob positions and draw them
   * Uses multi-frequency motion (3 sine waves) for organic movement
   */
  private updateBlobs(delta: number): void {
    for (const blob of this.blobs) {
      // Animate phase
      blob.phase += delta * 0.0005;

      // Multi-frequency motion: combine 3 sine waves for organic, unpredictable movement
      // Primary wave: slow, large movement
      const primaryX = Math.sin(blob.phase * blob.speedX) * 100;
      const primaryY = Math.cos(blob.phase * blob.speedY) * 80;

      // Secondary wave: medium speed, medium amplitude (1.7x frequency, 0.4x amplitude)
      const secondaryX = Math.sin(blob.phase * blob.speedX * 1.7 + blob.phase) * 40;
      const secondaryY = Math.cos(blob.phase * blob.speedY * 1.7 + blob.phase * 0.5) * 32;

      // Tertiary wave: fast, small ripples (3.1x frequency, 0.15x amplitude)
      const tertiaryX = Math.sin(blob.phase * blob.speedX * 3.1 + blob.phase * 2) * 15;
      const tertiaryY = Math.cos(blob.phase * blob.speedY * 3.1 + blob.phase * 1.5) * 12;

      // Combine all waves
      const baseX = blob.x + primaryX + secondaryX + tertiaryX;
      const baseY = blob.y + primaryY + secondaryY + tertiaryY;

      // Multi-frequency radius pulse for breathing effect
      const primaryPulse = Math.sin(this.time * 2 + blob.phase) * 20;
      const secondaryPulse = Math.sin(this.time * 3.5 + blob.phase * 1.3) * 8;
      const pulsedRadius = blob.radius + primaryPulse + secondaryPulse;

      // Draw blob with soft edge (multiple layers)
      this.drawSoftBlob(baseX, baseY, pulsedRadius, blob.color);
    }
  }

  /**
   * Draw a soft-edged gradient blob
   */
  private drawSoftBlob(x: number, y: number, radius: number, color: number): void {
    // Draw multiple layers with decreasing alpha for soft edge
    const layers = 8;

    for (let i = layers; i > 0; i--) {
      const layerRadius = radius * (i / layers);
      // Much higher alpha for visibility: outer layers fade out, inner layers more opaque
      const alpha = 0.15 * (1 - (i - 1) / layers);

      this.graphics.fillStyle(color, alpha);
      this.graphics.fillCircle(x, y, layerRadius);
    }
  }

  /**
   * Set the color theme based on dominant element
   */
  setTheme(element: string): void {
    if (this.currentTheme === element) return;

    this.currentTheme = element;
    const theme = this.elementThemes[element] || this.elementThemes.neutral;

    // Update blob colors with smooth transition
    this.blobs.forEach((blob, index) => {
      const colors = [theme.primary, theme.secondary, theme.accent, theme.primary];
      const targetColor = colors[index % colors.length];

      // Tween blob color (using simple interpolation since Graphics doesn't support tint tweens directly)
      const startColor = Phaser.Display.Color.ValueToColor(blob.color);
      const endColor = Phaser.Display.Color.ValueToColor(targetColor);

      this.scene.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 1000,
        ease: 'Power2',
        onUpdate: (tween) => {
          const t = (tween.getValue() ?? 0) / 100;
          const interpolated = Phaser.Display.Color.Interpolate.ColorWithColor(
            startColor,
            endColor,
            100,
            t * 100
          );
          blob.color = Phaser.Display.Color.GetColor(interpolated.r, interpolated.g, interpolated.b);
        },
      });
    });

    // Update ambient particles color
    if (this.ambientParticles) {
      this.ambientParticles.setParticleTint(theme.accent);
    }
  }

  /**
   * Flash the background with a color (for impacts)
   */
  flash(color: number, duration: number = 100): void {
    const flashGraphics = this.scene.add.graphics();
    flashGraphics.setDepth(-5);
    flashGraphics.fillStyle(color, 0.3);
    flashGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.scene.tweens.add({
      targets: flashGraphics,
      alpha: 0,
      duration: duration,
      ease: 'Power2',
      onComplete: () => flashGraphics.destroy(),
    });
  }

  /**
   * Pulse the background intensity (for rhythm/beats)
   */
  pulse(intensity: number = 0.5): void {
    const originalBlobs = this.blobs.map(b => b.radius);

    // Expand blobs briefly
    this.blobs.forEach((blob, index) => {
      blob.radius = originalBlobs[index] * (1 + intensity * 0.2);
    });

    // Return to normal
    this.scene.time.delayedCall(100, () => {
      this.blobs.forEach((blob, index) => {
        this.scene.tweens.add({
          targets: blob,
          radius: originalBlobs[index],
          duration: 200,
          ease: 'Power2',
        });
      });
    });
  }

  /**
   * Create dividing line with glow effect
   */
  createDividingLine(): void {
    const lineY = GAME_HEIGHT / 2;
    const lineGraphics = this.scene.add.graphics();
    lineGraphics.setDepth(-1);

    // Soft glow layers
    for (let i = 3; i > 0; i--) {
      lineGraphics.lineStyle(i * 4, 0x4a4a6a, 0.1 / i);
      lineGraphics.lineBetween(0, lineY, GAME_WIDTH, lineY);
    }

    // Main line
    lineGraphics.lineStyle(2, 0x4a4a6a, 0.3);
    lineGraphics.lineBetween(0, lineY, GAME_WIDTH, lineY);

    // Animated pulse effect on the line
    const linePulse = this.scene.add.graphics();
    linePulse.setDepth(-1);

    this.scene.tweens.add({
      targets: { x: 0 },
      x: GAME_WIDTH,
      duration: 3000,
      repeat: -1,
      onUpdate: (_tween, target) => {
        linePulse.clear();
        const pulseX = target.x;

        // Draw traveling pulse with fading edges
        for (let i = 0; i < 5; i++) {
          const alpha = 0.3 * (1 - i / 5);
          linePulse.lineStyle(3 - i * 0.5, 0x6a6a8a, alpha);
          linePulse.lineBetween(pulseX - 50 + i * 10, lineY, pulseX + 50 - i * 10, lineY);
        }
      },
    });
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.graphics.destroy();
    if (this.gridLines) this.gridLines.destroy();
    if (this.ambientParticles) this.ambientParticles.destroy();
  }
}

/**
 * Blob data structure
 */
interface Blob {
  x: number;
  y: number;
  radius: number;
  color: number;
  speedX: number;
  speedY: number;
  phase: number;
}
