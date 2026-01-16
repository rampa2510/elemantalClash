import Phaser from 'phaser';
import { themeManager } from '../../managers/ThemeManager';
import { getAllCards } from '../../config/cardDefinitions';
import { Card } from '../../types/cards';

/**
 * CardGallery - Interactive card browser
 * Shows all cards in grid layout with click-to-expand functionality
 */
export class CardGallery {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private width: number;
  private height: number;

  private container!: Phaser.GameObjects.Container;
  private scrollContainer!: Phaser.GameObjects.Container;
  private cards: Card[] = [];

  // Modal for expanded card view
  private modalContainer: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number = 500, height: number = 200) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.cards = getAllCards();
    this.create();
  }

  private create(): void {
    const colors = themeManager.getColors();
    this.container = this.scene.add.container(this.x, this.y);

    // Background panel
    const bg = this.scene.add.rectangle(0, 0, this.width, this.height, 0x000000, 0.3);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(0, -this.height / 2 + 20, 'CARD PREVIEW', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(title);

    // Subtitle
    const subtitle = this.scene.add.text(0, -this.height / 2 + 38, 'Click any card to view details', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
    this.container.add(subtitle);

    // Create scrollable card grid
    this.createCardGrid();
  }

  private createCardGrid(): void {
    const colors = themeManager.getColors();

    // Scroll container for cards
    this.scrollContainer = this.scene.add.container(0, 30);
    this.container.add(this.scrollContainer);

    // Card dimensions
    const cardWidth = 70;
    const cardHeight = 90;
    const cardSpacing = 10;
    const cols = 6;

    // Group cards by category
    const cardsByCategory = {
      walls: this.cards.filter(c => c.type === 'defense' && c.subtype === 'wall'),
      deflections: this.cards.filter(c => c.type === 'defense' && c.subtype === 'deflection'),
      continuous: this.cards.filter(c => c.type === 'attack' && c.subtype === 'continuous'),
      projectiles: this.cards.filter(c => c.type === 'attack' && c.subtype === 'projectile'),
      miners: this.cards.filter(c => c.type === 'miner'),
    };

    let currentY = -50;

    // Render each category
    Object.entries(cardsByCategory).forEach(([category, categoryCards]) => {
      if (categoryCards.length === 0) return;

      // Category label
      const categoryLabel = this.scene.add.text(-this.width / 2 + 20, currentY, this.getCategoryLabel(category), {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
      });
      this.scrollContainer.add(categoryLabel);

      currentY += 20;

      // Render cards in this category
      const rows = Math.ceil(categoryCards.length / cols);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const index = row * cols + col;
          if (index >= categoryCards.length) break;

          const card = categoryCards[index];
          const cardX = -this.width / 2 + 40 + (col * (cardWidth + cardSpacing));
          const cardY = currentY + (row * (cardHeight + cardSpacing));

          this.createMiniCard(cardX, cardY, cardWidth, cardHeight, card);
        }
      }

      currentY += (rows * (cardHeight + cardSpacing)) + 15;
    });
  }

  private createMiniCard(x: number, y: number, width: number, height: number, card: Card): void {
    const colors = themeManager.getColors();

    // Card background
    const elementColor = this.getElementColor(card.element);
    const cardBg = this.scene.add.rectangle(x, y, width, height, elementColor, 0.3);
    cardBg.setStrokeStyle(2, elementColor, 0.8);
    cardBg.setInteractive({ useHandCursor: true });
    this.scrollContainer.add(cardBg);

    // Card name (abbreviated)
    const nameText = this.scene.add.text(x, y - height / 2 + 12, card.name, {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: `#${colors.text.toString(16).padStart(6, '0')}`,
      align: 'center',
      wordWrap: { width: width - 10 },
    }).setOrigin(0.5);
    this.scrollContainer.add(nameText);

    // Card cost
    const costBg = this.scene.add.circle(x - width / 2 + 12, y - height / 2 + 12, 10, 0x000000, 0.7);
    this.scrollContainer.add(costBg);

    const costText = this.scene.add.text(x - width / 2 + 12, y - height / 2 + 12, card.cost.toString(), {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#ffeb3b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scrollContainer.add(costText);

    // Element icon (emoji)
    const elementIcon = this.getElementIcon(card.element);
    const iconText = this.scene.add.text(x, y, elementIcon, {
      fontFamily: 'Arial',
      fontSize: '24px',
    }).setOrigin(0.5);
    this.scrollContainer.add(iconText);

    // HP or Damage (depending on card type)
    let statText = '';
    if (card.type === 'defense' && card.subtype === 'wall') {
      statText = `${card.power} HP`;
    } else if (card.type === 'attack') {
      statText = `${card.power} DMG`;
    } else if (card.type === 'miner' && card.payoutInterval) {
      statText = `+1 per ${card.payoutInterval}t`;
    }

    if (statText) {
      const stat = this.scene.add.text(x, y + height / 2 - 12, statText, {
        fontFamily: 'Arial',
        fontSize: '8px',
        color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5);
      this.scrollContainer.add(stat);
    }

    // Hover effect
    cardBg.on('pointerover', () => {
      cardBg.setFillStyle(elementColor, 0.5);
      cardBg.setScale(1.05);
    });

    cardBg.on('pointerout', () => {
      cardBg.setFillStyle(elementColor, 0.3);
      cardBg.setScale(1);
    });

    // Click to expand
    cardBg.on('pointerdown', () => {
      this.showCardModal(card);
    });
  }

  private showCardModal(card: Card): void {
    if (this.modalContainer) {
      this.closeModal();
    }

    const colors = themeManager.getColors();
    const elementColor = this.getElementColor(card.element);

    // Modal container
    this.modalContainer = this.scene.add.container(this.scene.cameras.main.centerX, this.scene.cameras.main.centerY);
    this.modalContainer.setDepth(1000);

    // Overlay (darken background)
    const overlay = this.scene.add.rectangle(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height, 0x000000, 0.7);
    overlay.setInteractive();
    overlay.on('pointerdown', () => {
      this.closeModal();
    });
    this.modalContainer.add(overlay);

    // Modal background
    const modalBg = this.scene.add.rectangle(0, 0, 400, 500, 0x1a1a1a, 1);
    modalBg.setStrokeStyle(3, elementColor, 1);
    this.modalContainer.add(modalBg);

    // Card name
    const nameText = this.scene.add.text(0, -220, card.name, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: `#${colors.text.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.modalContainer.add(nameText);

    // Element and Cost
    const elementText = this.scene.add.text(-150, -180, `${this.getElementIcon(card.element)} ${card.element.toUpperCase()}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: `#${elementColor.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.modalContainer.add(elementText);

    const costBox = this.scene.add.rectangle(150, -180, 60, 30, 0x000000, 0.8);
    const costLabel = this.scene.add.text(150, -180, `${card.cost} ⚡`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffeb3b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.modalContainer.add([costBox, costLabel]);

    // Stats section
    let yPos = -130;
    const statsToShow: string[] = [];

    if (card.type === 'defense' && card.subtype === 'wall') {
      statsToShow.push(`❤️  HP: ${card.power}`);
    }
    if (card.type === 'attack') {
      statsToShow.push(`💥 Damage: ${card.power}`);
    }
    if (card.type === 'miner' && card.payoutInterval) {
      statsToShow.push(`💰 Income: +1 energy per ${card.payoutInterval} turns`);
    }

    statsToShow.forEach(stat => {
      const statText = this.scene.add.text(0, yPos, stat, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: `#${colors.text.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5);
      this.modalContainer!.add(statText);
      yPos += 30;
    });

    // Description
    yPos += 20;
    const descBox = this.scene.add.rectangle(0, yPos + 50, 360, 160, 0x000000, 0.3);
    this.modalContainer.add(descBox);

    const descText = this.scene.add.text(0, yPos + 50, card.description, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: `#${colors.text.toString(16).padStart(6, '0')}`,
      align: 'center',
      wordWrap: { width: 340 },
    }).setOrigin(0.5);
    this.modalContainer.add(descText);

    // Close button
    const closeBtn = this.scene.add.text(0, 220, 'CLOSE', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => {
      closeBtn.setColor(`#${colors.text.toString(16).padStart(6, '0')}`);
      closeBtn.setScale(1.1);
    });

    closeBtn.on('pointerout', () => {
      closeBtn.setColor(`#${colors.textSecondary.toString(16).padStart(6, '0')}`);
      closeBtn.setScale(1);
    });

    closeBtn.on('pointerdown', () => {
      this.closeModal();
    });

    this.modalContainer.add(closeBtn);
  }

  private closeModal(): void {
    if (this.modalContainer) {
      this.modalContainer.destroy(true);
      this.modalContainer = null;
    }
  }

  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      walls: 'WALLS',
      deflections: 'DEFLECTIONS',
      continuous: 'CONTINUOUS ATTACKS',
      projectiles: 'PROJECTILES',
      miners: 'MINERS',
    };
    return labels[category] || category.toUpperCase();
  }

  private getElementColor(element: string): number {
    const colors: Record<string, number> = {
      fire: 0xff6b6b,
      water: 0x4dabf7,
      earth: 0x82c91e,
      air: 0xffd43b,
    };
    return colors[element.toLowerCase()] || 0x868e96;
  }

  private getElementIcon(element: string): string {
    const icons: Record<string, string> = {
      fire: '🔥',
      water: '💧',
      earth: '🌍',
      air: '💨',
    };
    return icons[element.toLowerCase()] || '❓';
  }

  public destroy(): void {
    this.closeModal();

    if (this.container) {
      this.container.destroy(true);
    }
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
