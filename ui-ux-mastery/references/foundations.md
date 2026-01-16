# UI/UX Foundations: Psychology, Heuristics & Principles

## Nielsen's 10 Usability Heuristics

### 1. Visibility of System Status
```
PRINCIPLE: Always keep users informed about what's happening

IMPLEMENTATIONS:
- Loading indicators for any action >400ms (Doherty Threshold)
- Progress bars for multi-step processes
- Form field validation feedback
- Save status indicators ("Saved", "Saving...", "Changes pending")
- Network status indicators

CODE PATTERN:
```css
.saving-indicator::after {
  content: "Saving...";
  animation: pulse 1s infinite;
}
.saved-indicator::after {
  content: "✓ Saved";
  color: var(--color-success);
}
```
```

### 2. Match Between System and Real World
```
PRINCIPLE: Use familiar language, not system-oriented terms

BAD: "Error 404: Resource not found"
GOOD: "Page not found. Try searching or go to homepage."

BAD: "Invalid input in field_email_01"
GOOD: "Please enter a valid email address"

BAD: "Transaction failed: insufficient_funds"
GOOD: "Payment declined. Please try a different payment method."
```

### 3. User Control and Freedom
```
PRINCIPLE: Provide clear exits and undo capabilities

REQUIRED IMPLEMENTATIONS:
- Cancel buttons on all forms and modals
- Undo for destructive actions
- Back buttons that preserve state
- Clear "X" close buttons on overlays
- Escape key closes modals

CODE PATTERN - Confirmation for destructive actions:
```javascript
function deleteItem(id) {
  if (confirm('Delete this item? This can be undone for 30 seconds.')) {
    softDelete(id);
    showUndoToast('Item deleted', () => restore(id), 30000);
  }
}
```
```

### 4. Consistency and Standards
```
PRINCIPLE: Follow platform conventions

CONSISTENCY LEVELS:
1. Internal: Same patterns throughout your product
2. External: Follow platform conventions (iOS, Android, Web)
3. Real-world: Match mental models from physical world

COMMON WEB CONVENTIONS:
- Logo in top-left links to homepage
- Search in header, often top-right
- Primary navigation horizontally across top
- Shopping cart icon in top-right
- Underlined text = link
- Blue text = link
```

### 5. Error Prevention
```
PRINCIPLE: Prevent errors before they happen

TECHNIQUES:
- Disable submit until form is valid
- Input constraints (maxlength, pattern, type)
- Confirmation for irreversible actions
- Smart defaults
- Inline validation before submission

CODE PATTERN - Prevent double submission:
```javascript
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = form.querySelector('[type="submit"]');
  if (button.disabled) return;
  
  button.disabled = true;
  button.textContent = 'Submitting...';
  
  try {
    await submitForm(form);
  } finally {
    button.disabled = false;
    button.textContent = 'Submit';
  }
});
```
```

### 6. Recognition Rather Than Recall
```
PRINCIPLE: Minimize memory load

IMPLEMENTATIONS:
- Show recent searches
- Autocomplete suggestions
- Breadcrumbs showing path
- Persistent filters/sorting
- Preview thumbnails
- Inline help text

CODE PATTERN - Recent searches:
```javascript
function saveRecentSearch(query) {
  const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
  const updated = [query, ...recent.filter(q => q !== query)].slice(0, 5);
  localStorage.setItem('recentSearches', JSON.stringify(updated));
}
```
```

### 7. Flexibility and Efficiency of Use
```
PRINCIPLE: Accelerators for experts, simplicity for novices

IMPLEMENTATIONS:
- Keyboard shortcuts (with discoverability)
- Command palette (Cmd+K)
- Customizable dashboards
- Bulk actions
- Saved preferences
- Power user features hidden by default

CODE PATTERN - Command palette trigger:
```javascript
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    openCommandPalette();
  }
});
```
```

### 8. Aesthetic and Minimalist Design
```
PRINCIPLE: Remove unnecessary information

EVERY ELEMENT SHOULD:
- Serve a purpose
- Support primary tasks
- Not compete for attention

TECHNIQUES:
- Progressive disclosure
- Collapsible sections
- "Show more" patterns
- Prioritize above-the-fold content
- White space as design element
```

### 9. Help Users Recognize, Diagnose, and Recover from Errors
```
PRINCIPLE: Clear, helpful error messages

ERROR MESSAGE FORMULA:
1. What happened (plain language)
2. Why it happened (if helpful)
3. How to fix it (specific action)

BAD: "Error"
BAD: "Something went wrong"
GOOD: "Your session expired. Please sign in again to continue."
GOOD: "Email already registered. Sign in or use a different email."

CODE PATTERN:
```javascript
const errorMessages = {
  'auth/email-already-in-use': {
    title: 'Email already registered',
    action: 'Sign in instead or use a different email',
    actionButton: { text: 'Sign in', href: '/login' }
  },
  'auth/weak-password': {
    title: 'Password too weak',
    action: 'Use at least 8 characters with a mix of letters and numbers'
  }
};
```
```

### 10. Help and Documentation
```
PRINCIPLE: Provide searchable, task-focused help

IMPLEMENTATIONS:
- Contextual help (? icons)
- Tooltips for complex features
- Onboarding tours for new users
- Searchable help center
- In-app chat support

CODE PATTERN - Contextual tooltip:
```html
<label>
  API Key
  <button type="button" aria-label="Help" data-tooltip="Your API key is found in Settings → Developer → API Keys">
    <svg><!-- ? icon --></svg>
  </button>
</label>
```
```

---

## The 21 Laws of UX

### Fitts's Law (1954)
```
FORMULA: Time = a + b × log₂(2D/W)
Where D = distance, W = width of target

IMPLICATIONS:
- Make important buttons larger
- Place related actions close together
- Screen edges/corners are "infinite" targets
- Minimum touch target: 44×44px (Apple), 48×48dp (Material)

CODE:
```css
.primary-action {
  min-width: 120px;
  min-height: 44px;
  padding: 12px 24px;
}

/* Corner positioning for infinite target */
.menu-button {
  position: fixed;
  top: 0;
  left: 0;
}
```
```

### Hick's Law (1952)
```
FORMULA: RT = a + b × log₂(n+1)
Where n = number of choices

RESEARCH: ~150ms added per bit of information

IMPLICATIONS:
- Limit primary navigation to 5-7 items
- Use progressive disclosure
- Categorize large option sets
- Provide search/filter for >10 options

QUANTIFIED THRESHOLDS:
- 0-3 options: Present all
- 4-7 options: Consider grouping
- 8+ options: Require search/filter
```

### Miller's Law (1956)
```
PRINCIPLE: Working memory holds 7±2 items
(Modern research suggests 4±1 for pure working memory)

IMPLICATIONS:
- Chunk phone numbers: (555) 123-4567
- Chunk credit cards: 1234 5678 9012 3456
- Limit form sections to 3-5 fields
- Group related information visually

CODE - Phone formatting:
```javascript
function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length >= 6) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  } else if (digits.length >= 3) {
    return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
  }
  return digits;
}
```
```

### Doherty Threshold (1982)
```
THRESHOLD: System response must be <400ms for flow state

IMPLEMENTATIONS:
- Optimistic UI updates
- Skeleton screens
- Local state before server confirmation
- Preloading likely next actions

CODE - Optimistic update:
```javascript
async function likePost(postId) {
  // Immediate UI update
  setLiked(true);
  setLikeCount(prev => prev + 1);
  
  try {
    await api.likePost(postId);
  } catch (error) {
    // Rollback on failure
    setLiked(false);
    setLikeCount(prev => prev - 1);
    showError('Could not like post');
  }
}
```
```

### Jakob's Law
```
PRINCIPLE: Users spend most time on OTHER sites

IMPLICATIONS:
- Follow conventions
- Don't innovate without strong reason
- Match user expectations from competitors
- Use standard icons and patterns

COMMON EXPECTATIONS:
- Logo → Homepage
- Magnifying glass → Search
- Cart icon → Shopping cart
- Hamburger (☰) → Menu
- Bell → Notifications
- Gear → Settings
```

### Peak-End Rule (Kahneman)
```
PRINCIPLE: Experiences judged by peak moment and end

IMPLICATIONS:
- Make the end of flows delightful
- Celebrate completions
- End on positive note (success screens)
- Fix the worst pain points first

CODE - Completion celebration:
```css
.success-animation {
  animation: celebrate 0.6s ease-out;
}

@keyframes celebrate {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```
```

### Von Restorff Effect (1933)
```
PRINCIPLE: Distinctive items are better remembered

IMPLICATIONS:
- Make CTAs visually distinct
- Use color to highlight important info
- Don't make everything bold
- One primary action per screen

CODE:
```css
.action-primary {
  background: var(--color-primary);
  color: white;
  font-weight: 600;
}

.action-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid currentColor;
}
```
```

### Zeigarnik Effect (1927)
```
PRINCIPLE: Incomplete tasks create cognitive tension

IMPLICATIONS:
- Show progress indicators
- "Profile 60% complete"
- Incomplete form sections highlighted
- Draft saving indicators

CODE:
```html
<div class="progress-ring">
  <svg viewBox="0 0 36 36">
    <path class="bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
    <path class="progress" stroke-dasharray="60, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
  </svg>
  <span>60%</span>
</div>
```
```

### Goal-Gradient Effect (Hull, 1932)
```
PRINCIPLE: Motivation increases as goal approaches

RESEARCH: Coffee shop study - customers accelerate purchases near free coffee

IMPLICATIONS:
- Show progress toward rewards
- "Only 2 more for free shipping"
- Accelerating progress bars
- Milestone celebrations

CODE:
```html
<div class="reward-progress">
  <div class="bar" style="--progress: 80%"></div>
  <span>$12 away from free shipping!</span>
</div>
```
```

### Aesthetic-Usability Effect
```
PRINCIPLE: Beautiful designs are perceived as more usable
WARNING: Can mask actual usability problems

RESEARCH: Kurosu & Kashimura ATM study - aesthetic designs rated more usable with identical functionality

IMPLICATIONS:
- Invest in visual design AND usability
- Don't let beauty hide problems
- Test with real users, not stakeholders
```

### Tesler's Law (Conservation of Complexity)
```
PRINCIPLE: Every system has irreducible complexity
         Someone must deal with it - user or developer

IMPLICATIONS:
- Shift complexity to the system
- Smart defaults
- Auto-detection (location, timezone, language)
- Progressive disclosure of advanced options

EXAMPLE:
- BAD: User manually enters timezone
- GOOD: Auto-detect timezone, allow override
```

### Postel's Law (Robustness Principle)
```
PRINCIPLE: Be liberal in what you accept,
          conservative in what you send

IMPLICATIONS:
- Accept multiple input formats
- Phone: (555) 123-4567 OR 5551234567 OR 555-123-4567
- Dates: Various formats, normalize internally
- Trim whitespace automatically
- Case-insensitive matching

CODE:
```javascript
function normalizePhone(input) {
  return input.replace(/\D/g, '').slice(-10);
}

function normalizeEmail(input) {
  return input.trim().toLowerCase();
}
```
```

### Serial Position Effect
```
PRINCIPLE: First and last items in a list are remembered best

IMPLICATIONS:
- Put important items at beginning and end
- Most important nav items: first and last
- Key features in first and last positions
- Critical CTAs at top and bottom of long pages
```

### Cognitive Load Theory
```
THREE TYPES:
1. Intrinsic: Complexity of the task itself
2. Extraneous: Caused by poor design (reduce this!)
3. Germane: Effort spent learning (support this)

REDUCE EXTRANEOUS LOAD:
- Remove unnecessary elements
- Group related information
- Use consistent patterns
- Provide clear visual hierarchy
- Reduce choices
```

---

## Gestalt Principles

### Proximity
```
PRINCIPLE: Elements close together are perceived as grouped

IMPLEMENTATION:
- Group related form fields
- Increase spacing between unrelated sections
- Cards group related content
- Action buttons near their targets

CODE:
```css
.form-group {
  margin-bottom: 24px;  /* Between groups */
}
.form-group label,
.form-group input {
  margin-bottom: 4px;   /* Within group */
}
```
```

### Similarity
```
PRINCIPLE: Similar elements are perceived as related

IMPLEMENTATION:
- Same color for same function
- Consistent button styles
- Same icon style throughout
- Similar cards for similar content types
```

### Continuity
```
PRINCIPLE: Elements on a line/curve perceived as related

IMPLEMENTATION:
- Align form labels and inputs
- Horizontal navigation items
- Timeline designs
- Step indicators
```

### Closure
```
PRINCIPLE: Mind fills in missing information

IMPLEMENTATION:
- Partially visible elements indicate scrollability
- Card edges bleeding off screen
- Progress indicators
- Loading skeletons
```

### Figure-Ground
```
PRINCIPLE: We separate figures from background

IMPLEMENTATION:
- Clear visual hierarchy
- Modal overlays
- Highlighted selections
- Focus states

CODE:
```css
.modal-backdrop {
  background: rgba(0, 0, 0, 0.5);
}
.modal {
  background: white;
  box-shadow: var(--shadow-elevation-high);
}
```
```

### Common Region
```
PRINCIPLE: Elements within boundaries are grouped
(Can override proximity!)

IMPLEMENTATION:
- Cards and containers
- Form fieldsets
- Grouped action buttons
- Boxed content sections
```

---

## Fogg Behavior Model

```
FORMULA: Behavior = Motivation × Ability × Prompt

All three must occur simultaneously for behavior to happen.
```

### Motivation Factors
```
CORE MOTIVATORS:
- Pleasure / Pain
- Hope / Fear
- Social acceptance / Rejection

INCREASE MOTIVATION:
- Show benefits clearly
- Social proof
- Scarcity/urgency (ethically)
- Personalization
```

### Ability (Simplicity)
```
SIMPLICITY FACTORS (easier = higher ability):
- Time: Less time required
- Money: Less cost
- Physical effort: Fewer actions
- Mental effort: Less thinking
- Social deviance: Fits social norms
- Non-routine: Fits existing habits

KEY INSIGHT: "Making behavior simpler succeeds faster than adding motivation"
```

### Prompt Types
```
1. SPARK: For low motivation users
   - Motivational messaging
   - Benefits-focused CTAs

2. FACILITATOR: For low ability users
   - Tutorials
   - Simplified flows
   - Assistance

3. SIGNAL: For high motivation/ability
   - Simple reminders
   - Notifications
   - Visual cues
```

---

## Quick Reference: Quantified Thresholds

| Metric | Threshold | Source |
|--------|-----------|--------|
| System response | <400ms | Doherty |
| Touch target | ≥44×44px | Apple HIG |
| Navigation items | 5-7 max | Hick's Law |
| Working memory | 4±1 items | Modern research |
| Color contrast (text) | ≥4.5:1 | WCAG AA |
| Color contrast (large) | ≥3:1 | WCAG AA |
| Line length | 45-75 chars | Typography research |
| Line height | ≥1.5 | WCAG |
| Form fields (checkout) | ≤12 | Baymard |
| Choices before filter needed | >7 | Miller's Law |
| Animation duration (micro) | 100-200ms | UX research |
| Animation duration (standard) | 200-300ms | UX research |
| Animation duration (complex) | 300-500ms | UX research |
