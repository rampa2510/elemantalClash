/**
 * Theme Configuration
 * Defines light and dark color palettes for the game
 */

import { Theme } from '../types/settings';

export const THEMES: Record<'dark' | 'light', Theme> = {
  dark: {
    name: 'dark',
    colors: {
      // Element colors (kept vibrant in dark mode)
      fire: 0xff6b35,
      water: 0x4dabf7,
      earth: 0x8b7355,
      air: 0xb8c5d6,
      lightning: 0xffd43b,
      ice: 0x74c0fc,

      // UI colors
      background: 0x1a1a2e,
      cardBg: 0x2d2d44,
      cardBorder: 0x666666,

      // Text colors
      text: 0xe0e0e0,
      textSecondary: 0xb8c5d6,
      textBright: 0xffffff,

      // Health bar colors
      healthBar: 0x51cf66,
      healthBarMid: 0xffd43b,
      healthBarLow: 0xff6b6b,
      healthBarBg: 0x495057,

      // Energy bar colors
      energyBar: 0xffd43b,
      energyBarBg: 0x495057,

      // Button colors
      buttonPrimary: 0x2d2d44,
      buttonHover: 0x3d3d54,
      buttonPressed: 0x1d1d34,
      buttonDisabled: 0x666666,
      buttonText: 0xffffff,

      // UI accents
      accent: 0x4dabf7,
      accentSecondary: 0xffd43b,
      border: 0x666666,
      shadow: 0x000000,

      // Status colors
      success: 0x51cf66,
      warning: 0xffd43b,
      error: 0xff6b6b,
    },
  },

  light: {
    name: 'light',
    colors: {
      // Element colors (darker, more saturated for visibility on light bg)
      fire: 0xd84315,       // Darker orange-red
      water: 0x1976d2,      // Darker blue
      earth: 0x5d4037,      // Darker brown
      air: 0x546e7a,        // Darker gray-blue
      lightning: 0xf57c00,  // Darker orange-yellow
      ice: 0x0277bd,        // Darker cyan

      // UI colors
      background: 0xf5f5f5,  // Light gray
      cardBg: 0xffffff,      // White
      cardBorder: 0xbdbdbd,  // Medium gray

      // Text colors
      text: 0x212121,        // Almost black
      textSecondary: 0x546e7a, // Dark gray-blue
      textBright: 0x000000,  // Pure black

      // Health bar colors
      healthBar: 0x2e7d32,      // Darker green
      healthBarMid: 0xf57c00,   // Darker orange
      healthBarLow: 0xc62828,   // Darker red
      healthBarBg: 0xe0e0e0,    // Light gray

      // Energy bar colors
      energyBar: 0xf57c00,      // Darker orange-yellow
      energyBarBg: 0xe0e0e0,    // Light gray

      // Button colors
      buttonPrimary: 0xffffff,  // White
      buttonHover: 0xe3f2fd,    // Light blue tint
      buttonPressed: 0xbdbdbd,  // Gray
      buttonDisabled: 0xe0e0e0, // Light gray
      buttonText: 0x212121,     // Dark gray

      // UI accents
      accent: 0x1976d2,         // Dark blue
      accentSecondary: 0xf57c00, // Dark orange
      border: 0xbdbdbd,         // Medium gray
      shadow: 0x000000,         // Black

      // Status colors
      success: 0x2e7d32,        // Darker green
      warning: 0xf57c00,        // Darker orange
      error: 0xc62828,          // Darker red
    },
  },
};

// Export default dark theme colors for backward compatibility
export const DEFAULT_COLORS = THEMES.dark.colors;
