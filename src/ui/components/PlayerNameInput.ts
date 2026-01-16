/**
 * PlayerNameInput - DOM-based player name input component
 *
 * Displays a text input for the player to enter their name
 * - Positioned above menu buttons
 * - Auto-saves to localStorage with 500ms debounce
 * - Max 20 characters
 * - Styled to match game theme
 */

import { settingsManager } from '../../managers/SettingsManager';

export class PlayerNameInput {
  private container: HTMLDivElement;
  private input: HTMLInputElement;
  private label: HTMLLabelElement;
  private debounceTimer: number | null = null;

  constructor(parentElement: HTMLElement) {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 150px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      font-family: 'Oxanium', Arial, sans-serif;
      text-align: center;
    `;

    this.label = document.createElement('label');
    this.label.textContent = 'Your Name:';
    this.label.style.cssText = `
      display: block;
      color: #e0e0e0;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
      letter-spacing: 1px;
    `;

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.maxLength = 20;
    this.input.value = settingsManager.getPlayerName();
    this.input.placeholder = 'Enter your name...';
    this.input.style.cssText = `
      width: 250px;
      padding: 12px 16px;
      font-size: 16px;
      font-family: 'Oxanium', Arial, sans-serif;
      border: 2px solid #666;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      text-align: center;
      outline: none;
      transition: all 0.2s ease;
    `;

    // Focus styling
    this.input.addEventListener('focus', () => {
      this.input.style.borderColor = '#ffd43b';
      this.input.style.background = 'rgba(0, 0, 0, 0.85)';
    });

    this.input.addEventListener('blur', () => {
      this.input.style.borderColor = '#666';
      this.input.style.background = 'rgba(0, 0, 0, 0.7)';
    });

    // Debounced save on input
    this.input.addEventListener('input', () => this.handleInput());

    this.container.appendChild(this.label);
    this.container.appendChild(this.input);
    parentElement.appendChild(this.container);
  }

  /**
   * Handle input with debounce to avoid excessive localStorage writes
   */
  private handleInput(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      const name = this.input.value;
      settingsManager.setPlayerName(name);
      console.log(`💾 Player name saved: "${name || 'Player'}"`);
    }, 500); // 500ms debounce
  }

  /**
   * Get the current input value
   */
  getValue(): string {
    return this.input.value || 'Player';
  }

  /**
   * Set the input value programmatically
   */
  setValue(name: string): void {
    this.input.value = name;
  }

  /**
   * Show the input
   */
  show(): void {
    this.container.style.display = 'block';
  }

  /**
   * Hide the input
   */
  hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Destroy and remove from DOM
   */
  destroy(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.container.remove();
  }
}
