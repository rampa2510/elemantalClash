# Advanced CSS: Modern Features & Techniques

## Browser Support Reference

| Feature | Support | Usage |
|---------|---------|-------|
| `:has()` | Baseline 2023 | Production-ready |
| Container Queries | 93%+ | Production-ready |
| CSS Nesting | Baseline 2023 | Production-ready |
| `light-dark()` | Baseline 2024 | Use with fallback |
| View Transitions | 70%+ | Progressive enhancement |
| Subgrid | 90%+ | Production-ready |
| `@scope` | 70%+ | Progressive enhancement |
| Scroll-driven animations | 70%+ | Progressive enhancement |

---

## :has() - The Parent Selector

### Basic Usage
```css
/* Style parent based on child */
.card:has(img) {
  /* Card contains an image */
  padding: 0;
}

.card:has(.card-footer) {
  /* Card has a footer */
  padding-bottom: 0;
}
```

### Form Styling
```css
/* Style label when input is focused */
.form-group:has(input:focus) label {
  color: var(--color-primary);
  transform: translateY(-2px);
}

/* Style container when input is invalid */
.form-group:has(input:invalid:not(:placeholder-shown)) {
  --input-border: var(--color-error);
}

/* Required field indicator */
.form-group:has(input:required) label::after {
  content: ' *';
  color: var(--color-error);
}
```

### Layout Adjustments
```css
/* Adjust grid when sidebar exists */
.page:has(.sidebar) {
  grid-template-columns: 250px 1fr;
}

.page:not(:has(.sidebar)) {
  grid-template-columns: 1fr;
}

/* Full-bleed images when first child */
article:has(> img:first-child) {
  padding-top: 0;
}
```

### State-Based Styling
```css
/* Disable form submit when invalid */
form:has(:invalid) button[type="submit"] {
  opacity: 0.5;
  pointer-events: none;
}

/* Show clear button when input has value */
.search:has(input:not(:placeholder-shown)) .clear-btn {
  display: block;
}

/* Style based on checkbox state */
.filter-section:has(input[type="checkbox"]:checked) {
  background: var(--color-surface-alt);
}
```

---

## Container Queries

### Basic Setup
```css
/* Define container */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Query the container */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}

@container card (max-width: 399px) {
  .card {
    display: block;
  }
  
  .card img {
    aspect-ratio: 16/9;
    width: 100%;
  }
}
```

### Shorthand
```css
/* Combined container-type and container-name */
.card-container {
  container: card / inline-size;
}
```

### Container Query Units
```css
/* Units relative to container */
.card-title {
  font-size: clamp(1rem, 5cqi, 2rem);
  /* cqi = 1% of container inline size */
  /* cqb = 1% of container block size */
  /* cqmin = smaller of cqi/cqb */
  /* cqmax = larger of cqi/cqb */
}
```

### Responsive Components
```css
.product-card-container {
  container: product / inline-size;
}

/* Mobile: Vertical stack */
@container product (max-width: 299px) {
  .product-card {
    display: flex;
    flex-direction: column;
  }
  .product-image { aspect-ratio: 1; }
  .product-info { padding: 1rem; }
}

/* Tablet: Horizontal */
@container product (min-width: 300px) and (max-width: 499px) {
  .product-card {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 1rem;
  }
}

/* Desktop: Larger image */
@container product (min-width: 500px) {
  .product-card {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 1.5rem;
  }
  .product-title { font-size: 1.5rem; }
}
```

---

## CSS Nesting

### Basic Nesting
```css
.card {
  padding: 1rem;
  background: white;
  
  /* Nested selector */
  & .card-title {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }
  
  /* Pseudo-classes */
  &:hover {
    box-shadow: var(--shadow-md);
  }
  
  /* Pseudo-elements */
  &::before {
    content: '';
  }
  
  /* Media queries */
  @media (min-width: 768px) {
    padding: 2rem;
  }
}
```

### Nesting with Combinators
```css
.nav {
  /* Direct child */
  > li {
    display: inline-block;
  }
  
  /* Adjacent sibling */
  & + .content {
    margin-top: 2rem;
  }
  
  /* Append to parent selector */
  .dark-theme & {
    background: #222;
  }
}
```

### Nesting Container Queries
```css
.widget {
  container: widget / inline-size;
  
  @container widget (min-width: 400px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
```

---

## Dark Mode with light-dark()

### Modern Approach
```css
:root {
  color-scheme: light dark;
  
  --color-bg: light-dark(#ffffff, #1a1a1a);
  --color-text: light-dark(#1a1a1a, #f0f0f0);
  --color-border: light-dark(#e0e0e0, #333333);
  --color-surface: light-dark(#f5f5f5, #252525);
}

body {
  background: var(--color-bg);
  color: var(--color-text);
}
```

### With Fallback
```css
:root {
  /* Fallback for older browsers */
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
}

@supports (color: light-dark(white, black)) {
  :root {
    color-scheme: light dark;
    --color-bg: light-dark(#ffffff, #1a1a1a);
    --color-text: light-dark(#1a1a1a, #f0f0f0);
  }
}
```

### Manual Toggle
```css
/* System preference */
:root {
  color-scheme: light dark;
}

/* User override */
[data-theme="light"] {
  color-scheme: light;
}

[data-theme="dark"] {
  color-scheme: dark;
}
```

---

## View Transitions

### Basic Page Transitions
```css
/* Enable for same-document navigations */
@view-transition {
  navigation: auto;
}

/* Default crossfade */
::view-transition-old(root) {
  animation: fade-out 0.3s ease-out;
}

::view-transition-new(root) {
  animation: fade-in 0.3s ease-in;
}

@keyframes fade-out {
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
}
```

### Named Transitions (Shared Elements)
```css
/* Mark element for transition */
.hero-image {
  view-transition-name: hero;
}

/* Customize the transition */
::view-transition-old(hero),
::view-transition-new(hero) {
  animation-duration: 0.5s;
}

::view-transition-group(hero) {
  animation-timing-function: ease-in-out;
}
```

### JavaScript API
```javascript
// Trigger transition programmatically
document.startViewTransition(() => {
  // Update DOM here
  updateContent();
});

// With async
document.startViewTransition(async () => {
  await fetchNewContent();
  container.innerHTML = newContent;
});
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

---

## Subgrid

### Basic Usage
```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  /* Inherit parent columns for alignment */
  grid-template-columns: subgrid;
}

/* All card titles align, all footers align */
```

### Practical Example
```css
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.product-card {
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  /* rows: image, title, description, price */
}

/* With subgrid, all prices align even with varying content */
```

---

## Scroll-Driven Animations

### Scroll Progress
```css
@keyframes reveal {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-on-scroll {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
```

### Scroll-Linked Header
```css
@keyframes shrink-header {
  to {
    padding-block: 0.5rem;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
  }
}

.header {
  animation: shrink-header linear both;
  animation-timeline: scroll();
  animation-range: 0 200px;
}
```

### Reading Progress Bar
```css
.progress-bar {
  transform-origin: left;
  animation: grow-progress linear;
  animation-timeline: scroll();
}

@keyframes grow-progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

---

## @scope

### Basic Scoping
```css
@scope (.card) {
  /* Only applies within .card */
  :scope {
    padding: 1rem;
  }
  
  .title {
    font-size: 1.25rem;
  }
  
  .content {
    color: var(--color-muted);
  }
}
```

### Scoping with Limits
```css
/* Apply within .article but not inside .comments */
@scope (.article) to (.comments) {
  p {
    line-height: 1.7;
    max-width: 65ch;
  }
  
  a {
    color: var(--color-primary);
  }
}
```

---

## Modern Selectors

### :is() and :where()
```css
/* :is() - takes specificity of most specific selector */
:is(h1, h2, h3, h4, h5, h6) {
  line-height: 1.2;
}

/* :where() - zero specificity (easily overridable) */
:where(.card, .panel, .box) {
  padding: 1rem;
  border-radius: 8px;
}
```

### :not() with Multiple Arguments
```css
/* Style all buttons except disabled or loading */
button:not(:disabled, .loading) {
  cursor: pointer;
}
```

### :focus-visible
```css
/* Only show focus ring for keyboard navigation */
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

button:focus:not(:focus-visible) {
  outline: none;
}
```

---

## Quick Reference

### Modern Reset Additions
```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  color-scheme: light dark;
  hanging-punctuation: first last;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
}

p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
  text-wrap: balance; /* or pretty for paragraphs */
}
```

### Feature Detection
```css
@supports (container-type: inline-size) {
  /* Container query styles */
}

@supports selector(:has(*)) {
  /* :has() styles */
}

@supports (view-transition-name: none) {
  /* View transition styles */
}
```
