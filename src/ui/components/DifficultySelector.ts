/**
 * DifficultySelector - DOM-based AI difficulty selector
 *
 * Displays 3 difficulty buttons for AI opponent:
 * - 🟢 Easy (90% player win rate)
 * - 🟡 Medium (balanced, current AI)
 * - 🔴 Hard (challenging AI)
 *
 * Positioned below player name input in MenuScene
 */

import { settingsManager } from '../../managers/SettingsManager';

type Difficulty = 'easy' | 'medium' | 'hard';

export class DifficultySelector {
  private container: HTMLDivElement;
  private buttons: Map<Difficulty, HTMLButtonElement> = new Map();
  private currentDifficulty: Difficulty;

  constructor(parentElement: HTMLElement) {
    this.currentDifficulty = settingsManager.getAIDifficulty();

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 230px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      font-family: 'Oxanium', Arial, sans-serif;
      text-align: center;
    `;

    const label = document.createElement('div');
    label.textContent = 'AI Difficulty:';
    label.style.cssText = `
      color: #e0e0e0;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
      letter-spacing: 1px;
    `;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: center;
    `;

    this.createButton('easy', '🟢 Easy', buttonContainer);
    this.createButton('medium', '🟡 Medium', buttonContainer);
    this.createButton('hard', '🔴 Hard', buttonContainer);

    this.container.appendChild(label);
    this.container.appendChild(buttonContainer);
    parentElement.appendChild(this.container);

    this.updateButtonStates();
  }

  /**
   * Create a difficulty button
   */
  private createButton(
    difficulty: Difficulty,
    label: string,
    container: HTMLDivElement
  ): void {
    const button = document.createElement('button');
    button.textContent = label;
    button.style.cssText = `
      padding: 10px 20px;
      font-size: 14px;
      font-family: 'Oxanium', Arial, sans-serif;
      font-weight: 600;
      border: 2px solid #666;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    `;

    button.addEventListener('mouseenter', () => {
      if (this.currentDifficulty !== difficulty) {
        button.style.background = 'rgba(255, 255, 255, 0.1)';
        button.style.transform = 'scale(1.05)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (this.currentDifficulty !== difficulty) {
        button.style.background = 'rgba(0, 0, 0, 0.7)';
        button.style.transform = 'scale(1)';
      }
    });

    button.addEventListener('click', () => {
      this.currentDifficulty = difficulty;
      settingsManager.setAIDifficulty(difficulty);
      this.updateButtonStates();
    });

    this.buttons.set(difficulty, button);
    container.appendChild(button);
  }

  /**
   * Update button visual states based on selection
   */
  private updateButtonStates(): void {
    this.buttons.forEach((button, difficulty) => {
      if (difficulty === this.currentDifficulty) {
        // Selected state
        button.style.background = 'rgba(100, 200, 255, 0.3)';
        button.style.borderColor = '#5ac8fa';
        button.style.boxShadow = '0 0 15px rgba(90, 200, 250, 0.5)';
      } else {
        // Unselected state
        button.style.background = 'rgba(0, 0, 0, 0.7)';
        button.style.borderColor = '#666';
        button.style.boxShadow = 'none';
      }
    });
  }

  /**
   * Get current difficulty
   */
  getDifficulty(): Difficulty {
    return this.currentDifficulty;
  }

  /**
   * Set difficulty programmatically
   */
  setDifficulty(difficulty: Difficulty): void {
    this.currentDifficulty = difficulty;
    settingsManager.setAIDifficulty(difficulty);
    this.updateButtonStates();
  }

  /**
   * Show the selector
   */
  show(): void {
    this.container.style.display = 'block';
  }

  /**
   * Hide the selector
   */
  hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Destroy and remove from DOM
   */
  destroy(): void {
    this.container.remove();
    this.buttons.clear();
  }
}
