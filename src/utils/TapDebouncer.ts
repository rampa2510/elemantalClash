/**
 * Prevents rapid repeated taps from causing duplicate actions
 * Based on phaser3-card-game-skill patterns
 */
export class TapDebouncer {
  private lastTapTime: number = 0;
  private debounceMs: number;
  private processingAction: boolean = false;

  constructor(debounceMs: number = 200) {
    this.debounceMs = debounceMs;
  }

  async handleTap<T>(action: () => Promise<T> | T): Promise<{ handled: boolean; result?: T }> {
    const now = Date.now();

    // Ignore if too soon after last tap
    if (now - this.lastTapTime < this.debounceMs) {
      return { handled: false };
    }

    // Ignore if still processing previous action
    if (this.processingAction) {
      return { handled: false };
    }

    this.lastTapTime = now;
    this.processingAction = true;

    try {
      const result = await action();
      return { handled: true, result };
    } finally {
      this.processingAction = false;
    }
  }

  /**
   * Check if a tap should be allowed (non-async version)
   */
  canTap(): boolean {
    const now = Date.now();
    if (now - this.lastTapTime < this.debounceMs || this.processingAction) {
      return false;
    }
    this.lastTapTime = now;
    return true;
  }

  /**
   * Lock during an async operation
   */
  lock(): void {
    this.processingAction = true;
  }

  /**
   * Unlock after operation completes
   */
  unlock(): void {
    this.processingAction = false;
  }

  /**
   * Reset the debouncer state
   */
  reset(): void {
    this.lastTapTime = 0;
    this.processingAction = false;
  }
}
