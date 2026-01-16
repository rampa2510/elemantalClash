/**
 * Settings Types
 * Type definitions for game settings and configuration
 */

export interface AudioSettings {
  masterVolume: number; // 0-1
  sfxVolume: number; // 0-1
  musicVolume: number; // 0-1
  muted: boolean;
  musicEnabled: boolean; // Separate music on/off toggle
}

export type ThemeType = 'dark' | 'light';

export interface GameSettings {
  audio: AudioSettings;
  theme: ThemeType;
}

export interface Theme {
  name: ThemeType;
  colors: {
    // Element colors
    fire: number;
    water: number;
    earth: number;
    air: number;
    lightning: number;
    ice: number;

    // UI colors
    background: number;
    cardBg: number;
    cardBorder: number;

    // Text colors
    text: number;
    textSecondary: number;
    textBright: number;

    // Health bar colors
    healthBar: number;
    healthBarMid: number;
    healthBarLow: number;
    healthBarBg: number;

    // Energy bar colors
    energyBar: number;
    energyBarBg: number;

    // Button colors
    buttonPrimary: number;
    buttonHover: number;
    buttonPressed: number;
    buttonDisabled: number;
    buttonText: number;

    // UI accents
    accent: number;
    accentSecondary: number;
    border: number;
    shadow: number;

    // Status colors
    success: number;
    warning: number;
    error: number;
  };
}

export type MusicTrack = 'menu' | 'gameplay';
