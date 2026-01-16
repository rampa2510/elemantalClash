import { BaseScene } from './BaseScene';
import { SceneKeys } from '../core/SceneKeys';
import { Button, Toast } from '../ui/components';
import { networkManager } from '../network/NetworkManager';
import { themeManager } from '../managers/ThemeManager';
import { gameEvents } from '../utils/EventEmitter';

interface ConnectingSceneData {
  sessionId: string;
  playerName: string;
}

/**
 * Connecting Scene - Connection handshake
 * Establishes P2P connection with host
 */
export class ConnectingScene extends BaseScene {
  private sessionId!: string;
  private playerName!: string;

  private titleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private spinner!: Phaser.GameObjects.Graphics;
  private spinnerRotation: number = 0;
  private retryButton: Button | null = null;
  private connectionTimeout: Phaser.Time.TimerEvent | null = null;

  // Event cleanup functions
  private cleanupConnectedListener?: () => void;
  private cleanupErrorListener?: () => void;

  constructor() {
    super({ key: SceneKeys.CONNECTING });
  }

  create(data?: ConnectingSceneData): void {
    super.create();

    if (!data) {
      console.error('ConnectingScene requires data');
      this.transitionTo(SceneKeys.MENU);
      return;
    }

    this.sessionId = data.sessionId;
    this.playerName = data.playerName;

    this.createBackground();
    this.createUI();
    this.startConnection();
  }

  private createBackground(): void {
    this.createGradientBackground();
  }

  private createUI(): void {
    const colors = themeManager.getColors();

    // Title
    this.titleText = this.add.text(this.centerX, 150, 'CONNECTING', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: `#${colors.fire.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Spinner
    this.createSpinner();

    // Status text
    this.statusText = this.add.text(this.centerX, 350, 'Initializing connection...', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: `#${colors.text.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
  }

  private createSpinner(): void {
    this.spinner = this.add.graphics();
    this.drawSpinner();

    // Animate spinner
    this.tweens.addCounter({
      from: 0,
      to: 360,
      duration: 1000,
      repeat: -1,
      onUpdate: (tween) => {
        this.spinnerRotation = tween.getValue() || 0;
        this.drawSpinner();
      },
    });
  }

  private drawSpinner(): void {
    const colors = themeManager.getColors();
    const x = this.centerX;
    const y = 260;
    const radius = 30;

    this.spinner.clear();

    // Draw arc
    this.spinner.lineStyle(4, colors.fire, 1);
    this.spinner.beginPath();
    this.spinner.arc(
      x,
      y,
      radius,
      Phaser.Math.DegToRad(this.spinnerRotation),
      Phaser.Math.DegToRad(this.spinnerRotation + 270),
      false
    );
    this.spinner.strokePath();
  }

  private async startConnection(): Promise<void> {
    try {
      // Step 1: Initializing connection
      this.updateStatus('Initializing connection...');

      // Listen for connection events BEFORE connecting
      const onConnected = () => {
        this.handleConnectionSuccess();
      };
      const onError = (event: any) => {
        this.handleConnectionError(event.payload?.error || 'Unknown error');
      };

      this.cleanupConnectedListener = gameEvents.on('NETWORK_CONNECTED', onConnected);
      this.cleanupErrorListener = gameEvents.on('NETWORK_ERROR', onError);

      // Set timeout (15 seconds)
      this.connectionTimeout = this.time.delayedCall(15000, () => {
        this.handleConnectionTimeout();
      });

      // Step 2: Finding opponent
      await this.delay(500);
      this.updateStatus('Finding opponent...');

      // Connect to host
      await networkManager.connectAsClient(this.sessionId);

      // Step 3: Establishing secure link
      this.updateStatus('Establishing secure link...');
      await this.delay(500);

      // Wait for connection acknowledgment
      await networkManager.waitForMessage('CONNECTION_ACK', 10000);

      // Send player info
      networkManager.send({
        type: 'PLAYER_INFO',
        payload: {
          playerId: 'player2',
          playerName: this.playerName,
        },
      });

      this.updateStatus('Connected!');
      await this.delay(500);

    } catch (error: any) {
      console.error('Connection error:', error);
      this.handleConnectionError(error.message || 'Connection failed');
    }
  }

  private handleConnectionSuccess(): void {
    // Clear timeout
    if (this.connectionTimeout) {
      this.connectionTimeout.remove();
      this.connectionTimeout = null;
    }

    const toast = new Toast(this);
    toast.success('Connected! Starting draft...');

    // Transition to draft
    this.time.delayedCall(1000, () => {
      this.transitionTo(SceneKeys.DRAFT, {
        isMultiplayer: true,
        sessionId: this.sessionId,
        playerId: 'player2',
        isHost: false,
      });
    });
  }

  private handleConnectionError(error: string): void {
    // Clear timeout
    if (this.connectionTimeout) {
      this.connectionTimeout.remove();
      this.connectionTimeout = null;
    }

    // Stop spinner
    this.tweens.killAll();

    // Update UI
    this.titleText.setText('CONNECTION FAILED');
    this.titleText.setColor('#ff6b6b');  // Red

    let errorMessage = 'Failed to connect to opponent';
    if (error.includes('not found') || error.includes('offline')) {
      errorMessage = 'Opponent is not available';
    } else if (error.includes('timeout') || error.includes('Timeout')) {
      errorMessage = 'Connection timeout';
    }

    this.statusText.setText(errorMessage);

    // Add retry and back buttons
    this.retryButton = new Button(this, {
      x: this.centerX - 130,
      y: 450,
      width: 120,
      height: 45,
      text: 'RETRY',
      onClick: () => {
        this.handleRetry();
      },
    });

    new Button(this, {
      x: this.centerX + 130,
      y: 450,
      width: 120,
      height: 45,
      text: 'BACK',
      onClick: () => {
        this.returnToMenu();
      },
    });
  }

  private handleConnectionTimeout(): void {
    this.handleConnectionError('Connection timeout');
  }

  private handleRetry(): void {
    // Clean up
    networkManager.disconnect();

    if (this.retryButton) {
      this.retryButton.destroy();
      this.retryButton = null;
    }

    // Restart scene
    this.scene.restart({
      sessionId: this.sessionId,
      playerName: this.playerName,
    });
  }

  private updateStatus(message: string): void {
    this.statusText.setText(message);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, () => resolve());
    });
  }

  private returnToMenu(): void {
    networkManager.disconnect();
    this.transitionTo(SceneKeys.MENU);
  }

  shutdown(): void {
    if (this.connectionTimeout) {
      this.connectionTimeout.remove();
      this.connectionTimeout = null;
    }

    this.tweens.killAll();

    if (this.retryButton) {
      this.retryButton.destroy();
      this.retryButton = null;
    }

    // Clean up event listeners
    if (this.cleanupConnectedListener) {
      this.cleanupConnectedListener();
      this.cleanupConnectedListener = undefined;
    }
    if (this.cleanupErrorListener) {
      this.cleanupErrorListener();
      this.cleanupErrorListener = undefined;
    }
  }
}
