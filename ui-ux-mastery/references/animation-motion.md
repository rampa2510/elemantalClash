# Animation & Motion: Timing, Easing & Patterns

## Timing Guidelines

### Duration by Interaction Type
```css
:root {
  /* Micro-interactions: Button clicks, toggles */
  --duration-instant: 100ms;
  
  /* Simple state changes: Hover, focus */
  --duration-fast: 150ms;
  
  /* Standard transitions: Dropdowns, tabs */
  --duration-normal: 200ms;
  
  /* Complex transitions: Modals, sidebars */
  --duration-slow: 300ms;
  
  /* Page transitions: Route changes */
  --duration-slower: 400ms;
  
  /* Complex choreography */
  --duration-slowest: 500ms;
}

/* RULE: Anything >500ms feels sluggish for UI */
```

### Duration by Distance
```
Small movements (< 100px): 100-200ms
Medium movements (100-500px): 200-400ms
Large movements (> 500px): 400-600ms

The larger the movement, the longer it takes.
```

---

## Easing Curves

### Standard Easings
```css
:root {
  /* Standard - most UI transitions */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Ease Out - elements entering (fast start, gentle end) */
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  
  /* Ease In - elements exiting (slow start, fast end) */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  
  /* Ease In Out - elements moving on screen */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Expressive Easings
```css
:root {
  /* Bounce - playful interactions */
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  
  /* Snap - quick, precise responses */
  --ease-snap: cubic-bezier(0.16, 1, 0.3, 1);
  
  /* Soft - gentle, subtle movements */
  --ease-soft: cubic-bezier(0.45, 0, 0.55, 1);
  
  /* Elastic - springy feedback */
  --ease-elastic: cubic-bezier(0.68, -0.6, 0.32, 1.6);
}
```

### When to Use Each Easing
```
LINEAR (never for UI):
- Only for continuous animations like spinners
- Feels robotic for UI transitions

EASE-OUT (most common):
- Elements appearing
- Dropdowns opening
- Modals entering
- Content fading in

EASE-IN (sparingly):
- Elements disappearing
- Modals closing
- Content fading out

EASE-IN-OUT:
- Elements moving on screen
- Sidebar sliding
- Carousel transitions

BOUNCE/ELASTIC:
- Celebration moments
- Drawing attention
- Playful interactions
- Use sparingly!
```

---

## Common Animation Patterns

### Fade In
```css
.fade-in {
  animation: fadeIn var(--duration-normal) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Fade In Up
```css
.fade-in-up {
  animation: fadeInUp var(--duration-normal) var(--ease-out);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Scale In
```css
.scale-in {
  animation: scaleIn var(--duration-normal) var(--ease-out);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Slide In (from right)
```css
.slide-in-right {
  animation: slideInRight var(--duration-slow) var(--ease-out);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
```

### Staggered Animation
```css
.stagger-list > * {
  opacity: 0;
  animation: fadeInUp var(--duration-normal) var(--ease-out) forwards;
}

.stagger-list > *:nth-child(1) { animation-delay: 0ms; }
.stagger-list > *:nth-child(2) { animation-delay: 50ms; }
.stagger-list > *:nth-child(3) { animation-delay: 100ms; }
.stagger-list > *:nth-child(4) { animation-delay: 150ms; }
.stagger-list > *:nth-child(5) { animation-delay: 200ms; }

/* Dynamic with CSS custom property */
.stagger-item {
  animation-delay: calc(var(--index, 0) * 50ms);
}
```

```html
<ul class="stagger-list">
  <li style="--index: 0">Item 1</li>
  <li style="--index: 1">Item 2</li>
  <li style="--index: 2">Item 3</li>
</ul>
```

---

## Micro-Interactions

### Button Press
```css
.btn {
  transition: transform var(--duration-instant) var(--ease-out);
}

.btn:active {
  transform: scale(0.97);
}
```

### Hover Lift
```css
.card {
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

### Focus Ring
```css
.interactive {
  transition: box-shadow var(--duration-fast) var(--ease-out);
}

.interactive:focus-visible {
  box-shadow: 0 0 0 3px var(--color-primary-alpha);
}
```

### Toggle State
```css
.toggle-slider {
  transition: background var(--duration-fast) var(--ease-out);
}

.toggle-slider::before {
  transition: transform var(--duration-fast) var(--ease-bounce);
}
```

### Ripple Effect
```css
.btn-ripple {
  position: relative;
  overflow: hidden;
}

.btn-ripple::after {
  content: '';
  position: absolute;
  width: 100%;
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: scale(0);
  opacity: 1;
  pointer-events: none;
}

.btn-ripple:active::after {
  animation: ripple 0.4s var(--ease-out);
}

@keyframes ripple {
  to {
    transform: scale(2.5);
    opacity: 0;
  }
}
```

---

## Loading Animations

### Spinner
```css
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Pulse
```css
.pulse {
  animation: pulse 2s var(--ease-in-out) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Skeleton Shimmer
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

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Progress Bar
```css
.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s var(--ease-out);
}

/* Indeterminate */
.progress-bar-indeterminate::after {
  content: '';
  display: block;
  height: 100%;
  width: 30%;
  background: var(--color-primary);
  animation: indeterminate 1.5s infinite;
}

@keyframes indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
```

---

## Scroll-Driven Animations

### Progress Bar on Scroll
```css
.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--color-primary);
  transform-origin: left;
  animation: progress linear;
  animation-timeline: scroll();
}

@keyframes progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

### Fade In on Scroll
```css
.reveal {
  opacity: 0;
  transform: translateY(30px);
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 50%;
}

@keyframes reveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### JavaScript Fallback (Intersection Observer)
```javascript
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.animate-on-scroll').forEach(el => {
  observer.observe(el);
});
```

```css
.animate-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s var(--ease-out),
              transform 0.6s var(--ease-out);
}

.animate-on-scroll.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

---

## Performance Optimization

### Only Animate Compositor Properties
```css
/* ✅ GOOD - GPU accelerated, no layout/paint */
transform: translateX(100px);
transform: scale(1.1);
transform: rotate(45deg);
opacity: 0.5;

/* ❌ BAD - Triggers layout */
width: 200px;
height: 200px;
top: 100px;
left: 100px;
margin: 10px;
padding: 10px;

/* ❌ BAD - Triggers paint */
background: red;
border: 1px solid blue;
box-shadow: 0 2px 4px black;
```

### Use will-change Sparingly
```css
/* Only add before animation, remove after */
.will-animate {
  will-change: transform, opacity;
}

/* Don't use on everything! It consumes memory */
```

### Preload Animations on Hover Intent
```css
/* Start animation setup on hover of parent */
.card:hover .card-image {
  will-change: transform;
}

.card-image {
  transition: transform 0.3s var(--ease-out);
}

.card:hover .card-image {
  transform: scale(1.05);
}
```

### Shadow Animation Technique
```css
/* ❌ BAD - Animating box-shadow is expensive */
.card {
  transition: box-shadow 0.3s;
}
.card:hover {
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

/* ✅ GOOD - Animate opacity of pseudo-element */
.card {
  position: relative;
}

.card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  opacity: 0;
  transition: opacity 0.3s;
  z-index: -1;
}

.card:hover::after {
  opacity: 1;
}
```

---

## Reduced Motion

### Respect User Preference
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Alternative: Safe Motion
```css
@media (prefers-reduced-motion: reduce) {
  /* Remove problematic animations but keep opacity */
  .animate {
    animation: none;
    transform: none;
    transition: opacity 0.2s ease;
  }
}
```

### JavaScript Check
```javascript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

function animate(element, keyframes, options) {
  if (prefersReducedMotion) {
    // Skip animation, apply end state
    const endState = keyframes[keyframes.length - 1];
    Object.assign(element.style, endState);
    return;
  }
  
  return element.animate(keyframes, options);
}
```

---

## View Transitions API

### Basic Page Transition
```css
@view-transition {
  navigation: auto;
}

/* Customize animation */
::view-transition-old(root) {
  animation: fade-out 0.2s ease-in;
}

::view-transition-new(root) {
  animation: fade-in 0.3s ease-out;
}

@keyframes fade-out {
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
}
```

### Named Transitions
```css
/* Mark elements for transition */
.hero-image {
  view-transition-name: hero;
}

/* Custom animation for this element */
::view-transition-old(hero),
::view-transition-new(hero) {
  animation-duration: 0.4s;
}
```

### JavaScript Trigger
```javascript
// Wrap DOM changes in transition
document.startViewTransition(async () => {
  // Update the DOM
  await updateContent();
});
```

---

## Quick Reference

### Animation Checklist
- [ ] Duration appropriate for interaction type?
- [ ] Easing curve matches intent?
- [ ] Only animating transform/opacity?
- [ ] Reduced motion respected?
- [ ] No animation >500ms for UI?
- [ ] Stagger delays reasonable (<200ms)?

### Easing Quick Reference
```
Element appearing → ease-out
Element disappearing → ease-in  
Element moving → ease-in-out
Button press → ease-out (fast)
Celebration → bounce/elastic
Loading/continuous → linear
```
