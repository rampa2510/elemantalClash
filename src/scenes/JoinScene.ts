import { BaseScene } from './BaseScene';
import { SceneKeys } from '../core/SceneKeys';
import { Button, Modal } from '../ui/components';
import { sessionManager } from '../network/SessionManager';
import { themeManager } from '../managers/ThemeManager';
import { settingsManager } from '../managers/SettingsManager';

interface JoinSceneData {
  sessionId: string;
}

/**
 * Join Scene - Invitee entry point
 * Allows invited player to access tutorial or skip to connection
 */
export class JoinScene extends BaseScene {
  private sessionId!: string;
  private titleText!: Phaser.GameObjects.Text;
  private welcomeText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private tutorialButton!: Button;
  private skipButton!: Button;

  constructor() {
    super({ key: SceneKeys.JOIN });
  }

  create(data?: JoinSceneData): void {
    super.create();

    if (!data) {
      console.error('JoinScene requires data');
      this.transitionTo(SceneKeys.MENU);
      return;
    }

    this.sessionId = data.sessionId;

    // Validate session ID
    if (!sessionManager.validateSessionId(this.sessionId)) {
      this.showInvalidLinkError();
      return;
    }

    this.createBackground();
    this.createUI();
  }

  private createBackground(): void {
    this.createGradientBackground();
  }

  private createUI(): void {
    const colors = themeManager.getColors();

    // Title
    this.titleText = this.add.text(this.centerX, 100, 'WELCOME TO ELEMENTAL CLASH', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: `#${colors.fire.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Welcome message
    this.welcomeText = this.add.text(this.centerX, 180, "You've been invited to play!", {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: `#${colors.text.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);

    // Prompt
    this.promptText = this.add.text(this.centerX, 230, 'Ready to battle, or need a quick tutorial?', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);

    // How to Play button
    this.tutorialButton = new Button(this, {
      x: this.centerX,
      y: 320,
      width: 250,
      height: 50,
      text: 'HOW TO PLAY',
      onClick: () => {
        this.handleTutorialClick();
      },
    });

    // Skip Tutorial button
    this.skipButton = new Button(this, {
      x: this.centerX,
      y: 390,
      width: 250,
      height: 50,
      text: 'SKIP TUTORIAL',
      onClick: () => {
        this.handleSkipClick();
      },
    });

    // Host player info (if we had player name, we'd show it here)
    const hostText = this.add.text(
      this.centerX,
      480,
      `Connecting to game session: ${this.sessionId}`,
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
      }
    ).setOrigin(0.5);
  }

  private handleTutorialClick(): void {
    // Go to tutorial with return context
    this.transitionTo(SceneKeys.TUTORIAL, {
      returnToMultiplayer: true,
      sessionId: this.sessionId,
    });
  }

  private handleSkipClick(): void {
    // Go directly to connecting scene (Phase 2: Use dynamic player name)
    this.transitionTo(SceneKeys.CONNECTING, {
      sessionId: this.sessionId,
      playerName: settingsManager.getPlayerName(),
    });
  }

  private showInvalidLinkError(): void {
    const colors = themeManager.getColors();

    // Create error UI
    this.createBackground();

    this.add.text(this.centerX, 200, 'INVALID INVITE LINK', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ff6b6b',  // Red
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(this.centerX, 270, 'This invite link is invalid or expired.', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: `#${colors.text.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);

    this.add.text(this.centerX, 310, 'Please check with your friend for a new link.', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);

    // Back to menu button
    new Button(this, {
      x: this.centerX,
      y: 400,
      width: 250,
      height: 50,
      text: 'BACK TO MENU',
      onClick: () => {
        this.transitionTo(SceneKeys.MENU);
      },
    });
  }

  shutdown(): void {
    if (this.tutorialButton) {
      this.tutorialButton.destroy();
    }
    if (this.skipButton) {
      this.skipButton.destroy();
    }
  }
}
