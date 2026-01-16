# UI Components Reference

## Health Bar

### Animated Health Bar with Damage Preview
```typescript
// src/ui/components/HealthBar.ts
import Phaser from 'phaser';

export interface HealthBarConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  maxHealth: number;
  showText?: boolean;
  backgroundColor?: number;
  healthColor?: number;
  damageColor?: number;
  borderColor?: number;
}

export class HealthBar {
  private scene: Phaser.Scene;
  private config: Required<HealthBarConfig>;
  
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;
  private damagePreview: Phaser.GameObjects.Graphics;
  private healthText: Phaser.GameObjects.Text | null = null;
  
  private currentHealth: number;
  private displayHealth: number;
  private previewHealth: number | null = null;

  constructor(scene: Phaser.Scene, config: HealthBarConfig) {
    this.scene = scene;
    this.config = {
      showText: true,
      backgroundColor: 0x333333,
      healthColor: 0x00ff00,
      damageColor: 0xff0000,
      borderColor: 0x666666,
      ...config
    };
    
    this.currentHealth = config.maxHealth;
    this.displayHealth = config.maxHealth;
    
    this.createComponents();
  }

  private createComponents(): void {
    const { x, y, width, height } = this.config;
    
    this.container = this.scene.add.container(x, y);
    
    // Background
    this.background = this.scene.add.graphics();
    this.background.fillStyle(this.config.backgroundColor);
    this.background.fillRoundedRect(0, 0, width, height, 4);
    this.background.lineStyle(2, this.config.borderColor);
    this.background.strokeRoundedRect(0, 0, width, height, 4);
    
    // Damage preview (under health bar)
    this.damagePreview = this.scene.add.graphics();
    
    // Health bar
    this.healthBar = this.scene.add.graphics();
    
    // Text
    if (this.config.showText) {
      this.healthText = this.scene.add.text(
        width / 2,
        height / 2,
        `${this.currentHealth}/${this.config.maxHealth}`,
        {
          fontSize: '14px',
          fontFamily: 'Arial',
          color: '#ffffff',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5);
    }
    
    this.container.add([
      this.background,
      this.damagePreview,
      this.healthBar,
      ...(this.healthText ? [this.healthText] : [])
    ]);
    
    this.draw();
  }

  private draw(): void {
    const { width, height } = this.config;
    const padding = 3;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    
    // Clear graphics
    this.healthBar.clear();
    this.damagePreview.clear();
    
    // Calculate percentages
    const healthPercent = this.displayHealth / this.config.maxHealth;
    const previewPercent = this.previewHealth !== null 
      ? this.previewHealth / this.config.maxHealth 
      : healthPercent;
    
    // Draw damage preview (if active)
    if (this.previewHealth !== null && this.previewHealth < this.displayHealth) {
      this.damagePreview.fillStyle(this.config.damageColor, 0.5);
      this.damagePreview.fillRoundedRect(
        padding,
        padding,
        innerWidth * healthPercent,
        innerHeight,
        2
      );
    }
    
    // Determine health bar color
    const color = this.getHealthColor(healthPercent);
    
    // Draw health bar
    this.healthBar.fillStyle(color);
    this.healthBar.fillRoundedRect(
      padding,
      padding,
      innerWidth * healthPercent,
      innerHeight,
      2
    );
    
    // Update text
    if (this.healthText) {
      this.healthText.setText(`${Math.round(this.displayHealth)}/${this.config.maxHealth}`);
    }
  }

  private getHealthColor(percent: number): number {
    if (percent > 0.5) return 0x00ff00;      // Green
    if (percent > 0.25) return 0xffff00;     // Yellow
    return 0xff0000;                          // Red
  }

  // Public API

  setHealth(value: number, animated: boolean = true): void {
    const clampedValue = Phaser.Math.Clamp(value, 0, this.config.maxHealth);
    this.currentHealth = clampedValue;
    this.previewHealth = null;
    
    if (animated) {
      this.scene.tweens.add({
        targets: this,
        displayHealth: clampedValue,
        duration: 400,
        ease: 'Quad.easeOut',
        onUpdate: () => this.draw()
      });
    } else {
      this.displayHealth = clampedValue;
      this.draw();
    }
  }

  previewDamage(damage: number): void {
    this.previewHealth = Math.max(0, this.currentHealth - damage);
    this.draw();
  }

  clearPreview(): void {
    this.previewHealth = null;
    this.draw();
  }

  get health(): number {
    return this.currentHealth;
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  destroy(): void {
    this.container.destroy();
  }
}
```

## Turn Timer

### Circular Countdown Timer
```typescript
// src/ui/components/CircularTimer.ts
import Phaser from 'phaser';

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

export class CircularTimer {
  private scene: Phaser.Scene;
  private config: Required<CircularTimerConfig>;
  
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private progressArc: Phaser.GameObjects.Graphics;
  private timeText: Phaser.GameObjects.Text;
  
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private elapsed: number = 0;
  private isRunning: boolean = false;
  private onComplete: (() => void) | null = null;

  constructor(scene: Phaser.Scene, config: CircularTimerConfig) {
    this.scene = scene;
    this.config = {
      warningThreshold: 3000,
      normalColor: 0x00ff88,
      warningColor: 0xff4444,
      backgroundColor: 0x333333,
      ...config
    };
    
    this.createComponents();
  }

  private createComponents(): void {
    const { x, y, radius, thickness } = this.config;
    
    this.container = this.scene.add.container(x, y);
    
    // Background circle
    this.background = this.scene.add.graphics();
    this.background.lineStyle(thickness, this.config.backgroundColor, 0.3);
    this.background.arc(0, 0, radius, 0, Math.PI * 2);
    this.background.strokePath();
    
    // Progress arc
    this.progressArc = this.scene.add.graphics();
    
    // Time text
    this.timeText = this.scene.add.text(0, 0, '', {
      fontSize: '32px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    this.container.add([this.background, this.progressArc, this.timeText]);
    
    this.draw();
  }

  private draw(): void {
    const { radius, thickness, duration, warningThreshold } = this.config;
    const remaining = duration - this.elapsed;
    const progress = remaining / duration;
    
    // Determine color
    const color = remaining <= warningThreshold 
      ? this.config.warningColor 
      : this.config.normalColor;
    
    // Draw progress arc
    this.progressArc.clear();
    this.progressArc.lineStyle(thickness, color);
    this.progressArc.beginPath();
    
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * progress);
    
    this.progressArc.arc(0, 0, radius, startAngle, endAngle, false);
    this.progressArc.strokePath();
    
    // Update text
    const seconds = Math.ceil(remaining / 1000);
    this.timeText.setText(`${seconds}`);
    this.timeText.setColor(remaining <= warningThreshold ? '#ff4444' : '#ffffff');
    
    // Warning pulse effect
    if (remaining <= warningThreshold && remaining > 0) {
      const pulse = Math.sin(this.elapsed * 0.01) * 0.1 + 1;
      this.timeText.setScale(pulse);
    } else {
      this.timeText.setScale(1);
    }
  }

  // Public API

  start(onComplete?: () => void): void {
    this.stop();
    this.elapsed = 0;
    this.isRunning = true;
    this.onComplete = onComplete || null;
    
    this.timerEvent = this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        this.elapsed += 50;
        this.draw();
        
        if (this.elapsed >= this.config.duration) {
          this.stop();
          this.onComplete?.();
        }
      },
      loop: true
    });
    
    this.draw();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
  }

  pause(): void {
    this.timerEvent?.paused && (this.timerEvent.paused = true);
  }

  resume(): void {
    this.timerEvent?.paused && (this.timerEvent.paused = false);
  }

  reset(): void {
    this.stop();
    this.elapsed = 0;
    this.draw();
  }

  setRemaining(ms: number): void {
    this.elapsed = this.config.duration - ms;
    this.draw();
  }

  get remaining(): number {
    return Math.max(0, this.config.duration - this.elapsed);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  destroy(): void {
    this.stop();
    this.container.destroy();
  }
}
```

### Linear Timer Bar
```typescript
// src/ui/components/LinearTimer.ts
export class LinearTimer {
  private scene: Phaser.Scene;
  private bar: Phaser.GameObjects.Graphics;
  private width: number;
  private height: number;
  private duration: number;
  private elapsed: number = 0;

  constructor(
    scene: Phaser.Scene, 
    x: number, 
    y: number, 
    width: number, 
    height: number,
    duration: number
  ) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.duration = duration;
    
    this.bar = scene.add.graphics();
    this.bar.setPosition(x, y);
    this.draw();
  }

  private draw(): void {
    const progress = 1 - (this.elapsed / this.duration);
    const color = progress > 0.3 ? 0x00ff88 : 0xff4444;
    
    this.bar.clear();
    
    // Background
    this.bar.fillStyle(0x333333);
    this.bar.fillRoundedRect(0, 0, this.width, this.height, 4);
    
    // Progress
    this.bar.fillStyle(color);
    this.bar.fillRoundedRect(2, 2, (this.width - 4) * progress, this.height - 4, 2);
  }

  start(onComplete: () => void): void {
    this.elapsed = 0;
    
    this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        this.elapsed += 50;
        this.draw();
        
        if (this.elapsed >= this.duration) {
          onComplete();
        }
      },
      loop: true
    });
  }
}
```

## Button Component

```typescript
// src/ui/components/Button.ts
import Phaser from 'phaser';

export interface ButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  textStyle?: Phaser.Types.GameObjects.Text.TextStyle;
  normalColor?: number;
  hoverColor?: number;
  pressedColor?: number;
  disabledColor?: number;
  onClick?: () => void;
}

export class Button {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private config: Required<ButtonConfig>;
  private isEnabled: boolean = true;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    this.scene = scene;
    this.config = {
      textStyle: { fontSize: '20px', color: '#ffffff', fontFamily: 'Arial' },
      normalColor: 0x4a5568,
      hoverColor: 0x718096,
      pressedColor: 0x2d3748,
      disabledColor: 0x1a202c,
      onClick: () => {},
      ...config
    };
    
    this.createComponents();
    this.setupInteraction();
  }

  private createComponents(): void {
    const { x, y, width, height, text, textStyle, normalColor } = this.config;
    
    this.container = this.scene.add.container(x, y);
    
    // Background
    this.background = this.scene.add.graphics();
    this.drawBackground(normalColor);
    
    // Label
    this.label = this.scene.add.text(0, 0, text, textStyle).setOrigin(0.5);
    
    this.container.add([this.background, this.label]);
    this.container.setSize(width, height);
    this.container.setInteractive({ useHandCursor: true });
  }

  private drawBackground(color: number): void {
    const { width, height } = this.config;
    
    this.background.clear();
    this.background.fillStyle(color);
    this.background.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
  }

  private setupInteraction(): void {
    this.container.on('pointerover', () => {
      if (!this.isEnabled) return;
      this.drawBackground(this.config.hoverColor);
    });
    
    this.container.on('pointerout', () => {
      if (!this.isEnabled) return;
      this.drawBackground(this.config.normalColor);
    });
    
    this.container.on('pointerdown', () => {
      if (!this.isEnabled) return;
      this.drawBackground(this.config.pressedColor);
    });
    
    this.container.on('pointerup', () => {
      if (!this.isEnabled) return;
      this.drawBackground(this.config.hoverColor);
      this.config.onClick?.();
    });
  }

  // Public API

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.container.setInteractive({ useHandCursor: true });
      this.drawBackground(this.config.normalColor);
      this.label.setAlpha(1);
    } else {
      this.container.disableInteractive();
      this.drawBackground(this.config.disabledColor);
      this.label.setAlpha(0.5);
    }
  }

  setText(text: string): void {
    this.label.setText(text);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  destroy(): void {
    this.container.destroy();
  }
}
```

## Modal / Dialog

```typescript
// src/ui/components/Modal.ts
import Phaser from 'phaser';

export interface ModalConfig {
  title: string;
  message: string;
  buttons?: { text: string; onClick: () => void }[];
  width?: number;
  height?: number;
}

export class Modal {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Container;
  private onClose: (() => void) | null = null;

  constructor(scene: Phaser.Scene, config: ModalConfig) {
    this.scene = scene;
    this.create(config);
  }

  private create(config: ModalConfig): void {
    const { width: gameWidth, height: gameHeight } = this.scene.cameras.main;
    const modalWidth = config.width || 400;
    const modalHeight = config.height || 250;
    
    // Dark overlay
    this.overlay = this.scene.add.rectangle(
      gameWidth / 2, gameHeight / 2,
      gameWidth, gameHeight,
      0x000000, 0.7
    );
    this.overlay.setInteractive(); // Block clicks behind
    this.overlay.setDepth(1000);
    
    // Panel container
    this.panel = this.scene.add.container(gameWidth / 2, gameHeight / 2);
    this.panel.setDepth(1001);
    
    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2a2a4a);
    bg.fillRoundedRect(-modalWidth / 2, -modalHeight / 2, modalWidth, modalHeight, 16);
    bg.lineStyle(2, 0x4a4a6a);
    bg.strokeRoundedRect(-modalWidth / 2, -modalHeight / 2, modalWidth, modalHeight, 16);
    
    // Title
    const title = this.scene.add.text(0, -modalHeight / 2 + 30, config.title, {
      fontSize: '24px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Message
    const message = this.scene.add.text(0, -20, config.message, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#cccccc',
      align: 'center',
      wordWrap: { width: modalWidth - 40 }
    }).setOrigin(0.5);
    
    this.panel.add([bg, title, message]);
    
    // Buttons
    const buttons = config.buttons || [{ text: 'OK', onClick: () => this.close() }];
    const buttonWidth = 100;
    const buttonSpacing = 20;
    const totalButtonWidth = buttons.length * buttonWidth + (buttons.length - 1) * buttonSpacing;
    let buttonX = -totalButtonWidth / 2 + buttonWidth / 2;
    
    buttons.forEach(btnConfig => {
      const button = this.createButton(buttonX, modalHeight / 2 - 50, buttonWidth, 40, btnConfig.text, () => {
        btnConfig.onClick();
        this.close();
      });
      this.panel.add(button);
      buttonX += buttonWidth + buttonSpacing;
    });
    
    // Animate in
    this.panel.setScale(0.8);
    this.panel.setAlpha(0);
    this.overlay.setAlpha(0);
    
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 0.7,
      duration: 200
    });
    
    this.scene.tweens.add({
      targets: this.panel,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  private createButton(
    x: number, y: number, 
    width: number, height: number, 
    text: string, onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x4a5568);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    
    const label = this.scene.add.text(0, 0, text, {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    container.add([bg, label]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    
    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x718096);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    });
    
    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x4a5568);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    });
    
    container.on('pointerdown', onClick);
    
    return container;
  }

  close(): void {
    this.scene.tweens.add({
      targets: [this.overlay, this.panel],
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.overlay.destroy();
        this.panel.destroy();
        this.onClose?.();
      }
    });
  }

  setOnClose(callback: () => void): void {
    this.onClose = callback;
  }
}
```

## Toast Notification

```typescript
// src/ui/components/Toast.ts
export class Toast {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const { width } = this.scene.cameras.main;
    
    const colors = {
      success: 0x48bb78,
      error: 0xf56565,
      info: 0x4299e1
    };
    
    const container = this.scene.add.container(width / 2, -50);
    container.setDepth(2000);
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(colors[type], 0.95);
    bg.fillRoundedRect(-150, -20, 300, 40, 8);
    
    const text = this.scene.add.text(0, 0, message, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    container.add([bg, text]);
    
    // Slide in
    this.scene.tweens.add({
      targets: container,
      y: 80,
      duration: 300,
      ease: 'Back.easeOut'
    });
    
    // Auto dismiss after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: container,
        y: -50,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeIn',
        onComplete: () => container.destroy()
      });
    });
  }
}
```

## Input Manager

```typescript
// src/ui/InputManager.ts
export class InputManager {
  private scene: Phaser.Scene;
  private lockReasons: Set<string> = new Set();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  lock(reason: string): void {
    this.lockReasons.add(reason);
  }

  unlock(reason: string): void {
    this.lockReasons.delete(reason);
  }

  get isLocked(): boolean {
    return this.lockReasons.size > 0;
  }

  // Execute action only if not locked
  tryExecute(action: () => void): boolean {
    if (this.isLocked) return false;
    action();
    return true;
  }

  // Lock during async operation
  async withLock(reason: string, action: () => Promise<void>): Promise<void> {
    this.lock(reason);
    try {
      await action();
    } finally {
      this.unlock(reason);
    }
  }
}
```

## Safe Area Handler (Mobile Notch)

```typescript
// src/ui/SafeAreaHandler.ts
export class SafeAreaHandler {
  private topInset: number = 0;
  private bottomInset: number = 0;

  constructor() {
    this.detectSafeArea();
  }

  private detectSafeArea(): void {
    // CSS environment variables for iOS
    const style = getComputedStyle(document.documentElement);
    
    this.topInset = parseInt(style.getPropertyValue('--sat') || '0', 10) || 
                    parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10);
    this.bottomInset = parseInt(style.getPropertyValue('--sab') || '0', 10) ||
                       parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10);
    
    // Fallback detection for notch devices
    if (this.topInset === 0 && window.screen.height >= 812) {
      // iPhone X and later detection
      const ratio = window.screen.width / window.screen.height;
      if (ratio < 0.5) {
        this.topInset = 44;
        this.bottomInset = 34;
      }
    }
  }

  get safeTop(): number {
    return this.topInset;
  }

  get safeBottom(): number {
    return this.bottomInset;
  }

  adjustPosition(y: number, fromTop: boolean = true): number {
    if (fromTop) {
      return y + this.topInset;
    }
    return y - this.bottomInset;
  }
}
```
