import Phaser from 'phaser';

/**
 * Manages input locking during animations and async operations
 * Based on phaser3-card-game-skill patterns
 */
export class InputManager {
  private scene: Phaser.Scene;
  private lockReasons: Set<string> = new Set();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Lock input with a reason
   */
  lock(reason: string): void {
    this.lockReasons.add(reason);
  }

  /**
   * Unlock input for a specific reason
   */
  unlock(reason: string): void {
    this.lockReasons.delete(reason);
  }

  /**
   * Check if input is currently locked
   */
  get isLocked(): boolean {
    return this.lockReasons.size > 0;
  }

  /**
   * Get all lock reasons (for debugging)
   */
  get reasons(): string[] {
    return Array.from(this.lockReasons);
  }

  /**
   * Execute action only if not locked
   */
  tryExecute(action: () => void): boolean {
    if (this.isLocked) {
      return false;
    }
    action();
    return true;
  }

  /**
   * Lock during an async operation
   */
  async withLock<T>(reason: string, action: () => Promise<T>): Promise<T> {
    this.lock(reason);
    try {
      return await action();
    } finally {
      this.unlock(reason);
    }
  }

  /**
   * Clear all locks (use sparingly)
   */
  clearAll(): void {
    this.lockReasons.clear();
  }

  /**
   * Create a safe tween that kills existing tweens first
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
   * Execute tweens with input lock
   */
  async tweenWithLock(
    reason: string,
    targets: object | object[],
    config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>
  ): Promise<void> {
    this.lock(reason);
    return new Promise((resolve) => {
      this.scene.tweens.killTweensOf(targets);
      this.scene.tweens.add({
        targets,
        ...config,
        onComplete: () => {
          this.unlock(reason);
          resolve();
        },
      });
    });
  }
}
