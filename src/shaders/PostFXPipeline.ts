import Phaser from 'phaser';

/**
 * Custom WebGL Post-Processing Pipeline for AAA visual effects
 *
 * Features:
 * - Vignette: Darkens edges for cinematic focus
 * - Bloom: Adds glow to bright areas (high damage moments)
 * - Chromatic Aberration: Subtle color separation for impact
 * - Color Grading: Warm/cool tints for different game states
 *
 * Performance Optimizations:
 * - Early-exit when effects are disabled
 * - 5-tap bloom (cross pattern) instead of 9-tap grid
 * - Simplified saturation using luminance mix (no HSL conversion)
 * - Conditional film grain
 */
export class PostFXPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private vignetteIntensity: number = 0.3;
  private bloomIntensity: number = 0.0;
  private chromaticIntensity: number = 0.0;
  private time: number = 0;
  private colorTint: { r: number; g: number; b: number } = { r: 1, g: 1, b: 1 };
  private saturation: number = 1.0;
  private enableGrain: boolean = true;

  constructor(game: Phaser.Game) {
    super({
      game,
      name: 'PostFXPipeline',
      fragShader: `
        precision mediump float;

        uniform sampler2D uMainSampler;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uVignette;
        uniform float uBloom;
        uniform float uChromatic;
        uniform vec3 uColorTint;
        uniform float uSaturation;
        uniform float uEnableGrain;

        varying vec2 outTexCoord;

        // Optimized saturation using luminance mix (faster than HSL conversion)
        vec3 adjustSaturation(vec3 color, float sat) {
          float luminance = dot(color, vec3(0.299, 0.587, 0.114));
          return mix(vec3(luminance), color, sat);
        }

        void main() {
          vec2 uv = outTexCoord;
          vec4 color;

          // Chromatic Aberration - early exit if disabled
          if (uChromatic > 0.01) {
            float offset = uChromatic * 0.003;
            color.r = texture2D(uMainSampler, uv + vec2(offset, 0.0)).r;
            color.g = texture2D(uMainSampler, uv).g;
            color.b = texture2D(uMainSampler, uv - vec2(offset, 0.0)).b;
            color.a = texture2D(uMainSampler, uv).a;
          } else {
            color = texture2D(uMainSampler, uv);
          }

          // Optimized Bloom: 5-tap cross pattern (faster than 9-tap grid)
          if (uBloom > 0.01) {
            vec4 bloomColor = vec4(0.0);
            float blurSize = 0.004 * uBloom;

            // Center sample
            vec4 centerSample = texture2D(uMainSampler, uv);
            float centerBright = dot(centerSample.rgb, vec3(0.299, 0.587, 0.114));

            // Cross pattern: center + 4 cardinal directions
            bloomColor += centerSample;
            bloomColor += texture2D(uMainSampler, uv + vec2(blurSize, 0.0));
            bloomColor += texture2D(uMainSampler, uv - vec2(blurSize, 0.0));
            bloomColor += texture2D(uMainSampler, uv + vec2(0.0, blurSize));
            bloomColor += texture2D(uMainSampler, uv - vec2(0.0, blurSize));
            bloomColor /= 5.0;

            // Only add bloom if brightness exceeds threshold
            float bloomBright = dot(bloomColor.rgb, vec3(0.299, 0.587, 0.114));
            if (bloomBright > 0.5) {
              color.rgb += (bloomColor.rgb - color.rgb) * uBloom * (bloomBright - 0.5) * 2.0;
            }
          }

          // Optimized saturation (no HSL conversion)
          if (abs(uSaturation - 1.0) > 0.01) {
            color.rgb = adjustSaturation(color.rgb, uSaturation);
          }

          // Color tint/grading - always fast, just multiplication
          color.rgb *= uColorTint;

          // Vignette effect (darkens edges) - early exit if disabled
          if (uVignette > 0.01) {
            vec2 center = vec2(0.5, 0.5);
            float dist = distance(uv, center);
            float vignette = smoothstep(0.7, 0.3, dist * uVignette);
            color.rgb *= mix(1.0, vignette, uVignette);
          }

          // Film grain - only when enabled and with time variation
          if (uEnableGrain > 0.5) {
            float grain = fract(sin(dot(uv * uTime, vec2(12.9898, 78.233))) * 43758.5453);
            color.rgb += (grain - 0.5) * 0.012;
          }

          gl_FragColor = color;
        }
      `
    });
  }

  onPreRender(): void {
    this.time += 0.016; // ~60fps increment
    this.set1f('uTime', this.time);
    this.set1f('uVignette', this.vignetteIntensity);
    this.set1f('uBloom', this.bloomIntensity);
    this.set1f('uChromatic', this.chromaticIntensity);
    this.set3f('uColorTint', this.colorTint.r, this.colorTint.g, this.colorTint.b);
    this.set1f('uSaturation', this.saturation);
    this.set1f('uEnableGrain', this.enableGrain ? 1.0 : 0.0);
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
  }

  /**
   * Enable or disable film grain effect
   */
  setGrainEnabled(enabled: boolean): this {
    this.enableGrain = enabled;
    return this;
  }

  // ==================== PUBLIC API ====================

  /**
   * Set vignette intensity (0 = off, 1 = strong)
   */
  setVignette(intensity: number): this {
    this.vignetteIntensity = Phaser.Math.Clamp(intensity, 0, 1.5);
    return this;
  }

  /**
   * Set bloom intensity (0 = off, 1 = strong glow)
   */
  setBloom(intensity: number): this {
    this.bloomIntensity = Phaser.Math.Clamp(intensity, 0, 2);
    return this;
  }

  /**
   * Set chromatic aberration (0 = off, 1 = strong color separation)
   */
  setChromatic(intensity: number): this {
    this.chromaticIntensity = Phaser.Math.Clamp(intensity, 0, 2);
    return this;
  }

  /**
   * Set color tint for color grading
   */
  setColorTint(r: number, g: number, b: number): this {
    this.colorTint = { r, g, b };
    return this;
  }

  /**
   * Set saturation (0 = grayscale, 1 = normal, 2 = oversaturated)
   */
  setSaturation(value: number): this {
    this.saturation = Phaser.Math.Clamp(value, 0, 2);
    return this;
  }

  /**
   * Reset all effects to default
   */
  reset(): this {
    this.vignetteIntensity = 0.3;
    this.bloomIntensity = 0;
    this.chromaticIntensity = 0;
    this.colorTint = { r: 1, g: 1, b: 1 };
    this.saturation = 1.0;
    return this;
  }

  // ==================== PRESET EFFECTS ====================

  /**
   * Impact flash - for when big damage is dealt
   */
  impactFlash(intensity: number = 1): void {
    this.setBloom(0.8 * intensity);
    this.setChromatic(0.5 * intensity);

    // Will need to be reset externally or via tween
  }

  /**
   * Critical HP warning - red tint, high contrast
   */
  criticalWarning(): void {
    this.setColorTint(1.2, 0.9, 0.9);
    this.setVignette(0.5);
    this.setSaturation(1.2);
  }

  /**
   * Victory state - warm golden glow
   */
  victoryGlow(): void {
    this.setColorTint(1.1, 1.05, 0.95);
    this.setBloom(0.3);
    this.setVignette(0.2);
    this.setSaturation(1.1);
  }

  /**
   * Defeat state - desaturated, cold
   */
  defeatDim(): void {
    this.setColorTint(0.9, 0.95, 1.0);
    this.setSaturation(0.7);
    this.setVignette(0.6);
  }

  /**
   * Menu/calm state - subtle ambient
   */
  menuAmbient(): void {
    this.setVignette(0.25);
    this.setBloom(0.1);
    this.setSaturation(1.0);
    this.setColorTint(1, 1, 1);
  }
}
