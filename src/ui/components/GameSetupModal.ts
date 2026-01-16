/**
 * GameSetupModal - Pre-game configuration modal
 *
 * Shows player name input and AI difficulty selector BEFORE starting a game.
 * Appears when user clicks PLAY or QUICK PLAY, keeping main menu clean.
 *
 * Design: Modern modal with backdrop blur, smooth animations
 */

import { settingsManager } from '../../managers/SettingsManager';

export interface GameSetupConfig {
  onConfirm: (playerName: string, difficulty: 'easy' | 'medium' | 'hard') => void;
  onCancel: () => void;
  currentName?: string;
  currentDifficulty?: 'easy' | 'medium' | 'hard';
}

export class GameSetupModal {
  private overlay: HTMLDivElement;
  private modal: HTMLDivElement;
  private nameInput: HTMLInputElement;
  private selectedDifficulty: 'easy' | 'medium' | 'hard';
  private config: GameSetupConfig;
  private difficultyCards: Map<string, HTMLDivElement> = new Map();

  constructor(config: GameSetupConfig) {
    this.config = config;
    this.selectedDifficulty = config.currentDifficulty || settingsManager.getAIDifficulty();

    // Create overlay
    this.overlay = this.createOverlay();

    // Create modal
    this.modal = this.createModal();

    // Create name input
    this.nameInput = this.createNameInput();

    // Build the modal
    this.buildModal();

    // Show with animation
    this.show();
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 300ms ease;
    `;

    // Click overlay to cancel
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.handleCancel();
      }
    });

    return overlay;
  }

  private createModal(): HTMLDivElement {
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
      border: 2px solid rgba(255, 212, 59, 0.4);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
      padding: 40px;
      width: 90%;
      max-width: 500px;
      font-family: 'Oxanium', Arial, sans-serif;
      transform: translateY(50px) scale(0.9);
      opacity: 0;
      transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
    `;

    return modal;
  }

  private createNameInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    const savedName = this.config.currentName || settingsManager.getPlayerName();
    input.value = savedName;
    input.placeholder = 'Enter your name...';
    console.log(`📝 Name input initialized with: "${savedName}"`);

    input.style.cssText = `
      width: 100%;
      padding: 16px 20px;
      font-size: 18px;
      font-family: 'Oxanium', Arial, sans-serif;
      font-weight: 500;
      border: 2px solid #666;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      text-align: center;
      outline: none;
      transition: all 0.2s ease;
      margin-bottom: 30px;
    `;

    input.addEventListener('focus', () => {
      input.style.borderColor = '#ffd43b';
      input.style.background = 'rgba(0, 0, 0, 0.8)';
      input.style.boxShadow = '0 0 20px rgba(255, 212, 59, 0.3)';
    });

    input.addEventListener('blur', () => {
      input.style.borderColor = '#666';
      input.style.background = 'rgba(0, 0, 0, 0.6)';
      input.style.boxShadow = 'none';
    });

    return input;
  }

  private buildModal(): void {
    // Title
    const title = document.createElement('h2');
    title.textContent = 'Prepare for Battle';
    title.style.cssText = `
      font-size: 32px;
      font-weight: 700;
      color: #ffd43b;
      text-align: center;
      margin: 0 0 10px 0;
      text-shadow: 0 2px 10px rgba(255, 212, 59, 0.5);
      letter-spacing: 1px;
    `;
    this.modal.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Configure your game settings';
    subtitle.style.cssText = `
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
      text-align: center;
      margin: 0 0 30px 0;
    `;
    this.modal.appendChild(subtitle);

    // Name section
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Your Name';
    nameLabel.style.cssText = `
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #e0e0e0;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    this.modal.appendChild(nameLabel);
    this.modal.appendChild(this.nameInput);

    // Difficulty section
    const difficultyLabel = document.createElement('label');
    difficultyLabel.textContent = 'AI Difficulty';
    difficultyLabel.style.cssText = `
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #e0e0e0;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    this.modal.appendChild(difficultyLabel);

    // Difficulty cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 30px;
    `;

    const difficulties: Array<{
      key: 'easy' | 'medium' | 'hard';
      label: string;
      emoji: string;
      description: string;
      color: string;
    }> = [
      {
        key: 'easy',
        label: 'Easy',
        emoji: '🟢',
        description: '90% win rate',
        color: '#4caf50',
      },
      {
        key: 'medium',
        label: 'Medium',
        emoji: '🟡',
        description: 'Balanced',
        color: '#ffc107',
      },
      {
        key: 'hard',
        label: 'Hard',
        emoji: '🔴',
        description: 'Challenging',
        color: '#f44336',
      },
    ];

    difficulties.forEach((diff) => {
      const card = this.createDifficultyCard(diff);
      this.difficultyCards.set(diff.key, card);
      cardsContainer.appendChild(card);
    });

    this.modal.appendChild(cardsContainer);

    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: center;
    `;

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 14px 30px;
      font-size: 16px;
      font-family: 'Oxanium', Arial, sans-serif;
      font-weight: 600;
      border: 2px solid #666;
      border-radius: 10px;
      background: transparent;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    `;
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.borderColor = '#999';
      cancelBtn.style.transform = 'scale(1.05)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.borderColor = '#666';
      cancelBtn.style.transform = 'scale(1)';
    });
    cancelBtn.addEventListener('click', () => this.handleCancel());
    buttonsContainer.appendChild(cancelBtn);

    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Start Game';
    confirmBtn.type = 'button'; // Prevent form submission
    confirmBtn.style.cssText = `
      padding: 14px 40px;
      font-size: 16px;
      font-family: 'Oxanium', Arial, sans-serif;
      font-weight: 700;
      border: 2px solid #ffd43b;
      border-radius: 10px;
      background: linear-gradient(135deg, #ffd43b 0%, #ffb300 100%);
      color: #1a1a2e;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
      box-shadow: 0 4px 15px rgba(255, 212, 59, 0.4);
      user-select: none;
    `;
    confirmBtn.addEventListener('mouseenter', () => {
      confirmBtn.style.transform = 'scale(1.05) translateY(-2px)';
      confirmBtn.style.boxShadow = '0 6px 20px rgba(255, 212, 59, 0.6)';
    });
    confirmBtn.addEventListener('mouseleave', () => {
      confirmBtn.style.transform = 'scale(1)';
      confirmBtn.style.boxShadow = '0 4px 15px rgba(255, 212, 59, 0.4)';
    });
    // Use mousedown for more reliable detection
    confirmBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('✅ Start Game button clicked');
      this.handleConfirm();
    });
    buttonsContainer.appendChild(confirmBtn);

    this.modal.appendChild(buttonsContainer);

    // Update initial selection
    this.updateDifficultySelection();
  }

  private createDifficultyCard(diff: {
    key: 'easy' | 'medium' | 'hard';
    label: string;
    emoji: string;
    description: string;
    color: string;
  }): HTMLDivElement {
    const card = document.createElement('div');
    card.style.cssText = `
      padding: 20px 10px;
      border: 2px solid #666;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.4);
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      user-select: none;
    `;

    // Set data attribute for easier debugging
    card.setAttribute('data-difficulty', diff.key);

    const emoji = document.createElement('div');
    emoji.textContent = diff.emoji;
    emoji.style.cssText = `
      font-size: 36px;
      margin-bottom: 8px;
      pointer-events: none;
    `;

    const label = document.createElement('div');
    label.textContent = diff.label;
    label.style.cssText = `
      font-size: 16px;
      font-weight: 700;
      color: white;
      margin-bottom: 4px;
      pointer-events: none;
    `;

    const description = document.createElement('div');
    description.textContent = diff.description;
    description.style.cssText = `
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      pointer-events: none;
    `;

    card.appendChild(emoji);
    card.appendChild(label);
    card.appendChild(description);

    // Use mousedown for more reliable click detection
    card.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`🎮 Difficulty selected: ${diff.key}`);
      this.selectedDifficulty = diff.key;
      this.updateDifficultySelection();
    });

    card.addEventListener('mouseenter', () => {
      if (this.selectedDifficulty !== diff.key) {
        card.style.borderColor = diff.color;
        card.style.transform = 'translateY(-4px)';
      }
    });

    card.addEventListener('mouseleave', () => {
      if (this.selectedDifficulty !== diff.key) {
        card.style.borderColor = '#666';
        card.style.transform = 'translateY(0)';
      }
    });

    return card;
  }

  private updateDifficultySelection(): void {
    const colors = {
      easy: '#4caf50',
      medium: '#ffc107',
      hard: '#f44336',
    };

    this.difficultyCards.forEach((card, key) => {
      if (key === this.selectedDifficulty) {
        card.style.borderColor = colors[key];
        card.style.background = `rgba(${key === 'easy' ? '76, 175, 80' : key === 'medium' ? '255, 193, 7' : '244, 67, 54'}, 0.2)`;
        card.style.boxShadow = `0 0 20px rgba(${key === 'easy' ? '76, 175, 80' : key === 'medium' ? '255, 193, 7' : '244, 67, 54'}, 0.4)`;
        card.style.transform = 'translateY(-4px)';
      } else {
        card.style.borderColor = '#666';
        card.style.background = 'rgba(0, 0, 0, 0.4)';
        card.style.boxShadow = 'none';
        card.style.transform = 'translateY(0)';
      }
    });
  }

  private show(): void {
    document.body.appendChild(this.overlay);
    this.overlay.appendChild(this.modal);

    // Focus name input
    setTimeout(() => {
      this.nameInput.focus();
      this.nameInput.select();
    }, 100);

    // Trigger animations
    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1';
      this.modal.style.transform = 'translateY(0) scale(1)';
      this.modal.style.opacity = '1';
    });
  }

  private hide(callback: () => void): void {
    this.overlay.style.opacity = '0';
    this.modal.style.transform = 'translateY(50px) scale(0.9)';
    this.modal.style.opacity = '0';

    setTimeout(() => {
      this.overlay.remove();
      callback();
    }, 300);
  }

  private handleConfirm(): void {
    const playerName = this.nameInput.value.trim() || 'Player';

    console.log('🎯 Game Setup Confirmed:');
    console.log(`   Player Name: "${playerName}"`);
    console.log(`   AI Difficulty: ${this.selectedDifficulty}`);

    // Save to settings
    settingsManager.setPlayerName(playerName);
    settingsManager.setAIDifficulty(this.selectedDifficulty);

    console.log('💾 Settings saved to localStorage');
    console.log(`   Verified name: "${settingsManager.getPlayerName()}"`);
    console.log(`   Verified difficulty: ${settingsManager.getAIDifficulty()}`);

    this.hide(() => {
      console.log('🚀 Calling onConfirm callback...');
      this.config.onConfirm(playerName, this.selectedDifficulty);
    });
  }

  private handleCancel(): void {
    this.hide(() => {
      this.config.onCancel();
    });
  }

  /**
   * Public method to close modal programmatically
   */
  public close(): void {
    this.handleCancel();
  }
}
