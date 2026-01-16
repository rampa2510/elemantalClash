# ELEMENTAL CLASH - Complete Rules Validation Algorithm
## Reference Document for Claude Code

This document defines EVERY rule, constraint, and edge case. Use this to validate your implementation.

---

# TABLE OF CONTENTS

1. [Core Game Constants](#1-core-game-constants)
2. [Card System Rules](#2-card-system-rules)
3. [Energy System Rules](#3-energy-system-rules)
4. [Draft System Rules](#4-draft-system-rules)
5. [Hand & Deck Rules](#5-hand--deck-rules)
6. [Turn System Rules](#6-turn-system-rules)
7. [Card Selection Rules](#7-card-selection-rules)
8. [Wall Rules](#8-wall-rules)
9. [Miner Rules](#9-miner-rules)
10. [Attack Resolution Rules](#10-attack-resolution-rules)
11. [Defense Resolution Rules](#11-defense-resolution-rules)
12. [Damage Rules](#12-damage-rules)
13. [Victory & Loss Rules](#13-victory--loss-rules)
14. [Validation Functions](#14-validation-functions)
15. [Edge Case Handling](#15-edge-case-handling)
16. [State Machine](#16-state-machine)
17. [Test Cases](#17-test-cases)

---

# 1. CORE GAME CONSTANTS

```typescript
// ==================== PLAYER STATS ====================
const BASE_HP = 20;
const START_ENERGY = 5;
const MAX_ENERGY = 10;
const ENERGY_PER_TURN = 2;

// ==================== TIMING ====================
const TURN_TIMER_SECONDS = 10;
const DRAFT_TIMER_SHORT = 12;      // Rounds 1-4
const DRAFT_TIMER_LONG = 15;       // Rounds 5-6
const TIP_ROTATION_SECONDS = 4;
const REVEAL_DELAY_MS = 1500;      // Pause before showing results
const AUTO_ADVANCE_DELAY_MS = 2000; // After selection feedback

// ==================== DECK & HAND ====================
const DECK_SIZE = 6;
const HAND_SIZE = 4;
const DRAFT_ROUNDS = 6;
const OPTIONS_PER_ROUND = 4;

// ==================== ATTACKS ====================
const CONTINUOUS_COST = 5;
const CONTINUOUS_DAMAGE = 8;
const PROJECTILE_COST = 3;
const PROJECTILE_DAMAGE = 3;

// ==================== DEFENSES ====================
const WALL_COST = 2;
const WALL_HP = 12;
const WALL_DECAY_PER_TURN = 4;
const DEFLECTION_COST = 1;
const DEFLECTION_REDUCTION = 2;    // Reduces continuous by 2

// ==================== MINERS ====================
const DEFLECTION_MINER_COST = 2;
const PROJECTILE_MINER_COST = 3;
const PROJECTILE_MINER_INTERVAL = 2;
const CONTINUOUS_MINER_COST = 5;
const CONTINUOUS_MINER_INTERVAL = 3;
const REPAIR_MINER_COST = 3;
const REPAIR_MINER_INTERVAL = 2;
```

---

# 2. CARD SYSTEM RULES

## 2.1 Card Types

```typescript
enum CardType {
  ATTACK = 'attack',
  DEFENSE = 'defense',
  MINER = 'miner'
}

enum CardSubtype {
  // Attacks
  CONTINUOUS = 'continuous',
  PROJECTILE = 'projectile',
  
  // Defenses
  WALL = 'wall',
  DEFLECTION = 'deflection',
  
  // Miners
  DEFLECTION_MINER = 'deflection_miner',
  PROJECTILE_MINER = 'projectile_miner',
  CONTINUOUS_MINER = 'continuous_miner',
  REPAIR_MINER = 'repair_miner'
}

enum Element {
  FIRE = 'fire',
  WATER = 'water',
  EARTH = 'earth',
  AIR = 'air',
  ICE = 'ice',
  LIGHTNING = 'lightning'
}
```

## 2.2 Card Rules

```
RULE C1: Elements are COSMETIC ONLY
  - Fire Wall and Water Wall have identical mechanics
  - Element only affects visuals/animations
  - NO elemental strengths/weaknesses in v1

RULE C2: Card subtypes define behavior
  - CardSubtype determines ALL mechanical behavior
  - Two cards with same subtype behave identically

RULE C3: Card costs are fixed
  - Cost is determined by subtype, not element
  - All Walls cost 2, all Projectiles cost 3, etc.
```

---

# 3. ENERGY SYSTEM RULES

```
RULE E1: Starting Energy
  - Each player starts with exactly 5 energy
  - VALIDATE: player.energy === 5 at game start

RULE E2: Maximum Energy
  - Energy cannot exceed 10
  - VALIDATE: player.energy <= 10 always

RULE E3: Energy Regeneration
  - Gain +2 energy at START of each turn (after turn 1)
  - Applied BEFORE card selection
  - Capped at maximum (10)
  - FORMULA: player.energy = Math.min(10, player.energy + 2)

RULE E4: Energy Spending
  - Card cost deducted ONLY if card is valid and played
  - Deducted AFTER reveal, BEFORE resolution
  - VALIDATE: player.energy >= card.cost before deduction

RULE E5: Cannot Play Unaffordable Cards
  - Card selection UI must DISABLE cards player cannot afford
  - If somehow selected, treat as invalid (auto-select valid card)
  - VALIDATE: canPlayCard(player, card) before accepting selection
```

## Energy Validation Function

```typescript
function validateEnergy(player: Player): ValidationResult {
  const errors: string[] = [];
  
  if (player.energy < 0) {
    errors.push('Energy cannot be negative');
  }
  
  if (player.energy > MAX_ENERGY) {
    errors.push(`Energy cannot exceed ${MAX_ENERGY}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function canAffordCard(player: Player, card: Card): boolean {
  return player.energy >= card.cost;
}

function getAffordableCards(player: Player): Card[] {
  return player.hand.filter(card => canAffordCard(player, card));
}
```

---

# 4. DRAFT SYSTEM RULES

## 4.1 Draft Structure Rules

```
RULE D1: Exactly 6 Rounds
  - Draft has exactly 6 rounds
  - Cannot skip rounds
  - Cannot go back to previous rounds

RULE D2: Round Categories (Fixed Order)
  Round 1: Wall (pick 1 of 4 elements)
  Round 2: Deflection (pick 1 of 4 elements)
  Round 3: Continuous Attack (pick 1 of 4 elements)
  Round 4: Projectile Attack (pick 1 of 4 elements)
  Round 5: Miner (pick 1 of 4 DIFFERENT types)
  Round 6: Wildcard (pick 1 of 4 mixed options)

RULE D3: Options Per Round
  - Exactly 4 options shown each round
  - Player must pick exactly 1
  - NO PASSING - must always pick a card

RULE D4: Timer Per Round
  - Rounds 1-4: 12 seconds
  - Rounds 5-6: 15 seconds
  - Timer starts when options are displayed

RULE D5: Auto-Pick on Timeout
  - If timer reaches 0, system picks randomly
  - Random pick from the 4 available options
  - Player CANNOT have empty slot
  - Show "AUTO-SELECTED!" feedback
```

## 4.2 Draft Validation

```typescript
function validateDraftRound(
  round: number, 
  options: Card[], 
  selectedCard: Card
): ValidationResult {
  const errors: string[] = [];
  
  // Must be valid round
  if (round < 1 || round > DRAFT_ROUNDS) {
    errors.push(`Invalid round number: ${round}`);
  }
  
  // Must have exactly 4 options
  if (options.length !== OPTIONS_PER_ROUND) {
    errors.push(`Must have ${OPTIONS_PER_ROUND} options, got ${options.length}`);
  }
  
  // Selected card must be from options
  if (!options.find(c => c.id === selectedCard.id)) {
    errors.push('Selected card not in available options');
  }
  
  // Validate category matches round
  const expectedCategory = getDraftRoundCategory(round);
  if (!cardMatchesCategory(selectedCard, expectedCategory)) {
    errors.push(`Card does not match round category: ${expectedCategory}`);
  }
  
  return { valid: errors.length === 0, errors };
}

function getDraftRoundCategory(round: number): string {
  const categories = ['wall', 'deflection', 'continuous', 'projectile', 'miner', 'wildcard'];
  return categories[round - 1];
}
```

## 4.3 Auto-Pick Algorithm

```typescript
function handleDraftTimeout(draftState: DraftState): Card {
  // RULE: Must ALWAYS pick a card, never pass
  
  const options = draftState.currentOptions;
  
  // Validate we have options
  if (options.length === 0) {
    throw new Error('INVALID STATE: No options available for auto-pick');
  }
  
  // Random selection
  const randomIndex = Math.floor(Math.random() * options.length);
  const selectedCard = options[randomIndex];
  
  // Log for debugging
  console.log(`AUTO-PICK: Round ${draftState.currentRound}, selected ${selectedCard.name}`);
  
  return selectedCard;
}
```

## 4.4 Draft Completion Validation

```typescript
function validateCompletedDraft(deck: Card[]): ValidationResult {
  const errors: string[] = [];
  
  // Must have exactly 6 cards
  if (deck.length !== DECK_SIZE) {
    errors.push(`Deck must have ${DECK_SIZE} cards, got ${deck.length}`);
  }
  
  // Must have required card types
  const hasWall = deck.some(c => c.subtype === 'wall');
  const hasDeflection = deck.some(c => c.subtype === 'deflection');
  const hasContinuous = deck.some(c => c.subtype === 'continuous');
  const hasProjectile = deck.some(c => c.subtype === 'projectile');
  const hasMiner = deck.some(c => c.type === 'miner');
  
  if (!hasWall) errors.push('Deck missing Wall');
  if (!hasDeflection) errors.push('Deck missing Deflection');
  if (!hasContinuous) errors.push('Deck missing Continuous attack');
  if (!hasProjectile) errors.push('Deck missing Projectile attack');
  if (!hasMiner) errors.push('Deck missing Miner');
  
  return { valid: errors.length === 0, errors };
}
```

---

# 5. HAND & DECK RULES

## 5.1 Hand Rules

```
RULE H1: Hand Size
  - Hand contains exactly 4 cards during battle
  - Hand is refilled at END of each turn

RULE H2: All Cards Always Available (NOT like Clash Royale)
  - Player can see ALL 4 cards in hand
  - Player can play ANY affordable card from hand
  - NO card rotation/cycling mechanic
  - NO "next card" queue

RULE H3: Card Persistence
  - Playing a card removes it from hand
  - Hand is refilled from deck at turn end
  - If deck is empty, hand may have fewer than 4 cards

RULE H4: Hand Refill
  - At END of turn, draw cards until hand has 4 (or deck empty)
  - Draw order is from shuffled deck
```

## 5.2 Deck Rules

```
RULE DK1: Deck Size
  - Deck starts with 6 cards (from draft)
  - 4 cards go to hand, 2 remain in deck

RULE DK2: Deck Shuffle
  - Deck is shuffled once at game start
  - No reshuffling during game

RULE DK3: Deck Exhaustion
  - When deck is empty, no more draws
  - Hand may have 0-4 cards
  - Player can still play from remaining hand

RULE DK4: Played Cards
  - Played cards are REMOVED from game (no discard pile)
  - Cards do NOT return to deck
```

## 5.3 Hand Validation

```typescript
function validateHand(player: Player): ValidationResult {
  const errors: string[] = [];
  
  // Hand cannot exceed 4
  if (player.hand.length > HAND_SIZE) {
    errors.push(`Hand exceeds max size: ${player.hand.length} > ${HAND_SIZE}`);
  }
  
  // All cards in hand must be valid
  for (const card of player.hand) {
    if (!isValidCard(card)) {
      errors.push(`Invalid card in hand: ${card.id}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

function refillHand(player: Player): void {
  while (player.hand.length < HAND_SIZE && player.deck.length > 0) {
    const card = player.deck.pop();
    if (card) {
      player.hand.push(card);
    }
  }
}
```

---

# 6. TURN SYSTEM RULES

## 6.1 Turn Structure

```
RULE T1: Simultaneous Selection
  - Both players select cards at the SAME time
  - Neither sees opponent's selection until reveal
  - 10-second timer for selection

RULE T2: Turn Phases (EXACT ORDER)
  Phase 1: ENERGY - Both gain +2 energy (max 10)
  Phase 2: SELECTION - Both select cards (10 seconds)
  Phase 3: REVEAL - Both cards shown simultaneously
  Phase 4: VALIDATION - Check cards are affordable
  Phase 5: DEDUCTION - Deduct energy costs
  Phase 6: PLACEMENT - Place walls and miners
  Phase 7: RESOLUTION - Resolve attacks
  Phase 8: PAYOUTS - Process miner payouts
  Phase 9: DECAY - Wall HP decay (-4)
  Phase 10: DEATH_CHECK - Remove dead walls
  Phase 11: VICTORY_CHECK - Check win/loss
  Phase 12: CLEANUP - Clear deflection, refill hands
  Phase 13: ADVANCE - Increment turn counter

RULE T3: No Skipping Phases
  - Every phase must execute in order
  - Cannot skip phases even if "nothing happens"

RULE T4: Turn Counter
  - Starts at 1
  - Increments at END of turn (Phase 13)
  - Used for miner payout timing
```

## 6.2 Turn Phase Validation

```typescript
enum TurnPhase {
  ENERGY = 'energy',
  SELECTION = 'selection',
  REVEAL = 'reveal',
  VALIDATION = 'validation',
  DEDUCTION = 'deduction',
  PLACEMENT = 'placement',
  RESOLUTION = 'resolution',
  PAYOUTS = 'payouts',
  DECAY = 'decay',
  DEATH_CHECK = 'death_check',
  VICTORY_CHECK = 'victory_check',
  CLEANUP = 'cleanup',
  ADVANCE = 'advance'
}

const PHASE_ORDER: TurnPhase[] = [
  TurnPhase.ENERGY,
  TurnPhase.SELECTION,
  TurnPhase.REVEAL,
  TurnPhase.VALIDATION,
  TurnPhase.DEDUCTION,
  TurnPhase.PLACEMENT,
  TurnPhase.RESOLUTION,
  TurnPhase.PAYOUTS,
  TurnPhase.DECAY,
  TurnPhase.DEATH_CHECK,
  TurnPhase.VICTORY_CHECK,
  TurnPhase.CLEANUP,
  TurnPhase.ADVANCE
];

function validatePhaseTransition(current: TurnPhase, next: TurnPhase): boolean {
  const currentIndex = PHASE_ORDER.indexOf(current);
  const nextIndex = PHASE_ORDER.indexOf(next);
  
  // Must go to next phase in order (or wrap to first)
  return nextIndex === currentIndex + 1 || 
         (current === TurnPhase.ADVANCE && next === TurnPhase.ENERGY);
}
```

---

# 7. CARD SELECTION RULES

## 7.1 Selection Rules

```
RULE S1: Must Select a Card (NO PASSING)
  - Player MUST select a card each turn
  - "Pass" is NOT a valid action
  - If timer expires, auto-select kicks in

RULE S2: Can Only Select Affordable Cards
  - UI must disable unaffordable cards (grayed out)
  - Cannot select a card with cost > current energy
  - VALIDATE before accepting selection

RULE S3: Auto-Select on Timeout
  - If timer reaches 0 with no selection:
    1. Get list of affordable cards
    2. If affordable cards exist: pick random affordable card
    3. If NO affordable cards: pick cheapest card (will fail validation)
  - NEVER leave selection empty

RULE S4: Selection Lock-In
  - Player can change selection until timer expires
  - "Lock In" button confirms early (optional)
  - Once both locked OR timer expires, proceed to reveal

RULE S5: Hot-Seat Selection (Same Device)
  - Player 1 selects, screen hides, Player 2 selects
  - "Pass device to Player 2" prompt between
  - Cannot see opponent's selection
```

## 7.2 Auto-Select Algorithm

```typescript
function autoSelectCard(player: Player): Card {
  // RULE: Must ALWAYS return a card, never null
  
  const hand = player.hand;
  const energy = player.energy;
  
  // Get affordable cards
  const affordableCards = hand.filter(card => card.cost <= energy);
  
  if (affordableCards.length > 0) {
    // Pick random affordable card
    const randomIndex = Math.floor(Math.random() * affordableCards.length);
    return affordableCards[randomIndex];
  }
  
  // NO affordable cards - pick cheapest (will be validated as invalid later)
  // This handles edge case where player has 0 energy
  const sortedByCost = [...hand].sort((a, b) => a.cost - b.cost);
  return sortedByCost[0];
}

function validateSelection(player: Player, card: Card): ValidationResult {
  const errors: string[] = [];
  
  // Card must be in hand
  if (!player.hand.find(c => c.id === card.id)) {
    errors.push('Selected card not in hand');
  }
  
  // Must be affordable
  if (card.cost > player.energy) {
    errors.push(`Cannot afford card: cost ${card.cost} > energy ${player.energy}`);
  }
  
  // Cannot place wall if wall exists
  if (card.subtype === 'wall' && player.wall !== null) {
    errors.push('Cannot place wall: wall already exists');
  }
  
  // Cannot place miner if miner exists
  if (card.type === 'miner' && player.miner !== null) {
    errors.push('Cannot place miner: miner already exists');
  }
  
  return { valid: errors.length === 0, errors };
}
```

## 7.3 Selection Edge Cases

```typescript
function handleSelectionEdgeCases(player: Player, selectedCard: Card | null): Card {
  // EDGE CASE 1: No selection made (timer expired with no input)
  if (selectedCard === null) {
    console.log('EDGE CASE: No selection, auto-selecting');
    return autoSelectCard(player);
  }
  
  // EDGE CASE 2: Selected card not affordable
  if (selectedCard.cost > player.energy) {
    console.log('EDGE CASE: Unaffordable card selected, auto-selecting');
    return autoSelectCard(player);
  }
  
  // EDGE CASE 3: Selected wall but wall exists
  if (selectedCard.subtype === 'wall' && player.wall !== null) {
    console.log('EDGE CASE: Wall exists, auto-selecting different card');
    const nonWallCards = player.hand.filter(c => c.subtype !== 'wall' && c.cost <= player.energy);
    if (nonWallCards.length > 0) {
      return nonWallCards[Math.floor(Math.random() * nonWallCards.length)];
    }
    // If only wall cards, return anyway (will be wasted)
    return selectedCard;
  }
  
  // EDGE CASE 4: Selected miner but miner exists
  if (selectedCard.type === 'miner' && player.miner !== null) {
    console.log('EDGE CASE: Miner exists, auto-selecting different card');
    const nonMinerCards = player.hand.filter(c => c.type !== 'miner' && c.cost <= player.energy);
    if (nonMinerCards.length > 0) {
      return nonMinerCards[Math.floor(Math.random() * nonMinerCards.length)];
    }
    return selectedCard;
  }
  
  // EDGE CASE 5: Empty hand
  if (player.hand.length === 0) {
    throw new Error('CRITICAL: Player has no cards in hand');
  }
  
  return selectedCard;
}
```

---

# 8. WALL RULES

## 8.1 Wall Placement Rules

```
RULE W1: One Wall at a Time
  - Player can have AT MOST one wall active
  - Cannot place new wall if wall already exists
  - Must wait for wall to be destroyed or decay to 0

RULE W2: Wall Initial HP
  - New wall starts with 12 HP
  - HP is set at placement time

RULE W3: Wall Cannot Stack
  - Placing wall while wall exists = INVALID
  - Card is wasted (energy spent, no effect)
  - UI should prevent this by disabling wall card
```

## 8.2 Wall Decay Rules

```
RULE W4: Decay Timing
  - Wall decays at END of turn (Phase 9: DECAY)
  - Decay happens AFTER attacks resolve
  - This is CRITICAL for correct gameplay

RULE W5: Decay Amount
  - Wall loses 4 HP per turn
  - Decay is automatic, not triggered by attacks

RULE W6: Decay Timeline (if not attacked)
  Turn N (placed):  12 HP → after decay → 8 HP
  Turn N+1:          8 HP → after decay → 4 HP
  Turn N+2:          4 HP → after decay → 0 HP (destroyed)

RULE W7: Wall Death
  - Wall is destroyed when HP reaches 0 or below
  - Removed from player state immediately
  - Player can place new wall next turn
```

## 8.3 Wall Combat Rules

```
RULE W8: Wall Blocks Continuous
  - Continuous attacks hit wall first
  - Wall HP reduced by attack damage
  - If wall HP >= damage: all blocked
  - If wall HP < damage: overflow to base

RULE W9: Wall Does NOT Block Projectile
  - Projectiles BYPASS wall entirely
  - Wall takes no damage from projectile
  - Projectile goes directly to base

RULE W10: Wall Damage vs Decay
  - Attack damage reduces wall HP immediately
  - Decay reduces wall HP at end of turn
  - Both can stack (attack damage + decay same turn)
```

## 8.4 Wall Validation

```typescript
interface WallState {
  element: Element;
  maxHP: number;
  currentHP: number;
  turnPlaced: number;
}

function validateWall(wall: WallState | null): ValidationResult {
  if (wall === null) {
    return { valid: true, errors: [] };
  }
  
  const errors: string[] = [];
  
  // HP checks
  if (wall.currentHP < 0) {
    errors.push('Wall HP cannot be negative');
  }
  
  if (wall.currentHP > wall.maxHP) {
    errors.push('Wall HP cannot exceed max HP');
  }
  
  if (wall.maxHP !== WALL_HP) {
    errors.push(`Wall max HP must be ${WALL_HP}`);
  }
  
  return { valid: errors.length === 0, errors };
}

function canPlaceWall(player: Player): boolean {
  return player.wall === null;
}

function placeWall(player: Player, wallCard: Card, currentTurn: number): void {
  if (!canPlaceWall(player)) {
    console.warn('Attempted to place wall when wall exists - ignoring');
    return;
  }
  
  player.wall = {
    element: wallCard.element,
    maxHP: WALL_HP,
    currentHP: WALL_HP,
    turnPlaced: currentTurn
  };
}

function applyWallDecay(player: Player): void {
  if (player.wall === null) return;
  
  player.wall.currentHP -= WALL_DECAY_PER_TURN;
  
  if (player.wall.currentHP <= 0) {
    player.wall = null;
  }
}
```

---

# 9. MINER RULES

## 9.1 Miner Placement Rules

```
RULE M1: One Miner at a Time
  - Player can have AT MOST one miner active
  - Cannot place new miner if miner already exists
  - Must wait for miner to die

RULE M2: Miner Types Have Different Costs
  - Deflection Miner: 2 energy
  - Projectile Miner: 3 energy
  - Continuous Miner: 5 energy
  - Repair Miner: 3 energy

RULE M3: Miner Cannot Stack
  - Placing miner while miner exists = INVALID
  - Card is wasted (energy spent, no effect)
  - UI should prevent this by disabling miner cards
```

## 9.2 Miner Payout Rules

```
RULE M4: Payout Intervals
  - Deflection Miner: REACTIVE (no interval, triggers on projectile)
  - Projectile Miner: Every 2 turns
  - Continuous Miner: Every 3 turns
  - Repair Miner: Every 2 turns

RULE M5: Payout Timing
  - Payouts happen in Phase 8 (PAYOUTS)
  - AFTER attacks resolve
  - Only if miner survived the turn

RULE M6: Countdown Mechanics
  - turnsUntilPayout starts at interval value
  - Decrements by 1 each turn (in PAYOUTS phase)
  - When reaches 0: payout occurs, reset to interval
  - Deflection Miner has no countdown (reactive)

RULE M7: Payout Effects
  - Projectile Miner: Fire free 3-damage projectile at opponent
  - Continuous Miner: Fire free 8-damage continuous at opponent
  - Repair Miner: Restore owner's wall to 12 HP (if wall exists)
  - Deflection Miner: Auto-deflect opponent's projectile (reactive)
```

## 9.3 Miner Death Rules

```
RULE M8: Miner Dies on Base Damage (CRITICAL)
  - If player's base takes ANY damage (even 1 HP), miner dies
  - This happens IMMEDIATELY when damage is applied
  - Applies to damage from: attacks, overflow, miner payouts

RULE M9: Miner Death Timing
  - Checked in Phase 7 (RESOLUTION) after each damage instance
  - Miner dies BEFORE its payout if base takes damage same turn

RULE M10: Deflection Miner Special Case
  - Auto-triggers when opponent plays projectile
  - Blocks the projectile completely
  - Does NOT die from blocking (no damage to base)
```

## 9.4 Miner Validation

```typescript
interface MinerState {
  type: CardSubtype;
  turnsUntilPayout: number;
  payoutInterval: number;
  turnPlaced: number;
}

function validateMiner(miner: MinerState | null): ValidationResult {
  if (miner === null) {
    return { valid: true, errors: [] };
  }
  
  const errors: string[] = [];
  
  // Valid miner type
  const validTypes = ['deflection_miner', 'projectile_miner', 'continuous_miner', 'repair_miner'];
  if (!validTypes.includes(miner.type)) {
    errors.push(`Invalid miner type: ${miner.type}`);
  }
  
  // Countdown checks
  if (miner.turnsUntilPayout < 0) {
    errors.push('Miner countdown cannot be negative');
  }
  
  if (miner.turnsUntilPayout > miner.payoutInterval) {
    errors.push('Miner countdown cannot exceed interval');
  }
  
  return { valid: errors.length === 0, errors };
}

function canPlaceMiner(player: Player): boolean {
  return player.miner === null;
}

function placeMiner(player: Player, minerCard: Card, currentTurn: number): void {
  if (!canPlaceMiner(player)) {
    console.warn('Attempted to place miner when miner exists - ignoring');
    return;
  }
  
  const interval = getMinerInterval(minerCard.subtype);
  
  player.miner = {
    type: minerCard.subtype,
    turnsUntilPayout: interval,
    payoutInterval: interval,
    turnPlaced: currentTurn
  };
}

function getMinerInterval(minerType: CardSubtype): number {
  switch (minerType) {
    case 'deflection_miner': return 0;  // Reactive
    case 'projectile_miner': return PROJECTILE_MINER_INTERVAL;
    case 'continuous_miner': return CONTINUOUS_MINER_INTERVAL;
    case 'repair_miner': return REPAIR_MINER_INTERVAL;
    default: throw new Error(`Unknown miner type: ${minerType}`);
  }
}

function killMiner(player: Player, reason: string): void {
  if (player.miner !== null) {
    console.log(`Miner killed: ${reason}`);
    player.miner = null;
  }
}
```

---

# 10. ATTACK RESOLUTION RULES

## 10.1 Continuous Attack Rules

```
RULE A1: Continuous Damage
  - Base damage: 8 HP
  - Cost: 5 energy

RULE A2: Continuous vs Wall
  - Continuous hits wall first (if wall exists)
  - Wall HP reduced by damage amount
  - If wall survives: 0 damage to base
  - If wall destroyed: overflow damage to base

RULE A3: Continuous vs Deflection
  - Deflection REDUCES continuous by 2
  - Does NOT fully block continuous
  - Formula: damage = 8 - 2 = 6

RULE A4: Continuous vs Wall + Deflection
  - Deflection reduction applies first
  - Reduced damage then hits wall
  - Formula: (8 - 2) = 6 → wall absorbs up to 6
```

## 10.2 Projectile Attack Rules

```
RULE A5: Projectile Damage
  - Base damage: 3 HP
  - Cost: 3 energy

RULE A6: Projectile BYPASSES Wall
  - Projectile ignores wall completely
  - Wall takes no damage
  - Projectile goes directly to base (or deflection)

RULE A7: Projectile vs Deflection
  - Deflection FULLY BLOCKS projectile
  - 0 damage to base

RULE A8: Projectile vs Deflection Miner
  - Deflection Miner auto-blocks projectile
  - Same as manual deflection
  - 0 damage to base
```

## 10.3 Attack Resolution Order

```
RULE A9: Both Attacks Resolve
  - If both players attack, BOTH attacks hit
  - Attacks do NOT cancel each other
  - Resolve P1 attack → Resolve P2 attack

RULE A10: Attack Resolution Steps
  1. Check if attacker played attack card
  2. Determine attack type (continuous/projectile)
  3. Check defender's deflection (card or miner)
  4. Apply deflection reduction (if any)
  5. Check defender's wall (for continuous only)
  6. Calculate damage to wall (if applicable)
  7. Calculate overflow/bypass damage to base
  8. Apply damage to base
  9. Check if miner dies (if base took damage)
```

## 10.4 Attack Resolution Implementation

```typescript
function resolveAttack(
  attacker: Player,
  attackCard: Card,
  defender: Player,
  defenderCard: Card | null,
  gameState: GameState
): AttackResult {
  const result: AttackResult = {
    attackType: attackCard.subtype,
    baseDamage: attackCard.power,
    deflectionReduction: 0,
    wallAbsorbed: 0,
    damageToBase: 0,
    wallDestroyed: false,
    minerKilled: false
  };
  
  let damage = attackCard.power;
  
  // Check for deflection (card played this turn OR deflection miner)
  const hasDeflection = 
    defenderCard?.subtype === 'deflection' ||
    (attackCard.subtype === 'projectile' && defender.miner?.type === 'deflection_miner');
  
  if (attackCard.subtype === 'continuous') {
    // === CONTINUOUS ATTACK ===
    
    // Step 1: Apply deflection reduction (if any)
    if (defenderCard?.subtype === 'deflection') {
      damage -= DEFLECTION_REDUCTION;
      result.deflectionReduction = DEFLECTION_REDUCTION;
    }
    
    // Step 2: Check wall
    if (defender.wall !== null && defender.wall.currentHP > 0) {
      const wallHP = defender.wall.currentHP;
      
      if (wallHP >= damage) {
        // Wall absorbs all
        defender.wall.currentHP -= damage;
        result.wallAbsorbed = damage;
        result.damageToBase = 0;
      } else {
        // Wall breaks, overflow
        result.wallAbsorbed = wallHP;
        result.damageToBase = damage - wallHP;
        defender.wall = null;
        result.wallDestroyed = true;
      }
    } else {
      // No wall
      result.damageToBase = damage;
    }
    
  } else if (attackCard.subtype === 'projectile') {
    // === PROJECTILE ATTACK ===
    
    // Deflection miner check
    if (defender.miner?.type === 'deflection_miner') {
      result.deflectionReduction = damage;
      result.damageToBase = 0;
      return result;
    }
    
    // Deflection card check
    if (defenderCard?.subtype === 'deflection') {
      result.deflectionReduction = damage;
      result.damageToBase = 0;
      return result;
    }
    
    // Bypasses wall, hits base
    result.damageToBase = damage;
  }
  
  // Apply damage to base
  if (result.damageToBase > 0) {
    defender.baseHP -= result.damageToBase;
    
    // CRITICAL: Miner dies if base takes damage
    if (defender.miner !== null) {
      defender.miner = null;
      result.minerKilled = true;
    }
  }
  
  return result;
}
```

---

# 11. DEFENSE RESOLUTION RULES

## 11.1 Wall Placement

```
RULE D1: Wall Placement Timing
  - Walls are placed in Phase 6 (PLACEMENT)
  - BEFORE attacks resolve
  - Newly placed wall CAN block attacks same turn

RULE D2: Wall Placement Validation
  - Must not have existing wall
  - Must afford wall cost (2 energy)
```

## 11.2 Deflection Rules

```
RULE D3: Deflection Duration
  - Deflection lasts ONE turn only
  - Active during Phase 7 (RESOLUTION)
  - Cleared in Phase 12 (CLEANUP)

RULE D4: Deflection vs Projectile
  - Fully blocks projectile (0 damage)
  - Used up after blocking

RULE D5: Deflection vs Continuous
  - Reduces damage by 2 (not full block)
  - 8 - 2 = 6 damage still comes through
  - Then wall (if any) absorbs remaining
```

---

# 12. DAMAGE RULES

## 12.1 Damage Application

```
RULE DM1: Damage to Base
  - Subtract damage from baseHP
  - No minimum damage (can be 0 after reduction)
  - Base HP can go negative (for victory calculation)

RULE DM2: Damage to Wall
  - Subtract damage from wall.currentHP
  - If HP <= 0, wall is destroyed

RULE DM3: Overflow Damage
  - When wall HP < incoming damage
  - Overflow = damage - wallHP
  - Overflow goes to base

RULE DM4: Miner Death Trigger
  - ANY damage to base kills miner
  - Even 1 damage = miner dies
  - Checked immediately after damage applied
```

## 12.2 Damage Calculation

```typescript
function calculateDamage(
  attackCard: Card,
  defender: Player,
  defenderPlayedDeflection: boolean
): DamageCalculation {
  let damage = attackCard.power;
  let toWall = 0;
  let toBase = 0;
  
  if (attackCard.subtype === 'continuous') {
    // Apply deflection reduction
    if (defenderPlayedDeflection) {
      damage = Math.max(0, damage - DEFLECTION_REDUCTION);
    }
    
    // Apply to wall
    if (defender.wall !== null) {
      const wallHP = defender.wall.currentHP;
      toWall = Math.min(damage, wallHP);
      toBase = Math.max(0, damage - wallHP);
    } else {
      toBase = damage;
    }
    
  } else if (attackCard.subtype === 'projectile') {
    // Check blocks
    if (defenderPlayedDeflection || defender.miner?.type === 'deflection_miner') {
      toBase = 0;
    } else {
      toBase = damage;  // Bypasses wall
    }
  }
  
  return { toWall, toBase, minerDies: toBase > 0 && defender.miner !== null };
}
```

---

# 13. VICTORY & LOSS RULES

## 13.1 Victory Conditions

```
RULE V1: Standard Victory
  - Player wins when opponent's baseHP <= 0
  - Checked in Phase 11 (VICTORY_CHECK)

RULE V2: Double Loss
  - If BOTH bases <= 0 after same turn, BOTH LOSE
  - No winner declared
  - Show special "anti-war" message

RULE V3: Victory Priority
  - Check Player 1's HP first (arbitrary)
  - If only P1 dead: P2 wins
  - If only P2 dead: P1 wins
  - If both dead: Both lose
```

## 13.2 Victory Validation

```typescript
function checkVictory(gameState: GameState): VictoryResult {
  const p1Dead = gameState.player1.baseHP <= 0;
  const p2Dead = gameState.player2.baseHP <= 0;
  
  if (p1Dead && p2Dead) {
    return {
      gameOver: true,
      winner: null,
      loser: null,
      doubleLoss: true,
      message: getRandomAntiWarMessage()
    };
  }
  
  if (p1Dead) {
    return {
      gameOver: true,
      winner: gameState.player2,
      loser: gameState.player1,
      doubleLoss: false,
      message: `${gameState.player2.name} wins!`
    };
  }
  
  if (p2Dead) {
    return {
      gameOver: true,
      winner: gameState.player1,
      loser: gameState.player2,
      doubleLoss: false,
      message: `${gameState.player1.name} wins!`
    };
  }
  
  return {
    gameOver: false,
    winner: null,
    loser: null,
    doubleLoss: false,
    message: null
  };
}

const ANTI_WAR_MESSAGES = [
  "In war, there are no winners—only survivors. You didn't survive.",
  "An eye for an eye makes the whole world blind.",
  "The greatest victory is the battle not fought. You both failed.",
  "War does not determine who is right—only who is left. Neither of you.",
  "Every war is a defeat for humanity. Today, humanity lost twice."
];

function getRandomAntiWarMessage(): string {
  return ANTI_WAR_MESSAGES[Math.floor(Math.random() * ANTI_WAR_MESSAGES.length)];
}
```

---

# 14. VALIDATION FUNCTIONS

## 14.1 Complete State Validation

```typescript
function validateGameState(gameState: GameState): ValidationResult {
  const errors: string[] = [];
  
  // Validate players
  errors.push(...validatePlayer(gameState.player1).errors);
  errors.push(...validatePlayer(gameState.player2).errors);
  
  // Validate turn
  if (gameState.turn < 1) {
    errors.push('Turn must be >= 1');
  }
  
  // Validate phase
  if (!Object.values(TurnPhase).includes(gameState.phase)) {
    errors.push(`Invalid phase: ${gameState.phase}`);
  }
  
  return { valid: errors.length === 0, errors };
}

function validatePlayer(player: Player): ValidationResult {
  const errors: string[] = [];
  
  // Base HP
  if (player.baseHP > BASE_HP) {
    errors.push(`Base HP ${player.baseHP} exceeds max ${BASE_HP}`);
  }
  
  // Energy
  errors.push(...validateEnergy(player).errors);
  
  // Hand
  errors.push(...validateHand(player).errors);
  
  // Wall
  errors.push(...validateWall(player.wall).errors);
  
  // Miner
  errors.push(...validateMiner(player.miner).errors);
  
  return { valid: errors.length === 0, errors };
}
```

## 14.2 Action Validation

```typescript
function validateAction(player: Player, card: Card): ValidationResult {
  const errors: string[] = [];
  
  // Card in hand
  if (!player.hand.find(c => c.id === card.id)) {
    errors.push('Card not in hand');
  }
  
  // Affordable
  if (card.cost > player.energy) {
    errors.push('Cannot afford card');
  }
  
  // Wall constraint
  if (card.subtype === 'wall' && player.wall !== null) {
    errors.push('Cannot place wall: wall exists');
  }
  
  // Miner constraint
  if (card.type === 'miner' && player.miner !== null) {
    errors.push('Cannot place miner: miner exists');
  }
  
  return { valid: errors.length === 0, errors };
}
```

---

# 15. EDGE CASE HANDLING

## 15.1 Selection Edge Cases

```typescript
const SELECTION_EDGE_CASES = {
  // EC1: Timer expires with no selection
  NO_SELECTION: {
    condition: 'selectedCard === null && timerExpired',
    action: 'autoSelectCard(player)',
    result: 'Random affordable card selected'
  },
  
  // EC2: Selected card becomes unaffordable (should not happen with proper UI)
  UNAFFORDABLE_SELECTION: {
    condition: 'selectedCard.cost > player.energy',
    action: 'autoSelectCard(player)',
    result: 'Random affordable card selected'
  },
  
  // EC3: Selected wall but wall exists
  WALL_EXISTS: {
    condition: 'selectedCard.subtype === "wall" && player.wall !== null',
    action: 'Card is played but has no effect (wasted)',
    result: 'Energy spent, no wall placed'
  },
  
  // EC4: Selected miner but miner exists
  MINER_EXISTS: {
    condition: 'selectedCard.type === "miner" && player.miner !== null',
    action: 'Card is played but has no effect (wasted)',
    result: 'Energy spent, no miner placed'
  },
  
  // EC5: No affordable cards
  NO_AFFORDABLE_CARDS: {
    condition: 'getAffordableCards(player).length === 0',
    action: 'Player must still play (cheapest card selected)',
    result: 'Card played but invalid, turn essentially skipped'
  },
  
  // EC6: Empty hand
  EMPTY_HAND: {
    condition: 'player.hand.length === 0',
    action: 'CRITICAL ERROR - should never happen',
    result: 'Game state corrupted, throw error'
  }
};
```

## 15.2 Combat Edge Cases

```typescript
const COMBAT_EDGE_CASES = {
  // EC7: Both players attack (no defense)
  BOTH_ATTACK: {
    condition: 'p1Card.type === "attack" && p2Card.type === "attack"',
    action: 'Both attacks resolve independently',
    result: 'Both bases take damage'
  },
  
  // EC8: Wall HP exactly equals damage
  EXACT_WALL_KILL: {
    condition: 'defender.wall.currentHP === damage',
    action: 'Wall destroyed, 0 overflow',
    result: 'Wall dies, base takes 0 damage'
  },
  
  // EC9: Continuous + Deflection + Wall
  TRIPLE_DEFENSE: {
    condition: 'continuous attack vs deflection + wall',
    action: 'Deflection reduces first, then wall absorbs',
    result: '(8-2) = 6 damage to wall'
  },
  
  // EC10: Miner payout hits another miner
  MINER_VS_MINER: {
    condition: 'Projectile miner payout hits enemy with miner',
    action: 'Resolve as normal attack',
    result: 'If base damaged, enemy miner dies'
  },
  
  // EC11: Both bases die same turn
  DOUBLE_DEATH: {
    condition: 'p1.baseHP <= 0 && p2.baseHP <= 0',
    action: 'Both lose',
    result: 'Show anti-war message'
  },
  
  // EC12: Repair miner with no wall
  REPAIR_NO_WALL: {
    condition: 'repair miner payout && player.wall === null',
    action: 'Payout has no effect',
    result: 'Miner stays, countdown resets, nothing repaired'
  }
};
```

## 15.3 Timing Edge Cases

```typescript
const TIMING_EDGE_CASES = {
  // EC13: Wall placed and attacked same turn
  WALL_SAME_TURN: {
    condition: 'Player places wall, opponent attacks same turn',
    action: 'Wall IS active this turn (placed in Phase 6, attacks in Phase 7)',
    result: 'New wall can block attack'
  },
  
  // EC14: Miner placed and base damaged same turn
  MINER_DIES_IMMEDIATELY: {
    condition: 'Player places miner, takes damage same turn',
    action: 'Miner dies (placed Phase 6, damage Phase 7)',
    result: 'Miner never gets a payout'
  },
  
  // EC15: Wall decays to 0 after surviving attack
  WALL_DECAY_DEATH: {
    condition: 'Wall has 4 HP, takes 4 damage, then decays',
    action: 'Wall survives attack (0 HP), then decay makes it -4',
    result: 'Wall destroyed at end of turn'
  }
};
```

---

# 16. STATE MACHINE

## 16.1 Game States

```typescript
enum GamePhase {
  MENU = 'menu',
  TUTORIAL = 'tutorial',
  DRAFT = 'draft',
  BATTLE = 'battle',
  GAME_OVER = 'game_over'
}

const VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  [GamePhase.MENU]: [GamePhase.TUTORIAL, GamePhase.DRAFT],
  [GamePhase.TUTORIAL]: [GamePhase.DRAFT, GamePhase.MENU],
  [GamePhase.DRAFT]: [GamePhase.BATTLE],
  [GamePhase.BATTLE]: [GamePhase.GAME_OVER],
  [GamePhase.GAME_OVER]: [GamePhase.MENU, GamePhase.DRAFT]
};

function canTransition(from: GamePhase, to: GamePhase): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
```

## 16.2 Turn State Machine

```typescript
enum TurnState {
  WAITING_FOR_SELECTION = 'waiting',
  BOTH_LOCKED = 'locked',
  REVEALING = 'revealing',
  RESOLVING = 'resolving',
  TURN_COMPLETE = 'complete'
}

function advanceTurnState(current: TurnState, trigger: string): TurnState {
  switch (current) {
    case TurnState.WAITING_FOR_SELECTION:
      if (trigger === 'BOTH_PLAYERS_LOCKED' || trigger === 'TIMER_EXPIRED') {
        return TurnState.BOTH_LOCKED;
      }
      break;
    
    case TurnState.BOTH_LOCKED:
      if (trigger === 'START_REVEAL') {
        return TurnState.REVEALING;
      }
      break;
    
    case TurnState.REVEALING:
      if (trigger === 'REVEAL_COMPLETE') {
        return TurnState.RESOLVING;
      }
      break;
    
    case TurnState.RESOLVING:
      if (trigger === 'RESOLUTION_COMPLETE') {
        return TurnState.TURN_COMPLETE;
      }
      break;
    
    case TurnState.TURN_COMPLETE:
      if (trigger === 'NEXT_TURN') {
        return TurnState.WAITING_FOR_SELECTION;
      }
      break;
  }
  
  throw new Error(`Invalid state transition: ${current} + ${trigger}`);
}
```

---

# 17. TEST CASES

## 17.1 Unit Tests

```typescript
const UNIT_TESTS = [
  // Energy tests
  {
    name: 'Energy starts at 5',
    test: () => {
      const player = createPlayer();
      assert(player.energy === 5);
    }
  },
  {
    name: 'Energy regenerates +2 per turn (max 10)',
    test: () => {
      const player = createPlayer();
      player.energy = 9;
      applyEnergyRegen(player);
      assert(player.energy === 10); // Capped at 10
    }
  },
  
  // Wall tests
  {
    name: 'Can place wall when no wall exists',
    test: () => {
      const player = createPlayer();
      assert(canPlaceWall(player) === true);
    }
  },
  {
    name: 'Cannot place wall when wall exists',
    test: () => {
      const player = createPlayer();
      placeWall(player, createWallCard(), 1);
      assert(canPlaceWall(player) === false);
    }
  },
  {
    name: 'Wall decays 4 HP per turn',
    test: () => {
      const player = createPlayer();
      placeWall(player, createWallCard(), 1);
      assert(player.wall.currentHP === 12);
      applyWallDecay(player);
      assert(player.wall.currentHP === 8);
    }
  },
  
  // Miner tests
  {
    name: 'Miner dies when base takes damage',
    test: () => {
      const player = createPlayer();
      placeMiner(player, createMinerCard(), 1);
      assert(player.miner !== null);
      applyDamageToBase(player, 1);
      assert(player.miner === null);
    }
  },
  
  // Attack tests
  {
    name: 'Continuous blocked by wall',
    test: () => {
      const attacker = createPlayer();
      const defender = createPlayer();
      placeWall(defender, createWallCard(), 1);
      
      const result = resolveAttack(attacker, createContinuousCard(), defender, null, null);
      
      assert(result.damageToBase === 0);
      assert(defender.wall.currentHP === 4); // 12 - 8
    }
  },
  {
    name: 'Projectile bypasses wall',
    test: () => {
      const attacker = createPlayer();
      const defender = createPlayer();
      placeWall(defender, createWallCard(), 1);
      
      const result = resolveAttack(attacker, createProjectileCard(), defender, null, null);
      
      assert(result.damageToBase === 3);
      assert(defender.wall.currentHP === 12); // Unchanged
    }
  },
  {
    name: 'Deflection blocks projectile 100%',
    test: () => {
      const attacker = createPlayer();
      const defender = createPlayer();
      const deflectionCard = createDeflectionCard();
      
      const result = resolveAttack(attacker, createProjectileCard(), defender, deflectionCard, null);
      
      assert(result.damageToBase === 0);
    }
  },
  {
    name: 'Deflection reduces continuous by 2',
    test: () => {
      const attacker = createPlayer();
      const defender = createPlayer();
      const deflectionCard = createDeflectionCard();
      
      const result = resolveAttack(attacker, createContinuousCard(), defender, deflectionCard, null);
      
      assert(result.damageToBase === 6); // 8 - 2
    }
  }
];
```

## 17.2 Integration Tests

```typescript
const INTEGRATION_TESTS = [
  {
    name: 'Full turn: both attack, both take damage',
    scenario: () => {
      const game = createGame();
      game.player1.selectedCard = createContinuousCard();
      game.player2.selectedCard = createContinuousCard();
      
      resolveTurn(game);
      
      assert(game.player1.baseHP === 12); // 20 - 8
      assert(game.player2.baseHP === 12); // 20 - 8
    }
  },
  {
    name: 'Wall danger zone: overflow damages base and kills miner',
    scenario: () => {
      const game = createGame();
      
      // Setup: P1 has wall at 4 HP and miner
      game.player1.wall = { currentHP: 4, maxHP: 12, element: 'fire', turnPlaced: 1 };
      game.player1.miner = { type: 'projectile_miner', turnsUntilPayout: 2, payoutInterval: 2, turnPlaced: 1 };
      
      // P2 attacks with continuous
      game.player1.selectedCard = createDeflectionCard();
      game.player2.selectedCard = createContinuousCard();
      
      resolveTurn(game);
      
      assert(game.player1.wall === null); // Wall destroyed
      assert(game.player1.baseHP === 18); // 20 - (8 - 2 - 4) = 20 - 2 = 18? No wait...
      // Deflection: 8 - 2 = 6 damage
      // Wall: 4 HP absorbs 4, overflow = 2
      // Base: 20 - 2 = 18
      assert(game.player1.baseHP === 18);
      assert(game.player1.miner === null); // Miner killed
    }
  },
  {
    name: 'Draft completes with 6 cards',
    scenario: () => {
      const draft = createDraft();
      
      for (let i = 0; i < 6; i++) {
        const options = getDraftOptions(draft, i + 1);
        selectDraftCard(draft, options[0]);
      }
      
      assert(draft.selectedCards.length === 6);
      assert(draft.isComplete === true);
    }
  },
  {
    name: 'Auto-pick triggers on timeout',
    scenario: () => {
      const draft = createDraft();
      draft.timeRemaining = 0;
      
      handleDraftTimeout(draft);
      
      assert(draft.selectedCards.length === 1);
    }
  },
  {
    name: 'Double death shows anti-war message',
    scenario: () => {
      const game = createGame();
      game.player1.baseHP = 8;
      game.player2.baseHP = 8;
      
      game.player1.selectedCard = createContinuousCard();
      game.player2.selectedCard = createContinuousCard();
      
      resolveTurn(game);
      
      const result = checkVictory(game);
      assert(result.doubleLoss === true);
      assert(result.winner === null);
      assert(ANTI_WAR_MESSAGES.includes(result.message));
    }
  }
];
```

## 17.3 Edge Case Tests

```typescript
const EDGE_CASE_TESTS = [
  {
    name: 'EC1: Auto-select when no selection made',
    test: () => {
      const player = createPlayer();
      player.selectedCard = null;
      
      const card = handleSelectionEdgeCases(player, null);
      
      assert(card !== null);
      assert(player.hand.includes(card));
    }
  },
  {
    name: 'EC3: Wall card wasted when wall exists',
    test: () => {
      const player = createPlayer();
      placeWall(player, createWallCard(), 1);
      const initialWallHP = player.wall.currentHP;
      
      // Try to place another wall
      const wallCard = createWallCard();
      placeWall(player, wallCard, 2);
      
      // Wall should be unchanged (second placement ignored)
      assert(player.wall.currentHP === initialWallHP);
      assert(player.wall.turnPlaced === 1); // Still the first wall
    }
  },
  {
    name: 'EC9: Continuous + Deflection + Wall',
    test: () => {
      const attacker = createPlayer();
      const defender = createPlayer();
      
      placeWall(defender, createWallCard(), 1); // 12 HP wall
      const deflectionCard = createDeflectionCard();
      
      const result = resolveAttack(
        attacker, 
        createContinuousCard(), // 8 damage
        defender, 
        deflectionCard, 
        null
      );
      
      // Deflection: 8 - 2 = 6
      // Wall: absorbs 6
      // Base: 0 damage
      assert(result.damageToBase === 0);
      assert(defender.wall.currentHP === 6); // 12 - 6
    }
  },
  {
    name: 'EC12: Repair miner with no wall',
    test: () => {
      const player = createPlayer();
      placeMiner(player, createRepairMinerCard(), 1);
      
      // Simulate payout with no wall
      player.miner.turnsUntilPayout = 0;
      processMinerPayout(player, createPlayer());
      
      // Nothing should break, miner still exists, countdown reset
      assert(player.miner !== null);
      assert(player.miner.turnsUntilPayout === REPAIR_MINER_INTERVAL);
    }
  },
  {
    name: 'EC13: Wall blocks attack placed same turn',
    test: () => {
      const game = createGame();
      
      // P1 places wall this turn
      game.player1.selectedCard = createWallCard();
      // P2 attacks this turn
      game.player2.selectedCard = createContinuousCard();
      
      resolveTurn(game);
      
      // Wall should have blocked (placed in Phase 6, attack in Phase 7)
      assert(game.player1.wall !== null);
      assert(game.player1.wall.currentHP === 4); // 12 - 8
      assert(game.player1.baseHP === 20); // No damage
    }
  }
];
```

---

# SUMMARY: RULES CHECKLIST

Use this checklist to verify implementation:

## Core Rules
- [ ] Base HP = 20
- [ ] Start energy = 5, max = 10, regen = +2/turn
- [ ] Turn timer = 10 seconds
- [ ] Deck size = 6, hand size = 4

## Selection Rules
- [ ] NO PASSING - must always select a card
- [ ] Auto-select on timeout
- [ ] All 4 cards visible (no rotation)
- [ ] Unaffordable cards disabled

## Wall Rules
- [ ] ONE wall max
- [ ] 12 HP, -4 decay/turn
- [ ] Decay AFTER attacks (end of turn)
- [ ] Blocks continuous, bypassed by projectile

## Miner Rules
- [ ] ONE miner max
- [ ] Dies if base takes ANY damage
- [ ] Different costs and intervals per type
- [ ] Deflection miner is reactive

## Attack Rules
- [ ] Continuous: 8 damage, costs 5
- [ ] Projectile: 3 damage, costs 3
- [ ] Both attacks resolve if both attack

## Defense Rules
- [ ] Wall: costs 2, blocks continuous
- [ ] Deflection: costs 1, blocks projectile, -2 vs continuous

## Draft Rules
- [ ] 6 rounds, 4 options each
- [ ] Auto-pick on timeout
- [ ] No empty slots allowed

## Victory Rules
- [ ] Win when opponent HP <= 0
- [ ] Double death = both lose
- [ ] Anti-war messages on double loss

---

*Document Version: 1.0*
*Use this to validate ALL game logic implementations*
