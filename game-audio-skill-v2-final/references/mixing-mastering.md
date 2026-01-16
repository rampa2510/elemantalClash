# Mixing & Mastering for Browser Game Audio

This reference covers the technical aspects of achieving professional-quality audio output: volume balancing, EQ, compression, format optimization, and the delivery pipeline.

## Volume Balancing Standards

### Relative Level Guidelines

| Category | Level (relative to master) | dB from 0 | Notes |
|----------|---------------------------|-----------|-------|
| **Master Peak** | 0 dB | 0 dB | Never exceed |
| **UI Sounds** | -6 to -9 dB | 50-35% | Clear but non-intrusive |
| **Player Actions** | -6 to -9 dB | 50-35% | Critical feedback |
| **Combat SFX** | -6 to -12 dB | 50-25% | Varies by importance |
| **Music** | -12 to -18 dB | 25-12% | Background presence |
| **Ambient** | -15 to -24 dB | 18-6% | Subtle atmosphere |
| **Footsteps** | -12 to -15 dB | 25-18% | Present but not distracting |

### Loudness Standards

**Target: -16 to -18 LUFS (Integrated)**

- **LUFS** (Loudness Units Full Scale) = perceived loudness
- **True Peak**: -1 dBTP maximum (headroom for encoding)
- **Loudness Range**: 10-15 LU for games (less than music/film)

```bash
# Measure loudness with FFmpeg
ffmpeg -i audio.wav -af loudnorm=print_format=json -f null - 2>&1 | grep -A 10 "output_"

# Normalize to -16 LUFS
ffmpeg -i input.wav -af loudnorm=I=-16:TP=-1.5:LRA=11 output.wav
```

### Why -16 LUFS for Browser Games?

- Accommodates various playback devices (phones to headphones)
- Leaves headroom for simultaneous sounds
- Prevents distortion on low-quality speakers
- Matches typical web media standards

## EQ Techniques for Game Audio

### Frequency Ranges Reference

```
SUB-BASS     20-60 Hz    │ Rumble, felt more than heard
BASS         60-200 Hz   │ Weight, warmth, body
LOW-MIDS     200-500 Hz  │ Fullness, muddiness zone
MIDS         500-2000 Hz │ Presence, fundamental tones
UPPER-MIDS   2-4 kHz     │ Clarity, attack, edge
PRESENCE     4-6 kHz     │ Definition, "in your face"
BRILLIANCE   6-10 kHz    │ Air, sparkle, sibilance
HIGH         10-20 kHz   │ Air, shimmer, breathiness
```

### Essential EQ Moves

#### 1. High-Pass Everything (Except Bass Elements)
```bash
# Remove sub-bass rumble from non-bass sounds
ffmpeg -i input.wav -af "highpass=f=80" output.wav

# Recommended high-pass frequencies:
# UI sounds: 200-300 Hz
# Vocals/dialogue: 100-150 Hz
# Most SFX: 80-120 Hz
# Music (full): none or 30 Hz
# Impacts: 30-60 Hz (keep the weight)
```

#### 2. Cut the Mud (300-500 Hz)
Most amateur mixes sound "muddy" due to buildup here.
```bash
# Gentle mud cut
ffmpeg -i input.wav -af "equalizer=f=400:t=q:w=1:g=-3" output.wav
```

#### 3. Boost Presence for Clarity (2-6 kHz)
```bash
# Add clarity/presence
ffmpeg -i input.wav -af "equalizer=f=3000:t=q:w=2:g=2" output.wav
```

### EQ by Sound Type

#### UI Clicks/Buttons
```
High-pass: 200-300 Hz (remove unnecessary bass)
Boost: 2-4 kHz for snap
Cut: 400 Hz for clarity
Result: Crisp, clean clicks
```

#### Impacts/Hits
```
Keep: 60-100 Hz for weight
Cut: 300-500 Hz if muddy
Boost: 2-4 kHz for attack
Boost: 80-100 Hz for sub-thump
Result: Punchy, powerful hits
```

#### Magic/Spell Effects
```
High-pass: 80-120 Hz
Boost: 6-10 kHz for shimmer
Add: Subtle 100 Hz for magical weight
Result: Ethereal but grounded
```

#### Background Music
```
High-pass: 30-40 Hz (remove DC offset/rumble)
Cut: 250-400 Hz to prevent mud
Slight cut: 2-4 kHz if competing with SFX
Result: Full but non-intrusive
```

### Web Audio API EQ Implementation

```typescript
class GameEQ {
  private context: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private filters: BiquadFilterNode[] = [];
  
  constructor(context: AudioContext) {
    this.context = context;
    this.inputNode = context.createGain();
    this.outputNode = context.createGain();
    
    // Create filter chain
    this.createFilterChain();
  }
  
  private createFilterChain() {
    // High-pass (remove rumble)
    const highpass = this.context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 80;
    highpass.Q.value = 0.7;
    
    // Low shelf (bass control)
    const lowShelf = this.context.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 200;
    lowShelf.gain.value = 0;
    
    // Parametric mid (mud cut)
    const midCut = this.context.createBiquadFilter();
    midCut.type = 'peaking';
    midCut.frequency.value = 400;
    midCut.Q.value = 1;
    midCut.gain.value = -2;
    
    // Presence boost
    const presence = this.context.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 3000;
    presence.Q.value = 1;
    presence.gain.value = 2;
    
    // High shelf (air/brilliance)
    const highShelf = this.context.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 8000;
    highShelf.gain.value = 0;
    
    this.filters = [highpass, lowShelf, midCut, presence, highShelf];
    
    // Connect chain
    this.inputNode.connect(highpass);
    highpass.connect(lowShelf);
    lowShelf.connect(midCut);
    midCut.connect(presence);
    presence.connect(highShelf);
    highShelf.connect(this.outputNode);
  }
  
  get input(): AudioNode {
    return this.inputNode;
  }
  
  get output(): AudioNode {
    return this.outputNode;
  }
  
  // Preset configurations
  applyPreset(preset: 'impact' | 'ui' | 'music' | 'voice') {
    switch (preset) {
      case 'impact':
        this.filters[0].frequency.value = 40;   // Lower high-pass
        this.filters[1].gain.value = 3;         // Bass boost
        this.filters[2].gain.value = -3;        // Cut mud
        this.filters[3].gain.value = 2;         // Presence
        break;
      case 'ui':
        this.filters[0].frequency.value = 250;  // Higher high-pass
        this.filters[1].gain.value = -2;        // Reduce bass
        this.filters[3].gain.value = 3;         // More presence
        this.filters[4].gain.value = 2;         // Add air
        break;
      case 'music':
        this.filters[0].frequency.value = 30;
        this.filters[2].gain.value = -2;
        this.filters[3].gain.value = -1;        // Slight presence cut
        break;
      case 'voice':
        this.filters[0].frequency.value = 120;
        this.filters[1].gain.value = -2;
        this.filters[3].gain.value = 4;
        break;
    }
  }
}
```

## Dynamics Processing

### Compression for Games

Games need controlled dynamics - too much range and quiet sounds get lost.

#### Web Audio Compressor
```typescript
function createGameCompressor(context: AudioContext): DynamicsCompressorNode {
  const compressor = context.createDynamicsCompressor();
  
  // Settings for game audio
  compressor.threshold.value = -18;  // Start compressing at -18dB
  compressor.knee.value = 10;        // Soft knee for natural sound
  compressor.ratio.value = 4;        // 4:1 ratio (moderate)
  compressor.attack.value = 0.02;    // 20ms attack (fast enough for transients)
  compressor.release.value = 0.2;    // 200ms release
  
  return compressor;
}

// For limiting (prevent clipping)
function createLimiter(context: AudioContext): DynamicsCompressorNode {
  const limiter = context.createDynamicsCompressor();
  
  limiter.threshold.value = -1;      // Catch peaks just before clipping
  limiter.knee.value = 0;            // Hard knee
  limiter.ratio.value = 20;          // Essentially infinite ratio
  limiter.attack.value = 0.001;      // 1ms attack (very fast)
  limiter.release.value = 0.1;       // 100ms release
  
  return limiter;
}
```

#### Complete Master Chain
```typescript
class MasterBus {
  private context: AudioContext;
  private input: GainNode;
  private eq: GameEQ;
  private compressor: DynamicsCompressorNode;
  private limiter: DynamicsCompressorNode;
  private output: GainNode;
  
  constructor(context: AudioContext) {
    this.context = context;
    
    // Create nodes
    this.input = context.createGain();
    this.eq = new GameEQ(context);
    this.compressor = createGameCompressor(context);
    this.limiter = createLimiter(context);
    this.output = context.createGain();
    
    // Connect chain
    this.input.connect(this.eq.input);
    this.eq.output.connect(this.compressor);
    this.compressor.connect(this.limiter);
    this.limiter.connect(this.output);
    this.output.connect(context.destination);
  }
  
  connectSource(source: AudioNode) {
    source.connect(this.input);
  }
  
  setMasterVolume(volume: number) {
    this.output.gain.value = volume;
  }
}
```

## Audio Format Optimization

### Format Comparison

| Format | Quality | Size | Browser Support | Best For |
|--------|---------|------|-----------------|----------|
| **WebM/Opus** | Excellent | Smallest | 93%+ | Primary format |
| **OGG Vorbis** | Very Good | Small | 95%+ | Fallback |
| **MP3** | Good | Medium | 100% | Universal fallback |
| **AAC/M4A** | Excellent | Small | Safari-preferred | iOS optimization |
| **WAV** | Perfect | Huge | 100% | Source only |

### Recommended Settings

#### Sound Effects
```bash
# Primary: WebM/Opus (best quality/size)
ffmpeg -i input.wav -ac 1 -c:a libopus -b:a 96k output.webm

# Fallback: MP3
ffmpeg -i input.wav -ac 1 -c:a libmp3lame -q:a 2 output.mp3

# Note: -ac 1 = mono (saves 50% size, fine for most SFX)
```

#### Background Music
```bash
# Primary: WebM/Opus stereo
ffmpeg -i input.wav -c:a libopus -b:a 128k output.webm

# Higher quality option
ffmpeg -i input.wav -c:a libopus -b:a 192k output_hq.webm

# MP3 fallback
ffmpeg -i input.wav -c:a libmp3lame -q:a 0 output.mp3
```

#### Looping Music (Gap-Free)
```bash
# Ensure seamless loops
ffmpeg -i input.wav -c:a libopus -b:a 128k -avoid_negative_ts make_zero output.webm
```

### Batch Conversion Scripts

```bash
#!/bin/bash
# convert_sfx.sh - Convert all WAV SFX to WebM + MP3

mkdir -p output/webm output/mp3

for file in *.wav; do
  name="${file%.wav}"
  
  # Normalize first
  ffmpeg -i "$file" -af loudnorm=I=-16:TP=-1.5:LRA=11 "normalized_$file"
  
  # Convert to mono WebM/Opus
  ffmpeg -i "normalized_$file" -ac 1 -c:a libopus -b:a 96k "output/webm/${name}.webm"
  
  # Convert to mono MP3
  ffmpeg -i "normalized_$file" -ac 1 -c:a libmp3lame -q:a 2 "output/mp3/${name}.mp3"
  
  # Cleanup
  rm "normalized_$file"
done
```

```bash
#!/bin/bash
# convert_music.sh - Convert music files

mkdir -p output/webm output/mp3

for file in *.wav; do
  name="${file%.wav}"
  
  # Normalize
  ffmpeg -i "$file" -af loudnorm=I=-16:TP=-1.5:LRA=11 "normalized_$file"
  
  # Convert to stereo WebM/Opus
  ffmpeg -i "normalized_$file" -c:a libopus -b:a 128k "output/webm/${name}.webm"
  
  # Convert to stereo MP3
  ffmpeg -i "normalized_$file" -c:a libmp3lame -q:a 0 "output/mp3/${name}.mp3"
  
  rm "normalized_$file"
done
```

### Audio Sprite Creation

```bash
# Install audiosprite
npm install -g audiosprite

# Create sprite from multiple files
audiosprite \
  -f howler \              # Output format (howler/createjs/default)
  -e "webm,mp3" \          # Export formats
  -b 96000 \               # Bitrate
  -o game-sfx \            # Output filename
  *.wav                    # Input files

# Output: game-sfx.json + game-sfx.webm + game-sfx.mp3
```

## Memory & Loading Optimization

### Size Targets

| Category | Target Size | Notes |
|----------|-------------|-------|
| UI sound | 5-20 KB | Short, mono, low bitrate OK |
| Impact SFX | 20-80 KB | Short but full quality |
| Ambient loop | 100-300 KB | Longer, can compress more |
| Music track | 500KB-2MB | Depends on length |
| Total mobile | <15 MB | Hard limit for mobile |
| Total desktop | <50 MB | Comfortable limit |

### Loading Strategies

#### 1. Essential-First Loading
```typescript
// Load critical sounds first
const essentialSounds = [
  'ui_click',
  'ui_confirm', 
  'player_hit',
  'music_menu'
];

const secondarySounds = [
  'ambient_wind',
  'enemy_death_01',
  'enemy_death_02',
  // ... etc
];

async function loadAudio() {
  // Load essential first
  await Promise.all(essentialSounds.map(loadSound));
  
  // Start game with essentials
  showMainMenu();
  
  // Load secondary in background
  secondarySounds.forEach(key => loadSound(key)); // Don't await
}
```

#### 2. Lazy Loading
```typescript
const soundCache: Map<string, Howl> = new Map();

async function getSound(key: string): Promise<Howl> {
  if (soundCache.has(key)) {
    return soundCache.get(key)!;
  }
  
  const sound = new Howl({
    src: [`audio/${key}.webm`, `audio/${key}.mp3`]
  });
  
  return new Promise((resolve, reject) => {
    sound.once('load', () => {
      soundCache.set(key, sound);
      resolve(sound);
    });
    sound.once('loaderror', reject);
  });
}
```

#### 3. Scene-Based Loading/Unloading
```typescript
const sceneAudio = {
  menu: ['music_menu', 'ui_click', 'ui_hover'],
  battle: ['music_battle', 'hit_01', 'hit_02', 'explosion'],
  victory: ['music_victory', 'fanfare']
};

function loadScene(scene: string) {
  const sounds = sceneAudio[scene] || [];
  sounds.forEach(key => loadSound(key));
}

function unloadScene(scene: string) {
  const sounds = sceneAudio[scene] || [];
  sounds.forEach(key => {
    const sound = soundCache.get(key);
    if (sound) {
      sound.unload();
      soundCache.delete(key);
    }
  });
}
```

## Testing Checklist

### Before Release

- [ ] **Volume Balance**
  - [ ] Music doesn't overpower SFX
  - [ ] UI sounds are clear but not jarring
  - [ ] No sudden loud moments
  - [ ] Quiet moments are intentional

- [ ] **Format Support**
  - [ ] Test WebM playback in Chrome, Firefox, Edge
  - [ ] Test MP3 fallback in Safari
  - [ ] Verify iOS audio works

- [ ] **Functionality**
  - [ ] Audio starts after user interaction
  - [ ] Loops play seamlessly (no gaps)
  - [ ] Sounds don't cut off unexpectedly
  - [ ] Tab switching pauses/resumes properly

- [ ] **Performance**
  - [ ] No audio glitches during gameplay
  - [ ] Memory usage stays within limits
  - [ ] Loading times acceptable

- [ ] **Device Testing**
  - [ ] Laptop speakers (often bad)
  - [ ] Headphones (reveals detail)
  - [ ] Phone speakers (worst case)
  - [ ] Bluetooth speakers (latency check)

### Quick Quality Check

1. **The Squint Test**: Close your eyes and play. Does the audio tell you what's happening?

2. **The Speaker Test**: Play on phone speaker. Still clear? Important sounds stand out?

3. **The Living Room Test**: Play in noisy environment. Critical sounds still audible?

4. **The Headphone Test**: Play on good headphones. Any harshness? Unpleasant frequencies?

5. **The Volume Test**: Play at 50% volume. Still enjoyable? Play at max volume. Any distortion?

## FFmpeg Command Reference

```bash
# Basic conversion
ffmpeg -i input.wav -c:a libopus -b:a 96k output.webm

# Normalize loudness
ffmpeg -i input.wav -af loudnorm=I=-16:TP=-1.5:LRA=11 output.wav

# Convert to mono
ffmpeg -i input.wav -ac 1 output.wav

# Trim audio (start at 1s, duration 3s)
ffmpeg -i input.wav -ss 1 -t 3 output.wav

# Fade in/out
ffmpeg -i input.wav -af "afade=t=in:ss=0:d=0.5,afade=t=out:st=2.5:d=0.5" output.wav

# Change sample rate
ffmpeg -i input.wav -ar 44100 output.wav

# High-pass filter
ffmpeg -i input.wav -af "highpass=f=100" output.wav

# Compress dynamic range
ffmpeg -i input.wav -af "acompressor=threshold=-20dB:ratio=4:attack=20:release=200" output.wav

# Get audio info
ffprobe -v quiet -show_format -show_streams input.wav

# Measure loudness
ffmpeg -i input.wav -af loudnorm=print_format=json -f null - 2>&1

# Batch normalize folder
for f in *.wav; do ffmpeg -i "$f" -af loudnorm=I=-16:TP=-1.5 "normalized/$f"; done
```
