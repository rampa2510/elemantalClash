import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import { PostFXPipeline } from './shaders/PostFXPipeline';
import { SettingsPanel } from './ui/SettingsPanel';
import { settingsManager } from './managers/SettingsManager';
import { themeManager } from './managers/ThemeManager';
import { sessionManager } from './network/SessionManager';
import { SceneKeys } from './core/SceneKeys';

// Check for multiplayer join intent before initializing game
const { sessionId, isJoinIntent } = sessionManager.parseJoinUrl();

// Initialize Phaser game
const game = new Phaser.Game(gameConfig);

// Register custom post-processing pipeline once renderer is ready
game.events.once('ready', () => {
  if (game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
    (game.renderer.pipelines as Phaser.Renderer.WebGL.PipelineManager).addPostPipeline('PostFXPipeline', PostFXPipeline);
  }

  // Initialize theme from settings
  const savedTheme = settingsManager.getTheme();
  themeManager.setTheme(savedTheme);

  // Initialize settings panels
  const leftPanel = new SettingsPanel('left');
  leftPanel.addButton('music');
  leftPanel.addButton('theme');

  const rightPanel = new SettingsPanel('right');
  rightPanel.addButton('sfx');
  rightPanel.addButton('quit');

  console.log('✅ Settings panels initialized');

  // Handle multiplayer join intent
  if (isJoinIntent && sessionId) {
    console.log('🎮 Detected multiplayer join intent, session:', sessionId);

    // Use a delayed call to wait for scene initialization
    setTimeout(() => {
      // Check if scenes are running before stopping them
      if (game.scene.isActive(SceneKeys.BOOT)) {
        game.scene.stop(SceneKeys.BOOT);
      }
      if (game.scene.isActive(SceneKeys.PRELOAD)) {
        game.scene.stop(SceneKeys.PRELOAD);
      }

      // Start JoinScene directly
      game.scene.start(SceneKeys.JOIN, { sessionId });

      // Clear join parameters from URL
      sessionManager.clearJoinParams();
    }, 100);  // Small delay to ensure scenes are initialized
  }
});

// Export for debugging
(window as unknown as { game: Phaser.Game }).game = game;
