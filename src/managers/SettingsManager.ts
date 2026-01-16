/**
 * SettingsManager - Central Settings State Management
 *
 * Manages all game settings with localStorage persistence
 * - Audio settings (music, SFX, volumes, mute)
 * - Theme settings (dark/light mode)
 * - Migration from old audio-only settings
 */

import { GameSettings, AudioSettings, ThemeType } from '../types/settings';
import { audioManager } from '../audio/AudioManager';
import { musicManager } from '../audio/MusicManager';

class SettingsManager {
  private settings: GameSettings;
  private readonly NEW_STORAGE_KEY = 'elemental_clash_settings';
  private readonly OLD_STORAGE_KEY = 'elemental_clash_audio';

  constructor() {
    this.settings = this.loadSettings();
    this.applySettings();
  }

  // ============================================
  // SETTINGS GETTERS
  // ============================================

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  getAudioSettings(): AudioSettings {
    return { ...this.settings.audio };
  }

  getTheme(): ThemeType {
    return this.settings.theme;
  }

  // ============================================
  // AUDIO CONTROLS
  // ============================================

  setMusicEnabled(enabled: boolean): void {
    this.settings.audio.musicEnabled = enabled;

    if (enabled) {
      musicManager.resume();
    } else {
      musicManager.pause();
    }

    this.saveSettings();
    console.log(`🎵 Music ${enabled ? 'enabled' : 'disabled'}`);
  }

  toggleMusicEnabled(): boolean {
    const newValue = !this.settings.audio.musicEnabled;
    this.setMusicEnabled(newValue);
    return newValue;
  }

  isMusicEnabled(): boolean {
    return this.settings.audio.musicEnabled;
  }

  setSFXEnabled(enabled: boolean): void {
    // SFX muting is handled by AudioManager's muted property
    this.settings.audio.muted = !enabled;
    audioManager.setMuted(!enabled);
    this.saveSettings();
    console.log(`🔊 SFX ${enabled ? 'enabled' : 'disabled'}`);
  }

  toggleSFXEnabled(): boolean {
    const newValue = this.settings.audio.muted;
    this.setSFXEnabled(newValue);
    return newValue;
  }

  isSFXEnabled(): boolean {
    return !this.settings.audio.muted;
  }

  setMasterVolume(volume: number): void {
    this.settings.audio.masterVolume = Math.max(0, Math.min(1, volume));
    audioManager.setMasterVolume(this.settings.audio.masterVolume);
    this.saveSettings();
  }

  setSFXVolume(volume: number): void {
    this.settings.audio.sfxVolume = Math.max(0, Math.min(1, volume));
    audioManager.setSFXVolume(this.settings.audio.sfxVolume);
    this.saveSettings();
  }

  setMusicVolume(volume: number): void {
    this.settings.audio.musicVolume = Math.max(0, Math.min(1, volume));
    audioManager.setMusicVolume(this.settings.audio.musicVolume);
    musicManager.setVolume(this.settings.audio.musicVolume);
    this.saveSettings();
  }

  // ============================================
  // THEME CONTROLS
  // ============================================

  setTheme(theme: ThemeType): void {
    this.settings.theme = theme;
    this.saveSettings();
    console.log(`🎨 Theme set to ${theme}`);
  }

  toggleTheme(): ThemeType {
    const newTheme = this.settings.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    return newTheme;
  }

  // ============================================
  // PLAYER NAME (Phase 2)
  // ============================================

  private readonly PLAYER_NAME_KEY = 'elemental_clash_player_name';

  getPlayerName(): string {
    const name = localStorage.getItem(this.PLAYER_NAME_KEY);
    return name && name.trim() ? name.trim() : 'Player';
  }

  setPlayerName(name: string): void {
    const sanitized = name.trim().slice(0, 20); // Max 20 chars
    if (sanitized) {
      localStorage.setItem(this.PLAYER_NAME_KEY, sanitized);
    }
  }

  // ============================================
  // AI DIFFICULTY (Phase 3)
  // ============================================

  private readonly AI_DIFFICULTY_KEY = 'elemental_clash_ai_difficulty';

  getAIDifficulty(): 'easy' | 'medium' | 'hard' {
    const difficulty = localStorage.getItem(this.AI_DIFFICULTY_KEY);
    if (difficulty === 'easy' || difficulty === 'hard') {
      return difficulty;
    }
    return 'medium'; // Default to medium
  }

  setAIDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    localStorage.setItem(this.AI_DIFFICULTY_KEY, difficulty);
    console.log(`🤖 AI difficulty set to ${difficulty}`);
  }

  // ============================================
  // PERSISTENCE
  // ============================================

  private loadSettings(): GameSettings {
    try {
      // Try loading from new settings key first
      const saved = localStorage.getItem(this.NEW_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults for backward compatibility
        return this.mergeWithDefaults(parsed);
      }

      // Fallback: Migrate from old audio-only settings
      const oldAudioSettings = localStorage.getItem(this.OLD_STORAGE_KEY);
      if (oldAudioSettings) {
        console.log('📦 Migrating from old audio settings...');
        const parsed = JSON.parse(oldAudioSettings);
        const migrated: GameSettings = {
          audio: {
            ...this.getDefaults().audio,
            ...parsed,
            musicEnabled: true, // Default to enabled for migration
          },
          theme: 'dark', // Default theme
        };
        // Save migrated settings to new key
        this.saveSettingsInternal(migrated);
        return migrated;
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }

    return this.getDefaults();
  }

  private saveSettings(): void {
    this.saveSettingsInternal(this.settings);
  }

  private saveSettingsInternal(settings: GameSettings): void {
    try {
      localStorage.setItem(this.NEW_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }

  private mergeWithDefaults(partial: Partial<GameSettings>): GameSettings {
    const defaults = this.getDefaults();
    return {
      audio: { ...defaults.audio, ...partial.audio },
      theme: partial.theme || defaults.theme,
    };
  }

  private getDefaults(): GameSettings {
    return {
      audio: {
        masterVolume: 0.7,
        sfxVolume: 1.0,
        musicVolume: 0.5,
        muted: false,
        musicEnabled: true,
      },
      theme: 'dark',
    };
  }

  /**
   * Apply loaded settings to audio managers
   */
  private applySettings(): void {
    // Apply audio settings to AudioManager
    audioManager.setMasterVolume(this.settings.audio.masterVolume);
    audioManager.setSFXVolume(this.settings.audio.sfxVolume);
    audioManager.setMusicVolume(this.settings.audio.musicVolume);
    audioManager.setMuted(this.settings.audio.muted);

    // Apply music volume to MusicManager
    musicManager.setVolume(this.settings.audio.musicVolume);

    console.log('✅ Settings applied:', this.settings);
  }

  /**
   * Reset all settings to defaults
   */
  reset(): void {
    this.settings = this.getDefaults();
    this.applySettings();
    this.saveSettings();
    console.log('🔄 Settings reset to defaults');
  }
}

// Export singleton instance
export const settingsManager = new SettingsManager();
