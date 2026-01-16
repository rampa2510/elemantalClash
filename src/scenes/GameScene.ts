import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT, TURN_TIMER_SECONDS, FONTS, FONT_SIZES, TIMING, MAX_ENERGY } from '../config/constants';
import { SceneKeys } from '../core/SceneKeys';
import { gameEngine } from '../core/GameEngine';
import { CardFactory } from '../core/CardFactory';
import { AIPlayer } from '../core/AIPlayer';
import { EnergySystem } from '../core/EnergySystem';
import { Card } from '../types/cards';
import { PlayerState } from '../types/player';
import { gameEvents } from '../utils/EventEmitter';
import { gameRandom } from '../utils/RandomGenerator';
import { HealthBar, CircularTimer, DamageNumber, Toast, ResourceBar } from '../ui/components';
import { AnimationManager } from '../ui/AnimationManager';
import { TapDebouncer } from '../utils/TapDebouncer';
import { VisibilityHandler } from '../utils/VisibilityHandler';
import { InputManager } from '../ui/InputManager';
import { statsManager } from '../utils/StatsManager';
import { settingsManager } from '../managers/SettingsManager';
import { audioManager } from '../audio';
import proceduralSFX from '../audio/ProceduralSFX';
import { musicManager } from '../audio/MusicManager';
import { PostFXPipeline } from '../shaders/PostFXPipeline';
import { ParticleManager } from '../effects/ParticleManager';
import { CameraFX } from '../effects/CameraFX';
import { AnimatedBackground } from '../effects/AnimatedBackground';
import { HitstopManager } from '../effects/HitstopManager';
import { ImpactOrchestrator } from '../effects/ImpactOrchestrator';
import { multiplayerCoordinator } from '../network/MultiplayerGameCoordinator';

interface GameSceneData {
  mode: 'quick' | 'draft' | 'multiplayer';
  player1Deck?: Card[];
  player2Deck?: Card[];
  isMultiplayer?: boolean;
  isHost?: boolean;
  sessionId?: string;
}

/**
 * Main gameplay scene - Player vs AI
 */
export class GameScene extends Phaser.Scene {
  private player1!: PlayerState;
  private player2!: PlayerState;
  private selectedCardIndex: number = -1;
  private aiPlayer!: AIPlayer;
  private isProcessingTurn: boolean = false;

  // UI Elements
  private handContainer!: Phaser.GameObjects.Container;
  private opponentHandContainer!: Phaser.GameObjects.Container;
  private p1StatusContainer!: Phaser.GameObjects.Container;
  private p2StatusContainer!: Phaser.GameObjects.Container;
  private turnText!: Phaser.GameObjects.Text;
  private playerIndicator!: Phaser.GameObjects.Text;

  // New UI Components
  private playerHealthBar!: HealthBar;
  private opponentHealthBar!: HealthBar;
  private playerResourceBar!: ResourceBar;
  private opponentResourceBar!: ResourceBar;
  private circularTimer!: CircularTimer;
  private damageNumber!: DamageNumber;
  private animationManager!: AnimationManager;

  // Track HP for damage display
  private lastPlayerHP: number = 0;
  private lastOpponentHP: number = 0;

  // Utility managers for bug prevention
  private tapDebouncer!: TapDebouncer;
  private visibilityHandler!: VisibilityHandler;
  private inputManager!: InputManager;
  private toast!: Toast;

  // Post-processing pipeline for AAA visual effects
  private postFX!: PostFXPipeline;

  // AAA Graphics Effects
  private particleManager!: ParticleManager;
  private cameraFX!: CameraFX;
  private animatedBackground!: AnimatedBackground;
  private hitstopManager!: HitstopManager;
  private impactOrchestrator!: ImpactOrchestrator;

  // Track critical HP mode to avoid repeated triggers
  private criticalModeActive: boolean = false;

  // AI thinking animation
  private aiThinkingContainer: Phaser.GameObjects.Container | null = null;
  private aiThinkingTween: Phaser.Tweens.Tween | null = null;

  // Player instruction pulse animation
  private instructionPulseTween: Phaser.Tweens.Tween | null = null;

  // Multiplayer mode
  private isMultiplayer: boolean = false;
  private isHost: boolean = false;
  private sessionId: string | null = null;
  private opponentStatusText: Phaser.GameObjects.Text | null = null;
  private eventCleanups: Array<() => void> = [];

  // Game statistics tracking for player (Issue #3 fix)
  private gameStats = {
    damageDealt: 0,
    wallsBuilt: 0,
    minersPlaced: 0,
  };
  private gameplayEventCleanups: Array<() => void> = []; // For non-multiplayer game events

  constructor() {
    super({ key: SceneKeys.GAME });
  }

  init(data: GameSceneData): void {
    // Check for multiplayer mode
    if (data.isMultiplayer && data.sessionId) {
      this.isMultiplayer = true;
      this.isHost = data.isHost ?? false;
      this.sessionId = data.sessionId;

      // Initialize multiplayer coordinator for gameplay phase
      multiplayerCoordinator.initializeGameplayPhase();

      // Start game in online mode (isHotSeat = false)
      if (data.player1Deck && data.player2Deck) {
        gameEngine.startGame('You', 'Opponent', data.player1Deck, data.player2Deck, false);
      }
    } else {
      // Single-player mode: Initialize AI player (Phase 3: Read difficulty from settings)
      const difficulty = settingsManager.getAIDifficulty();
      this.aiPlayer = new AIPlayer(difficulty);
      console.log(`🤖 AI difficulty: ${difficulty}`);

      // Initialize game based on mode
      if (data.mode === 'draft' && data.player1Deck && data.player2Deck) {
        gameEngine.startGame('You', 'AI', data.player1Deck, data.player2Deck, true);
      } else {
        gameEngine.startQuickGame('You', 'AI');
      }
    }

    const state = gameEngine.getGameState()!;
    this.player1 = state.player1;
    this.player2 = state.player2;
    this.selectedCardIndex = -1;
    this.isProcessingTurn = false;
  }

  create(): void {
    // Crossfade to gameplay music
    if (musicManager.getCurrentTrack() !== 'gameplay') {
      musicManager.crossfade('gameplay', 2);
    }

    // Initialize utility classes
    this.damageNumber = new DamageNumber(this);
    this.animationManager = new AnimationManager(this);
    this.tapDebouncer = new TapDebouncer(200);
    this.inputManager = new InputManager(this);
    this.toast = new Toast(this);

    // Initialize visibility handler for browser tab backgrounding
    // Track remaining time to properly resume timer
    let pausedTimeRemaining = 0;
    this.visibilityHandler = new VisibilityHandler();
    this.visibilityHandler.setCallbacks(
      () => {
        // Tab visible - resume timer with remaining time (not full duration)
        if (this.circularTimer && !this.isProcessingTurn && pausedTimeRemaining > 0) {
          this.circularTimer.start(pausedTimeRemaining, () => this.handleTimeout());
          pausedTimeRemaining = 0;
        }
      },
      () => {
        // Tab hidden - pause timer and store remaining time
        if (this.circularTimer && this.circularTimer.running) {
          pausedTimeRemaining = this.circularTimer.remaining;
          this.circularTimer.stop();
        }
      }
    );

    // Track initial HP
    this.lastPlayerHP = this.player1.stats.baseHP;
    this.lastOpponentHP = this.player2.stats.baseHP;

    // Initialize post-processing pipeline for AAA visual effects
    this.initializePostFX();

    // Initialize AAA graphics effects
    this.particleManager = new ParticleManager(this);
    this.cameraFX = new CameraFX(this);
    this.animatedBackground = new AnimatedBackground(this);
    this.animatedBackground.createAmbientParticles();

    // Initialize AAA "oomph factor" systems
    this.hitstopManager = new HitstopManager(this);
    this.impactOrchestrator = new ImpactOrchestrator(
      this,
      this.hitstopManager,
      this.cameraFX,
      this.particleManager,
      this.animatedBackground
    );

    this.createBackground();
    this.createUI();
    this.setupEventListeners();
    this.setupMultiplayerListeners();
    this.startTurn();
  }

  /**
   * Initialize post-processing effects pipeline
   */
  private initializePostFX(): void {
    try {
      // Apply the custom post-processing pipeline to the main camera
      this.cameras.main.setPostPipeline(PostFXPipeline);

      // Get reference to the pipeline for dynamic control
      const pipelines = this.cameras.main.getPostPipeline(PostFXPipeline);
      if (Array.isArray(pipelines)) {
        this.postFX = pipelines[0] as PostFXPipeline;
      } else {
        this.postFX = pipelines as PostFXPipeline;
      }

      // Set default ambient effects
      if (this.postFX) {
        this.postFX.setVignette(0.3);  // Subtle edge darkening for focus
        this.postFX.setBloom(0.05);    // Tiny bit of glow
      }
    } catch (error) {
      console.warn('PostFX Pipeline not available (WebGL required):', error);
    }
  }

  /**
   * Trigger impact visual effect (bloom + chromatic aberration)
   */
  private triggerImpactFX(intensity: number): void {
    if (!this.postFX) return;

    // Flash bloom and chromatic aberration
    this.postFX.setBloom(0.6 * intensity);
    this.postFX.setChromatic(0.4 * intensity);

    // Fade back to normal over 300ms
    this.tweens.addCounter({
      from: 1,
      to: 0,
      duration: 300,
      ease: 'Power2',
      onUpdate: (tween) => {
        const value = tween.getValue() ?? 0;
        this.postFX.setBloom(0.05 + (0.55 * intensity * value));
        this.postFX.setChromatic(0.4 * intensity * value);
      },
    });
  }

  /**
   * Trigger critical HP warning visual effect
   */
  private triggerCriticalFX(): void {
    if (!this.postFX) return;

    // Red tint pulsing effect
    this.tweens.add({
      targets: { intensity: 0 },
      intensity: 1,
      duration: 500,
      yoyo: true,
      repeat: 1,
      onUpdate: (tween, target) => {
        const i = target.intensity;
        this.postFX.setColorTint(1 + i * 0.15, 1 - i * 0.1, 1 - i * 0.1);
        this.postFX.setVignette(0.3 + i * 0.2);
      },
      onComplete: () => {
        this.postFX.setColorTint(1, 1, 1);
        this.postFX.setVignette(0.3);
      },
    });
  }

  /**
   * Show AI thinking indicator with animated ellipsis
   */
  private showAIThinking(): void {
    // Clean up any existing indicator
    this.hideAIThinking();

    // Create container above opponent hand area
    const x = GAME_WIDTH / 2;
    const y = 180;
    this.aiThinkingContainer = this.add.container(x, y).setDepth(50);

    // Background pill
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(-50, -15, 100, 30, 15);
    this.aiThinkingContainer.add(bg);

    // "AI" text
    const aiText = this.add.text(-25, 0, 'AI', {
      fontFamily: FONTS.family,
      fontSize: '14px',
      color: '#ffd43b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.aiThinkingContainer.add(aiText);

    // Animated ellipsis dots
    const dots: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < 3; i++) {
      const dot = this.add.text(5 + i * 10, 0, '.', {
        fontFamily: FONTS.family,
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0.3);
      dots.push(dot);
      this.aiThinkingContainer.add(dot);
    }

    // Animate dots sequentially
    let dotIndex = 0;
    this.aiThinkingTween = this.tweens.add({
      targets: {},
      duration: 400,
      repeat: -1,
      onRepeat: () => {
        // Reset all dots
        dots.forEach(d => d.setAlpha(0.3));
        // Highlight current dot
        dots[dotIndex].setAlpha(1);
        dotIndex = (dotIndex + 1) % 3;
      },
    });

    // Fade in
    this.aiThinkingContainer.setAlpha(0);
    this.tweens.add({
      targets: this.aiThinkingContainer,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });
  }

  /**
   * Hide AI thinking indicator
   */
  private hideAIThinking(): void {
    if (this.aiThinkingTween) {
      this.aiThinkingTween.stop();
      this.aiThinkingTween = null;
    }
    if (this.aiThinkingContainer) {
      this.aiThinkingContainer.destroy();
      this.aiThinkingContainer = null;
    }
  }

  /**
   * Start pulsing animation on player instruction text
   */
  private startInstructionPulse(): void {
    // Stop any existing pulse
    this.stopInstructionPulse();

    if (!this.playerIndicator) return;

    // Alpha oscillation for "waiting" feel
    this.instructionPulseTween = this.tweens.add({
      targets: this.playerIndicator,
      alpha: { from: 1, to: 0.5 },
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Stop instruction pulse animation
   */
  private stopInstructionPulse(): void {
    if (this.instructionPulseTween) {
      this.instructionPulseTween.stop();
      this.instructionPulseTween = null;
    }
    if (this.playerIndicator) {
      this.playerIndicator.setAlpha(1);
    }
  }

  /**
   * Phaser update loop - called every frame
   */
  update(time: number, delta: number): void {
    // Update animated background
    if (this.animatedBackground) {
      this.animatedBackground.update(delta);
    }
  }

  private createBackground(): void {
    // The AnimatedBackground handles the main background rendering
    // We just need to add the dividing line with glow
    this.animatedBackground.createDividingLine();
  }

  private createUI(): void {
    // Opponent area (top)
    this.createOpponentArea();

    // Center area (timer, turn info)
    this.createCenterArea();

    // Player area (bottom)
    this.createPlayerArea();
  }

  private createOpponentArea(): void {
    this.p2StatusContainer = this.add.container(0, 0);
    this.opponentHandContainer = this.add.container(0, 0);

    // Status bar label
    this.add.text(20, 20, 'OPPONENT', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#b8c5d6',
    });

    // Create animated health bar for opponent
    this.opponentHealthBar = new HealthBar(this, {
      x: 100,
      y: 42,
      width: 150,
      height: 22,
      maxHealth: this.player2.stats.maxHP,
      healthColor: COLORS.healthBar,
    });

    // Create resource bar for opponent (vertically separated from wall/miner indicators)
    this.opponentResourceBar = new ResourceBar(this, {
      x: 480,
      y: 75,
      maxResources: MAX_ENERGY,
    });

    // Issue #19 fix: Create opponent status text for multiplayer
    // Shows "Selecting...", "Ready ✓", etc.
    if (this.isMultiplayer) {
      this.opponentStatusText = this.add.text(GAME_WIDTH / 2, 120, '', {
        fontFamily: FONTS.family,
        fontSize: `${FONT_SIZES.md}px`,
        color: '#ffd43b',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(100);
    }

    this.updateOpponentStatus();
    this.updateOpponentHand();
  }

  private createCenterArea(): void {
    // Turn indicator (moved to left side to avoid timer overlap)
    this.turnText = this.add.text(100, GAME_HEIGHT / 2, 'TURN 1', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Circular Timer (replaces text timer)
    this.circularTimer = new CircularTimer(this, {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2 - 100,
      radius: 35,
      thickness: 6,
      duration: TURN_TIMER_SECONDS * 1000,
      warningThreshold: 3000,
    });

    // Instructions
    this.playerIndicator = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'TAP A CARD TO PLAY', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffd43b',
    }).setOrigin(0.5);
  }

  private createPlayerArea(): void {
    this.p1StatusContainer = this.add.container(0, 0);
    this.handContainer = this.add.container(0, 0);

    // Status bar label
    this.add.text(20, GAME_HEIGHT - 100, 'YOU', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#b8c5d6',
    });

    // Create animated health bar
    this.playerHealthBar = new HealthBar(this, {
      x: 100,
      y: GAME_HEIGHT - 80,
      width: 150,
      height: 22,
      maxHealth: this.player1.stats.maxHP,
      healthColor: COLORS.healthBar,
    });

    // Create resource bar for player (vertically separated from wall/miner indicators)
    this.playerResourceBar = new ResourceBar(this, {
      x: 480,
      y: GAME_HEIGHT - 45,
      maxResources: MAX_ENERGY,
    });

    this.updatePlayerStatus();
    this.updatePlayerHand();
  }


  private updatePlayerStatus(): void {
    this.p1StatusContainer.removeAll(true);

    const player = this.getCurrentPlayerState();
    const y = GAME_HEIGHT - 75;

    // Update animated health bar (with damage popup)
    if (this.playerHealthBar) {
      const currentHP = player.stats.baseHP;
      const hpDiff = this.lastPlayerHP - currentHP;

      if (hpDiff > 0) {
        // Show damage popup
        this.damageNumber.show(175, GAME_HEIGHT - 90, hpDiff, hpDiff >= 5);
        this.animationManager.shakeScreen(0.008, 150);
      } else if (hpDiff < 0) {
        // Show healing popup
        this.damageNumber.showHeal(175, GAME_HEIGHT - 90, Math.abs(hpDiff));
      }

      this.playerHealthBar.setHealth(currentHP);
      this.lastPlayerHP = currentHP;
    }

    // Update resource bar with animation
    if (this.playerResourceBar) {
      const turnNumber = gameEngine.getTurnNumber();
      this.playerResourceBar.setResources(
        player.stats.energy,
        true, // animated
        turnNumber
      );
    }

    // Wall indicator
    if (player.field.wall) {
      const wallText = this.add.text(420, y, `🛡️ Wall: ${player.field.wall.currentHP}/${player.field.wall.maxHP}`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
      });
      this.p1StatusContainer.add(wallText);
    }

    // Miner indicator
    if (player.field.miner) {
      const minerText = this.add.text(550, y, `⛏️ Miner: ${player.field.miner.turnsUntilPayout} turns`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
      });
      this.p1StatusContainer.add(minerText);
    }
  }

  private updateOpponentStatus(): void {
    this.p2StatusContainer.removeAll(true);

    const opponent = this.getOpponentState();
    const y = 45;

    // Update animated health bar (with damage popup)
    if (this.opponentHealthBar) {
      const currentHP = opponent.stats.baseHP;
      const hpDiff = this.lastOpponentHP - currentHP;

      if (hpDiff > 0) {
        // Show damage popup on opponent
        this.damageNumber.show(175, 30, hpDiff, hpDiff >= 5);
        this.animationManager.shakeScreen(0.005, 100);
      } else if (hpDiff < 0) {
        // Show healing popup
        this.damageNumber.showHeal(175, 30, Math.abs(hpDiff));
      }

      this.opponentHealthBar.setHealth(currentHP);
      this.lastOpponentHP = currentHP;
    }

    // Update resource bar with animation
    if (this.opponentResourceBar) {
      const turnNumber = gameEngine.getTurnNumber();
      this.opponentResourceBar.setResources(
        opponent.stats.energy,
        true, // animated
        turnNumber
      );
    }

    // Wall indicator
    if (opponent.field.wall) {
      const wallText = this.add.text(420, y, `🛡️ Wall: ${opponent.field.wall.currentHP}/${opponent.field.wall.maxHP}`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
      });
      this.p2StatusContainer.add(wallText);
    }

    // Miner indicator
    if (opponent.field.miner) {
      const minerText = this.add.text(550, y, `⛏️ Miner: ${opponent.field.miner.turnsUntilPayout} turns`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
      });
      this.p2StatusContainer.add(minerText);
    }
  }

  private createStatusBar(x: number, y: number, width: number, height: number, current: number, max: number, color: number, label: string): void {
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.healthBarBg, 1);
    bg.fillRoundedRect(x, y, width, height, 4);
    this.p1StatusContainer.add(bg);

    // Fill
    const fillWidth = (current / max) * width;
    const fill = this.add.graphics();
    fill.fillStyle(color, 1);
    fill.fillRoundedRect(x, y, fillWidth, height, 4);
    this.p1StatusContainer.add(fill);

    // Text
    const text = this.add.text(x + width / 2, y + height / 2, `${current}/${max}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.p1StatusContainer.add(text);
  }

  private createOpponentStatusBar(x: number, y: number, width: number, height: number, current: number, max: number, color: number, label: string): void {
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.healthBarBg, 1);
    bg.fillRoundedRect(x, y, width, height, 4);
    this.p2StatusContainer.add(bg);

    // Fill
    const fillWidth = (current / max) * width;
    const fill = this.add.graphics();
    fill.fillStyle(color, 1);
    fill.fillRoundedRect(x, y, fillWidth, height, 4);
    this.p2StatusContainer.add(fill);

    // Text
    const text = this.add.text(x + width / 2, y + height / 2, `${current}/${max}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.p2StatusContainer.add(text);
  }

  private updatePlayerHand(): void {
    this.handContainer.removeAll(true);

    const player = this.getCurrentPlayerState();
    const hand = player.hand;

    // Size cards to fit 6 cards comfortably
    const cardWidth = 110;
    const cardHeight = 150;
    const spacing = 10;
    const totalWidth = hand.length * cardWidth + (hand.length - 1) * spacing;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    const y = GAME_HEIGHT - 175;

    hand.forEach((card, index) => {
      const x = startX + index * (cardWidth + spacing) + cardWidth / 2;
      this.createPlayerCard(x, y, card, cardWidth, cardHeight, index);
    });
  }

  private updateOpponentHand(): void {
    this.opponentHandContainer.removeAll(true);

    const opponent = this.getOpponentState();
    const cardCount = opponent.hand.length;

    // Size to fit 6 card backs
    const cardWidth = 60;
    const cardHeight = 80;
    const spacing = 8;
    const totalWidth = cardCount * cardWidth + (cardCount - 1) * spacing;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    const y = 115;

    for (let i = 0; i < cardCount; i++) {
      const x = startX + i * (cardWidth + spacing) + cardWidth / 2;
      this.createOpponentCard(x, y, cardWidth, cardHeight);
    }
  }

  private createPlayerCard(x: number, y: number, card: Card, width: number, height: number, index: number): void {
    const container = this.add.container(x, y);
    const baseY = y;

    const isSelected = index === this.selectedCardIndex;
    const player = this.getCurrentPlayerState();
    // Check if card is playable (includes energy AND singleton restrictions)
    const playableCards = EnergySystem.getPlayableCards(player);
    const isPlayable = playableCards.some(c => c.id === card.id);
    const canAfford = isPlayable; // Use full playability check
    const color = this.getElementColor(card.element);

    // Shadow layer (for depth)
    const shadowGraphics = this.add.graphics();
    if (canAfford) {
      shadowGraphics.fillStyle(0x000000, 0.2);
      shadowGraphics.fillRoundedRect(-width / 2 + 2, -height / 2 + 3, width, height, 8);
    }
    container.add(shadowGraphics);

    // Card background
    const bg = this.add.graphics();

    if (!canAfford) {
      // Desaturated disabled appearance
      bg.fillStyle(0x2a2a3a, 0.7);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
      bg.lineStyle(2, 0x555555, 0.5);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    } else {
      bg.fillStyle(COLORS.cardBg, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
      if (isSelected) {
        bg.lineStyle(4, COLORS.energyBar, 1);
      } else {
        bg.lineStyle(2, color, 1);
      }
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    }
    container.add(bg);

    // Element bar
    const elementBar = this.add.graphics();
    elementBar.fillStyle(color, canAfford ? 1 : 0.3);
    elementBar.fillRect(-width / 2 + 3, -height / 2 + 3, width - 6, 20);
    container.add(elementBar);

    // Name
    const name = this.add.text(0, -height / 2 + 13, card.name, {
      fontFamily: FONTS.family,
      fontSize: '11px',
      color: canAfford ? '#ffffff' : '#888888',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(name);

    // Type icon
    const typeText = this.add.text(0, -15, this.getTypeSymbol(card.type), {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: canAfford ? '#ffffff' : '#555555',
    }).setOrigin(0.5);
    container.add(typeText);

    // Cost
    const costBg = this.add.graphics();
    costBg.fillStyle(COLORS.energyBar, canAfford ? 1 : 0.3);
    costBg.fillCircle(-width / 2 + 15, height / 2 - 15, 12);
    container.add(costBg);

    const costText = this.add.text(-width / 2 + 15, height / 2 - 15, `${card.cost}`, {
      fontFamily: FONTS.family,
      fontSize: '12px',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(costText);

    // Power
    if (card.power > 0) {
      const powerText = this.add.text(width / 2 - 15, height / 2 - 15, `${card.power}`, {
        fontFamily: FONTS.family,
        fontSize: '14px',
        color: canAfford ? '#ff6b6b' : '#884444',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(powerText);
    }

    // Short description (truncated to fit)
    const shortDesc = this.getShortDescription(card);
    const descText = this.add.text(0, 25, shortDesc, {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: canAfford ? '#b8c5d6' : '#666666',
      align: 'center',
      wordWrap: { width: width - 12 },
    }).setOrigin(0.5, 0);
    container.add(descText);

    // Make interactive if can afford
    if (canAfford) {
      const zone = this.add.zone(0, 0, width, height).setInteractive({ useHandCursor: true });
      container.add(zone);

      zone.on('pointerover', () => {
        // Play hover sound
        audioManager.play('cardHover');

        // Magnetic lift effect
        this.tweens.add({
          targets: container,
          y: baseY - 8,
          duration: TIMING.normal,
          ease: 'Power2',
        });

        // Expand shadow
        shadowGraphics.clear();
        shadowGraphics.fillStyle(0x000000, 0.25);
        shadowGraphics.fillRoundedRect(-width / 2 + 3, -height / 2 + 8, width, height, 8);
        shadowGraphics.fillStyle(0x000000, 0.15);
        shadowGraphics.fillRoundedRect(-width / 2 + 1, -height / 2 + 4, width, height, 8);

        // Highlight border
        bg.clear();
        bg.fillStyle(0x3d3d54, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        bg.lineStyle(3, COLORS.energyBar, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
      });

      zone.on('pointerout', () => {
        // Return to base position
        this.tweens.add({
          targets: container,
          y: baseY,
          scaleX: 1,
          scaleY: 1,
          duration: TIMING.normal,
          ease: 'Power2',
        });

        // Reset shadow
        shadowGraphics.clear();
        shadowGraphics.fillStyle(0x000000, 0.2);
        shadowGraphics.fillRoundedRect(-width / 2 + 2, -height / 2 + 3, width, height, 8);

        // Reset background
        bg.clear();
        bg.fillStyle(COLORS.cardBg, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        bg.lineStyle(2, color, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
      });

      zone.on('pointerdown', () => {
        // Press effect
        this.tweens.add({
          targets: container,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: TIMING.instant,
          ease: 'Power2',
        });

        // Compressed shadow
        shadowGraphics.clear();
        shadowGraphics.fillStyle(0x000000, 0.3);
        shadowGraphics.fillRoundedRect(-width / 2 + 1, -height / 2 + 1, width, height, 8);
      });

      zone.on('pointerup', () => {
        // Bounce and select
        this.tweens.add({
          targets: container,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: TIMING.fast,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.selectCard(index);
          },
        });
      });
    }

    this.handContainer.add(container);
  }

  private createOpponentCard(x: number, y: number, width: number, height: number): void {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x4a4a5a, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    bg.lineStyle(2, COLORS.text, 0.3);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
    container.add(bg);

    const question = this.add.text(0, 0, '?', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#666666',
    }).setOrigin(0.5);
    container.add(question);

    this.opponentHandContainer.add(container);
  }

  private selectCard(index: number): void {
    // Prevent selecting while processing
    if (this.isProcessingTurn) return;

    // Debounce rapid taps
    if (!this.tapDebouncer.canTap()) return;

    // Lock input during card selection
    if (this.inputManager.isLocked) return;

    // Select the card
    this.selectedCardIndex = index;
    this.player1.selectedCard = this.player1.hand[index];

    // 🎵 Play satisfying card selection sound with element-colored chime
    const element = this.player1.hand[index]?.element || 'fire';
    proceduralSFX.cardPlay(element);

    // Multiplayer: broadcast card selection, then lock
    if (this.isMultiplayer) {
      const cardInstanceId = `card_${index}`; // Simple ID for network sync
      multiplayerCoordinator.broadcastCardSelection(cardInstanceId);
      multiplayerCoordinator.broadcastCardLock(this.player1.selectedCard as any); // Will be refined
      return; // Wait for both players to lock
    }

    // Single-player: Auto-lock and resolve turn
    this.playTurn();
  }

  private playTurn(): void {
    if (this.isProcessingTurn) return;
    this.isProcessingTurn = true;
    this.stopTimer();
    this.stopInstructionPulse();

    // Reset turn summary before collecting new events
    this.resetTurnSummary();

    // Lock input during animation phase
    this.inputManager.lock('turn-resolution');

    // Capture cards BEFORE lockIn (resolution clears them)
    const playerCard = this.player1.selectedCard;

    // Show AI thinking indicator (animated ellipsis)
    this.showAIThinking();

    // AI chooses card with simulated thinking delay
    const thinkingDelay = 500 + Math.random() * 1000; // 500-1500ms thinking time

    this.time.delayedCall(thinkingDelay, () => {
      // Hide AI thinking indicator
      this.hideAIThinking();

      const aiCard = this.aiPlayer.chooseCard(this.player2, this.player1);
      this.player2.selectedCard = aiCard;

      // Issue #3 fix: Track walls and miners played by player (single-player mode)
      if (playerCard && playerCard.subtype === 'wall') {
        this.gameStats.wallsBuilt++;
      }
      if (playerCard && playerCard.type === 'miner') {
        this.gameStats.minersPlaced++;
      }

      // Lock in both players (this triggers resolution)
      gameEngine.lockIn('player1');
      gameEngine.lockIn('player2');

      // Show resolution with captured cards
      this.showTurnResolution(playerCard, aiCard);
    });
  }

  /**
   * Resolve turn in multiplayer mode (called by host when both players locked)
   */
  private resolveTurn(): void {
    if (!this.isHost) {
      console.warn('[GameScene] resolveTurn called on client - should only be called on host');
      return;
    }

    // Capture cards before resolution
    const playerCard = this.player1.selectedCard;
    const opponentCard = this.player2.selectedCard;

    // Validate both players have selected cards
    if (!playerCard || !opponentCard) {
      console.error('[GameScene] Cannot resolve - missing card selections', {
        playerCard,
        opponentCard,
      });
      return;
    }

    // Issue #3 fix: Track walls and miners played by player
    if (playerCard.subtype === 'wall') {
      this.gameStats.wallsBuilt++;
    }
    if (playerCard.type === 'miner') {
      this.gameStats.minersPlaced++;
    }

    // Lock in both players (triggers game engine resolution)
    gameEngine.lockIn('player1');
    gameEngine.lockIn('player2');

    // Get updated state
    const state = gameEngine.getGameState();
    if (state) {
      // Broadcast state update to client
      multiplayerCoordinator.broadcastStateUpdate(state);
    }

    // Show resolution
    this.showTurnResolution(playerCard, opponentCard);

    // Reset for next turn
    multiplayerCoordinator.resetTurnState();
  }

  private showTurnResolution(playerCard: Card | null, aiCard: Card | null): void {
    // Create a container to hold all overlay elements (easy cleanup)
    const overlayContainer = this.add.container(0, 0).setDepth(100);

    // Background overlay with fade in
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.9);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setAlpha(0);
    overlayContainer.add(overlay);

    // Fade in overlay
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: TIMING.slow,
      ease: 'Power2',
    });

    // Your label
    const youLabel = this.add.text(GAME_WIDTH / 4, GAME_HEIGHT / 2 - 100, 'YOU', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.sm}px`,
      color: '#b8c5d6',
    }).setOrigin(0.5);
    overlayContainer.add(youLabel);

    // VS with pulsing effect
    const vsText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'VS', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.xxl}px`,
      color: '#ffd43b',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScale(0);
    overlayContainer.add(vsText);

    // VS pop-in animation
    this.tweens.add({
      targets: vsText,
      scaleX: 1,
      scaleY: 1,
      duration: TIMING.slow,
      delay: TIMING.normal,
      ease: 'Back.easeOut',
    });

    // AI label
    const aiLabel = this.add.text((GAME_WIDTH / 4) * 3, GAME_HEIGHT / 2 - 100, 'AI', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.sm}px`,
      color: '#b8c5d6',
    }).setOrigin(0.5);
    overlayContainer.add(aiLabel);

    // Create card backs first (face-down state)
    const playerCardBack = this.createCardBack(GAME_WIDTH / 4, GAME_HEIGHT / 2);
    const aiCardBack = this.createCardBack((GAME_WIDTH / 4) * 3, GAME_HEIGHT / 2);
    overlayContainer.add(playerCardBack);
    overlayContainer.add(aiCardBack);

    // Create card fronts (hidden initially)
    const playerCardFront = this.createResolutionCard(GAME_WIDTH / 4, GAME_HEIGHT / 2, playerCard);
    const aiCardFront = this.createResolutionCard((GAME_WIDTH / 4) * 3, GAME_HEIGHT / 2, aiCard);
    playerCardFront.setScale(0, 1);
    aiCardFront.setScale(0, 1);
    overlayContainer.add(playerCardFront);
    overlayContainer.add(aiCardFront);

    // Dramatic pause before reveal (tension building)
    const tensionDelay = 400;

    // Camera slight zoom for drama
    this.cameras.main.zoomTo(1.03, TIMING.slow);

    // 2-phase flip animation for player card (slower, more dramatic)
    this.tweens.add({
      targets: playerCardBack,
      scaleX: 0,
      duration: TIMING.slow,
      ease: 'Quad.easeIn',
      delay: tensionDelay,
      onComplete: () => {
        playerCardBack.setVisible(false);
        // Phase 2: Scale up the front with slight bounce
        this.tweens.add({
          targets: playerCardFront,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: TIMING.slow,
          ease: 'Back.easeOut',
          onComplete: () => {
            // Settle to normal scale
            this.tweens.add({
              targets: playerCardFront,
              scaleX: 1,
              scaleY: 1,
              duration: TIMING.fast,
              ease: 'Power2',
            });
            // Dramatic element reveal effect
            if (playerCard) {
              this.animationManager.createDramaticElementReveal(GAME_WIDTH / 4, GAME_HEIGHT / 2, playerCard.element);
              // Enhanced particle reveal
              this.particleManager.createElementReveal(GAME_WIDTH / 4, GAME_HEIGHT / 2, playerCard.element);
              // Camera punch for impact
              this.cameraFX.punch(0.3, 150);
            }
          },
        });
      },
    });

    // 2-phase flip animation for AI card (delayed, same dramatic timing)
    this.tweens.add({
      targets: aiCardBack,
      scaleX: 0,
      duration: TIMING.slow,
      ease: 'Quad.easeIn',
      delay: tensionDelay + 500,
      onComplete: () => {
        aiCardBack.setVisible(false);
        this.tweens.add({
          targets: aiCardFront,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: TIMING.slow,
          ease: 'Back.easeOut',
          onComplete: () => {
            // Settle to normal scale
            this.tweens.add({
              targets: aiCardFront,
              scaleX: 1,
              scaleY: 1,
              duration: TIMING.fast,
              ease: 'Power2',
            });
            // Dramatic element reveal effect
            if (aiCard) {
              this.animationManager.createDramaticElementReveal((GAME_WIDTH / 4) * 3, GAME_HEIGHT / 2, aiCard.element);
              // Enhanced particle reveal
              this.particleManager.createElementReveal((GAME_WIDTH / 4) * 3, GAME_HEIGHT / 2, aiCard.element);
              // Camera punch for impact
              this.cameraFX.punch(0.3, 150);
            }
          },
        });
      },
    });

    // After delay, clean up and continue (longer for dramatic effect)
    this.time.delayedCall(3000, () => {
      // Reset camera zoom
      this.cameras.main.zoomTo(1, TIMING.normal);

      // Destroy the entire container (removes all children too)
      overlayContainer.destroy();

      // Unlock input after resolution
      this.inputManager.unlock('turn-resolution');
      this.tapDebouncer.reset();

      if (gameEngine.isGameOver()) {
        // Medium Bug #11 fix: Record game stats
        const winner = gameEngine.getWinner();
        const didPlayerWin = winner === this.player1.id;

        // Issue #3 fix: Pass accumulated game statistics
        statsManager.recordGame({
          won: didPlayerWin,
          damageDealt: this.gameStats.damageDealt,
          wallsBuilt: this.gameStats.wallsBuilt,
          minersPlaced: this.gameStats.minersPlaced,
        });

        // Fade transition to game over
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once(
          Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
          () => {
            this.scene.start(SceneKeys.GAME_OVER, {
              winner: winner,
              isDoubleKO: gameEngine.isDoubleKO(),
              player1HP: this.player1.stats.baseHP,
              player2HP: this.player2.stats.baseHP,
              fadeIn: true,
            });
          }
        );
      } else {
        // Show turn summary feedback
        this.showTurnSummary();

        // Reset for next turn
        this.selectedCardIndex = -1;
        this.isProcessingTurn = false;
        this.updateUI();
        this.startTurn();
      }
    });
  }

  /**
   * Create a visual card for resolution display
   */
  private createResolutionCard(x: number, y: number, card: Card | null): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const width = 100;
    const height = 140;

    if (card) {
      // Card background
      const bg = this.add.graphics();
      const color = this.getElementColor(card.element);
      bg.fillStyle(COLORS.cardBg, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
      bg.lineStyle(3, color, 1);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
      container.add(bg);

      // Element bar
      const elementBar = this.add.graphics();
      elementBar.fillStyle(color, 1);
      elementBar.fillRect(-width / 2 + 4, -height / 2 + 4, width - 8, 22);
      container.add(elementBar);

      // Card name
      const name = this.add.text(0, -height / 2 + 15, card.name, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(name);

      // Type icon
      const typeText = this.add.text(0, 0, this.getTypeSymbol(card.type), {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#ffffff',
      }).setOrigin(0.5);
      container.add(typeText);

      // Cost
      const costBg = this.add.graphics();
      costBg.fillStyle(COLORS.energyBar, 1);
      costBg.fillCircle(-width / 2 + 18, height / 2 - 18, 14);
      container.add(costBg);

      const costText = this.add.text(-width / 2 + 18, height / 2 - 18, `${card.cost}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#000000',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(costText);

      // Power
      if (card.power > 0) {
        const powerText = this.add.text(width / 2 - 18, height / 2 - 18, `${card.power}`, {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#ff6b6b',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        container.add(powerText);
      }
    } else {
      // PASS card (no card played)
      const bg = this.add.graphics();
      bg.fillStyle(0x333333, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
      bg.lineStyle(2, 0x666666, 1);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
      container.add(bg);

      const passText = this.add.text(0, 0, 'PASS', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#999999',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(passText);
    }

    return container;
  }

  /**
   * Create a card back (face-down) for flip animation
   */
  private createCardBack(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const width = 100;
    const height = 140;

    // Card back background
    const bg = this.add.graphics();
    bg.fillStyle(0x4a4a5a, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(3, 0x666666, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    container.add(bg);

    // Pattern on card back
    const pattern = this.add.graphics();
    pattern.lineStyle(1, 0x5a5a6a, 0.5);
    for (let i = -width / 2 + 10; i < width / 2; i += 15) {
      pattern.lineBetween(i, -height / 2 + 10, i + 30, height / 2 - 10);
    }
    container.add(pattern);

    // Question mark
    const question = this.add.text(0, 0, '?', {
      fontFamily: 'Arial',
      fontSize: '36px',
      color: '#666666',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(question);

    return container;
  }

  private startTurn(): void {
    // Refresh player state references from game engine
    const state = gameEngine.getGameState();
    if (state) {
      this.player1 = state.player1;
      this.player2 = state.player2;
    }

    this.turnText.setText(`TURN ${gameEngine.getTurnNumber()}`);
    this.updateUI();
    this.startTimer();

    // Start instruction pulse animation
    this.startInstructionPulse();

    // Clear opponent status at start of turn (multiplayer)
    if (this.isMultiplayer) {
      this.updateOpponentCardStatus('');
    }
  }

  private startTimer(): void {
    // Use CircularTimer instead of text timer
    this.circularTimer.start(TURN_TIMER_SECONDS * 1000, () => {
      this.handleTimeout();
    });
  }

  private stopTimer(): void {
    if (this.circularTimer) {
      this.circularTimer.stop();
    }
  }

  private handleTimeout(): void {
    if (this.isProcessingTurn) return;

    // Auto-select a random playable card
    const playable = EnergySystem.getPlayableCards(this.player1);
    if (playable.length > 0) {
      const randomCard = gameRandom.pick(playable);
      const index = this.player1.hand.indexOf(randomCard);
      if (index >= 0) {
        this.selectedCardIndex = index;
        this.player1.selectedCard = randomCard;
      }
    }

    // Show auto-select message briefly (positioned higher to avoid card overlap)
    const msgContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80).setDepth(50);
    const msg = this.add.text(0, 0, 'AUTO-SELECTED!', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ff6b6b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    msgContainer.add(msg);

    this.time.delayedCall(500, () => {
      msgContainer.destroy();
      this.playTurn();
    });
  }

  private updateUI(): void {
    this.playerIndicator.setText('TAP A CARD TO PLAY');
    this.updatePlayerStatus();
    this.updateOpponentStatus();
    this.updatePlayerHand();
    this.updateOpponentHand();
  }

  private getCurrentPlayerState(): PlayerState {
    return this.player1;
  }

  private getOpponentState(): PlayerState {
    return this.player2;
  }

  // Turn summary for combined feedback
  private turnSummary = {
    playerDealtDamage: 0,
    playerDamageSource: '' as string,
    aiDealtDamage: 0,
    aiDamageSource: '' as string,
    playerBlocked: '' as string,
    aiBlocked: '' as string,
    playerBotAction: '' as string,
    aiBotAction: '' as string,
    playerBotKilled: '' as string,
    aiBotKilled: '' as string,
  };

  private resetTurnSummary(): void {
    this.turnSummary = {
      playerDealtDamage: 0,
      playerDamageSource: '',
      aiDealtDamage: 0,
      aiDamageSource: '',
      playerBlocked: '',
      aiBlocked: '',
      playerBotAction: '',
      aiBotAction: '',
      playerBotKilled: '',
      aiBotKilled: '',
    };
  }

  private setupEventListeners(): void {
    // Collect miner payout events
    this.gameplayEventCleanups.push(
      gameEvents.on('MINER_PAYOUT', (event) => {
        const { playerId, minerType } = event.payload as { playerId: string; minerType: string };
        const isPlayer = playerId === this.player1.id;

        // Map minerType to readable actions
        // Note: deflection_miner blocking is handled by DAMAGE_BLOCKED event
        const botActions: Record<string, string> = {
          projectile_miner: 'Shot Bot dealt 3 dmg',
          continuous_miner: 'Blast Bot dealt 8 dmg',
          repair_miner: 'Repair Bot healed Shield',
        };

        // Skip deflection_miner - its effect shows in DAMAGE_BLOCKED
        if (minerType === 'deflection_miner') return;

        if (isPlayer) {
          this.turnSummary.playerBotAction = botActions[minerType] || '';
        } else {
          this.turnSummary.aiBotAction = botActions[minerType] || '';
        }
      })
    );

    // Collect damage dealt events
    this.gameplayEventCleanups.push(
      gameEvents.on('DAMAGE_DEALT', (event) => {
        const { targetId, amount, attackType, source } = event.payload as { targetId: string; amount: number; attackType?: string; source: string };
        const isPlayerHit = targetId === this.player1.id;

        let sourceName = '';
        if (attackType === 'continuous') sourceName = 'Blast';
        else if (attackType === 'projectile') sourceName = 'Shot';
        else if (source === 'miner_payout') sourceName = 'Bot';

        if (isPlayerHit) {
          this.turnSummary.aiDealtDamage += amount;
          this.turnSummary.aiDamageSource = sourceName;
        } else {
          this.turnSummary.playerDealtDamage += amount;
          this.turnSummary.playerDamageSource = sourceName;
          // Issue #3 fix: Track damage dealt by player (player1)
          this.gameStats.damageDealt += amount;
        }

        // 🎵 AAA AUDIO: 4-Layer Impact System with Hitstop & Anticipation
        // Calculate intensity based on damage (0-10 damage → 0-1 intensity)
        const intensity = Math.min(amount / 10, 1);

        // Detect attacker and get element from their selected card
        const attacker = isPlayerHit ? this.player2 : this.player1;
        const element = attacker.selectedCard?.element || 'fire';

        // High damage (6+): Full cinematic sequence (whoosh → hitstop → layered impact)
        // Lower damage: Direct layered impact (still 4 layers, just no cinematic buildup)
        if (amount >= 6) {
          // CINEMATIC IMPACT: Anime-style audio sequence
          // [Anticipation Whoosh] → [Hitstop Silence] → [4-Layer Impact]
          proceduralSFX.cinematicImpact(element, intensity);
        } else {
          // STANDARD IMPACT: 4-layer system (attack, body, tail, enhancer)
          proceduralSFX.playLayeredImpact(element, intensity);
        }

        // 🎨 AAA VISUAL: Calculate target position
        const targetY = isPlayerHit ? GAME_HEIGHT - 100 : 100;
        const targetX = GAME_WIDTH / 2;

        // 🎨 AAA OOMPH FACTOR: 7-Layer Impact System with Hitstop
        // This replaces the individual effect calls with a coordinated orchestration
        if (amount >= 7) {
          // DEVASTATING HIT: Use full critical impact with letterbox + slowmo
          this.impactOrchestrator.triggerCriticalImpact(targetX, targetY, element);
        } else if (amount >= 4) {
          // HEAVY HIT: Full 7-layer impact sequence
          this.impactOrchestrator.triggerImpact(targetX, targetY, element, amount);
        } else {
          // LIGHT HIT: Simplified impact (fewer layers)
          this.impactOrchestrator.triggerLightImpact(targetX, targetY, element);
        }

        // 🎨 Background theme changes to match element
        this.animatedBackground.setTheme(element);

        // Check for critical HP (below 10) - trigger warning visual
        const currentHP = isPlayerHit ? this.player1.stats.baseHP : this.player2.stats.baseHP;
        if (currentHP > 0 && currentHP <= 10 && !this.criticalModeActive) {
          this.criticalModeActive = true;
          this.triggerCriticalFX();
          // Critical HP: Override background theme with urgent red
          this.animatedBackground.setTheme('critical');
          // Use PostFX critical warning preset
          if (this.postFX) {
            this.postFX.criticalWarning();
          }
        }
      })
    );

    // Collect damage blocked events
    this.gameplayEventCleanups.push(
      gameEvents.on('DAMAGE_BLOCKED', (event) => {
        const { targetId, blockedBy, attackType } = event.payload as { targetId: string; blockedBy: string; attackType?: string };
        const isPlayerDefended = targetId === this.player1.id;

        // Map blockedBy to readable name
        let defense = 'Dodge';
        if (blockedBy === 'wall') defense = 'Shield';
        else if (blockedBy === 'deflection_miner') defense = 'Dodge Bot';
        else if (blockedBy === 'deflection') defense = 'Dodge';

        const attack = attackType === 'continuous' ? 'Blast' : 'Shot';

        if (isPlayerDefended) {
          this.turnSummary.playerBlocked = `${defense} blocked ${attack}`;
        } else {
          this.turnSummary.aiBlocked = `${defense} blocked ${attack}`;
        }
      })
    );

    // Collect miner killed events
    this.gameplayEventCleanups.push(
      gameEvents.on('MINER_KILLED', (event) => {
        const { playerId, minerType } = event.payload as { playerId: string; minerType: string };
        const isPlayer = playerId === this.player1.id;

        const botNames: Record<string, string> = {
          deflection_miner: 'Dodge Bot',
          projectile_miner: 'Shot Bot',
          continuous_miner: 'Blast Bot',
          repair_miner: 'Repair Bot',
        };

        if (isPlayer) {
          this.turnSummary.playerBotKilled = botNames[minerType] || 'Bot';
        } else {
          this.turnSummary.aiBotKilled = botNames[minerType] || 'Bot';
        }
      })
    );
  }

  /**
   * Setup multiplayer-specific event listeners
   */
  private setupMultiplayerListeners(): void {
    if (!this.isMultiplayer) return;

    // Listen for opponent card selection
    this.eventCleanups.push(
      gameEvents.on('OPPONENT_CARD_SELECTED', (event: any) => {
        const selected = event.payload.selected;
        this.updateOpponentCardStatus(selected ? 'Selecting...' : '');
      })
    );

    // Listen for opponent card lock
    this.eventCleanups.push(
      gameEvents.on('OPPONENT_CARD_LOCKED', (event: any) => {
        this.updateOpponentCardStatus('Ready ✓');
        // Set opponent's selected card on player2 state for resolution
        const card = CardFactory.getCardById(event.payload.cardId);
        if (card) {
          this.player2.selectedCard = card;
        }
      })
    );

    // Listen for both cards locked (trigger resolution)
    this.eventCleanups.push(
      gameEvents.on('BOTH_CARDS_LOCKED_CLIENT', () => {
        // Client: wait for host to send state update
        this.updateOpponentCardStatus('Resolving...');
      })
    );

    this.eventCleanups.push(
      gameEvents.on('BOTH_CARDS_LOCKED_HOST', () => {
        // Host: resolve turn and broadcast result
        this.resolveTurn();
      })
    );

    // Listen for host state updates (client only)
    if (!this.isHost) {
      this.eventCleanups.push(
        gameEvents.on('HOST_STATE_UPDATE', (event: any) => {
          // Update local game state from host
          const state = event.payload.state;
          this.syncStateFromHost(state);
        })
      );

      this.eventCleanups.push(
        gameEvents.on('HOST_GAME_EVENT', (event: any) => {
          // Handle game events from host
          const { eventType, eventData } = event.payload;
          gameEvents.emit(eventType, eventData);
        })
      );
    }

    // Listen for disconnection
    this.eventCleanups.push(
      gameEvents.on('NETWORK_DISCONNECTED', () => {
        this.handleMultiplayerDisconnection();
      })
    );
  }

  /**
   * Update opponent card selection status text
   */
  private updateOpponentCardStatus(status: string): void {
    if (this.opponentStatusText) {
      this.opponentStatusText.setText(status);
    }
  }

  /**
   * Sync game state from host (client only)
   */
  private syncStateFromHost(state: any): void {
    if (this.isHost) {
      console.warn('[GameScene] Client received state sync on host - ignoring');
      return;
    }

    console.log('[GameScene] Syncing state from host:', state);

    // Update player states
    this.player1 = state.player1;
    this.player2 = state.player2;

    // Update UI to reflect new state (updateUI() calls updatePlayerStatus, updateOpponentStatus, updatePlayerHand, updateOpponentHand)
    this.updateUI();

    // Start new turn if needed
    if (!this.isProcessingTurn) {
      this.startTurn();
    }
  }

  /**
   * Handle multiplayer disconnection
   */
  private handleMultiplayerDisconnection(): void {
    // Pause game
    this.isProcessingTurn = true;

    // Show disconnection modal
    const modal = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);
    modal.setDepth(1001);

    const bg = this.add.rectangle(0, 0, 400, 200, 0x1a1a1a, 1);
    bg.setStrokeStyle(3, 0xff6b6b, 1);
    modal.add(bg);

    const title = this.add.text(0, -50, 'Connection Lost', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.lg}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    modal.add(title);

    const message = this.add.text(0, 0, 'The connection to your opponent was lost.', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.sm}px`,
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);
    modal.add(message);

    const okBtn = this.add.text(0, 60, 'BACK TO MENU', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.sm}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    okBtn.on('pointerover', () => {
      okBtn.setColor('#ffd43b');
      okBtn.setScale(1.1);
    });

    okBtn.on('pointerout', () => {
      okBtn.setColor('#ffffff');
      okBtn.setScale(1);
    });

    okBtn.on('pointerdown', () => {
      this.scene.start(SceneKeys.MENU);
    });

    modal.add(okBtn);
  }

  /**
   * Show split turn summary with player and opponent messages
   */
  private showTurnSummary(): void {
    const s = this.turnSummary;
    const playerParts: string[] = [];
    const opponentParts: string[] = [];

    // Build player message (your actions)
    if (s.playerDealtDamage > 0) {
      playerParts.push(`dealt ${s.playerDealtDamage} dmg`);
    }
    if (s.playerBotAction) {
      playerParts.push(`${s.playerBotAction}`);
    }
    if (s.playerBlocked) {
      playerParts.push(`${s.playerBlocked}`);
    }
    if (s.playerBotKilled) {
      playerParts.push(`${s.playerBotKilled} destroyed!`);
    }

    // Build opponent message (AI actions)
    if (s.aiDealtDamage > 0) {
      opponentParts.push(`dealt ${s.aiDealtDamage} dmg`);
    }
    if (s.aiBotAction) {
      opponentParts.push(`${s.aiBotAction}`);
    }
    if (s.aiBlocked) {
      opponentParts.push(`${s.aiBlocked}`);
    }
    if (s.aiBotKilled) {
      opponentParts.push(`${s.aiBotKilled} destroyed!`);
    }

    // Show player message (bottom zone)
    if (playerParts.length > 0) {
      const playerMessage = `You ${playerParts.join(' • ')}`;
      const playerType = this.getPlayerMessageType();
      this.toast.showPlayerMessage(playerMessage, playerType);
    }

    // Show opponent message (top zone) - staggered
    if (opponentParts.length > 0) {
      setTimeout(() => {
        const opponentMessage = `AI ${opponentParts.join(' • ')}`;
        const opponentType = this.getOpponentMessageType();
        this.toast.showOpponentMessage(opponentMessage, opponentType);
      }, 100);
    }

    // Reset for next turn
    this.resetTurnSummary();
  }

  /**
   * Determine message type for player actions
   */
  private getPlayerMessageType(): 'success' | 'error' | 'info' {
    const s = this.turnSummary;
    const advantage = s.playerDealtDamage - s.aiDealtDamage;

    if (advantage > 2 || s.aiBotKilled) {
      return 'success';
    } else if (s.playerBotKilled) {
      return 'error';
    }
    return 'info';
  }

  /**
   * Determine message type for opponent actions
   */
  private getOpponentMessageType(): 'success' | 'error' | 'info' {
    const s = this.turnSummary;
    const advantage = s.aiDealtDamage - s.playerDealtDamage;

    if (advantage > 2 || s.playerBotKilled) {
      return 'error'; // Threat to player
    } else if (s.aiBotKilled) {
      return 'success'; // Good for player
    }
    return 'info';
  }

  private getElementColor(element: string): number {
    const colors: Record<string, number> = {
      fire: COLORS.fire,
      water: COLORS.water,
      earth: COLORS.earth,
      air: COLORS.air,
      lightning: COLORS.lightning,
      ice: COLORS.ice,
    };
    return colors[element] || 0xffffff;
  }

  private getTypeSymbol(type: string): string {
    const symbols: Record<string, string> = {
      attack: '⚔️',
      defense: '🛡️',
      miner: '⛏️',
    };
    return symbols[type] || '?';
  }

  /**
   * Get a compact description for displaying on cards
   */
  private getShortDescription(card: Card): string {
    // Return card's description, which is already concise
    return card.description;
  }

  shutdown(): void {
    this.stopTimer();
    this.stopInstructionPulse();
    this.hideAIThinking();

    // Clean up multiplayer listeners
    this.eventCleanups.forEach(cleanup => cleanup());
    this.eventCleanups = [];

    // Clean up gameplay event listeners (don't use removeAllListeners!)
    this.gameplayEventCleanups.forEach(cleanup => cleanup());
    this.gameplayEventCleanups = [];

    // Issue #3 fix: Reset game statistics for next game
    this.gameStats = { damageDealt: 0, wallsBuilt: 0, minersPlaced: 0 };

    // Clean up UI components
    if (this.playerHealthBar) this.playerHealthBar.destroy();
    if (this.opponentHealthBar) this.opponentHealthBar.destroy();
    if (this.circularTimer) this.circularTimer.destroy();
    if (this.opponentStatusText) {
      this.opponentStatusText.destroy();
      this.opponentStatusText = null;
    }

    // Clean up utility managers
    if (this.visibilityHandler) this.visibilityHandler.destroy();
    if (this.inputManager) this.inputManager.clearAll();

    // Clean up AAA effects
    if (this.particleManager) this.particleManager.destroy();
    if (this.cameraFX) this.cameraFX.destroy();
    if (this.animatedBackground) this.animatedBackground.destroy();
  }
}
