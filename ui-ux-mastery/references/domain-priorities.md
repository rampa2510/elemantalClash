# Domain-Specific Design Priorities

## Priority Matrices by Domain

Each domain has different priorities. Use these matrices to resolve conflicts.

---

## E-Commerce

### Priority Order
```
1. TRUST (40%)        → Security, reviews, guarantees
2. CHECKOUT (25%)     → Friction reduction, guest checkout
3. PRODUCT INFO (20%) → Images, specs, availability
4. MOBILE (10%)       → Touch targets, speed
5. SPEED (5%)         → Load time, perceived performance
```

### Critical Metrics
```
- Cart abandonment: 70.19% average (target: <60%)
- Mobile abandonment: 84% (target: <75%)
- Ideal form fields: 12 (average: 23.48)
- Review impact: 5+ reviews = 270% higher purchase
- Optimal rating display: 4.0-4.7 stars
```

### Must-Have Elements
```html
<!-- Product Page -->
- Multiple images (including "in-scale" shots)
- Clear price with any discounts
- Stock availability
- Shipping cost/time estimate
- Reviews with rating distribution
- Add to cart always visible

<!-- Checkout -->
- Guest checkout prominent
- All costs visible upfront
- Progress indicator
- Trust badges near payment
- Digital wallet options
- Order summary visible throughout
```

### Common Mistakes
```
❌ Requiring account creation before checkout
❌ Hiding shipping costs until final step
❌ No guest checkout option
❌ Too many form fields
❌ No product images showing scale
❌ Missing stock information
```

---

## SaaS / Dashboards

### Priority Order
```
1. CLARITY (35%)      → Information hierarchy, scan time
2. EFFICIENCY (25%)   → Task completion, shortcuts
3. ONBOARDING (20%)   → Progressive disclosure, empty states
4. RELIABILITY (15%)  → Error handling, status feedback
5. AESTHETICS (5%)    → Visual polish, branding
```

### Critical Metrics
```
- Dashboard scan time: 2-5 seconds for key metrics
- Progressive disclosure: Max 1-2 levels deep
- Keyboard shortcuts: Reduce task time 30-50%
- Empty state conversion: Should drive first action
```

### Must-Have Elements
```html
<!-- Dashboard -->
- Key metrics in F-pattern (top-left priority)
- Clear data hierarchy
- Actionable insights, not just data
- Refresh/last updated timestamp
- Export/share options

<!-- Navigation -->
- Command palette (⌘+K)
- Keyboard shortcuts for common actions
- Breadcrumbs for deep navigation
- Search with filters

<!-- Empty States -->
<div class="empty-state">
  <h3>No projects yet</h3>
  <p>Create your first project to get started</p>
  <button>Create Project</button>
</div>
```

### Common Mistakes
```
❌ Information overload on dashboard
❌ No progressive disclosure
❌ Truly empty empty states (no guidance)
❌ No keyboard shortcuts for power users
❌ Inconsistent data visualization
❌ No clear hierarchy of importance
```

---

## Healthcare / Medical

### Priority Order
```
1. SAFETY (40%)       → Error prevention, confirmations
2. ACCURACY (25%)     → Clear data display, no ambiguity
3. COMPLIANCE (15%)   → HIPAA, accessibility, audit trails
4. EFFICIENCY (15%)   → Workflow optimization
5. USABILITY (5%)     → Learnability (secondary to safety)
```

### Critical Metrics
```
- 36% of patient safety reports mention usability issues
- EHR systems rank bottom 9% of usability scores
- Doctors spend 1-2 hours in systems per hour of patient care
- Critical errors must require confirmation
```

### Must-Have Elements
```html
<!-- Data Display -->
- Abnormal values visually distinct
- Units always visible
- Patient identifiers on every screen
- Timestamp for all data

<!-- Critical Actions -->
<dialog class="confirmation-dialog">
  <h2>Confirm Medication Order</h2>
  <p>You are about to order:</p>
  <p class="highlight">Warfarin 5mg once daily</p>
  <p class="warning">⚠️ Patient has drug interaction alert</p>
  <button class="cancel">Cancel</button>
  <button class="confirm">Confirm Order</button>
</dialog>

<!-- Error Prevention -->
- Double-confirmation for high-risk actions
- Clear undo paths
- Validation before submission
- Audit trail visibility
```

### Common Mistakes
```
❌ Ambiguous data display (missing units, context)
❌ No confirmation for critical actions
❌ Alarm fatigue (too many alerts)
❌ Inconsistent iconography
❌ Poor contrast for critical information
❌ No keyboard navigation
```

---

## Enterprise / B2B

### Priority Order
```
1. EFFICIENCY (35%)   → Task speed, keyboard nav, bulk actions
2. RELIABILITY (25%)  → Stability, error recovery, data integrity
3. LEARNABILITY (20%) → Training time, discoverability
4. DOCUMENTATION (15%)→ Help, tooltips, guides
5. SECURITY (5%)      → Visible security, audit compliance
```

### Critical Metrics
```
- Users work 8-10 hours daily in system
- Post-learning efficiency > initial learnability
- Keyboard shortcuts reduce task time significantly
- "Make me think" acceptable if faster long-term
```

### Must-Have Elements
```html
<!-- Power User Features -->
- Command palette (⌘+K)
- Bulk actions for lists
- Keyboard shortcuts with cheatsheet
- Advanced filters and saved views
- Export in multiple formats

<!-- Data Tables -->
<table class="data-table">
  <thead>
    <tr>
      <th><input type="checkbox" aria-label="Select all"></th>
      <th>Name <button class="sort">↕</button></th>
      <th>Status <button class="filter">▼</button></th>
      ...
    </tr>
  </thead>
  ...
</table>

<!-- Bulk Actions -->
<div class="bulk-actions" hidden>
  <span>12 items selected</span>
  <button>Export</button>
  <button>Archive</button>
  <button>Delete</button>
</div>
```

### Common Mistakes
```
❌ Optimizing for first-time use over daily use
❌ No keyboard shortcuts
❌ No bulk actions
❌ Poor table handling (no sort/filter)
❌ No saved views or filters
❌ Missing documentation/help
```

---

## Consumer Mobile Apps

### Priority Order
```
1. SIMPLICITY (35%)   → Minimal cognitive load, clear flows
2. ENGAGEMENT (25%)   → Delight, retention, notifications
3. PERSONALIZATION (20%) → Relevant content, preferences
4. SPEED (15%)        → Instant feedback, offline support
5. AESTHETICS (5%)    → Visual polish, animations
```

### Critical Metrics
```
- Touch targets: 44×44pt minimum (Apple), 48×48dp (Material)
- Thumb zone: Primary actions in easy reach
- Gesture discoverability: Hints for swipe actions
- Load time: <3 seconds or lose 53% of users
```

### Must-Have Elements
```html
<!-- Touch Targets -->
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
}

<!-- Thumb Zone -->
<!-- Place primary actions at bottom of screen -->
<nav class="bottom-nav">
  <button>Home</button>
  <button>Search</button>
  <button class="primary">Add</button>
  <button>Activity</button>
  <button>Profile</button>
</nav>

<!-- Pull to Refresh -->
<!-- Swipe gestures with hints -->
<!-- Haptic feedback for actions -->
```

### Platform Conventions
```
iOS:
- Tab bar at bottom
- Back button top-left
- Swipe from edge to go back
- SF Symbols for icons

Android:
- Bottom navigation or drawer
- Back button (system)
- FAB for primary action
- Material icons
```

---

## Content / Media Sites

### Priority Order
```
1. READABILITY (35%)  → Typography, line length, contrast
2. NAVIGATION (25%)   → Content discovery, hierarchy
3. ENGAGEMENT (20%)   → Related content, comments
4. SPEED (15%)        → Time to first content
5. MONETIZATION (5%)  → Ads without disruption
```

### Critical Metrics
```
- Line length: 45-75 characters (66 ideal)
- Line height: 1.5× minimum (WCAG)
- Time on page: Higher with good typography
- Scroll depth: Measure engagement
- F-pattern compliance for headlines
```

### Must-Have Elements
```css
/* Typography for reading */
.article-body {
  max-width: 66ch;
  line-height: 1.6;
  font-size: clamp(1rem, 1vw + 0.75rem, 1.25rem);
}

.article-body p + p {
  margin-top: 1.5em;
}

/* Reading progress */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: var(--color-primary);
  width: var(--scroll-percent);
}
```

```html
<!-- Related Content -->
<aside class="related">
  <h3>You might also like</h3>
  <!-- Show at natural break points, not interrupting -->
</aside>

<!-- Estimated Read Time -->
<span class="read-time">5 min read</span>
```

### Common Mistakes
```
❌ Lines too long (>80 characters)
❌ Poor contrast (light gray on white)
❌ Intrusive ads interrupting content
❌ No estimated read time
❌ Related content that interrupts reading
❌ Infinite scroll without progress indicator
```

---

## Decision Framework

### When Domains Conflict
```
1. Identify the PRIMARY domain
2. Apply that domain's priority matrix
3. For secondary concerns, use weighted average

Example: Healthcare e-commerce (pharmacy)
- Healthcare priorities (70%)
- E-commerce priorities (30%)
→ Safety > Trust > Accuracy > Checkout
```

### Universal Non-Negotiables
```
Regardless of domain:
1. Accessibility (WCAG AA minimum)
2. Security (HTTPS, secure forms)
3. Performance (Core Web Vitals)
4. Error handling (clear, recoverable)
5. Mobile support (responsive at minimum)
```

### Priority Override Rules
```
ALWAYS prioritize:
- User safety over conversion
- Accessibility over aesthetics
- Clarity over cleverness
- User control over engagement
- Privacy over personalization
```
