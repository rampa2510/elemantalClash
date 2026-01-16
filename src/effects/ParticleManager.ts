import Phaser from 'phaser';
import { TextureAtlas } from '../core/TextureAtlas';
import { ParticleLOD, PerformanceTier } from './ParticleLOD';
import { GraphicsPool, delayedRelease } from '../core/ObjectPool';

/**
 * Element-specific particle configuration
 */
interface ElementParticleConfig {
  colors: number[];
  gravity: number;
  lifespan: number;
  blendMode: Phaser.BlendModes;
  scale: { start: number; end: number };
  speed: { min: number; max: number };
  quantity: number;
  alpha: { start: number; end: number };
  angle: { min: number; max: number };
  rotate: { min: number; max: number };
}

/**
 * AAA Particle Manager (Optimized)
 *
 * Creates dramatic, element-specific particle effects with:
 * - LOD-based particle scaling for performance
 * - Object pooling for Graphics objects
 * - TextureAtlas integration (no duplicate texture generation)
 */
export class ParticleManager {
  private scene: Phaser.Scene;
  private lod: ParticleLOD;
  private graphicsPool: GraphicsPool;

  // Element-specific configurations (10x more dramatic than basic)
  private elementConfigs: Record<string, ElementParticleConfig> = {
    fire: {
      colors: [0xff6b35, 0xff8c42, 0xffd93d, 0xffffff],
      gravity: -200,
      lifespan: 800,
      blendMode: Phaser.BlendModes.ADD,
      scale: { start: 1.5, end: 0 },
      speed: { min: 150, max: 300 },
      quantity: 40,
      alpha: { start: 1, end: 0 },
      angle: { min: 0, max: 360 },
      rotate: { min: -180, max: 180 },
    },
    water: {
      colors: [0x4dabf7, 0x74c0fc, 0xa5d8ff, 0xffffff],
      gravity: 100,
      lifespan: 1000,
      blendMode: Phaser.BlendModes.ADD,
      scale: { start: 1.2, end: 0 },
      speed: { min: 80, max: 180 },
      quantity: 35,
      alpha: { start: 0.8, end: 0 },
      angle: { min: 0, max: 360 },
      rotate: { min: -90, max: 90 },
    },
    earth: {
      colors: [0x8b5a2b, 0xa0522d, 0xcd853f, 0xdeb887],
      gravity: 300,
      lifespan: 600,
      blendMode: Phaser.BlendModes.NORMAL,
      scale: { start: 1.8, end: 0.5 },
      speed: { min: 100, max: 250 },
      quantity: 30,
      alpha: { start: 1, end: 0.3 },
      angle: { min: 0, max: 360 },
      rotate: { min: -360, max: 360 },
    },
    air: {
      colors: [0xb8c5d6, 0xdee2e6, 0xf1f3f5, 0xffffff],
      gravity: -50,
      lifespan: 1200,
      blendMode: Phaser.BlendModes.ADD,
      scale: { start: 0.8, end: 0 },
      speed: { min: 60, max: 150 },
      quantity: 50,
      alpha: { start: 0.6, end: 0 },
      angle: { min: 0, max: 360 },
      rotate: { min: -45, max: 45 },
    },
    lightning: {
      colors: [0xffd43b, 0xfff59d, 0x74c0fc, 0xffffff],
      gravity: 0,
      lifespan: 200,
      blendMode: Phaser.BlendModes.ADD,
      scale: { start: 2.0, end: 0 },
      speed: { min: 400, max: 700 },
      quantity: 60,
      alpha: { start: 1, end: 0 },
      angle: { min: 0, max: 360 },
      rotate: { min: -720, max: 720 },
    },
    ice: {
      colors: [0x74c0fc, 0xa5d8ff, 0xe7f5ff, 0xffffff],
      gravity: 50,
      lifespan: 900,
      blendMode: Phaser.BlendModes.ADD,
      scale: { start: 1.0, end: 0.2 },
      speed: { min: 100, max: 200 },
      quantity: 45,
      alpha: { start: 0.9, end: 0 },
      angle: { min: 0, max: 360 },
      rotate: { min: -180, max: 180 },
    },
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.lod = new ParticleLOD(scene);
    this.graphicsPool = new GraphicsPool(scene, 15, 40);
    this.ensureTextures();
  }

  /**
   * Ensure textures exist (use TextureAtlas if available, fallback to local generation)
   */
  private ensureTextures(): void {
    // Check if TextureAtlas has already generated textures
    if (TextureAtlas.isInitialized()) {
      return;
    }

    // Fallback: Generate textures locally if TextureAtlas not initialized
    // This ensures backward compatibility
    if (!this.scene.textures.exists(TextureAtlas.KEYS.PARTICLE_GLOW)) {
      console.warn('[ParticleManager] TextureAtlas not initialized, generating textures locally');
      TextureAtlas.generate(this.scene);
    }
  }

  /**
   * Get the appropriate texture key
   */
  private getTextureKey(type: 'glow' | 'spark' | 'soft' | 'ring'): string {
    const keyMap: Record<string, string> = {
      glow: TextureAtlas.KEYS.PARTICLE_GLOW,
      spark: TextureAtlas.KEYS.PARTICLE_SPARK,
      soft: TextureAtlas.KEYS.PARTICLE_SOFT,
      ring: TextureAtlas.KEYS.PARTICLE_RING,
    };
    return keyMap[type] || TextureAtlas.KEYS.PARTICLE_GLOW;
  }

  /**
   * Create dramatic element explosion (combat impacts)
   * LOD-optimized: scales particle count based on device performance
   * @param x X position
   * @param y Y position
   * @param element Element type
   * @param intensity 0-1 damage intensity
   */
  explodeElement(x: number, y: number, element: string, intensity: number = 1): void {
    const config = this.elementConfigs[element] || this.elementConfigs.fire;

    // Apply LOD scaling to particle count and lifespan
    const baseQuantity = Math.floor(config.quantity * intensity);
    const scaledQuantity = this.lod.scaleParticleCount(baseQuantity);
    const scaledLifespan = this.lod.scaleLifespan(config.lifespan);

    // Main particle burst
    const mainEmitter = this.scene.add.particles(x, y, this.getTextureKey('glow'), {
      speed: { min: config.speed.min * intensity, max: config.speed.max * intensity },
      lifespan: scaledLifespan,
      gravityY: config.gravity,
      scale: { start: config.scale.start * intensity, end: config.scale.end },
      alpha: config.alpha,
      blendMode: config.blendMode,
      tint: config.colors,
      angle: config.angle,
      rotate: config.rotate,
      emitting: false,
    });
    mainEmitter.explode(scaledQuantity);

    // Secondary spark burst - only if LOD allows
    if (this.lod.shouldEnableSecondaryEffects()) {
      const sparkEmitter = this.scene.add.particles(x, y, this.getTextureKey('spark'), {
        speed: { min: config.speed.max * 0.8, max: config.speed.max * 1.5 },
        lifespan: scaledLifespan * 0.6,
        gravityY: config.gravity * 0.5,
        scale: { start: 0.8 * intensity, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        tint: config.colors[config.colors.length - 1],
        angle: config.angle,
        rotate: { min: -720, max: 720 },
        emitting: false,
      });
      sparkEmitter.explode(this.lod.scaleParticleCount(Math.floor(baseQuantity * 0.5)));

      // Cleanup spark emitter
      this.scene.time.delayedCall(scaledLifespan + 100, () => sparkEmitter.destroy());
    }

    // Ring burst - only if LOD allows AND intensity is high enough
    if (intensity > 0.6 && this.lod.shouldEnableRingBurst()) {
      this.createRingBurst(x, y, element, intensity);
    }

    // Screen flash for very high intensity (always enabled, it's cheap)
    if (intensity > 0.8) {
      const flashColor = Phaser.Display.Color.IntegerToRGB(config.colors[0]);
      this.scene.cameras.main.flash(100, flashColor.r, flashColor.g, flashColor.b, true);
    }

    // Cleanup main emitter
    this.scene.time.delayedCall(scaledLifespan + 100, () => mainEmitter.destroy());
  }

  /**
   * Create expanding ring burst effect
   * Uses graphics pool for better performance
   * Public so ImpactOrchestrator can call it directly
   */
  createRingBurst(x: number, y: number, element: string, intensity: number): void {
    const config = this.elementConfigs[element] || this.elementConfigs.fire;
    const ringCount = Math.floor(3 * intensity);

    for (let i = 0; i < ringCount; i++) {
      const ring = this.graphicsPool.acquire();
      if (!ring) continue; // Pool exhausted

      ring.setPosition(x, y);
      ring.clear();
      ring.lineStyle(3, config.colors[i % config.colors.length], 1);
      ring.strokeCircle(0, 0, 5);
      ring.setBlendMode(Phaser.BlendModes.ADD);
      ring.setDepth(50);
      ring.setScale(1);
      ring.setAlpha(1);

      // Expanding ring animation
      this.scene.tweens.add({
        targets: ring,
        scaleX: 8 + i * 2,
        scaleY: 8 + i * 2,
        alpha: 0,
        duration: 400 + i * 100,
        delay: i * 50,
        ease: 'Quad.easeOut',
        onComplete: () => this.graphicsPool.release(ring),
      });
    }
  }

  /**
   * Create ambient floating particles (background atmosphere)
   */
  createAmbientParticles(element: string): Phaser.GameObjects.Particles.ParticleEmitter {
    const config = this.elementConfigs[element] || this.elementConfigs.fire;
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    const emitter = this.scene.add.particles(0, 0, this.getTextureKey('soft'), {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: 4000,
      speedY: { min: -30, max: -60 },
      speedX: { min: -15, max: 15 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.25, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      frequency: 300,
      tint: config.colors[0],
    });

    emitter.setDepth(-1); // Behind game elements

    return emitter;
  }

  /**
   * Create card trail effect (follows card during movement)
   */
  createCardTrail(target: Phaser.GameObjects.Container | Phaser.GameObjects.Sprite, element: string): Phaser.GameObjects.Particles.ParticleEmitter {
    const config = this.elementConfigs[element] || this.elementConfigs.fire;

    const emitter = this.scene.add.particles(0, 0, this.getTextureKey('soft'), {
      follow: target,
      lifespan: 300,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.6, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      frequency: 25,
      tint: config.colors[0],
    });

    return emitter;
  }

  /**
   * Create victory celebration particles
   */
  createVictoryCelebration(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // Golden confetti burst
    const confetti = this.scene.add.particles(width / 2, -50, this.getTextureKey('spark'), {
      x: { min: -width / 3, max: width / 3 },
      speedY: { min: 200, max: 400 },
      speedX: { min: -100, max: 100 },
      lifespan: 3000,
      gravityY: 200,
      scale: { start: 1.5, end: 0.5 },
      alpha: { start: 1, end: 0.5 },
      rotate: { min: -360, max: 360 },
      tint: [0xffd43b, 0xfff59d, 0xff6b35, 0x74c0fc, 0x69db7c],
      blendMode: Phaser.BlendModes.ADD,
      emitting: true,
      frequency: 30,
    });

    // Star bursts at random positions
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 300, () => {
        const x = 100 + Math.random() * (width - 200);
        const y = 100 + Math.random() * (height - 200);
        this.createStarBurst(x, y);
      });
    }

    // Stop confetti after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      confetti.stop();
      this.scene.time.delayedCall(3000, () => confetti.destroy());
    });
  }

  /**
   * Create star burst effect
   */
  private createStarBurst(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, this.getTextureKey('spark'), {
      speed: { min: 150, max: 300 },
      lifespan: 600,
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      tint: [0xffd43b, 0xffffff],
      angle: { min: 0, max: 360 },
      rotate: { min: -180, max: 180 },
      emitting: false,
    });
    emitter.explode(20);

    this.scene.time.delayedCall(700, () => emitter.destroy());
  }

  /**
   * Create defeat effect (desaturated, falling particles)
   */
  createDefeatEffect(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // Slow falling gray particles
    const ash = this.scene.add.particles(width / 2, -20, this.getTextureKey('soft'), {
      x: { min: -width / 2, max: width / 2 },
      speedY: { min: 50, max: 100 },
      speedX: { min: -20, max: 20 },
      lifespan: 4000,
      gravityY: 30,
      scale: { start: 0.8, end: 0.3 },
      alpha: { start: 0.5, end: 0 },
      tint: 0x666666,
      blendMode: Phaser.BlendModes.NORMAL,
      emitting: true,
      frequency: 100,
    });

    // Stop after 2 seconds
    this.scene.time.delayedCall(2000, () => {
      ash.stop();
      this.scene.time.delayedCall(4000, () => ash.destroy());
    });
  }

  /**
   * Create element reveal effect (dramatic reveal when card flips)
   * Uses graphics pool for better performance
   */
  createElementReveal(x: number, y: number, element: string): void {
    const config = this.elementConfigs[element] || this.elementConfigs.fire;

    // Central glow expansion using pooled graphics
    const glow = this.graphicsPool.acquire();
    if (glow) {
      glow.setPosition(x, y);
      glow.clear();
      glow.fillStyle(config.colors[0], 0.5);
      glow.fillCircle(0, 0, 5);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(50);
      glow.setScale(1);
      glow.setAlpha(1);

      this.scene.tweens.add({
        targets: glow,
        scaleX: 15,
        scaleY: 15,
        alpha: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => this.graphicsPool.release(glow),
      });
    }

    // Particle burst
    const emitter = this.scene.add.particles(x, y, this.getTextureKey('glow'), {
      speed: { min: 100, max: 200 },
      lifespan: 500,
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.8, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      tint: config.colors,
      angle: { min: 0, max: 360 },
      emitting: false,
    });
    emitter.explode(25);

    this.scene.time.delayedCall(600, () => emitter.destroy());
  }

  /**
   * Get current LOD tier (for debugging)
   */
  getLODTier(): string {
    return this.lod.currentTier;
  }

  /**
   * Get LOD debug info
   */
  getLODDebugInfo(): object {
    return this.lod.getDebugInfo();
  }

  /**
   * Destroy and cleanup resources
   */
  destroy(): void {
    this.lod.destroy();
    this.graphicsPool.destroy();
    // Textures persist across scenes, so we don't destroy them
  }
}
