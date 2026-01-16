import Phaser from 'phaser';
import { COLORS, FONTS, FONT_SIZES, TIMING } from '../../config/constants';
import proceduralSFX from '../../audio/ProceduralSFX';

export interface CircularTimerConfig {
  x: number;
  y: number;
  radius: number;
  thickness: number;
  duration: number;
  warningThreshold?: number;
  normalColor?: number;
  warningColor?: number;
  backgroundColor?: number;
}

/**
 * Enhanced circular countdown timer
 * - Heartbeat pulse in final 3 seconds
 * - Smooth color gradient (green → yellow → red)
 * - Scale zoom during warning phase
 * - Synced 1-second pulse intervals
 */
export class CircularTimer {
  private scene: Phaser.Scene;
  private config: Required<CircularTimerConfig>;

  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private progressArc: Phaser.GameObjects.Graphics;
  private glowArc: Phaser.GameObjects.Graphics;
  private timeText: Phaser.GameObjects.Text;

  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private heartbeatTween: Phaser.Tweens.Tween | null = null;
  private elapsed: number = 0;
  private isRunning: boolean = false;
  private onCompleteCallback: (() => void) | null = null;
  private lastSecond: number = -1;

  constructor(scene: Phaser.Scene, config: CircularTimerConfig) {
    this.scene = scene;
    this.config = {
      warningThreshold: 3000,
      normalColor: COLORS.healthBar,
      warningColor: COLORS.timerWarning,
      backgroundColor: 0x333333,
      ...config,
    };

    this.container = this.scene.add.container(config.x, config.y);
    this.background = this.scene.add.graphics();
    this.glowArc = this.scene.add.graphics();
    this.progressArc = this.scene.add.graphics();
    this.timeText = this.scene.add.text(0, 0, '', {
      fontSize: `${FONT_SIZES.lg}px`,
      fontFamily: FONTS.family,
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.createComponents();
  }

  private createComponents(): void {
    const { radius, thickness } = this.config;

    // Background circle
    this.background.lineStyle(thickness, this.config.backgroundColor, 0.3);
    this.background.arc(0, 0, radius, 0, Math.PI * 2);
    this.background.strokePath();

    this.container.add([this.background, this.glowArc, this.progressArc, this.timeText]);

    this.draw();
  }

  private draw(): void {
    const { radius, thickness, duration, warningThreshold } = this.config;
    const remaining = Math.max(0, duration - this.elapsed);
    const progress = remaining / duration;

    // Calculate color based on remaining time (smooth gradient)
    const color = this.getTimerColor(remaining, duration);

    // Dynamic thickness - increases from base to 1.33x in final 5 seconds
    const urgencyThreshold = 5000; // 5 seconds
    let dynamicThickness = thickness;
    if (remaining <= urgencyThreshold && remaining > 0) {
      // Smooth interpolation: thickness increases as time decreases
      const urgencyProgress = 1 - remaining / urgencyThreshold;
      dynamicThickness = thickness + (thickness * 0.33 * urgencyProgress);
    }

    // Clear and draw glow effect during warning
    this.glowArc.clear();
    if (remaining <= warningThreshold && remaining > 0) {
      const glowIntensity = Math.sin(this.elapsed * 0.008) * 0.3 + 0.4;
      this.glowArc.lineStyle(dynamicThickness + 6, COLORS.timerWarning, glowIntensity * 0.5);
      this.glowArc.beginPath();
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * progress;
      this.glowArc.arc(0, 0, radius, startAngle, endAngle, false);
      this.glowArc.strokePath();
    }

    // Draw progress arc with dynamic thickness
    this.progressArc.clear();
    this.progressArc.lineStyle(dynamicThickness, color);
    this.progressArc.beginPath();

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * progress;

    this.progressArc.arc(0, 0, radius, startAngle, endAngle, false);
    this.progressArc.strokePath();

    // Update text
    const seconds = Math.ceil(remaining / 1000);
    this.timeText.setText(`${seconds}`);

    // Color the text based on state
    if (remaining <= warningThreshold) {
      this.timeText.setColor('#ff6b6b');
    } else if (remaining <= duration * 0.5) {
      this.timeText.setColor('#ffd43b');
    } else {
      this.timeText.setColor('#ffffff');
    }

    // Check for second change - trigger heartbeat
    if (remaining <= warningThreshold && remaining > 0) {
      const currentSecond = Math.ceil(remaining / 1000);
      if (currentSecond !== this.lastSecond) {
        this.lastSecond = currentSecond;
        this.triggerHeartbeat();
      }
    }
  }

  private getTimerColor(remaining: number, duration: number): number {
    const percent = remaining / duration;

    if (percent > 0.5) {
      // Green to Yellow (50-100%)
      const t = (percent - 0.5) * 2;
      return this.interpolateColor(COLORS.timerMid, COLORS.healthBar, t);
    } else if (percent > 0.15) {
      // Yellow to Red (15-50%)
      const t = (percent - 0.15) / 0.35;
      return this.interpolateColor(COLORS.timerWarning, COLORS.timerMid, t);
    }
    return COLORS.timerWarning;
  }

  private interpolateColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  private triggerHeartbeat(): void {
    // Stop any existing heartbeat
    if (this.heartbeatTween) {
      this.heartbeatTween.stop();
    }

    // 🎵 Play urgent timer warning sound
    proceduralSFX.timerWarning();

    // Heartbeat pulse: scale up then down
    this.heartbeatTween = this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: TIMING.fast,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => {
        this.container.setScale(1);
      },
    });

    // Also pulse the text more dramatically
    this.scene.tweens.add({
      targets: this.timeText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: TIMING.fast,
      ease: 'Quad.easeOut',
      yoyo: true,
    });
  }

  // Public API

  start(duration?: number, onComplete?: () => void): void {
    this.stop();
    if (duration) {
      this.config.duration = duration;
    }
    this.elapsed = 0;
    this.isRunning = true;
    this.lastSecond = -1;
    this.onCompleteCallback = onComplete || null;
    this.container.setScale(1);

    this.timerEvent = this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        this.elapsed += 50;
        this.draw();

        if (this.elapsed >= this.config.duration) {
          this.stop();
          this.onCompleteCallback?.();
        }
      },
      loop: true,
    });

    this.draw();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
    if (this.heartbeatTween) {
      this.heartbeatTween.stop();
      this.heartbeatTween = null;
    }
    this.container.setScale(1);
  }

  reset(): void {
    this.stop();
    this.elapsed = 0;
    this.lastSecond = -1;
    this.draw();
  }

  setRemaining(ms: number): void {
    this.elapsed = this.config.duration - ms;
    this.draw();
  }

  get remaining(): number {
    return Math.max(0, this.config.duration - this.elapsed);
  }

  get running(): boolean {
    return this.isRunning;
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.stop();
    this.container.destroy();
  }
}
