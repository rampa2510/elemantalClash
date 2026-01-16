# Howler.js Complete Reference Guide

Howler.js is the most popular JavaScript audio library (730K+ weekly downloads, 25K+ GitHub stars). It provides a simple, powerful API with automatic format detection, caching, and cross-browser compatibility.

## Installation

```bash
npm install howler
# or
yarn add howler
```

```typescript
import { Howl, Howler } from 'howler';
```

## Basic Usage

### Simple Sound
```typescript
const sound = new Howl({
  src: ['sound.webm', 'sound.mp3'],  // Format fallback array
  volume: 0.5,
  onload: () => console.log('Sound loaded'),
  onplay: () => console.log('Sound playing'),
  onend: () => console.log('Sound ended')
});

sound.play();
```

### Sound with Full Options
```typescript
const sound = new Howl({
  src: ['sound.webm', 'sound.ogg', 'sound.mp3'],
  
  // Playback options
  volume: 1.0,           // 0.0 to 1.0
  rate: 1.0,             // Playback speed (0.5 to 4.0)
  loop: false,           // Loop the sound
  
  // Loading options
  preload: true,         // Load immediately (default: true)
  autoplay: false,       // Play when loaded
  html5: false,          // Force HTML5 Audio (enables streaming)
  
  // Spatial audio
  stereo: 0,             // -1 (left) to 1 (right)
  
  // Sprite definition (optional)
  sprite: {
    explosion: [0, 1500],      // [start_ms, duration_ms]
    laser: [1500, 300],
    powerup: [1800, 700, true] // [start, duration, loop]
  },
  
  // Events
  onload: () => {},
  onloaderror: (id, error) => {},
  onplay: (id) => {},
  onend: (id) => {},
  onpause: (id) => {},
  onstop: (id) => {},
  onmute: (id) => {},
  onvolume: (id) => {},
  onrate: (id) => {},
  onseek: (id) => {},
  onfade: (id) => {},
  onunlock: () => {}     // Audio context unlocked
});
```

## Playback Control

### Playing Sounds
```typescript
const sound = new Howl({ src: ['sound.webm', 'sound.mp3'] });

// Play and get ID for this instance
const id = sound.play();

// Play specific sprite
const explosionId = sound.play('explosion');

// Play with inline options (creates new sound instance internally)
sound.play();
sound.volume(0.5);  // Apply to last played
```

### Controlling Specific Instances
```typescript
const sound = new Howl({ src: ['sound.webm'] });

const id1 = sound.play();
const id2 = sound.play();

// Control specific instance
sound.pause(id1);       // Pause only id1
sound.stop(id2);        // Stop only id2
sound.volume(0.5, id1); // Set volume for id1
sound.rate(1.5, id1);   // Set rate for id1
sound.seek(2.0, id1);   // Seek to 2 seconds for id1
sound.loop(true, id1);  // Enable loop for id1

// Control all instances
sound.pause();          // Pause all
sound.stop();           // Stop all
sound.volume(0.5);      // Set volume for all
```

### Fading
```typescript
const music = new Howl({ src: ['music.webm'], loop: true });
const id = music.play();

// Fade from current volume to target over duration
music.fade(0, 1.0, 2000, id);    // Fade in: 0 → 1 over 2 seconds
music.fade(1.0, 0, 1000, id);    // Fade out: 1 → 0 over 1 second

// Wait for fade to complete
music.once('fade', (soundId) => {
  if (music.volume() === 0) {
    music.stop(soundId);
  }
});
```

## Audio Sprites

Audio sprites combine multiple sounds into one file, reducing HTTP requests.

### Creating Sprites (CLI)
```bash
# Install audiosprite
npm install -g audiosprite

# Generate sprite from WAV files
audiosprite -f howler -e "webm,mp3" *.wav -o game-sfx
# Output: game-sfx.json, game-sfx.webm, game-sfx.mp3
```

### Using Sprites
```typescript
const sfx = new Howl({
  src: ['game-sfx.webm', 'game-sfx.mp3'],
  sprite: {
    explosion: [0, 1500],           // [start_ms, duration_ms]
    laser: [1500, 300],
    powerup: [1800, 700],
    ambient: [2500, 10000, true]    // Loop this sprite
  }
});

// Play specific sprite
sfx.play('explosion');
sfx.play('laser');

// With volume
const id = sfx.play('powerup');
sfx.volume(0.7, id);
```

### Dynamic Sprite Loading
```typescript
// Load sprite definition from JSON
async function loadSpriteSheet(jsonUrl: string, audioUrls: string[]) {
  const response = await fetch(jsonUrl);
  const data = await response.json();
  
  return new Howl({
    src: audioUrls,
    sprite: data.sprite || data.spritemap
  });
}

// Usage
const sfx = await loadSpriteSheet('audio/sfx.json', [
  'audio/sfx.webm',
  'audio/sfx.mp3'
]);
sfx.play('explosion');
```

## Global Howler Object

```typescript
import { Howler } from 'howler';

// Global mute
Howler.mute(true);
Howler.mute(false);

// Global volume
Howler.volume(0.5);

// Stop all sounds
Howler.stop();

// Unload all sounds (free memory)
Howler.unload();

// Audio context access
const ctx = Howler.ctx;

// Master gain node
const masterGain = Howler.masterGain;

// Check/set audio codec support
const canPlayWebm = Howler.codecs('webm');
const canPlayMp3 = Howler.codecs('mp3');

// Audio unlock status
console.log(Howler.state); // 'running' or 'suspended'
```

## Mobile/Browser Audio Unlock

```typescript
// Howler auto-unlocks on first interaction
// But you can handle manually:

function unlockAudio() {
  // Resume audio context if suspended
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    Howler.ctx.resume().then(() => {
      console.log('Audio context resumed');
    });
  }
}

// Add to first user interaction
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('click', unlockAudio, { once: true });

// Or listen for Howler's unlock event
const sound = new Howl({
  src: ['sound.mp3'],
  onunlock: () => {
    console.log('Audio unlocked, safe to play');
  }
});
```

## Spatial Audio (3D Positioning)

### Stereo Panning (Simple)
```typescript
const sound = new Howl({
  src: ['enemy.webm'],
  stereo: 0  // Center
});

// Pan left to right
sound.stereo(-1);  // Full left
sound.stereo(0);   // Center
sound.stereo(1);   // Full right

// Pan specific instance
const id = sound.play();
sound.stereo(0.5, id);  // Slightly right
```

### Full 3D Spatial Audio
```typescript
const sound = new Howl({
  src: ['sound.webm'],
  volume: 1.0
});

const id = sound.play();

// Set 3D position
sound.pos(x, y, z, id);

// Set 3D orientation (direction facing)
sound.orientation(x, y, z, id);

// Configure spatial properties
sound.pannerAttr({
  panningModel: 'HRTF',          // 'equalpower' or 'HRTF' (better quality)
  distanceModel: 'inverse',       // 'linear', 'inverse', 'exponential'
  refDistance: 1,                 // Reference distance
  maxDistance: 10000,             // Max distance
  rolloffFactor: 1,               // How quickly volume drops
  coneInnerAngle: 360,            // Inner cone angle
  coneOuterAngle: 360,            // Outer cone angle
  coneOuterGain: 0                // Volume outside outer cone
}, id);
```

### Setting Listener Position
```typescript
// Set listener (player) position and orientation
Howler.pos(playerX, playerY, playerZ);
Howler.orientation(
  frontX, frontY, frontZ,  // Facing direction
  upX, upY, upZ            // Up direction
);
```

### 2D Spatial Audio System
```typescript
class Spatial2DSound {
  private sound: Howl;
  private id: number | null = null;
  
  constructor(src: string[], options: Partial<HowlOptions> = {}) {
    this.sound = new Howl({
      src,
      ...options
    });
  }
  
  play() {
    this.id = this.sound.play();
    return this.id;
  }
  
  /**
   * Update position relative to listener
   * @param soundX - Sound world position X
   * @param soundY - Sound world position Y
   * @param listenerX - Listener (player/camera) X
   * @param listenerY - Listener Y
   * @param maxDistance - Max audible distance
   * @param panScale - How wide the stereo field (default 1 = screen width)
   */
  updatePosition(
    soundX: number,
    soundY: number,
    listenerX: number,
    listenerY: number,
    maxDistance: number = 500,
    panScale: number = 1
  ) {
    if (this.id === null) return;
    
    // Calculate distance
    const dx = soundX - listenerX;
    const dy = soundY - listenerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Volume falloff (inverse square, clamped)
    const volume = Math.max(0, Math.min(1, 1 - (distance / maxDistance)));
    
    // Stereo pan based on X offset
    const pan = Math.max(-1, Math.min(1, dx / (maxDistance * panScale)));
    
    this.sound.volume(volume, this.id);
    this.sound.stereo(pan, this.id);
  }
  
  stop() {
    if (this.id !== null) {
      this.sound.stop(this.id);
      this.id = null;
    }
  }
}

// Usage
const enemySound = new Spatial2DSound(['growl.webm', 'growl.mp3'], { loop: true });
enemySound.play();

// In game update loop
function update() {
  enemySound.updatePosition(
    enemy.x, enemy.y,
    player.x, player.y,
    600  // Max distance
  );
}
```

## Sound Pooling

```typescript
class SoundPool {
  private sounds: Howl[] = [];
  private index: number = 0;
  
  constructor(
    src: string[],
    poolSize: number = 5,
    options: Partial<HowlOptions> = {}
  ) {
    for (let i = 0; i < poolSize; i++) {
      this.sounds.push(new Howl({
        src,
        preload: true,
        ...options
      }));
    }
  }
  
  play(options?: { volume?: number; rate?: number }): number {
    const sound = this.sounds[this.index];
    this.index = (this.index + 1) % this.sounds.length;
    
    // Apply variation
    const volume = (options?.volume ?? 1) * (0.9 + Math.random() * 0.2);
    const rate = (options?.rate ?? 1) * (0.95 + Math.random() * 0.1);
    
    sound.volume(volume);
    sound.rate(rate);
    
    return sound.play();
  }
  
  stop() {
    this.sounds.forEach(s => s.stop());
  }
  
  unload() {
    this.sounds.forEach(s => s.unload());
    this.sounds = [];
  }
}

// Usage - rapid fire without cutoff
const gunshots = new SoundPool(['gunshot.webm', 'gunshot.mp3'], 10);

function fire() {
  gunshots.play({ volume: 0.8 });
}
```

## Music Crossfade System

```typescript
class MusicManager {
  private current: Howl | null = null;
  private currentId: number | null = null;
  private volume: number = 0.5;
  
  play(src: string[], fadeIn: number = 2000) {
    const music = new Howl({
      src,
      loop: true,
      volume: 0,
      html5: true  // Stream for large files
    });
    
    const id = music.play();
    music.fade(0, this.volume, fadeIn, id);
    
    this.current = music;
    this.currentId = id;
  }
  
  crossfadeTo(src: string[], duration: number = 2000) {
    const oldMusic = this.current;
    const oldId = this.currentId;
    
    // Start new music
    const newMusic = new Howl({
      src,
      loop: true,
      volume: 0,
      html5: true
    });
    
    const newId = newMusic.play();
    newMusic.fade(0, this.volume, duration, newId);
    
    // Fade out old music
    if (oldMusic && oldId !== null) {
      oldMusic.fade(this.volume, 0, duration, oldId);
      oldMusic.once('fade', () => {
        oldMusic.stop();
        oldMusic.unload();
      });
    }
    
    this.current = newMusic;
    this.currentId = newId;
  }
  
  setVolume(volume: number, fadeDuration: number = 500) {
    this.volume = volume;
    if (this.current && this.currentId !== null) {
      this.current.fade(this.current.volume(), volume, fadeDuration, this.currentId);
    }
  }
  
  pause() {
    this.current?.pause();
  }
  
  resume() {
    this.current?.play();
  }
  
  stop(fadeOut: number = 1000) {
    if (this.current && this.currentId !== null) {
      this.current.fade(this.volume, 0, fadeOut, this.currentId);
      this.current.once('fade', () => {
        this.current?.stop();
        this.current?.unload();
        this.current = null;
        this.currentId = null;
      });
    }
  }
}

// Usage
const music = new MusicManager();
music.play(['menu-music.webm', 'menu-music.mp3']);

// Later, crossfade to battle music
music.crossfadeTo(['battle-music.webm', 'battle-music.mp3'], 3000);
```

## Complete Audio Engine

```typescript
interface SoundConfig {
  key: string;
  src: string[];
  category: 'music' | 'sfx' | 'ui' | 'ambient';
  poolSize?: number;
  sprite?: { [name: string]: [number, number] | [number, number, boolean] };
  loop?: boolean;
  volume?: number;
}

class AudioEngine {
  private sounds: Map<string, Howl> = new Map();
  private pools: Map<string, SoundPool> = new Map();
  private categoryVolumes: Map<string, number> = new Map([
    ['music', 0.5],
    ['sfx', 0.8],
    ['ui', 0.6],
    ['ambient', 0.4]
  ]);
  private masterVolume: number = 1.0;
  private muted: boolean = false;
  
  load(configs: SoundConfig[]): Promise<void[]> {
    return Promise.all(configs.map(config => this.loadSound(config)));
  }
  
  private loadSound(config: SoundConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      if (config.poolSize && config.poolSize > 1) {
        // Create sound pool
        this.pools.set(config.key, new SoundPool(
          config.src,
          config.poolSize,
          { sprite: config.sprite }
        ));
        resolve();
      } else {
        // Create single sound
        const sound = new Howl({
          src: config.src,
          sprite: config.sprite,
          loop: config.loop ?? false,
          volume: this.calculateVolume(config.category, config.volume ?? 1),
          onload: () => resolve(),
          onloaderror: (id, err) => reject(err)
        });
        
        (sound as any).category = config.category;
        (sound as any).baseVolume = config.volume ?? 1;
        
        this.sounds.set(config.key, sound);
      }
    });
  }
  
  private calculateVolume(category: string, baseVolume: number): number {
    return this.masterVolume * 
           (this.categoryVolumes.get(category) ?? 1) * 
           baseVolume * 
           (this.muted ? 0 : 1);
  }
  
  play(key: string, sprite?: string, options?: { volume?: number; rate?: number }): number | null {
    // Check pool first
    const pool = this.pools.get(key);
    if (pool) {
      return pool.play(options);
    }
    
    // Then regular sound
    const sound = this.sounds.get(key);
    if (!sound) {
      console.warn(`Sound not found: ${key}`);
      return null;
    }
    
    if (sprite) {
      return sound.play(sprite);
    }
    return sound.play();
  }
  
  stop(key: string) {
    this.pools.get(key)?.stop();
    this.sounds.get(key)?.stop();
  }
  
  setMasterVolume(volume: number) {
    this.masterVolume = volume;
    this.updateAllVolumes();
  }
  
  setCategoryVolume(category: string, volume: number) {
    this.categoryVolumes.set(category, volume);
    this.updateAllVolumes();
  }
  
  private updateAllVolumes() {
    this.sounds.forEach((sound, key) => {
      const category = (sound as any).category;
      const baseVolume = (sound as any).baseVolume;
      sound.volume(this.calculateVolume(category, baseVolume));
    });
  }
  
  mute() {
    this.muted = true;
    Howler.mute(true);
  }
  
  unmute() {
    this.muted = false;
    Howler.mute(false);
  }
  
  unloadAll() {
    this.sounds.forEach(sound => sound.unload());
    this.pools.forEach(pool => pool.unload());
    this.sounds.clear();
    this.pools.clear();
  }
}

// Usage
const audio = new AudioEngine();

await audio.load([
  { key: 'bgMusic', src: ['music.webm', 'music.mp3'], category: 'music', loop: true },
  { key: 'explosion', src: ['explosion.webm', 'explosion.mp3'], category: 'sfx', poolSize: 5 },
  { key: 'laser', src: ['laser.webm', 'laser.mp3'], category: 'sfx', poolSize: 8 },
  { 
    key: 'ui', 
    src: ['ui.webm', 'ui.mp3'], 
    category: 'ui',
    sprite: {
      click: [0, 100],
      hover: [100, 80],
      confirm: [180, 200]
    }
  }
]);

// Play sounds
audio.play('bgMusic');
audio.play('explosion');
audio.play('ui', 'click');

// Adjust volumes
audio.setCategoryVolume('music', 0.3);
```

## Integrating with Phaser 3

```typescript
class PhaserHowlerBridge {
  private scene: Phaser.Scene;
  private sounds: Map<string, Howl> = new Map();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  // Load using Phaser's loader, then create Howl
  preload(key: string, urls: string[]) {
    // Just track the key, Howler handles loading
    this.scene.load.on('complete', () => {
      this.createSound(key, urls);
    });
  }
  
  createSound(key: string, urls: string[], options?: Partial<HowlOptions>) {
    const sound = new Howl({
      src: urls,
      ...options
    });
    this.sounds.set(key, sound);
    return sound;
  }
  
  play(key: string, sprite?: string): number | undefined {
    const sound = this.sounds.get(key);
    if (!sound) return undefined;
    return sprite ? sound.play(sprite) : sound.play();
  }
  
  // Handle scene lifecycle
  pauseAll() {
    this.sounds.forEach(sound => sound.pause());
  }
  
  resumeAll() {
    this.sounds.forEach(sound => {
      // Only resume if was playing
      if ((sound as any)._playLock !== undefined) {
        sound.play();
      }
    });
  }
  
  destroy() {
    this.sounds.forEach(sound => sound.unload());
    this.sounds.clear();
  }
}
```

## Memory Management

```typescript
// Unload specific sound
sound.unload();

// Unload all sounds
Howler.unload();

// Check if loaded
if (sound.state() === 'loaded') {
  // Safe to play
}

// Monitor loading
sound.on('load', () => console.log('Loaded'));
sound.on('loaderror', (id, error) => console.error('Load failed:', error));

// Use HTML5 Audio for large files (streams, less memory)
const music = new Howl({
  src: ['large-music.webm'],
  html5: true  // Streams instead of buffering entire file
});
```

## Error Handling

```typescript
const sound = new Howl({
  src: ['sound.webm', 'sound.mp3'],
  
  onloaderror: (id, error) => {
    console.error('Failed to load sound:', error);
    // Try fallback or show error UI
  },
  
  onplayerror: (id, error) => {
    console.error('Failed to play sound:', error);
    // Common cause: audio context not unlocked
    if (Howler.ctx?.state === 'suspended') {
      Howler.ctx.resume().then(() => sound.play());
    }
  }
});

// Global error handling
Howler.autoUnlock = true;  // Auto-unlock on first interaction (default: true)
```
