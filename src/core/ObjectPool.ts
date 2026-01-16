import Phaser from 'phaser';

/**
 * Generic Object Pool for Phaser Game Objects
 *
 * Optimizes performance by reusing objects instead of creating/destroying.
 * Used for: Graphics, Containers, ParticleEmitters, etc.
 */
export class ObjectPool<T extends Phaser.GameObjects.GameObject> {
  private pool: T[] = [];
  private factory: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;
  private activeCount: number = 0;

  /**
   * Create an object pool
   * @param factory Function to create new objects
   * @param resetFn Function to reset object state when released
   * @param initialSize Number of objects to pre-create
   * @param maxSize Maximum pool size
   */
  constructor(
    factory: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 50
  ) {
    this.factory = factory;
    this.resetFn = resetFn;
    this.maxSize = maxSize;

    // Pre-warm pool with initial objects
    for (let i = 0; i < initialSize; i++) {
      const obj = this.factory();
      obj.setActive(false);
      if ('setVisible' in obj) {
        (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
      }
      this.pool.push(obj);
    }
  }

  /**
   * Acquire an object from the pool
   * Creates new if pool exhausted (up to maxSize)
   */
  acquire(): T | null {
    // Find inactive object in pool
    let obj = this.pool.find(o => !o.active);

    if (!obj && this.pool.length < this.maxSize) {
      // Create new object if under max size
      obj = this.factory();
      this.pool.push(obj);
    }

    if (obj) {
      obj.setActive(true);
      if ('setVisible' in obj) {
        (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(true);
      }
      this.activeCount++;
      return obj;
    }

    // Pool exhausted - return null (caller should handle gracefully)
    console.warn('[ObjectPool] Pool exhausted, max size reached:', this.maxSize);
    return null;
  }

  /**
   * Release an object back to the pool
   */
  release(obj: T): void {
    if (!this.pool.includes(obj)) {
      console.warn('[ObjectPool] Attempted to release object not from this pool');
      return;
    }

    this.resetFn(obj);
    obj.setActive(false);
    if ('setVisible' in obj) {
      (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
    }
    this.activeCount = Math.max(0, this.activeCount - 1);
  }

  /**
   * Release all active objects
   */
  releaseAll(): void {
    for (const obj of this.pool) {
      if (obj.active) {
        this.resetFn(obj);
        obj.setActive(false);
        if ('setVisible' in obj) {
          (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
        }
      }
    }
    this.activeCount = 0;
  }

  /**
   * Get current pool statistics
   */
  getStats(): { total: number; active: number; available: number } {
    return {
      total: this.pool.length,
      active: this.activeCount,
      available: this.pool.length - this.activeCount,
    };
  }

  /**
   * Destroy the pool and all objects
   */
  destroy(): void {
    for (const obj of this.pool) {
      obj.destroy();
    }
    this.pool = [];
    this.activeCount = 0;
  }
}

/**
 * Specialized Graphics Pool
 */
export class GraphicsPool extends ObjectPool<Phaser.GameObjects.Graphics> {
  constructor(scene: Phaser.Scene, initialSize: number = 10, maxSize: number = 30) {
    super(
      () => {
        const g = scene.add.graphics();
        g.setDepth(100); // Default high depth, can be changed per use
        return g;
      },
      (g) => {
        g.clear();
        g.setPosition(0, 0);
        g.setScale(1);
        g.setAlpha(1);
        g.setDepth(100);
      },
      initialSize,
      maxSize
    );
  }
}

/**
 * Specialized Container Pool
 */
export class ContainerPool extends ObjectPool<Phaser.GameObjects.Container> {
  constructor(scene: Phaser.Scene, initialSize: number = 10, maxSize: number = 30) {
    super(
      () => scene.add.container(0, 0),
      (c) => {
        c.removeAll(true); // Destroy children
        c.setPosition(0, 0);
        c.setScale(1);
        c.setAlpha(1);
        c.setDepth(0);
      },
      initialSize,
      maxSize
    );
  }
}

/**
 * Delayed release helper - releases object after duration
 */
export function delayedRelease<T extends Phaser.GameObjects.GameObject>(
  scene: Phaser.Scene,
  pool: ObjectPool<T>,
  obj: T,
  delay: number
): void {
  scene.time.delayedCall(delay, () => {
    if (obj.active) {
      pool.release(obj);
    }
  });
}
