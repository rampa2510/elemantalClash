import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './constants';

// Import scenes
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MenuScene } from '../scenes/MenuScene';
import { TutorialScene } from '../scenes/TutorialScene';
import { DraftScene } from '../scenes/DraftScene';
import { GameScene } from '../scenes/GameScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { LobbyScene } from '../scenes/LobbyScene';
import { JoinScene } from '../scenes/JoinScene';
import { ConnectingScene } from '../scenes/ConnectingScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL, // Force WebGL for shader support
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: { width: GAME_WIDTH * 0.5, height: GAME_HEIGHT * 0.5 },
    max: { width: GAME_WIDTH * 1.5, height: GAME_HEIGHT * 1.5 },
  },
  input: {
    activePointers: 3,
    touch: { capture: true },
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    TutorialScene,
    DraftScene,
    GameScene,
    GameOverScene,
    LobbyScene,
    JoinScene,
    ConnectingScene,
  ],
};
