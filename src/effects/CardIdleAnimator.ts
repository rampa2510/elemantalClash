import Phaser from 'phaser';
import { TweenRegistry, tweenKey } from '../core/TweenRegistry';

/**
 * Card animation state tracking
 */
interface CardAnimationState {
  container: Phaser.GameObjects.Container;
  baseY: number;
  baseScale: number;
  isPlayable: boolean;
  glowGraphics?: Phaser.GameObjects.Graphics;
}

/**
 * Card Idle Animator
 *
 * Adds subtle, continuous animations to cards for visual polish:
 * - Breathing: Gentle scale pulse (0.98 → 1.02)
 * - Float: Soft Y position oscillation (±4px)
 * - Element glow: Alpha pulse on playable cards
 *
 * Each card has a unique phase offset to prevent synchronized pulsing.
 */
export class CardIdleAnimator {
  private scene: Phaser.Scene;
  private tweenRegistry: TweenRegistry;
  private cards: Map<string, CardAnimationState> = new Map();
  private isAnimating: boolean = false;

  // Animation configuration
  private static readonly CONFIG = {
    breathing: {
      scaleMin: 0.98,
      scaleMax: 1.02,
      duration: 2500,
      ease: 'Sine.easeInOut',
    },
    float: {
      yOffset: 4,
      duration: 3000,
      ease: 'Sine.easeInOut',
    },
    glow: {
      alphaMin: 0.1,
      alphaMax: 0.3,
      duration: 1500,
      ease: 'Sine.easeInOut',
    },
    // Stagger offset between cards (ms)
    phaseOffset: 200,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.tweenRegistry = new TweenRegistry(scene);

    // Cleanup on scene shutdown
    this.scene.events.once('shutdown', this.destroy, this);
  }

  /**
   * Register a card for idle animations
   * @param id Unique card identifier
   * @param container The card's container
   * @param isPlayable Whether the card can be played (affects glow)
   */
  registerCard(
    id: string,
    container: Phaser.GameObjects.Container,
    isPlayable: boolean = false
  ): void {
    // Store initial state
    this.cards.set(id, {
      container,
      baseY: container.y,
      baseScale: container.scaleX || 1,
      isPlayable,
    });

    // Start animations if system is active
    if (this.isAnimating) {
      this.startCardAnimations(id);
    }
  }

  /**
   * Unregister a card (call when card is removed/destroyed)
   */
  unregisterCard(id: string): void {
    const state = this.cards.get(id);
    if (state) {
      // Stop all tweens for this card
      this.tweenRegistry.killByPrefix(`card_${id}_`);

      // Destroy glow graphics if exists
      if (state.glowGraphics) {
        state.glowGraphics.destroy();
      }

      this.cards.delete(id);
    }
  }

  /**
   * Update playable state for a card
   */
  setPlayable(id: string, isPlayable: boolean): void {
    const state = this.cards.get(id);
    if (state) {
      const wasPlayable = state.isPlayable;
      state.isPlayable = isPlayable;

      // Toggle glow animation
      if (this.isAnimating) {
        if (isPlayable && !wasPlayable) {
          this.startGlowAnimation(id, state);
        } else if (!isPlayable && wasPlayable) {
          this.stopGlowAnimation(id, state);
        }
      }
    }
  }

  /**
   * Start all idle animations
   */
  start(): void {
    if (this.isAnimating) return;
    this.isAnimating = true;

    // Start animations for all registered cards
    let index = 0;
    for (const [id] of this.cards) {
      // Stagger start times
      this.scene.time.delayedCall(index * CardIdleAnimator.CONFIG.phaseOffset, () => {
        this.startCardAnimations(id);
      });
      index++;
    }
  }

  /**
   * Stop all idle animations
   */
  stop(): void {
    if (!this.isAnimating) return;
    this.isAnimating = false;

    // Kill all tweens and reset positions
    for (const [id, state] of this.cards) {
      this.tweenRegistry.killByPrefix(`card_${id}_`);

      // Reset to base state
      state.container.setY(state.baseY);
      state.container.setScale(state.baseScale);

      // Stop glow
      if (state.glowGraphics) {
        state.glowGraphics.setAlpha(0);
      }
    }
  }

  /**
   * Pause animations (keeps state)
   */
  pause(): void {
    this.tweenRegistry.pauseAll();
  }

  /**
   * Resume paused animations
   */
  resume(): void {
    this.tweenRegistry.resumeAll();
  }

  /**
   * Start animations for a specific card
   */
  private startCardAnimations(id: string): void {
    const state = this.cards.get(id);
    if (!state) return;

    const cardIndex = Array.from(this.cards.keys()).indexOf(id);
    const phaseOffset = cardIndex * CardIdleAnimator.CONFIG.phaseOffset;

    // Breathing animation (scale)
    this.startBreathingAnimation(id, state, phaseOffset);

    // Float animation (Y position)
    this.startFloatAnimation(id, state, phaseOffset);

    // Glow animation (if playable)
    if (state.isPlayable) {
      this.startGlowAnimation(id, state);
    }
  }

  /**
   * Breathing animation - subtle scale pulse
   */
  private startBreathingAnimation(
    id: string,
    state: CardAnimationState,
    phaseOffset: number
  ): void {
    const { breathing } = CardIdleAnimator.CONFIG;
    const baseScale = state.baseScale;

    this.tweenRegistry.add(tweenKey('card', 'breathing', this.getCardIndex(id)), {
      targets: state.container,
      scaleX: { from: baseScale * breathing.scaleMin, to: baseScale * breathing.scaleMax },
      scaleY: { from: baseScale * breathing.scaleMin, to: baseScale * breathing.scaleMax },
      duration: breathing.duration + phaseOffset,
      ease: breathing.ease,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Float animation - gentle Y position oscillation
   */
  private startFloatAnimation(
    id: string,
    state: CardAnimationState,
    phaseOffset: number
  ): void {
    const { float } = CardIdleAnimator.CONFIG;

    this.tweenRegistry.add(tweenKey('card', 'float', this.getCardIndex(id)), {
      targets: state.container,
      y: { from: state.baseY - float.yOffset, to: state.baseY + float.yOffset },
      duration: float.duration + phaseOffset,
      ease: float.ease,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Glow animation - alpha pulse for playable cards
   */
  private startGlowAnimation(id: string, state: CardAnimationState): void {
    const { glow } = CardIdleAnimator.CONFIG;

    // Create glow graphics if needed
    if (!state.glowGraphics) {
      state.glowGraphics = this.createGlowGraphics(state.container);
    }

    state.glowGraphics.setAlpha(glow.alphaMin);

    this.tweenRegistry.add(tweenKey('card', 'glow', this.getCardIndex(id)), {
      targets: state.glowGraphics,
      alpha: { from: glow.alphaMin, to: glow.alphaMax },
      duration: glow.duration,
      ease: glow.ease,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Stop glow animation for a card
   */
  private stopGlowAnimation(id: string, state: CardAnimationState): void {
    this.tweenRegistry.kill(tweenKey('card', 'glow', this.getCardIndex(id)));

    if (state.glowGraphics) {
      // Fade out glow
      this.scene.tweens.add({
        targets: state.glowGraphics,
        alpha: 0,
        duration: 200,
        ease: 'Quad.easeOut',
      });
    }
  }

  /**
   * Create glow graphics for a card
   */
  private createGlowGraphics(container: Phaser.GameObjects.Container): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();

    // Get card bounds (approximate)
    const width = 80;  // Card width
    const height = 120; // Card height
    const padding = 8;

    // Draw glow border
    graphics.lineStyle(4, 0xffd43b, 1); // Golden glow
    graphics.strokeRoundedRect(
      container.x - width / 2 - padding,
      container.y - height / 2 - padding,
      width + padding * 2,
      height + padding * 2,
      12
    );

    graphics.setBlendMode(Phaser.BlendModes.ADD);
    graphics.setAlpha(0);
    graphics.setDepth(container.depth - 1);

    return graphics;
  }

  /**
   * Get card index for tween key generation
   */
  private getCardIndex(id: string): number {
    return Array.from(this.cards.keys()).indexOf(id);
  }

  /**
   * Update base position for a card (call after repositioning)
   */
  updateBasePosition(id: string, x: number, y: number): void {
    const state = this.cards.get(id);
    if (state) {
      state.baseY = y;
      state.container.setPosition(x, y);

      // Restart float animation with new base
      if (this.isAnimating) {
        const phaseOffset = this.getCardIndex(id) * CardIdleAnimator.CONFIG.phaseOffset;
        this.tweenRegistry.kill(tweenKey('card', 'float', this.getCardIndex(id)));
        this.startFloatAnimation(id, state, phaseOffset);
      }

      // Update glow position
      if (state.glowGraphics) {
        state.glowGraphics.destroy();
        state.glowGraphics = this.createGlowGraphics(state.container);
        if (state.isPlayable && this.isAnimating) {
          this.startGlowAnimation(id, state);
        }
      }
    }
  }

  /**
   * Temporarily boost animation for a card (e.g., on hover)
   */
  pulseCard(id: string, intensity: number = 1.2): void {
    const state = this.cards.get(id);
    if (!state) return;

    // Pause regular animations
    this.tweenRegistry.pause(tweenKey('card', 'breathing', this.getCardIndex(id)));
    this.tweenRegistry.pause(tweenKey('card', 'float', this.getCardIndex(id)));

    // Quick scale pulse
    this.scene.tweens.add({
      targets: state.container,
      scaleX: state.baseScale * intensity,
      scaleY: state.baseScale * intensity,
      duration: 150,
      ease: 'Back.easeOut',
      yoyo: true,
      onComplete: () => {
        // Resume regular animations
        this.tweenRegistry.resume(tweenKey('card', 'breathing', this.getCardIndex(id)));
        this.tweenRegistry.resume(tweenKey('card', 'float', this.getCardIndex(id)));
      },
    });
  }

  /**
   * Get animation statistics
   */
  getStats(): { registeredCards: number; activeTweens: number } {
    const tweenStats = this.tweenRegistry.getStats();
    return {
      registeredCards: this.cards.size,
      activeTweens: tweenStats.playing,
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    this.tweenRegistry.destroy();

    // Destroy all glow graphics
    for (const [, state] of this.cards) {
      if (state.glowGraphics) {
        state.glowGraphics.destroy();
      }
    }

    this.cards.clear();
  }
}
