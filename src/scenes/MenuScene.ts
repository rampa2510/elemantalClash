import { BaseScene } from './BaseScene';
import { SceneKeys } from '../core/SceneKeys';
import { Button, Toast, GameSetupModal } from '../ui/components';
import { audioManager } from '../audio';
import proceduralSFX from '../audio/ProceduralSFX';
import { musicManager } from '../audio/MusicManager';
import { themeManager } from '../managers/ThemeManager';
import { settingsManager } from '../managers/SettingsManager';
import { sessionManager } from '../network/SessionManager';
import { MULTIPLAYER_ENABLED } from '../config/constants';

interface MenuSceneData {
  fadeIn?: boolean;
}

/**
 * Main menu scene with navigation to game modes
 * UX Redesign: Clean menu, game setup modal shown before play
 */
export class MenuScene extends BaseScene {
  private buttons: Button[] = [];
  private titleText1!: Phaser.GameObjects.Text;
  private titleText2!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SceneKeys.MENU });
  }

  create(data?: MenuSceneData): void {
    super.create();

    // Handle fade-in from preload
    if (this.shouldFadeIn(data)) {
      this.fadeIn();
    }

    // Unlock audio on first interaction (required for mobile/browsers)
    this.setupAudioUnlock();

    this.createBackground();
    this.createTitle();
    this.createButtons();
  }

  private setupAudioUnlock(): void {
    // Unlock audio on first pointer event (browser requirement)
    const unlockAudio = async () => {
      // Unlock existing audio manager (Web Audio API)
      await audioManager.unlock();

      // Initialize Tone.js ProceduralSFX (hybrid audio system)
      await proceduralSFX.init();

      // Initialize MusicManager
      await musicManager.init();

      console.log('🎵 Hybrid audio system unlocked (Web Audio + Tone.js)');

      // Play procedural UI click to confirm audio is working
      if (proceduralSFX.isInitialized()) {
        proceduralSFX.click();
      }

      // Play menu open sound after unlock
      audioManager.play('menuOpen');

      // Start menu music
      musicManager.playMenuMusic();

      // Remove listener after unlocking
      this.input.off('pointerdown', unlockAudio);
    };

    this.input.on('pointerdown', unlockAudio);
  }

  private createBackground(): void {
    this.createGradientBackground();
  }

  private createTitle(): void {
    const colors = themeManager.getColors();

    // Main title - "ELEMENTAL" in fire color
    this.titleText1 = this.add.text(this.centerX, 100, 'ELEMENTAL', {
      fontFamily: 'Arial',
      fontSize: '64px',
      color: `#${colors.fire.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // "CLASH" in water color
    this.titleText2 = this.add.text(this.centerX, 170, 'CLASH', {
      fontFamily: 'Arial',
      fontSize: '64px',
      color: `#${colors.water.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.subtitleText = this.add.text(this.centerX, 230, 'Turn-Based Card Strategy', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
  }

  private createButtons(): void {
    const buttonY = 350;
    const buttonSpacing = 70;

    // Play button - shows game setup modal before draft
    const playButton = new Button(this, {
      x: this.centerX,
      y: buttonY,
      width: 250,
      height: 50,
      text: 'PLAY',
      onClick: () => {
        this.showGameSetupModal('draft');
      },
    });
    this.buttons.push(playButton);

    // Tutorial button
    const tutorialButton = new Button(this, {
      x: this.centerX,
      y: buttonY + buttonSpacing,
      width: 250,
      height: 50,
      text: 'HOW TO PLAY',
      onClick: () => {
        this.transitionTo(SceneKeys.TUTORIAL);
      },
    });
    this.buttons.push(tutorialButton);

    // Invite Friend button (multiplayer)
    if (MULTIPLAYER_ENABLED) {
      const inviteButton = new Button(this, {
        x: this.centerX,
        y: buttonY + buttonSpacing * 2,
        width: 250,
        height: 50,
        text: 'INVITE FRIEND',
        onClick: () => {
          this.startMultiplayerHost();
        },
      });
      this.buttons.push(inviteButton);
    }

    // Quick Play button - shows game setup modal before game
    const quickPlayButton = new Button(this, {
      x: this.centerX,
      y: buttonY + buttonSpacing * (MULTIPLAYER_ENABLED ? 3 : 2),
      width: 250,
      height: 50,
      text: 'QUICK PLAY',
      onClick: () => {
        this.showGameSetupModal('quick');
      },
    });
    this.buttons.push(quickPlayButton);
  }

  /**
   * Show game setup modal before starting game
   * UX Redesign: Settings appear after choosing game mode
   */
  private showGameSetupModal(mode: 'draft' | 'quick'): void {
    new GameSetupModal({
      currentName: settingsManager.getPlayerName(),
      currentDifficulty: settingsManager.getAIDifficulty(),
      onConfirm: (playerName, difficulty) => {
        // Settings are already saved in modal
        // Play click sound
        if (proceduralSFX.isInitialized()) {
          proceduralSFX.click();
        }

        // Proceed to game
        if (mode === 'draft') {
          this.transitionTo(SceneKeys.DRAFT);
        } else {
          this.transitionTo(SceneKeys.GAME, { mode: 'quick' });
        }
      },
      onCancel: () => {
        // User cancelled, stay on menu
        console.log('Game setup cancelled');
      },
    });
  }

  /**
   * Start multiplayer as host
   */
  private async startMultiplayerHost(): Promise<void> {
    // Generate session ID
    const sessionId = sessionManager.generateSessionId();
    const inviteLink = sessionManager.createInviteLink(sessionId);

    // Copy to clipboard
    const copied = await sessionManager.copyToClipboard(inviteLink);

    // Show toast
    const toast = new Toast(this);
    if (copied) {
      toast.success('Invite link copied! Share with your friend');
    } else {
      toast.error('Failed to copy link. Please try again');
      return;
    }

    // Play click sound
    if (proceduralSFX.isInitialized()) {
      proceduralSFX.click();
    }

    // Transition to lobby (Phase 2: Use dynamic player name)
    this.transitionTo(SceneKeys.LOBBY, {
      sessionId,
      inviteLink,
      playerName: settingsManager.getPlayerName(),
    });
  }

  protected handleThemeChange(data: { theme: string; colors: any }): void {
    const colors = data.colors;

    // Update title colors
    if (this.titleText1) {
      this.titleText1.setColor(`#${colors.fire.toString(16).padStart(6, '0')}`);
    }
    if (this.titleText2) {
      this.titleText2.setColor(`#${colors.water.toString(16).padStart(6, '0')}`);
    }
    if (this.subtitleText) {
      this.subtitleText.setColor(`#${colors.textSecondary.toString(16).padStart(6, '0')}`);
    }

    // Update button colors would be handled by Button component if needed
    // For now, buttons use their own color system
  }

  shutdown(): void {
    // Clean up buttons
    this.buttons.forEach((btn) => btn.destroy());
    this.buttons = [];
  }
}
