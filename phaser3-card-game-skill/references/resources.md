# Resources and Learning Path Reference

## Top 25 Most Valuable Resources (Ranked)

### Official Documentation
1. **Phaser 3 Official Docs** - docs.phaser.io/phaser/concepts
   - Core concepts, API reference, guides
   - Start here for any Phaser question

2. **Phaser 3 API Reference** - newdocs.phaser.io/docs/3.80.0
   - Complete API documentation
   - Use for specific method signatures

3. **Phaser + Vite + TypeScript Template** - github.com/phaserjs/template-vite-ts
   - Official starter template
   - Always start new projects from this

4. **Firebase Realtime Database Docs** - firebase.google.com/docs/database
   - Complete RTDB documentation
   - Security rules, best practices

5. **Firebase Security Rules** - firebase.google.com/docs/database/security
   - Essential for multiplayer security
   - Rule syntax and examples

### Plugin Ecosystems
6. **Rex Rainbow Notes** - rexrainbow.github.io/phaser3-rex-notes
   - 200+ plugins for Phaser 3
   - UI components, effects, utilities
   - **Key plugins**: rexUI, PerspectiveCard, Anchor

7. **Phaser Labs Examples** - labs.phaser.io
   - 2000+ official examples
   - Searchable by category
   - Copy-paste ready code

### Tutorials and Guides
8. **Ourcade Blog** - blog.ourcade.co
   - High-quality Phaser 3 tutorials
   - TypeScript-focused
   - Card game patterns

9. **Shakuro Phaser Tutorial** - shakuro.com/blog/phaser-js-tutorial
   - Step-by-step game building
   - Good for beginners

10. **Game Dev Academy Phaser** - gamedevacademy.org/phaser-tutorial
    - Comprehensive course
    - Multiple game types covered

### Card Game Specific
11. **boardgame.io** - github.com/boardgameio/boardgame.io
    - Turn-based game framework
    - State management patterns
    - Multiplayer architecture

12. **TypeDeck Library** - github.com/mitch-b/typedeck
    - TypeScript card game utilities
    - Deck, hand, discard pile classes

13. **Phaser Solitaire Tutorial** - devshareacademy.com
    - 8-part TypeScript card game series
    - Drag-drop, animations, layouts

### Multiplayer Architecture
14. **Colyseus** - colyseus.io
    - Real-time multiplayer framework
    - Alternative to Firebase for action games
    - Phaser integration guide

15. **Nakama** - heroiclabs.com/nakama
    - Open-source game server
    - Matchmaking, leaderboards, auth

16. **Firebase Blog: Loteria Case Study** - firebase.blog/posts/2020/01/google-loteria
    - Real-world card game with Firebase
    - Architecture decisions

### Performance and Optimization
17. **TexturePacker** - codeandweb.com/texturepacker
    - Sprite atlas creation
    - Phaser 3 export format

18. **Free Atlas Packer** - gammafp.github.io/atlas-packer-phaser
    - Browser-based alternative
    - Phaser-compatible output

19. **Phaser Performance Tips** - phaser.io/tutorials/making-your-first-phaser-3-game
    - Official optimization guide
    - Mobile considerations

### Community Resources
20. **Phaser Discord** - discord.gg/phaser
    - Active community support
    - Quick answers from experts

21. **Phaser GitHub Discussions** - github.com/photonstorm/phaser/discussions
    - Official Q&A forum
    - Feature requests, bug reports

### Design and Assets
22. **Kenney Assets** - kenney.nl
    - Free game assets
    - Cards, UI, icons

23. **Game Icons** - game-icons.net
    - 4000+ free icons
    - SVG format, customizable

24. **Phaser Particle Editor** - github.com/koreezgames/phaser3-particle-editor
    - Visual particle design
    - Export to Phaser format

### Reference Books
25. **Game Programming Patterns** - gameprogrammingpatterns.com
    - Free online book
    - State machines, observers, object pools

---

## Learning Path (12 Weeks)

### Phase 1: Foundation (Weeks 1-2)

**Week 1: Setup and Basics**
- [ ] Clone phaserjs/template-vite-ts
- [ ] Understand project structure
- [ ] Create Boot and Preload scenes
- [ ] Load images and audio
- [ ] Implement scene transitions

**Week 2: Card Fundamentals**
- [ ] Create Card class extending Container
- [ ] Implement card face/back toggle
- [ ] Add hover effects
- [ ] Build basic hand layout
- [ ] Handle card selection

**Resources for Phase 1:**
```
- docs.phaser.io/phaser/concepts/scenes
- docs.phaser.io/phaser/concepts/game-objects
- labs.phaser.io (search: container, input)
```

### Phase 2: Animations (Weeks 3-4)

**Week 3: Core Animations**
- [ ] Card flip animation
- [ ] Deal from deck animation
- [ ] Play to center animation
- [ ] Hand reorganization

**Week 4: Effects and Polish**
- [ ] Particle effects per element
- [ ] Screen shake on damage
- [ ] Damage number popups
- [ ] Victory/defeat sequences

**Resources for Phase 2:**
```
- docs.phaser.io/phaser/concepts/tweens
- rexrainbow.github.io/phaser3-rex-notes/docs/site/particles
- labs.phaser.io (search: tweens, particles)
```

### Phase 3: Game Logic (Weeks 5-6)

**Week 5: State Management**
- [ ] Implement GameState class
- [ ] Build TurnStateMachine
- [ ] Create typed event system
- [ ] Handle turn phases

**Week 6: Combat System**
- [ ] Implement card type interactions
- [ ] Build damage calculation
- [ ] Handle walls and miners
- [ ] Win/lose/draw conditions

**Resources for Phase 3:**
```
- gameprogrammingpatterns.com/state.html
- gameprogrammingpatterns.com/event-queue.html
```

### Phase 4: UI Components (Weeks 7-8)

**Week 7: Core UI**
- [ ] Health bars with animation
- [ ] Turn timer (circular)
- [ ] Action buttons
- [ ] Phase indicators

**Week 8: Dialogs and Feedback**
- [ ] Modal system
- [ ] Toast notifications
- [ ] Loading spinners
- [ ] Connection status

**Resources for Phase 4:**
```
- rexrainbow.github.io/phaser3-rex-notes/docs/site/ui-overview
- npm: phaser3-rex-plugins (rexUI)
```

### Phase 5: Multiplayer (Weeks 9-10)

**Week 9: Firebase Integration**
- [ ] Set up Firebase project
- [ ] Implement anonymous auth
- [ ] Create room system
- [ ] Real-time game sync

**Week 10: Sync and Security**
- [ ] Synchronized timer
- [ ] Commit-reveal pattern
- [ ] Security rules
- [ ] Reconnection handling

**Resources for Phase 5:**
```
- firebase.google.com/docs/database/web/start
- firebase.google.com/docs/database/security
- firebase.google.com/docs/database/web/offline-capabilities
```

### Phase 6: Polish and Deploy (Weeks 11-12)

**Week 11: AI and Testing**
- [ ] Implement AI opponent
- [ ] Unit tests for core logic
- [ ] E2E tests for game flow
- [ ] Performance profiling

**Week 12: Production**
- [ ] Optimize assets
- [ ] Configure Vercel/Netlify
- [ ] Set up error tracking
- [ ] Deploy and monitor

**Resources for Phase 6:**
```
- vitest.dev
- sentry.io/platforms/javascript
- vercel.com/docs
```

---

## Quick Reference Cards

### Phaser Tween Easings
```
Linear        - Constant speed
Quad.easeIn   - Slow start
Quad.easeOut  - Slow end
Quad.easeInOut - Slow start and end
Back.easeOut  - Overshoot and settle
Bounce.easeOut - Bouncy landing
Elastic.easeOut - Spring effect
Cubic.easeOut - Strong deceleration
Sine.easeInOut - Natural wave
```

### Firebase RTDB Patterns
```javascript
// Read once
const snap = await get(ref(db, 'games/123'));

// Listen for changes
const unsub = onValue(ref(db, 'games/123'), (snap) => {});

// Write
await set(ref(db, 'games/123'), data);

// Update (merge)
await update(ref(db, 'games/123'), { phase: 'reveal' });

// Transaction (atomic)
await runTransaction(ref(db, 'games/123'), (data) => {
  data.count++;
  return data;
});

// Server timestamp
import { serverTimestamp } from 'firebase/database';
{ updatedAt: serverTimestamp() }

// On disconnect
onDisconnect(ref(db, 'games/123/connected')).set(false);
```

### Common Phaser Patterns
```typescript
// Safe tween (kill existing first)
scene.tweens.killTweensOf(target);
scene.tweens.add({ targets: target, ... });

// Promise-based tween
await new Promise(resolve => {
  scene.tweens.add({
    targets: target,
    onComplete: () => resolve()
  });
});

// Container with hit area
container.setSize(width, height);
container.setInteractive({ useHandCursor: true });

// Scene communication
this.scene.get('UIScene').events.emit('update-health', value);

// Asset path (Vite)
'assets/image.png'  // ✓ correct
'/assets/image.png' // ✗ wrong
```

### TypeScript Game Types
```typescript
// Union types for game states
type TurnPhase = 'SELECTION' | 'LOCK_IN' | 'REVEAL' | 'RESOLUTION';
type CardState = 'IN_DECK' | 'IN_HAND' | 'PLAYED' | 'DISCARDED';

// Typed events
interface GameEvents {
  'card:played': { card: Card; player: string };
  'turn:end': { turnNumber: number };
}

// Generic typed emitter
class TypedEmitter<T extends Record<string, any>> {
  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): void;
  emit<K extends keyof T>(event: K, data: T[K]): void;
}
```

---

## Troubleshooting Quick Fixes

### Container not receiving clicks
```typescript
// Must set size AND interactive
container.setSize(width, height);
container.setInteractive();
```

### Tweens conflicting
```typescript
// Always kill before new tween
scene.tweens.killTweensOf(target);
```

### Audio not playing on mobile
```typescript
// Unlock audio on first interaction
this.sound.unlock();

// Or handle AudioContext manually
this.input.once('pointerdown', () => {
  if (this.sound.context.state === 'suspended') {
    this.sound.context.resume();
  }
});
```

### Firebase listeners not cleaning up
```typescript
// Store unsubscribe functions
private listeners: (() => void)[] = [];

// In setup
this.listeners.push(onValue(ref, callback));

// In cleanup
shutdown() {
  this.listeners.forEach(unsub => unsub());
}
```

### Scene memory leaks
```typescript
// Always clean up in shutdown
shutdown() {
  this.tweens.killAll();
  this.time.removeAllEvents();
  this.input.removeAllListeners();
  this.events.removeAllListeners();
}
```

### Assets not loading in production
```typescript
// Use relative paths without leading slash
this.load.image('card', 'assets/cards/card.png'); // ✓
this.load.image('card', '/assets/cards/card.png'); // ✗
```

---

## Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

## Recommended npm Packages

```json
{
  "dependencies": {
    "phaser": "^3.80.0",
    "firebase": "^10.7.0",
    "phaser3-rex-plugins": "^1.80.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0",
    "terser": "^5.26.0"
  }
}
```
