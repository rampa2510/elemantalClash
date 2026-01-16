/**
 * SettingsPanel - DOM Overlay Settings Controls
 *
 * Creates persistent settings controls positioned in margins outside game canvas
 * - Left panel: Music toggle, Theme toggle
 * - Right panel: SFX toggle, Quit button
 * - Circular 60px buttons with emoji icons
 * - Responsive: Hidden on screens < 1000px
 */

import { settingsManager } from '../managers/SettingsManager';
import { themeManager } from '../managers/ThemeManager';
import { musicManager } from '../audio/MusicManager';

type ButtonType = 'music' | 'sfx' | 'theme' | 'quit';
type PanelPosition = 'left' | 'right';

export class SettingsPanel {
  private container: HTMLDivElement;
  private position: PanelPosition;
  private buttons: Map<ButtonType, HTMLButtonElement> = new Map();

  // Icon definitions
  private icons = {
    music: {
      enabled: '🎵',
      disabled: '🔇',
    },
    sfx: {
      enabled: '🔊',
      disabled: '🔇',
    },
    theme: {
      light: '☀️',
      dark: '🌙',
    },
    quit: '❌', // Better icon for quit
  };

  // Label definitions
  private labels = {
    music: 'Music',
    sfx: 'SFX',
    theme: 'Theme',
    quit: 'Quit',
  };

  constructor(position: PanelPosition) {
    this.position = position;
    this.container = this.createContainer();
    document.body.appendChild(this.container);
  }

  /**
   * Create panel container
   */
  private createContainer(): HTMLDivElement {
    const div = document.createElement('div');
    div.className = `settings-panel ${this.position}`;
    return div;
  }

  /**
   * Add button to panel
   */
  addButton(type: ButtonType): void {
    const button = this.createButton(type);
    this.buttons.set(type, button);
    this.container.appendChild(button);
  }

  /**
   * Create individual setting button with icon and label
   */
  private createButton(type: ButtonType): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'settings-button';
    button.setAttribute('data-type', type);

    // Create icon element
    const iconSpan = document.createElement('span');
    iconSpan.className = 'settings-icon';
    button.appendChild(iconSpan);

    // Create label element
    const labelSpan = document.createElement('span');
    labelSpan.className = 'settings-label';
    labelSpan.textContent = this.labels[type];
    button.appendChild(labelSpan);

    // Set initial icon and tooltip
    this.updateButton(button, type);

    // Attach event handler
    button.addEventListener('click', () => this.handleButtonClick(type));

    return button;
  }

  /**
   * Update button icon and tooltip
   */
  private updateButton(button: HTMLButtonElement, type: ButtonType): void {
    const iconSpan = button.querySelector('.settings-icon') as HTMLSpanElement;
    if (!iconSpan) return;

    switch (type) {
      case 'music':
        const musicEnabled = settingsManager.isMusicEnabled();
        iconSpan.textContent = musicEnabled ? this.icons.music.enabled : this.icons.music.disabled;
        button.title = musicEnabled ? 'Disable Music' : 'Enable Music';
        break;

      case 'sfx':
        const sfxEnabled = settingsManager.isSFXEnabled();
        iconSpan.textContent = sfxEnabled ? this.icons.sfx.enabled : this.icons.sfx.disabled;
        button.title = sfxEnabled ? 'Disable Sound Effects' : 'Enable Sound Effects';
        break;

      case 'theme':
        const theme = themeManager.getTheme();
        iconSpan.textContent = theme === 'dark' ? this.icons.theme.dark : this.icons.theme.light;
        button.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        break;

      case 'quit':
        iconSpan.textContent = this.icons.quit;
        button.title = 'Quit to Menu';
        break;
    }
  }

  /**
   * Handle button click
   */
  private handleButtonClick(type: ButtonType): void {
    switch (type) {
      case 'music':
        settingsManager.toggleMusicEnabled();
        break;

      case 'sfx':
        settingsManager.toggleSFXEnabled();
        break;

      case 'theme':
        const newTheme = settingsManager.toggleTheme();
        themeManager.setTheme(newTheme);
        break;

      case 'quit':
        this.handleQuit();
        break;
    }

    // Update button visual state
    const button = this.buttons.get(type);
    if (button) {
      this.updateButton(button, type);
    }
  }

  /**
   * Handle quit button
   */
  private handleQuit(): void {
    // Access Phaser game instance from window
    const game = (window as any).game;
    if (!game) {
      console.warn('Game instance not found');
      return;
    }

    // Get current active scene
    const activeScenes = game.scene.getScenes(true);
    if (activeScenes.length === 0) return;

    const currentScene = activeScenes[0];
    const sceneKey = currentScene.scene.key;

    // Only allow quit from GameScene or DraftScene
    if (sceneKey === 'GameScene' || sceneKey === 'DraftScene') {
      console.log('🚪 Quitting to menu...');

      // Crossfade to menu music if in game
      if (sceneKey === 'GameScene' && musicManager.getCurrentTrack() === 'gameplay') {
        musicManager.crossfade('menu', 2);
      }

      // Transition to menu
      currentScene.scene.start('MenuScene');
    } else {
      console.log('Quit button only works in game or draft scenes');
    }
  }

  /**
   * Update quit button visibility based on current scene
   */
  updateQuitButtonVisibility(sceneKey: string): void {
    const quitButton = this.buttons.get('quit');
    if (!quitButton) return;

    // Show quit button only in GameScene and DraftScene
    if (sceneKey === 'GameScene' || sceneKey === 'DraftScene') {
      quitButton.style.display = 'flex';
    } else {
      quitButton.style.display = 'none';
    }
  }

  /**
   * Show panel
   */
  show(): void {
    this.container.style.display = 'flex';
  }

  /**
   * Hide panel
   */
  hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Destroy panel and remove from DOM
   */
  destroy(): void {
    this.container.remove();
    this.buttons.clear();
  }
}
