import Phaser from 'phaser';
import { themeManager } from '../../managers/ThemeManager';
import { statsManager } from '../../utils/StatsManager';

/**
 * StatsDisplay - Shows player statistics in a card grid layout
 */
export class StatsDisplay {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private width: number;
  private compact: boolean;

  private container!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number = 500, compact: boolean = false) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.compact = compact;

    this.create();
  }

  private create(): void {
    const colors = themeManager.getColors();
    this.container = this.scene.add.container(this.x, this.y);

    // Dimensions based on compact mode
    const titleOffsetY = this.compact ? -50 : -75;
    const bgHeight = this.compact ? 120 : 180;

    // Background panel
    const bg = this.scene.add.rectangle(0, 0, this.width, bgHeight, 0x000000, 0.3);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(0, titleOffsetY, 'YOUR STATS', {
      fontFamily: 'Arial',
      fontSize: this.compact ? '12px' : '14px',
      color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(title);

    // Get stats
    const stats = statsManager.getFormattedStats();
    const hasPlayed = statsManager.hasPlayedBefore();

    if (!hasPlayed) {
      // Show "No stats yet" message
      const noStatsText = this.scene.add.text(0, 0, 'No games played yet!\nStart your first battle to see stats.', {
        fontFamily: 'Arial',
        fontSize: this.compact ? '12px' : '14px',
        color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
        align: 'center',
      }).setOrigin(0.5);
      this.container.add(noStatsText);
      return;
    }

    // All possible stats
    const allStatData = [
      { label: 'Games', value: stats.gamesPlayed, icon: '🎮' },
      { label: 'Win Rate', value: stats.winRate, icon: '🏆' },
      { label: 'Streak', value: stats.streak, icon: '🔥' },
      { label: 'Best Streak', value: stats.longestStreak, icon: '⚡' },
      { label: 'Damage', value: stats.totalDamage, icon: '💥' },
      { label: 'Walls', value: stats.wallsBuilt, icon: '🧱' },
      { label: 'Miners', value: stats.minersPlaced, icon: '⛏️' },
      { label: 'Element', value: stats.favoriteElement, icon: this.getElementIcon(stats.favoriteElement) },
    ];

    // In compact mode, show only top 4 stats (1 row)
    const statData = this.compact ? allStatData.slice(0, 4) : allStatData;

    const cardWidth = 110;
    const cardHeight = 55;
    const cardSpacing = 10;
    const cols = 4;
    const rows = this.compact ? 1 : 2;

    const gridWidth = (cardWidth * cols) + (cardSpacing * (cols - 1));
    const startX = -gridWidth / 2 + cardWidth / 2;
    const startY = this.compact ? -10 : -20;

    statData.forEach((stat, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      const cardX = startX + (col * (cardWidth + cardSpacing));
      const cardY = startY + (row * (cardHeight + cardSpacing));

      this.createStatCard(cardX, cardY, cardWidth, cardHeight, stat.label, stat.value, stat.icon);
    });
  }

  private createStatCard(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string,
    icon: string
  ): void {
    const colors = themeManager.getColors();

    // Card background
    const card = this.scene.add.rectangle(x, y, width, height, 0x000000, 0.5);
    card.setStrokeStyle(1, colors.textSecondary, 0.3);
    this.container.add(card);

    // Icon
    const iconText = this.scene.add.text(x - width / 2 + 18, y - 10, icon, {
      fontFamily: 'Arial',
      fontSize: '16px',
    }).setOrigin(0.5);
    this.container.add(iconText);

    // Label
    const labelText = this.scene.add.text(x, y - 12, label, {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: `#${colors.textSecondary.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
    this.container.add(labelText);

    // Value
    const valueText = this.scene.add.text(x, y + 8, value, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: `#${colors.text.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(valueText);
  }

  private getElementIcon(element: string): string {
    const iconMap: Record<string, string> = {
      'Fire': '🔥',
      'Water': '💧',
      'Earth': '🌍',
      'Air': '💨',
      'None': '❓',
    };
    return iconMap[element] || '❓';
  }

  public destroy(): void {
    if (this.container) {
      this.container.destroy(true);
    }
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
