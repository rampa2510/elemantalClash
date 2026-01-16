# Shadows & Depth: Elevation Systems

## The Problem with Flat Shadows

```css
/* ❌ BAD: Single flat shadow - looks artificial */
.card {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* This creates a harsh, unrealistic shadow because:
   - Real shadows have multiple layers
   - Light sources create soft penumbras
   - Objects at different heights cast different shadows
*/
```

---

## Layered Shadows (Realistic Depth)

### The Technique
```css
/* ✅ GOOD: Multiple layers create realistic depth */
.card {
  box-shadow: 
    0 1px 1px hsl(0 0% 0% / 0.075),
    0 2px 2px hsl(0 0% 0% / 0.075),
    0 4px 4px hsl(0 0% 0% / 0.075),
    0 8px 8px hsl(0 0% 0% / 0.075),
    0 16px 16px hsl(0 0% 0% / 0.075);
}

/* Each layer doubles in size, creating smooth falloff */
```

### Why It Works
```
Each layer represents light at different angles:
- Small, tight shadows: Direct overhead light
- Larger, softer shadows: Ambient/bounced light
- Combined: Natural-looking depth

The opacity is split across layers so total doesn't exceed
what a single shadow would have (~0.2-0.3 total)
```

---

## Elevation Scale

### Complete Shadow System
```css
:root {
  /* Elevation 0 - Flat (no shadow) */
  --shadow-0: none;
  
  /* Elevation 1 - Resting (cards, buttons) */
  --shadow-sm: 
    0 1px 2px hsl(0 0% 0% / 0.05),
    0 1px 3px hsl(0 0% 0% / 0.1);
  
  /* Elevation 2 - Raised (hover states) */
  --shadow-md: 
    0 1px 2px hsl(0 0% 0% / 0.07),
    0 2px 4px hsl(0 0% 0% / 0.07),
    0 4px 8px hsl(0 0% 0% / 0.07);
  
  /* Elevation 3 - Floating (dropdowns, tooltips) */
  --shadow-lg: 
    0 1px 3px hsl(0 0% 0% / 0.04),
    0 4px 6px hsl(0 0% 0% / 0.04),
    0 8px 12px hsl(0 0% 0% / 0.04),
    0 16px 24px hsl(0 0% 0% / 0.04);
  
  /* Elevation 4 - High (modals, dialogs) */
  --shadow-xl: 
    0 2px 4px hsl(0 0% 0% / 0.03),
    0 4px 8px hsl(0 0% 0% / 0.03),
    0 8px 16px hsl(0 0% 0% / 0.03),
    0 16px 32px hsl(0 0% 0% / 0.03),
    0 32px 64px hsl(0 0% 0% / 0.03);
  
  /* Elevation 5 - Highest (popovers over modals) */
  --shadow-2xl: 
    0 4px 8px hsl(0 0% 0% / 0.02),
    0 8px 16px hsl(0 0% 0% / 0.02),
    0 16px 32px hsl(0 0% 0% / 0.02),
    0 32px 64px hsl(0 0% 0% / 0.02),
    0 64px 128px hsl(0 0% 0% / 0.02);
}
```

### When to Use Each Level
```
Level 0: Flat elements (inline elements, text)
Level 1: Cards, buttons at rest, form inputs
Level 2: Hovered cards, focused inputs, raised buttons
Level 3: Dropdowns, tooltips, floating action buttons
Level 4: Modals, dialogs, side panels
Level 5: Nested overlays (rare)
```

---

## Colored Shadows

### Match Shadow to Element Color
```css
/* Colored shadows feel more cohesive */
.card-blue {
  background: var(--color-primary);
  box-shadow: 
    0 4px 14px hsl(220 70% 50% / 0.25),
    0 2px 4px hsl(220 70% 50% / 0.2);
}

/* For images - sample dominant color or use generic warm/cool */
.image-card {
  box-shadow: 
    0 4px 14px hsl(var(--image-hue) 40% 40% / 0.3);
}
```

### Dark Mode Shadows
```css
/* Shadows work differently in dark mode */
[data-theme="dark"] {
  --shadow-sm: 
    0 1px 2px hsl(0 0% 0% / 0.3),
    0 1px 3px hsl(0 0% 0% / 0.4);
  
  --shadow-md: 
    0 1px 2px hsl(0 0% 0% / 0.4),
    0 2px 4px hsl(0 0% 0% / 0.3),
    0 4px 8px hsl(0 0% 0% / 0.3);
  
  /* OR use glow effect instead */
  --shadow-glow: 0 0 20px hsl(var(--hue-primary) 60% 50% / 0.15);
}
```

---

## Performance: Animating Shadows

### The Problem
```css
/* ❌ BAD: Animating box-shadow is expensive */
.card {
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.3s;
}

.card:hover {
  box-shadow: var(--shadow-lg);
}

/* This triggers paint on every frame */
```

### The Solution: Pseudo-Element Technique
```css
/* ✅ GOOD: Animate opacity of pseudo-element */
.card {
  position: relative;
  box-shadow: var(--shadow-sm);
}

.card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: var(--shadow-lg);
  opacity: 0;
  transition: opacity 0.3s;
  z-index: -1;
  pointer-events: none;
}

.card:hover::after {
  opacity: 1;
}

/* Only animates opacity (compositor layer) */
```

---

## Inset Shadows (Inner Depth)

### Pressed/Inset States
```css
.button-pressed {
  box-shadow: inset 0 2px 4px hsl(0 0% 0% / 0.1);
}

.input {
  box-shadow: inset 0 1px 2px hsl(0 0% 0% / 0.05);
}

/* Combine inset and outset */
.neumorphic {
  box-shadow: 
    /* Outset light source */
    -5px -5px 10px hsl(0 0% 100% / 0.8),
    /* Outset shadow */
    5px 5px 10px hsl(0 0% 0% / 0.1),
    /* Inset for depth */
    inset 1px 1px 2px hsl(0 0% 100% / 0.5),
    inset -1px -1px 2px hsl(0 0% 0% / 0.05);
}
```

---

## Glassmorphism

### Frosted Glass Effect
```css
.glass {
  background: hsl(0 0% 100% / 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid hsl(0 0% 100% / 0.2);
  box-shadow: 
    0 8px 32px hsl(0 0% 0% / 0.1),
    inset 0 0 0 1px hsl(0 0% 100% / 0.1);
}

/* Dark glass */
.glass-dark {
  background: hsl(0 0% 0% / 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid hsl(0 0% 100% / 0.1);
}
```

### Performance Note
```css
/* backdrop-filter can be expensive */
/* Use sparingly, test on low-end devices */
/* Provide fallback for unsupported browsers */

@supports not (backdrop-filter: blur(10px)) {
  .glass {
    background: hsl(0 0% 100% / 0.9);
  }
}
```

---

## Border vs Shadow for Depth

### When to Use Each
```
BORDERS:
- Clear boundaries between elements
- Form inputs
- Table cells
- Dividers

SHADOWS:
- Floating elements
- Cards on background
- Modals and overlays
- Hover lift effects

BOTH:
- Glass effects (shadow + transparent border)
- Cards with defined edges
```

### Subtle Border Technique
```css
/* Border that's almost invisible but adds definition */
.card {
  border: 1px solid hsl(0 0% 0% / 0.05);
  box-shadow: var(--shadow-sm);
}

/* In dark mode */
[data-theme="dark"] .card {
  border: 1px solid hsl(0 0% 100% / 0.1);
}
```

---

## Z-Index Scale

### Consistent Layering
```css
:root {
  --z-below: -1;
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;
  --z-toast: 800;
  --z-max: 9999;
}
```

### Usage
```css
.dropdown { z-index: var(--z-dropdown); }
.sticky-header { z-index: var(--z-sticky); }
.modal-backdrop { z-index: var(--z-modal-backdrop); }
.modal { z-index: var(--z-modal); }
.tooltip { z-index: var(--z-tooltip); }
```

---

## Quick Reference

### Shadow Formula
```
For N layers of shadow:
- Each layer Y offset: 2^i pixels (1, 2, 4, 8, 16...)
- Each layer blur: 2^i pixels
- Each layer opacity: total_opacity / N

Example for 5 layers at 0.25 total opacity:
  0 1px 1px / 0.05
  0 2px 2px / 0.05
  0 4px 4px / 0.05
  0 8px 8px / 0.05
  0 16px 16px / 0.05
```

### Elevation Guidelines
| Element | Elevation | Shadow Variable |
|---------|-----------|-----------------|
| Cards (rest) | 1 | --shadow-sm |
| Cards (hover) | 2 | --shadow-md |
| Dropdowns | 3 | --shadow-lg |
| Modals | 4 | --shadow-xl |
| Tooltips | 3 | --shadow-lg |
| FAB | 2-3 | --shadow-md/lg |
| App bar | 1-2 | --shadow-sm/md |
