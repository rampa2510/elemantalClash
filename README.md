# Elemental Clash

A turn-based 1v1 card battler built with **Phaser 3**, **TypeScript**, and **Vite**.

## Overview

Elemental Clash is a strategic card game where players draft a deck of elemental spells and defenses to battle against an opponent. The game features a unique draft phase followed by tactical turn-based combat involving energy management, wall placements, and mining resources.

## Features

### 🎮 Core Gameplay
- **Simultaneous Turns**: Both players select their moves at the same time, revealing them simultaneously.
- **Energy System**: Tactical management of energy resources (Max 10, +2 per turn).
- **Drafting Phase**: Strategic 6-round draft to build your deck before battle.

### 🃏 Card Types
- **Attacks**: 
  - *Projectile*: Low cost, direct damage (bypasses walls).
  - *Continuous*: High cost, high damage (blocked by walls).
- **Defenses**:
  - *Wall*: Physical barrier to block continuous attacks.
  - *Deflection*: Reactive defense against projectiles.
- **Miners**:
  - *Resource Generators*: Periodically deal damage or repair defenses.
  - *Risky Investment*: Miners die instantly if your base takes any damage.

### 🛠 Tech Stack
- **Engine**: [Phaser 3](https://phaser.io/)
- **Language**: TypeScript
- **Build Tool**: Vite
- **Audio**: Howler.js / Tone.js

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd Elemental_Clash
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Project Structure
- `src/core`: Core game logic and state management.
- `src/scenes`: Phaser scenes (Boot, Preload, Menu, Game, etc.).
- `src/ui`: UI components and rendering logic.
- `src/config`: Game configuration and constants.

## Rules
For a detailed breakdown of all game rules and validation logic, refer to [ELEMENTAL_CLASH_RULES_VALIDATION_ALGORITHM.md](./ELEMENTAL_CLASH_RULES_VALIDATION_ALGORITHM.md).
