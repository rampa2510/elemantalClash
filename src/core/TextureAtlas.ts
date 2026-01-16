import Phaser from 'phaser';

/**
 * Centralized Texture Atlas
 *
 * Generates ALL particle textures ONCE during PreloadScene.
 * Eliminates duplicate texture generation across effect managers.
 */
export class TextureAtlas {
  private static initialized = false;

  /**
   * Texture keys for consistent reference
   */
  static readonly KEYS = {
    // Particles
    PARTICLE_GLOW: 'tex_particle_glow',
    PARTICLE_SPARK: 'tex_particle_spark',
    PARTICLE_SOFT: 'tex_particle_soft',
    PARTICLE_RING: 'tex_particle_ring',
    BG_PARTICLE: 'tex_bg_particle',
    CONFETTI: 'tex_confetti',
    // UI
    SHIMMER: 'tex_shimmer',
    DOT: 'tex_dot',
  };

  /**
   * Generate all textures - call once in PreloadScene
   */
  static generate(scene: Phaser.Scene): void {
    if (this.initialized) {
      console.log('[TextureAtlas] Already initialized, skipping');
      return;
    }

    console.log('[TextureAtlas] Generating particle textures...');

    this.generateParticleGlow(scene);
    this.generateParticleSpark(scene);
    this.generateParticleSoft(scene);
    this.generateParticleRing(scene);
    this.generateBgParticle(scene);
    this.generateConfetti(scene);
    this.generateShimmer(scene);
    this.generateDot(scene);

    this.initialized = true;
    console.log('[TextureAtlas] All textures generated successfully');
  }

  /**
   * Check if textures have been generated
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Particle Glow (32x32) - Soft radial gradient
   */
  private static generateParticleGlow(scene: Phaser.Scene): void {
    if (scene.textures.exists(this.KEYS.PARTICLE_GLOW)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0 });
    const size = 32;
    const center = size / 2;

    // Multi-layer soft glow
    graphics.fillStyle(0xffffff, 0.1);
    graphics.fillCircle(center, center, 16);

    graphics.fillStyle(0xffffff, 0.2);
    graphics.fillCircle(center, center, 12);

    graphics.fillStyle(0xffffff, 0.4);
    graphics.fillCircle(center, center, 8);

    graphics.fillStyle(0xffffff, 0.7);
    graphics.fillCircle(center, center, 5);

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(center, center, 2);

    graphics.generateTexture(this.KEYS.PARTICLE_GLOW, size, size);
    graphics.destroy();
  }

  /**
   * Particle Spark (16x16) - 4-pointed star
   */
  private static generateParticleSpark(scene: Phaser.Scene): void {
    if (scene.textures.exists(this.KEYS.PARTICLE_SPARK)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0 });
    const size = 16;
    const center = size / 2;

    graphics.fillStyle(0xffffff, 1);
    graphics.beginPath();

    // 4-pointed star
    graphics.moveTo(center, 0); // Top
    graphics.lineTo(center + 2, center - 2);
    graphics.lineTo(size, center); // Right
    graphics.lineTo(center + 2, center + 2);
    graphics.lineTo(center, size); // Bottom
    graphics.lineTo(center - 2, center + 2);
    graphics.lineTo(0, center); // Left
    graphics.lineTo(center - 2, center - 2);
    graphics.closePath();
    graphics.fill();

    graphics.generateTexture(this.KEYS.PARTICLE_SPARK, size, size);
    graphics.destroy();
  }

  /**
   * Particle Soft (16x16) - Simple soft circle
   */
  private static generateParticleSoft(scene: Phaser.Scene): void {
    if (scene.textures.exists(this.KEYS.PARTICLE_SOFT)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0 });
    const size = 16;
    const center = size / 2;

    graphics.fillStyle(0xffffff, 0.3);
    graphics.fillCircle(center, center, 8);

    graphics.fillStyle(0xffffff, 0.6);
    graphics.fillCircle(center, center, 5);

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(center, center, 2);

    graphics.generateTexture(this.KEYS.PARTICLE_SOFT, size, size);
    graphics.destroy();
  }

  /**
   * Particle Ring (24x24) - Hollow ring for shockwaves
   */
  private static generateParticleRing(scene: Phaser.Scene): void {
    if (scene.textures.exists(this.KEYS.PARTICLE_RING)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0 });
    const size = 24;
    const center = size / 2;

    graphics.lineStyle(3, 0xffffff, 1);
    graphics.strokeCircle(center, center, 10);

    graphics.generateTexture(this.KEYS.PARTICLE_RING, size, size);
    graphics.destroy();
  }

  /**
   * Background Particle (8x8) - Small ambient dot
   */
  private static generateBgParticle(scene: Phaser.Scene): void {
    if (scene.textures.exists(this.KEYS.BG_PARTICLE)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0 });
    const size = 8;
    const center = size / 2;

    graphics.fillStyle(0xffffff, 0.5);
    graphics.fillCircle(center, center, 4);

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(center, center, 2);

    graphics.generateTexture(this.KEYS.BG_PARTICLE, size, size);
    graphics.destroy();
  }

  /**
   * Confetti (8x8) - Small square for celebrations
   */
  private static generateConfetti(scene: Phaser.Scene): void {
    if (scene.textures.exists(this.KEYS.CONFETTI)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 8, 8);

    graphics.generateTexture(this.KEYS.CONFETTI, 8, 8);
    graphics.destroy();
  }

  /**
   * Shimmer (30x20) - Diagonal highlight band for health bars
   */
  private static generateShimmer(scene: Phaser.Scene): void {
    if (scene.textures.exists(this.KEYS.SHIMMER)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0 });

    // Gradient band effect
    for (let i = 0; i < 30; i++) {
      const alpha = i < 15 ? i / 15 : (30 - i) / 15;
      graphics.fillStyle(0xffffff, alpha * 0.3);
      graphics.fillRect(i, 0, 1, 20);
    }

    graphics.generateTexture(this.KEYS.SHIMMER, 30, 20);
    graphics.destroy();
  }

  /**
   * Dot (8x8) - Simple dot for UI indicators
   */
  private static generateDot(scene: Phaser.Scene): void {
    if (scene.textures.exists(this.KEYS.DOT)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);

    graphics.generateTexture(this.KEYS.DOT, 8, 8);
    graphics.destroy();
  }

  /**
   * Check if a specific texture exists
   */
  static hasTexture(scene: Phaser.Scene, key: string): boolean {
    return scene.textures.exists(key);
  }

  /**
   * Get all texture keys
   */
  static getAllKeys(): string[] {
    return Object.values(this.KEYS);
  }
}
