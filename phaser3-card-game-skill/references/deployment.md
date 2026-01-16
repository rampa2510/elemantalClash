# Deployment and Testing Reference

## Build Configuration

### Vite Production Build

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  return {
    base: './',
    
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProd,
      
      // Chunk optimization
      rollupOptions: {
        output: {
          manualChunks: {
            phaser: ['phaser'],
            firebase: ['firebase/app', 'firebase/database', 'firebase/auth'],
            rexui: ['phaser3-rex-plugins']
          },
          // Asset naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|webp/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/woff2?|ttf|eot/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js'
        }
      },
      
      // Minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: true,
          pure_funcs: isProd ? ['console.log', 'console.debug'] : []
        },
        mangle: {
          safari10: true
        }
      },
      
      // Performance
      chunkSizeWarningLimit: 1500,
      reportCompressedSize: true
    },

    // Define environment
    define: {
      __DEV__: JSON.stringify(!isProd),
      __VERSION__: JSON.stringify(process.env.npm_package_version)
    },

    // Optimizations
    optimizeDeps: {
      include: ['phaser']
    }
  };
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:staging": "tsc && vite build --mode staging",
    "build:analyze": "vite build --mode production && npx vite-bundle-visualizer",
    "preview": "vite preview",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "prepare": "husky install"
  }
}
```

## Vercel Deployment

### vercel.json Configuration

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/js/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

### Environment Variables on Vercel

```bash
# In Vercel Dashboard → Settings → Environment Variables

# Production
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_DATABASE_URL=https://xxx.firebaseio.com
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# Preview (staging)
VITE_FIREBASE_API_KEY=xxx-staging
# ... etc
```

### Deployment Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Link to existing project
vercel link
```

## Netlify Alternative

### netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Performance Optimization

### Texture Atlas Creation

```bash
# Using TexturePacker CLI
TexturePacker \
  --sheet assets/cards/atlas.png \
  --data assets/cards/atlas.json \
  --format phaser \
  --max-width 2048 \
  --max-height 2048 \
  --size-constraints POT \
  --trim-mode Trim \
  --algorithm MaxRects \
  --pack-mode Best \
  --opt RGBA8888 \
  assets/cards/source/*.png

# Free alternative: https://gammafp.github.io/atlas-packer-phaser/
```

### Image Optimization

```bash
# Optimize PNGs
npx pngquant --quality=65-80 --ext .png --force assets/**/*.png

# Convert to WebP with fallback
npx sharp-cli resize assets/cards/*.png --format webp --quality 80 -o assets/cards/webp/
```

### Preload Strategy

```typescript
// Priority loading - critical assets first
class AssetLoader {
  async loadCritical(): Promise<void> {
    // Load immediately needed assets
    this.load.image('logo', 'assets/ui/logo.png');
    this.load.image('card-back', 'assets/cards/card-back.png');
    await this.loadComplete();
  }

  async loadGameAssets(): Promise<void> {
    // Load in background during menu
    this.load.atlas('cards', 'assets/cards/atlas.png', 'assets/cards/atlas.json');
    this.load.atlas('ui', 'assets/ui/atlas.png', 'assets/ui/atlas.json');
  }

  async loadAudioLazy(): Promise<void> {
    // Load audio last
    this.load.audio('bgm', ['assets/audio/bgm.webm', 'assets/audio/bgm.mp3']);
  }
}
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build:analyze

# Check for duplicate dependencies
npx depcheck

# Find large modules
npx source-map-explorer dist/js/*.js
```

## Testing

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/']
    }
  }
});
```

### Test Setup

```typescript
// src/test/setup.ts
import { vi } from 'vitest';

// Mock Phaser
vi.mock('phaser', () => ({
  Scene: class {},
  GameObjects: {
    Container: class {},
    Graphics: class {},
    Image: class {},
    Text: class {}
  },
  Math: {
    Clamp: (value: number, min: number, max: number) => 
      Math.min(Math.max(value, min), max),
    DegToRad: (deg: number) => deg * (Math.PI / 180)
  }
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn()
  }))
});

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn()
}));

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(),
  ref: vi.fn(),
  onValue: vi.fn(),
  update: vi.fn()
}));
```

### Unit Test Examples

```typescript
// src/game/cards/Card.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  const mockCardData = {
    id: 'fire_slash',
    name: 'Fire Slash',
    type: 'Attack',
    subtype: 'Continuous',
    element: 'Fire',
    damage: 5
  };

  describe('state transitions', () => {
    it('should transition from IN_DECK to IN_HAND', () => {
      const card = new Card(mockScene, 0, 0, mockCardData);
      
      expect(card.state).toBe('IN_DECK');
      const result = card.transitionTo('IN_HAND');
      
      expect(result).toBe(true);
      expect(card.state).toBe('IN_HAND');
    });

    it('should reject invalid transitions', () => {
      const card = new Card(mockScene, 0, 0, mockCardData);
      
      const result = card.transitionTo('PLAYED'); // Skip IN_HAND
      
      expect(result).toBe(false);
      expect(card.state).toBe('IN_DECK');
    });
  });

  describe('serialization', () => {
    it('should serialize card state', () => {
      const card = new Card(mockScene, 0, 0, mockCardData);
      card.transitionTo('IN_HAND');
      
      const serialized = card.serialize();
      
      expect(serialized.cardId).toBe('fire_slash');
      expect(serialized.state).toBe('IN_HAND');
      expect(serialized.instanceId).toMatch(/^fire_slash-\d+-[a-z0-9]+$/);
    });
  });
});
```

### Integration Test Example

```typescript
// src/services/RoomService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomService } from './RoomService';

describe('RoomService', () => {
  let roomService: RoomService;

  beforeEach(() => {
    roomService = new RoomService();
    vi.clearAllMocks();
  });

  describe('createRoom', () => {
    it('should generate valid room code', async () => {
      const code = await roomService.createRoom('Player1');
      
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
      expect(code).not.toMatch(/[IO01]/); // Excluded chars
    });

    it('should not generate offensive codes', async () => {
      // Run many times to test randomness
      for (let i = 0; i < 100; i++) {
        const code = await roomService.createRoom('Player1');
        expect(code).not.toContain('FUCK');
        expect(code).not.toContain('SHIT');
      }
    });
  });
});
```

### E2E Test with Playwright

```typescript
// tests/e2e/game-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
  test('should complete a full game', async ({ page }) => {
    await page.goto('/');
    
    // Wait for game to load
    await page.waitForSelector('#game-container canvas');
    
    // Click play button
    await page.click('text=Play');
    
    // Wait for game scene
    await expect(page.locator('text=Your Turn')).toBeVisible();
    
    // Select a card (click on canvas coordinates)
    await page.click('#game-container canvas', {
      position: { x: 360, y: 1000 }
    });
    
    // Confirm selection
    await page.click('text=Lock In');
    
    // Verify turn progressed
    await expect(page.locator('text=Waiting')).toBeVisible();
  });
});
```

## Error Tracking

### Sentry Integration

```typescript
// src/utils/sentry.ts
import * as Sentry from '@sentry/browser';
import { BrowserTracing } from '@sentry/tracing';

export function initSentry(): void {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      release: `elemental-clash@${__VERSION__}`,
      
      integrations: [
        new BrowserTracing({
          tracePropagationTargets: [
            'localhost',
            /^https:\/\/your-domain\.com/
          ]
        })
      ],
      
      // Performance monitoring
      tracesSampleRate: 0.1,
      
      // Filter out noise
      ignoreErrors: [
        'ResizeObserver loop',
        'Non-Error promise rejection'
      ],
      
      beforeSend(event) {
        // Scrub sensitive data
        if (event.user) {
          delete event.user.ip_address;
        }
        return event;
      }
    });
  }
}

// Usage for game-specific errors
export function captureGameError(
  error: Error,
  context: {
    scene?: string;
    phase?: string;
    action?: string;
  }
): void {
  Sentry.withScope((scope) => {
    scope.setTags({
      scene: context.scene,
      gamePhase: context.phase,
      action: context.action
    });
    Sentry.captureException(error);
  });
}
```

## Analytics

### Simple Game Analytics

```typescript
// src/utils/analytics.ts
interface GameEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: number;
}

class GameAnalytics {
  private events: GameEvent[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  track(event: string, properties?: Record<string, any>): void {
    this.events.push({
      event,
      properties: {
        ...properties,
        sessionId: this.sessionId
      },
      timestamp: Date.now()
    });

    // Batch send every 10 events
    if (this.events.length >= 10) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend })
      });
    } catch {
      // Re-add events on failure
      this.events = [...eventsToSend, ...this.events];
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const analytics = new GameAnalytics();

// Usage
analytics.track('game_started', { mode: 'multiplayer' });
analytics.track('card_played', { cardId: 'fire_slash', turn: 1 });
analytics.track('game_ended', { winner: 'player1', turns: 10 });
```

## Performance Checklist

### Before Launch
- [ ] Enable production build (`npm run build`)
- [ ] Remove console.log statements
- [ ] Minify and compress assets
- [ ] Create texture atlases
- [ ] Test on low-end devices
- [ ] Verify mobile touch targets (44x44px minimum)
- [ ] Test offline/reconnection flows
- [ ] Set up error tracking
- [ ] Configure CDN caching
- [ ] Test on slow networks (Chrome DevTools throttling)

### Runtime Performance
- [ ] Object pooling for cards and particles
- [ ] Limit particle count on mobile (30-50)
- [ ] Use BitmapText instead of Text
- [ ] Kill tweens before creating new ones
- [ ] Destroy unused objects
- [ ] Batch Firebase writes
- [ ] Unsubscribe listeners on scene shutdown

### Monitoring
- [ ] Track FPS drops
- [ ] Monitor memory usage
- [ ] Log error rates
- [ ] Track game completion rates
- [ ] Monitor reconnection frequency
