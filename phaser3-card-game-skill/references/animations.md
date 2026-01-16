# Animations Reference

## Animation Timing Cheat Sheet

| Animation | Duration | Easing | Notes |
|-----------|----------|--------|-------|
| Card flip | 300ms (150+150) | Quad.easeIn → Quad.easeOut | Split into two phases |
| Card deal | 350-450ms | Quad.easeOut | Add arc trajectory |
| Card play to center | 400-500ms | Cubic.easeOut | Include subtle lift |
| Card hover lift | 100-150ms | Quad.easeOut | Subtle, responsive |
| Card select | 200ms | Back.easeOut | Bounce effect |
| Hand reorganize | 200-300ms | Quad.easeOut | Stagger 30ms each |
| Damage number popup | 800-1000ms | Quad.easeOut | Float up + fade |
| Health bar change | 300ms | Quad.easeOut | Smooth interpolation |
| Screen shake | 150-250ms | N/A | Intensity 0.005-0.02 |
| Particle burst | 400-800ms | N/A | Based on particle lifespan |
| UI slide in | 300ms | Back.easeOut | For modals/panels |
| UI fade | 200ms | Linear | For overlays |
| Victory/defeat | 1000-1500ms | Custom sequence | Multiple effects |

## Easing Function Visual Reference

```
Linear:       ────────────────  Constant speed
Quad.easeIn:  ─────────────╱    Slow start, fast end
Quad.easeOut: ╱─────────────    Fast start, slow end
Quad.easeInOut: ───╱╲───────    Slow-fast-slow
Back.easeOut: ╱──↷────────      Overshoot then settle
Bounce.easeOut: ╱~^~^~────     Bouncy landing
Elastic.easeOut: ╱~~~^───      Spring oscillation
Cubic.easeOut: ╱────────────   Strong deceleration
Sine.easeInOut: ～～～～～～    Natural wave motion
```

## Card Flip Animation

### Basic Scale-Based Flip
```typescript
async flipCard(card: Card): Promise<void> {
  return new Promise(resolve => {
    // Phase 1: Scale to zero (hide current face)
    this.scene.tweens.add({
      targets: card,
      scaleX: 0,
      duration: 150,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // Swap textures at midpoint
        card.toggleFace();
        
        // Phase 2: Scale back (reveal new face)
        this.scene.tweens.add({
          targets: card,
          scaleX: 1,
          duration: 150,
          ease: 'Quad.easeOut',
          onComplete: () => resolve()
        });
      }
    });
  });
}
```

### 3D Perspective Flip (Using Rex Plugin)
```typescript
// Requires: npm install phaser3-rex-plugins
import PerspectiveCard from 'phaser3-rex-plugins/plugins/perspectivecard.js';

// In scene create:
const perspectiveCard = new PerspectiveCard(this, {
  front: frontImage,
  back: backImage,
  face: 'back',
  orientation: 'horizontal'
});

// Flip with 3D effect
perspectiveCard.flip.flip();
```

### Flip with Vertical Bounce
```typescript
async flipWithBounce(card: Card): Promise<void> {
  return new Promise(resolve => {
    this.scene.tweens.add({
      targets: card,
      scaleX: 0,
      y: card.y - 30,  // Lift during flip
      duration: 150,
      ease: 'Quad.easeIn',
      onComplete: () => {
        card.toggleFace();
        this.scene.tweens.add({
          targets: card,
          scaleX: 1,
          y: card.getData('originalY'),
          duration: 200,
          ease: 'Back.easeOut',
          onComplete: () => resolve()
        });
      }
    });
  });
}
```

## Card Deal Animation

### Basic Deal from Deck
```typescript
async dealCardToHand(
  card: Card,
  deckPos: { x: number; y: number },
  handPos: { x: number; y: number },
  delay: number = 0
): Promise<void> {
  // Position at deck
  card.setPosition(deckPos.x, deckPos.y);
  card.setScale(0.8);
  card.setAlpha(0);
  card.setRotation(-0.2);

  return new Promise(resolve => {
    this.scene.tweens.add({
      targets: card,
      x: handPos.x,
      y: handPos.y,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      duration: 400,
      delay,
      ease: 'Quad.easeOut',
      onComplete: () => resolve()
    });
  });
}
```

### Deal with Arc Trajectory (Bezier Curve)
```typescript
async dealWithArc(
  card: Card,
  startPos: { x: number; y: number },
  endPos: { x: number; y: number },
  delay: number = 0
): Promise<void> {
  card.setPosition(startPos.x, startPos.y);
  card.setScale(0.7);
  card.setAlpha(0.8);

  // Control point for arc (higher = bigger arc)
  const controlY = Math.min(startPos.y, endPos.y) - 120;
  
  const curve = new Phaser.Curves.QuadraticBezier(
    new Phaser.Math.Vector2(startPos.x, startPos.y),
    new Phaser.Math.Vector2((startPos.x + endPos.x) / 2, controlY),
    new Phaser.Math.Vector2(endPos.x, endPos.y)
  );

  return new Promise(resolve => {
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 450,
      delay,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const t = tween.getValue();
        const point = curve.getPoint(t);
        card.setPosition(point.x, point.y);
        card.setScale(0.7 + 0.3 * t);
        card.setAlpha(0.8 + 0.2 * t);
      },
      onComplete: () => resolve()
    });
  });
}
```

### Staggered Multi-Card Deal
```typescript
async dealMultipleCards(
  cards: Card[],
  deckPos: { x: number; y: number },
  handPositions: { x: number; y: number }[],
  staggerMs: number = 100
): Promise<void> {
  const promises = cards.map((card, index) => 
    this.dealWithArc(card, deckPos, handPositions[index], index * staggerMs)
  );
  
  await Promise.all(promises);
}
```

## Card Play Animation

### Play to Center with Lift
```typescript
async playCardToCenter(
  card: Card,
  centerPos: { x: number; y: number }
): Promise<void> {
  const startPos = { x: card.x, y: card.y };
  
  return new Promise(resolve => {
    // First: lift slightly
    this.scene.tweens.add({
      targets: card,
      y: startPos.y - 50,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 100,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Then: move to center
        this.scene.tweens.add({
          targets: card,
          x: centerPos.x,
          y: centerPos.y,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 350,
          ease: 'Cubic.easeOut',
          onComplete: () => resolve()
        });
      }
    });
  });
}
```

### Simultaneous Reveal (Both Players)
```typescript
async simultaneousReveal(
  playerCard: Card,
  opponentCard: Card,
  centerY: number
): Promise<void> {
  // Position cards
  playerCard.setPosition(this.centerX - 80, centerY);
  opponentCard.setPosition(this.centerX + 80, centerY);
  
  // Flip both simultaneously
  await Promise.all([
    playerCard.flip(),
    opponentCard.flip()
  ]);
  
  // Dramatic pause
  await this.delay(300);
}
```

## Card Destruction Animation

### Explode with Particles
```typescript
async destroyCard(card: Card): Promise<void> {
  // Create particle emitter at card position
  const particles = this.scene.add.particles(card.x, card.y, 'particle', {
    color: [0xff4400, 0xff8800, 0xffcc00, 0x333333],
    colorEase: 'quad.out',
    lifespan: 800,
    speed: { min: 80, max: 200 },
    scale: { start: 0.6, end: 0 },
    rotate: { start: 0, end: 360 },
    blendMode: 'ADD',
    emitting: false
  });
  
  // Explode particles
  particles.explode(50);
  
  // Animate card destruction
  return new Promise(resolve => {
    this.scene.tweens.add({
      targets: card,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      rotation: Phaser.Math.DegToRad(180),
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: () => {
        card.destroy();
        // Clean up particles after animation
        this.scene.time.delayedCall(1000, () => particles.destroy());
        resolve();
      }
    });
  });
}
```

### Dissolve Effect
```typescript
async dissolveCard(card: Card): Promise<void> {
  // Slice card into fragments effect using alpha mask
  return new Promise(resolve => {
    this.scene.tweens.add({
      targets: card,
      alpha: 0,
      y: card.y + 50,
      duration: 600,
      ease: 'Quad.easeIn',
      onUpdate: (tween) => {
        // Add shimmer during dissolve
        const progress = tween.progress;
        card.setTint(Phaser.Display.Color.GetColor(
          255 - progress * 100,
          255 - progress * 150,
          255 - progress * 200
        ));
      },
      onComplete: () => {
        card.destroy();
        resolve();
      }
    });
  });
}
```

## Damage and Combat Effects

### Screen Shake
```typescript
shakeScreen(intensity: number = 0.01, duration: number = 200): void {
  this.scene.cameras.main.shake(duration, intensity);
}
```

### Damage Number Popup
```typescript
showDamageNumber(
  x: number,
  y: number,
  damage: number,
  isCritical: boolean = false
): void {
  const color = isCritical ? '#ff0000' : '#ffffff';
  const size = isCritical ? '36px' : '28px';
  
  const text = this.scene.add.text(x, y, `-${damage}`, {
    fontSize: size,
    fontFamily: 'Arial Black',
    color,
    stroke: '#000000',
    strokeThickness: 4
  }).setOrigin(0.5);
  
  // Float up and fade
  this.scene.tweens.add({
    targets: text,
    y: y - 80,
    alpha: 0,
    duration: 1000,
    ease: 'Quad.easeOut',
    onComplete: () => text.destroy()
  });
  
  // Scale pop for emphasis
  if (isCritical) {
    this.scene.tweens.add({
      targets: text,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }
}
```

### Flash Damage on Target
```typescript
flashDamage(target: Phaser.GameObjects.GameObject): void {
  this.scene.tweens.add({
    targets: target,
    alpha: 0.3,
    duration: 80,
    yoyo: true,
    repeat: 2,
    ease: 'Linear'
  });
}
```

### Health Bar Drain Animation
```typescript
async animateHealthChange(
  healthBar: HealthBar,
  newValue: number,
  showDamagePreview: boolean = true
): Promise<void> {
  if (showDamagePreview) {
    // Show preview for 500ms before actual change
    healthBar.previewDamage(healthBar.currentHealth - newValue);
    await this.delay(500);
  }
  
  return new Promise(resolve => {
    this.scene.tweens.add({
      targets: healthBar,
      displayValue: newValue,
      duration: 400,
      ease: 'Quad.easeOut',
      onUpdate: () => healthBar.redraw(),
      onComplete: () => resolve()
    });
  });
}
```

## Particle Effect Configurations

### Element-Specific Particles
```typescript
const ELEMENT_PARTICLES = {
  Fire: {
    texture: 'particle-fire',
    color: [0xff4400, 0xff8800, 0xffcc00],
    lifespan: 600,
    speed: { min: 50, max: 150 },
    scale: { start: 0.5, end: 0 },
    gravityY: -100,  // Rise upward
    blendMode: 'ADD',
    alpha: { start: 1, end: 0 }
  },
  
  Water: {
    texture: 'particle-water',
    color: [0x00bfff, 0x1e90ff, 0x4169e1],
    lifespan: 800,
    speed: { min: 30, max: 100 },
    scale: { start: 0.4, end: 0.1 },
    gravityY: 200,  // Fall down
    blendMode: 'NORMAL',
    alpha: { start: 0.8, end: 0 }
  },
  
  Earth: {
    texture: 'particle-earth',
    color: [0x8b4513, 0x654321, 0x228b22],
    lifespan: 500,
    speed: { min: 100, max: 250 },
    scale: { start: 0.6, end: 0.2 },
    gravityY: 400,  // Heavy, fast fall
    bounce: 0.4,
    blendMode: 'NORMAL'
  },
  
  Air: {
    texture: 'particle-air',
    color: [0xe0ffff, 0xb0e0e6, 0x87ceeb],
    lifespan: 1200,
    speed: { min: 20, max: 80 },
    scale: { start: 0.3, end: 0.1 },
    gravityY: -20,
    rotate: { min: -180, max: 180 },
    blendMode: 'ADD',
    alpha: { start: 0.6, end: 0 }
  },
  
  Lightning: {
    texture: 'particle-lightning',
    color: [0xffff00, 0x00ffff, 0xffffff],
    lifespan: 200,  // Very short
    speed: { min: 200, max: 400 },
    scale: { start: 0.8, end: 0 },
    blendMode: 'ADD',
    alpha: { start: 1, end: 0 }
  },
  
  Ice: {
    texture: 'particle-ice',
    color: [0xadd8e6, 0x87ceeb, 0xffffff],
    lifespan: 1000,
    speed: { min: 30, max: 80 },
    scale: { start: 0.4, end: 0.1 },
    gravityY: 50,  // Gentle fall
    rotate: { min: 0, max: 360 },
    blendMode: 'ADD',
    alpha: { start: 0.9, end: 0 }
  }
};

function createElementalBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  element: keyof typeof ELEMENT_PARTICLES,
  particleCount: number = 30
): void {
  const config = ELEMENT_PARTICLES[element];
  
  const particles = scene.add.particles(x, y, config.texture, {
    ...config,
    emitting: false
  });
  
  particles.explode(particleCount);
  
  // Auto-cleanup
  scene.time.delayedCall(config.lifespan + 200, () => particles.destroy());
}
```

### Victory Celebration
```typescript
async playVictorySequence(): Promise<void> {
  // Screen flash
  this.scene.cameras.main.flash(500, 255, 215, 0);
  
  // Confetti burst
  const confetti = this.scene.add.particles(
    this.scene.cameras.main.centerX,
    -50,
    'particle-confetti',
    {
      color: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff],
      lifespan: 3000,
      speed: { min: 100, max: 300 },
      angle: { min: 80, max: 100 },
      scale: { start: 0.5, end: 0.2 },
      gravityY: 150,
      rotate: { min: 0, max: 360 },
      quantity: 10,
      frequency: 50
    }
  );
  
  // Stop confetti after 2 seconds
  await this.delay(2000);
  confetti.stop();
  
  // Victory text
  const victoryText = this.scene.add.text(
    this.scene.cameras.main.centerX,
    this.scene.cameras.main.centerY,
    'VICTORY!',
    {
      fontSize: '72px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
      stroke: '#8b4513',
      strokeThickness: 8
    }
  ).setOrigin(0.5).setScale(0).setAlpha(0);
  
  // Pop in victory text
  this.scene.tweens.add({
    targets: victoryText,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    duration: 500,
    ease: 'Back.easeOut'
  });
  
  // Cleanup after animation
  await this.delay(3500);
  confetti.destroy();
}
```

## Tween Utility Functions

### Chain Tweens (Sequential)
```typescript
async chainTweens(tweenConfigs: Phaser.Types.Tweens.TweenBuilderConfig[]): Promise<void> {
  for (const config of tweenConfigs) {
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        ...config,
        onComplete: () => resolve()
      });
    });
  }
}
```

### Parallel Tweens (Simultaneous)
```typescript
async parallelTweens(tweenConfigs: Phaser.Types.Tweens.TweenBuilderConfig[]): Promise<void> {
  const promises = tweenConfigs.map(config => 
    new Promise<void>(resolve => {
      this.scene.tweens.add({
        ...config,
        onComplete: () => resolve()
      });
    })
  );
  
  await Promise.all(promises);
}
```

### Safe Tween (Kill Existing First)
```typescript
safeTween(
  targets: any,
  config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>
): Phaser.Tweens.Tween {
  // Kill any existing tweens on target
  this.scene.tweens.killTweensOf(targets);
  
  return this.scene.tweens.add({
    targets,
    ...config
  });
}
```

### Delay Helper
```typescript
delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    this.scene.time.delayedCall(ms, resolve);
  });
}
```

## Timeline for Complex Sequences

```typescript
// Complex animation sequence using timeline
const timeline = this.scene.tweens.createTimeline();

// Phase 1: Lift card
timeline.add({
  targets: card,
  y: card.y - 50,
  duration: 150,
  ease: 'Quad.easeOut'
});

// Phase 2: Flip (two-part)
timeline.add({
  targets: card,
  scaleX: 0,
  duration: 150,
  ease: 'Quad.easeIn',
  onComplete: () => card.toggleFace()
});

timeline.add({
  targets: card,
  scaleX: 1,
  duration: 150,
  ease: 'Quad.easeOut'
});

// Phase 3: Move to position
timeline.add({
  targets: card,
  x: targetX,
  y: targetY,
  duration: 300,
  ease: 'Cubic.easeOut'
});

// Play the timeline
timeline.play();

// Or with promise
await new Promise(resolve => {
  timeline.on('complete', resolve);
  timeline.play();
});
```
