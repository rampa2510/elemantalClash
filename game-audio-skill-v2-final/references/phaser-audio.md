# Phaser 3 Complete Audio Reference

## Audio System Overview

Phaser 3 uses Web Audio API by default with HTML5 Audio fallback. The sound system is accessed via `this.sound` in any Scene.

## Loading Audio

### Basic Loading
```typescript
preload() {
  // Single format (not recommended)
  this.load.audio('music', 'audio/music.mp3');
  
  // Multiple formats (recommended - browser picks best supported)
  this.load.audio('explosion', [
    'audio/explosion.webm',  // Best quality/compression
    'audio/explosion.ogg',   // Good fallback
    'audio/explosion.mp3'    // Universal fallback
  ]);
  
  // With configuration
  this.load.audio('ambient', 'audio/ambient.webm', {
    instances: 1  // Limit concurrent plays
  });
}
```

### Audio Sprites (Multiple Sounds in One File)
```typescript
preload() {
  // Load sprite with JSON marker data
  this.load.audioSprite('sfx', 'audio/sfx.json', [
    'audio/sfx.webm',
    'audio/sfx.mp3'
  ]);
}

// sfx.json format:
{
  "spritemap": {
    "explosion": { "start": 0, "end": 1.5, "loop": false },
    "laser": { "start": 1.5, "end": 1.8, "loop": false },
    "powerup": { "start": 1.8, "end": 2.5, "loop": false },
    "music": { "start": 3, "end": 63, "loop": true }
  }
}
```

### Loading Events
```typescript
preload() {
  this.load.on('filecomplete-audio-explosion', (key) => {
    console.log('Explosion loaded:', key);
  });
  
  this.load.on('loaderror', (file) => {
    console.error('Failed to load:', file.key);
  });
}
```

## Sound Manager Properties

```typescript
create() {
  const soundManager = this.sound;
  
  // Check audio context state
  console.log(soundManager.locked);    // true if needs unlock
  console.log(soundManager.context);   // AudioContext reference
  
  // Global settings
  soundManager.mute = false;           // Mute all
  soundManager.volume = 1;             // Master volume (0-1)
  soundManager.rate = 1;               // Global playback rate
  soundManager.detune = 0;             // Global detune (cents)
  soundManager.pauseOnBlur = true;     // Pause when tab loses focus
}
```

## Playing Sounds

### Simple Playback
```typescript
create() {
  // Fire-and-forget (returns Sound object)
  this.sound.play('explosion');
  
  // With config
  this.sound.play('explosion', {
    volume: 0.8,
    rate: 1.0,
    detune: 0,
    seek: 0,        // Start position in seconds
    loop: false,
    delay: 0        // Delay before playing
  });
}
```

### Sound Object Control
```typescript
create() {
  // Create sound object for full control
  this.explosion = this.sound.add('explosion', {
    volume: 0.8,
    loop: false
  });
  
  // Play when ready
  this.explosion.play();
  
  // Control during playback
  this.explosion.pause();
  this.explosion.resume();
  this.explosion.stop();
  
  // Modify properties
  this.explosion.setVolume(0.5);
  this.explosion.setRate(1.2);
  this.explosion.setDetune(100);  // 100 cents = 1 semitone up
  this.explosion.setSeek(0.5);    // Jump to 0.5 seconds
  this.explosion.setLoop(true);
  this.explosion.setMute(true);
}
```

### Playing Audio Sprites
```typescript
create() {
  // Play specific marker from sprite
  this.sound.playAudioSprite('sfx', 'explosion');
  
  // With config
  this.sound.playAudioSprite('sfx', 'laser', {
    volume: 0.6,
    rate: 1.1
  });
  
  // Get sprite sound object
  const music = this.sound.addAudioSprite('sfx');
  music.play('music');
}
```

## Music and Looping

### Background Music Pattern
```typescript
create() {
  // Create music with loop
  this.bgMusic = this.sound.add('backgroundMusic', {
    loop: true,
    volume: 0
  });
  
  // Start on first interaction (required by browsers)
  this.input.once('pointerdown', () => {
    this.bgMusic.play();
    
    // Fade in
    this.tweens.add({
      targets: this.bgMusic,
      volume: 0.4,
      duration: 2000,
      ease: 'Linear'
    });
  });
}

// Scene transition - fade out
shutdown() {
  this.tweens.add({
    targets: this.bgMusic,
    volume: 0,
    duration: 1000,
    onComplete: () => {
      this.bgMusic.stop();
    }
  });
}
```

### Crossfading Music
```typescript
crossfadeMusic(fromKey: string, toKey: string, duration: number = 2000) {
  const fromMusic = this.sound.get(fromKey);
  const toMusic = this.sound.add(toKey, { loop: true, volume: 0 });
  
  toMusic.play();
  
  // Crossfade
  this.tweens.add({
    targets: fromMusic,
    volume: 0,
    duration: duration,
    onComplete: () => fromMusic.stop()
  });
  
  this.tweens.add({
    targets: toMusic,
    volume: 0.4,
    duration: duration
  });
  
  return toMusic;
}
```

## Sound Events

```typescript
create() {
  const sound = this.sound.add('explosion');
  
  // Sound lifecycle events
  sound.on('play', () => console.log('Started playing'));
  sound.on('pause', () => console.log('Paused'));
  sound.on('resume', () => console.log('Resumed'));
  sound.on('stop', () => console.log('Stopped'));
  sound.on('complete', () => console.log('Finished playing'));
  sound.on('looped', () => console.log('Looped'));
  
  // Property change events
  sound.on('mute', (sound, muted) => console.log('Mute:', muted));
  sound.on('volume', (sound, vol) => console.log('Volume:', vol));
  sound.on('rate', (sound, rate) => console.log('Rate:', rate));
  sound.on('detune', (sound, detune) => console.log('Detune:', detune));
  sound.on('seek', (sound, seek) => console.log('Seek:', seek));
  sound.on('loop', (sound, loop) => console.log('Loop:', loop));
  
  // Global sound manager events
  this.sound.on('unlocked', () => {
    console.log('Audio context unlocked!');
    // Safe to play audio now
  });
}
```

## Handling Audio Lock (Critical for Mobile)

### Automatic Unlock
```typescript
create() {
  // Phaser auto-unlocks on first interaction, but you can handle manually
  if (this.sound.locked) {
    this.sound.once('unlocked', () => {
      this.startGame();
    });
    
    // Show "tap to start" UI
    this.add.text(400, 300, 'Tap to Start', { fontSize: '32px' })
      .setOrigin(0.5);
  } else {
    this.startGame();
  }
}

startGame() {
  this.bgMusic.play();
  // ... rest of game init
}
```

### Manual Unlock Pattern
```typescript
create() {
  const unlockAudio = () => {
    if (this.sound.context.state === 'suspended') {
      this.sound.context.resume();
    }
    
    // Play silent buffer to fully unlock
    const buffer = this.sound.context.createBuffer(1, 1, 22050);
    const source = this.sound.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.sound.context.destination);
    source.start(0);
  };
  
  this.input.once('pointerdown', unlockAudio);
}
```

## iOS Specific Handling

```typescript
// In game config
const config: Phaser.Types.Core.GameConfig = {
  // ... other config
  audio: {
    disableWebAudio: false,  // Try Web Audio first
    noAudio: false
  }
};

// Runtime iOS detection and handling
create() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    // iOS may need HTML5 Audio fallback
    // Add explicit user interaction handling
    this.input.once('pointerdown', () => {
      // Resume audio context
      if (this.sound.context && this.sound.context.state === 'suspended') {
        this.sound.context.resume();
      }
    });
  }
}
```

## Spatial Audio (Positional Sound)

### 2D Positional Audio
```typescript
create() {
  // Enable spatial audio for a sound
  this.enemySound = this.sound.add('enemy_growl', {
    loop: true,
    volume: 1
  });
  
  // Position updates in update loop
}

update() {
  // Calculate pan based on position relative to player/camera
  const enemyX = this.enemy.x;
  const cameraX = this.cameras.main.scrollX + this.cameras.main.width / 2;
  const cameraWidth = this.cameras.main.width;
  
  // Pan: -1 (left) to 1 (right)
  const pan = Phaser.Math.Clamp((enemyX - cameraX) / (cameraWidth / 2), -1, 1);
  
  // Volume based on distance
  const distance = Phaser.Math.Distance.Between(
    this.player.x, this.player.y,
    this.enemy.x, this.enemy.y
  );
  const maxDistance = 500;
  const volume = Phaser.Math.Clamp(1 - (distance / maxDistance), 0, 1);
  
  // Apply to sound (requires Web Audio)
  if (this.enemySound.source && this.enemySound.source.pannerNode) {
    this.enemySound.source.pannerNode.setPosition(pan, 0, 0);
  }
  this.enemySound.setVolume(volume);
}
```

### Using Web Audio Directly for Better Spatial
```typescript
class SpatialSound {
  private context: AudioContext;
  private panner: PannerNode;
  private source: AudioBufferSourceNode;
  private gainNode: GainNode;
  
  constructor(scene: Phaser.Scene, key: string) {
    this.context = scene.sound.context;
    
    // Create panner for 3D positioning
    this.panner = this.context.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = 1;
    this.panner.maxDistance = 10000;
    this.panner.rolloffFactor = 1;
    
    this.gainNode = this.context.createGain();
    this.panner.connect(this.gainNode);
    this.gainNode.connect(this.context.destination);
  }
  
  setPosition(x: number, y: number, z: number = 0) {
    this.panner.setPosition(x, y, z);
  }
  
  setListenerPosition(x: number, y: number, z: number = 0) {
    this.context.listener.setPosition(x, y, z);
  }
}
```

## Sound Groups and Categories

```typescript
class AudioManager {
  private scene: Phaser.Scene;
  private groups: Map<string, Phaser.Sound.BaseSound[]> = new Map();
  private groupVolumes: Map<string, number> = new Map();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Initialize groups
    ['music', 'sfx', 'ui', 'ambient'].forEach(group => {
      this.groups.set(group, []);
      this.groupVolumes.set(group, 1);
    });
  }
  
  add(key: string, group: string, config?: Phaser.Types.Sound.SoundConfig) {
    const sound = this.scene.sound.add(key, config);
    this.groups.get(group)?.push(sound);
    return sound;
  }
  
  setGroupVolume(group: string, volume: number) {
    this.groupVolumes.set(group, volume);
    this.groups.get(group)?.forEach(sound => {
      // Store base volume if not set
      if ((sound as any).baseVolume === undefined) {
        (sound as any).baseVolume = sound.volume;
      }
      sound.setVolume((sound as any).baseVolume * volume);
    });
  }
  
  muteGroup(group: string) {
    this.groups.get(group)?.forEach(sound => sound.setMute(true));
  }
  
  unmuteGroup(group: string) {
    this.groups.get(group)?.forEach(sound => sound.setMute(false));
  }
  
  stopGroup(group: string) {
    this.groups.get(group)?.forEach(sound => sound.stop());
  }
}
```

## Sound Pooling for Rapid Playback

```typescript
class SoundPool {
  private scene: Phaser.Scene;
  private sounds: Phaser.Sound.BaseSound[];
  private currentIndex: number = 0;
  
  constructor(scene: Phaser.Scene, key: string, size: number = 5) {
    this.scene = scene;
    this.sounds = [];
    
    for (let i = 0; i < size; i++) {
      this.sounds.push(scene.sound.add(key));
    }
  }
  
  play(config?: Phaser.Types.Sound.SoundConfig) {
    const sound = this.sounds[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.sounds.length;
    
    // Stop if still playing
    if (sound.isPlaying) {
      sound.stop();
    }
    
    // Apply variation
    const variation = {
      ...config,
      rate: (config?.rate || 1) * (0.95 + Math.random() * 0.1),
      volume: (config?.volume || 1) * (0.9 + Math.random() * 0.2)
    };
    
    sound.play(variation);
    return sound;
  }
  
  stopAll() {
    this.sounds.forEach(s => s.stop());
  }
}

// Usage
create() {
  this.gunshots = new SoundPool(this, 'gunshot', 8);
}

fireGun() {
  this.gunshots.play({ volume: 0.7 });
}
```

## Tab Visibility Handling

```typescript
create() {
  // Phaser handles this automatically with pauseOnBlur
  // But for custom behavior:
  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Tab is hidden
      this.sound.pauseAll();
      // Or just music:
      // this.bgMusic?.pause();
    } else {
      // Tab is visible again
      this.sound.resumeAll();
      // this.bgMusic?.resume();
    }
  });
}
```

## Performance Tips

### 1. Pre-decode Audio
```typescript
preload() {
  // Audio is decoded during load - ensure all audio loads before create()
  this.load.audio('explosion', 'audio/explosion.webm');
}
```

### 2. Use Audio Sprites for Many Small SFX
```typescript
// Instead of 50 separate files, one sprite with markers
this.load.audioSprite('gameSfx', 'audio/game-sfx.json', [
  'audio/game-sfx.webm',
  'audio/game-sfx.mp3'
]);
```

### 3. Limit Concurrent Sounds
```typescript
// Global limit
const config: Phaser.Types.Core.GameConfig = {
  audio: {
    context: new (window.AudioContext || (window as any).webkitAudioContext)(),
  }
};

// Per-sound limit
this.sound.add('explosion', {
  // Only allow 3 concurrent instances
});

// Or manage manually with sound pool
```

### 4. Stream Long Audio (Music)
```typescript
// For Web Audio, large files are fully loaded
// For HTML5 Audio, they can stream
// Consider using HTML5 for music if memory is tight

const config: Phaser.Types.Core.GameConfig = {
  audio: {
    disableWebAudio: true  // Force HTML5 Audio (streams)
  }
};
```

### 5. Unload Unused Audio
```typescript
// When changing scenes
shutdown() {
  // Stop all sounds
  this.sound.stopAll();
  
  // Remove from cache if won't be used again
  this.cache.audio.remove('levelMusic');
}
```

## Complete Audio Setup Example

```typescript
class GameScene extends Phaser.Scene {
  private audioManager: AudioManager;
  private sfxPools: Map<string, SoundPool> = new Map();
  private bgMusic: Phaser.Sound.BaseSound;
  
  preload() {
    // Music
    this.load.audio('menuMusic', ['audio/menu.webm', 'audio/menu.mp3']);
    this.load.audio('battleMusic', ['audio/battle.webm', 'audio/battle.mp3']);
    
    // SFX Sprite
    this.load.audioSprite('sfx', 'audio/sfx.json', [
      'audio/sfx.webm',
      'audio/sfx.mp3'
    ]);
    
    // Individual important sounds
    this.load.audio('explosion', ['audio/explosion.webm', 'audio/explosion.mp3']);
  }
  
  create() {
    // Initialize audio manager
    this.audioManager = new AudioManager(this);
    
    // Create sound pools for rapid-fire sounds
    this.sfxPools.set('laser', new SoundPool(this, 'laser', 8));
    this.sfxPools.set('hit', new SoundPool(this, 'hit', 5));
    
    // Setup music
    this.bgMusic = this.audioManager.add('menuMusic', 'music', {
      loop: true,
      volume: 0
    });
    
    // Handle audio unlock
    if (this.sound.locked) {
      this.sound.once('unlocked', () => this.startAudio());
      this.showTapToStart();
    } else {
      this.startAudio();
    }
  }
  
  private startAudio() {
    this.bgMusic.play();
    this.tweens.add({
      targets: this.bgMusic,
      volume: 0.4,
      duration: 2000
    });
  }
  
  playUISound(marker: string) {
    this.sound.playAudioSprite('sfx', marker, { volume: 0.6 });
  }
  
  playImpact(intensity: number = 1) {
    this.sfxPools.get('hit')?.play({ volume: 0.8 * intensity });
  }
  
  shutdown() {
    this.tweens.add({
      targets: this.bgMusic,
      volume: 0,
      duration: 500,
      onComplete: () => this.sound.stopAll()
    });
  }
}
```
