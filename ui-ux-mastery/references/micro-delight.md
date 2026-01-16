# Micro-Delight: Interactions That Create Connection

## Beyond Functional Feedback

Standard micro-interactions provide feedback. Delightful ones create emotional connection.

### Dan Saffer's Four Components
1. **Trigger**: What initiates the interaction
2. **Rules**: What happens during
3. **Feedback**: How the user knows what happened
4. **Loops/Modes**: What happens over time

### The Delight Spectrum
```
Functional ──────────────────────────────────── Delightful
  │                                                    │
  │  "Button clicked"                   "Satisfying button press
  │                                      with subtle bounce,
  │                                      magnetic attraction,
  │                                      and completion celebration"
```

---

## Signature Micro-Interactions

### 1. Magnetic Buttons

Button attracts cursor as it approaches:

```javascript
class MagneticButton {
  constructor(button) {
    this.button = button;
    this.strength = 0.4;
    this.relaxStrength = 0.1;
    
    this.button.addEventListener('mousemove', (e) => this.attract(e));
    this.button.addEventListener('mouseleave', () => this.release());
  }
  
  attract(e) {
    const rect = this.button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    
    const moveX = distanceX * this.strength;
    const moveY = distanceY * this.strength;
    
    this.button.style.transform = `translate(${moveX}px, ${moveY}px)`;
    
    // Optional: also move button content slightly more
    const content = this.button.querySelector('.btn-content');
    if (content) {
      content.style.transform = `translate(${moveX * 0.2}px, ${moveY * 0.2}px)`;
    }
  }
  
  release() {
    this.button.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    this.button.style.transform = 'translate(0, 0)';
    
    const content = this.button.querySelector('.btn-content');
    if (content) {
      content.style.transform = 'translate(0, 0)';
    }
    
    setTimeout(() => {
      this.button.style.transition = '';
    }, 400);
  }
}
```

### 2. Button Press Effect

Satisfying tactile press:

```css
.tactile-button {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.15s ease;
}

/* 3D depth */
.tactile-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: inherit;
  filter: brightness(0.8);
  transform: translateZ(-4px);
  border-radius: inherit;
}

.tactile-button:hover {
  transform: translateY(-2px);
}

.tactile-button:active {
  transform: translateY(2px) translateZ(-2px);
  transition-duration: 0.05s;
}

/* Optional ripple */
.tactile-button .ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transform: scale(0);
  animation: ripple-out 0.6s ease-out;
  pointer-events: none;
}

@keyframes ripple-out {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
```

```javascript
document.querySelectorAll('.tactile-button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size/2}px`;
    ripple.style.top = `${e.clientY - rect.top - size/2}px`;
    
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
});
```

### 3. Hover Lift with Shadow

Card lifts toward cursor:

```css
.lift-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  transform-style: preserve-3d;
}

.lift-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 
    0 10px 20px rgba(0,0,0,0.08),
    0 20px 40px rgba(0,0,0,0.08);
}
```

**3D Tilt Effect**:
```javascript
class TiltCard {
  constructor(card) {
    this.card = card;
    this.maxTilt = 10;
    
    card.addEventListener('mousemove', (e) => this.tilt(e));
    card.addEventListener('mouseleave', () => this.reset());
  }
  
  tilt(e) {
    const rect = this.card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const percentX = (e.clientX - centerX) / (rect.width / 2);
    const percentY = (e.clientY - centerY) / (rect.height / 2);
    
    const tiltX = -percentY * this.maxTilt;
    const tiltY = percentX * this.maxTilt;
    
    this.card.style.transform = `
      perspective(1000px)
      rotateX(${tiltX}deg)
      rotateY(${tiltY}deg)
      scale(1.02)
    `;
  }
  
  reset() {
    this.card.style.transition = 'transform 0.5s ease';
    this.card.style.transform = '';
    setTimeout(() => {
      this.card.style.transition = '';
    }, 500);
  }
}
```

### 4. Form Field Focus

Animated label and glow:

```html
<div class="fancy-field">
  <input type="text" id="email" placeholder=" " required />
  <label for="email">Email address</label>
  <span class="focus-border"></span>
</div>
```

```css
.fancy-field {
  position: relative;
  margin: 1.5rem 0;
}

.fancy-field input {
  width: 100%;
  padding: 1rem 0.5rem 0.5rem;
  border: none;
  border-bottom: 2px solid var(--color-border);
  background: transparent;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.fancy-field label {
  position: absolute;
  left: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
  transition: all 0.3s ease;
}

.fancy-field input:focus,
.fancy-field input:not(:placeholder-shown) {
  border-color: var(--color-primary);
  outline: none;
}

.fancy-field input:focus + label,
.fancy-field input:not(:placeholder-shown) + label {
  top: 0;
  transform: translateY(-100%);
  font-size: 0.75rem;
  color: var(--color-primary);
}

.focus-border {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: var(--color-primary);
  transition: all 0.3s ease;
}

.fancy-field input:focus ~ .focus-border {
  left: 0;
  width: 100%;
}
```

### 5. Toggle Switch with Bounce

```css
.toggle {
  --toggle-width: 56px;
  --toggle-height: 28px;
  --toggle-padding: 3px;
  
  position: relative;
  width: var(--toggle-width);
  height: var(--toggle-height);
  background: var(--color-border);
  border-radius: var(--toggle-height);
  transition: background 0.3s ease;
  cursor: pointer;
}

.toggle::before {
  content: '';
  position: absolute;
  left: var(--toggle-padding);
  top: var(--toggle-padding);
  width: calc(var(--toggle-height) - var(--toggle-padding) * 2);
  height: calc(var(--toggle-height) - var(--toggle-padding) * 2);
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toggle input {
  position: absolute;
  opacity: 0;
}

.toggle input:checked + .toggle,
.toggle:has(input:checked) {
  background: var(--color-primary);
}

.toggle input:checked + .toggle::before,
.toggle:has(input:checked)::before {
  transform: translateX(calc(var(--toggle-width) - var(--toggle-height)));
}
```

### 6. Success Checkmark Animation

```html
<div class="success-checkmark">
  <svg viewBox="0 0 52 52">
    <circle cx="26" cy="26" r="25" fill="none" class="circle"/>
    <path fill="none" d="M14 27l7 7 16-16" class="check"/>
  </svg>
</div>
```

```css
.success-checkmark {
  width: 52px;
  height: 52px;
}

.success-checkmark .circle {
  stroke: var(--color-success);
  stroke-width: 2;
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  animation: circle-draw 0.6s ease-in-out forwards;
}

.success-checkmark .check {
  stroke: var(--color-success);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: check-draw 0.3s 0.4s ease-in-out forwards;
}

@keyframes circle-draw {
  to { stroke-dashoffset: 0; }
}

@keyframes check-draw {
  to { stroke-dashoffset: 0; }
}
```

### 7. Loading Button State

```html
<button class="loading-button">
  <span class="button-text">Submit</span>
  <span class="button-loader">
    <span></span><span></span><span></span>
  </span>
</button>
```

```css
.loading-button {
  position: relative;
  min-width: 120px;
}

.button-text,
.button-loader {
  transition: opacity 0.2s, transform 0.2s;
}

.button-loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
}

.button-loader span {
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
  animation: bounce 0.6s infinite alternate;
}

.button-loader span:nth-child(2) { animation-delay: 0.2s; }
.button-loader span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  to { transform: translateY(-6px); }
}

.loading-button.loading .button-text {
  opacity: 0;
  transform: translateY(10px);
}

.loading-button.loading .button-loader {
  opacity: 1;
}

.loading-button.loading {
  pointer-events: none;
}
```

### 8. Like/Heart Animation

```html
<button class="like-button" aria-label="Like">
  <svg viewBox="0 0 24 24" class="heart">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 
             2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
             C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
             c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
  <span class="particles"></span>
</button>
```

```css
.like-button {
  position: relative;
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
}

.heart {
  width: 32px;
  height: 32px;
  fill: var(--color-border);
  transition: fill 0.2s, transform 0.2s;
}

.like-button:hover .heart {
  transform: scale(1.1);
}

.like-button.liked .heart {
  fill: #e53935;
  animation: heart-beat 0.4s ease-in-out;
}

@keyframes heart-beat {
  0% { transform: scale(1); }
  25% { transform: scale(1.3); }
  50% { transform: scale(0.9); }
  75% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

/* Particle burst on like */
.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.like-button.liked .particles::before,
.like-button.liked .particles::after {
  content: '❤️';
  position: absolute;
  font-size: 12px;
  animation: particle-burst 0.6s ease-out forwards;
}

.like-button.liked .particles::before {
  left: 10%;
  animation-name: particle-left;
}

.like-button.liked .particles::after {
  right: 10%;
  animation-name: particle-right;
}

@keyframes particle-left {
  0% { transform: translate(0, 0) scale(0); opacity: 1; }
  100% { transform: translate(-20px, -30px) scale(1); opacity: 0; }
}

@keyframes particle-right {
  0% { transform: translate(0, 0) scale(0); opacity: 1; }
  100% { transform: translate(20px, -30px) scale(1); opacity: 0; }
}
```

---

## Cursor Interactions

### Context-Aware Cursor
```javascript
class ContextCursor {
  constructor() {
    this.cursor = document.createElement('div');
    this.cursor.className = 'custom-cursor';
    document.body.appendChild(this.cursor);
    
    this.setupEvents();
  }
  
  setupEvents() {
    document.addEventListener('mousemove', (e) => {
      this.cursor.style.left = `${e.clientX}px`;
      this.cursor.style.top = `${e.clientY}px`;
    });
    
    // Different states for different elements
    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.cursor.classList.add('pointer');
      });
      el.addEventListener('mouseleave', () => {
        this.cursor.classList.remove('pointer');
      });
    });
    
    document.querySelectorAll('[data-cursor="expand"]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.cursor.classList.add('expand');
      });
      el.addEventListener('mouseleave', () => {
        this.cursor.classList.remove('expand');
      });
    });
  }
}
```

```css
.custom-cursor {
  position: fixed;
  width: 16px;
  height: 16px;
  background: var(--color-primary);
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  transition: width 0.2s, height 0.2s, background 0.2s;
  mix-blend-mode: difference;
}

.custom-cursor.pointer {
  width: 40px;
  height: 40px;
  background: transparent;
  border: 2px solid var(--color-primary);
}

.custom-cursor.expand {
  width: 80px;
  height: 80px;
  background: rgba(var(--color-primary-rgb), 0.1);
}
```

---

## Celebration Moments

### Confetti on Success
```javascript
function createConfetti(count = 50) {
  const colors = ['#ff0', '#f0f', '#0ff', '#f00', '#0f0'];
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  
  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
    confetti.style.setProperty('--x', Math.random());
    confetti.style.setProperty('--delay', `${Math.random() * 0.5}s`);
    confetti.style.setProperty('--rotation', `${Math.random() * 360}deg`);
    container.appendChild(confetti);
  }
  
  setTimeout(() => container.remove(), 3000);
}
```

```css
.confetti-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 9999;
}

.confetti {
  position: absolute;
  top: -10px;
  left: calc(var(--x) * 100%);
  width: 10px;
  height: 10px;
  background: var(--color);
  animation: confetti-fall 3s linear forwards;
  animation-delay: var(--delay);
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(var(--rotation));
    opacity: 0;
  }
}
```

---

## Accessibility Notes

**Always ensure**:
1. Reduced motion alternatives (`prefers-reduced-motion`)
2. Keyboard equivalents for hover effects
3. Focus states as delightful as hover
4. Screen reader announcements for state changes

```css
@media (prefers-reduced-motion: reduce) {
  .tactile-button,
  .lift-card,
  .toggle::before {
    transition: none;
  }
  
  .success-checkmark .circle,
  .success-checkmark .check {
    animation: none;
    stroke-dashoffset: 0;
  }
}
```
