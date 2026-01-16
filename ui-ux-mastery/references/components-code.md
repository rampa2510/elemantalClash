# Component Patterns: Code Implementations

## Buttons

### Complete Button System
```css
/* Base button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease-out;
  
  /* Prevent text selection */
  user-select: none;
  
  /* Minimum touch target */
  min-height: 44px;
}

/* Primary */
.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: color-mix(in oklch, var(--color-primary) 85%, black);
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.98);
}

/* Secondary */
.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid currentColor;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--color-text);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--color-surface);
}

/* Danger */
.btn-danger {
  background: var(--color-error);
  color: white;
}

/* Sizes */
.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  min-height: 36px;
}

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1.125rem;
  min-height: 52px;
}

/* States */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Loading state */
.btn.is-loading {
  pointer-events: none;
  position: relative;
}

.btn.is-loading .btn-text {
  visibility: hidden;
}

.btn.is-loading::after {
  content: '';
  position: absolute;
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Icon Button
```css
.btn-icon {
  padding: 0.75rem;
  min-width: 44px;
  min-height: 44px;
}

.btn-icon svg {
  width: 1.25rem;
  height: 1.25rem;
}
```

---

## Modals/Dialogs

### Accessible Modal Structure
```html
<div class="modal-backdrop" data-modal-backdrop>
  <div 
    class="modal" 
    role="dialog" 
    aria-modal="true" 
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
  >
    <header class="modal-header">
      <h2 id="modal-title">Modal Title</h2>
      <button 
        type="button" 
        class="modal-close" 
        aria-label="Close modal"
        data-modal-close
      >
        <svg><!-- X icon --></svg>
      </button>
    </header>
    
    <div class="modal-body" id="modal-description">
      <!-- Content -->
    </div>
    
    <footer class="modal-footer">
      <button type="button" class="btn btn-secondary" data-modal-close>
        Cancel
      </button>
      <button type="button" class="btn btn-primary">
        Confirm
      </button>
    </footer>
  </div>
</div>
```

### Modal CSS
```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: var(--z-modal-backdrop);
  
  /* Animation */
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}

.modal-backdrop.is-open {
  opacity: 1;
  visibility: visible;
}

.modal {
  background: var(--color-surface);
  border-radius: 0.75rem;
  box-shadow: var(--shadow-xl);
  width: min(100%, 500px);
  max-height: calc(100vh - 2rem);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  /* Animation */
  transform: scale(0.95) translateY(10px);
  transition: transform 0.2s;
}

.modal-backdrop.is-open .modal {
  transform: scale(1) translateY(0);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.modal-close {
  padding: 0.5rem;
  margin: -0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 0.25rem;
}

.modal-close:hover {
  background: var(--color-surface-hover);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
}
```

### Modal JavaScript
```javascript
class Modal {
  constructor(element) {
    this.modal = element;
    this.backdrop = element.closest('[data-modal-backdrop]');
    this.previouslyFocused = null;
    this.focusTrap = null;
    
    this.bindEvents();
  }

  bindEvents() {
    // Close button
    this.modal.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });
    
    // Backdrop click
    this.backdrop?.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });
    
    // Escape key
    this.escHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
  }

  open() {
    this.previouslyFocused = document.activeElement;
    
    this.backdrop?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this.escHandler);
    
    // Focus trap
    this.setupFocusTrap();
    
    // Focus first focusable element
    const firstFocusable = this.modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }

  close() {
    this.backdrop?.classList.remove('is-open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this.escHandler);
    
    this.cleanupFocusTrap();
    this.previouslyFocused?.focus();
  }

  setupFocusTrap() {
    const focusables = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    this.focusTrap = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    
    this.modal.addEventListener('keydown', this.focusTrap);
  }

  cleanupFocusTrap() {
    if (this.focusTrap) {
      this.modal.removeEventListener('keydown', this.focusTrap);
    }
  }
}
```

---

## Cards

### Basic Card
```css
.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s, transform 0.2s;
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-image {
  aspect-ratio: 16 / 9;
  object-fit: cover;
  width: 100%;
}

.card-body {
  padding: 1.5rem;
  flex: 1;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.card-text {
  color: var(--color-text-muted);
  margin: 0;
}

.card-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  margin-top: auto;
}
```

### Interactive Card (Clickable)
```html
<article class="card card-interactive">
  <img src="image.jpg" alt="" class="card-image">
  <div class="card-body">
    <h3 class="card-title">
      <a href="/article" class="card-link">Article Title</a>
    </h3>
    <p class="card-text">Description text...</p>
  </div>
</article>
```

```css
.card-interactive {
  cursor: pointer;
}

/* Make entire card clickable via link */
.card-link::after {
  content: '';
  position: absolute;
  inset: 0;
}

.card-interactive {
  position: relative;
}

/* Focus state */
.card-interactive:focus-within {
  box-shadow: 0 0 0 2px var(--color-primary);
}
```

### Horizontal Card
```css
.card-horizontal {
  flex-direction: row;
}

.card-horizontal .card-image {
  width: 200px;
  aspect-ratio: 1;
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .card-horizontal {
    flex-direction: column;
  }
  
  .card-horizontal .card-image {
    width: 100%;
    aspect-ratio: 16 / 9;
  }
}
```

---

## Navigation

### Responsive Navbar
```html
<nav class="navbar">
  <a href="/" class="navbar-brand">Logo</a>
  
  <button 
    class="navbar-toggle" 
    aria-label="Toggle navigation"
    aria-expanded="false"
    aria-controls="navbar-menu"
  >
    <span class="hamburger"></span>
  </button>
  
  <ul id="navbar-menu" class="navbar-menu">
    <li><a href="/" class="navbar-link active">Home</a></li>
    <li><a href="/about" class="navbar-link">About</a></li>
    <li><a href="/services" class="navbar-link">Services</a></li>
    <li><a href="/contact" class="navbar-link">Contact</a></li>
  </ul>
</nav>
```

```css
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.navbar-brand {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
}

.navbar-menu {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.navbar-link {
  padding: 0.5rem 1rem;
  color: var(--color-text-muted);
  text-decoration: none;
  border-radius: var(--radius-sm);
  transition: color 0.2s, background 0.2s;
}

.navbar-link:hover,
.navbar-link.active {
  color: var(--color-primary);
  background: var(--color-primary-alpha);
}

.navbar-toggle {
  display: none;
}

/* Mobile */
@media (max-width: 768px) {
  .navbar-toggle {
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0.75rem;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  
  .hamburger,
  .hamburger::before,
  .hamburger::after {
    display: block;
    width: 100%;
    height: 2px;
    background: var(--color-text);
    transition: transform 0.2s;
  }
  
  .hamburger {
    position: relative;
  }
  
  .hamburger::before,
  .hamburger::after {
    content: '';
    position: absolute;
  }
  
  .hamburger::before { top: -6px; }
  .hamburger::after { bottom: -6px; }
  
  /* Open state */
  .navbar-toggle[aria-expanded="true"] .hamburger {
    background: transparent;
  }
  
  .navbar-toggle[aria-expanded="true"] .hamburger::before {
    transform: rotate(45deg) translate(4px, 4px);
  }
  
  .navbar-toggle[aria-expanded="true"] .hamburger::after {
    transform: rotate(-45deg) translate(4px, -4px);
  }
  
  .navbar-menu {
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 0;
    flex-direction: column;
    background: var(--color-surface);
    padding: 1rem;
    transform: translateX(-100%);
    transition: transform 0.3s;
  }
  
  .navbar-menu.is-open {
    transform: translateX(0);
  }
  
  .navbar-link {
    display: block;
    padding: 1rem;
  }
}
```

### Tabs
```html
<div class="tabs">
  <div role="tablist" aria-label="Content tabs" class="tab-list">
    <button 
      role="tab" 
      id="tab-1" 
      aria-selected="true" 
      aria-controls="panel-1"
    >
      Tab 1
    </button>
    <button 
      role="tab" 
      id="tab-2" 
      aria-selected="false" 
      aria-controls="panel-2"
      tabindex="-1"
    >
      Tab 2
    </button>
    <button 
      role="tab" 
      id="tab-3" 
      aria-selected="false" 
      aria-controls="panel-3"
      tabindex="-1"
    >
      Tab 3
    </button>
  </div>
  
  <div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
    Panel 1 content
  </div>
  <div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
    Panel 2 content
  </div>
  <div role="tabpanel" id="panel-3" aria-labelledby="tab-3" hidden>
    Panel 3 content
  </div>
</div>
```

```css
.tab-list {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--color-border);
}

[role="tab"] {
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

[role="tab"]:hover {
  color: var(--color-text);
}

[role="tab"][aria-selected="true"] {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

[role="tab"]:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

[role="tabpanel"] {
  padding: 1.5rem 0;
}
```

---

## Tables (Responsive)

### Desktop-First Table
```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.table th {
  font-weight: 600;
  background: var(--color-surface);
}

.table tbody tr:hover {
  background: var(--color-surface-hover);
}
```

### Responsive Table (Cards on Mobile)
```html
<table class="table responsive-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Role</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="Name">John Doe</td>
      <td data-label="Email">john@example.com</td>
      <td data-label="Role">Admin</td>
      <td data-label="Status">Active</td>
    </tr>
  </tbody>
</table>
```

```css
@media (max-width: 768px) {
  .responsive-table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }
  
  .responsive-table tr {
    display: block;
    margin-bottom: 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }
  
  .responsive-table td {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
  }
  
  .responsive-table td:last-child {
    border-bottom: none;
  }
  
  .responsive-table td::before {
    content: attr(data-label);
    font-weight: 600;
    margin-right: 1rem;
  }
}
```

---

## Forms

### Input Group
```html
<div class="input-group">
  <span class="input-addon">$</span>
  <input type="number" class="input">
  <span class="input-addon">.00</span>
</div>
```

```css
.input-group {
  display: flex;
}

.input-addon {
  display: flex;
  align-items: center;
  padding: 0 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
}

.input-addon:first-child {
  border-right: none;
  border-radius: var(--radius-md) 0 0 var(--radius-md);
}

.input-addon:last-child {
  border-left: none;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.input-group .input {
  flex: 1;
  border-radius: 0;
}

.input-group .input:first-child {
  border-radius: var(--radius-md) 0 0 var(--radius-md);
}

.input-group .input:last-child {
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}
```

### Toggle Switch
```html
<label class="toggle">
  <input type="checkbox" class="toggle-input">
  <span class="toggle-slider"></span>
  <span class="toggle-label">Enable notifications</span>
</label>
```

```css
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.toggle-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: relative;
  width: 48px;
  height: 24px;
  background: var(--color-border);
  border-radius: 24px;
  transition: background 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: var(--shadow-sm);
}

.toggle-input:checked + .toggle-slider {
  background: var(--color-primary);
}

.toggle-input:checked + .toggle-slider::before {
  transform: translateX(24px);
}

.toggle-input:focus-visible + .toggle-slider {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## Loading States

### Skeleton Screen
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--skeleton-base, #e0e0e0) 25%,
    var(--skeleton-shine, #f0f0f0) 50%,
    var(--skeleton-base, #e0e0e0) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

.skeleton-text {
  height: 1em;
  margin-bottom: 0.5em;
}

.skeleton-text:last-child {
  width: 60%;
}

.skeleton-heading {
  height: 1.5em;
  width: 40%;
  margin-bottom: 1rem;
}

.skeleton-image {
  aspect-ratio: 16 / 9;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}
```

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

---

## Toasts/Notifications

```css
.toast-container {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: var(--z-toast);
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  animation: slideIn 0.3s ease-out;
}

.toast-success { border-left: 4px solid var(--color-success); }
.toast-error { border-left: 4px solid var(--color-error); }
.toast-warning { border-left: 4px solid var(--color-warning); }
.toast-info { border-left: 4px solid var(--color-primary); }

.toast-icon {
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.toast-message {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.toast-close {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  opacity: 0.5;
}

.toast-close:hover {
  opacity: 1;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
}
```
