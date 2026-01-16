/**
 * SafeAreaHandler - Handles mobile safe areas (notch, home indicator)
 * Based on phaser3-card-game-skill patterns
 */
export class SafeAreaHandler {
  private topInset: number = 0;
  private bottomInset: number = 0;
  private leftInset: number = 0;
  private rightInset: number = 0;

  constructor() {
    this.detectSafeArea();
    this.setupResizeListener();
  }

  private detectSafeArea(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Try CSS environment variables first
    const style = getComputedStyle(document.documentElement);

    // Modern env() support
    this.topInset = this.parseEnvValue('safe-area-inset-top');
    this.bottomInset = this.parseEnvValue('safe-area-inset-bottom');
    this.leftInset = this.parseEnvValue('safe-area-inset-left');
    this.rightInset = this.parseEnvValue('safe-area-inset-right');

    // Fallback detection for notch devices (iPhone X and later)
    if (this.topInset === 0 && this.isLikelyNotchDevice()) {
      this.topInset = 44;
      this.bottomInset = 34;
    }
  }

  private parseEnvValue(property: string): number {
    try {
      // Create a temporary element to read computed value
      const testEl = document.createElement('div');
      testEl.style.position = 'fixed';
      testEl.style.top = '0';
      testEl.style.paddingTop = `env(${property}, 0px)`;
      document.body.appendChild(testEl);
      const value = parseInt(getComputedStyle(testEl).paddingTop, 10) || 0;
      document.body.removeChild(testEl);
      return value;
    } catch {
      return 0;
    }
  }

  private isLikelyNotchDevice(): boolean {
    if (typeof window === 'undefined') return false;

    // Check screen dimensions for iPhone X+ style devices
    const { width, height } = window.screen;
    const ratio = Math.min(width, height) / Math.max(width, height);

    // iPhone X+ have aspect ratio around 0.46
    const isModernIPhone = ratio < 0.5 && Math.max(width, height) >= 812;

    // Also check for standalone mode (PWA)
    const isStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    return isModernIPhone || isStandalone;
  }

  private setupResizeListener(): void {
    if (typeof window === 'undefined') return;

    // Re-detect on orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.detectSafeArea(), 100);
    });

    // Re-detect on resize
    window.addEventListener('resize', () => {
      this.detectSafeArea();
    });
  }

  // Public API

  get safeTop(): number {
    return this.topInset;
  }

  get safeBottom(): number {
    return this.bottomInset;
  }

  get safeLeft(): number {
    return this.leftInset;
  }

  get safeRight(): number {
    return this.rightInset;
  }

  /**
   * Adjust a Y position from the top to account for safe area
   */
  adjustFromTop(y: number): number {
    return y + this.topInset;
  }

  /**
   * Adjust a Y position from the bottom to account for safe area
   */
  adjustFromBottom(y: number, screenHeight: number): number {
    return y - this.bottomInset;
  }

  /**
   * Get the safe content area
   */
  getSafeArea(screenWidth: number, screenHeight: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    return {
      x: this.leftInset,
      y: this.topInset,
      width: screenWidth - this.leftInset - this.rightInset,
      height: screenHeight - this.topInset - this.bottomInset,
    };
  }

  /**
   * Check if device has any safe area insets
   */
  hasSafeArea(): boolean {
    return this.topInset > 0 || this.bottomInset > 0 || this.leftInset > 0 || this.rightInset > 0;
  }
}

// Singleton instance
let safeAreaHandlerInstance: SafeAreaHandler | null = null;

export function getSafeAreaHandler(): SafeAreaHandler {
  if (!safeAreaHandlerInstance) {
    safeAreaHandlerInstance = new SafeAreaHandler();
  }
  return safeAreaHandlerInstance;
}
