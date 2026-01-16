import Phaser from 'phaser';

/**
 * Performance Tier Levels
 */
export enum PerformanceTier {
  LOW = 'low', // Mobile / weak devices
  MEDIUM = 'medium', // Average devices
  HIGH = 'high', // Desktop / powerful
}

/**
 * LOD Multipliers per tier
 */
interface LODMultipliers {
  particleCount: number;
  lifespan: number;
  emitterFrequency: number;
  enableSecondaryEffects: boolean;
  enableRingBurst: boolean;
}

/**
 * Particle LOD System
 *
 * Automatically scales particle effects based on device capability
 * and real-time FPS monitoring. Ensures buttery-smooth performance
 * on all devices.
 */
export class ParticleLOD {
  private scene: Phaser.Scene;
  private tier: PerformanceTier;
  private fpsHistory: number[] = [];
  private lastFPSCheck: number = 0;
  private readonly FPS_CHECK_INTERVAL = 1000; // Check every second
  private readonly FPS_HISTORY_SIZE = 5;

  // LOD multipliers per tier
  private static readonly MULTIPLIERS: Record<PerformanceTier, LODMultipliers> = {
    [PerformanceTier.LOW]: {
      particleCount: 0.3, // 30% of particles
      lifespan: 0.7, // 70% lifespan (faster cleanup)
      emitterFrequency: 2.0, // 2x longer between emissions
      enableSecondaryEffects: false,
      enableRingBurst: false,
    },
    [PerformanceTier.MEDIUM]: {
      particleCount: 0.6,
      lifespan: 0.85,
      emitterFrequency: 1.3,
      enableSecondaryEffects: true,
      enableRingBurst: false,
    },
    [PerformanceTier.HIGH]: {
      particleCount: 1.0,
      lifespan: 1.0,
      emitterFrequency: 1.0,
      enableSecondaryEffects: true,
      enableRingBurst: true,
    },
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.tier = this.detectInitialTier();

    console.log(`[ParticleLOD] Initial tier: ${this.tier}`);

    // Start FPS monitoring
    this.scene.events.on('update', this.updateFPSTracking, this);
    this.scene.events.once('shutdown', this.destroy, this);
  }

  /**
   * Detect initial performance tier based on device
   */
  private detectInitialTier(): PerformanceTier {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return PerformanceTier.LOW;
    }

    // Check for mobile device
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    if (isMobile) {
      return PerformanceTier.LOW;
    }

    // Check WebGL capabilities
    const gpuInfo = this.getWebGLInfo();

    // Integrated graphics or mobile GPUs
    if (
      gpuInfo.includes('Intel') ||
      gpuInfo.includes('Mali') ||
      gpuInfo.includes('Adreno') ||
      gpuInfo.includes('PowerVR')
    ) {
      return PerformanceTier.MEDIUM;
    }

    // Default to high for desktops
    return PerformanceTier.HIGH;
  }

  /**
   * Get WebGL renderer info for GPU detection
   */
  private getWebGLInfo(): string {
    try {
      const renderer = this.scene.game.renderer;
      if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
        const gl = renderer.gl;
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        }
      }
    } catch {
      // Ignore errors
    }
    return '';
  }

  /**
   * Update FPS tracking and adjust tier dynamically
   */
  private updateFPSTracking = (_time: number, delta: number): void => {
    const now = performance.now();
    if (now - this.lastFPSCheck < this.FPS_CHECK_INTERVAL) return;

    const fps = 1000 / delta;
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.FPS_HISTORY_SIZE) {
      this.fpsHistory.shift();
    }

    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    // Dynamic tier adjustment
    const previousTier = this.tier;

    if (avgFPS < 25 && this.tier !== PerformanceTier.LOW) {
      this.tier = PerformanceTier.LOW;
    } else if (avgFPS > 50 && avgFPS < 55 && this.tier === PerformanceTier.LOW) {
      this.tier = PerformanceTier.MEDIUM;
    } else if (avgFPS > 55 && this.tier === PerformanceTier.MEDIUM) {
      this.tier = PerformanceTier.HIGH;
    } else if (avgFPS < 40 && this.tier === PerformanceTier.HIGH) {
      this.tier = PerformanceTier.MEDIUM;
    }

    if (previousTier !== this.tier) {
      console.log(`[ParticleLOD] Tier changed: ${previousTier} -> ${this.tier} (avg FPS: ${avgFPS.toFixed(1)})`);
    }

    this.lastFPSCheck = now;
  };

  /**
   * Scale particle count based on current tier
   */
  scaleParticleCount(baseCount: number): number {
    return Math.max(1, Math.floor(baseCount * ParticleLOD.MULTIPLIERS[this.tier].particleCount));
  }

  /**
   * Scale lifespan based on current tier
   */
  scaleLifespan(baseLifespan: number): number {
    return Math.floor(baseLifespan * ParticleLOD.MULTIPLIERS[this.tier].lifespan);
  }

  /**
   * Scale emitter frequency based on current tier
   */
  scaleFrequency(baseFrequency: number): number {
    return Math.floor(baseFrequency * ParticleLOD.MULTIPLIERS[this.tier].emitterFrequency);
  }

  /**
   * Check if secondary effects should be enabled
   */
  shouldEnableSecondaryEffects(): boolean {
    return ParticleLOD.MULTIPLIERS[this.tier].enableSecondaryEffects;
  }

  /**
   * Check if ring burst effects should be enabled
   */
  shouldEnableRingBurst(): boolean {
    return ParticleLOD.MULTIPLIERS[this.tier].enableRingBurst;
  }

  /**
   * Get current performance tier
   */
  get currentTier(): PerformanceTier {
    return this.tier;
  }

  /**
   * Get current average FPS
   */
  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60;
    return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
  }

  /**
   * Force a specific tier (for testing)
   */
  forceTier(tier: PerformanceTier): void {
    console.log(`[ParticleLOD] Forcing tier: ${tier}`);
    this.tier = tier;
  }

  /**
   * Get multipliers for current tier
   */
  getMultipliers(): LODMultipliers {
    return { ...ParticleLOD.MULTIPLIERS[this.tier] };
  }

  /**
   * Get debug info
   */
  getDebugInfo(): {
    tier: PerformanceTier;
    avgFPS: number;
    multipliers: LODMultipliers;
  } {
    return {
      tier: this.tier,
      avgFPS: this.getAverageFPS(),
      multipliers: this.getMultipliers(),
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.scene.events.off('update', this.updateFPSTracking, this);
  }
}
