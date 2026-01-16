import Phaser from 'phaser';
import { HitstopManager } from './HitstopManager';
import { CameraFX } from './CameraFX';
import { ParticleManager } from './ParticleManager';
import { AnimatedBackground } from './AnimatedBackground';
import { PostFXPipeline } from '../shaders/PostFXPipeline';

/**
 * Impact Orchestrator - AAA-Quality 7-Layer Impact System
 *
 * Coordinates all visual feedback layers for devastating impacts.
 * The key to "game feel" is layering multiple effects simultaneously:
 *
 * Layer 1: Hitstop (50-120ms pause)
 * Layer 2: Screen Flash (element-colored, 50ms)
 * Layer 3: Camera Punch (zoom toward impact)
 * Layer 4: Screen Shake (directional)
 * Layer 5: Particle Explosion (element-specific)
 * Layer 6: Ring Burst (shockwave)
 * Layer 7: PostFX Spike (bloom + chromatic aberration)
 *
 * All layers fire SIMULTANEOUSLY for maximum impact.
 */
export class ImpactOrchestrator {
  private scene: Phaser.Scene;
  private hitstop: HitstopManager;
  private cameraFX: CameraFX;
  private particles: ParticleManager;
  private background: AnimatedBackground | null = null;

  // Element flash colors (RGB tuples)
  private elementFlashColors: Record<string, [number, number, number]> = {
    fire: [255, 107, 53],
    water: [77, 171, 247],
    earth: [139, 90, 43],
    air: [184, 197, 214],
    lightning: [255, 212, 59],
    ice: [116, 192, 252],
    neutral: [200, 200, 200],
  };

  constructor(
    scene: Phaser.Scene,
    hitstop: HitstopManager,
    cameraFX: CameraFX,
    particles: ParticleManager,
    background?: AnimatedBackground
  ) {
    this.scene = scene;
    this.hitstop = hitstop;
    this.cameraFX = cameraFX;
    this.particles = particles;
    this.background = background || null;
  }

  /**
   * Set the background reference (can be set after construction)
   */
  setBackground(background: AnimatedBackground): void {
    this.background = background;
  }

  /**
   * AAA-quality impact sequence - fires 7 layers simultaneously
   *
   * @param x Impact X position
   * @param y Impact Y position
   * @param element Element type for color theming
   * @param damage Damage dealt (scales intensity)
   */
  triggerImpact(x: number, y: number, element: string, damage: number): void {
    const intensity = Math.min(damage / 10, 1); // 0-1 scale based on damage

    // === LAYER 1: HITSTOP (THE MOST IMPORTANT) ===
    // Brief freeze makes hits feel POWERFUL
    const freezeDuration = this.hitstop.getFreezeForDamage(damage);
    this.hitstop.freeze(freezeDuration, true);

    // === LAYER 2: SCREEN FLASH ===
    // Element-colored flash for 50ms
    const flashColor = this.getElementFlashColor(element);
    this.scene.cameras.main.flash(50, flashColor[0], flashColor[1], flashColor[2]);

    // === LAYER 3: CAMERA PUNCH (toward impact point) ===
    // Creates a "pulled into the action" feeling
    this.cameraFX.punchToward(x, y, intensity * 0.8, 200);

    // === LAYER 4: DIRECTIONAL SCREEN SHAKE ===
    // Shake in the direction of the attack
    const centerY = this.scene.cameras.main.centerY;
    const shakeDir = y > centerY ? -1 : 1; // Shake toward attacker
    this.cameraFX.directionalShake(0, shakeDir, 0.008 * intensity, 150);

    // === LAYER 5: ELEMENT PARTICLE EXPLOSION ===
    // Main visual spectacle
    this.particles.explodeElement(x, y, element, intensity);

    // === LAYER 6: RING BURST (always, not just high damage) ===
    // Expanding shockwave for even small hits
    this.particles.createRingBurst(x, y, element, intensity);

    // === LAYER 7: POSTFX SPIKE ===
    // Bloom + chromatic aberration for screen-wide impact
    this.triggerPostFXSpike(intensity);

    // === BONUS: BACKGROUND PULSE ===
    // Subtle background reaction
    if (this.background) {
      this.background.pulse(intensity);
    }
  }

  /**
   * Light impact - for small damage (1-3)
   * Uses fewer layers for less dramatic effect
   */
  triggerLightImpact(x: number, y: number, element: string): void {
    const intensity = 0.3;

    // Only use some layers for light hits
    this.hitstop.freeze(40, false); // Very brief, no desaturate
    this.particles.explodeElement(x, y, element, intensity);

    // Subtle camera response
    this.cameraFX.shake(0.003, 80);
  }

  /**
   * Medium impact - for moderate damage (4-6)
   */
  triggerMediumImpact(x: number, y: number, element: string): void {
    this.triggerImpact(x, y, element, 5); // Use standard with intensity 0.5
  }

  /**
   * Heavy impact - for high damage (7+)
   * Uses all layers at full intensity
   */
  triggerHeavyImpact(x: number, y: number, element: string): void {
    this.triggerImpact(x, y, element, 10); // Full intensity
  }

  /**
   * Critical/Finishing blow - maximum dramatic effect
   * Uses super freeze and letterbox
   */
  async triggerCriticalImpact(x: number, y: number, element: string): Promise<void> {
    // Start letterbox for cinematic feel
    const cleanup = this.cameraFX.letterbox(200, 50);

    // Super freeze with heavy effects
    this.hitstop.superFreeze(200);

    // Screen flash (white for critical)
    this.scene.cameras.main.flash(100, 255, 255, 255);

    // Wait for freeze to end, then trigger main effects
    await new Promise(resolve => setTimeout(resolve, 200));

    // Full particle explosion
    this.particles.explodeElement(x, y, element, 1.5); // Over-intensity
    this.particles.createRingBurst(x, y, element, 1.5);

    // Slow-mo for dramatic effect
    this.cameraFX.slowMo(0.3, 500, 100, 200);

    // Camera focus on impact
    this.cameraFX.punchToward(x, y, 1.0, 300);

    // Massive shake
    this.cameraFX.shake(0.02, 300);

    // Remove letterbox after effects
    setTimeout(() => {
      cleanup();
    }, 800);
  }

  /**
   * Trigger PostFX spike (bloom + chromatic aberration)
   */
  private triggerPostFXSpike(intensity: number): void {
    const postFX = this.scene.cameras.main.getPostPipeline('PostFXPipeline') as PostFXPipeline;
    if (!postFX) return;

    // Spike effects
    postFX.impactFlash(intensity);
  }

  /**
   * Get element-specific flash color
   */
  private getElementFlashColor(element: string): [number, number, number] {
    return this.elementFlashColors[element] || this.elementFlashColors.neutral;
  }

  /**
   * Trigger damage blocked effect (defensive success)
   */
  triggerBlockedImpact(x: number, y: number): void {
    // Lighter effect for blocks
    this.hitstop.freeze(30, false);
    this.cameraFX.shake(0.002, 50);

    // White/neutral particles for block
    this.particles.explodeElement(x, y, 'neutral', 0.3);
  }

  /**
   * Victory celebration effect
   */
  triggerVictory(x: number, y: number): void {
    const postFX = this.scene.cameras.main.getPostPipeline('PostFXPipeline') as PostFXPipeline;
    if (postFX) {
      postFX.victoryGlow();
    }

    this.cameraFX.victoryCelebration();

    // Confetti-like particles
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const offsetX = (Math.random() - 0.5) * 400;
        const offsetY = (Math.random() - 0.5) * 200;
        this.particles.explodeElement(x + offsetX, y + offsetY, 'fire', 0.5);
      }, i * 100);
    }
  }

  /**
   * Defeat/loss effect
   */
  triggerDefeat(): void {
    const postFX = this.scene.cameras.main.getPostPipeline('PostFXPipeline') as PostFXPipeline;
    if (postFX) {
      postFX.defeatDim();
    }

    this.cameraFX.defeatDespair();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Nothing to destroy, managers handle their own cleanup
  }
}
