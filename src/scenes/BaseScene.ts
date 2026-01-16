import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants';
import { SceneKeys } from '../core/SceneKeys';
import { gameEvents } from '../utils/EventEmitter';

/**
 * Base scene class with common utilities
 * Based on phaser3-card-game-skill and ui-ux-mastery patterns
 */
export abstract class BaseScene extends Phaser.Scene {
  protected screenWidth: number = GAME_WIDTH;
  protected screenHeight: number = GAME_HEIGHT;
  protected centerX: number = GAME_WIDTH / 2;
  protected centerY: number = GAME_HEIGHT / 2;

  // Accessibility: reduced motion preference
  protected prefersReducedMotion: boolean = false;

  // Theme listener cleanup
  private cleanupThemeListener?: () => void;

  create(): void {
    // Update screen dimensions from camera (in case of resize)
    this.screenWidth = this.cameras.main.width;
    this.screenHeight = this.cameras.main.height;
    this.centerX = this.screenWidth / 2;
    this.centerY = this.screenHeight / 2;

    // Check reduced motion preference
    this.prefersReducedMotion = this.checkReducedMotion();

    // Listen for theme changes
    this.events.on('shutdown', this.handleShutdown, this);
    this.cleanupThemeListener = gameEvents.on('THEME_CHANGED', (event) => {
      this.handleThemeChange(event.payload as { theme: string; colors: any });
    });
  }

  /**
   * Handle scene shutdown - cleanup theme listener
   */
  protected handleShutdown(): void {
    if (this.cleanupThemeListener) {
      this.cleanupThemeListener();
      this.cleanupThemeListener = undefined;
    }
  }

  /**
   * Handle theme change event
   * Override in child scenes to update UI colors
   */
  protected handleThemeChange(data: { theme: string; colors: any }): void {
    // Default implementation: no-op
    // Child scenes should override to update their UI
  }

  /**
   * Check if user prefers reduced motion (accessibility)
   */
  protected checkReducedMotion(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  /**
   * Get animation duration respecting reduced motion preference
   */
  protected getAnimationDuration(normalDuration: number): number {
    return this.prefersReducedMotion ? 0 : normalDuration;
  }

  /**
   * Transition to another scene with fade effect
   */
  protected transitionTo(
    targetScene: SceneKeys | string,
    data?: object,
    fadeDuration: number = 300
  ): void {
    const duration = this.getAnimationDuration(fadeDuration);

    if (duration === 0) {
      // Skip animation for reduced motion
      this.scene.start(targetScene, { ...data, fadeIn: false });
      return;
    }

    this.cameras.main.fadeOut(duration, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.scene.start(targetScene, { ...data, fadeIn: true });
      }
    );
  }

  /**
   * Fade in on scene start (call in create if data.fadeIn is true)
   */
  protected fadeIn(duration: number = 300): void {
    const animDuration = this.getAnimationDuration(duration);
    if (animDuration > 0) {
      this.cameras.main.fadeIn(animDuration, 0, 0, 0);
    }
  }

  /**
   * Check if scene was started with fade-in request
   */
  protected shouldFadeIn(data?: { fadeIn?: boolean }): boolean {
    return data?.fadeIn === true && !this.prefersReducedMotion;
  }

  /**
   * Create a standard background with gradient
   */
  protected createGradientBackground(
    topColor: number = COLORS.background,
    bottomColor: number = 0x2d2d44
  ): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
    graphics.fillRect(0, 0, this.screenWidth, this.screenHeight);
    return graphics;
  }

  /**
   * Add a tween with reduced motion support
   */
  protected addTween(config: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween | null {
    if (this.prefersReducedMotion) {
      // Apply final state immediately
      if (config.targets && config.onComplete) {
        config.onComplete(null as any, config.targets);
      }
      return null;
    }
    return this.tweens.add(config);
  }

  /**
   * Create delayed call with reduced motion support
   */
  protected addDelayedCall(
    delay: number,
    callback: () => void,
    skipDelayOnReducedMotion: boolean = true
  ): Phaser.Time.TimerEvent {
    const actualDelay = skipDelayOnReducedMotion && this.prefersReducedMotion ? 0 : delay;
    return this.time.delayedCall(actualDelay, callback);
  }
}
