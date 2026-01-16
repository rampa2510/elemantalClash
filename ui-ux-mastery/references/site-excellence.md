# Site Excellence: Learning from the Best

## Stripe: The Craft Standard

### Philosophy
> "Spend 20x more time on craft than what anyone else would."

- Never cut corners on details users might not consciously notice
- Balance function, craft, AND joy (including Easter eggs)
- Speed is paramount: one extra click delayed a login page redesign for years
- Developer-focused: code snippets include logged-in users' API keys

### Visual Language

**The 12-Degree Skew**
```css
:root {
  --stripe-skew: -12deg;
}

.stripe-section {
  position: relative;
  padding: 8rem 0;
}

.stripe-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #f6f9fc 0%, #fff 100%);
  transform: skewY(var(--stripe-skew));
  transform-origin: top left;
  z-index: -1;
}
```

**Animated WebGL Gradient**
Colors: `#6ec3f4`, `#3a3aff`, `#ff61ab`, `#E63946`
- Sharp color stops create wavy line patterns
- Canvas-based with requestAnimationFrame
- Disabled when out of viewport (ScrollObserver)
- Fragment shaders: blendLinearLight, blendLinearDodge, blendLinearBurn

**Mix-Blend Typography**
```css
.stripe-hero-text {
  font-family: 'Sohne', sans-serif;
  font-weight: 800;
  font-size: clamp(3rem, 8vw, 6rem);
  color: white;
  mix-blend-mode: difference;
}
```

### Visual Hierarchy Formula
1. **Banana** (color contrast) - Eyes go here first
2. **Heading** - Primary message
3. **Navigation** - Orientation
4. **CTA buttons** - Action points

Guide eyes using size, color, space, and alignment in precise sequence.

### Implementation Patterns
```css
/* Stripe-style card */
.stripe-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 
    0 1px 1px rgba(0,0,0,0.04),
    0 2px 2px rgba(0,0,0,0.04),
    0 4px 4px rgba(0,0,0,0.04),
    0 8px 8px rgba(0,0,0,0.04),
    0 16px 16px rgba(0,0,0,0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stripe-card:hover {
  transform: translateY(-4px);
  box-shadow: 
    0 2px 2px rgba(0,0,0,0.04),
    0 4px 4px rgba(0,0,0,0.04),
    0 8px 8px rgba(0,0,0,0.04),
    0 16px 16px rgba(0,0,0,0.04),
    0 32px 32px rgba(0,0,0,0.04);
}

/* Stripe-style button */
.stripe-button {
  background: linear-gradient(180deg, #635bff 0%, #5851ea 100%);
  color: white;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  border: none;
  box-shadow: 
    0 1px 2px rgba(99, 91, 255, 0.2),
    0 2px 4px rgba(99, 91, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.15s ease;
}

.stripe-button:hover {
  background: linear-gradient(180deg, #7a73ff 0%, #635bff 100%);
  transform: translateY(-1px);
  box-shadow: 
    0 2px 4px rgba(99, 91, 255, 0.25),
    0 4px 8px rgba(99, 91, 255, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

---

## Linear: Premium Precision

### Philosophy
> "Opinionated software. Flexible software lets everyone invent their own workflows, which eventually creates chaos as teams scale."

- Dark mode as primary design choice, not toggle
- Pixel-perfect alignment is non-negotiable
- Premium feel through technical precision
- Minimal but not barren

### Color System (LCH-Based)

Linear uses LCH color space because it's perceptually uniform:
- Same lightness value = same perceived lightness (unlike HSL)
- Only 3 core variables generate 98+ tokens

```css
:root {
  /* Base color (brand) */
  --base-hue: 230;
  --base-saturation: 15%;
  
  /* Accent color */
  --accent-hue: 230;
  --accent-saturation: 80%;
  
  /* Contrast scale (30-100) */
  --contrast: 85;
  
  /* Generated tokens */
  --color-bg: lch(5% var(--base-saturation) var(--base-hue));
  --color-surface: lch(8% var(--base-saturation) var(--base-hue));
  --color-surface-raised: lch(12% var(--base-saturation) var(--base-hue));
  --color-border: lch(20% var(--base-saturation) var(--base-hue));
  --color-text: lch(calc(var(--contrast) * 1%) 0% 0);
  --color-text-muted: lch(calc(var(--contrast) * 0.6%) 0% 0);
  --color-accent: lch(60% var(--accent-saturation) var(--accent-hue));
}
```

**Dark Mode: Not Pure Black**
```css
/* Use 1-10% lightness of brand color instead of #000 */
--color-bg: hsl(230, 15%, 5%);  /* Not #000000 */
--color-surface: hsl(230, 15%, 8%);
--color-panel: hsl(230, 15%, 10%);
```

### Surface-Based Theming
```
Elevation Hierarchy:
1. Background (lowest)
2. Surface (cards, containers)
3. Raised Surface (dropdowns, dialogs)
4. Modal (highest)

Each level slightly lighter in dark mode.
```

### "Inverted L-Shape" Navigation
```css
.linear-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 48px 1fr;
  height: 100vh;
}

.linear-sidebar {
  grid-row: 1 / -1;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.linear-header {
  grid-column: 2;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
}

.linear-content {
  grid-column: 2;
  overflow: auto;
}
```

### Pixel-Perfect Alignment
```css
/* Align labels, icons, buttons vertically and horizontally */
.linear-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px; /* Fixed height for consistency */
}

.linear-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.linear-label {
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
}
```

---

## Apple: Scroll Storytelling

### Philosophy
> Products are the protagonists. Everything else supports.

- "Human-centered" (not just "user-centered")—emphasizes highest human qualities
- Visibility balanced with clarity
- Integration of design and engineering from day one
- Products that feel "inevitable"—the only possible solution

### Image Sequence Animation

How Apple's product pages work:
1. Hundreds of images (~30KB each) preloaded
2. Rendered to canvas based on scroll position
3. Position calculated as percentage of maxScrollTop

```javascript
class AppleScrollSequence {
  constructor(canvas, imageCount, imagePath) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.imageCount = imageCount;
    this.images = [];
    this.currentFrame = 0;
    
    this.loadImages(imagePath);
    this.setupScroll();
  }
  
  loadImages(basePath) {
    for (let i = 0; i < this.imageCount; i++) {
      const img = new Image();
      img.src = `${basePath}/frame-${i.toString().padStart(4, '0')}.webp`;
      this.images.push(img);
    }
  }
  
  setupScroll() {
    const section = this.canvas.closest('section');
    
    window.addEventListener('scroll', () => {
      const rect = section.getBoundingClientRect();
      const scrollProgress = -rect.top / (rect.height - window.innerHeight);
      const clampedProgress = Math.max(0, Math.min(1, scrollProgress));
      
      const frameIndex = Math.floor(clampedProgress * (this.imageCount - 1));
      if (frameIndex !== this.currentFrame) {
        this.currentFrame = frameIndex;
        this.drawFrame(frameIndex);
      }
    });
  }
  
  drawFrame(index) {
    const img = this.images[index];
    if (img.complete) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
```

### Sticky Sections with Transitions
```css
.apple-section {
  height: 300vh; /* Tall for scroll room */
  position: relative;
}

.apple-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.apple-content {
  position: absolute;
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.apple-content.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Photography Principles
- Products fill 100%+ of viewport height
- White backgrounds for product isolation
- All reveals through scroll, not clicks
- Physical transformations (MacBooks fold, iPhones spin)

### Text Reveal Pattern
```css
.apple-headline {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.apple-headline span {
  display: block;
  opacity: 0;
  transform: translateY(100%);
  animation: apple-reveal 0.8s ease forwards;
}

.apple-headline span:nth-child(2) {
  animation-delay: 0.1s;
}

.apple-headline span:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes apple-reveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Spotify: System of Systems

### Philosophy
> Not a monolithic design system—a "family of design systems" matching squad culture.

- "Docs-as-code+" approach: engineers update in their workflow
- Goal: "engineers go from stuck to unstuck in 1 minute"
- Designers are "core contributors and co-authors"

### Encore Architecture
```
Encore Foundation (Base Layer)
├── Color
├── Typography
├── Motion
├── Spacing
├── Writing Guidelines
├── Accessibility
└── Design Tokens

Encore Web (Platform Layer)
├── Buttons
├── Dialogs
├── Form Controls
└── Web-specific components

Encore Consumer Mobile (Platform Layer)
├── iOS-specific
├── Android-specific
└── Cross-platform abstractions
```

### Color Philosophy
```css
/* Spotify Green as resting color for brand recognition */
:root {
  --spotify-green: #1db954;
  --spotify-black: #191414;
  --spotify-white: #ffffff;
  
  /* Dynamic color from album art */
  --dynamic-color: var(--album-dominant-color, #1db954);
}

/* Gradient from album colors */
.now-playing-bg {
  background: linear-gradient(
    180deg,
    var(--dynamic-color) 0%,
    var(--spotify-black) 100%
  );
}
```

### Typography: Circular
```css
@font-face {
  font-family: 'Circular';
  src: url('circular-std-medium.woff2') format('woff2');
  font-weight: 500;
  font-display: swap;
}

.spotify-heading {
  font-family: 'Circular', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.spotify-body {
  font-family: 'Circular', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 400;
}
```

### Custom Themes Support
Spotify supports 45 platforms, 200+ brands, 2000+ device types through:
- Semantic tokens over hardcoded values
- Platform-specific implementations
- Consistent API across platforms

---

## Cross-Reference Patterns

### What They All Share
| Pattern | Stripe | Linear | Apple | Spotify |
|---------|--------|--------|-------|---------|
| Dark mode quality | Gradients | Primary | Hero sections | Primary |
| Scroll interaction | Reveal | Minimal | Story driver | Minimal |
| Typography | Sohne, bold | System, precise | SF Pro, cinematic | Circular, warm |
| Color signature | Purple/pink gradient | Blue accent | White + product | Green + dynamic |
| Animation | Subtle, constant | Minimal, precise | Scroll-driven | Micro, playful |

### Borrowable Techniques
- **From Stripe**: Layered shadows, skewed sections, gradient craft
- **From Linear**: LCH colors, surface theming, pixel precision
- **From Apple**: Scroll storytelling, product-first composition
- **From Spotify**: Dynamic color extraction, platform adaptation

---

## Quick Implementation Reference

### Want Stripe-Level Polish?
1. Add 12-degree skewed sections
2. Layer 5 shadows on cards
3. Animate gradients subtly
4. Use mix-blend-mode on hero text

### Want Linear-Level Precision?
1. Switch to LCH/OKLCH color space
2. Use surface-based elevation
3. Align every pixel intentionally
4. Dark mode with brand tint, not pure black

### Want Apple-Level Storytelling?
1. Make content sticky during scroll
2. Reveal text progressively
3. Let products transform/rotate on scroll
4. Use 100vh+ section heights

### Want Spotify-Level Flexibility?
1. Build semantic token system
2. Support dynamic theming
3. Document for "stuck to unstuck in 1 minute"
4. Extract colors from media
