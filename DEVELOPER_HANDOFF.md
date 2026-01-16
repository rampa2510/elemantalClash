# Elemental Clash - Complete Developer Handoff Guide

> **Version**: 1.0.0
> **Last Updated**: January 2026
> **Status**: Single-player complete, Multiplayer ~40% complete

---

## Table of Contents

1. [Quick Start](#part-1-quick-start)
2. [Game Overview](#part-2-game-overview)
3. [Architecture Deep Dive](#part-3-architecture-deep-dive)
4. [What's Built](#part-4-whats-built)
5. [Multiplayer - Current State](#part-5-multiplayer---current-state)
6. [Visual Effects System](#part-6-visual-effects-system)
7. [Audio System](#part-7-audio-system)
8. [Backend Requirements](#part-8-backend-requirements)
9. [Expansion Roadmap](#part-9-expansion-roadmap-aaa-vision)
10. [Code Patterns & Extension Guide](#part-10-code-patterns--extension-guide)
11. [Known Issues](#part-11-known-issues--fixes-needed)
12. [File Reference](#part-12-complete-file-reference)

---

# PART 1: QUICK START

## Prerequisites

- Node.js 18+ (recommended: 20 LTS)
- npm 9+ or yarn
- Modern browser (Chrome, Firefox, Safari, Edge)

## Setup

```bash
# Clone the repository
git clone <repository-url>
cd Elemental_Clash

# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
# http://localhost:3000 (or next available port)
```

## Build for Production

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview

# Output will be in dist/ folder
```

## Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Phaser 3** | Game framework | 3.70.0 |
| **TypeScript** | Type safety | 5.3.0 |
| **Vite** | Build tool & dev server | 5.0.0 |
| **PeerJS** | P2P WebRTC networking | 1.5.5 |
| **Howler** | Audio playback | 2.2.4 |
| **Tone.js** | Procedural audio synthesis | 15.1.22 |

## Hosting the Frontend

### Option 1: Vercel (Recommended)
```bash
npm run build
# Drag dist/ folder to vercel.com/new
# Or connect GitHub repo for auto-deploy
```

### Option 2: Netlify
```bash
npm run build
# Drag dist/ folder to app.netlify.com/drop
# Or connect GitHub for CI/CD
```

### Option 3: GitHub Pages
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

# PART 2: GAME OVERVIEW

## What is Elemental Clash?

Elemental Clash is a **turn-based 1v1 card battle game** where players draft elemental cards and compete to reduce their opponent's HP to zero. Think of it as a blend of:

- **Hearthstone** (card-based combat)
- **Clash Royale** (real-time element interactions)
- **Rock-Paper-Scissors** (simultaneous card selection)

## Core Gameplay Loop

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. DRAFT PHASE                                             │
│     └─> Both players draft 6 cards from shared pool         │
│         (5 rounds, 2 cards shown per round)                 │
│                                                             │
│  2. BATTLE PHASE (repeat until winner)                      │
│     └─> Each turn:                                          │
│         a) Both players select a card (10 second timer)     │
│         b) Cards revealed simultaneously                    │
│         c) Combat resolves (attacks, walls, deflections)    │
│         d) Miners generate energy                           │
│         e) Check for winner (HP <= 0)                       │
│                                                             │
│  3. GAME OVER                                               │
│     └─> Winner declared, stats updated                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Card Types

### 1. Attacks (Damage Cards)
Deal direct damage to opponent's HP or walls.

| Element | Damage | HP | Cost | Special |
|---------|--------|-----|------|---------|
| Fire | 15 | 5 | 3 | High damage, low HP |
| Water | 10 | 10 | 3 | Balanced |
| Earth | 8 | 15 | 4 | Tanky |
| Air | 6 | 6 | 2 | Fast, cheap |

### 2. Walls (Defense Cards)
Block incoming attacks. Must be destroyed before dealing HP damage.

| Element | HP | Cost | Special |
|---------|-----|------|---------|
| Fire Wall | 15 | 3 | - |
| Water Wall | 20 | 3 | - |
| Earth Wall | 30 | 4 | Highest HP |
| Air Wall | 10 | 2 | Cheapest |

### 3. Deflection Cards
Counter projectile attacks, reflecting damage back.

### 4. Projectiles
Ignore walls, deal chip damage directly to HP.

### 5. Miners
Generate energy each turn. More energy = stronger cards.

| Type | Cost | Energy/Turn |
|------|------|-------------|
| Basic Miner | 2 | +1 |
| Advanced Miner | 4 | +2 |

## Win Conditions

- **Victory**: Reduce opponent's HP to 0
- **Forfeit**: Opponent disconnects (multiplayer)
- **Timeout**: Time expires with HP advantage

---

# PART 3: ARCHITECTURE DEEP DIVE

## Module Organization

```
src/
├── core/           # Game logic (engine, combat, cards)
│   ├── GameEngine.ts         # Main game orchestrator
│   ├── TurnManager.ts        # Turn phases, timer, hot-seat
│   ├── CombatResolver.ts     # Damage calculation
│   ├── DraftManager.ts       # Card drafting logic
│   ├── DeckManager.ts        # Player deck management
│   ├── MinerManager.ts       # Energy miner lifecycle
│   ├── WallManager.ts        # Wall HP, targeting
│   ├── EnergySystem.ts       # Energy generation
│   ├── AIPlayer.ts           # AI opponent
│   ├── CardFactory.ts        # Card instantiation
│   ├── SceneKeys.ts          # Scene identifiers
│   ├── ObjectPool.ts         # Object pooling
│   ├── TextureAtlas.ts       # Texture management
│   └── TweenRegistry.ts      # Animation registry
│
├── scenes/         # Phaser scenes (screens)
│   ├── BootScene.ts          # Initial boot
│   ├── PreloadScene.ts       # Asset loading
│   ├── MenuScene.ts          # Main menu
│   ├── TutorialScene.ts      # Interactive tutorial
│   ├── DraftScene.ts         # Card drafting
│   ├── GameScene.ts          # Main gameplay
│   ├── GameOverScene.ts      # Win/lose screen
│   ├── LobbyScene.ts         # MP: Host waiting room
│   ├── JoinScene.ts          # MP: Invitee entry
│   ├── ConnectingScene.ts    # MP: Connection handshake
│   └── BaseScene.ts          # Shared scene utilities
│
├── network/        # Multiplayer networking
│   ├── NetworkManager.ts     # PeerJS connection management
│   ├── SessionManager.ts     # Session IDs, invite links
│   ├── MultiplayerGameCoordinator.ts  # Game/network bridge
│   ├── types.ts              # Network message types
│   └── index.ts              # Module exports
│
├── state/          # State management
│   ├── GameStateManager.ts   # Game state snapshots
│   └── PlayerState.ts        # Player data
│
├── ui/             # UI components
│   ├── components/           # Reusable UI elements
│   │   ├── Button.ts
│   │   ├── Toast.ts
│   │   ├── Modal.ts
│   │   ├── HealthBar.ts
│   │   ├── CircularTimer.ts
│   │   ├── TipCarousel.ts
│   │   ├── StatsDisplay.ts
│   │   ├── CardGallery.ts
│   │   ├── DifficultySelector.ts
│   │   ├── PlayerNameInput.ts
│   │   ├── GameSetupModal.ts
│   │   ├── ResourceBar.ts
│   │   ├── DamageNumber.ts
│   │   ├── SafeAreaHandler.ts
│   │   └── index.ts
│   ├── AnimationManager.ts   # UI animations
│   ├── InputManager.ts       # Input handling
│   └── SettingsPanel.ts      # Settings UI
│
├── effects/        # Visual effects
│   ├── ParticleManager.ts    # Element particles
│   ├── ParticleLOD.ts        # LOD scaling
│   ├── HitstopManager.ts     # Frame freeze on impact
│   ├── CameraFX.ts           # Screenshake, zoom
│   ├── ImpactOrchestrator.ts # Effect coordination
│   ├── CardIdleAnimator.ts   # Card hover/glow
│   └── AnimatedBackground.ts # Parallax background
│
├── shaders/        # Post-processing
│   └── PostFXPipeline.ts     # Bloom, vignette
│
├── audio/          # Audio system
│   ├── AudioManager.ts       # Sound playback
│   ├── MusicManager.ts       # Background music
│   ├── ProceduralSFX.ts      # Generated sounds
│   └── index.ts
│
├── managers/       # Global managers
│   ├── ThemeManager.ts       # Color themes
│   └── SettingsManager.ts    # Settings persistence
│
├── config/         # Configuration
│   ├── constants.ts          # Game constants
│   ├── cardDefinitions.ts    # Card data
│   ├── gameConfig.ts         # Phaser config
│   └── themes.ts             # Color themes
│
├── types/          # TypeScript types
│   ├── cards.ts              # Card types
│   ├── gameState.ts          # State types
│   ├── player.ts             # Player types
│   ├── draft.ts              # Draft types
│   ├── events.ts             # Event types
│   ├── settings.ts           # Settings types
│   └── index.ts
│
├── utils/          # Utilities
│   ├── EventEmitter.ts       # Event system
│   ├── StatsManager.ts       # Player statistics
│   ├── RandomGenerator.ts    # Seeded RNG
│   ├── TapDebouncer.ts       # Input debouncing
│   └── VisibilityHandler.ts  # Tab visibility
│
└── main.ts         # Entry point
```

## Scene Flow Diagram

```
                    ┌──────────────┐
                    │  BootScene   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ PreloadScene │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
          ┌─────────│  MenuScene   │─────────┐
          │         └──────┬───────┘         │
          │                │                 │
    ┌─────▼─────┐   ┌──────▼───────┐   ┌─────▼─────┐
    │ Tutorial  │   │  DraftScene  │   │  Lobby    │ (Host)
    │   Scene   │   └──────┬───────┘   │   Scene   │
    └─────┬─────┘          │           └─────┬─────┘
          │         ┌──────▼───────┐         │
          │         │  GameScene   │   ┌─────▼─────┐
          │         └──────┬───────┘   │   Join    │ (Client)
          │                │           │   Scene   │
          │         ┌──────▼───────┐   └─────┬─────┘
          │         │  GameOver    │         │
          │         │    Scene     │   ┌─────▼─────┐
          │         └──────┬───────┘   │Connecting │
          │                │           │   Scene   │
          └────────────────┴───────────┴─────┬─────┘
                                             │
                                      ┌──────▼───────┐
                                      │  DraftScene  │ (Multiplayer)
                                      └──────────────┘
```

## Event System

The game uses a centralized event emitter (`src/utils/EventEmitter.ts`) for decoupled communication:

```typescript
import { gameEvents } from '../utils/EventEmitter';

// Emit an event
gameEvents.emit('CARD_PLAYED', { cardId: 'fire_attack', playerId: 'player1' });

// Listen for an event (returns cleanup function)
const cleanup = gameEvents.on('CARD_PLAYED', (data) => {
  console.log(`${data.playerId} played ${data.cardId}`);
});

// Clean up when done
cleanup();
```

### Key Events

| Event | Payload | Description |
|-------|---------|-------------|
| `TURN_START` | `{ turnNumber, activePlayer }` | New turn begins |
| `CARD_SELECTED` | `{ cardInstance, playerId }` | Card selected |
| `CARD_LOCKED` | `{ cardInstance, playerId }` | Card locked in |
| `COMBAT_START` | `{ player1Card, player2Card }` | Combat phase |
| `DAMAGE_DEALT` | `{ targetId, amount, element }` | Damage applied |
| `WALL_DESTROYED` | `{ wallId, playerId }` | Wall HP hit 0 |
| `MINER_PLACED` | `{ minerId, playerId }` | Miner deployed |
| `ENERGY_CHANGED` | `{ playerId, amount, total }` | Energy updated |
| `GAME_OVER` | `{ winnerId, reason }` | Game ended |
| `NETWORK_CONNECTED` | `{}` | P2P connected |
| `NETWORK_DISCONNECTED` | `{}` | P2P lost |
| `OPPONENT_JOINED` | `{}` | Opponent connected |
| `OPPONENT_LEFT` | `{}` | Opponent disconnected |
| `BOTH_DRAFTS_COMPLETE` | `{ myDeck, opponentDeck }` | Both drafted |

## State Management

Game state is managed by `GameStateManager` with snapshot capability:

```typescript
import { gameStateManager } from '../state/GameStateManager';

// Create snapshot (for sync)
const snapshot = gameStateManager.createSnapshot();

// Restore from snapshot (client receives from host)
gameStateManager.restoreFromSnapshot(snapshot);

// Get current state
const state = gameStateManager.getState();
```

---

# PART 4: WHAT'S BUILT

## Feature Completion Status

| Feature | Status | Notes |
|---------|--------|-------|
| Core Game Engine | 100% | Fully functional |
| Card Combat System | 100% | All card types working |
| Draft System | 100% | 5-round draft complete |
| AI Opponent | 100% | 3 difficulty levels |
| Tutorial | 100% | Interactive walkthrough |
| Visual Effects | 90% | Particles, screenshake, hitstop |
| Audio System | 85% | Procedural SFX, music manager |
| UI Components | 100% | All components built |
| Settings/Themes | 100% | Dark/light, volume, name |
| Stats Tracking | 100% | LocalStorage persistence |
| Multiplayer Network Layer | 100% | PeerJS P2P working |
| Multiplayer Scenes | 100% | Lobby, Join, Connecting |
| Multiplayer Game Integration | 40% | **Needs DraftScene & GameScene sync** |

## Core Game Files

### GameEngine.ts
The main orchestrator that coordinates all game systems:
- Manages turn flow
- Coordinates combat resolution
- Handles win condition checks
- Bridges all subsystems

### TurnManager.ts
Controls turn phases and timing:
- **Selection Phase**: Players choose cards
- **Lock Phase**: Cards committed
- **Resolution Phase**: Combat plays out
- Supports `isHotSeat` mode (true = pass device, false = online)

### CombatResolver.ts
Calculates combat outcomes:
- Attack vs Wall interactions
- Projectile damage (bypasses walls)
- Deflection counters
- Element bonuses (future expansion)

---

# PART 5: MULTIPLAYER - CURRENT STATE

## Architecture: Host-Authoritative P2P

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   PLAYER 1 (HOST)              PLAYER 2 (CLIENT)            │
│   ┌─────────────────┐          ┌─────────────────┐          │
│   │ Full Game State │          │ Mirror State    │          │
│   │ Combat Logic    │          │ Receives Updates│          │
│   │ Authoritative   │◄────────►│ Sends Actions   │          │
│   └─────────────────┘  PeerJS  └─────────────────┘          │
│                        WebRTC                                │
│                                                             │
│   Host is source of truth for:                              │
│   - Combat resolution                                       │
│   - Turn timing                                             │
│   - Win conditions                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## What's Working

### NetworkManager.ts (Complete)
- PeerJS initialization (host/client modes)
- Connection lifecycle management
- Heartbeat system (ping/pong every 3s)
- Reconnection logic (3 attempts, exponential backoff)
- Message deduplication
- Error handling with specific error types

### SessionManager.ts (Complete)
- 6-character session ID generation
- Invite link creation with session ID
- URL parsing for join intent
- Clipboard copy functionality

### MultiplayerGameCoordinator.ts (Complete)
- Draft phase sync (DRAFT_COMPLETE message)
- Gameplay action broadcasting (SELECT_CARD, LOCK_CARD)
- State update handling (HOST_STATE_UPDATE)
- Game event forwarding (GAME_EVENT)

### Scenes (Complete)
- **LobbyScene**: Host waiting room with tips, stats, card gallery
- **JoinScene**: Invitee entry with tutorial option
- **ConnectingScene**: Connection handshake with spinner

## What Needs Integration

### DraftScene Multiplayer (~30 lines of code)

Current state: Draft works for single player only.

**Required changes in DraftScene.ts:**

```typescript
// Add to create() method
if (this.isMultiplayer) {
  multiplayerCoordinator.initializeDraftPhase(this.isHost);

  // Listen for opponent draft completion
  gameEvents.on('OPPONENT_DRAFT_COMPLETE', () => {
    this.showWaitingOverlay(false); // Hide if showing
  });

  gameEvents.on('BOTH_DRAFTS_COMPLETE', (data) => {
    this.startGame(data.myDeck, data.opponentDeck);
  });
}

// Add to handleDraftComplete() method
if (this.isMultiplayer) {
  multiplayerCoordinator.sendDraftComplete(this.playerDeck);

  if (!multiplayerCoordinator.isOpponentDraftComplete()) {
    this.showWaitingOverlay(true); // "Waiting for opponent..."
  }
}
```

### GameScene Multiplayer (~50 lines of code)

Current state: Game works for single player and hot-seat only.

**Required changes in GameScene.ts:**

```typescript
// Add to create() method
if (this.isMultiplayer) {
  multiplayerCoordinator.initializeGameplayPhase();

  // Listen for opponent card selection
  gameEvents.on('OPPONENT_CARD_SELECTED', (data) => {
    this.updateOpponentStatus(data.selected ? 'Selecting...' : 'Thinking...');
  });

  // Listen for opponent card lock
  gameEvents.on('OPPONENT_CARD_LOCKED', (data) => {
    this.updateOpponentStatus('Ready ✓');
    this.opponentLockedCard = CardFactory.getCardById(data.cardId);
  });

  // Host: Both cards locked, resolve combat
  gameEvents.on('BOTH_CARDS_LOCKED_HOST', (data) => {
    this.resolveCombat(data.myCard, data.opponentCardId);
    multiplayerCoordinator.broadcastStateUpdate(gameStateManager.createSnapshot());
  });

  // Client: Receive state update from host
  gameEvents.on('HOST_STATE_UPDATE', (data) => {
    gameStateManager.restoreFromSnapshot(data.state);
    this.refreshUI();
  });
}

// Add to handleCardSelection() method
if (this.isMultiplayer) {
  multiplayerCoordinator.broadcastCardSelection(cardInstance?.instanceId || null);
}

// Add to handleCardLock() method
if (this.isMultiplayer) {
  multiplayerCoordinator.broadcastCardLock(cardInstance);
}
```

### Turn Timer Sync

The timer needs to be synchronized between players:

```typescript
// In TurnManager.ts, add to startTurn():
if (this.isMultiplayer && this.isHost) {
  networkManager.send({
    type: 'TURN_START',
    payload: {
      turnNumber: this.currentTurn,
      startTime: Date.now(),
    },
  });
}

// Client receives and adjusts timer offset
gameEvents.on('TURN_START', (data) => {
  const latency = estimateLatency(); // From ping/pong times
  const adjustedStartTime = data.startTime + latency / 2;
  this.syncTimer(adjustedStartTime);
});
```

---

# PART 6: VISUAL EFFECTS SYSTEM

## Particle System

### ParticleManager.ts

Element-specific particle configurations for dramatic combat effects:

```typescript
// Fire particles
{
  colors: [0xff6b35, 0xff8c42, 0xffd93d, 0xffffff],
  gravity: -200,        // Rise upward
  lifespan: 800,
  blendMode: ADD,       // Additive glow
  scale: { start: 1.5, end: 0 },
  speed: { min: 150, max: 300 },
  quantity: 40,
}

// Water particles
{
  colors: [0x4dabf7, 0x74c0fc, 0xa5d8ff, 0xffffff],
  gravity: 100,         // Fall down
  lifespan: 1000,
  blendMode: ADD,
  scale: { start: 1.2, end: 0 },
  speed: { min: 80, max: 180 },
  quantity: 35,
}

// Earth particles
{
  colors: [0x8b5a2b, 0xa0522d, 0xcd853f, 0xdeb887],
  gravity: 300,         // Heavy fall
  lifespan: 600,
  blendMode: NORMAL,
  scale: { start: 1.8, end: 0.5 },
  speed: { min: 100, max: 250 },
  quantity: 30,
}

// Air particles
{
  colors: [0xb8c5d6, 0xdee2e6, 0xf1f3f5, 0xffffff],
  gravity: -50,         // Float upward
  lifespan: 1200,
  blendMode: ADD,
  scale: { start: 0.8, end: 0 },
  speed: { min: 60, max: 150 },
  quantity: 50,
}
```

### ParticleLOD.ts

Automatic quality scaling based on device performance:

```typescript
// Performance tiers
enum PerformanceTier {
  HIGH = 'high',      // Full particles (40-60)
  MEDIUM = 'medium',  // Reduced (20-30)
  LOW = 'low',        // Minimal (10-15)
}

// Automatically detected based on FPS
// Can be manually overridden in settings
```

## Combat Effects

### HitstopManager.ts

Frame freeze on significant hits for impact feel:

```typescript
// Usage
hitstopManager.trigger({
  duration: 100,      // ms of freeze
  intensity: 0.8,     // How frozen (0-1)
  ease: 'Sine.out',
});
```

### CameraFX.ts

Screen shake and zoom for drama:

```typescript
// Screenshake on damage
cameraFX.shake({
  intensity: 0.02,    // Shake amount
  duration: 200,      // ms
});

// Zoom on critical moments
cameraFX.zoom({
  scale: 1.1,
  duration: 300,
  ease: 'Quad.out',
});
```

### ImpactOrchestrator.ts

Coordinates all effects for cohesive impact:

```typescript
// Orchestrates: particles + hitstop + shake + flash
impactOrchestrator.triggerImpact({
  element: 'fire',
  position: { x: 400, y: 300 },
  damage: 15,
  isCritical: false,
});
```

## Card Animations

### CardIdleAnimator.ts

Subtle card animations during gameplay:

- **Hover**: Scale up 5%, add glow
- **Float**: Gentle Y bobbing (sine wave)
- **Pulse**: Glow intensity oscillation
- **Select**: Border highlight, lift effect

## Post-Processing

### PostFXPipeline.ts

WebGL post-processing effects:

- **Bloom**: Glow effect on bright colors
- **Vignette**: Darkened edges for focus
- **Color Grading**: Element-based tinting

---

# PART 7: AUDIO SYSTEM

## AudioManager.ts

Central audio controller:

```typescript
// Play sound effect
audioManager.playSFX('card_play', { volume: 0.8 });

// Play with variation
audioManager.playSFX('hit', {
  volume: 0.7,
  pitch: 0.9 + Math.random() * 0.2, // Slight variation
});
```

## ProceduralSFX.ts

Generated sounds using Tone.js for variety:

```typescript
// Fire attack sound
proceduralSFX.fireAttack(); // Generates unique fire woosh

// Water splash
proceduralSFX.waterSplash(); // Bubbly splash sound

// Earth impact
proceduralSFX.earthImpact(); // Heavy thud

// Air woosh
proceduralSFX.airWoosh(); // Swift wind sound
```

## MusicManager.ts

Background music with element themes (prepared for expansion):

```typescript
// Current: Single ambient track
musicManager.play('ambient');

// Future: Element-based themes
musicManager.play('fire_theme');
musicManager.crossfade('water_theme', 2000); // 2s crossfade
```

## Settings Integration

```typescript
// Volume controls in SettingsManager
settingsManager.setMasterVolume(0.8);
settingsManager.setSFXVolume(0.7);
settingsManager.setMusicVolume(0.5);

// Mute toggle
settingsManager.setMuted(true);
```

---

# PART 8: BACKEND REQUIREMENTS

## Why Backend is Needed

| Feature | P2P Only | With Backend |
|---------|----------|--------------|
| Basic 1v1 | ✅ Works | ✅ Works |
| Matchmaking | ❌ | ✅ Queue system |
| Leaderboards | ❌ | ✅ Persistent rankings |
| Accounts | ❌ | ✅ Auth + progress |
| Anti-cheat | ❌ | ✅ Server validation |
| Spectating | ❌ | ✅ Relay server |
| Reconnection | ⚠️ Limited | ✅ Full state recovery |

## Recommended Architecture

### Phase 1: Current (P2P with PeerJS Cloud)
- **Status**: Working
- **Pros**: Free, no server needed
- **Cons**: Can't matchmake, no persistence

### Phase 2: Self-Hosted PeerJS + Simple API
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Frontend (Vercel/Netlify)                                 │
│   ┌─────────────────┐                                       │
│   │ Elemental Clash │                                       │
│   │    (Phaser)     │                                       │
│   └────────┬────────┘                                       │
│            │                                                │
│   ┌────────▼────────┐     ┌─────────────────┐              │
│   │   PeerJS        │     │   REST API      │              │
│   │   (Fly.io)      │     │   (Railway)     │              │
│   │   Signaling     │     │   Leaderboards  │              │
│   └─────────────────┘     │   Accounts      │              │
│                           └─────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Full WebSocket Server
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Frontend                 WebSocket Server                 │
│   ┌─────────────────┐     ┌─────────────────┐              │
│   │ Elemental Clash │◄───►│   Game Server   │              │
│   │    (Phaser)     │     │   (Node.js)     │              │
│   └─────────────────┘     │                 │              │
│                           │  - Matchmaking  │              │
│                           │  - Game State   │              │
│   Database                │  - Anti-cheat   │              │
│   ┌─────────────────┐     │  - Spectating   │              │
│   │   PostgreSQL    │◄────┤                 │              │
│   │   (Supabase)    │     └─────────────────┘              │
│   │                 │                                       │
│   │  - Accounts     │                                       │
│   │  - Rankings     │                                       │
│   │  - History      │                                       │
│   └─────────────────┘                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Free Hosting Options

### Frontend
| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Vercel** | Unlimited deploys | React/Next.js, static |
| **Netlify** | 100GB bandwidth | Static sites |
| **Cloudflare Pages** | Unlimited | Global CDN |
| **GitHub Pages** | Unlimited | Simple static |

### Backend (WebSocket/API)
| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Fly.io** | 3 VMs, 256MB | WebSocket servers |
| **Railway** | $5 credit/month | Node.js APIs |
| **Render** | 750 hours | Background services |
| **Deno Deploy** | 100K req/day | Edge functions |

### Database
| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Supabase** | 500MB PostgreSQL + Auth | Full stack |
| **PlanetScale** | 1GB MySQL | Scalable SQL |
| **MongoDB Atlas** | 512MB | Document store |
| **Firebase** | 1GB Firestore | Real-time sync |

### Recommended Stack (Free Tier)
1. **Frontend**: Vercel (zero config for Vite)
2. **Backend**: Fly.io (WebSocket server)
3. **Database**: Supabase (PostgreSQL + Auth)
4. **Total Cost**: $0/month for small scale

---

# PART 9: EXPANSION ROADMAP (AAA VISION)

## Immediate Priority (Complete Multiplayer)

### 1. DraftScene Sync
- Add `isMultiplayer` flag check
- Call `multiplayerCoordinator.sendDraftComplete()`
- Listen for `BOTH_DRAFTS_COMPLETE` event
- Show "Waiting for opponent..." overlay

### 2. GameScene Sync
- Broadcast card selection events
- Broadcast card lock events
- Host resolves combat, broadcasts state
- Client receives and applies state updates

### 3. Turn Timer Sync
- Host broadcasts turn start with timestamp
- Client adjusts for latency

### 4. Game Over Handling
- Both players see GameOverScene
- Correct winner displayed on both sides
- Stats updated for both players

### 5. Reconnection Handling
- Save game state snapshot
- On reconnect, request state from host
- Resume from saved position

## Short-Term Features (1-2 months)

### 1. Matchmaking Queue
```typescript
// Backend: Simple queue
const queue: string[] = []; // Player IDs

// When 2 players in queue:
// 1. Create game session
// 2. Notify both players
// 3. Start draft
```

### 2. Leaderboard System
```typescript
// Database schema
interface Player {
  id: string;
  name: string;
  elo: number;        // Start at 1000
  gamesPlayed: number;
  wins: number;
}

// ELO calculation
function updateElo(winner: Player, loser: Player) {
  const K = 32; // K-factor
  const expectedWin = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
  winner.elo += K * (1 - expectedWin);
  loser.elo += K * (0 - (1 - expectedWin));
}
```

### 3. Friend System
- Add friends by username
- See online status
- Direct challenge

### 4. Daily Challenges
- "Win with only Fire cards"
- "Deal 50 damage in one game"
- "Win without using walls"

## Medium-Term Features (3-6 months)

### 1. New Elements
```typescript
// Lightning element
{
  name: 'Lightning',
  color: 0xffd43b,
  bonus: 'Chain damage to walls',
  weakness: 'Earth',
}

// Ice element
{
  name: 'Ice',
  color: 0x74c0fc,
  bonus: 'Freeze opponent card (skip turn)',
  weakness: 'Fire',
}

// Nature element
{
  name: 'Nature',
  color: 0x51cf66,
  bonus: 'Heal HP on hit',
  weakness: 'Fire',
}
```

### 2. Card Abilities
Beyond simple damage:
- **Burn**: Damage over time
- **Shield**: Block next attack
- **Drain**: Steal energy
- **Stun**: Skip opponent turn
- **Summon**: Create temporary minion

### 3. Deck Building
```typescript
// Deck rules
const DECK_RULES = {
  minCards: 10,
  maxCards: 15,
  maxCopies: 2,      // Max 2 of same card
  energyCap: 30,     // Total energy cost limit
};

// Deck builder UI
// - Card collection view
// - Drag-and-drop into deck
// - Validation feedback
// - Save/load decks
```

### 4. Campaign Mode
```typescript
// Story structure
const CAMPAIGN = {
  chapters: [
    {
      name: 'The Fire Temple',
      missions: [
        { type: 'battle', opponent: 'Fire Novice', difficulty: 'easy' },
        { type: 'story', text: 'The flames reveal a hidden path...' },
        { type: 'battle', opponent: 'Fire Master', difficulty: 'hard' },
        { type: 'boss', opponent: 'Inferno Dragon', rewards: ['fire_legendary'] },
      ],
    },
    // More chapters...
  ],
};
```

### 5. Boss Battles
Special AI with unique mechanics:
- **Phase transitions** at HP thresholds
- **Special abilities** not available to players
- **Unique rewards** for defeating

## Long-Term Vision (6+ months)

### 1. 3D Card Models
Replace 2D cards with WebGL 3D:
- Three.js or Babylon.js integration
- Card flip animations
- Holographic effects

### 2. Animated Card Art
- Spine animations for characters
- Lottie for particle effects
- Background movement

### 3. Tournament System
```typescript
// Tournament structure
interface Tournament {
  id: string;
  format: 'single_elimination' | 'swiss' | 'round_robin';
  maxPlayers: 8 | 16 | 32;
  bracket: TournamentBracket;
  prizes: Prize[];
  startTime: Date;
}

// Real-time bracket updates
// Spectator mode for matches
// Prize distribution
```

### 4. Mobile Apps
Using Capacitor:
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
npm run build && npx cap sync
```

### 5. Monetization (Ethical)
- **Cosmetics**: Card backs, avatars, effects
- **Battle Pass**: Seasonal rewards track
- **Card Packs**: Accelerate collection (not P2W)
- **No pay-to-win**: All cards earnable through play

---

# PART 10: CODE PATTERNS & EXTENSION GUIDE

## Adding New Cards

### 1. Define Card in cardDefinitions.ts

```typescript
// src/config/cardDefinitions.ts

export const CARD_DEFINITIONS: CardDefinition[] = [
  // ... existing cards ...

  // Add new card
  {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    element: 'lightning',
    type: 'attack',
    cost: 3,
    damage: 12,
    hp: 8,
    description: 'Strikes with electric fury',
    rarity: 'rare',
  },
];
```

### 2. Add Element Config (if new element)

```typescript
// src/effects/ParticleManager.ts

private elementConfigs = {
  // ... existing ...

  lightning: {
    colors: [0xffd43b, 0xfff59d, 0xffffff],
    gravity: 0,
    lifespan: 200,
    blendMode: Phaser.BlendModes.ADD,
    scale: { start: 2.0, end: 0 },
    speed: { min: 400, max: 700 },
    quantity: 60,
    alpha: { start: 1, end: 0 },
    angle: { min: 0, max: 360 },
    rotate: { min: -720, max: 720 },
  },
};
```

### 3. Add Audio (optional)

```typescript
// src/audio/ProceduralSFX.ts

lightningStrike(): void {
  // Generate crackling electricity sound
  const synth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0 },
  }).toDestination();
  synth.triggerAttackRelease('8n');
}
```

## Adding New Scenes

### 1. Create Scene File

```typescript
// src/scenes/NewScene.ts

import { BaseScene } from './BaseScene';
import { SceneKeys } from '../core/SceneKeys';

export class NewScene extends BaseScene {
  constructor() {
    super({ key: SceneKeys.NEW_SCENE });
  }

  create(data?: any): void {
    super.create();

    // Create UI elements
    this.createBackground();
    this.createUI();
  }

  private createBackground(): void {
    this.createGradientBackground();
  }

  private createUI(): void {
    // Add UI elements
  }

  shutdown(): void {
    // Clean up resources
  }
}
```

### 2. Register Scene Key

```typescript
// src/core/SceneKeys.ts

export enum SceneKeys {
  // ... existing ...
  NEW_SCENE = 'NewScene',
}
```

### 3. Add to Game Config

```typescript
// src/config/gameConfig.ts

import { NewScene } from '../scenes/NewScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  // ...
  scene: [
    // ... existing scenes ...
    NewScene,
  ],
};
```

## Adding Visual Effects

### 1. Particle Effect

```typescript
// In your scene or effect manager

createCustomEffect(x: number, y: number): void {
  const emitter = this.add.particles(x, y, 'particle', {
    speed: { min: 100, max: 200 },
    scale: { start: 1, end: 0 },
    lifespan: 500,
    quantity: 20,
    blendMode: 'ADD',
  });

  // Auto-destroy after emission
  this.time.delayedCall(1000, () => emitter.destroy());
}
```

### 2. Screen Effect

```typescript
// Add to CameraFX.ts

flashColor(color: number, duration: number = 200): void {
  this.scene.cameras.main.flash(duration,
    (color >> 16) & 0xff,
    (color >> 8) & 0xff,
    color & 0xff
  );
}
```

## Extending Multiplayer

### Adding New Message Types

```typescript
// src/network/types.ts

export type NetworkMessageType =
  | 'PING'
  | 'PONG'
  | 'CONNECTION_ACK'
  | 'PLAYER_INFO'
  | 'DRAFT_COMPLETE'
  | 'PLAYER_ACTION'
  | 'STATE_UPDATE'
  | 'GAME_EVENT'
  | 'CHAT_MESSAGE'  // NEW
  | 'EMOTE'         // NEW
  ;
```

### Handling New Messages

```typescript
// In MultiplayerGameCoordinator.ts

private setupNetworkListeners(): void {
  // ... existing ...

  const cleanupChat = networkManager.on('CHAT_MESSAGE', (msg) => {
    gameEvents.emit('CHAT_RECEIVED', msg.payload);
  });

  this.cleanupListeners.push(cleanupChat);
}

sendChatMessage(text: string): void {
  networkManager.send({
    type: 'CHAT_MESSAGE',
    payload: {
      text,
      playerId: this.playerId,
      timestamp: Date.now(),
    },
  });
}
```

## Testing Strategies

### Manual Testing
1. Open two browser windows side-by-side
2. One clicks "INVITE FRIEND", copies link
3. Other pastes link
4. Test each phase: connect → draft → game → game over

### Automated Testing (Future)
```typescript
// Example test structure
describe('CombatResolver', () => {
  it('should deal damage when attack hits', () => {
    const result = combatResolver.resolve(fireAttack, waterWall);
    expect(result.damage).toBeGreaterThan(0);
  });

  it('should block damage with wall', () => {
    const result = combatResolver.resolve(fireAttack, earthWall);
    expect(result.wallDamage).toBe(fireAttack.damage);
    expect(result.hpDamage).toBe(0);
  });
});
```

---

# PART 11: KNOWN ISSUES & FIXES NEEDED

## High Priority Bugs

### 1. Draft Multiplayer Not Integrated
**Status**: Needs implementation
**Location**: `src/scenes/DraftScene.ts`
**Fix**: Add multiplayer coordinator calls (see Part 5)

### 2. Game Multiplayer Not Integrated
**Status**: Needs implementation
**Location**: `src/scenes/GameScene.ts`
**Fix**: Add event broadcasting and state sync

### 3. Reconnection During Game
**Status**: Needs implementation
**Fix**: Add state snapshot save/restore on reconnect

## Medium Priority

### 1. Turn Timer Desync
**Issue**: Timer may drift between players
**Fix**: Sync timer start with latency compensation

### 2. Card Gallery Scroll Performance
**Issue**: May lag with many cards
**Fix**: Virtual scrolling or pagination

### 3. Audio Context Resume
**Issue**: Mobile browsers require user interaction
**Fix**: Resume audio context on first tap

## Low Priority

### 1. Console Debug Logs
**Issue**: Many debug logs in production
**Fix**: Add `DEBUG` flag to disable in prod

### 2. Memory Cleanup
**Issue**: Some tweens not properly cleaned
**Fix**: Audit all scenes for shutdown() cleanup

## Performance Optimizations

### 1. Particle Pooling
Current: Create/destroy particles each effect
Better: Pool and reuse particle emitters

### 2. Texture Atlas
Current: Individual textures
Better: Single atlas for all UI elements

### 3. Lazy Scene Loading
Current: All scenes loaded at boot
Better: Load scenes on-demand

---

# PART 12: COMPLETE FILE REFERENCE

## Critical Files (Start Here)

| File | Purpose | Read First? |
|------|---------|-------------|
| `src/main.ts` | Entry point, URL parsing | Yes |
| `src/core/GameEngine.ts` | Main game orchestrator | Yes |
| `src/core/TurnManager.ts` | Turn flow, timer | Yes |
| `src/network/NetworkManager.ts` | P2P networking | Yes |
| `src/scenes/GameScene.ts` | Main gameplay | Yes |

## All Files by Module

### Entry Point
- `src/main.ts` - App initialization, URL parameter parsing

### Core Game Logic
- `src/core/GameEngine.ts` - Main game loop coordinator
- `src/core/TurnManager.ts` - Turn phases, timer, hot-seat mode
- `src/core/CombatResolver.ts` - Damage calculation, interactions
- `src/core/DraftManager.ts` - Card draft round logic
- `src/core/DeckManager.ts` - Player deck management
- `src/core/MinerManager.ts` - Energy miner lifecycle
- `src/core/WallManager.ts` - Wall HP tracking
- `src/core/EnergySystem.ts` - Energy generation/spending
- `src/core/AIPlayer.ts` - AI opponent with difficulty levels
- `src/core/CardFactory.ts` - Card instantiation from definitions
- `src/core/SceneKeys.ts` - Scene identifier enum
- `src/core/ObjectPool.ts` - Object pooling for performance
- `src/core/TextureAtlas.ts` - Texture management
- `src/core/TweenRegistry.ts` - Animation tracking

### Scenes
- `src/scenes/BaseScene.ts` - Shared scene utilities
- `src/scenes/BootScene.ts` - Initial boot, config
- `src/scenes/PreloadScene.ts` - Asset loading
- `src/scenes/MenuScene.ts` - Main menu, buttons
- `src/scenes/TutorialScene.ts` - Interactive tutorial
- `src/scenes/DraftScene.ts` - Card drafting phase
- `src/scenes/GameScene.ts` - Main gameplay
- `src/scenes/GameOverScene.ts` - Win/lose screen
- `src/scenes/LobbyScene.ts` - Host waiting room
- `src/scenes/JoinScene.ts` - Invitee entry point
- `src/scenes/ConnectingScene.ts` - P2P handshake

### Network
- `src/network/NetworkManager.ts` - PeerJS connection management
- `src/network/SessionManager.ts` - Session IDs, invite links
- `src/network/MultiplayerGameCoordinator.ts` - Game/network bridge
- `src/network/types.ts` - Message type definitions
- `src/network/index.ts` - Module exports

### State Management
- `src/state/GameStateManager.ts` - Game state, snapshots
- `src/state/PlayerState.ts` - Player data

### UI Components
- `src/ui/components/Button.ts` - Interactive button
- `src/ui/components/Toast.ts` - Notification toasts
- `src/ui/components/Modal.ts` - Dialog modals
- `src/ui/components/HealthBar.ts` - Animated HP bar
- `src/ui/components/CircularTimer.ts` - Turn countdown
- `src/ui/components/TipCarousel.ts` - Strategy tips
- `src/ui/components/StatsDisplay.ts` - Player stats grid
- `src/ui/components/CardGallery.ts` - Card browser
- `src/ui/components/DifficultySelector.ts` - AI difficulty
- `src/ui/components/PlayerNameInput.ts` - Name entry
- `src/ui/components/GameSetupModal.ts` - Pre-game config
- `src/ui/components/ResourceBar.ts` - Energy display
- `src/ui/components/DamageNumber.ts` - Floating damage text
- `src/ui/components/SafeAreaHandler.ts` - Mobile safe areas
- `src/ui/components/index.ts` - Component exports
- `src/ui/AnimationManager.ts` - UI animations
- `src/ui/InputManager.ts` - Input handling
- `src/ui/SettingsPanel.ts` - Settings UI

### Visual Effects
- `src/effects/ParticleManager.ts` - Element particles
- `src/effects/ParticleLOD.ts` - Quality scaling
- `src/effects/HitstopManager.ts` - Impact freeze
- `src/effects/CameraFX.ts` - Screenshake, zoom
- `src/effects/ImpactOrchestrator.ts` - Effect coordination
- `src/effects/CardIdleAnimator.ts` - Card hover/glow
- `src/effects/AnimatedBackground.ts` - Parallax background

### Shaders
- `src/shaders/PostFXPipeline.ts` - Bloom, vignette

### Audio
- `src/audio/AudioManager.ts` - Sound playback
- `src/audio/MusicManager.ts` - Background music
- `src/audio/ProceduralSFX.ts` - Generated sounds
- `src/audio/index.ts` - Audio exports

### Managers
- `src/managers/ThemeManager.ts` - Color themes
- `src/managers/SettingsManager.ts` - Settings persistence

### Configuration
- `src/config/constants.ts` - Game constants
- `src/config/cardDefinitions.ts` - Card data
- `src/config/gameConfig.ts` - Phaser configuration
- `src/config/themes.ts` - Color theme definitions

### Types
- `src/types/cards.ts` - Card type definitions
- `src/types/gameState.ts` - State types
- `src/types/player.ts` - Player types
- `src/types/draft.ts` - Draft types
- `src/types/events.ts` - Event types
- `src/types/settings.ts` - Settings types
- `src/types/index.ts` - Type exports

### Utilities
- `src/utils/EventEmitter.ts` - Centralized event system
- `src/utils/StatsManager.ts` - Player statistics
- `src/utils/RandomGenerator.ts` - Seeded RNG
- `src/utils/TapDebouncer.ts` - Input debouncing
- `src/utils/VisibilityHandler.ts` - Tab visibility

---

# Final Notes

## Questions?

If you have questions about this codebase, the best approach is:

1. **Search the code** for the feature/function name
2. **Read the relevant scene** - scenes are the entry points
3. **Trace the event flow** - most logic is event-driven
4. **Check the types** - TypeScript types document the data structures

## Contributing

When making changes:

1. Follow existing code style
2. Add TypeScript types for new features
3. Clean up resources in `shutdown()` methods
4. Test multiplayer with two browser windows
5. Test on mobile (use browser dev tools)

## Good Luck!

This codebase is well-structured and ready for expansion. The core game is solid, and the multiplayer foundation is in place. Focus on completing the DraftScene and GameScene sync, then build from there.

Happy coding!
