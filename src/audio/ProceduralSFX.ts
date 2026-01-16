import * as Tone from 'tone';

/**
 * ProceduralSFX Manager - Tone.js Synthesis Engine
 *
 * Handles procedural audio generation for:
 * - Sub-bass layers for combat impacts (element-specific frequencies)
 * - UI feedback sounds (clicks, hovers, success/error)
 * - Elemental variations (fire crackle, electric zap, wind whoosh)
 *
 * Benefits:
 * - 0 KB file size (all synthesized)
 * - Infinite variations (never repetitive)
 * - Parametric control (intensity, element-specific tuning)
 */
class ProceduralSFX {
  private subBass: Tone.MembraneSynth | null = null;
  private uiSynth: Tone.Synth | null = null;
  private noiseSynth: Tone.NoiseSynth | null = null;
  private initialized = false;

  /**
   * Initialize Tone.js synthesis engine
   * Must be called on user interaction (browser requirement)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await Tone.start();
      console.log('🎵 Tone.js context started');

      // Sub-bass synthesizer for combat impacts
      this.subBass = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        envelope: {
          attack: 0.001,
          decay: 0.15,
          sustain: 0,
          release: 0.1
        },
        volume: -6 // Default volume, will be modulated by intensity
      }).toDestination();

      // UI feedback synth (sine wave for clean tones)
      this.uiSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0.1,
          release: 0.2
        },
        volume: -6
      }).toDestination();

      // Noise synth for elemental effects
      this.noiseSynth = new Tone.NoiseSynth({
        noise: { type: 'brown' },
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0,
          release: 0.1
        },
        volume: -12
      }).toDestination();

      this.initialized = true;
      console.log('✅ ProceduralSFX initialized');
    } catch (error) {
      console.error('❌ Failed to initialize ProceduralSFX:', error);
    }
  }

  /**
   * Play element-specific sub-bass for combat impacts
   * @param element - Element type (fire, water, earth, air, lightning, ice)
   * @param intensity - Damage intensity (0-1), scales volume -6dB to 0dB
   */
  playImpactBass(element: string, intensity: number = 1): void {
    if (!this.initialized || !this.subBass) {
      console.warn('ProceduralSFX not initialized');
      return;
    }

    // Element-specific frequencies for distinct sonic identity
    const frequencies: Record<string, number> = {
      fire: 80,      // Higher frequency = aggressive, hot
      water: 60,     // Mid frequency = fluid, flowing
      earth: 50,     // Lowest frequency = heavy, grounded
      air: 90,       // Highest frequency = light, swift
      lightning: 100, // Very high = sharp, electric
      ice: 55        // Low-mid = cold, heavy
    };

    const freq = frequencies[element] || 70;

    // Scale volume based on intensity (0-1 → -6dB to 0dB)
    const volume = -6 + (Math.min(Math.max(intensity, 0), 1) * 6);

    this.subBass.volume.value = volume;
    this.subBass.triggerAttackRelease(freq, '8n');
  }

  /**
   * UI click sound (procedural, infinite variations)
   */
  click(): void {
    if (!this.initialized || !this.uiSynth) return;

    // Randomize pitch slightly for variation
    const basePitch = 'C5';
    const pitchVariation = Math.random() * 0.1 - 0.05; // ±5%

    this.uiSynth.volume.value = -6;
    this.uiSynth.triggerAttackRelease(basePitch, '32n');
  }

  /**
   * UI hover sound (subtle, quiet)
   */
  hover(): void {
    if (!this.initialized || !this.uiSynth) return;

    this.uiSynth.volume.value = -15; // Very quiet
    this.uiSynth.triggerAttackRelease('G5', '64n');
  }

  /**
   * Success chime (ascending arpeggio)
   */
  success(): void {
    if (!this.initialized || !this.uiSynth) return;

    const now = Tone.now();
    this.uiSynth.volume.value = -9;

    // Ascending arpeggio: C5 → E5 → G5 → C6
    this.uiSynth.triggerAttackRelease('C5', '16n', now);
    this.uiSynth.triggerAttackRelease('E5', '16n', now + 0.08);
    this.uiSynth.triggerAttackRelease('G5', '16n', now + 0.16);
    this.uiSynth.triggerAttackRelease('C6', '8n', now + 0.24);
  }

  /**
   * Error sound (low frequency buzz)
   */
  error(): void {
    if (!this.initialized || !this.uiSynth) return;

    const synth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 }
    }).toDestination();

    synth.volume.value = -9;
    synth.triggerAttackRelease('E3', '8n');

    // Dispose after use
    setTimeout(() => synth.dispose(), 500);
  }

  /**
   * Energy gain sound (ascending shimmer)
   */
  energyGain(): void {
    if (!this.initialized || !this.uiSynth) return;

    const now = Tone.now();
    this.uiSynth.volume.value = -12;

    // Quick ascending shimmer
    this.uiSynth.triggerAttackRelease('C5', '32n', now);
    this.uiSynth.triggerAttackRelease('E5', '32n', now + 0.05);
    this.uiSynth.triggerAttackRelease('G5', '32n', now + 0.1);
  }

  /**
   * Energy spend sound (descending whoosh)
   */
  energySpend(): void {
    if (!this.initialized || !this.uiSynth) return;

    const now = Tone.now();
    this.uiSynth.volume.value = -12;

    // Quick descending whoosh
    this.uiSynth.triggerAttackRelease('G5', '32n', now);
    this.uiSynth.triggerAttackRelease('E5', '32n', now + 0.05);
    this.uiSynth.triggerAttackRelease('C5', '32n', now + 0.1);
  }

  /**
   * Fire crackle (procedural brown noise with filter)
   */
  fireCrackle(): void {
    if (!this.initialized || !this.noiseSynth) return;

    const filter = new Tone.Filter({
      frequency: 2000,
      type: 'lowpass',
      Q: 1
    }).toDestination();

    this.noiseSynth.disconnect();
    this.noiseSynth.connect(filter);
    this.noiseSynth.volume.value = -15;
    this.noiseSynth.triggerAttackRelease('32n');

    // Reconnect to destination after
    setTimeout(() => {
      this.noiseSynth?.disconnect();
      this.noiseSynth?.toDestination();
      filter.dispose();
    }, 200);
  }

  /**
   * Electric zap (frequency sweep)
   */
  electricZap(): void {
    if (!this.initialized || !this.uiSynth) return;

    const synth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();

    synth.volume.value = -12;

    // Rapid frequency modulation (880Hz → 110Hz)
    const now = Tone.now();
    synth.frequency.setValueAtTime(880, now);
    synth.frequency.linearRampToValueAtTime(110, now + 0.1);
    synth.triggerAttackRelease('A5', '16n'); // Note + duration

    // Dispose after use
    setTimeout(() => synth.dispose(), 300);
  }

  /**
   * Wind whoosh (synthesized noise sweep)
   */
  windWhoosh(duration: number = 0.3): void {
    if (!this.initialized || !this.noiseSynth) return;

    const noise = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: {
        attack: duration * 0.3,
        decay: duration * 0.5,
        sustain: 0.2,
        release: duration * 0.2
      }
    });

    const filter = new Tone.Filter({
      frequency: 500,
      type: 'bandpass',
      Q: 2
    }).toDestination();

    noise.connect(filter);
    noise.volume.value = -15;

    // Sweep the filter frequency
    filter.frequency.setValueAtTime(200, Tone.now());
    filter.frequency.linearRampToValueAtTime(2000, Tone.now() + duration * 0.5);
    filter.frequency.linearRampToValueAtTime(500, Tone.now() + duration);

    noise.triggerAttackRelease(duration);

    // Cleanup
    setTimeout(() => {
      noise.dispose();
      filter.dispose();
    }, (duration + 0.5) * 1000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADVANCED AUDIO TECHNIQUES (AAA Quality)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 4-LAYER IMPACT SYSTEM
   * Professional impact sounds using frequency layering:
   * - Layer 1: Attack (sharp transient, 0-50ms)
   * - Layer 2: Body (weight/meat, 50-200ms)
   * - Layer 3: Tail (reverb/decay, 200ms+)
   * - Layer 4: Enhancer (elemental accent)
   */
  playLayeredImpact(element: string, intensity: number = 1): void {
    if (!this.initialized) return;

    const now = Tone.now();
    const vol = -12 + (intensity * 8); // -12dB to -4dB based on intensity

    // Layer 1: ATTACK TRANSIENT (sharp crack, 0-50ms)
    const attack = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 16,
      resonance: 4000,
      octaves: 1.5,
      volume: vol - 6
    }).toDestination();
    attack.frequency.value = 200;
    attack.triggerAttackRelease('16n', now);
    setTimeout(() => attack.dispose(), 200);

    // Layer 2: BODY (weight, 50-200ms) - element-specific frequency
    const bodyFreqs: Record<string, number> = {
      fire: 85, water: 65, earth: 45, air: 95, lightning: 110, ice: 55
    };
    const bodyFreq = bodyFreqs[element] || 70;

    const body = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 3,
      envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.15 },
      volume: vol
    }).toDestination();
    body.triggerAttackRelease(bodyFreq, '8n', now + 0.02);
    setTimeout(() => body.dispose(), 500);

    // Layer 3: TAIL (reverb decay, 200ms+)
    const reverb = new Tone.Reverb({ decay: 0.8, wet: 0.6 }).toDestination();
    const tail = new Tone.NoiseSynth({
      noise: { type: 'brown' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 },
      volume: vol - 9
    }).connect(reverb);
    tail.triggerAttackRelease('8n', now + 0.05);
    setTimeout(() => { tail.dispose(); reverb.dispose(); }, 1000);

    // Layer 4: ENHANCER (elemental accent)
    this.playElementEnhancer(element, now + 0.03, intensity);
  }

  /**
   * Element-specific enhancer layer
   */
  private playElementEnhancer(element: string, time: number, intensity: number): void {
    const vol = -18 + (intensity * 6);

    switch (element) {
      case 'fire': {
        // Fire: crackling high-frequency noise
        const fire = new Tone.NoiseSynth({
          noise: { type: 'white' },
          envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
          volume: vol
        });
        const fireFilter = new Tone.Filter({ frequency: 3000, type: 'highpass' }).toDestination();
        fire.connect(fireFilter);
        fire.triggerAttackRelease('16n', time);
        setTimeout(() => { fire.dispose(); fireFilter.dispose(); }, 400);
        break;
      }
      case 'lightning': {
        // Lightning: rapid pitch sweep with distortion
        const zap = new Tone.Synth({
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
          volume: vol
        });
        const dist = new Tone.Distortion(0.4).toDestination();
        zap.connect(dist);
        zap.frequency.setValueAtTime(1200, time);
        zap.frequency.exponentialRampToValueAtTime(100, time + 0.08);
        zap.triggerAttackRelease('C4', '32n', time);
        setTimeout(() => { zap.dispose(); dist.dispose(); }, 300);
        break;
      }
      case 'ice': {
        // Ice: crystalline shimmer
        const ice = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3 },
          volume: vol - 3
        }).toDestination();
        ice.triggerAttackRelease('C6', '16n', time);
        ice.triggerAttackRelease('E6', '16n', time + 0.03);
        ice.triggerAttackRelease('G6', '16n', time + 0.06);
        setTimeout(() => ice.dispose(), 600);
        break;
      }
      case 'water': {
        // Water: bubbling/flowing texture
        const water = new Tone.NoiseSynth({
          noise: { type: 'pink' },
          envelope: { attack: 0.02, decay: 0.2, sustain: 0.1, release: 0.15 },
          volume: vol
        });
        const waterFilter = new Tone.AutoFilter({ frequency: 8, baseFrequency: 400, octaves: 2 }).toDestination();
        waterFilter.start();
        water.connect(waterFilter);
        water.triggerAttackRelease('8n', time);
        setTimeout(() => { water.dispose(); waterFilter.dispose(); }, 500);
        break;
      }
      case 'earth': {
        // Earth: deep rumble
        const earth = new Tone.MembraneSynth({
          pitchDecay: 0.1,
          octaves: 2,
          envelope: { attack: 0.02, decay: 0.3, sustain: 0, release: 0.2 },
          volume: vol + 3
        }).toDestination();
        earth.triggerAttackRelease(35, '8n', time);
        setTimeout(() => earth.dispose(), 600);
        break;
      }
      case 'air': {
        // Air: whooshing sweep
        const air = new Tone.NoiseSynth({
          noise: { type: 'pink' },
          envelope: { attack: 0.05, decay: 0.15, sustain: 0, release: 0.1 },
          volume: vol
        });
        const airFilter = new Tone.Filter({ frequency: 1000, type: 'bandpass', Q: 2 }).toDestination();
        airFilter.frequency.setValueAtTime(500, time);
        airFilter.frequency.linearRampToValueAtTime(2500, time + 0.15);
        air.connect(airFilter);
        air.triggerAttackRelease('8n', time);
        setTimeout(() => { air.dispose(); airFilter.dispose(); }, 400);
        break;
      }
    }
  }

  /**
   * HITSTOP TECHNIQUE
   * Fighting game technique: brief audio ducking BEFORE major impact
   * Creates anticipation and makes the impact feel more powerful
   * @param callback - Function to call after hitstop (usually plays the impact)
   */
  hitstop(durationMs: number = 80, callback?: () => void): void {
    if (!this.initialized) return;

    // Create a brief "silence" effect by reducing master volume
    const masterGain = Tone.getDestination().volume;
    const currentVol = masterGain.value;

    // Quick duck down
    masterGain.rampTo(-60, 0.01); // Near silence

    // Hold, then restore and play impact
    setTimeout(() => {
      masterGain.rampTo(currentVol, 0.02);
      if (callback) callback();
    }, durationMs);
  }

  /**
   * ANTICIPATION WHOOSH
   * Precedes attacks for dramatic effect (anime-style audio)
   * [Whoosh] → [Hitstop] → [IMPACT]
   */
  anticipationWhoosh(intensity: number = 1, onComplete?: () => void): void {
    if (!this.initialized) return;

    const duration = 0.15 + (intensity * 0.1); // 150-250ms based on intensity
    const vol = -18 + (intensity * 6);

    // Rising pitch whoosh
    const whoosh = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: {
        attack: duration * 0.2,
        decay: duration * 0.6,
        sustain: 0,
        release: duration * 0.2
      },
      volume: vol
    });

    const filter = new Tone.Filter({
      frequency: 300,
      type: 'bandpass',
      Q: 3
    }).toDestination();

    // Sweep filter up for rising tension
    const now = Tone.now();
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + duration);

    whoosh.connect(filter);
    whoosh.triggerAttackRelease(duration);

    // Cleanup and callback
    setTimeout(() => {
      whoosh.dispose();
      filter.dispose();
      if (onComplete) onComplete();
    }, duration * 1000 + 50);
  }

  /**
   * FULL CINEMATIC IMPACT
   * Complete anime-style impact sequence:
   * Anticipation Whoosh → Hitstop → 4-Layer Impact
   */
  cinematicImpact(element: string, intensity: number = 1): void {
    if (!this.initialized) return;

    // Step 1: Anticipation whoosh
    this.anticipationWhoosh(intensity, () => {
      // Step 2: Brief hitstop
      this.hitstop(60 + (intensity * 40), () => {
        // Step 3: Full layered impact
        this.playLayeredImpact(element, intensity);
      });
    });
  }

  /**
   * CARD PLAY SOUND
   * Satisfying card placement with weight
   */
  cardPlay(element: string): void {
    if (!this.initialized) return;

    const now = Tone.now();

    // Paper/card slide sound
    const slide = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.05 },
      volume: -15
    });
    const slideFilter = new Tone.Filter({ frequency: 4000, type: 'lowpass' }).toDestination();
    slide.connect(slideFilter);
    slide.triggerAttackRelease('32n', now);

    // Placement thump
    const thump = new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
      volume: -12
    }).toDestination();
    thump.triggerAttackRelease(100, '32n', now + 0.04);

    // Element-colored chime
    const chimeFreqs: Record<string, string> = {
      fire: 'E5', water: 'D5', earth: 'G4', air: 'A5', lightning: 'B5', ice: 'F5'
    };
    const chime = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      volume: -18
    }).toDestination();
    chime.triggerAttackRelease(chimeFreqs[element] || 'C5', '16n', now + 0.05);

    setTimeout(() => {
      slide.dispose();
      slideFilter.dispose();
      thump.dispose();
      chime.dispose();
    }, 500);
  }

  /**
   * VICTORY FANFARE
   * Triumphant ascending arpeggio with reverb
   */
  victoryFanfare(): void {
    if (!this.initialized) return;

    const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.4 }).toDestination();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 },
      volume: -9
    }).connect(reverb);

    const now = Tone.now();
    // Triumphant C major arpeggio
    synth.triggerAttackRelease('C4', '8n', now);
    synth.triggerAttackRelease('E4', '8n', now + 0.1);
    synth.triggerAttackRelease('G4', '8n', now + 0.2);
    synth.triggerAttackRelease('C5', '8n', now + 0.3);
    synth.triggerAttackRelease(['C5', 'E5', 'G5'], '4n', now + 0.5); // Final chord

    setTimeout(() => { synth.dispose(); reverb.dispose(); }, 3000);
  }

  /**
   * DEFEAT SOUND
   * Descending minor with heavy reverb
   */
  defeatSound(): void {
    if (!this.initialized) return;

    const reverb = new Tone.Reverb({ decay: 2, wet: 0.5 }).toDestination();
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.1, decay: 0.5, sustain: 0.3, release: 1 },
      volume: -9
    }).connect(reverb);

    const now = Tone.now();
    // Sad descending minor
    synth.triggerAttackRelease('E4', '4n', now);
    synth.triggerAttackRelease('D4', '4n', now + 0.4);
    synth.triggerAttackRelease('C4', '2n', now + 0.8);

    setTimeout(() => { synth.dispose(); reverb.dispose(); }, 4000);
  }

  /**
   * TURN START SOUND
   * Alert chime for turn beginning
   */
  turnStart(): void {
    if (!this.initialized) return;

    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.1 },
      volume: -12
    }).toDestination();

    const now = Tone.now();
    synth.triggerAttackRelease('G5', '16n', now);
    synth.triggerAttackRelease('C6', '8n', now + 0.08);

    setTimeout(() => synth.dispose(), 500);
  }

  /**
   * TIMER WARNING
   * Urgent pulsing tone
   */
  timerWarning(): void {
    if (!this.initialized) return;

    const synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
      volume: -15
    }).toDestination();

    synth.triggerAttackRelease('A5', '32n');
    setTimeout(() => synth.dispose(), 200);
  }

  /**
   * Cleanup and dispose of all synthesizers
   */
  dispose(): void {
    this.subBass?.dispose();
    this.uiSynth?.dispose();
    this.noiseSynth?.dispose();

    this.subBass = null;
    this.uiSynth = null;
    this.noiseSynth = null;
    this.initialized = false;

    console.log('🗑️ ProceduralSFX disposed');
  }

  /**
   * Check if ProceduralSFX is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export default new ProceduralSFX();
