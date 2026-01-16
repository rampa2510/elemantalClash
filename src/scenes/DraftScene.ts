import { BaseScene } from './BaseScene';
import { SceneKeys } from '../core/SceneKeys';
import { COLORS, TIP_ROTATION_INTERVAL, FONTS, FONT_SIZES, TIMING } from '../config/constants';
import { DraftManager } from '../core/DraftManager';
import { CardFactory } from '../core/CardFactory';
import { Card } from '../types/cards';
import { multiplayerCoordinator } from '../network/MultiplayerGameCoordinator';
import { gameEvents } from '../utils/EventEmitter';
import { Toast } from '../ui/components';

interface DraftSceneData {
  fadeIn?: boolean;
  isMultiplayer?: boolean;
  sessionId?: string;
  isHost?: boolean;
}

interface CardDisplayData {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  shadowGraphics: Phaser.GameObjects.Graphics;
  baseY: number;
  card: Card;
}

/**
 * Draft scene - 6-round deck building (single player)
 * Enhanced with magnetic card hover and tactile feedback
 */
export class DraftScene extends BaseScene {
  private draftManager!: DraftManager;
  private playerDeck: Card[] = [];

  private timerText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private categoryText!: Phaser.GameObjects.Text;
  private tipText!: Phaser.GameObjects.Text;
  private cardContainer!: Phaser.GameObjects.Container;
  private deckSlotsContainer!: Phaser.GameObjects.Container;

  private timerEvent!: Phaser.Time.TimerEvent;
  private tipRotationEvent!: Phaser.Time.TimerEvent;

  // Keyboard navigation
  private selectedCardIndex: number = 0;
  private cardContainers: Phaser.GameObjects.Container[] = [];
  private cardDisplayData: CardDisplayData[] = [];

  // Prevent rapid-click bug (selecting multiple cards)
  private isSelecting: boolean = false;

  // Multiplayer mode
  private isMultiplayer: boolean = false;
  private sessionId: string | null = null;
  private isHost: boolean = false;
  private waitingOverlay: Phaser.GameObjects.Container | null = null;
  private spinnerTween: Phaser.Tweens.Tween | null = null;
  private eventCleanups: Array<() => void> = [];
  private isStartingGame: boolean = false; // High Bug #7 fix: Prevent double scene transition

  constructor() {
    super({ key: SceneKeys.DRAFT });
  }

  create(data?: DraftSceneData): void {
    super.create();

    if (this.shouldFadeIn(data)) {
      this.fadeIn();
    }

    // Initialize multiplayer context
    if (data?.isMultiplayer && data?.sessionId) {
      this.isMultiplayer = true;
      this.sessionId = data.sessionId;
      this.isHost = data.isHost ?? false;

      // Initialize multiplayer coordinator
      multiplayerCoordinator.initializeDraftPhase(this.isHost);

      // Listen for both drafts complete (Critical Bug #2 fix)
      this.eventCleanups.push(
        gameEvents.on('BOTH_DRAFTS_COMPLETE', this.handleBothDraftsComplete.bind(this))
      );

      // Listen for opponent draft completion and store cleanup functions
      this.eventCleanups.push(
        gameEvents.on('OPPONENT_DRAFT_COMPLETE', this.handleOpponentDraftComplete.bind(this))
      );
      this.eventCleanups.push(
        gameEvents.on('NETWORK_DISCONNECTED', this.handleDisconnection.bind(this))
      );
    }

    this.playerDeck = [];
    this.isSelecting = false; // Reset selection lock on scene start
    this.draftManager = new DraftManager('player1');

    this.createUI();
    this.setupKeyboardNavigation();
    this.updateDisplay();
    this.startTimer();
    this.startTipRotation();
  }

  private createUI(): void {
    // Background
    this.createGradientBackground();

    // Header
    this.createHeader();

    // Card options container
    this.cardContainer = this.add.container(0, 0);

    // Deck slots at bottom
    this.deckSlotsContainer = this.add.container(0, 0);
    this.createDeckSlots();

    // Tip display (moved down for proper spacing from YOUR DECK)
    this.tipText = this.add.text(this.centerX, this.screenHeight - 140, '', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.sm}px`,
      color: '#b8c5d6',
      wordWrap: { width: 600 },
    }).setOrigin(0.5);

    // Keyboard hint (moved down for proper spacing)
    this.add.text(this.centerX, this.screenHeight - 170, '← → to select | ENTER to confirm | ESC for menu', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.xs}px`,
      color: '#666666',
    }).setOrigin(0.5);
  }

  private createHeader(): void {
    // Round indicator
    this.roundText = this.add.text(this.centerX, 30, '', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.lg}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Category
    this.categoryText = this.add.text(this.centerX, 65, '', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.md}px`,
      color: '#ffd43b',
    }).setOrigin(0.5);

    // Timer
    this.timerText = this.add.text(this.centerX, 105, '', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.xl}px`,
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  private createDeckSlots(): void {
    this.deckSlotsContainer.removeAll(true);

    const slotWidth = 60;
    const slotHeight = 80;
    const spacing = 15;
    const totalWidth = 6 * slotWidth + 5 * spacing;
    const startX = (this.screenWidth - totalWidth) / 2;
    const y = this.screenHeight - 70;

    // Place "YOUR DECK" below the cards to avoid overlap
    this.add.text(this.centerX, y + 55, 'YOUR DECK', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.xs}px`,
      color: '#b8c5d6',
    }).setOrigin(0.5);

    const selectedCards = this.draftManager.getSelectedDeck();

    for (let i = 0; i < 6; i++) {
      const x = startX + i * (slotWidth + spacing) + slotWidth / 2;

      const slot = this.add.graphics();

      if (i < selectedCards.length) {
        // Filled slot with shadow
        const card = selectedCards[i];
        const color = this.getElementColor(card.element);

        // Shadow
        slot.fillStyle(0x000000, 0.2);
        slot.fillRoundedRect(-slotWidth / 2 + 2, -slotHeight / 2 + 3, slotWidth, slotHeight, 5);

        slot.fillStyle(color, 0.8);
        slot.fillRoundedRect(-slotWidth / 2, -slotHeight / 2, slotWidth, slotHeight, 5);
      } else {
        // Empty slot
        slot.lineStyle(2, COLORS.text, 0.3);
        slot.strokeRoundedRect(-slotWidth / 2, -slotHeight / 2, slotWidth, slotHeight, 5);
      }

      slot.setPosition(x, y);
      this.deckSlotsContainer.add(slot);
    }
  }

  private setupKeyboardNavigation(): void {
    if (!this.input.keyboard) return;

    const keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    const keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    const keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const keyEscape = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    keyLeft.on('down', () => this.navigateCards(-1));
    keyRight.on('down', () => this.navigateCards(1));
    keyEnter.on('down', () => this.confirmSelection());
    keySpace.on('down', () => this.confirmSelection());
    keyEscape.on('down', () => this.transitionTo(SceneKeys.MENU));
  }

  private navigateCards(direction: number): void {
    const options = this.draftManager.getCurrentOptions();
    const newIndex = (this.selectedCardIndex + direction + options.length) % options.length;
    this.highlightCard(newIndex);
  }

  private highlightCard(index: number): void {
    // Remove highlight from previous
    const prevData = this.cardDisplayData[this.selectedCardIndex];
    if (prevData) {
      this.animateCardDeselect(prevData);
    }

    this.selectedCardIndex = index;

    // Highlight new selection
    const newData = this.cardDisplayData[index];
    if (newData) {
      this.animateCardSelect(newData);
    }
  }

  private animateCardSelect(data: CardDisplayData): void {
    const { container, bg, shadowGraphics, baseY, card } = data;
    const color = this.getElementColor(card.element);
    const width = 150;
    const height = 200;

    // Lift and scale with bounce
    this.tweens.add({
      targets: container,
      y: baseY - 12,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: TIMING.normal,
      ease: 'Back.easeOut',
    });

    // Expand shadow
    shadowGraphics.clear();
    shadowGraphics.fillStyle(0x000000, 0.25);
    shadowGraphics.fillRoundedRect(-width / 2 + 4, -height / 2 + 10, width, height, 10);
    shadowGraphics.fillStyle(0x000000, 0.15);
    shadowGraphics.fillRoundedRect(-width / 2 + 2, -height / 2 + 5, width, height, 10);

    // Glow border
    bg.clear();
    bg.fillStyle(0x3d3d54, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.lineStyle(4, COLORS.energyBar, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

    // Add element glow
    bg.lineStyle(8, color, 0.3);
    bg.strokeRoundedRect(-width / 2 - 2, -height / 2 - 2, width + 4, height + 4, 12);
  }

  private animateCardDeselect(data: CardDisplayData): void {
    const { container, bg, shadowGraphics, baseY, card } = data;
    const color = this.getElementColor(card.element);
    const width = 150;
    const height = 200;

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
    shadowGraphics.fillRoundedRect(-width / 2 + 2, -height / 2 + 4, width, height, 10);

    // Reset background
    bg.clear();
    bg.fillStyle(COLORS.cardBg, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.lineStyle(3, color, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
  }

  private confirmSelection(): void {
    const options = this.draftManager.getCurrentOptions();
    if (options[this.selectedCardIndex]) {
      // Bounce animation on confirm
      const data = this.cardDisplayData[this.selectedCardIndex];
      if (data) {
        this.tweens.add({
          targets: data.container,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: TIMING.fast,
          yoyo: true,
          ease: 'Power2',
          onComplete: () => {
            this.selectCard(options[this.selectedCardIndex]);
          },
        });
      } else {
        this.selectCard(options[this.selectedCardIndex]);
      }
    }
  }

  private updateDisplay(): void {
    const round = this.draftManager.getCurrentRound();
    const category = this.draftManager.getCategoryDisplayName();
    const options = this.draftManager.getCurrentOptions();
    const tip = this.draftManager.getCurrentTip();

    // Update header
    this.roundText.setText(`ROUND ${round} of 6`);
    this.categoryText.setText(`Choose your ${category}`);
    this.tipText.setText(`💡 ${tip}`);

    // Update cards
    this.displayCardOptions(options);

    // Update deck slots
    this.createDeckSlots();

    // Reset selection
    this.selectedCardIndex = 0;
    this.highlightCard(0);
  }

  private displayCardOptions(options: Card[]): void {
    this.cardContainer.removeAll(true);
    this.cardContainers = [];
    this.cardDisplayData = [];

    const cardWidth = 150;
    const cardHeight = 200;
    const spacing = 20;
    const totalWidth = options.length * cardWidth + (options.length - 1) * spacing;
    const startX = (this.screenWidth - totalWidth) / 2;
    const y = this.centerY - 30;

    options.forEach((card, index) => {
      const x = startX + index * (cardWidth + spacing) + cardWidth / 2;
      const displayData = this.createCardDisplay(x, y, card, cardWidth, cardHeight, index);
      this.cardContainers.push(displayData.container);
      this.cardDisplayData.push(displayData);
    });

    // Instruction text
    this.add.text(this.centerX, y + cardHeight / 2 + 30, 'TAP TO SELECT', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.sm}px`,
      color: '#b8c5d6',
    }).setOrigin(0.5);
  }

  private createCardDisplay(x: number, y: number, card: Card, width: number, height: number, index: number): CardDisplayData {
    const container = this.add.container(x, y);

    // Shadow layer
    const shadowGraphics = this.add.graphics();
    shadowGraphics.fillStyle(0x000000, 0.2);
    shadowGraphics.fillRoundedRect(-width / 2 + 2, -height / 2 + 4, width, height, 10);
    container.add(shadowGraphics);

    // Card background
    const bg = this.add.graphics();
    const color = this.getElementColor(card.element);
    bg.fillStyle(COLORS.cardBg, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.lineStyle(3, color, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    container.add(bg);

    // Element indicator
    const elementBar = this.add.graphics();
    elementBar.fillStyle(color, 1);
    elementBar.fillRect(-width / 2 + 5, -height / 2 + 5, width - 10, 25);
    container.add(elementBar);

    // Card name
    const name = this.add.text(0, -height / 2 + 17, card.name, {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.xs}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(name);

    // Card type icon/text
    const typeText = this.add.text(0, -20, this.getTypeSymbol(card.type), {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(typeText);

    // Cost
    const costBg = this.add.graphics();
    costBg.fillStyle(COLORS.energyBar, 1);
    costBg.fillCircle(-width / 2 + 20, height / 2 - 20, 15);
    container.add(costBg);

    const costText = this.add.text(-width / 2 + 20, height / 2 - 20, `${card.cost}`, {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.sm}px`,
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(costText);

    // Power (if applicable)
    if (card.power > 0) {
      const powerText = this.add.text(width / 2 - 20, height / 2 - 20, `${card.power}`, {
        fontFamily: FONTS.family,
        fontSize: `${FONT_SIZES.sm}px`,
        color: '#ff6b6b',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(powerText);
    }

    // Description
    const desc = this.add.text(0, height / 2 - 55, card.description, {
      fontFamily: FONTS.family,
      fontSize: '10px',
      color: '#b8c5d6',
      wordWrap: { width: width - 20 },
      align: 'center',
    }).setOrigin(0.5);
    container.add(desc);

    // Make interactive
    const hitZone = this.add.zone(0, 0, width, height).setInteractive({ useHandCursor: true });
    container.add(hitZone);

    const displayData: CardDisplayData = {
      container,
      bg,
      shadowGraphics,
      baseY: y,
      card,
    };

    hitZone.on('pointerover', () => {
      if (this.selectedCardIndex !== index) {
        // Magnetic hover lift
        this.tweens.add({
          targets: container,
          y: y - 8,
          duration: TIMING.normal,
          ease: 'Power2',
        });

        // Expand shadow
        shadowGraphics.clear();
        shadowGraphics.fillStyle(0x000000, 0.25);
        shadowGraphics.fillRoundedRect(-width / 2 + 3, -height / 2 + 8, width, height, 10);

        // Subtle border glow
        bg.clear();
        bg.fillStyle(0x3a3a4a, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        bg.lineStyle(3, color, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
      }
      this.selectedCardIndex = index;
    });

    hitZone.on('pointerout', () => {
      // Don't reset if this is the selected card
      if (this.selectedCardIndex === index) {
        // Keep lifted but reset non-selected style
      } else {
        // Reset position
        this.tweens.add({
          targets: container,
          y: y,
          duration: TIMING.normal,
          ease: 'Power2',
        });

        // Reset shadow
        shadowGraphics.clear();
        shadowGraphics.fillStyle(0x000000, 0.2);
        shadowGraphics.fillRoundedRect(-width / 2 + 2, -height / 2 + 4, width, height, 10);

        // Reset background
        bg.clear();
        bg.fillStyle(COLORS.cardBg, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        bg.lineStyle(3, color, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
      }
    });

    hitZone.on('pointerdown', () => {
      // Press effect
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: TIMING.instant,
        ease: 'Power2',
      });
    });

    hitZone.on('pointerup', () => {
      // Bounce back
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: TIMING.fast,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.selectCard(card);
        },
      });
    });

    this.cardContainer.add(container);
    return displayData;
  }

  private selectCard(card: Card): void {
    // Prevent rapid-click bug: only allow one selection at a time
    if (this.isSelecting) {
      return;
    }

    this.isSelecting = true;
    this.draftManager.selectCard(card);

    if (this.draftManager.isComplete()) {
      this.completeDraft();
    } else {
      this.stopTimer();
      this.updateDisplay();
      this.startTimer();

      // Re-enable selection after UI updates (small delay to ensure everything is ready)
      this.time.delayedCall(100, () => {
        this.isSelecting = false;
      });
    }
  }

  private completeDraft(): void {
    // Save player's deck
    this.playerDeck = this.draftManager.getSelectedDeck();
    this.stopTimer();
    if (this.tipRotationEvent) {
      this.tipRotationEvent.destroy();
    }

    if (this.isMultiplayer) {
      // Multiplayer mode: Send deck to opponent and wait
      const deckInstances = this.playerDeck.map((card, index) => ({
        instanceId: `${this.isHost ? 'p1' : 'p2'}_card_${index}`,
        card: card,
      }));

      multiplayerCoordinator.sendDraftComplete(deckInstances);
      this.showWaitingOverlay();

      // Critical Bug #2 fix: Don't check opponent state here
      // Wait for BOTH_DRAFTS_COMPLETE event which is the single source of truth
    } else {
      // Single-player mode: Generate AI deck and start
      const aiDeck = CardFactory.createRandomDeck();

      // Start game with transition
      this.transitionTo(SceneKeys.GAME, {
        mode: 'draft',
        player1Deck: this.playerDeck,
        player2Deck: aiDeck,
      });
    }
  }

  private startTimer(): void {
    const duration = this.draftManager.getTimerDuration();
    let remaining = duration;

    this.timerText.setText(`⏱️ ${remaining}`);
    this.timerText.setColor('#ffffff');

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: duration - 1,
      callback: () => {
        remaining--;
        this.timerText.setText(`⏱️ ${remaining}`);

        if (remaining <= 3) {
          this.timerText.setColor('#ff6b6b');
          // Pulse effect on warning
          this.tweens.add({
            targets: this.timerText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: TIMING.fast,
            yoyo: true,
            ease: 'Power2',
          });
        }

        if (remaining <= 0) {
          this.handleTimeout();
        }
      },
    });
  }

  private stopTimer(): void {
    if (this.timerEvent) {
      this.timerEvent.destroy();
    }
  }

  private handleTimeout(): void {
    this.draftManager.handleTimeout();

    // Show auto-select message
    const msg = this.add.text(this.centerX, this.centerY, 'AUTO-SELECTED!', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.xl}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.addDelayedCall(1000, () => {
      msg.destroy();

      if (this.draftManager.isComplete()) {
        this.completeDraft();
      } else {
        this.updateDisplay();
        this.startTimer();
      }
    });
  }

  private startTipRotation(): void {
    this.tipRotationEvent = this.time.addEvent({
      delay: TIP_ROTATION_INTERVAL * 1000,
      loop: true,
      callback: () => {
        this.draftManager.rotateTip();
        this.tipText.setText(`💡 ${this.draftManager.getCurrentTip()}`);
      },
    });
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
   * Handle opponent draft completion event
   * Critical Bug #2 fix: Don't start game here, wait for BOTH_DRAFTS_COMPLETE
   */
  private handleOpponentDraftComplete(): void {
    console.log('[DraftScene] Opponent finished drafting, waiting for BOTH_DRAFTS_COMPLETE event');
    // Don't call startMultiplayerGame() here - handled by BOTH_DRAFTS_COMPLETE event
  }

  /**
   * Handle both drafts complete event (Critical Bug #2 fix)
   * This is the single source of truth for starting multiplayer game
   */
  private handleBothDraftsComplete(): void {
    console.log('[DraftScene] Both drafts complete, starting game');
    this.startMultiplayerGame();
  }

  /**
   * Start multiplayer game with both decks
   * High Bug #7 fix: Guard against double transition
   */
  private startMultiplayerGame(): void {
    // Prevent double scene transition
    if (this.isStartingGame) {
      console.warn('[DraftScene] Already starting game, ignoring duplicate call');
      return;
    }

    this.isStartingGame = true;
    this.hideWaitingOverlay();

    // Medium Issue #2 fix: Handle validation errors from getOpponentDeck()
    let opponentDeck: Card[];
    try {
      opponentDeck = multiplayerCoordinator.getOpponentDeck();
    } catch (error) {
      console.error('[DraftScene] Failed to validate opponent deck:', error);
      const toast = new Toast(this);
      toast.error('Opponent deck is invalid or corrupted');
      this.time.delayedCall(2000, () => {
        this.transitionTo(SceneKeys.MENU);
      });
      return;
    }

    // Validate opponent deck is ready
    if (opponentDeck.length === 0) {
      console.error('[DraftScene] Opponent deck not ready, cannot start game');
      // Show error and return to menu
      const toast = new Toast(this);
      toast.error('Failed to sync opponent deck');
      this.time.delayedCall(2000, () => {
        this.transitionTo(SceneKeys.MENU);
      });
      return;
    }

    // Transition to game scene with multiplayer mode
    this.transitionTo(SceneKeys.GAME, {
      mode: 'multiplayer',
      isMultiplayer: true,
      isHost: this.isHost,
      sessionId: this.sessionId,
      player1Deck: this.isHost ? this.playerDeck : opponentDeck,
      player2Deck: this.isHost ? opponentDeck : this.playerDeck,
    });
  }

  /**
   * Show "Waiting for opponent..." overlay
   */
  private showWaitingOverlay(): void {
    this.waitingOverlay = this.add.container(this.centerX, this.centerY);
    this.waitingOverlay.setDepth(1000);

    // Semi-transparent background
    const bg = this.add.rectangle(0, 0, this.screenWidth, this.screenHeight, 0x000000, 0.8);
    this.waitingOverlay.add(bg);

    // Loading spinner
    const spinner = this.add.text(0, -30, '⏳', {
      fontFamily: 'Arial',
      fontSize: '48px',
    }).setOrigin(0.5);
    this.waitingOverlay.add(spinner);

    // Spin animation
    this.spinnerTween = this.tweens.add({
      targets: spinner,
      angle: 360,
      duration: 2000,
      repeat: -1,
      ease: 'Linear',
    });

    // Waiting message
    const message = this.add.text(0, 40, 'Waiting for opponent to finish drafting...', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.md}px`,
      color: '#ffffff',
    }).setOrigin(0.5);
    this.waitingOverlay.add(message);

    // Cancel button
    const cancelBtn = this.add.text(0, 100, 'CANCEL', {
      fontFamily: FONTS.family,
      fontSize: `${FONT_SIZES.sm}px`,
      color: '#ff6b6b',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    cancelBtn.on('pointerover', () => {
      cancelBtn.setColor('#ff5555');
      cancelBtn.setScale(1.1);
    });

    cancelBtn.on('pointerout', () => {
      cancelBtn.setColor('#ff6b6b');
      cancelBtn.setScale(1);
    });

    cancelBtn.on('pointerdown', () => {
      this.handleDisconnection();
    });

    this.waitingOverlay.add(cancelBtn);
  }

  /**
   * Hide waiting overlay
   */
  private hideWaitingOverlay(): void {
    // Stop spinner tween to prevent memory leak
    if (this.spinnerTween) {
      this.spinnerTween.stop();
      this.spinnerTween = null;
    }

    if (this.waitingOverlay) {
      this.waitingOverlay.destroy(true);
      this.waitingOverlay = null;
    }
  }

  /**
   * Handle network disconnection during draft
   */
  private handleDisconnection(): void {
    this.hideWaitingOverlay();

    // Show disconnection message
    const modal = this.add.container(this.centerX, this.centerY);
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
      this.transitionTo(SceneKeys.MENU);
    });

    modal.add(okBtn);
  }

  shutdown(): void {
    this.stopTimer();
    if (this.tipRotationEvent) {
      this.tipRotationEvent.destroy();
    }

    // Clean up multiplayer listeners
    this.eventCleanups.forEach(cleanup => cleanup());
    this.eventCleanups = [];

    this.hideWaitingOverlay();
  }
}
