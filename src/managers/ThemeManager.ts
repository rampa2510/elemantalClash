/**
 * ThemeManager - Theme Switching System
 *
 * Manages light/dark theme switching with event broadcasting
 * - Provides current theme colors to all scenes
 * - Updates Phaser canvas background color
 * - Broadcasts theme changes via game events
 * - Persistent theme selection via SettingsManager
 */

import { ThemeType, Theme } from '../types/settings';
import { THEMES } from '../config/themes';
import { gameEvents } from '../utils/EventEmitter';

class ThemeManager {
  private currentTheme: ThemeType = 'dark';

  constructor() {
    // Default to dark theme
    this.currentTheme = 'dark';
  }

  /**
   * Set current theme
   */
  setTheme(theme: ThemeType): void {
    if (this.currentTheme === theme) return;

    this.currentTheme = theme;
    this.updateCanvasBackground();
    this.broadcastThemeChange();

    console.log(`🎨 Theme changed to ${theme}`);
  }

  /**
   * Get current theme
   */
  getTheme(): ThemeType {
    return this.currentTheme;
  }

  /**
   * Get current theme colors
   */
  getColors(): Theme['colors'] {
    return THEMES[this.currentTheme].colors;
  }

  /**
   * Get specific theme colors (for preview/comparison)
   */
  getThemeColors(theme: ThemeType): Theme['colors'] {
    return THEMES[theme].colors;
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): ThemeType {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    return newTheme;
  }

  /**
   * Update Phaser canvas background color
   * Note: Does NOT affect HTML body background (remains #1a1a2e)
   */
  private updateCanvasBackground(): void {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const color = THEMES[this.currentTheme].colors.background;
      const hexColor = `#${color.toString(16).padStart(6, '0')}`;
      canvas.style.backgroundColor = hexColor;
    }
  }

  /**
   * Broadcast theme change event to all scenes
   */
  private broadcastThemeChange(): void {
    gameEvents.emit('THEME_CHANGED', {
      theme: this.currentTheme,
      colors: this.getColors(),
    });
  }
}

// Export singleton instance
export const themeManager = new ThemeManager();
