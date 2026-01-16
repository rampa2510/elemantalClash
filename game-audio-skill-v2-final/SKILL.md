---
name: game-audio
version: 2.0
description: Comprehensive web game audio implementation covering Phaser 3 built-in audio, Howler.js, Tone.js, and Web Audio API. Use when building audio systems for web games, implementing sound effects, background music, audio sprites, spatial audio, or integrating audio libraries into Phaser/TypeScript/JavaScript games. Covers browser compatibility, mobile/iOS considerations, audio formats, performance optimization, and free sound resources. Achieves AAA-quality immersive experiences like Naruto Storm, Genshin Impact, Dragon Ball FighterZ.
---

# Web Game Audio Mastery v2.0: AAA-Quality Sound for Browser Games

This skill enables creating immersive, professional-grade audio experiences comparable to Naruto Storm, Genshin Impact, and high-end anime games - **optimized for browser performance with zero glitches**.

## Quick Start: What to Read First

```
Need implementation guide? → references/browser-implementation-guide.md ⭐ NEW
Finding sounds?           → references/premium-resources.md (200GB+ free sounds)
Sound design tips?        → references/sound-design-mastery.md
Using Phaser 3?           → references/phaser-audio.md
Using Howler.js?          → references/howler-guide.md
Procedural/Synthesis?     → references/tone-guide.md ⭐ NEW
Advanced audio systems?   → references/advanced-systems.md
Mixing & optimization?    → references/mixing-mastering.md
```

## Core Philosophy

**Professional game audio isn't about finding better sounds—it's about layering, processing, and implementing sounds with expert technique.** A single explosion becomes cinematic through frequency-separated layering (sub-bass thump + mid-range body + high-frequency crack), precise transient shaping, and careful mix placement.

## Reference Files (Read Before Implementing)

| File | Purpose |
|------|---------|
| **references/browser-implementation-guide.md** | ⭐ Complete implementation plan, memory budgets, bug fixes, testing checklist |
| **references/premium-resources.md** | 200GB+ free professional sounds (Sonniss GDC, Helton Yan anime packs, Kenney CC0) |
| **references/sound-design-mastery.md** | Layering, impact design, anime audio signatures, Japanese studio secrets |
| **references/phaser-audio.md** | Complete Phaser 3 audio API reference |
| **references/howler-guide.md** | Howler.js patterns, sprites, spatial audio, pooling |
| **references/tone-guide.md** | ⭐ Tone.js synthesis, procedural audio, effects chains |
| **references/advanced-systems.md** | Adaptive music, ducking, priority, variation systems |
| **references/mixing-mastering.md** | Volume balancing, EQ, compression, format optimization |

## Quick Reference: Library Selection

| Library | Best For | Size | Key Strengths |
|---------|----------|------|---------------|
| **Phaser Built-in** | Phaser games | 0KB | Web Audio + HTML5 fallback, spatial audio, sprites |
| **Howler.js** | Any framework | 7KB | Universal compatibility, auto-caching, 3D spatial |
| **Tone.js** | Procedural audio | 83KB | Synthesis, effects, scheduling, interactive music |
| **Web Audio API** | Full control | Native | Low-level access, real-time processing |

## Critical Browser Rules

### User Interaction Requirement (MANDATORY)
```typescript
// Audio CANNOT play without user interaction - no exceptions
// Pattern: Unlock on first click/tap
document.addEventListener('click', async () => {
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
}, { once: true });
```

### Audio Format Priority
```typescript
// Always provide fallbacks in this order:
// 1. WebM/Opus (best quality/size, 93%+ support)
// 2. OGG Vorbis (good fallback)
// 3. MP3 (universal fallback)

this.load.audio('explosion', [
  'audio/explosion.webm',
  'audio/explosion.ogg', 
  'audio/explosion.mp3'
]);
```

### FFmpeg Encoding Commands
```bash
# SFX: WebM/Opus (96kbps mono)
ffmpeg -i input.wav -ac 1 -c:a libopus -b:a 96k output.webm

# Music: WebM/Opus (128kbps stereo)
ffmpeg -i input.wav -c:a libopus -b:a 128k output.webm

# MP3 fallback
ffmpeg -i input.wav -c:a libmp3lame -q:a 2 output.mp3

# Normalize loudness (-16 LUFS target)
ffmpeg -i input.wav -af loudnorm=I=-16:TP=-1.5:LRA=11 output.wav
```

## The Anime/Action Game Audio Signature

Games like Naruto Storm achieve their distinctive sound through:

1. **Exaggeration Philosophy** - Everything sounds larger than life
2. **Extended Reverb Tails** - Impacts have epic scale (500ms+ reverb)
3. **Layered Whooshes** - Multiple layers build anticipation before impacts
4. **Heavy Bass Content** - Synthesized sub-bass (60-100Hz) mixed with organic sounds
5. **Hitstop Audio** - Brief silence/ducking before major impacts
6. **Dramatic Stings** - Musical accents at key moments

### Impact Sound Layering (Critical Technique)
```
Layer 1: SUB-BASS (20-100Hz) - Synthetic thump for weight/power
Layer 2: MID-RANGE (200-2000Hz) - Body, character, meat of the sound
Layer 3: HIGH FREQ (2000-10000Hz) - Attack, crack, sparkle, clarity
Layer 4: ENHANCER - Whoosh, reverb tail, or elemental texture
```

## Quick Implementation Patterns

### Phaser 3 Basic Setup
```typescript
preload() {
  this.load.audio('bgMusic', ['music.webm', 'music.mp3']);
  this.load.audio('impact', ['impact.webm', 'impact.mp3']);
}

create() {
  // Background music with fade-in
  this.bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0 });
  
  // Unlock and start on first interaction
  this.input.once('pointerdown', () => {
    this.bgMusic.play();
    this.tweens.add({ targets: this.bgMusic, volume: 0.4, duration: 2000 });
  });
}

playImpact() {
  // Random pitch variation prevents repetition fatigue
  this.sound.play('impact', { 
    volume: 0.8 + Math.random() * 0.2,
    rate: 0.95 + Math.random() * 0.1  // ±5% pitch
  });
}
```

### Howler.js with Sound Pool
```typescript
import { Howl, Howler } from 'howler';

class SoundPool {
  private pool: Howl[] = [];
  private index = 0;
  
  constructor(src: string[], size = 5) {
    for (let i = 0; i < size; i++) {
      this.pool.push(new Howl({ src, preload: true }));
    }
  }
  
  play(volume = 1, rate = 1): number {
    const howl = this.pool[this.index];
    this.index = (this.index + 1) % this.pool.length;
    howl.volume(volume * (0.9 + Math.random() * 0.2));
    howl.rate(rate * (0.95 + Math.random() * 0.1));
    return howl.play();
  }
}

// Usage: Rapid-fire sounds without cutoff
const laserPool = new SoundPool(['laser.webm', 'laser.mp3'], 8);
laserPool.play();
```

## Memory & Performance Guidelines

| Platform | Max Loaded Audio | Notes |
|----------|------------------|-------|
| Mobile | 15MB | Use audio sprites, aggressive eviction |
| Desktop | 50MB | Individual files OK for music |

### Audio Sprite Creation
```bash
# Install: npm install -g audiosprite
# Create sprite from multiple WAV files:
audiosprite -f howler -e "webm,mp3" *.wav -o game-sfx

# Output: game-sfx.json + game-sfx.webm + game-sfx.mp3
```

## Volume Balancing Reference

| Category | Relative Level | Notes |
|----------|----------------|-------|
| UI Sounds | -6 to -9 dB | Clear but non-intrusive |
| Sound Effects | -6 to -12 dB | Primary feedback layer |
| Music | -12 to -18 dB | Background presence |
| Ambient | -15 to -24 dB | Subtle environmental |

**Target: -16 to -18 LUFS with -1 dBTP true peak maximum**

## Workflow

1. **Read references/browser-implementation-guide.md** - Get the complete implementation plan
2. **Read references/premium-resources.md** - Download sounds from Sonniss GDC (200GB free!)
3. **Read references/sound-design-mastery.md** - Learn layering and impact design
4. **Implement using AudioManager pattern** - See browser-implementation-guide.md
5. **Read references/mixing-mastering.md** - Balance and optimize final mix
6. **Test on multiple devices** - Laptop speakers, headphones, phone

## Browser Optimization Checklist (CRITICAL)

```
□ Convert to WebM/Opus + MP3 fallback (95% smaller than WAV)
□ Keep total audio under 15MB mobile / 50MB desktop
□ Use audio sprites for SFX (reduce HTTP requests)
□ Stream music with html5: true (don't buffer entire file)
□ Implement sound pooling (prevents cutoff on rapid play)
□ Add user interaction unlock (required by ALL browsers)
□ Handle tab visibility (mute when hidden)
□ Test Chrome, Firefox, Safari, Edge + mobile
```

## Common Mistakes to Avoid

- ❌ Playing audio before user interaction (will fail silently)
- ❌ Same sound repeated without variation (causes fatigue)
- ❌ Music too loud relative to SFX (drowns feedback)
- ❌ No format fallbacks (breaks on some browsers)
- ❌ Loading individual files for many small SFX (use sprites)
- ❌ Not handling tab visibility (audio should pause)
- ❌ Buffering entire music files (use html5: true for streaming)
- ❌ No sound pooling for rapid-fire sounds (causes cutoff)

## File Size Targets

| Type | Target Size | Format | Notes |
|------|-------------|--------|-------|
| UI click | 3-10 KB | WebM mono 64k | Very short |
| Impact SFX | 20-50 KB | WebM mono 64k | With reverb tail |
| Whoosh | 10-30 KB | WebM mono 64k | Short duration |
| Card flip | 5-15 KB | WebM mono 64k | Crisp, clean |
| Music loop | 1-3 MB | WebM stereo 128k | Stream, don't buffer |
| Ambient loop | 200-500 KB | WebM stereo 96k | Can compress more |

## Total Audio Budget Example (Card Game)

```
Total: ~12 MB (safe for all devices)

UI Sounds:       500 KB (sprites)
Combat SFX:      2 MB (impacts, whooshes, elemental)
Card Sounds:     500 KB (flip, deal, shuffle)
Stingers:        500 KB (victory, defeat)
Music:           8 MB (streamed, not preloaded)
```
