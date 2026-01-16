---
name: phaser3-card-game
description: Production-grade Phaser 3 turn-based card game development with TypeScript, Vite, Firebase multiplayer, and AI opponents. Use when building card games, deck builders, TCGs, or any turn-based game with Phaser 3. Triggers on: Phaser 3 card game, card flip animation, deck management, hand layout, turn-based multiplayer, Firebase game sync, simultaneous card selection, card game AI, Phaser tweens for cards, health bars in Phaser, game state machine, room-based matchmaking, real-time game sync.
---

# Phaser 3 Card Game Development Skill

Production patterns for turn-based multiplayer card games using Phaser 3 + TypeScript + Vite + Firebase.

## Quick Reference

| Topic | Reference File |
|-------|---------------|
| Project setup & scenes | [references/architecture.md](references/architecture.md) |
| Card classes & data | [references/cards.md](references/cards.md) |
| Animations & effects | [references/animations.md](references/animations.md) |
| Firebase multiplayer | [references/multiplayer.md](references/multiplayer.md) |
| UI components | [references/ui-components.md](references/ui-components.md) |
| AI opponents | [references/ai-opponent.md](references/ai-opponent.md) |
| Edge cases & errors | [references/edge-cases.md](references/edge-cases.md) |
| Deployment & testing | [references/deployment.md](references/deployment.md) |
| Resources & learning | [references/resources.md](references/resources.md) |

## Core Workflow

### 1. Project Setup
```bash
npx degit phaserjs/template-vite-ts my-card-game
cd my-card-game && npm install
npm install firebase phaser3-rex-plugins
```

### 2. Game Configuration (Mobile-First)
```typescript
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720, height: 1280,  // Portrait mobile
    min: { width: 360, height: 640 },
    max: { width: 1080, height: 1920 }
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene]
};
```

### 3. Scene Flow
```
Boot → Preload (assets) → Menu → Game ↔ UI (parallel) → GameOver
```

### 4. Card Game Architecture
```
src/
├── game/
│   ├── cards/       # Card.ts, Hand.ts, Deck.ts
│   ├── state/       # GameState.ts, TurnStateMachine.ts
│   └── player/      # Player.ts
├── services/        # FirebaseService.ts
└── ui/              # HealthBar.ts, Timer.ts
```

## Essential Patterns

### Card Class (Container-Based)
```typescript
class Card extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, data: CardData) {
    super(scene, x, y);
    this.cardBack = scene.add.image(0, 0, 'card-back');
    this.cardFront = scene.add.image(0, 0, data.textureKey).setVisible(false);
    this.add([this.cardBack, this.cardFront]);
    this.setSize(this.cardBack.width, this.cardBack.height);
    this.setInteractive({ useHandCursor: true });
    scene.add.existing(this);
  }
}
```

### Card Flip Animation
```typescript
async flip(): Promise<void> {
  return new Promise(resolve => {
    this.scene.tweens.add({
      targets: this, scaleX: 0, duration: 150, ease: 'Quad.easeIn',
      onComplete: () => {
        this.isFaceUp = !this.isFaceUp;
        this.cardFront.setVisible(this.isFaceUp);
        this.cardBack.setVisible(!this.isFaceUp);
        this.scene.tweens.add({
          targets: this, scaleX: 1, duration: 150, ease: 'Quad.easeOut',
          onComplete: () => resolve()
        });
      }
    });
  });
}
```

### Turn State Machine
```typescript
type TurnPhase = 'SELECTION' | 'LOCK_IN' | 'REVEAL' | 'RESOLUTION' | 'CLEANUP';

class TurnStateMachine {
  private validTransitions: Record<TurnPhase, TurnPhase[]> = {
    'SELECTION': ['LOCK_IN', 'REVEAL'],
    'LOCK_IN': ['REVEAL'],
    'REVEAL': ['RESOLUTION'],
    'RESOLUTION': ['CLEANUP'],
    'CLEANUP': ['SELECTION']
  };
  
  transitionTo(phase: TurnPhase): boolean {
    if (!this.validTransitions[this.phase].includes(phase)) return false;
    this.phase = phase;
    this.events.emit('phase-changed', phase);
    return true;
  }
}
```

### Firebase Room Structure
```json
{
  "games": {
    "{gameId}": {
      "roomCode": "ABC123",
      "phase": "selection",
      "turnStartedAt": { ".sv": "timestamp" },
      "player1": { "id": "uid", "health": 30, "selectedCard": null, "lockedIn": false },
      "player2": { "id": "uid", "health": 30, "selectedCard": null, "lockedIn": false }
    }
  }
}
```

### Synchronized Timer
```typescript
class SyncTimer {
  private serverOffset = 0;
  
  constructor() {
    onValue(ref(db, '.info/serverTimeOffset'), s => this.serverOffset = s.val() || 0);
  }
  
  getRemaining(startedAt: number, duration: number): number {
    const serverNow = Date.now() + this.serverOffset;
    return Math.max(0, duration - (serverNow - startedAt));
  }
}
```

## Animation Timing Cheat Sheet

| Animation | Duration | Easing |
|-----------|----------|--------|
| Card flip | 300ms | Quad.easeInOut |
| Card deal | 400ms | Quad.easeOut |
| Card play | 500ms | Cubic.easeOut |
| Hover lift | 150ms | Quad.easeOut |
| Damage shake | 200ms | Sine.easeInOut |
| Health change | 300ms | Quad.easeOut |

## Decision Trees

### Multiplayer Architecture
```
Turn-based game? → Firebase RTDB (simple, cheap, offline support)
Real-time action? → Colyseus or Photon (lower latency)
Need custom server logic? → Colyseus + Node.js
```

### Input Handling
```
Animation playing? → Lock input
Opponent's turn? → Lock input  
Network operation? → Lock input + show spinner
User's turn + idle? → Enable input
```

### Card Selection Pattern (Simultaneous)
```
1. Player selects card → Store locally
2. Player confirms → Write hash to Firebase (commit)
3. Both committed? → Write actual cards (reveal)
4. Both revealed? → Animate flip + resolve combat
```

## Common Pitfalls

1. **Container hit areas**: Must call `setSize()` AND `setInteractive()` on Container
2. **Tween conflicts**: Always `killTweensOf(target)` before new tweens
3. **Memory leaks**: Remove event listeners on scene shutdown
4. **Mobile audio**: Call `sound.unlock()` for iOS
5. **Firebase listeners**: Store and call unsubscribe functions
6. **Vite assets**: Use `'assets/image.png'` not `'/assets/image.png'`

## When to Consult Reference Files

- **Setting up project structure** → [architecture.md](references/architecture.md)
- **Building card classes with states** → [cards.md](references/cards.md)
- **Creating premium animations** → [animations.md](references/animations.md)
- **Implementing multiplayer sync** → [multiplayer.md](references/multiplayer.md)
- **Building health bars, timers, modals** → [ui-components.md](references/ui-components.md)
- **Adding AI opponents** → [references/ai-opponent.md](references/ai-opponent.md)
- **Handling disconnections, edge cases** → [edge-cases.md](references/edge-cases.md)
- **Deploying to production** → [deployment.md](references/deployment.md)
- **Finding tutorials and examples** → [resources.md](references/resources.md)
