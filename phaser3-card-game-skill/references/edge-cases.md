# Edge Cases and Error Handling Reference

## Network Edge Cases

### Both Players Lock In Simultaneously

```typescript
// Problem: Race condition when both players lock at exact same moment
// Solution: Use Firebase transactions with server timestamp comparison

async handleSimultaneousLock(gameId: string): Promise<void> {
  const gameRef = ref(database, `games/${gameId}`);
  
  await runTransaction(gameRef, (data) => {
    if (!data) return data;
    
    const p1Time = data.player1?.lockTime || 0;
    const p2Time = data.player2?.lockTime || 0;
    
    // Within 100ms = truly simultaneous, accept both
    if (Math.abs(p1Time - p2Time) < 100) {
      data.phase = 'reveal';
      data.simultaneousLock = true;
    }
    
    return data;
  });
}
```

### Player Disconnects During Reveal Animation

```typescript
// Problem: One player disconnects mid-reveal, game stuck
// Solution: Timeout-based fallback with state recovery

class RevealManager {
  private revealTimeout: number | null = null;
  private REVEAL_TIMEOUT_MS = 10000;

  startReveal(gameId: string): void {
    // Set timeout for stuck reveals
    this.revealTimeout = window.setTimeout(() => {
      this.handleStuckReveal(gameId);
    }, this.REVEAL_TIMEOUT_MS);
  }

  private async handleStuckReveal(gameId: string): Promise<void> {
    console.warn('Reveal stuck, forcing completion');
    
    const gameSnap = await get(ref(database, `games/${gameId}`));
    const gameData = gameSnap.val();
    
    // Force transition to resolution
    await update(ref(database, `games/${gameId}`), {
      phase: 'resolution',
      revealForced: true,
      revealForcedAt: serverTimestamp()
    });
  }

  completeReveal(): void {
    if (this.revealTimeout) {
      clearTimeout(this.revealTimeout);
      this.revealTimeout = null;
    }
  }
}
```

### Network Timeout During Card Selection

```typescript
// Problem: Network drops during selection, player can't lock in
// Solution: Retry mechanism with user feedback

class NetworkRetry {
  private maxRetries = 3;
  private baseDelay = 1000;

  async retryOperation<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number) => void
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        onRetry?.(attempt + 1);
        
        // Exponential backoff
        const delay = this.baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage in game scene
async lockInCard(cardId: string): Promise<void> {
  this.showSpinner('Locking in...');
  
  try {
    await this.networkRetry.retryOperation(
      () => this.gameSync.lockIn(cardId),
      (attempt) => this.showToast(`Retrying... (${attempt}/3)`, 'info')
    );
    
    this.hideSpinner();
    this.showToast('Locked in!', 'success');
  } catch (error) {
    this.hideSpinner();
    this.showModal({
      title: 'Connection Error',
      message: 'Failed to lock in. Check your connection and try again.',
      buttons: [
        { text: 'Retry', onClick: () => this.lockInCard(cardId) },
        { text: 'Cancel', onClick: () => {} }
      ]
    });
  }
}
```

### Stale Data on Reconnection

```typescript
// Problem: Player reconnects with outdated game state
// Solution: Force full state refresh on reconnect

class ReconnectionHandler {
  async handleReconnect(gameId: string): Promise<void> {
    // Force refresh entire game state
    const gameSnap = await get(ref(database, `games/${gameId}`));
    
    if (!gameSnap.exists()) {
      this.handleGameNotFound();
      return;
    }
    
    const gameData = gameSnap.val();
    
    // Check if game is still valid
    if (gameData.status === 'finished') {
      this.handleGameAlreadyEnded(gameData);
      return;
    }
    
    // Sync local state
    this.syncLocalState(gameData);
    
    // Re-subscribe to all listeners
    this.resubscribeListeners(gameId);
    
    // Resume current phase
    this.resumePhase(gameData.phase);
  }

  private syncLocalState(gameData: any): void {
    // Update all local state from server
    this.turnNumber = gameData.turnNumber;
    this.phase = gameData.phase;
    this.playerHealth = gameData[this.playerId].health;
    this.opponentHealth = gameData[this.opponentId].health;
    // ... etc
  }
}
```

### Clock Skew Between Devices

```typescript
// Problem: Different devices have different system clocks
// Solution: Always use server time offset

class ServerTime {
  private offset: number = 0;
  private offsetReady: Promise<void>;

  constructor() {
    this.offsetReady = new Promise(resolve => {
      onValue(ref(database, '.info/serverTimeOffset'), (snap) => {
        this.offset = snap.val() || 0;
        resolve();
      }, { onlyOnce: true });
    });
  }

  async waitForSync(): Promise<void> {
    await this.offsetReady;
  }

  now(): number {
    return Date.now() + this.offset;
  }

  // Always calculate remaining time using server time
  getRemainingTime(startedAt: number, duration: number): number {
    return Math.max(0, duration - (this.now() - startedAt));
  }
}
```

### Mobile Network Switching (WiFi → Cellular)

```typescript
// Problem: Connection drops when switching networks
// Solution: Listen for online/offline events and handle gracefully

class ConnectionMonitor {
  private isOnline: boolean = navigator.onLine;
  private listeners: ((online: boolean) => void)[] = [];

  constructor() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Firebase-specific connection monitoring
    onValue(ref(database, '.info/connected'), (snap) => {
      const connected = snap.val() === true;
      if (connected && !this.isOnline) {
        this.handleOnline();
      } else if (!connected && this.isOnline) {
        this.handleOffline();
      }
    });
  }

  private handleOnline(): void {
    console.log('Connection restored');
    this.isOnline = true;
    this.listeners.forEach(cb => cb(true));
  }

  private handleOffline(): void {
    console.log('Connection lost');
    this.isOnline = false;
    this.listeners.forEach(cb => cb(false));
  }

  onConnectionChange(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
}

// Usage in game scene
this.connectionMonitor.onConnectionChange((online) => {
  if (!online) {
    this.showReconnectionOverlay();
    this.pauseTimer();
  } else {
    this.hideReconnectionOverlay();
    this.refreshGameState();
    this.resumeTimer();
  }
});
```

### Browser Tab Backgrounded

```typescript
// Problem: Timer continues in background, out of sync when returning
// Solution: Recalculate time remaining on visibility change

class VisibilityHandler {
  private onVisible: (() => void) | null = null;
  private onHidden: (() => void) | null = null;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.onHidden?.();
      } else {
        this.onVisible?.();
      }
    });
  }

  setCallbacks(onVisible: () => void, onHidden: () => void): void {
    this.onVisible = onVisible;
    this.onHidden = onHidden;
  }
}

// Usage
this.visibilityHandler.setCallbacks(
  // On visible: resync everything
  () => {
    this.resyncTimer();
    this.refreshGameState();
  },
  // On hidden: pause non-essential updates
  () => {
    this.pauseAnimations();
  }
);
```

## Game Logic Edge Cases

### Both Players Have 0 HP Simultaneously

```typescript
// Problem: Both reach 0 HP in same turn - who wins?
// Solution: Define clear draw condition

interface CombatResult {
  outcome: 'P1_WINS' | 'P2_WINS' | 'DRAW' | 'CONTINUE';
  p1NewHP: number;
  p2NewHP: number;
  reason?: string;
}

function resolveCombat(
  p1Card: ICardData,
  p2Card: ICardData,
  p1HP: number,
  p2HP: number
): CombatResult {
  // Calculate damage
  const p1Damage = calculateDamage(p2Card, /* p1 defenses */);
  const p2Damage = calculateDamage(p1Card, /* p2 defenses */);
  
  const p1NewHP = Math.max(0, p1HP - p1Damage);
  const p2NewHP = Math.max(0, p2HP - p2Damage);
  
  // Check for simultaneous elimination (DRAW)
  if (p1NewHP <= 0 && p2NewHP <= 0) {
    return {
      outcome: 'DRAW',
      p1NewHP: 0,
      p2NewHP: 0,
      reason: 'SIMULTANEOUS_ELIMINATION'
    };
  }
  
  if (p1NewHP <= 0) {
    return { outcome: 'P2_WINS', p1NewHP, p2NewHP };
  }
  
  if (p2NewHP <= 0) {
    return { outcome: 'P1_WINS', p1NewHP, p2NewHP };
  }
  
  return { outcome: 'CONTINUE', p1NewHP, p2NewHP };
}
```

### Infinite Effect Loop Prevention

```typescript
// Problem: Effects trigger other effects in infinite loop
// Solution: Maximum chain depth + processed effect tracking

class EffectResolver {
  private static MAX_CHAIN_DEPTH = 10;
  private processedEffects: Set<string> = new Set();

  resolveEffects(effects: Effect[], state: GameState, depth = 0): GameState {
    // Prevent infinite loops
    if (depth >= EffectResolver.MAX_CHAIN_DEPTH) {
      console.warn('Max effect chain depth reached, truncating');
      return state;
    }
    
    let currentState = state;
    
    for (const effect of effects) {
      // Create unique key for this effect instance
      const effectKey = `${effect.id}-${depth}-${JSON.stringify(effect.target)}`;
      
      // Skip if already processed
      if (this.processedEffects.has(effectKey)) {
        console.warn('Circular effect detected, skipping:', effectKey);
        continue;
      }
      
      this.processedEffects.add(effectKey);
      
      // Apply effect
      currentState = this.applyEffect(effect, currentState);
      
      // Check for triggered effects
      const triggeredEffects = this.checkTriggers(currentState);
      if (triggeredEffects.length > 0) {
        currentState = this.resolveEffects(triggeredEffects, currentState, depth + 1);
      }
    }
    
    return currentState;
  }

  reset(): void {
    this.processedEffects.clear();
  }
}
```

### Empty Deck Scenarios

```typescript
// Problem: Player tries to draw but deck is empty
// Solution: Multiple fallback strategies

class DeckManager {
  draw(count: number): Card[] {
    const drawn: Card[] = [];
    
    for (let i = 0; i < count; i++) {
      // Try main deck
      if (this.deck.length > 0) {
        drawn.push(this.deck.pop()!);
        continue;
      }
      
      // Try reshuffling discard pile
      if (this.discardPile.length > 0) {
        this.reshuffleDiscard();
        if (this.deck.length > 0) {
          drawn.push(this.deck.pop()!);
          continue;
        }
      }
      
      // Deck exhaustion - game rule decision
      console.warn('Deck fully exhausted');
      this.onDeckExhausted?.();
      break;
    }
    
    return drawn;
  }

  private reshuffleDiscard(): void {
    this.deck = [...this.discardPile];
    this.discardPile = [];
    this.shuffle();
    this.onReshuffled?.();
  }
}
```

### Timer Expires During Animation

```typescript
// Problem: Timer runs out while card flip animation is playing
// Solution: Lock timer expiration until safe state

class SafeTimer {
  private expired: boolean = false;
  private locked: boolean = false;
  private pendingExpiration: (() => void) | null = null;

  onExpire(callback: () => void): void {
    if (this.locked) {
      // Queue expiration for when unlocked
      this.pendingExpiration = callback;
      this.expired = true;
    } else {
      callback();
      this.expired = true;
    }
  }

  lock(reason: string): void {
    console.log('Timer locked:', reason);
    this.locked = true;
  }

  unlock(): void {
    this.locked = false;
    
    // Execute pending expiration
    if (this.pendingExpiration) {
      this.pendingExpiration();
      this.pendingExpiration = null;
    }
  }
}

// Usage
async function playCardAnimation(card: Card): Promise<void> {
  this.safeTimer.lock('card-animation');
  
  try {
    await card.flip();
    await this.moveToCenter(card);
  } finally {
    this.safeTimer.unlock();
  }
}
```

### Miner Generates Attack on Same Turn It Dies

```typescript
// Problem: Miner should generate attack before dying
// Solution: Define clear order of operations

interface TurnResolution {
  phase: 'MINER_GENERATE' | 'COMBAT' | 'MINER_DEATH' | 'WALL_DECAY' | 'CLEANUP';
}

class TurnResolver {
  resolveTurn(state: GameState, p1Card: Card, p2Card: Card): GameState {
    let currentState = state;
    
    // Phase 1: Miners generate attacks FIRST
    currentState = this.processMinerGeneration(currentState);
    
    // Phase 2: Combat resolution
    currentState = this.processCombat(currentState, p1Card, p2Card);
    
    // Phase 3: Check miner death (from base damage)
    currentState = this.processMinerDeath(currentState);
    
    // Phase 4: Wall decay
    currentState = this.processWallDecay(currentState);
    
    // Phase 5: Cleanup
    currentState = this.processCleanup(currentState);
    
    return currentState;
  }

  private processMinerGeneration(state: GameState): GameState {
    // Miners generate their attacks before any other resolution
    for (const miner of state.activeMiners) {
      const attack = this.generateMinerAttack(miner);
      state.pendingAttacks.push(attack);
    }
    return state;
  }

  private processMinerDeath(state: GameState): GameState {
    // Miners die if base was damaged this turn
    if (state.baseDamagedThisTurn) {
      for (const miner of state.activeMiners) {
        if (miner.ownerId === state.damagedPlayerId) {
          miner.destroy();
        }
      }
    }
    return state;
  }
}
```

### Wall Destroyed While Attack Is Mid-Air

```typescript
// Problem: Visual shows attack hitting destroyed wall
// Solution: Re-evaluate target when attack lands

class AttackResolver {
  async resolveAttack(attack: Attack, state: GameState): Promise<void> {
    // Start attack animation
    const attackAnimation = this.startAttackAnimation(attack);
    
    // Wait for animation to reach target
    await attackAnimation.reachTarget();
    
    // Re-evaluate target at impact moment
    const currentTarget = this.evaluateTarget(attack, state);
    
    if (currentTarget.type === 'wall' && !currentTarget.wall.isAlive) {
      // Wall was destroyed, attack passes through to base
      currentTarget.type = 'base';
    }
    
    // Apply damage to current target
    await this.applyDamage(attack, currentTarget);
    
    // Complete animation
    await attackAnimation.complete();
  }
}
```

## UI Edge Cases

### Extremely Long Card Names

```typescript
// Problem: Card names overflow their containers
// Solution: Text truncation and scaling

function createCardNameText(
  scene: Phaser.Scene,
  name: string,
  maxWidth: number
): Phaser.GameObjects.Text {
  const text = scene.add.text(0, 0, name, {
    fontSize: '14px',
    fontFamily: 'Arial',
    color: '#ffffff',
    wordWrap: { width: maxWidth }
  });
  
  // If still too wide, scale down
  if (text.width > maxWidth) {
    const scale = maxWidth / text.width;
    text.setScale(Math.max(scale, 0.7)); // Don't go below 70%
  }
  
  // If multi-line and too tall, truncate
  if (text.height > 40) {
    const truncated = name.substring(0, 20) + '...';
    text.setText(truncated);
  }
  
  return text;
}
```

### Many Cards in Hand (10+)

```typescript
// Problem: Hand layout breaks with too many cards
// Solution: Adaptive layout with minimum spacing

class Hand {
  private static readonly MIN_CARD_SPACING = 30;
  private static readonly MIN_CARD_SCALE = 0.6;

  updateLayout(): void {
    const cardCount = this.cards.length;
    
    // Calculate available width
    const availableWidth = this.maxWidth - this.padding * 2;
    
    // Calculate ideal spacing
    let spacing = availableWidth / Math.max(cardCount - 1, 1);
    let scale = 1;
    
    // If spacing too tight, reduce card scale
    if (spacing < Hand.MIN_CARD_SPACING) {
      spacing = Hand.MIN_CARD_SPACING;
      scale = Math.max(
        Hand.MIN_CARD_SCALE,
        availableWidth / ((cardCount - 1) * spacing + CARD_WIDTH)
      );
    }
    
    // Position cards
    const totalWidth = (cardCount - 1) * spacing;
    const startX = this.centerX - totalWidth / 2;
    
    this.cards.forEach((card, index) => {
      card.setPosition(startX + index * spacing, this.baseY);
      card.setScale(scale);
      card.setDepth(index);
    });
  }
}
```

### Rapid Repeated Taps

```typescript
// Problem: User taps rapidly, causing duplicate actions
// Solution: Debounce and action queue

class TapDebouncer {
  private lastTapTime: number = 0;
  private debounceMs: number = 200;
  private processingAction: boolean = false;

  async handleTap(action: () => Promise<void>): Promise<boolean> {
    const now = Date.now();
    
    // Ignore if too soon after last tap
    if (now - this.lastTapTime < this.debounceMs) {
      return false;
    }
    
    // Ignore if still processing previous action
    if (this.processingAction) {
      return false;
    }
    
    this.lastTapTime = now;
    this.processingAction = true;
    
    try {
      await action();
      return true;
    } finally {
      this.processingAction = false;
    }
  }
}

// Usage
card.on('pointerdown', async () => {
  const handled = await this.tapDebouncer.handleTap(async () => {
    await this.selectCard(card);
  });
  
  if (!handled) {
    console.log('Tap ignored (debounced)');
  }
});
```

### Device Rotation Mid-Game

```typescript
// Problem: Layout breaks on orientation change
// Solution: Responsive layout recalculation

class ResponsiveLayout {
  constructor(scene: Phaser.Scene) {
    // Listen for resize
    scene.scale.on('resize', this.handleResize, this);
  }

  handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    
    // Recalculate all positions
    this.updateLayout(width, height);
    
    // Animate elements to new positions (optional)
    this.animateToNewPositions();
  }

  private updateLayout(width: number, height: number): void {
    const isPortrait = height > width;
    
    if (isPortrait) {
      this.applyPortraitLayout(width, height);
    } else {
      this.applyLandscapeLayout(width, height);
    }
  }
}
```

## Error Handling Patterns

### Global Error Boundary

```typescript
// src/utils/ErrorBoundary.ts
export class GameErrorHandler {
  private scene: Phaser.Scene;
  private errorCount: number = 0;
  private maxErrors: number = 5;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers(): void {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, 'window.onerror');
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, 'unhandledrejection');
    });
  }

  handleError(error: Error, context: string): void {
    console.error(`[${context}]`, error);
    this.errorCount++;
    
    // Report to error tracking service
    this.reportError(error, context);
    
    // Show user-friendly message
    if (this.errorCount < this.maxErrors) {
      this.showErrorToast('Something went wrong. The game will try to recover.');
    } else {
      this.showFatalError();
    }
    
    // Attempt recovery
    this.attemptRecovery(context);
  }

  private reportError(error: Error, context: string): void {
    // Sentry, LogRocket, etc.
    if (typeof Sentry !== 'undefined') {
      Sentry.captureException(error, {
        tags: { context, scene: this.scene.scene.key }
      });
    }
  }

  private attemptRecovery(context: string): void {
    // Context-specific recovery
    switch (context) {
      case 'animation':
        this.scene.tweens.killAll();
        break;
      case 'firebase':
        this.reconnectFirebase();
        break;
      default:
        // General recovery - restart current scene
        this.scene.scene.restart();
    }
  }

  private showFatalError(): void {
    new Modal(this.scene, {
      title: 'Error',
      message: 'Too many errors occurred. Please refresh the page.',
      buttons: [
        { text: 'Refresh', onClick: () => window.location.reload() }
      ]
    });
  }
}
```

### Graceful Degradation

```typescript
// Feature detection and fallbacks
class FeatureDetector {
  static hasWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  static hasWebAudio(): boolean {
    return 'AudioContext' in window || 'webkitAudioContext' in window;
  }

  static hasTouchSupport(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}

// Usage in game config
const renderType = FeatureDetector.hasWebGL() ? Phaser.WEBGL : Phaser.CANVAS;
const config = {
  type: renderType,
  audio: {
    disableWebAudio: !FeatureDetector.hasWebAudio()
  }
};
```

### Retry Patterns

```typescript
// Exponential backoff retry
async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        onRetry?.(attempt + 1, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```
