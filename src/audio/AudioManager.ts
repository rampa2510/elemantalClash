import { gameEvents } from '../utils/EventEmitter';
import {
  CardSelectedPayload,
  DamagePayload,
  WallEventPayload,
  MinerEventPayload,
  TimerPayload,
  VictoryPayload,
} from '../types/events';
import { AttackResult } from '../types/cards';

/**
 * Procedural Audio Generator
 * Generates all game sounds using Web Audio API - no external files needed!
 *
 * Benefits:
 * - Copyright-free: All sounds generated programmatically
 * - Zero file downloads: No HTTP requests for audio assets
 * - Universal browser support: Works in all modern browsers
 * - Minimal memory footprint: Sounds generated on-demand
 */

type SoundType =
  | 'cardHover'
  | 'cardSelect'
  | 'cardPlay'
  | 'cardFlip'
  | 'attackContinuous'
  | 'attackProjectile'
  | 'damageDealt'
  | 'damageBlocked'
  | 'wallPlace'
  | 'wallDestroy'
  | 'minerPlace'
  | 'minerPayout'
  | 'energyGain'
  | 'energySpend'
  | 'timerTick'
  | 'timerWarning'
  | 'timerExpired'
  | 'turnStart'
  | 'victory'
  | 'defeat'
  | 'buttonClick'
  | 'buttonHover'
  | 'menuOpen'
  | 'error';

type ElementType = 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'ice';

interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
}

/**
 * AudioManager - Procedural sound generation for Elemental Clash
 * All sounds are synthesized using Web Audio API
 */
export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isUnlocked: boolean = false;
  private settings: AudioSettings;
  private eventUnsubscribers: Array<() => void> = [];

  // Element-specific frequencies for thematic sounds
  private elementFrequencies: Record<ElementType, { base: number; harmonics: number[] }> = {
    fire: { base: 220, harmonics: [1, 2, 3, 5] },      // A3, warm crackling
    water: { base: 330, harmonics: [1, 1.5, 2, 3] },   // E4, flowing
    earth: { base: 110, harmonics: [1, 2, 4, 8] },     // A2, deep rumble
    air: { base: 523, harmonics: [1, 1.5, 2] },        // C5, airy whistle
    lightning: { base: 880, harmonics: [1, 3, 5, 7] }, // A5, sharp electric
    ice: { base: 659, harmonics: [1, 1.2, 1.5, 2] },   // E5, crystalline
  };

  constructor() {
    this.settings = this.loadSettings();
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async init(): Promise<void> {
    if (this.context) return;

    try {
      this.context = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      // Create gain nodes for volume control
      this.masterGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.musicGain = this.context.createGain();

      // Connect: sfx/music -> master -> destination
      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);

      // Apply saved settings
      this.applySettings();

      // Resume if suspended (mobile requirement)
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      this.isUnlocked = true;
      this.subscribeToGameEvents();

      console.log('[AudioManager] Initialized successfully');
    } catch (error) {
      console.warn('[AudioManager] Failed to initialize:', error);
    }
  }

  /**
   * Unlock audio on first user interaction (required for mobile/browsers)
   */
  async unlock(): Promise<void> {
    if (this.isUnlocked) return;
    await this.init();
  }

  /**
   * Check if audio is ready
   */
  isReady(): boolean {
    return this.isUnlocked && this.context?.state === 'running';
  }

  // ============================================
  // PROCEDURAL SOUND GENERATORS
  // ============================================

  /**
   * Play a sound effect
   */
  play(type: SoundType, options?: { element?: ElementType; intensity?: number }): void {
    if (!this.isReady() || this.settings.muted) return;

    const element = options?.element;
    const intensity = options?.intensity ?? 1;

    switch (type) {
      case 'cardHover':
        this.playCardHover();
        break;
      case 'cardSelect':
        this.playCardSelect();
        break;
      case 'cardPlay':
        this.playCardPlay(element);
        break;
      case 'cardFlip':
        this.playCardFlip();
        break;
      case 'attackContinuous':
        this.playAttackContinuous(element);
        break;
      case 'attackProjectile':
        this.playAttackProjectile(element);
        break;
      case 'damageDealt':
        this.playDamageDealt(intensity);
        break;
      case 'damageBlocked':
        this.playDamageBlocked();
        break;
      case 'wallPlace':
        this.playWallPlace();
        break;
      case 'wallDestroy':
        this.playWallDestroy();
        break;
      case 'minerPlace':
        this.playMinerPlace();
        break;
      case 'minerPayout':
        this.playMinerPayout();
        break;
      case 'energyGain':
        this.playEnergyGain();
        break;
      case 'energySpend':
        this.playEnergySpend();
        break;
      case 'timerTick':
        this.playTimerTick();
        break;
      case 'timerWarning':
        this.playTimerWarning();
        break;
      case 'timerExpired':
        this.playTimerExpired();
        break;
      case 'turnStart':
        this.playTurnStart();
        break;
      case 'victory':
        this.playVictory();
        break;
      case 'defeat':
        this.playDefeat();
        break;
      case 'buttonClick':
        this.playButtonClick();
        break;
      case 'buttonHover':
        this.playButtonHover();
        break;
      case 'menuOpen':
        this.playMenuOpen();
        break;
      case 'error':
        this.playError();
        break;
    }
  }

  // --- UI Sounds ---

  private playButtonClick(): void {
    const now = this.context!.currentTime;
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playButtonHover(): void {
    const now = this.context!.currentTime;
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  private playMenuOpen(): void {
    const now = this.context!.currentTime;

    // Ascending arpeggio
    [400, 500, 600, 800].forEach((freq, i) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const startTime = now + i * 0.05;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  private playError(): void {
    const now = this.context!.currentTime;
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(150, now + 0.1);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // --- Card Sounds ---

  private playCardHover(): void {
    const now = this.context!.currentTime;
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  private playCardSelect(): void {
    const now = this.context!.currentTime;

    // Satisfying "pop" sound
    const osc1 = this.context!.createOscillator();
    const osc2 = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(600, now);
    osc1.frequency.exponentialRampToValueAtTime(900, now + 0.05);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain!);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.1);
  }

  private playCardPlay(element?: ElementType): void {
    const now = this.context!.currentTime;
    const freq = element ? this.elementFrequencies[element] : this.elementFrequencies.fire;

    // Whoosh + thud combination
    const noise = this.createNoise(0.1);
    const noiseGain = this.context!.createGain();
    const filter = this.context!.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.1);
    filter.Q.value = 2;

    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain!);

    // Element-themed tone
    const osc = this.context!.createOscillator();
    const oscGain = this.context!.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq.base * 2, now);
    osc.frequency.exponentialRampToValueAtTime(freq.base, now + 0.08);

    oscGain.gain.setValueAtTime(0.12, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  private playCardFlip(): void {
    const now = this.context!.currentTime;

    // Quick sweep sound
    const noise = this.createNoise(0.08);
    const gain = this.context!.createGain();
    const filter = this.context!.createBiquadFilter();

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + 0.04);
    filter.frequency.exponentialRampToValueAtTime(1000, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
  }

  // --- Combat Sounds ---

  private playAttackContinuous(element?: ElementType): void {
    const now = this.context!.currentTime;
    const freq = element ? this.elementFrequencies[element] : this.elementFrequencies.fire;

    // Heavy impact with sustained rumble
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq.base, now);
    osc.frequency.exponentialRampToValueAtTime(freq.base * 0.5, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    // Add distortion for intensity
    const distortion = this.context!.createWaveShaper();
    distortion.curve = this.makeDistortionCurve(50) as Float32Array<ArrayBuffer>;

    osc.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.5);

    // Add noise layer
    const noise = this.createNoise(0.3);
    const noiseGain = this.context!.createGain();
    const filter = this.context!.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 800;

    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain!);
  }

  private playAttackProjectile(element?: ElementType): void {
    const now = this.context!.currentTime;
    const freq = element ? this.elementFrequencies[element] : this.elementFrequencies.lightning;

    // Sharp, quick projectile sound
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq.base * 2, now);
    osc.frequency.exponentialRampToValueAtTime(freq.base * 0.5, now + 0.15);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.25);

    // Whoosh layer
    const noise = this.createNoise(0.15);
    const noiseGain = this.context!.createGain();
    const filter = this.context!.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(1000, now + 0.15);
    filter.Q.value = 5;

    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain!);
  }

  private playDamageDealt(intensity: number = 1): void {
    const now = this.context!.currentTime;

    // Impact thud scaled by damage
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150 * intensity, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);

    gain.gain.setValueAtTime(0.25 * Math.min(intensity, 1.5), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.2);

    // Crunch noise
    const noise = this.createNoise(0.08);
    const noiseGain = this.context!.createGain();

    noiseGain.gain.setValueAtTime(0.12 * intensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(noiseGain);
    noiseGain.connect(this.sfxGain!);
  }

  private playDamageBlocked(): void {
    const now = this.context!.currentTime;

    // Metallic clang
    const osc1 = this.context!.createOscillator();
    const osc2 = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(800, now);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain!);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.15);
  }

  // --- Structure Sounds ---

  private playWallPlace(): void {
    const now = this.context!.currentTime;

    // Stone placement thud
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.3);

    // Gritty texture
    const noise = this.createNoise(0.12);
    const noiseGain = this.context!.createGain();
    const filter = this.context!.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 600;

    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain!);
  }

  private playWallDestroy(): void {
    const now = this.context!.currentTime;

    // Crumbling destruction
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    const distortion = this.context!.createWaveShaper();
    distortion.curve = this.makeDistortionCurve(100) as Float32Array<ArrayBuffer>;

    osc.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.6);

    // Debris noise
    const noise = this.createNoise(0.4);
    const noiseGain = this.context!.createGain();

    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(noiseGain);
    noiseGain.connect(this.sfxGain!);
  }

  private playMinerPlace(): void {
    const now = this.context!.currentTime;

    // Mechanical placement
    [300, 450, 600].forEach((freq, i) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0.08, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.1);
    });
  }

  private playMinerPayout(): void {
    const now = this.context!.currentTime;

    // Coin/reward sound
    [800, 1000, 1200, 1600].forEach((freq, i) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0.1, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    });
  }

  // --- Energy Sounds ---

  private playEnergyGain(): void {
    const now = this.context!.currentTime;

    // Rising shimmer
    [400, 500, 600, 700].forEach((freq, i) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);

      gain.gain.setValueAtTime(0.08, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.15);
    });
  }

  private playEnergySpend(): void {
    const now = this.context!.currentTime;

    // Descending whoosh
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // --- Timer Sounds ---

  private playTimerTick(): void {
    const now = this.context!.currentTime;
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  private playTimerWarning(): void {
    const now = this.context!.currentTime;

    // Urgent double beep
    [0, 0.12].forEach((delay) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now + delay);

      gain.gain.setValueAtTime(0.12, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + delay);
      osc.stop(now + delay + 0.1);
    });
  }

  private playTimerExpired(): void {
    const now = this.context!.currentTime;

    // Buzzer sound
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  private playTurnStart(): void {
    const now = this.context!.currentTime;

    // Attention chime
    const osc = this.context!.createOscillator();
    const gain = this.context!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, now); // C5
    osc.frequency.setValueAtTime(659, now + 0.1); // E5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // --- Game End Sounds ---

  private playVictory(): void {
    const now = this.context!.currentTime;

    // Triumphant fanfare
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const startTime = now + i * 0.15;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });

    // Final chord
    const chord = [523, 659, 784];
    chord.forEach((freq) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now + 0.6);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + 0.6);
      osc.stop(now + 1.6);
    });
  }

  private playDefeat(): void {
    const now = this.context!.currentTime;

    // Sad descending tones
    const notes = [392, 349, 311, 262]; // G4, F4, Eb4, C4

    notes.forEach((freq, i) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const startTime = now + i * 0.2;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Create white noise source
   */
  private createNoise(duration: number): AudioBufferSourceNode {
    const bufferSize = this.context!.sampleRate * duration;
    const buffer = this.context!.createBuffer(1, bufferSize, this.context!.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.context!.createBufferSource();
    noise.buffer = buffer;
    noise.start();

    return noise;
  }

  /**
   * Create distortion curve for effects
   */
  private makeDistortionCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }

    return curve;
  }

  // ============================================
  // VOLUME CONTROLS
  // ============================================

  setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.masterVolume;
    }
    this.saveSettings();
  }

  setSFXVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.settings.sfxVolume;
    }
    this.saveSettings();
  }

  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.value = this.settings.musicVolume;
    }
    this.saveSettings();
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.settings.masterVolume;
    }
    this.saveSettings();
  }

  toggleMute(): boolean {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }

  getMasterVolume(): number {
    return this.settings.masterVolume;
  }

  getSFXVolume(): number {
    return this.settings.sfxVolume;
  }

  getMusicVolume(): number {
    return this.settings.musicVolume;
  }

  isMuted(): boolean {
    return this.settings.muted;
  }

  private applySettings(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.masterVolume;
    }
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.settings.sfxVolume;
    }
    if (this.musicGain) {
      this.musicGain.gain.value = this.settings.musicVolume;
    }
  }

  // ============================================
  // SETTINGS PERSISTENCE
  // ============================================

  private loadSettings(): AudioSettings {
    try {
      const saved = localStorage.getItem('elemental_clash_audio');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore errors
    }
    return {
      masterVolume: 0.7,
      sfxVolume: 1,
      musicVolume: 0.5,
      muted: false,
    };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('elemental_clash_audio', JSON.stringify(this.settings));
    } catch {
      // Ignore errors
    }
  }

  // ============================================
  // GAME EVENT INTEGRATION
  // ============================================

  private subscribeToGameEvents(): void {
    // Card events
    this.eventUnsubscribers.push(
      gameEvents.on<CardSelectedPayload>('CARD_SELECTED', () => {
        this.play('cardSelect');
      })
    );

    this.eventUnsubscribers.push(
      gameEvents.on('CARDS_REVEALED', () => {
        this.play('cardFlip');
      })
    );

    // Attack events - play element-themed attack sounds
    this.eventUnsubscribers.push(
      gameEvents.on<AttackResult>('ATTACK_RESOLVED', (event) => {
        const attackType = event.payload.attackType;
        if (attackType === 'continuous') {
          this.play('attackContinuous');
        } else if (attackType === 'projectile') {
          this.play('attackProjectile');
        }
      })
    );

    // Combat events
    this.eventUnsubscribers.push(
      gameEvents.on<DamagePayload>('DAMAGE_DEALT', (event) => {
        const intensity = Math.min(event.payload.amount / 8, 1.5);
        this.play('damageDealt', { intensity });
      })
    );

    this.eventUnsubscribers.push(
      gameEvents.on('DAMAGE_BLOCKED', () => {
        this.play('damageBlocked');
      })
    );

    // Wall events
    this.eventUnsubscribers.push(
      gameEvents.on<WallEventPayload>('WALL_PLACED', () => {
        this.play('wallPlace');
      })
    );

    this.eventUnsubscribers.push(
      gameEvents.on<WallEventPayload>('WALL_DESTROYED', () => {
        this.play('wallDestroy');
      })
    );

    // Miner events
    this.eventUnsubscribers.push(
      gameEvents.on<MinerEventPayload>('MINER_PLACED', () => {
        this.play('minerPlace');
      })
    );

    this.eventUnsubscribers.push(
      gameEvents.on<MinerEventPayload>('MINER_PAYOUT', () => {
        this.play('minerPayout');
      })
    );

    // Energy events
    this.eventUnsubscribers.push(
      gameEvents.on('ENERGY_GAINED', () => {
        this.play('energyGain');
      })
    );

    this.eventUnsubscribers.push(
      gameEvents.on('ENERGY_SPENT', () => {
        this.play('energySpend');
      })
    );

    // Timer events
    this.eventUnsubscribers.push(
      gameEvents.on<TimerPayload>('TIMER_TICK', (event) => {
        if (event.payload.remaining <= 5 && event.payload.remaining > 0) {
          this.play('timerTick');
        }
      })
    );

    this.eventUnsubscribers.push(
      gameEvents.on<TimerPayload>('TIMER_WARNING', () => {
        this.play('timerWarning');
      })
    );

    this.eventUnsubscribers.push(
      gameEvents.on('TIMER_EXPIRED', () => {
        this.play('timerExpired');
      })
    );

    // Turn events
    this.eventUnsubscribers.push(
      gameEvents.on('TURN_START', () => {
        this.play('turnStart');
      })
    );

    // Game end events
    this.eventUnsubscribers.push(
      gameEvents.on<VictoryPayload>('VICTORY', () => {
        this.play('victory');
      })
    );

    this.eventUnsubscribers.push(
      gameEvents.on('DEFEAT', () => {
        this.play('defeat');
      })
    );

    this.eventUnsubscribers.push(
      gameEvents.on('DOUBLE_KO', () => {
        this.play('defeat');
      })
    );
  }

  // ============================================
  // CLEANUP
  // ============================================

  destroy(): void {
    // Unsubscribe from all events
    this.eventUnsubscribers.forEach((unsub) => unsub());
    this.eventUnsubscribers = [];

    // Close audio context
    if (this.context) {
      this.context.close();
      this.context = null;
    }

    this.isUnlocked = false;
  }
}

// Global audio manager instance
export const audioManager = new AudioManager();
