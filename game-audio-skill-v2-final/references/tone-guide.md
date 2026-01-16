# Tone.js Guide: Procedural Audio & Synthesis

Tone.js is a Web Audio framework for creating interactive music and procedural sound effects in the browser. Use it when you need:
- Synthesized sounds (generated, not samples)
- Musical timing and sequencing
- Real-time audio effects
- Dynamic/procedural audio generation

**Size:** ~83KB minified
**URL:** https://tonejs.github.io/

## When to Use Tone.js vs Howler.js

| Use Case | Tone.js | Howler.js |
|----------|---------|-----------|
| Playing samples | ✓ | ✓✓✓ (better) |
| Synthesized sounds | ✓✓✓ (best) | ✗ |
| Music sequencing | ✓✓✓ (best) | ✗ |
| Audio effects chain | ✓✓✓ (best) | Limited |
| Simple SFX playback | Overkill | ✓✓✓ (best) |
| Browser compatibility | Good | ✓✓✓ (better) |
| File size | 83KB | 7KB |

**Recommendation:** Use Howler.js for sample playback, Tone.js for synthesis and procedural audio.

## Installation

```bash
npm install tone
```

```typescript
import * as Tone from 'tone';

// CRITICAL: Start audio context on user interaction
document.addEventListener('click', async () => {
  await Tone.start();
  console.log('Tone.js audio ready');
}, { once: true });
```

## Basic Synthesis

### Simple Synth

```typescript
// Create a synth and connect to speakers
const synth = new Tone.Synth().toDestination();

// Play a note (pitch, duration)
synth.triggerAttackRelease("C4", "8n");

// Play with specific timing
synth.triggerAttackRelease("E4", "8n", "+0.5"); // 0.5 seconds from now
```

### Synth Types

```typescript
// Basic waveform synth
const basic = new Tone.Synth({
  oscillator: { type: "sine" }, // sine, square, triangle, sawtooth
  envelope: {
    attack: 0.005,
    decay: 0.1,
    sustain: 0.3,
    release: 0.5
  }
}).toDestination();

// FM Synth (great for bells, metallic sounds)
const fm = new Tone.FMSynth({
  modulationIndex: 10,
  harmonicity: 3
}).toDestination();

// AM Synth (tremolo-like sounds)
const am = new Tone.AMSynth().toDestination();

// Polyphonic synth (multiple notes)
const poly = new Tone.PolySynth(Tone.Synth).toDestination();
poly.triggerAttackRelease(["C4", "E4", "G4"], "4n"); // Chord
```

## Game Audio Use Cases

### UI Sound Synthesis

```typescript
// Satisfying button click
function playButtonClick() {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 2,
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0,
      release: 0.1
    }
  }).toDestination();
  
  synth.triggerAttackRelease("C3", "32n");
}

// Success/Level up sound
function playSuccess() {
  const synth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 }
  }).toDestination();
  
  const now = Tone.now();
  synth.triggerAttackRelease("C5", "16n", now);
  synth.triggerAttackRelease("E5", "16n", now + 0.1);
  synth.triggerAttackRelease("G5", "16n", now + 0.2);
  synth.triggerAttackRelease("C6", "8n", now + 0.3);
}

// Error sound
function playError() {
  const synth = new Tone.Synth({
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 }
  }).toDestination();
  
  synth.triggerAttackRelease("E3", "8n");
}
```

### Impact Synthesis (Sub-Bass Layer)

```typescript
// Synthesize the sub-bass layer for impacts
function playImpactBass(frequency = 60, duration = 0.15) {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 4,
    envelope: {
      attack: 0.001,
      decay: duration,
      sustain: 0,
      release: 0.1
    }
  }).toDestination();
  
  synth.triggerAttackRelease(frequency, duration);
}

// Epic hit with synthesized layers
function playEpicHit() {
  // Sub-bass thump
  const bass = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 4
  }).toDestination();
  bass.triggerAttackRelease("C1", "8n");
  
  // Distorted mid crunch
  const mid = new Tone.Synth({
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
  });
  const distortion = new Tone.Distortion(0.8).toDestination();
  mid.connect(distortion);
  mid.triggerAttackRelease("C3", "16n");
  
  // High frequency sizzle
  const noise = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
  }).toDestination();
  noise.volume.value = -12;
  noise.triggerAttackRelease("32n");
}
```

### Elemental Sound Synthesis

```typescript
// Fire crackle (procedural)
function playFireCrackle() {
  const filter = new Tone.Filter(2000, "lowpass").toDestination();
  const noise = new Tone.NoiseSynth({
    noise: { type: "brown" },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 }
  }).connect(filter);
  
  // Random crackles
  const loop = new Tone.Loop((time) => {
    if (Math.random() > 0.3) {
      noise.triggerAttackRelease("32n", time);
    }
  }, "16n").start(0);
  
  // Stop after 2 seconds
  Tone.Transport.scheduleOnce(() => loop.stop(), "+2");
}

// Electric zap
function playElectricZap() {
  const synth = new Tone.Synth({
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
  });
  
  const bitcrusher = new Tone.BitCrusher(4);
  const filter = new Tone.Filter(4000, "lowpass").toDestination();
  synth.chain(bitcrusher, filter);
  
  // Rapid frequency modulation
  const now = Tone.now();
  synth.frequency.setValueAtTime(880, now);
  synth.frequency.linearRampToValueAtTime(110, now + 0.1);
  synth.triggerAttackRelease("16n");
}

// Wind whoosh (synthesized)
function playWhoosh(duration = 0.3) {
  const noise = new Tone.NoiseSynth({
    noise: { type: "pink" },
    envelope: {
      attack: duration * 0.3,
      decay: duration * 0.5,
      sustain: 0.2,
      release: duration * 0.2
    }
  });
  
  const filter = new Tone.Filter({
    frequency: 500,
    type: "bandpass",
    Q: 2
  }).toDestination();
  
  noise.connect(filter);
  
  // Sweep the filter
  filter.frequency.setValueAtTime(200, Tone.now());
  filter.frequency.linearRampToValueAtTime(2000, Tone.now() + duration * 0.5);
  filter.frequency.linearRampToValueAtTime(500, Tone.now() + duration);
  
  noise.triggerAttackRelease(duration);
}
```

## Audio Effects

### Effect Chain

```typescript
// Create effects
const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 });
const delay = new Tone.FeedbackDelay("8n", 0.3);
const distortion = new Tone.Distortion(0.4);

// Chain: synth -> distortion -> delay -> reverb -> output
const synth = new Tone.Synth();
synth.chain(distortion, delay, reverb, Tone.Destination);

// Play with effects
synth.triggerAttackRelease("C4", "8n");
```

### Common Game Audio Effects

```typescript
// Reverb for epic scale
const epicReverb = new Tone.Reverb({
  decay: 3,
  preDelay: 0.01,
  wet: 0.5
}).toDestination();

// Distortion for aggression
const crunch = new Tone.Distortion({
  distortion: 0.6,
  wet: 0.5
}).toDestination();

// Filter for muffled/underwater
const underwater = new Tone.Filter({
  frequency: 500,
  type: "lowpass",
  rolloff: -24
}).toDestination();

// Bitcrusher for retro/digital
const retro = new Tone.BitCrusher(4).toDestination();

// Tremolo for pulsing energy
const pulse = new Tone.Tremolo({
  frequency: 10,
  depth: 0.5
}).toDestination().start();
```

## Timing and Sequencing

### Transport (Master Clock)

```typescript
// Start the transport
Tone.Transport.start();

// Set tempo
Tone.Transport.bpm.value = 120;

// Schedule events
Tone.Transport.scheduleOnce((time) => {
  synth.triggerAttackRelease("C4", "8n", time);
}, "1m"); // At measure 1

// Loop
const loop = new Tone.Loop((time) => {
  synth.triggerAttackRelease("C4", "8n", time);
}, "4n").start(0);

// Stop transport
Tone.Transport.stop();
```

### Musical Timing

```typescript
// Tone.js understands musical notation
// "4n" = quarter note
// "8n" = eighth note
// "16n" = sixteenth note
// "1m" = 1 measure
// "2:1:0" = measure:beat:sixteenth

// Schedule notes musically
const synth = new Tone.Synth().toDestination();
const seq = new Tone.Sequence((time, note) => {
  synth.triggerAttackRelease(note, "8n", time);
}, ["C4", "E4", "G4", "B4"], "4n").start(0);

Tone.Transport.start();
```

## Combining with Howler.js

Best practice: Use Tone.js for synthesis, Howler.js for samples.

```typescript
import * as Tone from 'tone';
import { Howl } from 'howler';

class GameAudio {
  private samplePlayer: Howl;
  private synth: Tone.Synth;
  private subBass: Tone.MembraneSynth;
  
  constructor() {
    // Samples via Howler
    this.samplePlayer = new Howl({
      src: ['impacts.webm', 'impacts.mp3'],
      sprite: {
        punch: [0, 300],
        kick: [300, 400]
      }
    });
    
    // Synthesis via Tone
    this.synth = new Tone.Synth().toDestination();
    this.subBass = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4
    }).toDestination();
  }
  
  async init() {
    await Tone.start();
  }
  
  playImpact() {
    // Sample layer (body, attack)
    this.samplePlayer.play('punch');
    
    // Synthesized sub-bass layer
    this.subBass.triggerAttackRelease("C1", "8n");
  }
  
  playUIClick() {
    // Pure synthesis for UI
    this.synth.triggerAttackRelease("C5", "32n");
  }
}
```

## Performance Tips

### Reuse Synths
```typescript
// DON'T: Create new synth per sound
function bad() {
  const synth = new Tone.Synth().toDestination(); // Memory leak!
  synth.triggerAttackRelease("C4", "8n");
}

// DO: Create once, reuse
const synth = new Tone.Synth().toDestination();
function good() {
  synth.triggerAttackRelease("C4", "8n");
}
```

### Dispose When Done
```typescript
// Clean up when leaving scene
function cleanup() {
  synth.dispose();
  reverb.dispose();
  loop.dispose();
}
```

### Lazy Loading
```typescript
// Load Tone.js only when needed
let Tone: typeof import('tone') | null = null;

async function initSynthesis() {
  if (!Tone) {
    Tone = await import('tone');
    await Tone.start();
  }
  return Tone;
}
```

## Complete Example: Procedural Game SFX

```typescript
import * as Tone from 'tone';

class ProceduralSFX {
  private uiSynth: Tone.Synth;
  private impactSynth: Tone.MembraneSynth;
  private noiseSynth: Tone.NoiseSynth;
  private reverb: Tone.Reverb;
  private initialized = false;
  
  async init() {
    if (this.initialized) return;
    await Tone.start();
    
    this.reverb = new Tone.Reverb({ decay: 1.5, wet: 0.3 }).toDestination();
    
    this.uiSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.2 }
    }).connect(this.reverb);
    
    this.impactSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4
    }).toDestination();
    
    this.noiseSynth = new Tone.NoiseSynth({
      noise: { type: "brown" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    
    this.initialized = true;
  }
  
  // UI sounds
  click() {
    this.uiSynth.triggerAttackRelease("C5", "32n");
  }
  
  hover() {
    this.uiSynth.triggerAttackRelease("G5", "64n");
    this.uiSynth.volume.value = -12;
  }
  
  success() {
    const now = Tone.now();
    this.uiSynth.triggerAttackRelease("C5", "16n", now);
    this.uiSynth.triggerAttackRelease("E5", "16n", now + 0.08);
    this.uiSynth.triggerAttackRelease("G5", "8n", now + 0.16);
  }
  
  error() {
    this.uiSynth.triggerAttackRelease("E3", "8n");
  }
  
  // Combat sounds
  subBass(intensity: number = 1) {
    this.impactSynth.volume.value = -6 + (intensity * 6);
    this.impactSynth.triggerAttackRelease(30 + intensity * 30, "8n");
  }
  
  crackle() {
    this.noiseSynth.triggerAttackRelease("16n");
  }
  
  dispose() {
    this.uiSynth?.dispose();
    this.impactSynth?.dispose();
    this.noiseSynth?.dispose();
    this.reverb?.dispose();
  }
}

// Usage
const sfx = new ProceduralSFX();

document.addEventListener('click', async () => {
  await sfx.init();
  sfx.click();
});
```

## When NOT to Use Tone.js

- Simple sample playback → Use Howler.js
- Just need background music → Use Howler.js with html5: true
- Minimal audio needs → Use Howler.js (smaller bundle)
- Need maximum browser compatibility → Use Howler.js

## When to USE Tone.js

- Synthesized sound effects
- Procedural audio that changes dynamically
- Musical games / rhythm games
- Complex effect chains
- Real-time audio manipulation
- Generating variations programmatically
