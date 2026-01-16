import Phaser from 'phaser';

/**
 * Tween Registry - Managed Tween Lifecycle
 *
 * Prevents tween stacking by automatically killing existing tweens
 * with the same key before adding new ones.
 */
export class TweenRegistry {
  private scene: Phaser.Scene;
  private tweens: Map<string, Phaser.Tweens.Tween> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Add a managed tween - automatically kills any existing tween with same key
   * @param key Unique identifier for this tween
   * @param config Tween configuration
   * @returns The created tween
   */
  add(
    key: string,
    config: Phaser.Types.Tweens.TweenBuilderConfig
  ): Phaser.Tweens.Tween {
    // Kill existing tween with same key
    this.kill(key);

    const tween = this.scene.tweens.add(config);
    this.tweens.set(key, tween);

    // Auto-remove from registry when complete (if not repeating)
    if (!config.repeat || config.repeat === 0) {
      tween.on('complete', () => {
        this.tweens.delete(key);
      });
    }

    return tween;
  }

  /**
   * Add a counter tween (no target, just value interpolation)
   */
  addCounter(
    key: string,
    config: Phaser.Types.Tweens.NumberTweenBuilderConfig
  ): Phaser.Tweens.Tween {
    this.kill(key);

    const tween = this.scene.tweens.addCounter(config);
    this.tweens.set(key, tween);

    if (!config.repeat || config.repeat === 0) {
      tween.on('complete', () => {
        this.tweens.delete(key);
      });
    }

    return tween;
  }

  /**
   * Get a tween by key
   */
  get(key: string): Phaser.Tweens.Tween | undefined {
    return this.tweens.get(key);
  }

  /**
   * Check if a tween exists and is playing
   */
  isPlaying(key: string): boolean {
    const tween = this.tweens.get(key);
    return tween ? tween.isPlaying() : false;
  }

  /**
   * Kill a specific tween by key
   */
  kill(key: string): void {
    const existing = this.tweens.get(key);
    if (existing) {
      if (existing.isPlaying()) {
        existing.stop();
      }
      this.tweens.delete(key);
    }
  }

  /**
   * Kill all tweens matching a prefix
   * Useful for killing all tweens related to a specific object
   * e.g., killByPrefix('card_0_') kills all tweens for card 0
   */
  killByPrefix(prefix: string): void {
    for (const [key, tween] of this.tweens) {
      if (key.startsWith(prefix)) {
        if (tween.isPlaying()) {
          tween.stop();
        }
        this.tweens.delete(key);
      }
    }
  }

  /**
   * Kill all managed tweens
   */
  killAll(): void {
    for (const [, tween] of this.tweens) {
      if (tween.isPlaying()) {
        tween.stop();
      }
    }
    this.tweens.clear();
  }

  /**
   * Pause a specific tween
   */
  pause(key: string): void {
    const tween = this.tweens.get(key);
    if (tween && tween.isPlaying()) {
      tween.pause();
    }
  }

  /**
   * Resume a specific tween
   */
  resume(key: string): void {
    const tween = this.tweens.get(key);
    if (tween && tween.isPaused()) {
      tween.resume();
    }
  }

  /**
   * Pause all managed tweens
   */
  pauseAll(): void {
    for (const [, tween] of this.tweens) {
      if (tween.isPlaying()) {
        tween.pause();
      }
    }
  }

  /**
   * Resume all managed tweens
   */
  resumeAll(): void {
    for (const [, tween] of this.tweens) {
      if (tween.isPaused()) {
        tween.resume();
      }
    }
  }

  /**
   * Get statistics about managed tweens
   */
  getStats(): { total: number; playing: number; paused: number } {
    let playing = 0;
    let paused = 0;

    for (const [, tween] of this.tweens) {
      if (tween.isPlaying()) {
        playing++;
      } else if (tween.isPaused()) {
        paused++;
      }
    }

    return {
      total: this.tweens.size,
      playing,
      paused,
    };
  }

  /**
   * List all active tween keys (for debugging)
   */
  listKeys(): string[] {
    return Array.from(this.tweens.keys());
  }

  /**
   * Destroy the registry
   */
  destroy(): void {
    this.killAll();
  }
}

/**
 * Helper to generate consistent tween keys
 */
export function tweenKey(object: string, property: string, index?: number): string {
  if (index !== undefined) {
    return `${object}_${index}_${property}`;
  }
  return `${object}_${property}`;
}
