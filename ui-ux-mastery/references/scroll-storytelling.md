# Scroll Storytelling: Narrative Through Motion

## The Philosophy

> Scroll is not pagination—it's pacing.

Award-winning sites treat scroll as a narrative device:
- **Reveal** information progressively
- **Transform** content as users journey
- **Reward** exploration with visual discoveries
- **Guide** without removing control

---

## Core Techniques

### 1. CSS Scroll-Driven Animations (Native)

Modern browsers support native scroll animations:

```css
/* Progress bar that fills as you scroll */
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--color-primary);
  transform-origin: left;
  animation: grow-progress linear;
  animation-timeline: scroll();
}

@keyframes grow-progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

```css
/* Element reveals when entering viewport */
.reveal-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  animation: reveal-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes reveal-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

```css
/* Header shrinks as you scroll */
.shrinking-header {
  padding: 2rem;
  animation: shrink-header linear both;
  animation-timeline: scroll();
  animation-range: 0 200px;
}

@keyframes shrink-header {
  to {
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
  }
}
```

### 2. Parallax Layers

```css
.parallax-container {
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  perspective: 1px;
  perspective-origin: center center;
}

.parallax-layer {
  position: absolute;
  inset: 0;
}

.parallax-layer--back {
  transform: translateZ(-2px) scale(3);
}

.parallax-layer--mid {
  transform: translateZ(-1px) scale(2);
}

.parallax-layer--front {
  transform: translateZ(0);
}
```

**JavaScript Alternative (More Control)**:
```javascript
class ParallaxController {
  constructor() {
    this.layers = document.querySelectorAll('[data-parallax]');
    this.setupScroll();
  }
  
  setupScroll() {
    let ticking = false;
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.updateLayers();
          ticking = false;
        });
        ticking = true;
      }
    });
  }
  
  updateLayers() {
    const scrollY = window.scrollY;
    
    this.layers.forEach(layer => {
      const speed = parseFloat(layer.dataset.parallax) || 0.5;
      const yPos = scrollY * speed;
      layer.style.transform = `translate3d(0, ${yPos}px, 0)`;
    });
  }
}
```

### 3. Sticky Sections with Progressive Reveal

```html
<section class="sticky-section">
  <div class="sticky-content">
    <div class="reveal-panel" data-panel="1">
      <h2>First Feature</h2>
      <p>Description...</p>
    </div>
    <div class="reveal-panel" data-panel="2">
      <h2>Second Feature</h2>
      <p>Description...</p>
    </div>
    <div class="reveal-panel" data-panel="3">
      <h2>Third Feature</h2>
      <p>Description...</p>
    </div>
  </div>
</section>
```

```css
.sticky-section {
  height: 300vh; /* Room for scroll */
  position: relative;
}

.sticky-content {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reveal-panel {
  position: absolute;
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.reveal-panel.active {
  opacity: 1;
  transform: translateY(0);
}
```

```javascript
class StickyReveal {
  constructor(section) {
    this.section = section;
    this.panels = section.querySelectorAll('.reveal-panel');
    this.setupObserver();
  }
  
  setupObserver() {
    window.addEventListener('scroll', () => {
      const rect = this.section.getBoundingClientRect();
      const sectionHeight = this.section.offsetHeight;
      const viewportHeight = window.innerHeight;
      
      // Calculate progress through section (0 to 1)
      const scrolled = -rect.top;
      const scrollRange = sectionHeight - viewportHeight;
      const progress = Math.max(0, Math.min(1, scrolled / scrollRange));
      
      // Determine which panel to show
      const panelIndex = Math.floor(progress * this.panels.length);
      
      this.panels.forEach((panel, i) => {
        panel.classList.toggle('active', i === panelIndex);
      });
    });
  }
}
```

### 4. Horizontal Scroll Section

```html
<section class="horizontal-scroll">
  <div class="horizontal-track">
    <div class="horizontal-slide">Slide 1</div>
    <div class="horizontal-slide">Slide 2</div>
    <div class="horizontal-slide">Slide 3</div>
    <div class="horizontal-slide">Slide 4</div>
  </div>
</section>
```

```css
.horizontal-scroll {
  height: 400vh; /* 4 slides × 100vh */
  position: relative;
}

.horizontal-track {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  overflow: hidden;
}

.horizontal-slide {
  flex: 0 0 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

```javascript
class HorizontalScroll {
  constructor(section) {
    this.section = section;
    this.track = section.querySelector('.horizontal-track');
    this.slides = section.querySelectorAll('.horizontal-slide');
    
    this.setupScroll();
  }
  
  setupScroll() {
    window.addEventListener('scroll', () => {
      const rect = this.section.getBoundingClientRect();
      const sectionHeight = this.section.offsetHeight;
      const viewportHeight = window.innerHeight;
      
      const scrolled = -rect.top;
      const scrollRange = sectionHeight - viewportHeight;
      const progress = Math.max(0, Math.min(1, scrolled / scrollRange));
      
      // Move track horizontally based on scroll progress
      const totalWidth = (this.slides.length - 1) * window.innerWidth;
      const translateX = -progress * totalWidth;
      
      this.track.style.transform = `translateX(${translateX}px)`;
    });
  }
}
```

### 5. Video Scrubbing on Scroll

```javascript
class VideoScrubber {
  constructor(video, section) {
    this.video = video;
    this.section = section;
    this.video.pause();
    
    // Preload video
    this.video.load();
    
    this.setupScroll();
  }
  
  setupScroll() {
    window.addEventListener('scroll', () => {
      const rect = this.section.getBoundingClientRect();
      const sectionHeight = this.section.offsetHeight;
      const viewportHeight = window.innerHeight;
      
      // Only scrub when section is in view
      if (rect.top < viewportHeight && rect.bottom > 0) {
        const scrolled = viewportHeight - rect.top;
        const scrollRange = sectionHeight + viewportHeight;
        const progress = Math.max(0, Math.min(1, scrolled / scrollRange));
        
        // Set video time based on scroll
        this.video.currentTime = progress * this.video.duration;
      }
    });
  }
}
```

### 6. Text Reveal Line by Line

```javascript
function splitIntoLines(element) {
  const text = element.innerHTML;
  const words = text.split(' ');
  element.innerHTML = '';
  
  // Temporarily render to calculate lines
  const tempSpan = document.createElement('span');
  tempSpan.style.visibility = 'hidden';
  document.body.appendChild(tempSpan);
  
  let currentLine = [];
  let lines = [];
  let lineWidth = 0;
  const maxWidth = element.offsetWidth;
  
  words.forEach(word => {
    tempSpan.textContent = word + ' ';
    const wordWidth = tempSpan.offsetWidth;
    
    if (lineWidth + wordWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine.join(' '));
      currentLine = [word];
      lineWidth = wordWidth;
    } else {
      currentLine.push(word);
      lineWidth += wordWidth;
    }
  });
  
  if (currentLine.length > 0) {
    lines.push(currentLine.join(' '));
  }
  
  tempSpan.remove();
  
  // Create line elements
  element.innerHTML = lines.map((line, i) => 
    `<span class="line" style="--line-index: ${i}">
      <span class="line-inner">${line}</span>
    </span>`
  ).join('');
}
```

```css
.line {
  display: block;
  overflow: hidden;
}

.line-inner {
  display: block;
  transform: translateY(100%);
  animation: line-reveal 0.6s ease forwards;
  animation-delay: calc(var(--line-index) * 0.1s);
}

@keyframes line-reveal {
  to { transform: translateY(0); }
}
```

---

## Performance Best Practices

### 1. Use Transform and Opacity Only
```css
/* ✅ GOOD - GPU accelerated */
.animated {
  transform: translateY(20px);
  opacity: 0;
}

/* ❌ BAD - Triggers layout/paint */
.animated {
  margin-top: 20px;
  visibility: hidden;
}
```

### 2. Throttle Scroll Events
```javascript
function throttle(fn, wait) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= wait) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}

window.addEventListener('scroll', throttle(() => {
  // Your scroll handler
}, 16)); // ~60fps
```

### 3. Use Intersection Observer for Visibility
```javascript
// Don't animate off-screen elements
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
    } else {
      entry.target.classList.remove('animate');
    }
  });
}, { threshold: 0.1 });
```

### 4. Will-Change for Heavy Animations
```css
/* Use sparingly - only for known animated properties */
.heavy-animation {
  will-change: transform, opacity;
}

/* Remove after animation completes */
.animation-complete {
  will-change: auto;
}
```

---

## Reduced Motion Support

**Always provide alternatives**:

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
  
  /* Show content immediately instead of animating */
  .reveal-on-scroll {
    opacity: 1;
    transform: none;
  }
  
  /* Disable parallax */
  [data-parallax] {
    transform: none !important;
  }
}
```

---

## Library Recommendations

### GSAP ScrollTrigger
```javascript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

gsap.to('.element', {
  scrollTrigger: {
    trigger: '.section',
    start: 'top center',
    end: 'bottom center',
    scrub: true, // Ties animation to scroll
  },
  y: -100,
  opacity: 0,
});
```

### Lenis (Smooth Scroll)
```javascript
import Lenis from '@studio-freight/lenis';

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  direction: 'vertical',
  smooth: true,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);
```

---

## Quick Reference

### When to Use Each Technique
| Goal | Technique |
|------|-----------|
| Progress indicator | CSS scroll-timeline |
| Layered depth | CSS/JS parallax |
| Feature walkthrough | Sticky reveal sections |
| Gallery/portfolio | Horizontal scroll |
| Product showcase | Video scrubbing |
| Text drama | Line-by-line reveal |

### Browser Support
| Feature | Support | Fallback |
|---------|---------|----------|
| scroll-timeline | ~70% | IntersectionObserver |
| view() function | ~70% | IntersectionObserver |
| CSS perspective | 95%+ | JS parallax |
| IntersectionObserver | 97%+ | Scroll event |
