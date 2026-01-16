import Phaser from 'phaser';
import { PostFXPipeline } from '../shaders/PostFXPipeline';

/**
 * Hitstop/Frame Freeze Manager
 *
 * The #1 most important technique for AAA game feel.
 * Creates brief pauses on impact that make hits feel powerful.
 *
 * Used by: Street Fighter, Naruto Storm, Genshin Impact, and all
 * fighting games that feel "impactful"
 */
export class HitstopManager {
  private scene: Phaser.Scene;
  private frozen: boolean = false;
  private originalTimeScale: number = 1;
  private originalTweenScale: number = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Freeze the game for a brief moment on impact
   * Duration scales with damage dealt
   *
   * @param durationMs Duration of freeze in milliseconds (50-150 recommended)
   * @param desaturate Whether to desaturate during freeze for visual emphasis
   */
  freeze(durationMs: number = 80, desaturate: boolean = true): void {
    if (this.frozen) return;
    this.frozen = true;

    // Store original time scales
    this.originalTimeScale = this.scene.time.timeScale;
    this.originalTweenScale = this.scene.tweens.timeScale;

    // FREEZE everything - set time to 0
    this.scene.time.timeScale = 0;
    this.scene.tweens.timeScale = 0;

    // During freeze: desaturate slightly for visual feedback
    if (desaturate) {
      const postFX = this.getPostFX();
      if (postFX) {
        postFX.setSaturation(0.4); // Desaturate during freeze
      }
    }

    // Unfreeze after duration
    // IMPORTANT: Use real setTimeout, NOT scene.time.delayedCall
    // (scene.time is frozen!)
    setTimeout(() => {
      this.unfreeze();
    }, durationMs);
  }

  /**
   * Manually unfreeze (normally called automatically)
   */
  unfreeze(): void {
    if (!this.frozen) return;

    // Restore time scales
    this.scene.time.timeScale = this.originalTimeScale;
    this.scene.tweens.timeScale = this.originalTweenScale;

    // Restore saturation
    const postFX = this.getPostFX();
    if (postFX) {
      postFX.setSaturation(1.0); // Restore full color
    }

    this.frozen = false;
  }

  /**
   * Calculate freeze duration based on damage dealt
   *
   * Damage scaling:
   * - 1-3 damage: 50ms (light hit)
   * - 4-6 damage: 80ms (medium hit)
   * - 7-9 damage: 100ms (heavy hit)
   * - 10+ damage: 120ms (devastating hit)
   */
  getFreezeForDamage(damage: number): number {
    if (damage >= 10) return 120;
    if (damage >= 7) return 100;
    if (damage >= 4) return 80;
    return 50;
  }

  /**
   * Create a "super freeze" for critical/finishing moves
   * Longer duration, more dramatic desaturation
   */
  superFreeze(durationMs: number = 200): void {
    if (this.frozen) return;
    this.frozen = true;

    this.originalTimeScale = this.scene.time.timeScale;
    this.originalTweenScale = this.scene.tweens.timeScale;

    // Complete freeze
    this.scene.time.timeScale = 0;
    this.scene.tweens.timeScale = 0;

    // Heavy desaturation for dramatic effect
    const postFX = this.getPostFX();
    if (postFX) {
      postFX.setSaturation(0.2);
      postFX.setBloom(0.6); // Add bloom during super freeze
    }

    setTimeout(() => {
      if (postFX) {
        postFX.setBloom(0); // Remove bloom
      }
      this.unfreeze();
    }, durationMs);
  }

  /**
   * Is the game currently frozen?
   */
  isFrozen(): boolean {
    return this.frozen;
  }

  /**
   * Get PostFX pipeline reference
   */
  private getPostFX(): PostFXPipeline | null {
    const pipeline = this.scene.cameras.main.getPostPipeline('PostFXPipeline');
    return pipeline as PostFXPipeline | null;
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    if (this.frozen) {
      this.unfreeze();
    }
  }
}
