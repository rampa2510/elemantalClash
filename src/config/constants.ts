// === MULTIPLAYER ===
export const MULTIPLAYER_ENABLED = true;  // Feature flag - set to false to disable multiplayer
export const CONNECTION_TIMEOUT_MS = 60000;  // 60 seconds
export const RECONNECT_ATTEMPTS = 3;
export const RECONNECT_BASE_DELAY_MS = 1000;  // 1 second (exponential backoff)
export const HEARTBEAT_INTERVAL_MS = 3000;  // 3 seconds
export const HEARTBEAT_TIMEOUT_MS = 5000;  // 5 seconds

// === PLAYER ===
export const BASE_HP = 20;
export const START_ENERGY = 5;
export const MAX_ENERGY = 10;
// Alternating energy: 2.5 avg (odd turns=2, even turns=3)
export const ENERGY_PER_TURN_ODD = 2;   // Turns 1, 3, 5...
export const ENERGY_PER_TURN_EVEN = 3;  // Turns 2, 4, 6...

// === TIMING ===
export const TURN_TIMER_SECONDS = 10;
export const DRAFT_TIMER_SECONDS_SHORT = 12;  // Rounds 1-4
export const DRAFT_TIMER_SECONDS_LONG = 15;   // Rounds 5-6
export const TIP_ROTATION_INTERVAL = 4;       // Seconds between tip changes

// === ATTACKS ===
export const CONTINUOUS_COST = 5;
export const CONTINUOUS_DAMAGE = 8;
export const PROJECTILE_COST = 3;
export const PROJECTILE_DAMAGE = 3;

// === DEFENSES ===
export const WALL_COST = 2;
export const WALL_HP = 12;
export const WALL_DECAY_PER_TURN = 4;
export const DEFLECTION_COST = 1;
export const DEFLECTION_VS_CONTINUOUS = 2;  // Reduces damage by 2

// === MINERS ===
export const DEFLECTION_MINER_COST = 2;
export const DEFLECTION_MINER_INTERVAL = 2;  // Provides protection every 2 turns
export const PROJECTILE_MINER_COST = 3;
export const PROJECTILE_MINER_INTERVAL = 2;  // Pays out every 2 turns
export const CONTINUOUS_MINER_COST = 5;
export const CONTINUOUS_MINER_INTERVAL = 3;  // Pays out every 3 turns
export const REPAIR_MINER_COST = 3;
export const REPAIR_MINER_INTERVAL = 2;      // Repairs every 2 turns

// === DECK ===
// All 6 cards visible at all times - pure strategy, no draw mechanics
export const HAND_SIZE = 6;
export const DECK_SIZE = 6;
export const DRAFT_ROUNDS = 6;
export const OPTIONS_PER_DRAFT_ROUND = 4;

// === UI ===
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// === COLORS ===
// NOTE: For theme-aware colors, use themeManager.getColors() instead of COLORS
// COLORS remains for backward compatibility and default (dark) theme values
export const COLORS = {
  fire: 0xff6b35,
  water: 0x4dabf7,
  earth: 0x8b7355,
  air: 0xb8c5d6,
  lightning: 0xffd43b,
  ice: 0x74c0fc,
  background: 0x1a1a2e,
  cardBg: 0x2d2d44,
  text: 0xe0e0e0,  // Improved contrast
  textBright: 0xffffff,
  healthBar: 0x51cf66,
  healthBarMid: 0xffd43b,  // Yellow for mid health
  healthBarLow: 0xff6b6b,  // Red for low health
  healthBarBg: 0x495057,
  energyBar: 0xffd43b,
  energyBarBg: 0x495057,
  timerWarning: 0xff6b6b,
  timerMid: 0xffd43b,  // Yellow for mid time
  glow: 0x4dabf7,  // Default glow color
  disabled: 0x666666,  // Desaturated disabled state
  // Resource bar colors
  resourceFilled: 0xffd43b,    // Gold
  resourceEmpty: 0x495057,      // Dark gray
  resourceGain: 0xffeb3b,       // Bright gold (animation)
  resourceGlow: 0xffc107,       // Amber glow
  // Message colors
  messagePlayer: 0x51cf66,      // Green (favorable)
  messageOpponent: 0xff6b6b,    // Red (threat)
  messageNeutral: 0x4dabf7,     // Blue (neutral)
  arrowDown: 0xff8787,          // Light red
  arrowUp: 0x69db7c,            // Light green
};

// === TYPOGRAPHY ===
export const FONTS = {
  primary: 'Oxanium',
  fallback: 'Arial, sans-serif',
  get family() {
    return `${this.primary}, ${this.fallback}`;
  },
};

// Modular scale (1.25 ratio) for consistent sizing
export const FONT_SIZES = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 35,
  xxl: 44,
};

// === SHADOWS (for layered depth) ===
export const SHADOWS = {
  // Button shadows (lifted state)
  buttonRest: [
    { offsetX: 0, offsetY: 2, blur: 4, color: 0x000000, alpha: 0.3 },
    { offsetX: 0, offsetY: 4, blur: 8, color: 0x000000, alpha: 0.2 },
  ],
  buttonHover: [
    { offsetX: 0, offsetY: 4, blur: 8, color: 0x000000, alpha: 0.3 },
    { offsetX: 0, offsetY: 8, blur: 16, color: 0x000000, alpha: 0.2 },
    { offsetX: 0, offsetY: 12, blur: 24, color: 0x000000, alpha: 0.1 },
  ],
  buttonPressed: [
    { offsetX: 0, offsetY: 1, blur: 2, color: 0x000000, alpha: 0.4 },
  ],
  // Card shadows
  cardRest: [
    { offsetX: 0, offsetY: 2, blur: 6, color: 0x000000, alpha: 0.3 },
  ],
  cardHover: [
    { offsetX: 0, offsetY: 6, blur: 12, color: 0x000000, alpha: 0.4 },
    { offsetX: 0, offsetY: 12, blur: 20, color: 0x000000, alpha: 0.2 },
  ],
  cardSelected: [
    { offsetX: 0, offsetY: 4, blur: 16, color: 0x4dabf7, alpha: 0.6 },
  ],
};

// === ANIMATION TIMING ===
export const TIMING = {
  instant: 50,
  fast: 100,
  normal: 150,
  slow: 250,
  dramatic: 400,
  // Easing functions (cubic-bezier values for reference)
  easeOut: 'Power2',
  easeInOut: 'Power2',
  bounce: 'Back.easeOut',  // Phaser's bounce equivalent
};

// === RESOURCE BAR ANIMATION ===
export const RESOURCE_ANIMATION = {
  portalOpen: 300,
  portalEmit: 400,
  cascadeStagger: 50,
  bloomDuration: 300,
  bloomScale: { start: 0.8, peak: 1.3, end: 1.0 },
  bloomRotation: 15,
  settleBounce: 200,
  glowPulse: 300,
  portalClose: 200,
  particleCount: 6,
  particleSpeed: { min: 50, max: 100 },
  particleLifetime: 400,
  particleColors: [0xffd43b, 0xffc107, 0xffeb3b],
};

// === MESSAGE ANIMATION ===
export const MESSAGE_ANIMATION = {
  slideInDuration: 300,
  slideInEase: 'Back.easeOut',
  displayDuration: 5000,  // 5 seconds for reading
  slideOutDuration: 300,
  slideOutEase: 'Quad.easeIn',
  staggerDelay: 100,
};

// === ANTI-WAR MESSAGES ===
export const DOUBLE_LOSS_MESSAGES = [
  "In war, there are no winners—only survivors. You didn't survive.",
  "An eye for an eye makes the whole world blind.",
  "The greatest victory is the battle not fought. You both failed.",
  "War does not determine who is right—only who is left. Neither of you.",
  "Every war is a defeat for humanity. Today, humanity lost twice."
];

// === DRAFT TIPS ===
export const DRAFT_TIPS = {
  wall: [
    "Shields block Blasts for up to 3 turns.",
    "Shields decay: 12 HP → 8 HP → 4 HP each turn.",
    "Turn 3 is danger zone - Shield is weakest!",
    "Shots bypass Shields completely."
  ],
  deflection: [
    "Dodge costs only 1 energy - cheapest card!",
    "Blocks Shots 100%.",
    "Only reduces Blasts by 2 damage.",
    "Great for stopping chip damage."
  ],
  continuous: [
    "8 damage - massive threat!",
    "Costs 5 energy - can't spam every turn.",
    "Best when enemy Shield is weak (Turn 3).",
    "If it hits base, enemy Bot dies!"
  ],
  projectile: [
    "Bypasses Shields entirely!",
    "Only 3 damage but consistent.",
    "Costs 3 energy - affordable.",
    "Countered by Dodge."
  ],
  miner: [
    "Bots generate value over time.",
    "ANY base damage = Bot dies!",
    "Dodge Bot (2): Blocks Shots every 2 turns.",
    "Shot Bot (3): Free Shot every 2 turns.",
    "Blast Bot (5): Free Blast every 3 turns.",
    "Repair Bot (3): Heals Wall every 2 turns.",
    "Start 5 energy, +2.5/turn avg, max 10."
  ]
};
