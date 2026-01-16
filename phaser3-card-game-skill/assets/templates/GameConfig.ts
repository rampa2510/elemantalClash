// GameConfig.ts - Starter configuration for Elemental Clash
// Copy this to your src/config/ directory

import Phaser from 'phaser';

// Import your scenes
// import { BootScene } from '../scenes/BootScene';
// import { PreloadScene } from '../scenes/PreloadScene';
// import { MainMenuScene } from '../scenes/MainMenuScene';
// import { GameScene } from '../scenes/GameScene';
// import { UIScene } from '../scenes/UIScene';
// import { GameOverScene } from '../scenes/GameOverScene';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
    min: { width: 360, height: 640 },
    max: { width: 1080, height: 1920 }
  },
  
  input: {
    activePointers: 3,
    touch: { capture: true }
  },
  
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  
  audio: {
    disableWebAudio: false
  },
  
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  
  scene: [
    // BootScene,
    // PreloadScene,
    // MainMenuScene,
    // GameScene,
    // UIScene,
    // GameOverScene
  ]
};

// Game constants
export const GAME_CONSTANTS = {
  // Timing
  TURN_DURATION_MS: 10000,
  CARD_FLIP_DURATION: 300,
  CARD_DEAL_DURATION: 400,
  CARD_PLAY_DURATION: 500,
  
  // Gameplay
  STARTING_HEALTH: 30,
  MAX_HAND_SIZE: 7,
  DECK_SIZE: 30,
  
  // Layout
  CARD_WIDTH: 120,
  CARD_HEIGHT: 180,
  HAND_Y_POSITION: 1100,
  OPPONENT_HAND_Y: 180,
  PLAY_AREA_Y: 640,
  
  // Firebase
  ROOM_CODE_LENGTH: 6,
  DISCONNECT_GRACE_MS: 30000,
  
  // Audio
  DEFAULT_SFX_VOLUME: 0.7,
  DEFAULT_MUSIC_VOLUME: 0.4
} as const;

// Element colors
export const ELEMENT_COLORS = {
  Fire: { primary: 0xff4400, secondary: 0xff8800, accent: 0xffcc00, glow: 0xfacc22 },
  Water: { primary: 0x1e90ff, secondary: 0x00bfff, accent: 0x87ceeb, glow: 0x4169e1 },
  Earth: { primary: 0x8b4513, secondary: 0x228b22, accent: 0xdaa520, glow: 0x6b8e23 },
  Air: { primary: 0xe0ffff, secondary: 0xb0e0e6, accent: 0xffffff, glow: 0x87ceeb },
  Lightning: { primary: 0xffff00, secondary: 0x00ffff, accent: 0xffffcc, glow: 0xf0e68c },
  Ice: { primary: 0xadd8e6, secondary: 0x87ceeb, accent: 0xffffff, glow: 0xe0ffff }
} as const;
