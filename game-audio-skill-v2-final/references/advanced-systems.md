# Advanced Game Audio Systems

This reference covers the sophisticated audio systems that create truly immersive game experiences: adaptive music, audio ducking, priority management, and dynamic mixing.

## Adaptive Music Systems

Adaptive music changes based on gameplay state, creating emotional resonance impossible with static soundtracks.

### Approach 1: Vertical Layering (Intensity-Based)

Multiple music layers that fade in/out based on intensity level.

```typescript
interface MusicLayer {
  key: string;
  howl: Howl;
  intensityRange: [number, number]; // [min, max] - when this layer plays
  baseVolume: number;
  currentVolume: number;
}

class VerticalAdaptiveMusic {
  private layers: MusicLayer[] = [];
  private intensity: number = 0;
  private masterVolume: number = 0.5;
  private audioContext: AudioContext;
  
  constructor() {
    this.audioContext = new AudioContext();
  }
  
  /**
   * Add a music layer
   * @param key - Layer identifier
   * @param src - Audio source files
   * @param intensityRange - [min, max] intensity when layer is audible
   * @param baseVolume - Maximum volume for this layer
   */
  addLayer(
    key: string,
    src: string[],
    intensityRange: [number, number],
    baseVolume: number = 1
  ) {
    const howl = new Howl({
      src,
      loop: true,
      volume: 0,
      html5: true
    });
    
    this.layers.push({
      key,
      howl,
      intensityRange,
      baseVolume,
      currentVolume: 0
    });
  }
  
  start() {
    // Start all layers simultaneously (synchronized)
    const startTime = this.audioContext.currentTime + 0.1;
    
    this.layers.forEach(layer => {
      layer.howl.play();
      layer.howl.seek(0);
    });
    
    this.updateVolumes();
  }
  
  /**
   * Set intensity (0-1) to control which layers are active
   */
  setIntensity(intensity: number, transitionTime: number = 500) {
    this.intensity = Math.max(0, Math.min(1, intensity));
    this.updateVolumes(transitionTime);
  }
  
  private updateVolumes(transitionTime: number = 0) {
    this.layers.forEach(layer => {
      const [min, max] = layer.intensityRange;
      let targetVolume = 0;
      
      if (this.intensity >= min && this.intensity <= max) {
        // Calculate fade within range
        if (max === min) {
          targetVolume = 1;
        } else {
          // Fade in from min, full at middle, fade out to max
          const mid = (min + max) / 2;
          const halfRange = (max - min) / 2;
          
          if (this.intensity <= mid) {
            targetVolume = (this.intensity - min) / halfRange;
          } else {
            targetVolume = 1 - ((this.intensity - mid) / halfRange);
          }
        }
      }
      
      targetVolume *= layer.baseVolume * this.masterVolume;
      
      if (transitionTime > 0) {
        layer.howl.fade(layer.currentVolume, targetVolume, transitionTime);
      } else {
        layer.howl.volume(targetVolume);
      }
      
      layer.currentVolume = targetVolume;
    });
  }
  
  setMasterVolume(volume: number) {
    this.masterVolume = volume;
    this.updateVolumes(200);
  }
  
  stop(fadeOut: number = 1000) {
    this.layers.forEach(layer => {
      layer.howl.fade(layer.currentVolume, 0, fadeOut);
    });
    
    setTimeout(() => {
      this.layers.forEach(layer => layer.howl.stop());
    }, fadeOut);
  }
}

// Usage Example: Battle Music with 4 intensity layers
const battleMusic = new VerticalAdaptiveMusic();

// Layer 1: Ambient pad (always playing, louder at low intensity)
battleMusic.addLayer('ambient', ['music/battle_ambient.webm'], [0, 0.5], 0.6);

// Layer 2: Melodic elements (mid intensity)
battleMusic.addLayer('melody', ['music/battle_melody.webm'], [0.2, 0.8], 0.8);

// Layer 3: Rhythm/drums (higher intensity)
battleMusic.addLayer('drums', ['music/battle_drums.webm'], [0.4, 1.0], 0.9);

// Layer 4: Epic brass/action (peak intensity only)
battleMusic.addLayer('epic', ['music/battle_epic.webm'], [0.7, 1.0], 1.0);

battleMusic.start();

// During gameplay:
battleMusic.setIntensity(0.3);  // Calm moment - ambient + light melody
battleMusic.setIntensity(0.6);  // Combat - all layers building
battleMusic.setIntensity(1.0);  // Boss phase - full intensity
battleMusic.setIntensity(0.2);  // Victory - calming down
```

### Approach 2: Horizontal Re-Sequencing (Section-Based)

Transition between composed sections based on game state.

```typescript
interface MusicSection {
  key: string;
  howl: Howl;
  nextSections: string[]; // Valid sections to transition to
  bpm: number;
  beatsPerBar: number;
  bars: number;
}

class HorizontalAdaptiveMusic {
  private sections: Map<string, MusicSection> = new Map();
  private currentSection: MusicSection | null = null;
  private nextSection: string | null = null;
  private isPlaying: boolean = false;
  
  addSection(
    key: string,
    src: string[],
    nextSections: string[],
    bpm: number = 120,
    beatsPerBar: number = 4,
    bars: number = 8
  ) {
    const howl = new Howl({
      src,
      loop: false,
      volume: 0.5,
      onend: () => this.onSectionEnd()
    });
    
    this.sections.set(key, {
      key,
      howl,
      nextSections,
      bpm,
      beatsPerBar,
      bars
    });
  }
  
  start(sectionKey: string) {
    const section = this.sections.get(sectionKey);
    if (!section) return;
    
    this.currentSection = section;
    this.isPlaying = true;
    section.howl.play();
  }
  
  /**
   * Queue transition to next section
   * Will happen at the end of current section
   */
  transitionTo(sectionKey: string) {
    if (!this.currentSection?.nextSections.includes(sectionKey)) {
      console.warn(`Cannot transition from ${this.currentSection?.key} to ${sectionKey}`);
      return;
    }
    this.nextSection = sectionKey;
  }
  
  /**
   * Immediate transition with crossfade
   */
  crossfadeTo(sectionKey: string, duration: number = 2000) {
    const nextSec = this.sections.get(sectionKey);
    if (!nextSec) return;
    
    const prevSection = this.currentSection;
    
    // Start new section
    nextSec.howl.volume(0);
    nextSec.howl.play();
    nextSec.howl.fade(0, 0.5, duration);
    
    // Fade out current
    if (prevSection) {
      prevSection.howl.fade(0.5, 0, duration);
      setTimeout(() => prevSection.howl.stop(), duration);
    }
    
    this.currentSection = nextSec;
  }
  
  private onSectionEnd() {
    if (!this.isPlaying) return;
    
    let nextKey = this.nextSection;
    
    // If no queued section, pick random valid next
    if (!nextKey && this.currentSection) {
      const validNext = this.currentSection.nextSections;
      nextKey = validNext[Math.floor(Math.random() * validNext.length)];
    }
    
    if (nextKey) {
      this.start(nextKey);
      this.nextSection = null;
    }
  }
  
  stop(fadeOut: number = 1000) {
    this.isPlaying = false;
    if (this.currentSection) {
      this.currentSection.howl.fade(0.5, 0, fadeOut);
      setTimeout(() => this.currentSection?.howl.stop(), fadeOut);
    }
  }
}

// Usage: Menu → Battle → Victory flow
const gameMusic = new HorizontalAdaptiveMusic();

gameMusic.addSection('menu_loop', ['music/menu.webm'], ['menu_loop', 'battle_intro'], 90, 4, 8);
gameMusic.addSection('battle_intro', ['music/battle_intro.webm'], ['battle_main'], 140, 4, 4);
gameMusic.addSection('battle_main', ['music/battle_main.webm'], ['battle_main', 'battle_intense', 'victory'], 140, 4, 8);
gameMusic.addSection('battle_intense', ['music/battle_intense.webm'], ['battle_intense', 'battle_main', 'victory'], 140, 4, 8);
gameMusic.addSection('victory', ['music/victory.webm'], ['menu_loop'], 100, 4, 4);

gameMusic.start('menu_loop');

// When battle starts:
gameMusic.transitionTo('battle_intro');

// When intensity increases:
gameMusic.transitionTo('battle_intense');

// When player wins:
gameMusic.transitionTo('victory');
```

## Audio Ducking

Ducking temporarily lowers background audio when important sounds play.

```typescript
interface DuckingConfig {
  duckVolume: number;     // Volume to duck to (0-1)
  attackTime: number;     // Time to reach duck level (ms)
  holdTime: number;       // Minimum duck duration (ms)
  releaseTime: number;    // Time to restore volume (ms)
}

class AudioDucker {
  private targetGainNode: GainNode;
  private audioContext: AudioContext;
  private defaultConfig: DuckingConfig = {
    duckVolume: 0.3,
    attackTime: 50,
    holdTime: 100,
    releaseTime: 500
  };
  private currentDuckCount: number = 0;
  private releaseTimeout: ReturnType<typeof setTimeout> | null = null;
  
  constructor(audioContext: AudioContext, targetGainNode: GainNode) {
    this.audioContext = audioContext;
    this.targetGainNode = targetGainNode;
  }
  
  duck(config: Partial<DuckingConfig> = {}) {
    const { duckVolume, attackTime } = { ...this.defaultConfig, ...config };
    
    this.currentDuckCount++;
    
    // Cancel pending release
    if (this.releaseTimeout) {
      clearTimeout(this.releaseTimeout);
      this.releaseTimeout = null;
    }
    
    // Duck down
    const now = this.audioContext.currentTime;
    this.targetGainNode.gain.cancelScheduledValues(now);
    this.targetGainNode.gain.linearRampToValueAtTime(
      duckVolume,
      now + attackTime / 1000
    );
  }
  
  release(config: Partial<DuckingConfig> = {}) {
    const { holdTime, releaseTime } = { ...this.defaultConfig, ...config };
    
    this.currentDuckCount = Math.max(0, this.currentDuckCount - 1);
    
    // Only release if no other sounds are ducking
    if (this.currentDuckCount === 0) {
      this.releaseTimeout = setTimeout(() => {
        const now = this.audioContext.currentTime;
        this.targetGainNode.gain.cancelScheduledValues(now);
        this.targetGainNode.gain.linearRampToValueAtTime(
          1.0,
          now + releaseTime / 1000
        );
      }, holdTime);
    }
  }
}

// Integration with Audio Engine
class DuckingAudioEngine {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private musicGain: GainNode;
  private sfxGain: GainNode;
  private musicDucker: AudioDucker;
  
  constructor() {
    this.audioContext = new AudioContext();
    
    // Create gain hierarchy
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    
    this.musicGain = this.audioContext.createGain();
    this.musicGain.connect(this.masterGain);
    
    this.sfxGain = this.audioContext.createGain();
    this.sfxGain.connect(this.masterGain);
    
    // Ducker targets music gain
    this.musicDucker = new AudioDucker(this.audioContext, this.musicGain);
  }
  
  playImportantSFX(sound: Howl, duckMusic: boolean = true) {
    if (duckMusic) {
      this.musicDucker.duck({ duckVolume: 0.2, attackTime: 30 });
      
      sound.on('end', () => {
        this.musicDucker.release({ holdTime: 50, releaseTime: 400 });
      });
    }
    
    sound.play();
  }
}

// Simple Howler-based ducking
class SimpleMusicDucker {
  private music: Howl;
  private normalVolume: number;
  private duckVolume: number;
  private activeDucks: number = 0;
  
  constructor(music: Howl, normalVolume: number = 0.5, duckVolume: number = 0.15) {
    this.music = music;
    this.normalVolume = normalVolume;
    this.duckVolume = duckVolume;
  }
  
  duck(duration: number = 100) {
    this.activeDucks++;
    this.music.fade(this.music.volume(), this.duckVolume, duration);
  }
  
  release(duration: number = 500) {
    this.activeDucks = Math.max(0, this.activeDucks - 1);
    if (this.activeDucks === 0) {
      this.music.fade(this.music.volume(), this.normalVolume, duration);
    }
  }
  
  // Auto-duck for duration of a sound
  duckFor(sound: Howl) {
    this.duck();
    sound.once('end', () => this.release());
    sound.once('stop', () => this.release());
  }
}

// Usage
const bgMusic = new Howl({ src: ['music.webm'], loop: true, volume: 0.5 });
const ducker = new SimpleMusicDucker(bgMusic, 0.5, 0.15);

bgMusic.play();

// When playing important sound:
const explosion = new Howl({ src: ['explosion.webm'] });
ducker.duckFor(explosion);
explosion.play();
```

## Sound Priority System

Manages which sounds play when the system is at capacity.

```typescript
interface PrioritizedSound {
  id: string;
  priority: number;      // Higher = more important
  sound: Howl;
  playId: number | null;
  startTime: number;
  isPlaying: boolean;
}

class SoundPriorityManager {
  private maxConcurrent: number;
  private activeSounds: Map<string, PrioritizedSound> = new Map();
  private virtualizedSounds: Map<string, PrioritizedSound> = new Map();
  
  // Priority levels
  static PRIORITY = {
    CRITICAL: 100,    // Always plays (UI feedback, player damage)
    HIGH: 80,         // Very important (player actions)
    MEDIUM: 50,       // Normal gameplay sounds
    LOW: 30,          // Ambient, distant sounds
    BACKGROUND: 10    // Can be dropped
  };
  
  constructor(maxConcurrent: number = 8) {
    this.maxConcurrent = maxConcurrent;
  }
  
  play(
    id: string,
    sound: Howl,
    priority: number = SoundPriorityManager.PRIORITY.MEDIUM
  ): boolean {
    const prioritizedSound: PrioritizedSound = {
      id,
      priority,
      sound,
      playId: null,
      startTime: Date.now(),
      isPlaying: false
    };
    
    // Check if we have room
    if (this.activeSounds.size < this.maxConcurrent) {
      return this.startSound(prioritizedSound);
    }
    
    // Find lowest priority active sound
    let lowestPriority = priority;
    let lowestSound: PrioritizedSound | null = null;
    
    this.activeSounds.forEach(activeSound => {
      if (activeSound.priority < lowestPriority) {
        lowestPriority = activeSound.priority;
        lowestSound = activeSound;
      }
    });
    
    // If new sound has higher priority, virtualize the lowest
    if (lowestSound && lowestPriority < priority) {
      this.virtualizeSound(lowestSound);
      return this.startSound(prioritizedSound);
    }
    
    // Otherwise virtualize the new sound
    this.virtualizedSounds.set(id, prioritizedSound);
    return false;
  }
  
  private startSound(ps: PrioritizedSound): boolean {
    ps.playId = ps.sound.play();
    ps.isPlaying = true;
    ps.startTime = Date.now();
    
    // Handle completion
    ps.sound.once('end', () => this.onSoundEnd(ps.id));
    ps.sound.once('stop', () => this.onSoundEnd(ps.id));
    
    this.activeSounds.set(ps.id, ps);
    return true;
  }
  
  private virtualizeSound(ps: PrioritizedSound) {
    // Stop playback but track state
    if (ps.playId !== null) {
      ps.sound.stop(ps.playId);
    }
    ps.isPlaying = false;
    
    this.activeSounds.delete(ps.id);
    this.virtualizedSounds.set(ps.id, ps);
  }
  
  private onSoundEnd(id: string) {
    this.activeSounds.delete(id);
    this.virtualizedSounds.delete(id);
    
    // Try to restore a virtualized sound
    this.tryRestoreVirtualized();
  }
  
  private tryRestoreVirtualized() {
    if (this.activeSounds.size >= this.maxConcurrent) return;
    if (this.virtualizedSounds.size === 0) return;
    
    // Find highest priority virtualized sound
    let highestPriority = -1;
    let highestSound: PrioritizedSound | null = null;
    
    this.virtualizedSounds.forEach(vs => {
      if (vs.priority > highestPriority) {
        highestPriority = vs.priority;
        highestSound = vs;
      }
    });
    
    if (highestSound) {
      this.virtualizedSounds.delete(highestSound.id);
      this.startSound(highestSound);
    }
  }
  
  stop(id: string) {
    const active = this.activeSounds.get(id);
    if (active && active.playId !== null) {
      active.sound.stop(active.playId);
    }
    
    this.activeSounds.delete(id);
    this.virtualizedSounds.delete(id);
    
    this.tryRestoreVirtualized();
  }
  
  stopAll() {
    this.activeSounds.forEach(ps => {
      if (ps.playId !== null) {
        ps.sound.stop(ps.playId);
      }
    });
    this.activeSounds.clear();
    this.virtualizedSounds.clear();
  }
  
  getStats() {
    return {
      active: this.activeSounds.size,
      virtualized: this.virtualizedSounds.size,
      maxConcurrent: this.maxConcurrent
    };
  }
}

// Usage
const priorityManager = new SoundPriorityManager(8);

// UI sounds - always play
priorityManager.play('ui_click', uiClickSound, SoundPriorityManager.PRIORITY.CRITICAL);

// Player attack - high priority
priorityManager.play('player_attack', attackSound, SoundPriorityManager.PRIORITY.HIGH);

// Enemy sounds - medium
priorityManager.play('enemy_growl_1', growlSound, SoundPriorityManager.PRIORITY.MEDIUM);

// Distant ambient - can be dropped if needed
priorityManager.play('distant_birds', birdsSound, SoundPriorityManager.PRIORITY.BACKGROUND);
```

## Sound Variation System

Prevents repetition fatigue by adding controlled randomness.

```typescript
interface SoundVariation {
  file: string;
  pitchRange: [number, number];    // Random pitch multiplier range
  volumeRange: [number, number];   // Random volume multiplier range
  weight: number;                   // Selection probability weight
}

class VariationSoundPlayer {
  private variations: SoundVariation[];
  private sounds: Map<string, Howl> = new Map();
  private lastPlayedIndex: number = -1;
  private noRepeatCount: number;
  private recentlyPlayed: number[] = [];
  
  constructor(variations: SoundVariation[], noRepeatCount: number = 2) {
    this.variations = variations;
    this.noRepeatCount = Math.min(noRepeatCount, variations.length - 1);
    
    // Preload all variations
    variations.forEach((v, i) => {
      this.sounds.set(v.file, new Howl({
        src: [v.file],
        preload: true
      }));
    });
  }
  
  play(volumeMultiplier: number = 1, pitchMultiplier: number = 1): number | null {
    // Select variation avoiding recent ones
    const availableIndices = this.variations
      .map((_, i) => i)
      .filter(i => !this.recentlyPlayed.includes(i));
    
    // Weighted random selection
    const totalWeight = availableIndices.reduce(
      (sum, i) => sum + this.variations[i].weight, 0
    );
    
    let random = Math.random() * totalWeight;
    let selectedIndex = availableIndices[0];
    
    for (const i of availableIndices) {
      random -= this.variations[i].weight;
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }
    
    // Track recently played
    this.recentlyPlayed.push(selectedIndex);
    if (this.recentlyPlayed.length > this.noRepeatCount) {
      this.recentlyPlayed.shift();
    }
    
    // Get variation config
    const variation = this.variations[selectedIndex];
    const sound = this.sounds.get(variation.file);
    if (!sound) return null;
    
    // Apply randomization
    const [minPitch, maxPitch] = variation.pitchRange;
    const [minVol, maxVol] = variation.volumeRange;
    
    const pitch = (minPitch + Math.random() * (maxPitch - minPitch)) * pitchMultiplier;
    const volume = (minVol + Math.random() * (maxVol - minVol)) * volumeMultiplier;
    
    sound.rate(pitch);
    sound.volume(volume);
    
    return sound.play();
  }
  
  stop() {
    this.sounds.forEach(sound => sound.stop());
  }
}

// Usage: Footsteps with natural variation
const footsteps = new VariationSoundPlayer([
  { file: 'step_01.webm', pitchRange: [0.95, 1.05], volumeRange: [0.8, 1.0], weight: 1 },
  { file: 'step_02.webm', pitchRange: [0.95, 1.05], volumeRange: [0.8, 1.0], weight: 1 },
  { file: 'step_03.webm', pitchRange: [0.95, 1.05], volumeRange: [0.8, 1.0], weight: 1 },
  { file: 'step_04.webm', pitchRange: [0.95, 1.05], volumeRange: [0.8, 1.0], weight: 1 },
  { file: 'step_05.webm', pitchRange: [0.95, 1.05], volumeRange: [0.8, 1.0], weight: 1 },
], 2);  // Don't repeat last 2 sounds

// Each call sounds slightly different
footsteps.play();
footsteps.play();
footsteps.play();

// Intensity-based (e.g., running vs walking)
footsteps.play(1.2, 1.1);  // Louder and higher pitch for running
```

## Complete Integrated Audio System

```typescript
class GameAudioSystem {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private musicGain: GainNode;
  private sfxGain: GainNode;
  private uiGain: GainNode;
  
  private adaptiveMusic: VerticalAdaptiveMusic;
  private priorityManager: SoundPriorityManager;
  private musicDucker: SimpleMusicDucker;
  private variationPlayers: Map<string, VariationSoundPlayer> = new Map();
  
  // Volume settings
  private volumes = {
    master: 1.0,
    music: 0.5,
    sfx: 0.8,
    ui: 0.6
  };
  
  constructor() {
    this.audioContext = new AudioContext();
    
    // Create gain chain
    this.masterGain = this.audioContext.createGain();
    this.musicGain = this.audioContext.createGain();
    this.sfxGain = this.audioContext.createGain();
    this.uiGain = this.audioContext.createGain();
    
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.uiGain.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);
    
    // Initialize subsystems
    this.adaptiveMusic = new VerticalAdaptiveMusic();
    this.priorityManager = new SoundPriorityManager(12);
  }
  
  // === Music ===
  
  setupAdaptiveMusic(layers: Array<{
    key: string;
    src: string[];
    intensityRange: [number, number];
    volume: number;
  }>) {
    layers.forEach(l => {
      this.adaptiveMusic.addLayer(l.key, l.src, l.intensityRange, l.volume);
    });
  }
  
  startMusic() {
    this.adaptiveMusic.start();
  }
  
  setMusicIntensity(intensity: number) {
    this.adaptiveMusic.setIntensity(intensity);
  }
  
  // === SFX ===
  
  registerVariationSound(key: string, variations: SoundVariation[]) {
    this.variationPlayers.set(key, new VariationSoundPlayer(variations));
  }
  
  playSFX(
    sound: Howl | string,
    options: {
      priority?: number;
      volume?: number;
      pitch?: number;
      duckMusic?: boolean;
    } = {}
  ) {
    const {
      priority = SoundPriorityManager.PRIORITY.MEDIUM,
      volume = 1,
      pitch = 1,
      duckMusic = false
    } = options;
    
    // If string, check variation players
    if (typeof sound === 'string') {
      const player = this.variationPlayers.get(sound);
      if (player) {
        player.play(volume * this.volumes.sfx, pitch);
        return;
      }
    }
    
    // Handle Howl directly
    if (sound instanceof Howl) {
      const id = `sfx_${Date.now()}_${Math.random()}`;
      
      if (duckMusic) {
        this.musicDucker?.duckFor(sound);
      }
      
      sound.volume(volume * this.volumes.sfx * this.volumes.master);
      sound.rate(pitch);
      
      this.priorityManager.play(id, sound, priority);
    }
  }
  
  playUI(sound: Howl) {
    sound.volume(this.volumes.ui * this.volumes.master);
    sound.play();
  }
  
  // === Important SFX (with ducking) ===
  
  playImpactSFX(sound: Howl, intensity: number = 1) {
    this.playSFX(sound, {
      priority: SoundPriorityManager.PRIORITY.HIGH,
      volume: intensity,
      duckMusic: intensity > 0.5
    });
  }
  
  // === Volume Controls ===
  
  setMasterVolume(volume: number) {
    this.volumes.master = volume;
    this.masterGain.gain.value = volume;
  }
  
  setMusicVolume(volume: number) {
    this.volumes.music = volume;
    this.adaptiveMusic.setMasterVolume(volume);
  }
  
  setSFXVolume(volume: number) {
    this.volumes.sfx = volume;
  }
  
  setUIVolume(volume: number) {
    this.volumes.ui = volume;
  }
  
  // === Lifecycle ===
  
  pause() {
    this.audioContext.suspend();
  }
  
  resume() {
    this.audioContext.resume();
  }
  
  destroy() {
    this.priorityManager.stopAll();
    this.adaptiveMusic.stop();
    this.audioContext.close();
  }
}

// Usage
const audio = new GameAudioSystem();

// Setup adaptive battle music
audio.setupAdaptiveMusic([
  { key: 'ambient', src: ['battle_ambient.webm'], intensityRange: [0, 0.5], volume: 0.6 },
  { key: 'melody', src: ['battle_melody.webm'], intensityRange: [0.2, 0.8], volume: 0.8 },
  { key: 'drums', src: ['battle_drums.webm'], intensityRange: [0.4, 1.0], volume: 0.9 },
  { key: 'epic', src: ['battle_epic.webm'], intensityRange: [0.7, 1.0], volume: 1.0 }
]);

// Register varied sounds
audio.registerVariationSound('hit', [
  { file: 'hit_01.webm', pitchRange: [0.95, 1.05], volumeRange: [0.9, 1.0], weight: 1 },
  { file: 'hit_02.webm', pitchRange: [0.95, 1.05], volumeRange: [0.9, 1.0], weight: 1 },
  { file: 'hit_03.webm', pitchRange: [0.95, 1.05], volumeRange: [0.9, 1.0], weight: 1 },
]);

// Start music
audio.startMusic();

// During gameplay
audio.setMusicIntensity(0.7);
audio.playSFX('hit', { priority: SoundPriorityManager.PRIORITY.HIGH });
audio.playImpactSFX(explosionSound, 1.0);
```
