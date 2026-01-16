# Layout Systems: Grid, Flexbox & Responsive Patterns

## CSS Grid

### Basic Grid Setup
```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.5rem;
}

/* Span columns */
.col-6 { grid-column: span 6; }
.col-4 { grid-column: span 4; }
.col-3 { grid-column: span 3; }
```

### Auto-Fit Responsive Grid (No Media Queries)
```css
/* Cards automatically adjust to fit */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 1.5rem;
}

/* IMPORTANT: min(100%, 280px) prevents overflow on small screens */
```

### Auto-Fill vs Auto-Fit
```css
/* auto-fill: Creates empty tracks if space available */
.auto-fill {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

/* auto-fit: Collapses empty tracks, items stretch */
.auto-fit {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

/* Use auto-fit for most cases - items fill available space */
```

### Grid Template Areas (Visual Layout)
```css
.page-layout {
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  grid-template-rows: auto 1fr auto;
  grid-template-areas: 
    "header  header  header"
    "sidebar main    aside"
    "footer  footer  footer";
  min-height: 100vh;
  gap: 1rem;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.aside   { grid-area: aside; }
.footer  { grid-area: footer; }

/* Responsive: Stack on mobile */
@media (max-width: 768px) {
  .page-layout {
    grid-template-columns: 1fr;
    grid-template-areas: 
      "header"
      "main"
      "sidebar"
      "aside"
      "footer";
  }
}
```

### Subgrid (Aligned Nested Layouts)
```css
/* Parent grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* Cards align their contents across siblings */
.card {
  display: grid;
  grid-template-rows: auto 1fr auto; /* Image, Content, Footer */
  gap: 1rem;
}

/* With subgrid - headers/footers align across cards */
.card-grid {
  grid-auto-rows: auto auto auto; /* Define row tracks */
}

.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;
}
```

### Dense Packing (Masonry-Like)
```css
.dense-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-auto-flow: dense;
  gap: 1rem;
}

.featured {
  grid-column: span 2;
  grid-row: span 2;
}
```

---

## Flexbox Patterns

### Centered Content
```css
.center-all {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Alternative with grid */
.center-grid {
  display: grid;
  place-items: center;
}
```

### Space Between (Navigation)
```css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
}

.navbar-left,
.navbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
```

### Flexible Card Content
```css
.card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card-body {
  flex: 1; /* Takes remaining space */
}

.card-footer {
  margin-top: auto; /* Pushes to bottom */
}
```

### Wrap with Gap
```css
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
```

### Equal Width Items
```css
.equal-columns {
  display: flex;
}

.equal-columns > * {
  flex: 1;
  min-width: 0; /* Prevents overflow */
}
```

---

## Container Queries

### Basic Usage
```css
/* Define container */
.card-wrapper {
  container: card / inline-size;
}

/* Query container size */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 1rem;
  }
}

@container card (max-width: 399px) {
  .card {
    display: block;
  }
  
  .card-image {
    aspect-ratio: 16 / 9;
    width: 100%;
  }
}
```

### Container Query Units
```css
/* cqi = 1% of container's inline size */
.card h2 {
  font-size: clamp(1rem, 5cqi + 0.5rem, 1.5rem);
}

/* cqw = container query width */
/* cqh = container query height */
/* cqmin = smaller of cqw/cqh */
/* cqmax = larger of cqw/cqh */
```

### Named Containers
```css
.sidebar {
  container: sidebar / inline-size;
}

.main-content {
  container: main / inline-size;
}

@container sidebar (min-width: 300px) {
  .widget { /* ... */ }
}

@container main (min-width: 800px) {
  .article { /* ... */ }
}
```

---

## Responsive Patterns

### Mobile-First Approach
```css
/* Base styles for mobile */
.container {
  padding: 1rem;
}

.grid {
  display: grid;
  gap: 1rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
  
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 4rem;
  }
  
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Responsive Without Breakpoints
```css
/* Fluid typography */
h1 {
  font-size: clamp(1.5rem, 4vw + 1rem, 3rem);
}

/* Fluid spacing */
.section {
  padding: clamp(2rem, 5vw, 6rem);
}

/* Auto-fit grid */
.grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
}

/* Flexible max-width */
.container {
  width: min(100% - 2rem, 1200px);
  margin-inline: auto;
}
```

### Content-Based Breakpoints
```css
/* Break when content needs it, not arbitrary widths */
.card-grid {
  /* Cards break to 1 column when < 300px each */
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

/* Reading content breaks at optimal line length */
.prose {
  max-width: 65ch;
}
```

---

## Common Layout Patterns

### Holy Grail Layout
```css
.holy-grail {
  display: grid;
  grid-template: 
    "header header header" auto
    "nav    main   aside" 1fr
    "footer footer footer" auto
    / 200px 1fr 200px;
  min-height: 100vh;
}

@media (max-width: 768px) {
  .holy-grail {
    grid-template: 
      "header" auto
      "nav" auto
      "main" 1fr
      "aside" auto
      "footer" auto
      / 1fr;
  }
}
```

### Sticky Footer
```css
/* Method 1: Grid */
.page {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

/* Method 2: Flexbox */
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main {
  flex: 1;
}
```

### Sidebar Layout
```css
.with-sidebar {
  display: grid;
  grid-template-columns: minmax(200px, 25%) 1fr;
  gap: 2rem;
}

/* Collapse sidebar on narrow screens */
@media (max-width: 768px) {
  .with-sidebar {
    grid-template-columns: 1fr;
  }
}
```

### Full-Bleed Layout
```css
.full-bleed-wrapper {
  display: grid;
  grid-template-columns: 
    1fr 
    min(65ch, 100% - 2rem) 
    1fr;
}

.full-bleed-wrapper > * {
  grid-column: 2;
}

.full-bleed {
  grid-column: 1 / -1;
  width: 100%;
}
```

### Card Grid with Featured
```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.card.featured {
  grid-column: span 2;
  grid-row: span 2;
}

/* Prevent overflow on small screens */
@media (max-width: 550px) {
  .card.featured {
    grid-column: span 1;
    grid-row: span 1;
  }
}
```

---

## Viewport Units

### Modern Viewport Units
```css
/* Traditional - problematic on mobile */
.hero { height: 100vh; }

/* Small viewport height - excludes browser chrome */
.hero { height: 100svh; }

/* Large viewport height - includes browser chrome */
.hero { height: 100lvh; }

/* Dynamic viewport height - adjusts as chrome shows/hides */
.hero { height: 100dvh; }

/* With fallback */
.hero {
  height: 100vh; /* Fallback */
  height: 100svh; /* Modern browsers */
}
```

### Safe Usage
```css
/* Use min-height instead of height */
.section {
  min-height: 100svh;
}

/* Combine with overflow handling */
.full-screen {
  height: 100svh;
  overflow-y: auto;
}
```

---

## Layout Shift Prevention

### Reserve Space for Dynamic Content
```css
/* Images */
img {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
  background: var(--placeholder-color);
}

/* Ad slots */
.ad-container {
  min-height: 250px;
}

/* Embeds */
.video-embed {
  aspect-ratio: 16 / 9;
}
```

### Skeleton Placeholders
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--skeleton-base) 25%,
    var(--skeleton-shine) 50%,
    var(--skeleton-base) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-text {
  height: 1em;
  border-radius: 4px;
  margin-bottom: 0.5em;
}

.skeleton-text:last-child {
  width: 60%;
}
```

### Font Loading
```css
/* Reserve space with fallback font */
body {
  font-family: 'Custom Font', system-ui, sans-serif;
}

/* Use font-display to control FOUT/FOIT */
@font-face {
  font-family: 'Custom Font';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}

/* Adjust metrics to match fallback */
@font-face {
  font-family: 'Custom Font Fallback';
  src: local('Arial');
  size-adjust: 105%;
  ascent-override: 90%;
  descent-override: 20%;
}
```

---

## Responsive Images

### srcset and sizes
```html
<img 
  src="image-800.jpg"
  srcset="
    image-400.jpg 400w,
    image-800.jpg 800w,
    image-1200.jpg 1200w,
    image-1600.jpg 1600w
  "
  sizes="
    (max-width: 600px) 100vw,
    (max-width: 1200px) 50vw,
    33vw
  "
  alt="Description"
  loading="lazy"
  decoding="async"
>
```

### Picture Element for Art Direction
```html
<picture>
  <source 
    media="(min-width: 1024px)" 
    srcset="hero-wide.jpg"
  >
  <source 
    media="(min-width: 768px)" 
    srcset="hero-medium.jpg"
  >
  <img 
    src="hero-mobile.jpg" 
    alt="Hero image"
  >
</picture>
```

### Object-Fit for Containers
```css
.image-container {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
```

---

## Quick Reference

### Grid Cheatsheet
```css
/* Parent */
display: grid;
grid-template-columns: repeat(3, 1fr);
grid-template-rows: auto 1fr auto;
gap: 1rem;
justify-items: center;     /* Horizontal alignment */
align-items: center;       /* Vertical alignment */
place-items: center;       /* Both */

/* Child */
grid-column: span 2;       /* Span columns */
grid-row: 1 / 3;          /* Row placement */
justify-self: end;        /* Individual alignment */
align-self: start;
```

### Flexbox Cheatsheet
```css
/* Parent */
display: flex;
flex-direction: row | column;
justify-content: flex-start | center | space-between;
align-items: stretch | center | flex-start;
flex-wrap: wrap;
gap: 1rem;

/* Child */
flex: 1;                  /* Grow to fill */
flex: 0 0 200px;         /* Fixed size */
align-self: center;
order: -1;               /* Move first */
```

### Breakpoint Scale
```css
/* Common breakpoints */
--bp-sm: 640px;   /* Mobile landscape */
--bp-md: 768px;   /* Tablet */
--bp-lg: 1024px;  /* Desktop */
--bp-xl: 1280px;  /* Large desktop */
--bp-2xl: 1536px; /* Extra large */
```
