import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { SceneKeys } from '../core/SceneKeys';
import { TextureAtlas } from '../core/TextureAtlas';

/**
 * PreloadScene - Loads all game assets with visual progress
 * Based on phaser3-card-game-skill patterns
 */
export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private progressBarFill!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;
  private assetText!: Phaser.GameObjects.Text;
  private failedAssets: string[] = [];

  constructor() {
    super({ key: SceneKeys.PRELOAD });
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Title
    this.add.text(centerX, centerY - 150, 'ELEMENTAL CLASH', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Loading text
    this.loadingText = this.add.text(centerX, centerY - 50, 'Loading...', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Progress box background
    const barWidth = 320;
    const barHeight = 40;
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(COLORS.cardBg, 0.8);
    this.progressBox.fillRoundedRect(centerX - barWidth / 2, centerY - barHeight / 2, barWidth, barHeight, 8);
    this.progressBox.lineStyle(2, COLORS.text, 0.3);
    this.progressBox.strokeRoundedRect(centerX - barWidth / 2, centerY - barHeight / 2, barWidth, barHeight, 8);

    // Progress bar fill (will be scaled)
    this.progressBarFill = this.add.graphics();

    // Percent text
    this.percentText = this.add.text(centerX, centerY, '0%', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Asset text (shows what's loading)
    this.assetText = this.add.text(centerX, centerY + 50, '', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#b8c5d6',
    }).setOrigin(0.5);

    // Set up progress handlers
    this.load.on('progress', this.onProgress, this);
    this.load.on('fileprogress', this.onFileProgress, this);
    this.load.on('loaderror', this.onLoadError, this);
    this.load.on('complete', this.onComplete, this);

    // Load assets
    this.loadAssets();
  }

  private loadAssets(): void {
    // Create placeholder assets (replace with real assets later)
    this.createPlaceholderAssets();

    // Start loading
    this.load.start();
  }

  private createPlaceholderAssets(): void {
    // Create placeholder textures for cards, UI elements, etc.
    // These will be replaced with actual assets later
    for (let i = 0; i < 10; i++) {
      this.load.image(`placeholder_${i}`, this.createPlaceholderTexture());
    }
  }

  private createPlaceholderTexture(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 140;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(0, 0, 100, 140);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 96, 136);
    return canvas.toDataURL();
  }

  private onProgress(value: number): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    const barWidth = 320;
    const barHeight = 40;
    const padding = 6;

    // Update fill bar
    this.progressBarFill.clear();
    this.progressBarFill.fillStyle(COLORS.energyBar, 1);
    this.progressBarFill.fillRoundedRect(
      centerX - barWidth / 2 + padding,
      centerY - barHeight / 2 + padding,
      (barWidth - padding * 2) * value,
      barHeight - padding * 2,
      4
    );

    // Update percent text
    this.percentText.setText(`${Math.round(value * 100)}%`);
  }

  private onFileProgress(file: Phaser.Loader.File): void {
    this.assetText.setText(`Loading: ${file.key}`);
  }

  private onLoadError(file: Phaser.Loader.File): void {
    console.error(`Failed to load: ${file.key}`);
    this.failedAssets.push(file.key);
  }

  private onComplete(): void {
    // Log any failed assets
    if (this.failedAssets.length > 0) {
      console.warn('Some assets failed to load:', this.failedAssets);
    }

    // Generate all particle textures once (centralized)
    TextureAtlas.generate(this);

    // Update UI to show complete
    this.loadingText.setText('Ready!');
    this.assetText.setText('');
    this.percentText.setText('100%');

    // Small delay for UX, then transition with fade
    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(
        Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
        () => {
          this.scene.start(SceneKeys.MENU, { fadeIn: true });
        }
      );
    });
  }
}
