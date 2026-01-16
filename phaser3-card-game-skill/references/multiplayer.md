# Multiplayer Reference

## Firebase Setup

### Installation
```bash
npm install firebase
```

### Configuration
```typescript
// src/firebase.config.ts
import { initializeApp } from 'firebase/app';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  connectDatabaseEmulator(database, 'localhost', 9000);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

### Environment Variables
```env
# .env.development
VITE_FIREBASE_API_KEY=your-dev-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# .env.production
VITE_FIREBASE_API_KEY=your-prod-api-key
# ... etc
```

## Database Schema

```json
{
  "games": {
    "{gameId}": {
      "roomCode": "ABC123",
      "status": "waiting | playing | finished",
      "createdAt": 1703808000000,
      "turnNumber": 1,
      "phase": "selection | lock_in | reveal | resolution | cleanup",
      "turnStartedAt": 1703808005000,
      "turnDuration": 10000,
      
      "player1": {
        "id": "uid1",
        "displayName": "Player1",
        "health": 30,
        "hand": ["card1_id", "card2_id"],
        "selectedCard": null,
        "lockedIn": false,
        "connected": true,
        "lastSeen": 1703808010000
      },
      
      "player2": {
        "id": "uid2",
        "displayName": "Player2",
        "health": 30,
        "hand": ["card3_id", "card4_id"],
        "selectedCard": null,
        "lockedIn": false,
        "connected": true,
        "lastSeen": 1703808010000
      },
      
      "activeCards": {
        "walls": {
          "wall1": { "ownerId": "uid1", "cardId": "stone_wall", "hp": 8 }
        },
        "miners": {
          "miner1": { "ownerId": "uid2", "cardId": "flame_miner", "turnsLeft": 2 }
        }
      },
      
      "history": [
        { "turn": 1, "p1Card": "fire_slash", "p2Card": "stone_wall", "result": "p1_blocked" }
      ],
      
      "winner": null
    }
  },
  
  "rooms": {
    "ABC123": {
      "gameId": "game_abc123",
      "createdAt": 1703808000000
    }
  },
  
  "users": {
    "{uid}": {
      "displayName": "Player1",
      "gamesPlayed": 10,
      "wins": 5,
      "lastOnline": 1703808000000
    }
  }
}
```

## Authentication Service

```typescript
// src/services/AuthService.ts
import { auth } from '@/firebase.config';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

export class AuthService {
  private currentUser: User | null = null;
  private authReadyPromise: Promise<User | null>;
  private authReadyResolve!: (user: User | null) => void;

  constructor() {
    this.authReadyPromise = new Promise(resolve => {
      this.authReadyResolve = resolve;
    });
    
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.authReadyResolve(user);
    });
  }

  async signIn(): Promise<string> {
    if (this.currentUser) {
      return this.currentUser.uid;
    }
    
    try {
      const result = await signInAnonymously(auth);
      this.currentUser = result.user;
      return result.user.uid;
    } catch (error) {
      console.error('Auth error:', error);
      throw new Error('Failed to authenticate');
    }
  }

  async waitForAuth(): Promise<User | null> {
    return this.authReadyPromise;
  }

  get uid(): string | null {
    return this.currentUser?.uid ?? null;
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}

export const authService = new AuthService();
```

## Room Service

```typescript
// src/services/RoomService.ts
import { database, auth } from '@/firebase.config';
import { 
  ref, set, get, update, remove, push, 
  onValue, onDisconnect, serverTimestamp,
  DataSnapshot, Unsubscribe
} from 'firebase/database';

export interface RoomData {
  gameId: string;
  roomCode: string;
  status: 'waiting' | 'playing' | 'finished';
  player1?: PlayerData;
  player2?: PlayerData;
}

export interface PlayerData {
  id: string;
  displayName: string;
  health: number;
  connected: boolean;
}

export class RoomService {
  private currentRoomCode: string | null = null;
  private listeners: Unsubscribe[] = [];

  // Generate 6-character room code
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Avoid offensive combinations
    const banned = ['FUCK', 'SHIT', 'ASS', 'SEX', 'DAMN', 'HELL'];
    if (banned.some(word => code.includes(word))) {
      return this.generateRoomCode();
    }
    
    return code;
  }

  async createRoom(displayName: string): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const roomCode = this.generateRoomCode();
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const gameData = {
      roomCode,
      status: 'waiting',
      createdAt: serverTimestamp(),
      turnNumber: 0,
      phase: 'waiting',
      turnDuration: 10000,
      player1: {
        id: uid,
        displayName,
        health: 30,
        hand: [],
        selectedCard: null,
        lockedIn: false,
        connected: true,
        lastSeen: serverTimestamp()
      },
      player2: null,
      activeCards: { walls: {}, miners: {} },
      history: [],
      winner: null
    };

    // Create game and room index atomically
    await Promise.all([
      set(ref(database, `games/${gameId}`), gameData),
      set(ref(database, `rooms/${roomCode}`), { 
        gameId, 
        createdAt: serverTimestamp() 
      })
    ]);

    // Set up disconnect handler
    const playerRef = ref(database, `games/${gameId}/player1/connected`);
    onDisconnect(playerRef).set(false);

    this.currentRoomCode = roomCode;
    return roomCode;
  }

  async joinRoom(roomCode: string, displayName: string): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    // Look up game by room code
    const roomSnap = await get(ref(database, `rooms/${roomCode}`));
    if (!roomSnap.exists()) {
      throw new Error('Room not found');
    }

    const { gameId } = roomSnap.val();
    const gameSnap = await get(ref(database, `games/${gameId}`));
    if (!gameSnap.exists()) {
      throw new Error('Game not found');
    }

    const gameData = gameSnap.val();
    
    // Check if room is available
    if (gameData.status !== 'waiting') {
      throw new Error('Game already in progress');
    }
    
    if (gameData.player2 !== null) {
      throw new Error('Room is full');
    }

    // Join as player 2
    await update(ref(database, `games/${gameId}`), {
      'player2': {
        id: uid,
        displayName,
        health: 30,
        hand: [],
        selectedCard: null,
        lockedIn: false,
        connected: true,
        lastSeen: serverTimestamp()
      },
      'status': 'playing'
    });

    // Set up disconnect handler
    const playerRef = ref(database, `games/${gameId}/player2/connected`);
    onDisconnect(playerRef).set(false);

    this.currentRoomCode = roomCode;
    return gameId;
  }

  async leaveRoom(): Promise<void> {
    if (!this.currentRoomCode) return;

    // Clean up listeners
    this.listeners.forEach(unsub => unsub());
    this.listeners = [];

    this.currentRoomCode = null;
  }

  subscribeToGame(
    gameId: string, 
    callback: (data: any) => void
  ): Unsubscribe {
    const gameRef = ref(database, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });
    
    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  async updatePlayerState(
    gameId: string, 
    playerId: 'player1' | 'player2', 
    updates: Partial<PlayerData>
  ): Promise<void> {
    const playerRef = ref(database, `games/${gameId}/${playerId}`);
    await update(playerRef, {
      ...updates,
      lastSeen: serverTimestamp()
    });
  }
}

export const roomService = new RoomService();
```

## Game Sync Service

```typescript
// src/services/GameSyncService.ts
import { database, auth } from '@/firebase.config';
import { 
  ref, update, onValue, serverTimestamp,
  runTransaction, Unsubscribe
} from 'firebase/database';

export type TurnPhase = 'selection' | 'lock_in' | 'reveal' | 'resolution' | 'cleanup';

export class GameSyncService {
  private gameId: string;
  private playerId: 'player1' | 'player2';
  private serverTimeOffset: number = 0;
  private listeners: Unsubscribe[] = [];

  constructor(gameId: string, playerId: 'player1' | 'player2') {
    this.gameId = gameId;
    this.playerId = playerId;
    this.initServerTimeSync();
  }

  private initServerTimeSync(): void {
    const offsetRef = ref(database, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, (snap) => {
      this.serverTimeOffset = snap.val() || 0;
    });
    this.listeners.push(unsub);
  }

  getServerTime(): number {
    return Date.now() + this.serverTimeOffset;
  }

  // Card Selection (during SELECTION phase)
  async selectCard(cardId: string): Promise<void> {
    const path = `games/${this.gameId}/${this.playerId}/selectedCard`;
    await update(ref(database), { [path]: cardId });
  }

  // Lock In Selection
  async lockIn(): Promise<boolean> {
    const gameRef = ref(database, `games/${this.gameId}`);
    
    try {
      const result = await runTransaction(gameRef, (currentData) => {
        if (!currentData) return currentData;
        
        const player = currentData[this.playerId];
        
        // Validation
        if (!player.selectedCard) {
          console.warn('No card selected');
          return; // Abort transaction
        }
        
        if (player.lockedIn) {
          console.warn('Already locked in');
          return; // Abort transaction
        }
        
        // Lock in
        player.lockedIn = true;
        
        // Check if both players are locked in
        const otherPlayer = this.playerId === 'player1' ? 'player2' : 'player1';
        if (currentData[otherPlayer]?.lockedIn) {
          currentData.phase = 'reveal';
        } else {
          currentData.phase = 'lock_in';
        }
        
        return currentData;
      });
      
      return result.committed;
    } catch (error) {
      console.error('Lock in failed:', error);
      return false;
    }
  }

  // Start a new turn
  async startTurn(): Promise<void> {
    await update(ref(database, `games/${this.gameId}`), {
      phase: 'selection',
      turnStartedAt: serverTimestamp(),
      'player1/selectedCard': null,
      'player1/lockedIn': false,
      'player2/selectedCard': null,
      'player2/lockedIn': false,
      turnNumber: this.getCurrentTurn() + 1
    });
  }

  private getCurrentTurn(): number {
    // This would be read from the current game state
    return 0;
  }

  // Subscribe to phase changes
  subscribeToPhase(callback: (phase: TurnPhase) => void): Unsubscribe {
    const phaseRef = ref(database, `games/${this.gameId}/phase`);
    const unsub = onValue(phaseRef, (snap) => {
      if (snap.exists()) {
        callback(snap.val() as TurnPhase);
      }
    });
    this.listeners.push(unsub);
    return unsub;
  }

  // Subscribe to opponent's lock-in status
  subscribeToOpponentLockIn(callback: (lockedIn: boolean) => void): Unsubscribe {
    const opponentId = this.playerId === 'player1' ? 'player2' : 'player1';
    const lockRef = ref(database, `games/${this.gameId}/${opponentId}/lockedIn`);
    const unsub = onValue(lockRef, (snap) => {
      callback(snap.val() === true);
    });
    this.listeners.push(unsub);
    return unsub;
  }

  // Update health after combat
  async updateHealth(playerId: 'player1' | 'player2', newHealth: number): Promise<void> {
    await update(ref(database, `games/${this.gameId}/${playerId}`), {
      health: newHealth
    });
  }

  // Record turn result
  async recordTurnResult(
    p1Card: string, 
    p2Card: string, 
    result: string
  ): Promise<void> {
    const historyRef = ref(database, `games/${this.gameId}/history`);
    // Use push to add to array
    const newEntryRef = ref(database, `games/${this.gameId}/history/${Date.now()}`);
    await update(ref(database), {
      [`games/${this.gameId}/history/${Date.now()}`]: {
        turn: this.getCurrentTurn(),
        p1Card,
        p2Card,
        result,
        timestamp: serverTimestamp()
      }
    });
  }

  // End game
  async endGame(winnerId: string | null): Promise<void> {
    await update(ref(database, `games/${this.gameId}`), {
      status: 'finished',
      winner: winnerId,
      phase: 'finished'
    });
  }

  // Cleanup
  dispose(): void {
    this.listeners.forEach(unsub => unsub());
    this.listeners = [];
  }
}
```

## Synchronized Timer

```typescript
// src/services/SyncedTimer.ts
import { database } from '@/firebase.config';
import { ref, onValue } from 'firebase/database';

export class SyncedTimer {
  private serverTimeOffset: number = 0;
  private timerInterval: number | null = null;
  private onTickCallback: ((remaining: number) => void) | null = null;
  private onExpireCallback: (() => void) | null = null;

  constructor() {
    // Sync server time offset
    onValue(ref(database, '.info/serverTimeOffset'), (snap) => {
      this.serverTimeOffset = snap.val() || 0;
    });
  }

  getServerTime(): number {
    return Date.now() + this.serverTimeOffset;
  }

  start(
    turnStartedAt: number,
    durationMs: number,
    onTick: (remaining: number) => void,
    onExpire: () => void
  ): void {
    this.stop(); // Clear any existing timer
    
    this.onTickCallback = onTick;
    this.onExpireCallback = onExpire;

    this.timerInterval = window.setInterval(() => {
      const serverNow = this.getServerTime();
      const elapsed = serverNow - turnStartedAt;
      const remaining = Math.max(0, durationMs - elapsed);
      
      this.onTickCallback?.(remaining);
      
      if (remaining <= 0) {
        this.stop();
        this.onExpireCallback?.();
      }
    }, 100); // Update every 100ms for smooth display
  }

  stop(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getRemainingTime(turnStartedAt: number, durationMs: number): number {
    const serverNow = this.getServerTime();
    return Math.max(0, durationMs - (serverNow - turnStartedAt));
  }
}
```

## Security Rules

```json
{
  "rules": {
    "games": {
      "$gameId": {
        // Only players in the game can read
        ".read": "auth != null && (data.child('player1/id').val() == auth.uid || data.child('player2/id').val() == auth.uid)",
        
        "player1": {
          "selectedCard": {
            ".write": "auth.uid == data.parent().child('id').val() && !data.parent().child('lockedIn').val() && root.child('games').child($gameId).child('phase').val() == 'selection'",
            ".validate": "newData.isString() && newData.val().length <= 50"
          },
          "lockedIn": {
            ".write": "auth.uid == data.parent().child('id').val() && data.parent().child('selectedCard').exists()",
            ".validate": "newData.isBoolean() && newData.val() == true && !data.val()"
          },
          "connected": {
            ".write": "auth.uid == data.parent().child('id').val()",
            ".validate": "newData.isBoolean()"
          },
          "lastSeen": {
            ".write": "auth.uid == data.parent().child('id').val()",
            ".validate": "newData.val() <= now"
          }
        },
        
        "player2": {
          // Same rules as player1
          "selectedCard": {
            ".write": "auth.uid == data.parent().child('id').val() && !data.parent().child('lockedIn').val() && root.child('games').child($gameId).child('phase').val() == 'selection'",
            ".validate": "newData.isString() && newData.val().length <= 50"
          },
          "lockedIn": {
            ".write": "auth.uid == data.parent().child('id').val() && data.parent().child('selectedCard').exists()",
            ".validate": "newData.isBoolean() && newData.val() == true && !data.val()"
          },
          "connected": {
            ".write": "auth.uid == data.parent().child('id').val()",
            ".validate": "newData.isBoolean()"
          }
        },
        
        "phase": {
          // Phase can only be advanced, not reversed (except by server/admin)
          ".write": "auth != null && (data.parent().child('player1/id').val() == auth.uid || data.parent().child('player2/id').val() == auth.uid)"
        },
        
        "status": {
          ".write": "auth != null && (data.parent().child('player1/id').val() == auth.uid || data.parent().child('player2/id').val() == auth.uid)",
          ".validate": "newData.isString() && (newData.val() == 'waiting' || newData.val() == 'playing' || newData.val() == 'finished')"
        }
      }
    },
    
    "rooms": {
      "$roomCode": {
        ".read": "auth != null",
        ".write": "auth != null && !data.exists()",
        ".validate": "$roomCode.length == 6 && $roomCode.matches(/^[A-Z0-9]+$/)"
      }
    },
    
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth.uid == $uid",
        ".validate": "newData.hasChildren(['displayName'])"
      }
    }
  }
}
```

## Presence System

```typescript
// src/services/PresenceService.ts
import { database, auth } from '@/firebase.config';
import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';

export class PresenceService {
  private gameId: string;
  private playerId: 'player1' | 'player2';

  constructor(gameId: string, playerId: 'player1' | 'player2') {
    this.gameId = gameId;
    this.playerId = playerId;
    this.setupPresence();
  }

  private setupPresence(): void {
    const connectedRef = ref(database, '.info/connected');
    const playerConnectedRef = ref(database, `games/${this.gameId}/${this.playerId}/connected`);
    const playerLastSeenRef = ref(database, `games/${this.gameId}/${this.playerId}/lastSeen`);

    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // Set connected to true
        set(playerConnectedRef, true);
        
        // When disconnected, set to false
        onDisconnect(playerConnectedRef).set(false);
        onDisconnect(playerLastSeenRef).set(serverTimestamp());
      }
    });
  }

  subscribeToOpponentPresence(
    callback: (connected: boolean) => void
  ): () => void {
    const opponentId = this.playerId === 'player1' ? 'player2' : 'player1';
    const opponentRef = ref(database, `games/${this.gameId}/${opponentId}/connected`);
    
    const unsubscribe = onValue(opponentRef, (snap) => {
      callback(snap.val() === true);
    });
    
    return unsubscribe;
  }
}
```

## Reconnection Handler

```typescript
// src/services/ReconnectionService.ts
export class ReconnectionService {
  private reconnectAttempts = 0;
  private maxAttempts = 5;
  private baseDelay = 1000;

  async attemptReconnect(
    reconnectFn: () => Promise<boolean>
  ): Promise<boolean> {
    while (this.reconnectAttempts < this.maxAttempts) {
      const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);
      
      console.log(`Reconnection attempt ${this.reconnectAttempts + 1}/${this.maxAttempts} in ${delay}ms`);
      
      await this.sleep(delay);
      
      try {
        const success = await reconnectFn();
        if (success) {
          this.reconnectAttempts = 0;
          return true;
        }
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
      }
      
      this.reconnectAttempts++;
    }
    
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  reset(): void {
    this.reconnectAttempts = 0;
  }
}
```

## Multiplayer Alternatives Comparison

| Feature | Firebase RTDB | Colyseus | Nakama | Socket.io |
|---------|---------------|----------|--------|-----------|
| **Best For** | Turn-based | Real-time | Full backend | Custom needs |
| **Latency** | 50-100ms | 30-50ms | 30-50ms | 30-50ms |
| **Self-Host** | No | Yes | Yes | Yes |
| **Free Tier** | 100 CCU | Self-host | Self-host | Self-host |
| **Setup Time** | 1 hour | 4 hours | 8 hours | 6 hours |
| **Offline** | Built-in | Manual | Manual | Manual |
| **Turn-Based** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

### When to Use What

- **Firebase RTDB**: Best for turn-based games, prototypes, small-scale multiplayer
- **Colyseus**: Best for real-time games, authoritative server, custom game logic
- **Nakama**: Best for full game backend (accounts, leaderboards, matchmaking)
- **Socket.io**: Best for custom solutions, existing Node.js infrastructure
