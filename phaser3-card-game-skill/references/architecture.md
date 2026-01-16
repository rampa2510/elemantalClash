# Architecture Reference

## Complete Project Structure

```
card-game/
├── .env.development
├── .env.production
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── assets/
│       ├── audio/
│       │   ├── music/
│       │   └── sfx/
│       ├── cards/
│       │   ├── atlas.json
│       │   └── atlas.png
│       ├── ui/
│       │   ├── buttons.json
│       │   └── buttons.png
│       └── fonts/
├── src/
│   ├── main.ts
│   ├── config/
│   │   ├── GameConfig.ts
│   │   ├── Environment.ts
│   │   └── Constants.ts
│   ├── core/
│   │   ├── BaseScene.ts
│   │   ├── SceneKeys.ts
│   │   └── AssetLoader.ts
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── PreloadScene.ts
│   │   ├── MainMenuScene.ts
│   │   ├── GameScene.ts
│   │   ├── UIScene.ts
│   │   └── GameOverScene.ts
│   ├── game/
│   │   ├── cards/
│   │   │   ├── Card.ts
│   │   │   ├── CardData.ts
│   │   │   ├── Hand.ts
│   │   │   └── Deck.ts
│   │   ├── state/
│   │   │   ├── GameState.ts
│   │   │   ├── TurnStateMachine.ts
│   │   │   └── EventBus.ts
│   │   └── player/
│   │       └── Player.ts
│   ├── services/
│   │   ├── FirebaseService.ts
│   │   ├── RoomService.ts
│   │   └── AudioService.ts
│   ├── ui/
│   │   ├── components/
│   │   │   ├── HealthBar.ts
│   │   │   ├── Timer.ts
│   │   │   ├── Button.ts
│   │   │   └── Modal.ts
│   │   └── HUD.ts
│   ├── ai/
│   │   ├── AIPlayer.ts
│   │   └── CardHeuristics.ts
│   ├── utils/
│   │   ├── MathUtils.ts
│   │   └── ArrayUtils.ts
│   └── types/
│       ├── card.types.ts
│       ├── game.types.ts
│       └── firebase.types.ts
└── tests/
    └── ...
```

## Vite Configuration

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: './',
    server: { 
      port: 8080, 
      host: true,
      open: true
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          manualChunks: {
            phaser: ['phaser'],
            firebase: ['firebase/app', 'firebase/database', 'firebase/auth'],
            rexui: ['phaser3-rex-plugins']
          }
        }
      },
      minify: 'terser',
      terserOptions: {
        compress: { 
          drop_console: mode === 'production', 
          drop_debugger: true 
        }
      },
      chunkSizeWarningLimit: 1500
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode)
    }
  };
});
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@game/*": ["src/game/*"],
      "@ui/*": ["src/ui/*"],
      "@services/*": ["src/services/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## Game Configuration

```typescript
// src/config/GameConfig.ts
import Phaser from 'phaser';
import { BootScene } from '@/scenes/BootScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { GameScene } from '@/scenes/GameScene';
import { UIScene } from '@/scenes/UIScene';
import { GameOverScene } from '@/scenes/GameOverScene';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
    min: { width: 360, height: 640 },
    max: { width: 1080, height: 1920 }
  },
  input: {
    activePointers: 3,
    touch: { capture: true }
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  audio: {
    disableWebAudio: false
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    GameScene,
    UIScene,
    GameOverScene
  ]
};
```

## Scene Keys Enum

```typescript
// src/core/SceneKeys.ts
export enum SceneKeys {
  BOOT = 'BootScene',
  PRELOAD = 'PreloadScene',
  MAIN_MENU = 'MainMenuScene',
  GAME = 'GameScene',
  UI = 'UIScene',
  GAME_OVER = 'GameOverScene'
}
```

## Base Scene Class

```typescript
// src/core/BaseScene.ts
import Phaser from 'phaser';
import { SceneKeys } from './SceneKeys';

export abstract class BaseScene extends Phaser.Scene {
  protected screenWidth!: number;
  protected screenHeight!: number;
  protected centerX!: number;
  protected centerY!: number;

  create(): void {
    this.screenWidth = this.cameras.main.width;
    this.screenHeight = this.cameras.main.height;
    this.centerX = this.screenWidth / 2;
    this.centerY = this.screenHeight / 2;
  }

  protected transitionTo(
    targetScene: SceneKeys, 
    data?: object, 
    fadeDuration = 300
  ): void {
    this.cameras.main.fadeOut(fadeDuration, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.scene.start(targetScene, { ...data, fadeIn: true });
      }
    );
  }

  protected fadeIn(duration = 300): void {
    this.cameras.main.fadeIn(duration, 0, 0, 0);
  }
}
```

## Scene Lifecycle

### BootScene (Minimal Setup)
```typescript
// src/scenes/BootScene.ts
import Phaser from 'phaser';
import { SceneKeys } from '@/core/SceneKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT);
  }

  preload(): void {
    // Load only essentials for loading screen
    this.load.image('logo', 'assets/ui/logo.png');
    this.load.image('loading-bar-bg', 'assets/ui/loading-bar-bg.png');
    this.load.image('loading-bar-fill', 'assets/ui/loading-bar-fill.png');
  }

  create(): void {
    this.scene.start(SceneKeys.PRELOAD);
  }
}
```

### PreloadScene (Asset Loading)
```typescript
// src/scenes/PreloadScene.ts
import Phaser from 'phaser';
import { SceneKeys } from '@/core/SceneKeys';

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Image;
  private progressBarFill!: Phaser.GameObjects.Image;
  private loadingText!: Phaser.GameObjects.Text;
  private failedAssets: string[] = [];

  constructor() {
    super(SceneKeys.PRELOAD);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    
    // Loading UI
    this.add.image(width / 2, height / 2 - 100, 'logo');
    this.progressBar = this.add.image(width / 2, height / 2 + 50, 'loading-bar-bg');
    this.progressBarFill = this.add.image(
      width / 2 - this.progressBar.width / 2 + 4,
      height / 2 + 50,
      'loading-bar-fill'
    ).setOrigin(0, 0.5);
    this.progressBarFill.scaleX = 0;
    
    this.loadingText = this.add.text(width / 2, height / 2 + 100, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Progress handlers
    this.load.on('progress', this.onProgress, this);
    this.load.on('fileprogress', this.onFileProgress, this);
    this.load.on('loaderror', this.onLoadError, this);
    this.load.on('complete', this.onComplete, this);

    this.loadAssets();
  }

  private loadAssets(): void {
    // Card atlas
    this.load.atlas('cards', 'assets/cards/atlas.png', 'assets/cards/atlas.json');
    
    // UI atlas
    this.load.atlas('ui', 'assets/ui/buttons.png', 'assets/ui/buttons.json');
    
    // Individual images
    this.load.image('card-back', 'assets/cards/card-back.png');
    this.load.image('game-bg', 'assets/backgrounds/game-bg.png');
    
    // Audio with fallbacks
    this.load.audio('card-flip', ['assets/audio/sfx/flip.webm', 'assets/audio/sfx/flip.ogg', 'assets/audio/sfx/flip.mp3']);
    this.load.audio('card-play', ['assets/audio/sfx/play.webm', 'assets/audio/sfx/play.mp3']);
    this.load.audio('damage', ['assets/audio/sfx/damage.webm', 'assets/audio/sfx/damage.mp3']);
    this.load.audio('victory', ['assets/audio/sfx/victory.webm', 'assets/audio/sfx/victory.mp3']);
    this.load.audio('bgm', ['assets/audio/music/bgm.webm', 'assets/audio/music/bgm.mp3']);
    
    // Fonts (bitmap)
    this.load.bitmapFont('game-font', 'assets/fonts/game-font.png', 'assets/fonts/game-font.xml');
    
    this.load.start();
  }

  private onProgress(value: number): void {
    this.progressBarFill.scaleX = value;
    this.loadingText.setText(`Loading... ${Math.round(value * 100)}%`);
  }

  private onFileProgress(file: Phaser.Loader.File): void {
    console.log(`Loading: ${file.key}`);
  }

  private onLoadError(file: Phaser.Loader.File): void {
    console.error(`Failed to load: ${file.key}`);
    this.failedAssets.push(file.key);
  }

  private onComplete(): void {
    if (this.failedAssets.length > 0) {
      console.warn('Some assets failed to load:', this.failedAssets);
    }
    
    // Small delay for UX
    this.time.delayedCall(500, () => {
      this.scene.start(SceneKeys.MAIN_MENU);
    });
  }
}
```

### GameScene + UIScene (Parallel Scenes)
```typescript
// src/scenes/GameScene.ts
export class GameScene extends BaseScene {
  create(): void {
    super.create();
    if (this.scene.get(SceneKeys.UI).scene.isActive()) {
      this.scene.stop(SceneKeys.UI);
    }
    this.scene.launch(SceneKeys.UI);  // Launch UI as parallel scene
    
    // Game setup...
  }
  
  shutdown(): void {
    this.scene.stop(SceneKeys.UI);
  }
}

// src/scenes/UIScene.ts
export class UIScene extends BaseScene {
  create(): void {
    super.create();
    // UI is always on top
    this.scene.bringToTop();
    
    // Build HUD elements...
  }
}
```

## Scene Transitions

### Fade Transition
```typescript
transitionWithFade(target: SceneKeys, data?: object): void {
  this.cameras.main.fadeOut(300, 0, 0, 0);
  this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    this.scene.start(target, data);
  });
}
```

### Slide Transition
```typescript
transitionWithSlide(target: SceneKeys, direction: 'left' | 'right' = 'left'): void {
  const targetX = direction === 'left' ? -this.screenWidth : this.screenWidth;
  
  this.tweens.add({
    targets: this.cameras.main,
    scrollX: targetX,
    duration: 400,
    ease: 'Cubic.easeInOut',
    onComplete: () => this.scene.start(target)
  });
}
```

### Scene Sleep vs Stop
```typescript
// SLEEP: Preserves state, fast wake (for frequently visited scenes)
this.scene.sleep(SceneKeys.MAIN_MENU);
this.scene.wake(SceneKeys.MAIN_MENU);

// STOP: Frees memory, calls shutdown (for one-time scenes)
this.scene.stop(SceneKeys.GAME_OVER);
this.scene.start(SceneKeys.GAME_OVER);
```

## Environment Configuration

```typescript
// src/config/Environment.ts
interface EnvironmentConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    databaseURL: string;
  };
  features: {
    debugMode: boolean;
    analytics: boolean;
  };
}

export const Environment: EnvironmentConfig = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
  },
  features: {
    debugMode: import.meta.env.MODE !== 'production',
    analytics: import.meta.env.MODE === 'production'
  }
};
```

## Constants File

```typescript
// src/config/Constants.ts
export const GAME_CONSTANTS = {
  // Timing
  TURN_DURATION_MS: 10000,
  CARD_FLIP_DURATION: 300,
  CARD_DEAL_DURATION: 400,
  
  // Gameplay
  STARTING_HEALTH: 30,
  MAX_HAND_SIZE: 7,
  DECK_SIZE: 30,
  
  // Layout
  CARD_WIDTH: 120,
  CARD_HEIGHT: 180,
  HAND_Y_POSITION: 1100,
  OPPONENT_HAND_Y: 180,
  PLAY_AREA_Y: 640,
  
  // Firebase
  ROOM_CODE_LENGTH: 6,
  DISCONNECT_GRACE_MS: 30000,
  
  // Audio
  DEFAULT_SFX_VOLUME: 0.7,
  DEFAULT_MUSIC_VOLUME: 0.4
} as const;
```

## Hot Module Replacement (Development)

```typescript
// src/main.ts
import Phaser from 'phaser';
import { GAME_CONFIG } from './config/GameConfig';

const game = new Phaser.Game(GAME_CONFIG);

// HMR support
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
  
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}
```
