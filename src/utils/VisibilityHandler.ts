/**
 * Handles browser tab visibility changes
 * Based on phaser3-card-game-skill patterns
 */
export class VisibilityHandler {
  private onVisibleCallback: (() => void) | null = null;
  private onHiddenCallback: (() => void) | null = null;
  private isHidden: boolean = false;

  constructor() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.isHidden = true;
      this.onHiddenCallback?.();
    } else {
      this.isHidden = false;
      this.onVisibleCallback?.();
    }
  }

  setCallbacks(onVisible: () => void, onHidden: () => void): void {
    this.onVisibleCallback = onVisible;
    this.onHiddenCallback = onHidden;
  }

  get hidden(): boolean {
    return this.isHidden;
  }

  destroy(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    this.onVisibleCallback = null;
    this.onHiddenCallback = null;
  }
}
