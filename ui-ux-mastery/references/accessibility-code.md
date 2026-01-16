# Accessibility: WCAG Requirements + Code Implementations

> **16% of world population** has significant disabilities. **95.9% of websites** fail WCAG. Accessibility is non-negotiable.

## WCAG 2.2 Quick Reference

### Level A (Minimum)
- All non-text content has text alternatives
- Captions for audio/video
- Content readable without CSS
- Keyboard accessible
- No keyboard traps
- No seizure-inducing content

### Level AA (Target Standard)
- 4.5:1 contrast for normal text
- 3:1 contrast for large text (18pt+ or 14pt bold)
- Text resizable to 200%
- Content reflows at 320px width
- 24×24px minimum target size (or adequate spacing)
- Focus indicators visible
- Error identification in text

---

## Color Contrast

### Requirements
```
NORMAL TEXT (<18pt / <14pt bold): 4.5:1 minimum
LARGE TEXT (≥18pt / ≥14pt bold): 3:1 minimum
UI COMPONENTS & GRAPHICS: 3:1 minimum
```

### Safe Color Combinations
```css
:root {
  /* All these meet 4.5:1 on white */
  --text-primary: #1a1a1a;      /* 16.1:1 */
  --text-secondary: #595959;     /* 7:1 */
  --text-tertiary: #767676;      /* 4.5:1 - minimum */
  
  /* Links - distinguishable from body text */
  --link-color: #0066cc;         /* 5.9:1 */
  
  /* Error - high contrast */
  --error: #c41e3a;              /* 5.5:1 */
  
  /* Success - adjusted for contrast */
  --success: #2e7d32;            /* 4.8:1 */
}
```

### Checking Contrast Programmatically
```javascript
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1, color2) {
  const l1 = getLuminance(...color1);
  const l2 = getLuminance(...color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
```

### Color Blindness Considerations
```css
/* NEVER rely solely on color. Add secondary indicators: */

/* ❌ Bad: Color only */
.error { color: red; }
.success { color: green; }

/* ✅ Good: Color + icon */
.error::before { content: "✗ "; color: var(--error); }
.success::before { content: "✓ "; color: var(--success); }

/* ✅ Good: Color + pattern/border */
.error {
  color: var(--error);
  border-left: 4px solid currentColor;
}
```

---

## Touch Targets

### Requirements
```
WCAG 2.5.5 (AAA): 44×44 CSS pixels
WCAG 2.5.8 (AA): 24×24 CSS pixels OR adequate spacing
Apple HIG: 44×44 points
Material Design: 48×48 dp
```

### Implementation
```css
/* Minimum touch targets */
button, 
a, 
[role="button"],
input[type="checkbox"],
input[type="radio"],
.clickable {
  min-width: 44px;
  min-height: 44px;
}

/* Icon buttons with padding */
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 10px;
}

.icon-button svg {
  width: 24px;
  height: 24px;
}

/* Larger targets for touch devices */
@media (pointer: coarse) {
  button, a {
    min-height: 48px;
  }
}
```

---

## Keyboard Navigation

### Focus Indicators
```css
/* ❌ NEVER do this without replacement */
*:focus { outline: none; }

/* ✅ Custom focus indicator */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ✅ High contrast mode support */
:focus-visible {
  outline: 2px solid transparent;
  box-shadow: 
    0 0 0 2px var(--bg-color),
    0 0 0 4px var(--color-primary);
}

/* Focus within for parent highlighting */
.card:focus-within {
  box-shadow: 0 0 0 2px var(--color-primary);
}
```

### Focus Order (tabindex)
```html
<!-- tabindex="0": Natural focus order (use for custom interactive elements) -->
<div role="button" tabindex="0">Custom Button</div>

<!-- tabindex="-1": Programmatically focusable only -->
<div id="modal" tabindex="-1">Modal content</div>

<!-- ❌ NEVER use positive tabindex -->
<button tabindex="3">Don't do this</button>
```

### Skip Links
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<header><!-- ... --></header>
<main id="main-content" tabindex="-1"><!-- ... --></main>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  z-index: 9999;
  transition: top 0.2s;
}

.skip-link:focus {
  top: 0;
}
```

### Keyboard Event Handling
```javascript
// Custom button with keyboard support
element.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    element.click();
  }
});

// Arrow key navigation for lists
list.addEventListener('keydown', (e) => {
  const items = Array.from(list.querySelectorAll('[role="option"]'));
  const current = document.activeElement;
  const index = items.indexOf(current);
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      items[(index + 1) % items.length]?.focus();
      break;
    case 'ArrowUp':
      e.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
      break;
    case 'Home':
      e.preventDefault();
      items[0]?.focus();
      break;
    case 'End':
      e.preventDefault();
      items[items.length - 1]?.focus();
      break;
  }
});
```

---

## ARIA Patterns

### Semantic HTML First
```html
<!-- ❌ Don't use ARIA when semantic HTML works -->
<div role="button" tabindex="0">Click me</div>

<!-- ✅ Use semantic elements -->
<button type="button">Click me</button>
```

### Common ARIA Patterns

#### Expandable Content
```html
<button 
  aria-expanded="false" 
  aria-controls="content-panel"
  onclick="togglePanel(this)">
  Show Details
</button>
<div id="content-panel" hidden>
  Panel content
</div>

<script>
function togglePanel(btn) {
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', !expanded);
  document.getElementById('content-panel').hidden = expanded;
}
</script>
```

#### Live Regions
```html
<!-- Polite: Announced when user is idle -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  <!-- Dynamic status messages -->
</div>

<!-- Assertive: Interrupts user immediately -->
<div aria-live="assertive" role="alert">
  <!-- Critical errors -->
</div>
```

#### Tabs
```html
<div role="tablist" aria-label="Content tabs">
  <button role="tab" 
          id="tab-1" 
          aria-selected="true" 
          aria-controls="panel-1">
    Tab 1
  </button>
  <button role="tab" 
          id="tab-2" 
          aria-selected="false" 
          aria-controls="panel-2"
          tabindex="-1">
    Tab 2
  </button>
</div>

<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
  Content 1
</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
  Content 2
</div>
```

---

## Focus Trap (Modals)

### Complete Implementation
```javascript
function createFocusTrap(container) {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');
  
  const focusableElements = container.querySelectorAll(focusableSelectors);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleKeyDown(e) {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();
  
  return () => container.removeEventListener('keydown', handleKeyDown);
}
```

### Modal Component with All Requirements
```javascript
class AccessibleModal {
  constructor(modalElement) {
    this.modal = modalElement;
    this.previouslyFocused = null;
    this.cleanupFocusTrap = null;
  }

  open() {
    // Store previously focused element
    this.previouslyFocused = document.activeElement;
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Show modal
    this.modal.hidden = false;
    this.modal.setAttribute('aria-modal', 'true');
    
    // Setup focus trap
    this.cleanupFocusTrap = createFocusTrap(this.modal);
    
    // Escape key handler
    this.escHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this.escHandler);
  }

  close() {
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Hide modal
    this.modal.hidden = true;
    this.modal.removeAttribute('aria-modal');
    
    // Cleanup
    this.cleanupFocusTrap?.();
    document.removeEventListener('keydown', this.escHandler);
    
    // Return focus
    this.previouslyFocused?.focus();
  }
}
```

---

## Screen Reader Announcements

### Visually Hidden Class
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* Allow element to be focusable when navigated to */
.sr-only-focusable:focus,
.sr-only-focusable:active {
  position: static;
  width: auto;
  height: auto;
  overflow: visible;
  clip: auto;
  clip-path: none;
  white-space: normal;
}
```

### React Announcer Pattern
```jsx
const AnnouncerContext = createContext();

function AnnouncerProvider({ children }) {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('polite');

  const announce = useCallback((text, level = 'polite') => {
    setMessage('');
    setPriority(level);
    // Small delay for screen reader to detect change
    requestAnimationFrame(() => setMessage(text));
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div 
        role={priority === 'assertive' ? 'alert' : 'status'}
        aria-live={priority}
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
}

// Usage
function SaveButton() {
  const { announce } = useContext(AnnouncerContext);
  
  const handleSave = async () => {
    await saveData();
    announce('Changes saved successfully');
  };
  
  return <button onClick={handleSave}>Save</button>;
}
```

---

## Form Accessibility

### Labels and Instructions
```html
<!-- Always associate labels -->
<label for="email">Email Address</label>
<input type="email" id="email" name="email"
       aria-required="true"
       aria-describedby="email-hint email-error">
<span id="email-hint" class="hint">We'll never share your email</span>
<span id="email-error" class="error" role="alert"></span>
```

### Error Handling
```javascript
function showError(input, message) {
  const errorEl = document.getElementById(`${input.id}-error`);
  
  input.setAttribute('aria-invalid', 'true');
  errorEl.textContent = message;
  
  // Move focus to input for screen readers
  input.focus();
}

function clearError(input) {
  const errorEl = document.getElementById(`${input.id}-error`);
  
  input.setAttribute('aria-invalid', 'false');
  errorEl.textContent = '';
}
```

### Required Fields
```html
<!-- Visual AND programmatic indicator -->
<label for="name">
  Name <span aria-hidden="true">*</span>
  <span class="sr-only">(required)</span>
</label>
<input type="text" id="name" required aria-required="true">
```

---

## Reduced Motion

### CSS Implementation
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

/* Alternative: Provide safe alternatives instead of removing */
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none;
    /* Keep opacity change as it's safe */
    transition: opacity 0.2s ease;
  }
}
```

### JavaScript Check
```javascript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

function animate(element) {
  if (prefersReducedMotion) {
    // Skip animation or use fade only
    element.style.opacity = 1;
    return;
  }
  // Full animation
  element.animate([/* ... */], { duration: 300 });
}
```

---

## Testing Checklist

### Manual Tests
- [ ] Tab through entire page - logical order?
- [ ] Can complete all tasks with keyboard only?
- [ ] Focus visible at all times?
- [ ] Screen reader announces content correctly?
- [ ] Color contrast passes (use browser devtools)?
- [ ] Works at 200% zoom?
- [ ] Works at 320px width?

### Automated Testing
```javascript
// Jest + jest-axe
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('component is accessible', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

// Playwright + axe-core
import AxeBuilder from '@axe-core/playwright';

test('page has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### Tools
- axe DevTools browser extension
- Lighthouse accessibility audit
- WAVE browser extension
- Colour Contrast Analyser
- VoiceOver (Mac), NVDA (Windows), TalkBack (Android)
