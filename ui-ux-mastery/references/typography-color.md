# Typography & Color Systems

## Typography Scale

### Modular Scale (Mathematical)
```css
:root {
  --ratio: 1.25; /* Major Third - balanced, versatile */
  --base: 1rem;
  
  /* Calculate scale */
  --text-xs: calc(var(--base) / var(--ratio) / var(--ratio));
  --text-sm: calc(var(--base) / var(--ratio));
  --text-base: var(--base);
  --text-lg: calc(var(--base) * var(--ratio));
  --text-xl: calc(var(--base) * var(--ratio) * var(--ratio));
  --text-2xl: calc(var(--base) * var(--ratio) * var(--ratio) * var(--ratio));
  --text-3xl: calc(var(--base) * var(--ratio) * var(--ratio) * var(--ratio) * var(--ratio));
}

/* Common ratios:
   1.067 - Minor Second (subtle)
   1.125 - Major Second (gentle)
   1.200 - Minor Third (balanced)
   1.250 - Major Third (Material Design)
   1.333 - Perfect Fourth (classic print)
   1.414 - Augmented Fourth
   1.500 - Perfect Fifth (dramatic)
   1.618 - Golden Ratio (very dramatic)
*/
```

### Fluid Typography (No Breakpoints)
```css
:root {
  /* Formula: clamp(min, preferred, max) */
  /* Preferred: base + viewport-relative growth */
  
  --text-sm: clamp(0.83rem, 0.78rem + 0.25vw, 0.94rem);
  --text-base: clamp(1rem, 0.91rem + 0.43vw, 1.25rem);
  --text-lg: clamp(1.2rem, 1.05rem + 0.71vw, 1.56rem);
  --text-xl: clamp(1.44rem, 1.21rem + 1.1vw, 1.95rem);
  --text-2xl: clamp(1.73rem, 1.38rem + 1.7vw, 2.44rem);
  --text-3xl: clamp(2.07rem, 1.56rem + 2.5vw, 3.05rem);
  --text-4xl: clamp(2.49rem, 1.76rem + 3.6vw, 3.81rem);
}

/* Usage */
h1 { font-size: var(--text-4xl); }
h2 { font-size: var(--text-3xl); }
h3 { font-size: var(--text-2xl); }
h4 { font-size: var(--text-xl); }
p, li { font-size: var(--text-base); }
.caption { font-size: var(--text-sm); }
```

### Practical Scale (Direct Values)
```css
:root {
  --text-xs: 0.75rem;     /* 12px - captions, legal */
  --text-sm: 0.875rem;    /* 14px - secondary text */
  --text-base: 1rem;      /* 16px - body */
  --text-lg: 1.125rem;    /* 18px - lead text */
  --text-xl: 1.25rem;     /* 20px - h5 */
  --text-2xl: 1.5rem;     /* 24px - h4 */
  --text-3xl: 1.875rem;   /* 30px - h3 */
  --text-4xl: 2.25rem;    /* 36px - h2 */
  --text-5xl: 3rem;       /* 48px - h1 */
  --text-6xl: 3.75rem;    /* 60px - display */
}
```

---

## Line Height & Spacing

### Line Height Scale
```css
:root {
  --leading-none: 1;
  --leading-tight: 1.25;    /* Headings */
  --leading-snug: 1.375;
  --leading-normal: 1.5;    /* WCAG minimum for body */
  --leading-relaxed: 1.625;
  --leading-loose: 2;
}

/* Apply by context */
h1, h2, h3 { line-height: var(--leading-tight); }
p, li { line-height: var(--leading-normal); }
.small-text { line-height: var(--leading-relaxed); } /* Smaller text needs more */
```

### Reading Measure (Line Length)
```css
/* Research: 45-75 characters optimal, 66 ideal */
.prose {
  max-width: 65ch;
}

/* Fluid with clamp */
article {
  max-width: clamp(45ch, 100%, 75ch);
  margin-inline: auto;
}

/* Short-form content can be narrower */
.card-text {
  max-width: 45ch;
}
```

### Vertical Rhythm
```css
/* Consistent spacing based on line height */
:root {
  --rhythm: 1.5rem; /* Base line height × base size */
}

h1, h2, h3, p, ul, ol {
  margin-block: var(--rhythm);
}

/* Tighter spacing after headings */
h1 + *, h2 + *, h3 + * {
  margin-block-start: calc(var(--rhythm) * 0.5);
}
```

---

## Font Loading Optimization

### Font-Display Strategies
```css
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap; /* Most common - shows fallback, then swaps */
}

/* Options:
   auto - Browser decides
   block - Brief invisible, then font (FOIT)
   swap - Fallback immediately, swap when ready (FOUT)
   fallback - Brief invisible, fallback if slow, swap if fast
   optional - Brief invisible, only use if cached
*/
```

### Fallback Font Matching
```css
/* Adjust fallback to match custom font metrics */
@font-face {
  font-family: 'CustomFont-Fallback';
  src: local('Arial');
  size-adjust: 105%;      /* Scale to match */
  ascent-override: 90%;   /* Top of letters */
  descent-override: 22%;  /* Below baseline */
  line-gap-override: 0%;
}

body {
  font-family: 'CustomFont', 'CustomFont-Fallback', system-ui, sans-serif;
}
```

### Preload Critical Fonts
```html
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
```

---

## Variable Fonts

### Basic Usage
```css
@font-face {
  font-family: 'InterVariable';
  src: url('Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;    /* Range supported */
  font-style: normal;
}

/* Use any weight in the range */
.light { font-weight: 300; }
.regular { font-weight: 400; }
.medium { font-weight: 500; }
.semibold { font-weight: 600; }
.bold { font-weight: 700; }

/* Animate weight! */
.hover-bold {
  transition: font-weight 0.2s;
}
.hover-bold:hover {
  font-weight: 700;
}
```

### Variable Font Axes
```css
/* Common axes */
.text {
  font-variation-settings: 
    'wght' 400,   /* Weight */
    'wdth' 100,   /* Width */
    'slnt' 0,     /* Slant */
    'ital' 0,     /* Italic */
    'opsz' 16;    /* Optical size */
}

/* Use standard properties when available */
.text {
  font-weight: 450;           /* Maps to 'wght' */
  font-stretch: 110%;         /* Maps to 'wdth' */
  font-style: oblique 12deg;  /* Maps to 'slnt' */
}
```

---

## Color Systems

### HSL-Based System
```css
:root {
  /* Define hues */
  --hue-primary: 220;
  --hue-success: 142;
  --hue-warning: 38;
  --hue-error: 0;
  
  /* Generate colors from hue */
  --primary-50: hsl(var(--hue-primary) 90% 96%);
  --primary-100: hsl(var(--hue-primary) 85% 90%);
  --primary-200: hsl(var(--hue-primary) 80% 80%);
  --primary-300: hsl(var(--hue-primary) 75% 70%);
  --primary-400: hsl(var(--hue-primary) 70% 60%);
  --primary-500: hsl(var(--hue-primary) 65% 50%);
  --primary-600: hsl(var(--hue-primary) 70% 40%);
  --primary-700: hsl(var(--hue-primary) 75% 30%);
  --primary-800: hsl(var(--hue-primary) 80% 20%);
  --primary-900: hsl(var(--hue-primary) 85% 12%);
}
```

### OKLCH System (Perceptually Uniform)
```css
:root {
  /* OKLCH: Lightness (0-1), Chroma (0-0.4), Hue (0-360) */
  --primary: oklch(55% 0.2 250);
  
  /* Generate variations */
  --primary-light: oklch(from var(--primary) calc(l + 0.15) c h);
  --primary-dark: oklch(from var(--primary) calc(l - 0.15) c h);
  --primary-muted: oklch(from var(--primary) l calc(c * 0.5) h);
}

/* Why OKLCH > HSL:
   - Perceptually uniform lightness
   - Consistent perceived brightness across hues
   - No desaturation at extremes
   - Wider gamut support (P3, Rec.2020)
*/
```

### Semantic Color Tokens
```css
:root {
  /* Tier 1: Primitives */
  --blue-500: oklch(55% 0.2 250);
  --gray-100: oklch(95% 0.01 250);
  --gray-900: oklch(15% 0.01 250);
  --red-500: oklch(55% 0.22 25);
  --green-500: oklch(55% 0.18 145);
  
  /* Tier 2: Semantic */
  --color-primary: var(--blue-500);
  --color-text: var(--gray-900);
  --color-text-muted: oklch(45% 0.01 250);
  --color-surface: white;
  --color-border: var(--gray-100);
  --color-error: var(--red-500);
  --color-success: var(--green-500);
  
  /* Tier 3: Component */
  --button-bg: var(--color-primary);
  --button-text: white;
  --input-border: var(--color-border);
  --input-focus: var(--color-primary);
}
```

### Dynamic Colors with color-mix()
```css
.button {
  --bg: var(--color-primary);
  background: var(--bg);
}

.button:hover {
  /* Mix with white for lighter */
  background: color-mix(in oklch, var(--bg) 85%, white);
}

.button:active {
  /* Mix with black for darker */
  background: color-mix(in oklch, var(--bg) 85%, black);
}

/* Create alpha variations */
.overlay {
  background: color-mix(in oklch, var(--color-primary) 50%, transparent);
}
```

---

## Dark Mode

### CSS-Only with light-dark()
```css
:root {
  color-scheme: light dark;
  
  --bg: light-dark(#ffffff, #121212);
  --text: light-dark(#1a1a1a, #fafafa);
  --text-muted: light-dark(#666666, #a0a0a0);
  --surface: light-dark(#f5f5f5, #1e1e1e);
  --border: light-dark(#e0e0e0, #333333);
}

/* Usage - automatically switches! */
body {
  background: var(--bg);
  color: var(--text);
}
```

### Prefers-Color-Scheme
```css
:root {
  --bg: #ffffff;
  --text: #1a1a1a;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #121212;
    --text: #fafafa;
  }
}
```

### Theme Toggle (JS + CSS)
```css
/* Define themes */
:root,
[data-theme="light"] {
  --bg: #ffffff;
  --text: #1a1a1a;
  --surface: #f5f5f5;
}

[data-theme="dark"] {
  --bg: #0f172a;
  --text: #f1f5f9;
  --surface: #1e293b;
}
```

```javascript
// Theme toggle
function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const next = current === 'dark' ? 'light' : 'dark';
  
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
}

// On load - respect system preference as default
function initTheme() {
  const stored = localStorage.getItem('theme');
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  
  document.documentElement.dataset.theme = stored || system;
}

// Listen for system changes
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    }
  });
```

### Dark Mode Adjustments
```css
[data-theme="dark"] {
  /* Reduce brightness of images */
  img:not([src*=".svg"]) {
    filter: brightness(0.9);
  }
  
  /* Reduce shadow intensity */
  --shadow-color: 0 0% 0%;
  --shadow-opacity: 0.3;
  
  /* Slightly reduce saturation */
  --color-primary: oklch(65% 0.18 250); /* Less chroma than light */
}
```

---

## Text Styling

### Text Balance (Headlines)
```css
h1, h2, h3 {
  text-wrap: balance;
}

/* Prevent orphans in paragraphs */
p {
  text-wrap: pretty;
}
```

### Truncation
```css
/* Single line */
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Multi-line */
.line-clamp-3 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}
```

### Selection Styling
```css
::selection {
  background: var(--color-primary);
  color: white;
}

/* Firefox */
::-moz-selection {
  background: var(--color-primary);
  color: white;
}
```

### Links
```css
a {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 0.2em;
  text-decoration-thickness: 1px;
  transition: text-decoration-color 0.2s;
}

a:hover {
  text-decoration-thickness: 2px;
}

/* Remove underline for nav links */
.nav a {
  text-decoration: none;
}
```

---

## Font Stacks

### System UI
```css
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 
               'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 
               'Open Sans', 'Helvetica Neue', sans-serif;
}
```

### Monospace
```css
code, pre {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', 
               Menlo, Consolas, 'Liberation Mono', monospace;
}
```

### Serif
```css
.prose {
  font-family: ui-serif, Georgia, Cambria, 
               'Times New Roman', Times, serif;
}
```

---

## Quick Reference

### Typography Checklist
- [ ] Type scale systematic (not arbitrary sizes)
- [ ] Line height ≥ 1.5 for body (WCAG)
- [ ] Line length 45-75 characters
- [ ] Font loading optimized (swap, preload)
- [ ] Responsive (fluid or breakpoint-based)
- [ ] text-wrap: balance on headings

### Color Checklist
- [ ] Contrast ratio ≥ 4.5:1 (normal text)
- [ ] Contrast ratio ≥ 3:1 (large text)
- [ ] Never rely on color alone
- [ ] Dark mode supported
- [ ] Semantic tokens (not hard-coded colors)
- [ ] color-mix() for dynamic variations
