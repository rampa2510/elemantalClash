/**
 * StatsManager - Tracks game statistics in localStorage
 * Records wins, losses, streaks, and gameplay stats
 */

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  currentStreak: number;
  longestStreak: number;
  totalDamageDealt: number;
  wallsBuilt: number;
  minersPlaced: number;
  favoriteElement: 'fire' | 'water' | 'earth' | 'air' | 'none';
  lastPlayed: number;  // timestamp
}

const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  winRate: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalDamageDealt: 0,
  wallsBuilt: 0,
  minersPlaced: 0,
  favoriteElement: 'none',
  lastPlayed: 0,
};

const STORAGE_KEY = 'elemental_clash_stats';

class StatsManager {
  private stats: GameStats;

  constructor() {
    this.stats = this.loadStats();
  }

  /**
   * Load stats from localStorage
   */
  private loadStats(): GameStats {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_STATS, ...parsed };
      }
    } catch (error) {
      console.error('[StatsManager] Error loading stats:', error);
    }
    return { ...DEFAULT_STATS };
  }

  /**
   * Save stats to localStorage
   */
  private saveStats(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.error('[StatsManager] Error saving stats:', error);
    }
  }

  /**
   * Get current stats
   */
  getStats(): GameStats {
    return { ...this.stats };
  }

  /**
   * Record a game result
   */
  recordGame(result: {
    won: boolean;
    damageDealt: number;
    wallsBuilt: number;
    minersPlaced: number;
    favoriteElement?: 'fire' | 'water' | 'earth' | 'air';
  }): void {
    this.stats.gamesPlayed++;

    if (result.won) {
      this.stats.gamesWon++;
      this.stats.currentStreak++;
      if (this.stats.currentStreak > this.stats.longestStreak) {
        this.stats.longestStreak = this.stats.currentStreak;
      }
    } else {
      this.stats.gamesLost++;
      this.stats.currentStreak = 0;
    }

    // Update win rate
    this.stats.winRate = Math.round((this.stats.gamesWon / this.stats.gamesPlayed) * 100);

    // Update gameplay stats
    this.stats.totalDamageDealt += result.damageDealt;
    this.stats.wallsBuilt += result.wallsBuilt;
    this.stats.minersPlaced += result.minersPlaced;

    // Update favorite element
    if (result.favoriteElement) {
      this.stats.favoriteElement = result.favoriteElement;
    }

    // Update last played timestamp
    this.stats.lastPlayed = Date.now();

    this.saveStats();
  }

  /**
   * Reset all stats
   */
  resetStats(): void {
    this.stats = { ...DEFAULT_STATS };
    this.saveStats();
  }

  /**
   * Get formatted stats for display
   */
  getFormattedStats(): {
    gamesPlayed: string;
    winRate: string;
    streak: string;
    longestStreak: string;
    totalDamage: string;
    wallsBuilt: string;
    minersPlaced: string;
    favoriteElement: string;
  } {
    return {
      gamesPlayed: this.stats.gamesPlayed.toString(),
      winRate: `${this.stats.winRate}%`,
      streak: this.stats.currentStreak > 0 ? `${this.stats.currentStreak} wins` : 'None',
      longestStreak: this.stats.longestStreak > 0 ? `${this.stats.longestStreak} wins` : 'None',
      totalDamage: this.formatNumber(this.stats.totalDamageDealt),
      wallsBuilt: this.formatNumber(this.stats.wallsBuilt),
      minersPlaced: this.formatNumber(this.stats.minersPlaced),
      favoriteElement: this.stats.favoriteElement !== 'none'
        ? this.capitalizeFirst(this.stats.favoriteElement)
        : 'None',
    };
  }

  /**
   * Format large numbers with K/M suffixes
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Check if player has any stats
   */
  hasPlayedBefore(): boolean {
    return this.stats.gamesPlayed > 0;
  }

  /**
   * Get achievement status
   */
  getAchievements(): {
    name: string;
    description: string;
    unlocked: boolean;
    progress?: string;
  }[] {
    return [
      {
        name: 'First Victory',
        description: 'Win your first game',
        unlocked: this.stats.gamesWon >= 1,
      },
      {
        name: 'Veteran',
        description: 'Play 10 games',
        unlocked: this.stats.gamesPlayed >= 10,
        progress: `${Math.min(this.stats.gamesPlayed, 10)}/10`,
      },
      {
        name: 'Win Streak',
        description: 'Win 3 games in a row',
        unlocked: this.stats.longestStreak >= 3,
        progress: `${Math.min(this.stats.longestStreak, 3)}/3`,
      },
      {
        name: 'Master Builder',
        description: 'Build 100 walls',
        unlocked: this.stats.wallsBuilt >= 100,
        progress: `${Math.min(this.stats.wallsBuilt, 100)}/100`,
      },
      {
        name: 'Economic Genius',
        description: 'Place 50 miners',
        unlocked: this.stats.minersPlaced >= 50,
        progress: `${Math.min(this.stats.minersPlaced, 50)}/50`,
      },
    ];
  }
}

// Export singleton instance
export const statsManager = new StatsManager();
