# Forms & Validation: Research + Code Patterns

> **70.19% cart abandonment** is driven by form friction. Properly designed forms see **78% one-try submissions** vs 42% for poor forms.

## Research-Backed Form Principles

### Field Count
```
RESEARCH (Baymard Institute):
- Ideal checkout: 12 form elements
- Average checkout: 23.48 elements (nearly 2× too many!)
- Each additional field reduces conversion

RULE: Question every field. If you can get it later or derive it, remove it.
```

### Label Placement
```
RESEARCH (Matteo Penzo eye-tracking study):
- Top-aligned labels: ~50ms saccade time (BEST)
- Right-aligned labels: 170-240ms
- Left-aligned labels: ~500ms (10× slower!)

Top-aligned = single fixation captures label + field
Left-aligned = multiple eye movements required
```

### Single vs Multi-Column
```
RESEARCH (CXL Institute, 702 participants):
- Single-column: 15.4 seconds faster completion
- Multi-column: 5+ different user interpretations
- Users saw second column as "alternatives"

RULE: Always single-column on mobile. Desktop exceptions only for logically paired fields (First/Last name).
```

---

## Form Layout CSS

### Top-Aligned Labels (Recommended)
```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1.5rem;
}

.form-group label {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-alpha);
}
```

### Field Width = Expected Input Length
```css
/* Short inputs */
.input-xs { width: 4rem; }    /* ZIP code */
.input-sm { width: 8rem; }    /* Phone area code */
.input-md { width: 16rem; }   /* Email */
.input-lg { width: 24rem; }   /* Full name */
.input-full { width: 100%; }  /* Address, description */
```

### Single-Column Form
```css
.form {
  max-width: 32rem;
  margin: 0 auto;
}

.form-row {
  display: flex;
  flex-direction: column;
}

/* Exception: Logically paired fields */
.form-row-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 480px) {
  .form-row-pair {
    grid-template-columns: 1fr;
  }
}
```

---

## Validation: Reward Early, Punish Late

### The Pattern
```
RESEARCH (Luke Wroblewski/Etre, A List Apart):
- Best inline validation: 22% higher success rate
- 22% fewer errors
- 42% faster completion
- 47% fewer eye fixations

THE PATTERN:
1. On first entry: Validate AFTER user leaves field (blur)
2. On correction: Validate AS user types (input)
3. Show success immediately, delay showing errors
```

### Complete Implementation
```javascript
class FormValidator {
  constructor(form) {
    this.form = form;
    this.fieldStates = new Map();
    this.init();
  }

  init() {
    const fields = this.form.querySelectorAll('input, select, textarea');
    
    fields.forEach(field => {
      this.fieldStates.set(field, {
        hasBeenBlurred: false,
        wasInvalid: false,
        hasBeenModified: false
      });

      // Blur: First validation
      field.addEventListener('blur', () => this.handleBlur(field));
      
      // Input: Real-time validation after blur
      field.addEventListener('input', () => this.handleInput(field));
    });

    // Prevent submission if invalid
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  handleBlur(field) {
    const state = this.fieldStates.get(field);
    state.hasBeenBlurred = true;
    this.validateField(field);
  }

  handleInput(field) {
    const state = this.fieldStates.get(field);
    state.hasBeenModified = true;
    
    // Only validate on input if:
    // 1. Field has been blurred (user completed initial entry)
    // 2. Field was previously invalid (reward early on correction)
    if (state.hasBeenBlurred || state.wasInvalid) {
      this.validateField(field);
    }
  }

  validateField(field) {
    const state = this.fieldStates.get(field);
    const isValid = this.checkValidity(field);

    if (isValid) {
      // REWARD EARLY: Show success immediately
      this.showSuccess(field);
      state.wasInvalid = false;
    } else if (state.hasBeenBlurred) {
      // PUNISH LATE: Only show error after blur
      this.showError(field);
      state.wasInvalid = true;
    }
  }

  checkValidity(field) {
    // Built-in validation
    if (!field.checkValidity()) return false;
    
    // Custom validation
    const validators = this.getCustomValidators(field);
    return validators.every(v => v.test(field.value));
  }

  getCustomValidators(field) {
    const validators = [];
    const type = field.dataset.validate;
    
    if (type === 'email') {
      validators.push({
        test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Please enter a valid email'
      });
    }
    
    if (type === 'phone') {
      validators.push({
        test: v => /^\d{10}$/.test(v.replace(/\D/g, '')),
        message: 'Please enter a 10-digit phone number'
      });
    }

    if (field.dataset.minlength) {
      validators.push({
        test: v => v.length >= parseInt(field.dataset.minlength),
        message: `Minimum ${field.dataset.minlength} characters`
      });
    }

    return validators;
  }

  showSuccess(field) {
    field.setAttribute('aria-invalid', 'false');
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
    
    const errorEl = document.getElementById(`${field.id}-error`);
    if (errorEl) errorEl.textContent = '';
  }

  showError(field) {
    const message = field.validationMessage || 'Please check this field';
    
    field.setAttribute('aria-invalid', 'true');
    field.classList.remove('is-valid');
    field.classList.add('is-invalid');
    
    const errorEl = document.getElementById(`${field.id}-error`);
    if (errorEl) errorEl.textContent = message;
  }

  handleSubmit(e) {
    let isValid = true;
    
    this.form.querySelectorAll('input, select, textarea').forEach(field => {
      const state = this.fieldStates.get(field);
      state.hasBeenBlurred = true;
      
      if (!this.checkValidity(field)) {
        this.showError(field);
        isValid = false;
      }
    });

    if (!isValid) {
      e.preventDefault();
      // Focus first invalid field
      this.form.querySelector('.is-invalid')?.focus();
    }
  }
}

// Usage
new FormValidator(document.querySelector('form'));
```

### Validation Styling
```css
/* Valid state */
.is-valid {
  border-color: var(--color-success) !important;
}

.is-valid + .validation-icon::after {
  content: "✓";
  color: var(--color-success);
}

/* Invalid state */
.is-invalid {
  border-color: var(--color-error) !important;
}

.error-message {
  color: var(--color-error);
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.error-message::before {
  content: "⚠";
}
```

---

## Debounced Validation (Async)

### For API Validation (Username availability, etc.)
```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Usage
const checkUsernameAvailability = debounce(async (username) => {
  const input = document.getElementById('username');
  const feedback = document.getElementById('username-feedback');
  
  if (username.length < 3) return;
  
  feedback.textContent = 'Checking...';
  
  try {
    const response = await fetch(`/api/check-username?u=${username}`);
    const { available } = await response.json();
    
    if (available) {
      feedback.textContent = '✓ Available';
      feedback.className = 'feedback success';
    } else {
      feedback.textContent = '✗ Already taken';
      feedback.className = 'feedback error';
    }
  } catch (error) {
    feedback.textContent = '';
  }
}, 300); // 300ms delay

document.getElementById('username').addEventListener('input', (e) => {
  checkUsernameAvailability(e.target.value);
});
```

### React Hook
```typescript
function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function UsernameField() {
  const [username, setUsername] = useState('');
  const debouncedUsername = useDebounce(username, 300);
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  useEffect(() => {
    if (debouncedUsername.length < 3) return;
    
    setStatus('checking');
    checkAvailability(debouncedUsername)
      .then(available => setStatus(available ? 'available' : 'taken'));
  }, [debouncedUsername]);

  return (
    <div>
      <input 
        value={username} 
        onChange={e => setUsername(e.target.value)}
        aria-describedby="username-status"
      />
      <span id="username-status">
        {status === 'checking' && 'Checking...'}
        {status === 'available' && '✓ Available'}
        {status === 'taken' && '✗ Already taken'}
      </span>
    </div>
  );
}
```

---

## Input Masking

### Phone Number
```javascript
function formatPhoneNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  
  if (digits.length >= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length >= 3) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return digits;
}

const phoneInput = document.getElementById('phone');
phoneInput.addEventListener('input', (e) => {
  const cursorPosition = e.target.selectionStart;
  const oldLength = e.target.value.length;
  
  e.target.value = formatPhoneNumber(e.target.value);
  
  // Adjust cursor position
  const newLength = e.target.value.length;
  const newPosition = cursorPosition + (newLength - oldLength);
  e.target.setSelectionRange(newPosition, newPosition);
});
```

### Credit Card
```javascript
function formatCreditCard(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Detect card type
function detectCardType(number) {
  const patterns = {
    visa: /^4/,
    mastercard: /^5[1-5]/,
    amex: /^3[47]/,
    discover: /^6(?:011|5)/
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(number)) return type;
  }
  return null;
}
```

### Date (MM/YY)
```javascript
function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  
  if (digits.length >= 2) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}
```

---

## Autocomplete Attributes

### Complete Reference
```html
<!-- Personal Information -->
<input autocomplete="name">              <!-- Full name -->
<input autocomplete="given-name">        <!-- First name -->
<input autocomplete="additional-name">   <!-- Middle name -->
<input autocomplete="family-name">       <!-- Last name -->
<input autocomplete="nickname">
<input autocomplete="email">
<input autocomplete="username">
<input autocomplete="new-password">      <!-- Password creation -->
<input autocomplete="current-password">  <!-- Login -->
<input autocomplete="one-time-code">     <!-- OTP/2FA -->
<input autocomplete="tel">               <!-- Full phone -->
<input autocomplete="tel-country-code">
<input autocomplete="tel-national">
<input autocomplete="bday">              <!-- Birthday -->
<input autocomplete="sex">
<input autocomplete="url">
<input autocomplete="organization">

<!-- Address -->
<input autocomplete="street-address">
<input autocomplete="address-line1">
<input autocomplete="address-line2">
<input autocomplete="address-level1">    <!-- State/Province -->
<input autocomplete="address-level2">    <!-- City -->
<input autocomplete="postal-code">
<input autocomplete="country">
<input autocomplete="country-name">

<!-- Payment -->
<input autocomplete="cc-name">           <!-- Name on card -->
<input autocomplete="cc-number">         <!-- Card number -->
<input autocomplete="cc-exp">            <!-- MM/YY -->
<input autocomplete="cc-exp-month">
<input autocomplete="cc-exp-year">
<input autocomplete="cc-csc">            <!-- CVV -->
<input autocomplete="cc-type">           <!-- Visa, etc. -->

<!-- Shipping vs Billing -->
<input autocomplete="shipping street-address">
<input autocomplete="billing street-address">
```

---

## Required Field Marking

### The Pattern
```
RESEARCH (Baymard):
32% of users failed to complete required fields when only optional fields were marked.

BEST PRACTICE:
- Mark BOTH required (*) AND optional ((optional))
- Use visual indicator + ARIA
```

### Implementation
```html
<label for="email">
  Email Address
  <span class="required-indicator" aria-hidden="true">*</span>
</label>
<input 
  type="email" 
  id="email" 
  required 
  aria-required="true"
>

<label for="phone">
  Phone Number
  <span class="optional-indicator">(optional)</span>
</label>
<input type="tel" id="phone">
```

```css
.required-indicator {
  color: var(--color-error);
  margin-left: 2px;
}

.optional-indicator {
  color: var(--text-tertiary);
  font-weight: normal;
  font-size: 0.875em;
}
```

---

## Multi-Step Forms (Wizards)

### Progress Indicator
```html
<nav aria-label="Progress">
  <ol class="progress-steps">
    <li class="step completed" aria-current="false">
      <span class="step-number">1</span>
      <span class="step-label">Account</span>
    </li>
    <li class="step current" aria-current="step">
      <span class="step-number">2</span>
      <span class="step-label">Shipping</span>
    </li>
    <li class="step" aria-current="false">
      <span class="step-number">3</span>
      <span class="step-label">Payment</span>
    </li>
  </ol>
</nav>
```

```css
.progress-steps {
  display: flex;
  justify-content: space-between;
  list-style: none;
  padding: 0;
  position: relative;
}

.progress-steps::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--border-color);
}

.step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  z-index: 1;
}

.step.completed .step-number {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.step.current .step-number {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.step-label {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.step.current .step-label {
  color: var(--color-primary);
  font-weight: 500;
}
```

### Step State Management
```javascript
class MultiStepForm {
  constructor(form) {
    this.form = form;
    this.steps = Array.from(form.querySelectorAll('.form-step'));
    this.currentStep = 0;
    this.formData = {};
    
    this.init();
  }

  init() {
    this.showStep(0);
    
    this.form.querySelectorAll('[data-action="next"]').forEach(btn => {
      btn.addEventListener('click', () => this.nextStep());
    });
    
    this.form.querySelectorAll('[data-action="prev"]').forEach(btn => {
      btn.addEventListener('click', () => this.prevStep());
    });
  }

  showStep(index) {
    this.steps.forEach((step, i) => {
      step.hidden = i !== index;
      step.setAttribute('aria-hidden', i !== index);
    });
    
    // Update progress indicator
    document.querySelectorAll('.progress-steps .step').forEach((el, i) => {
      el.classList.toggle('completed', i < index);
      el.classList.toggle('current', i === index);
      el.setAttribute('aria-current', i === index ? 'step' : 'false');
    });
    
    // Focus first input
    const firstInput = this.steps[index].querySelector('input, select, textarea');
    firstInput?.focus();
    
    // Announce to screen readers
    announce(`Step ${index + 1} of ${this.steps.length}`);
  }

  validateCurrentStep() {
    const currentStep = this.steps[this.currentStep];
    const inputs = currentStep.querySelectorAll('input, select, textarea');
    
    let isValid = true;
    inputs.forEach(input => {
      if (!input.checkValidity()) {
        isValid = false;
        input.reportValidity();
      }
    });
    
    return isValid;
  }

  nextStep() {
    if (this.validateCurrentStep() && this.currentStep < this.steps.length - 1) {
      this.saveStepData();
      this.currentStep++;
      this.showStep(this.currentStep);
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.showStep(this.currentStep);
    }
  }

  saveStepData() {
    const currentStep = this.steps[this.currentStep];
    const inputs = currentStep.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      this.formData[input.name] = input.value;
    });
  }
}
```

---

## Form Submission States

### Button States
```css
.submit-button {
  position: relative;
  min-width: 120px;
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.submit-button.is-loading .button-text {
  visibility: hidden;
}

.submit-button.is-loading::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  top: 50%;
  left: 50%;
  margin: -10px 0 0 -10px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Complete Submit Handler
```javascript
async function handleSubmit(form) {
  const button = form.querySelector('[type="submit"]');
  const buttonText = button.querySelector('.button-text');
  const originalText = buttonText.textContent;

  // Prevent double submission
  if (button.disabled) return;

  // Show loading state
  button.disabled = true;
  button.classList.add('is-loading');

  try {
    const formData = new FormData(form);
    const response = await fetch(form.action, {
      method: form.method,
      body: formData
    });

    if (response.ok) {
      // Success state
      button.classList.remove('is-loading');
      button.classList.add('is-success');
      buttonText.textContent = 'Saved!';
      
      // Reset after delay
      setTimeout(() => {
        button.classList.remove('is-success');
        buttonText.textContent = originalText;
        button.disabled = false;
      }, 2000);
    } else {
      throw new Error('Submission failed');
    }
  } catch (error) {
    // Error state
    button.classList.remove('is-loading');
    button.classList.add('is-error');
    buttonText.textContent = 'Try Again';
    button.disabled = false;
    
    // Show error message
    showFormError('Something went wrong. Please try again.');
  }
}
```

---

## Research Quick Reference

| Optimization | Impact | Source |
|--------------|--------|--------|
| Reduce to 12 fields | +35% conversion | Baymard |
| Single-column layout | -15.4s completion | CXL |
| Top-aligned labels | 50% faster | Penzo |
| Inline validation | +22% success | Wroblewski |
| Mark required + optional | -32% errors | Baymard |
| Guest checkout | +24-30% conversion | Baymard |
| Proper autocomplete | Significant friction reduction | Multiple |
