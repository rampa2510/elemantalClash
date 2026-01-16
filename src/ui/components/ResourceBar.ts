import Phaser from 'phaser';
import { COLORS, FONTS, RESOURCE_ANIMATION, MAX_ENERGY } from '../../config/constants';

interface ResourceBarConfig {
  x: number;
  y: number;
  maxResources: number;
}

/**
 * ResourceBar component with individual crystal visualization
 * Features signature "Bloom Cascade" animation
 */
export class ResourceBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private crystals: Phaser.GameObjects.Container[] = [];
  private label!: Phaser.GameObjects.Text;
  private nextGainIndicator!: Phaser.GameObjects.Text;
  private numericFallback!: Phaser.GameObjects.Text;
  private maxResources: number;
  private currentResources: number = 0;

  constructor(scene: Phaser.Scene, config: ResourceBarConfig) {
    this.scene = scene;
    this.maxResources = config.maxResources;
    this.container = scene.add.container(config.x, config.y);
    this.container.setDepth(100);

    this.createLabel();
    this.createCrystals();
    this.createNextGainIndicator();
    this.createNumericFallback();
  }

  private createLabel(): void {
    this.label = this.scene.add.text(-180, -15, 'RESOURCES', {
      fontFamily: FONTS.family,
      fontSize: '16px',
      color: '#e0e0e0',
      fontStyle: 'bold',
    });
    this.label.setLetterSpacing(0.5);
    this.label.setShadow(0, 2, '#000000', 4);
    this.container.add(this.label);
  }

  private createCrystals(): void {
    const spacing = 14;
    const startX = -40;

    for (let i = 0; i < this.maxResources; i++) {
      const crystal = this.createCrystal(i);
      crystal.setPosition(startX + i * spacing, 0);
      this.crystals.push(crystal);
      this.container.add(crystal);
    }
  }

  private createCrystal(index: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    // Glow layer (visible when filled)
    const glow = this.scene.add.circle(0, 0, 10, COLORS.resourceGlow, 0);
    glow.setName('glow');

    // Crystal body
    const crystal = this.scene.add.circle(0, 0, 6, COLORS.resourceEmpty, 0.4);
    crystal.setName('crystal');

    // Inner shine highlight
    const shine = this.scene.add.circle(-1, -1, 2, 0xffffff, 0.6);
    shine.setName('shine');

    container.add([glow, crystal, shine]);
    container.setData('index', index);
    container.setData('filled', false);

    return container;
  }

  private createNextGainIndicator(): void {
    this.nextGainIndicator = this.scene.add.text(35, 18, '+2⚡', {
      fontFamily: FONTS.family,
      fontSize: '12px',
      color: '#ffd43b',
    });
    this.nextGainIndicator.setAlpha(0.6);
    this.container.add(this.nextGainIndicator);
  }

  private createNumericFallback(): void {
    this.numericFallback = this.scene.add.text(-25, 18, '5/10', {
      fontFamily: FONTS.family,
      fontSize: '12px',
      color: '#b8c5d6',
    }).setOrigin(1, 0);
    this.container.add(this.numericFallback);
  }

  /**
   * Main method to update resources with simple, clean updates
   */
  async setResources(
    amount: number,
    animated: boolean = true,
    turnNumber: number = 1
  ): Promise<void> {
    const previousAmount = this.currentResources;
    this.currentResources = amount;

    // Update numeric fallback
    this.numericFallback.setText(`${amount}/${this.maxResources}`);

    // Update next gain indicator based on turn parity
    const nextGain = turnNumber % 2 === 0 ? 2 : 3;
    this.nextGainIndicator.setText(`+${nextGain}⚡`);

    // Always use instant update for clean, clear gameplay
    // The bloom cascade was too visually noisy
    this.updateCrystalStates();

    // Announce to screen reader
    if (amount > previousAmount) {
      this.announceToScreenReader(
        `Resources gained: ${amount - previousAmount}. Current: ${amount} of ${this.maxResources}`
      );
    }
  }

  /**
   * Signature bloom cascade animation
   * Phase 1: Portal opens
   * Phase 2: Crystals emit from portal
   * Phase 3: Cascade to slots (staggered)
   * Phase 4: Individual bloom with particles
   * Phase 5: Final glow pulse
   * Phase 6: Portal closes
   */
  private async playBloomCascade(
    gainAmount: number,
    startIndex: number
  ): Promise<void> {
    // Phase 1: Create and open portal
    const portal = this.createPortal();
    await this.animatePortalOpen(portal);

    // Phase 2: Emit crystals from portal
    const tempCrystals = await this.emitCrystalsFromPortal(portal, gainAmount);

    // Phase 3: Cascade to slots (with stagger)
    for (let i = 0; i < gainAmount; i++) {
      await this.wait(RESOURCE_ANIMATION.cascadeStagger);

      const targetCrystal = this.crystals[startIndex + i];
      const tempCrystal = tempCrystals[i];

      // Animate temp crystal to target position
      await this.cascadeCrystal(tempCrystal, targetCrystal);

      // Trigger bloom on target
      this.bloomCrystal(targetCrystal, i === gainAmount - 1);
    }

    // Phase 4: Final glow pulse
    await this.glowPulse();

    // Phase 5: Close portal
    await this.animatePortalClose(portal);

    // Clean up temp crystals
    tempCrystals.forEach(c => c.destroy());
  }

  private createPortal(): Phaser.GameObjects.Container {
    const portal = this.scene.add.container(0, -30);

    // Outer ring
    const outerRing = this.scene.add.circle(0, 0, 20, COLORS.resourceGlow, 0.3);
    outerRing.setStrokeStyle(2, COLORS.resourceGain, 0.8);

    // Inner core
    const core = this.scene.add.circle(0, 0, 8, COLORS.resourceGain, 0.6);

    portal.add([outerRing, core]);
    portal.setAlpha(0);
    portal.setScale(0);
    this.container.add(portal);

    return portal;
  }

  private animatePortalOpen(portal: Phaser.GameObjects.Container): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: portal,
        alpha: 1,
        scale: 1,
        rotation: Math.PI * 2,
        duration: RESOURCE_ANIMATION.portalOpen,
        ease: 'Back.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  private emitCrystalsFromPortal(
    portal: Phaser.GameObjects.Container,
    count: number
  ): Promise<Phaser.GameObjects.Container[]> {
    return new Promise(resolve => {
      const tempCrystals: Phaser.GameObjects.Container[] = [];

      for (let i = 0; i < count; i++) {
        const temp = this.createCrystal(-1);
        temp.setPosition(portal.x, portal.y);
        temp.setAlpha(0);
        temp.setScale(0.5);
        this.container.add(temp);
        tempCrystals.push(temp);

        // Emit upward with spread
        const spread = (Math.random() - 0.5) * 40;
        this.scene.tweens.add({
          targets: temp,
          y: portal.y + 30,
          x: portal.x + spread,
          alpha: 1,
          scale: 0.8,
          duration: RESOURCE_ANIMATION.portalEmit,
          delay: i * 30,
          ease: 'Quad.easeOut',
        });
      }

      setTimeout(
        () => resolve(tempCrystals),
        RESOURCE_ANIMATION.portalEmit + count * 30
      );
    });
  }

  private cascadeCrystal(
    from: Phaser.GameObjects.Container,
    to: Phaser.GameObjects.Container
  ): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: from,
        x: to.x,
        y: to.y,
        duration: 300,
        ease: 'Power2',
        onComplete: () => resolve(),
      });
    });
  }

  private bloomCrystal(
    crystal: Phaser.GameObjects.Container,
    isLast: boolean
  ): void {
    const glow = crystal.getByName('glow') as Phaser.GameObjects.Arc;
    const body = crystal.getByName('crystal') as Phaser.GameObjects.Arc;

    // Mark as filled
    crystal.setData('filled', true);

    // Update colors
    body.setFillStyle(COLORS.resourceFilled);
    body.setAlpha(1);

    // Show glow
    glow.setAlpha(0.3);

    // Bloom animation: scale + rotation
    this.scene.tweens.add({
      targets: crystal,
      scale: RESOURCE_ANIMATION.bloomScale.peak,
      rotation: Phaser.Math.DegToRad(RESOURCE_ANIMATION.bloomRotation),
      duration: RESOURCE_ANIMATION.bloomDuration / 2,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Settle back
        this.scene.tweens.add({
          targets: crystal,
          scale: RESOURCE_ANIMATION.bloomScale.end,
          rotation: 0,
          duration: RESOURCE_ANIMATION.bloomDuration / 2,
          ease: 'Power2',
        });
      },
    });

    // Particle burst
    this.emitBloomParticles(crystal.x + this.container.x, crystal.y + this.container.y);

    // Start pulsing glow
    this.startGlowPulse(crystal);
  }

  private emitBloomParticles(x: number, y: number): void {
    RESOURCE_ANIMATION.particleColors.forEach(color => {
      for (let i = 0; i < 2; i++) {
        const particle = this.scene.add.circle(x, y, 3, color);
        const angle = Math.random() * Math.PI * 2;
        const speed = Phaser.Math.Between(
          RESOURCE_ANIMATION.particleSpeed.min,
          RESOURCE_ANIMATION.particleSpeed.max
        );

        this.scene.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * speed,
          y: y + Math.sin(angle) * speed,
          alpha: 0,
          scale: 0,
          duration: RESOURCE_ANIMATION.particleLifetime,
          ease: 'Quad.easeOut',
          onComplete: () => particle.destroy(),
        });
      }
    });
  }

  private startGlowPulse(crystal: Phaser.GameObjects.Container): void {
    const glow = crystal.getByName('glow') as Phaser.GameObjects.Arc;

    this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.3, to: 0.6 },
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private glowPulse(): Promise<void> {
    return new Promise(resolve => {
      // Create temporary overlay
      const overlay = this.scene.add.rectangle(
        0, 0,
        150, 40,
        COLORS.resourceGlow,
        0
      );
      this.container.add(overlay);

      this.scene.tweens.add({
        targets: overlay,
        alpha: { from: 0, to: 0.3 },
        duration: RESOURCE_ANIMATION.glowPulse / 2,
        ease: 'Sine.easeInOut',
        yoyo: true,
        onComplete: () => {
          overlay.destroy();
          resolve();
        },
      });
    });
  }

  private animatePortalClose(portal: Phaser.GameObjects.Container): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: portal,
        alpha: 0,
        scale: 0,
        rotation: Math.PI * 4,
        duration: RESOURCE_ANIMATION.portalClose,
        ease: 'Power2',
        onComplete: () => {
          portal.destroy();
          resolve();
        },
      });
    });
  }

  private updateCrystalStates(): void {
    this.crystals.forEach((crystal, index) => {
      const glow = crystal.getByName('glow') as Phaser.GameObjects.Arc;
      const body = crystal.getByName('crystal') as Phaser.GameObjects.Arc;
      const filled = index < this.currentResources;

      crystal.setData('filled', filled);

      if (filled) {
        body.setFillStyle(COLORS.resourceFilled);
        body.setAlpha(1);
        glow.setAlpha(0.3);
        this.startGlowPulse(crystal);
      } else {
        body.setFillStyle(COLORS.resourceEmpty);
        body.setAlpha(0.4);
        glow.setAlpha(0);
        this.scene.tweens.killTweensOf(glow);
      }
    });
  }

  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => announcement.remove(), 1000);
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy(): void {
    this.container.destroy();
  }
}
