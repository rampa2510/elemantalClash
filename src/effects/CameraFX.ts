import Phaser from 'phaser';

/**
 * AAA Camera Effects Manager
 *
 * Provides dramatic camera effects for impactful moments:
 * - Screen punch (zoom impact)
 * - Letterbox (cinematic moments)
 * - Slow motion (critical hits)
 * - Screen shake (damage)
 * - Zoom focus (card reveals)
 * - Flash effects
 */
export class CameraFX {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private letterboxBars: { top: Phaser.GameObjects.Rectangle; bottom: Phaser.GameObjects.Rectangle } | null = null;
  private originalTimeScale: number = 1;
  private isSlowMo: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  /**
   * Screen punch effect - quick zoom in then smooth return
   * Great for impact moments (damage dealt, card plays)
   *
   * @param intensity 0-1 strength of the punch
   * @param duration Total duration in ms
   */
  punch(intensity: number = 1, duration: number = 200): void {
    const originalZoom = this.camera.zoom;
    const punchZoom = originalZoom + (0.08 * intensity);

    // Quick zoom in
    this.scene.tweens.add({
      targets: this.camera,
      zoom: punchZoom,
      duration: duration * 0.3,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Smooth return with slight overshoot
        this.scene.tweens.add({
          targets: this.camera,
          zoom: originalZoom,
          duration: duration * 0.7,
          ease: 'Back.easeOut',
        });
      },
    });
  }

  /**
   * Directional punch - zoom toward a specific point
   *
   * @param x Target X position
   * @param y Target Y position
   * @param intensity 0-1 strength
   * @param duration Total duration in ms
   */
  punchToward(x: number, y: number, intensity: number = 1, duration: number = 300): void {
    const originalZoom = this.camera.zoom;
    const originalScroll = { x: this.camera.scrollX, y: this.camera.scrollY };
    const punchZoom = originalZoom + (0.1 * intensity);

    // Calculate offset toward target
    const centerX = this.camera.centerX;
    const centerY = this.camera.centerY;
    const offsetX = (x - centerX) * 0.1 * intensity;
    const offsetY = (y - centerY) * 0.1 * intensity;

    // Punch toward target
    this.scene.tweens.add({
      targets: this.camera,
      zoom: punchZoom,
      scrollX: originalScroll.x + offsetX,
      scrollY: originalScroll.y + offsetY,
      duration: duration * 0.3,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Return to original
        this.scene.tweens.add({
          targets: this.camera,
          zoom: originalZoom,
          scrollX: originalScroll.x,
          scrollY: originalScroll.y,
          duration: duration * 0.7,
          ease: 'Back.easeOut',
        });
      },
    });
  }

  /**
   * Letterbox effect - cinematic black bars for dramatic moments
   *
   * @param duration Transition duration in ms
   * @param barHeight Height of each bar (default 60px)
   * @returns Cleanup function to remove letterbox
   */
  letterbox(duration: number = 400, barHeight: number = 60): () => void {
    const width = this.camera.width;
    const height = this.camera.height;

    // Create bars (start off-screen)
    const topBar = this.scene.add.rectangle(
      width / 2,
      -barHeight / 2,
      width,
      barHeight,
      0x000000
    );
    topBar.setScrollFactor(0);
    topBar.setDepth(999);

    const bottomBar = this.scene.add.rectangle(
      width / 2,
      height + barHeight / 2,
      width,
      barHeight,
      0x000000
    );
    bottomBar.setScrollFactor(0);
    bottomBar.setDepth(999);

    this.letterboxBars = { top: topBar, bottom: bottomBar };

    // Animate bars in
    this.scene.tweens.add({
      targets: topBar,
      y: barHeight / 2,
      duration: duration,
      ease: 'Power2',
    });

    this.scene.tweens.add({
      targets: bottomBar,
      y: height - barHeight / 2,
      duration: duration,
      ease: 'Power2',
    });

    // Return cleanup function
    return () => this.removeLetterbox(duration);
  }

  /**
   * Remove letterbox effect
   */
  removeLetterbox(duration: number = 400): void {
    if (!this.letterboxBars) return;

    const { top, bottom } = this.letterboxBars;
    const height = this.camera.height;
    const barHeight = top.height;

    this.scene.tweens.add({
      targets: top,
      y: -barHeight / 2,
      duration: duration,
      ease: 'Power2',
      onComplete: () => top.destroy(),
    });

    this.scene.tweens.add({
      targets: bottom,
      y: height + barHeight / 2,
      duration: duration,
      ease: 'Power2',
      onComplete: () => bottom.destroy(),
    });

    this.letterboxBars = null;
  }

  /**
   * Slow motion effect - slows down time for dramatic moments
   *
   * @param timeScale How slow (0.1 = 10% speed, 0.5 = 50% speed)
   * @param duration How long to stay in slow-mo (ms in real time)
   * @param easeIn Duration of transition into slow-mo (ms)
   * @param easeOut Duration of transition out of slow-mo (ms)
   */
  slowMo(
    timeScale: number = 0.3,
    duration: number = 500,
    easeIn: number = 100,
    easeOut: number = 200
  ): void {
    if (this.isSlowMo) return;

    this.isSlowMo = true;
    this.originalTimeScale = this.scene.time.timeScale;

    // Ease into slow motion
    this.scene.tweens.addCounter({
      from: 1,
      to: timeScale,
      duration: easeIn,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const value = tween.getValue() ?? 1;
        this.scene.time.timeScale = value;
        this.scene.tweens.timeScale = value;
      },
      onComplete: () => {
        // Hold at slow speed, then ease out
        // Note: delayedCall uses scaled time, so we need to account for that
        const realDelay = duration * timeScale;
        this.scene.time.delayedCall(realDelay, () => {
          this.scene.tweens.addCounter({
            from: timeScale,
            to: 1,
            duration: easeOut,
            ease: 'Quad.easeIn',
            onUpdate: (tween) => {
              const value = tween.getValue() ?? 1;
              this.scene.time.timeScale = value;
              this.scene.tweens.timeScale = value;
            },
            onComplete: () => {
              this.scene.time.timeScale = this.originalTimeScale;
              this.scene.tweens.timeScale = this.originalTimeScale;
              this.isSlowMo = false;
            },
          });
        });
      },
    });
  }

  /**
   * Enhanced screen shake with intensity decay
   *
   * @param intensity Shake strength (0.001 - 0.05 recommended)
   * @param duration Duration in ms
   */
  shake(intensity: number = 0.01, duration: number = 200): void {
    this.camera.shake(duration, intensity);
  }

  /**
   * Directional shake (bias toward a direction)
   *
   * @param directionX X bias (-1 to 1)
   * @param directionY Y bias (-1 to 1)
   * @param intensity Shake strength
   * @param duration Duration in ms
   */
  directionalShake(
    directionX: number,
    directionY: number,
    intensity: number = 0.01,
    duration: number = 200
  ): void {
    const steps = Math.floor(duration / 16); // ~60fps
    let step = 0;

    const shakeInterval = this.scene.time.addEvent({
      delay: 16,
      repeat: steps,
      callback: () => {
        const decay = 1 - step / steps;
        const offsetX = (directionX + (Math.random() - 0.5) * 0.5) * intensity * this.camera.width * decay;
        const offsetY = (directionY + (Math.random() - 0.5) * 0.5) * intensity * this.camera.height * decay;

        this.camera.setScroll(
          this.camera.scrollX + offsetX,
          this.camera.scrollY + offsetY
        );

        step++;
      },
    });
  }

  /**
   * Element-specific camera shake behaviors
   *
   * Each element has a unique shake pattern to enhance identity:
   * - Fire: Fast, chaotic, intense
   * - Water: Smooth wave motion
   * - Earth: Heavy, low-frequency rumble
   * - Air: Quick, light flutter
   * - Lightning: Sharp, staccato bursts
   * - Ice: Slow, crystalline feel
   *
   * @param element The element type
   * @param intensity 0-1 strength multiplier
   */
  elementShake(element: string, intensity: number = 1): void {
    const behaviors: Record<string, { frequency: number; duration: number }> = {
      fire: { frequency: 0.015, duration: 150 },
      water: { frequency: 0.008, duration: 300 },
      earth: { frequency: 0.02, duration: 200 },
      air: { frequency: 0.005, duration: 100 },
      lightning: { frequency: 0.025, duration: 80 },
      ice: { frequency: 0.01, duration: 250 },
      neutral: { frequency: 0.01, duration: 150 },
    };

    const behavior = behaviors[element] || behaviors.neutral;
    this.shake(behavior.frequency * intensity, behavior.duration);
  }

  /**
   * Zoom focus on a point (for reveals, important moments)
   *
   * @param x Target X
   * @param y Target Y
   * @param zoomLevel Target zoom (1.5 = 50% closer)
   * @param duration Duration in ms
   * @param holdTime How long to hold the zoom
   */
  zoomFocus(
    x: number,
    y: number,
    zoomLevel: number = 1.3,
    duration: number = 500,
    holdTime: number = 1000
  ): Promise<void> {
    return new Promise((resolve) => {
      const originalZoom = this.camera.zoom;
      const originalScroll = { x: this.camera.scrollX, y: this.camera.scrollY };

      // Calculate scroll to center on target
      const targetScrollX = x - this.camera.width / 2 / zoomLevel;
      const targetScrollY = y - this.camera.height / 2 / zoomLevel;

      // Zoom in
      this.scene.tweens.add({
        targets: this.camera,
        zoom: zoomLevel,
        scrollX: targetScrollX,
        scrollY: targetScrollY,
        duration: duration,
        ease: 'Power2',
        onComplete: () => {
          // Hold
          this.scene.time.delayedCall(holdTime, () => {
            // Zoom out
            this.scene.tweens.add({
              targets: this.camera,
              zoom: originalZoom,
              scrollX: originalScroll.x,
              scrollY: originalScroll.y,
              duration: duration,
              ease: 'Power2',
              onComplete: () => resolve(),
            });
          });
        },
      });
    });
  }

  /**
   * Flash effect with color
   *
   * @param duration Flash duration in ms
   * @param color Flash color (hex)
   * @param alpha Flash intensity (0-1)
   */
  flash(duration: number = 100, color: number = 0xffffff, alpha: number = 0.8): void {
    const rgb = Phaser.Display.Color.IntegerToRGB(color);
    this.camera.flash(duration, rgb.r, rgb.g, rgb.b, true);
  }

  /**
   * Fade to color then back
   *
   * @param color Target color
   * @param duration Total duration
   */
  fadeFlash(color: number = 0x000000, duration: number = 500): void {
    const rgb = Phaser.Display.Color.IntegerToRGB(color);

    this.camera.fadeOut(duration / 2, rgb.r, rgb.g, rgb.b);
    this.camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.camera.fadeIn(duration / 2, rgb.r, rgb.g, rgb.b);
    });
  }

  /**
   * Impact combo - combines multiple effects for big moments
   *
   * @param x Impact X position
   * @param y Impact Y position
   * @param intensity 0-1 strength
   */
  impactCombo(x: number, y: number, intensity: number = 1): void {
    // Combine effects based on intensity
    this.punchToward(x, y, intensity * 0.8, 250);
    this.shake(0.008 * intensity, 150);

    if (intensity > 0.7) {
      this.flash(80, 0xffffff, 0.4);
    }
  }

  /**
   * Critical moment effect - for game-changing events
   *
   * @param x Focus X
   * @param y Focus Y
   */
  async criticalMoment(x: number, y: number): Promise<void> {
    const cleanup = this.letterbox(200, 50);
    this.slowMo(0.4, 800, 100, 200);
    await this.zoomFocus(x, y, 1.2, 300, 500);
    cleanup();
  }

  /**
   * Victory celebration camera effect
   */
  victoryCelebration(): void {
    // Gentle zoom out with slight rotation
    const originalZoom = this.camera.zoom;

    this.scene.tweens.add({
      targets: this.camera,
      zoom: originalZoom * 0.95,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 1,
    });

    // Subtle shake celebration
    this.shake(0.003, 500);
  }

  /**
   * Defeat camera effect
   */
  defeatDespair(): void {
    // Slow zoom in (claustrophobic)
    const originalZoom = this.camera.zoom;

    this.scene.tweens.add({
      targets: this.camera,
      zoom: originalZoom * 1.1,
      duration: 2000,
      ease: 'Sine.easeIn',
    });

    // Slow fade to dark
    this.camera.fadeOut(2000, 0, 0, 0);
  }

  /**
   * Reset camera to default state
   */
  reset(): void {
    this.scene.time.timeScale = 1;
    this.scene.tweens.timeScale = 1;
    this.isSlowMo = false;

    this.scene.tweens.add({
      targets: this.camera,
      zoom: 1,
      scrollX: 0,
      scrollY: 0,
      duration: 300,
      ease: 'Power2',
    });

    if (this.letterboxBars) {
      this.removeLetterbox(200);
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.reset();
    if (this.letterboxBars) {
      this.letterboxBars.top.destroy();
      this.letterboxBars.bottom.destroy();
    }
  }
}
