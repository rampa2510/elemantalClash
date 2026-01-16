import Phaser from 'phaser';
import { SceneKeys } from '../core/SceneKeys';

/**
 * BootScene - Minimal initialization scene
 * Only loads essential assets for the loading screen, then hands off to PreloadScene
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.BOOT });
  }

  preload(): void {
    // Load only essentials for the loading screen (if any external assets)
    // For now, PreloadScene uses generated graphics so nothing needed here
  }

  create(): void {
    // Immediately start PreloadScene
    this.scene.start(SceneKeys.PRELOAD);
  }
}
