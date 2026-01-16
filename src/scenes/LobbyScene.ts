import { BaseScene } from './BaseScene';
import { SceneKeys } from '../core/SceneKeys';
import { Button, Toast, TipCarousel, StatsDisplay, CardGallery } from '../ui/components';
import { networkManager } from '../network/NetworkManager';
import { sessionManager } from '../network/SessionManager';
import { themeManager } from '../managers/ThemeManager';
import { gameEvents } from '../utils/EventEmitter';
import { CONNECTION_TIMEOUT_MS } from '../config/constants';

interface LobbySceneData {
  sessionId: string;
  inviteLink: string;
  playerName: string;
}

/**
 * Lobby Scene - Host waiting room
 * Displays connection status while waiting for opponent
 */
export class LobbyScene extends BaseScene {
  private sessionId!: string;
  private inviteLink!: string;
  private playerName!: string;

  private titleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private sessionIdText!: Phaser.GameObjects.Text;
  private linkStatusText!: Phaser.GameObjects.Text;
  private connectionIndicator!: Phaser.GameObjects.Graphics;
  private cancelButton!: Button;

  private connectionTimeout: Phaser.Time.TimerEvent | null = null;
  private idleTimeout: Phaser.Time.TimerEvent | null = null; // Phase 4: Idle timeout after opponent joins
  private pulseAnimation: Phaser.Tweens.Tween | null = null;

  // Waiting room components
  private tipCarousel: TipCarousel | null = null;
  private statsDisplay: StatsDisplay | null = null;
  private cardGallery: CardGallery | null = null;

  // Event cleanup functions
  private cleanupOpponentJoinedListener?: () => void;
  private cleanupNetworkErrorListener?: () => void;
  private cleanupNetworkDisconnectedListener?: () => void;

  // Layout configuration - Bounding Box System
  private readonly LAYOUT = {
    // Screen parameters
    SCREEN_PADDING_TOP: 25,
    SCREEN_PADDING_BOTTOM: 25,
    COMPONENT_SPACING: 18,

    // Title
    TITLE_HEIGHT: 40,

    // Status section
    STATUS_MARGIN: 12,
    STATUS_HEIGHT: 85,

    // TipCarousel (compact mode dimensions)
    TIP_CAROUSEL_TITLE_OFFSET: 30,     // Title extends above center
    TIP_CAROUSEL_BG_HEIGHT: 80,         // Background height
    TIP_CAROUSEL_ACTUAL_HEIGHT: 110,    // Total occupied height (30 + 40 + 40)

    // StatsDisplay (compact mode dimensions)
    STATS_TITLE_OFFSET: 50,             // Title extends above center
    STATS_BG_HEIGHT: 120,                // Background height
    STATS_ACTUAL_HEIGHT: 170,            // Total occupied height (50 + 60 + 60)

    // Cancel button
    CANCEL_HEIGHT: 50,
  };

  constructor() {
    super({ key: SceneKeys.LOBBY });
  }

  create(data?: LobbySceneData): void {
    super.create();

    if (!data) {
      console.error('LobbyScene requires data');
      this.transitionTo(SceneKeys.MENU);
      return;
    }

    this.sessionId = data.sessionId;
    this.inviteLink = data.inviteLink;
    this.playerName = data.playerName;

    this.createBackground();
    this.createUI();
    this.setupNetworking();
    this.startConnectionTimeout();
  }

  private createBackground(): void {
    this.createGradientBackground();
  }

  private createUI(): void {
    const colors = themeManager.getColors();

    // ===== BOUNDING BOX LAYOUT SYSTEM =====
    // Calculate component positions top-to-bottom using actual bounds

    let currentY = this.LAYOUT.SCREEN_PADDING_TOP;

    // Title bounding box
    const titleBox = {
      top: currentY,
      height: this.LAYOUT.TITLE_HEIGHT,
      centerY: currentY + this.LAYOUT.TITLE_HEIGHT / 2,
      bottom: currentY + this.LAYOUT.TITLE_HEIGHT,
    };
    currentY = titleBox.bottom + this.LAYOUT.STATUS_MARGIN;

    // Status section bounding box
    const statusBox = {
      top: currentY,
      height: this.LAYOUT.STATUS_HEIGHT,
      bottom: currentY + this.LAYOUT.STATUS_HEIGHT,
    };
    currentY = statusBox.bottom + this.LAYOUT.COMPONENT_SPACING;

    // TipCarousel bounding box (accounts for internal offsets)
    const tipCarouselBox = {
      top: currentY,
      height: this.LAYOUT.TIP_CAROUSEL_ACTUAL_HEIGHT,
      // Container center = top + title_offset + bg_half_height
      centerY: currentY + this.LAYOUT.TIP_CAROUSEL_TITLE_OFFSET + this.LAYOUT.TIP_CAROUSEL_BG_HEIGHT / 2,
      bottom: currentY + this.LAYOUT.TIP_CAROUSEL_ACTUAL_HEIGHT,
    };
    currentY = tipCarouselBox.bottom + this.LAYOUT.COMPONENT_SPACING;

    // StatsDisplay bounding box (accounts for internal offsets)
    const statsBox = {
      top: currentY,
      height: this.LAYOUT.STATS_ACTUAL_HEIGHT,
      // Container center = top + title_offset + bg_half_height
      centerY: currentY + this.LAYOUT.STATS_TITLE_OFFSET + this.LAYOUT.STATS_BG_HEIGHT / 2,
      bottom: currentY + this.LAYOUT.STATS_ACTUAL_HEIGHT,
    };

    // Cancel button (bottom-anchored)
    const cancelBox = {
      height: this.LAYOUT.CANCEL_HEIGHT,
      bottom: this.screenHeight - this.LAYOUT.SCREEN_PADDING_BOTTOM,
      centerY: this.screenHeight - this.LAYOUT.SCREEN_PADDING_BOTTOM - this.LAYOUT.CANCEL_HEIGHT / 2,
      top: this.screenHeight - this.LAYOUT.SCREEN_PADDING_BOTTOM - this.LAYOUT.CANCEL_HEIGHT,
    };

    // Validation
    const totalContentHeight = statsBox.bottom + this.LAYOUT.COMPONENT_SPACING;
    console.log('📐 LobbyScene Bounding Box Layout:');
    console.log(`  Title: ${titleBox.top} to ${titleBox.bottom} (${titleBox.height}px)`);
    console.log(`  Status: ${statusBox.top} to ${statusBox.bottom} (${statusBox.height}px)`);
    console.log(`  TipCarousel: ${tipCarouselBox.top} to ${tipCarouselBox.bottom} (${tipCarouselBox.height}px, center at ${tipCarouselBox.centerY})`);
    console.log(`  StatsDisplay: ${statsBox.top} to ${statsBox.bottom} (${statsBox.height}px, center at ${statsBox.centerY})`);
    console.log(`  Cancel: ${cancelBox.top} to ${cancelBox.bottom} (${cancelBox.height}px)`);
    console.log(`  Total content height: ${totalContentHeight}px`);
    console.log(`  Available height: ${this.screenHeight}px`);
    console.log(`  Gap above cancel: ${cancelBox.top - statsBox.bottom}px`);

    if (totalContentHeight > cancelBox.top) {
      console.error(`⚠️ LAYOUT OVERFLOW: Content extends ${totalContentHeight - cancelBox.top}px beyond cancel button!`);
    } else {
      console.log(`✅ Layout fits with ${cancelBox.top - totalContentHeight}px margin`);
    }

    // ===== CREATE UI ELEMENTS =====

    // Title
    this.titleText = this.add.text(this.centerX, titleBox.centerY, 'WAITING FOR OPPONENT', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: `#${colors.fire.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Status texts (evenly spaced within statusBox)
    this.statusText = this.add.text(
      this.centerX,
      statusBox.top + 15,
      'Waiting for opponent to join...',
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: `#${colors.text.toString(16).padStart(6, '0')}`,
      }
    ).setOrigin(0.5);

    this.sessionIdText = this.add.text(
      this.centerX,
      statusBox.top + 42,
      `Session ID: ${this.sessionId}`,
      {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
      }
    ).setOrigin(0.5);

    this.linkStatusText = this.add.text(
      this.centerX,
      statusBox.top + 65,
      '✓ Invite link copied to clipboard',
      {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#51cf66',
      }
    ).setOrigin(0.5);

    // Connection indicator (left of status text)
    this.createConnectionIndicator(this.centerX - 160, statusBox.top + 15);

    // TipCarousel (COMPACT MODE)
    this.tipCarousel = new TipCarousel(
      this,
      this.centerX,
      tipCarouselBox.centerY,
      500,
      true  // compact mode
    );

    // StatsDisplay (COMPACT MODE)
    this.statsDisplay = new StatsDisplay(
      this,
      this.centerX,
      statsBox.centerY,
      500,
      true  // compact mode
    );

    // Cancel button
    this.cancelButton = new Button(this, {
      x: this.centerX,
      y: cancelBox.centerY,
      width: 200,
      height: this.LAYOUT.CANCEL_HEIGHT,
      text: 'CANCEL',
      onClick: () => this.handleCancel(),
    });

    // Card gallery (keep off-screen, as designed)
    this.cardGallery = new CardGallery(this, this.centerX, 800, 500, 200);
  }

  private createConnectionIndicator(x: number, y: number): void {
    // Create pulsing circle
    this.connectionIndicator = this.add.graphics();
    this.connectionIndicator.fillStyle(0x4dabf7, 1);  // Blue
    this.connectionIndicator.fillCircle(x, y, 8);

    // Pulse animation
    this.pulseAnimation = this.tweens.add({
      targets: this.connectionIndicator,
      alpha: { from: 1, to: 0.3 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private async setupNetworking(): Promise<void> {
    try {
      // Initialize as host
      await networkManager.initializeHost(this.sessionId);

      // Listen for opponent connection via game events
      const onOpponentJoined = () => {
        this.handleOpponentJoined();
      };
      const onNetworkError = (event: any) => {
        this.handleNetworkError(event.payload?.error || 'Unknown error');
      };
      const onNetworkDisconnected = () => {
        this.handleDisconnect();
      };

      this.cleanupOpponentJoinedListener = gameEvents.on('OPPONENT_JOINED', onOpponentJoined);
      this.cleanupNetworkErrorListener = gameEvents.on('NETWORK_ERROR', onNetworkError);
      this.cleanupNetworkDisconnectedListener = gameEvents.on('NETWORK_DISCONNECTED', onNetworkDisconnected);
    } catch (error) {
      console.error('Failed to initialize host:', error);
      const toast = new Toast(this);
      toast.error('Failed to create game session');
      this.time.delayedCall(2000, () => {
        this.returnToMenu();
      });
    }
  }

  private startConnectionTimeout(): void {
    // 60-second timeout
    this.connectionTimeout = this.time.delayedCall(CONNECTION_TIMEOUT_MS, () => {
      this.handleConnectionTimeout();
    });
  }

  private handleOpponentJoined(): void {
    // Stop connection timeout
    if (this.connectionTimeout) {
      this.connectionTimeout.remove();
      this.connectionTimeout = null;
    }

    // Phase 4: Start 5-minute idle timeout as safety measure
    this.idleTimeout = this.time.delayedCall(300000, () => {
      this.handleIdleTimeout();
    });

    // Update UI
    this.statusText.setText('Opponent connected!');
    this.statusText.setColor('#51cf66');  // Green

    const toast = new Toast(this);
    toast.success('Opponent joined! Starting draft...');

    // Transition to draft
    this.time.delayedCall(1500, () => {
      // Clear idle timeout before transition
      if (this.idleTimeout) {
        this.idleTimeout.remove();
        this.idleTimeout = null;
      }

      this.transitionTo(SceneKeys.DRAFT, {
        isMultiplayer: true,
        sessionId: this.sessionId,
        playerId: 'player1',
        isHost: true,
      });
    });
  }

  /**
   * Handle idle timeout (Phase 4)
   */
  private handleIdleTimeout(): void {
    const toast = new Toast(this);
    toast.error('Session expired due to inactivity');
    networkManager.disconnect();
    this.returnToMenu();
  }

  private handleConnectionTimeout(): void {
    const toast = new Toast(this);
    toast.error('Connection timeout. Opponent did not join');

    // Clean up network
    networkManager.disconnect();

    // Return to menu after 3 seconds
    this.time.delayedCall(3000, () => {
      this.returnToMenu();
    });
  }

  private handleNetworkError(error: string): void {
    const toast = new Toast(this);
    toast.error(`Network error: ${error}`);
  }

  private handleDisconnect(): void {
    const toast = new Toast(this);
    toast.warning('Opponent disconnected');

    this.time.delayedCall(2000, () => {
      this.returnToMenu();
    });
  }

  private handleCancel(): void {
    // Clean up network
    networkManager.disconnect();

    // Return to menu
    this.returnToMenu();
  }

  private returnToMenu(): void {
    this.transitionTo(SceneKeys.MENU);
  }

  shutdown(): void {
    // Clean up
    if (this.connectionTimeout) {
      this.connectionTimeout.remove();
      this.connectionTimeout = null;
    }

    // Phase 4: Clean up idle timeout
    if (this.idleTimeout) {
      this.idleTimeout.remove();
      this.idleTimeout = null;
    }

    if (this.pulseAnimation) {
      this.pulseAnimation.stop();
      this.pulseAnimation = null;
    }

    if (this.cancelButton) {
      this.cancelButton.destroy();
    }

    // Clean up waiting room components
    if (this.tipCarousel) {
      this.tipCarousel.destroy();
      this.tipCarousel = null;
    }
    if (this.statsDisplay) {
      this.statsDisplay.destroy();
      this.statsDisplay = null;
    }
    if (this.cardGallery) {
      this.cardGallery.destroy();
      this.cardGallery = null;
    }

    // Clean up event listeners
    if (this.cleanupOpponentJoinedListener) {
      this.cleanupOpponentJoinedListener();
      this.cleanupOpponentJoinedListener = undefined;
    }
    if (this.cleanupNetworkErrorListener) {
      this.cleanupNetworkErrorListener();
      this.cleanupNetworkErrorListener = undefined;
    }
    if (this.cleanupNetworkDisconnectedListener) {
      this.cleanupNetworkDisconnectedListener();
      this.cleanupNetworkDisconnectedListener = undefined;
    }
  }
}
