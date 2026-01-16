import * as Tone from 'tone';

/**
 * MusicManager - Procedural Background Music System
 *
 * Generates looping ambient music using Tone.js synthesis
 * - Menu Track: Calm, atmospheric (C minor pentatonic, 80 BPM)
 * - Gameplay Track: Energetic, tense (D minor, 120 BPM)
 *
 * Features:
 * - Multi-layer synthesis (bass, pads, lead, percussion)
 * - Smooth crossfade transitions between tracks
 * - Volume control integration with AudioManager
 * - Zero file size (all procedural)
 */
class MusicManager {
  // Synth layers
  private bassSynth: Tone.Synth | null = null;
  private padSynth: Tone.PolySynth | null = null;
  private leadSynth: Tone.MonoSynth | null = null;
  private percSynth: Tone.NoiseSynth | null = null;

  // Volume control
  private masterVolume: Tone.Volume | null = null;

  // Music loops
  private menuLoop: Tone.Loop | null = null;
  private gameplayLoop: Tone.Loop | null = null;
  private menuPattern: Tone.Pattern<string> | null = null;
  private gameplayPattern: Tone.Pattern<string> | null = null;

  // State
  private initialized = false;
  private currentTrack: 'menu' | 'gameplay' | null = null;
  private isPlaying = false;

  // Menu track notes (C minor pentatonic: C, Eb, F, G, Bb)
  private menuBassNotes = ['C2', 'Eb2', 'F2', 'G2'];
  private menuPadChords = [
    ['C3', 'Eb3', 'G3'],  // Cm
    ['Bb2', 'D3', 'F3'],  // Bb
    ['F2', 'Ab2', 'C3'],  // Fm
    ['G2', 'Bb2', 'D3'],  // Gm
  ];
  private menuLeadNotes = ['C4', 'Eb4', 'F4', 'G4', 'Bb4', 'C5'];

  // Gameplay track notes (D minor pentatonic: D, F, G, A, C)
  private gameplayBassNotes = ['D2', 'F2', 'A2', 'D3'];
  private gameplayPadChords = [
    ['D3', 'F3', 'A3'],   // Dm
    ['A2', 'C3', 'E3'],   // Am
    ['F2', 'A2', 'C3'],   // F
    ['G2', 'B2', 'D3'],   // G
  ];
  private gameplayLeadNotes = ['D4', 'F4', 'G4', 'A4', 'C5', 'D5'];

  /**
   * Initialize Tone.js synthesis engine
   * Must be called on user interaction (browser requirement)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await Tone.start();
      console.log('🎵 MusicManager: Tone.js context started');

      // Master volume control (-20dB default for background music)
      this.masterVolume = new Tone.Volume(-20).toDestination();

      // Bass synth - deep sub-bass drone
      this.bassSynth = new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: 0.1,
          decay: 0.2,
          sustain: 0.7,
          release: 1.0,
        },
        volume: -6,
      }).connect(this.masterVolume);

      // Pad synth - ambient chords
      this.padSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: {
          attack: 1.0,
          decay: 0.5,
          sustain: 0.8,
          release: 2.0,
        },
        volume: -12,
      }).connect(this.masterVolume);

      // Lead synth - melodic sequences
      this.leadSynth = new Tone.MonoSynth({
        oscillator: { type: 'triangle' },
        envelope: {
          attack: 0.05,
          decay: 0.3,
          sustain: 0.4,
          release: 0.8,
        },
        volume: -18,
      }).connect(this.masterVolume);

      // Percussion synth - subtle rhythmic texture
      this.percSynth = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: {
          attack: 0.001,
          decay: 0.05,
          sustain: 0,
          release: 0.05,
        },
        volume: -24,
      }).connect(this.masterVolume);

      this.setupMenuTrack();
      this.setupGameplayTrack();

      this.initialized = true;
      console.log('✅ MusicManager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize MusicManager:', error);
    }
  }

  /**
   * Setup menu track (calm, ambient, 80 BPM)
   */
  private setupMenuTrack(): void {
    if (!this.bassSynth || !this.padSynth || !this.leadSynth) return;

    const bpm = 80;
    Tone.Transport.bpm.value = bpm;

    // Bass loop (plays every 2 beats)
    let bassIndex = 0;
    this.menuLoop = new Tone.Loop((time) => {
      if (this.currentTrack === 'menu' && this.bassSynth) {
        const note = this.menuBassNotes[bassIndex % this.menuBassNotes.length];
        this.bassSynth.triggerAttackRelease(note, '2n', time);
        bassIndex++;
      }
    }, '2n');

    // Pad pattern (chord progression every 4 beats)
    let padIndex = 0;
    const padLoop = new Tone.Loop((time) => {
      if (this.currentTrack === 'menu' && this.padSynth) {
        const chord = this.menuPadChords[padIndex % this.menuPadChords.length];
        this.padSynth.triggerAttackRelease(chord, '1m', time);
        padIndex++;
      }
    }, '1m'); // Whole note (4 beats)
    padLoop.start(0);

    // Lead pattern (melodic sequence, random from pentatonic scale)
    const leadPattern = new Tone.Pattern((time, note) => {
      if (this.currentTrack === 'menu' && this.leadSynth) {
        this.leadSynth.triggerAttackRelease(note, '8n', time);
      }
    }, this.menuLeadNotes, 'random');
    leadPattern.interval = '4n'; // Every quarter note
    this.menuPattern = leadPattern;
  }

  /**
   * Setup gameplay track (energetic, tense, 120 BPM)
   */
  private setupGameplayTrack(): void {
    if (!this.bassSynth || !this.padSynth || !this.leadSynth || !this.percSynth) return;

    // Bass loop (faster, more driving)
    let bassIndex = 0;
    this.gameplayLoop = new Tone.Loop((time) => {
      if (this.currentTrack === 'gameplay' && this.bassSynth) {
        const note = this.gameplayBassNotes[bassIndex % this.gameplayBassNotes.length];
        this.bassSynth.triggerAttackRelease(note, '4n', time);
        bassIndex++;
      }
    }, '4n'); // Quarter note

    // Pad pattern (faster chord changes)
    let padIndex = 0;
    const padLoop = new Tone.Loop((time) => {
      if (this.currentTrack === 'gameplay' && this.padSynth) {
        const chord = this.gameplayPadChords[padIndex % this.gameplayPadChords.length];
        this.padSynth.triggerAttackRelease(chord, '2n', time);
        padIndex++;
      }
    }, '2n'); // Half note
    padLoop.start(0);

    // Lead pattern (more active melody)
    const leadPattern = new Tone.Pattern((time, note) => {
      if (this.currentTrack === 'gameplay' && this.leadSynth) {
        this.leadSynth.triggerAttackRelease(note, '16n', time);
      }
    }, this.gameplayLeadNotes, 'upDown');
    leadPattern.interval = '8n'; // Eighth note (faster)
    this.gameplayPattern = leadPattern;

    // Percussion (subtle hi-hat-like texture)
    const percLoop = new Tone.Loop((time) => {
      if (this.currentTrack === 'gameplay' && this.percSynth) {
        this.percSynth.triggerAttackRelease('16n', time);
      }
    }, '8n');
    percLoop.start(0);
  }

  /**
   * Play menu music
   */
  playMenuMusic(): void {
    if (!this.initialized) {
      console.warn('MusicManager not initialized');
      return;
    }

    if (this.currentTrack === 'menu' && this.isPlaying) {
      return; // Already playing menu music
    }

    this.stop(); // Stop any current track

    Tone.Transport.bpm.value = 80;
    this.currentTrack = 'menu';

    // Start loops and patterns
    this.menuLoop?.start(0);
    this.menuPattern?.start(0);

    // Fade in from silence
    if (this.masterVolume) {
      this.masterVolume.volume.setValueAtTime(-60, Tone.now());
      this.masterVolume.volume.rampTo(-20, 0.5, Tone.now());
    }

    Tone.Transport.start();
    this.isPlaying = true;

    console.log('🎵 Playing menu music');
  }

  /**
   * Play gameplay music
   */
  playGameplayMusic(): void {
    if (!this.initialized) {
      console.warn('MusicManager not initialized');
      return;
    }

    if (this.currentTrack === 'gameplay' && this.isPlaying) {
      return; // Already playing gameplay music
    }

    this.stop(); // Stop any current track

    Tone.Transport.bpm.value = 120;
    this.currentTrack = 'gameplay';

    // Start loops and patterns
    this.gameplayLoop?.start(0);
    this.gameplayPattern?.start(0);

    // Fade in from silence
    if (this.masterVolume) {
      this.masterVolume.volume.setValueAtTime(-60, Tone.now());
      this.masterVolume.volume.rampTo(-20, 0.5, Tone.now());
    }

    Tone.Transport.start();
    this.isPlaying = true;

    console.log('🎵 Playing gameplay music');
  }

  /**
   * Crossfade from current track to target track
   */
  crossfade(targetTrack: 'menu' | 'gameplay', duration: number = 2): void {
    if (!this.initialized) {
      console.warn('MusicManager not initialized');
      return;
    }

    if (this.currentTrack === targetTrack) {
      return; // Already on target track
    }

    console.log(`🎵 Crossfading to ${targetTrack} music`);

    // Fade out current track
    if (this.masterVolume && this.isPlaying) {
      const now = Tone.now();
      this.masterVolume.volume.rampTo(-60, duration, now);

      // After fade out, start new track
      setTimeout(() => {
        if (targetTrack === 'menu') {
          this.playMenuMusic();
        } else {
          this.playGameplayMusic();
        }
      }, duration * 1000);
    } else {
      // Not playing, just start new track
      if (targetTrack === 'menu') {
        this.playMenuMusic();
      } else {
        this.playGameplayMusic();
      }
    }
  }

  /**
   * Stop all music
   */
  stop(): void {
    // Stop all loops and patterns
    this.menuLoop?.stop();
    this.gameplayLoop?.stop();
    this.menuPattern?.stop();
    this.gameplayPattern?.stop();

    // Stop transport
    if (this.isPlaying) {
      Tone.Transport.stop();
      Tone.Transport.cancel(); // Cancel all scheduled events
    }

    this.currentTrack = null;
    this.isPlaying = false;
  }

  /**
   * Fade out music over specified duration
   */
  fadeOut(duration: number = 2): void {
    if (!this.masterVolume || !this.isPlaying) return;

    const now = Tone.now();
    this.masterVolume.volume.rampTo(-60, duration, now);

    setTimeout(() => {
      this.stop();
    }, duration * 1000);

    console.log(`🎵 Fading out music over ${duration}s`);
  }

  /**
   * Pause music (can be resumed)
   */
  pause(): void {
    if (this.isPlaying) {
      Tone.Transport.pause();
      this.isPlaying = false;
      console.log('⏸️ Music paused');
    }
  }

  /**
   * Resume paused music
   */
  resume(): void {
    if (!this.isPlaying && this.currentTrack) {
      Tone.Transport.start();
      this.isPlaying = true;
      console.log('▶️ Music resumed');
    }
  }

  /**
   * Set music volume (0-1)
   */
  setVolume(volume: number): void {
    if (this.masterVolume) {
      // Convert 0-1 to dB (-60 to -10)
      const db = -60 + volume * 50;
      this.masterVolume.volume.value = db;
    }
  }

  /**
   * Get current playing state
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current track
   */
  getCurrentTrack(): 'menu' | 'gameplay' | null {
    return this.currentTrack;
  }

  /**
   * Cleanup and dispose of all resources
   */
  destroy(): void {
    this.stop();

    // Dispose of synths
    this.bassSynth?.dispose();
    this.padSynth?.dispose();
    this.leadSynth?.dispose();
    this.percSynth?.dispose();
    this.masterVolume?.dispose();

    // Dispose of loops
    this.menuLoop?.dispose();
    this.gameplayLoop?.dispose();
    this.menuPattern?.dispose();
    this.gameplayPattern?.dispose();

    this.initialized = false;
    console.log('🗑️ MusicManager destroyed');
  }
}

// Export singleton instance
export const musicManager = new MusicManager();
