# Testing & Automation: Quality Assurance

## Accessibility Testing

### axe-core (Automated)
```javascript
// Jest + React Testing Library
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component has no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Playwright Accessibility
```javascript
// playwright.config.js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('page has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});

// Scan specific component
test('modal is accessible', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="open-modal"]');
  
  const results = await new AxeBuilder({ page })
    .include('.modal')
    .analyze();
  
  expect(results.violations).toEqual([]);
});
```

### Manual Testing Checklist
```markdown
## Keyboard Navigation
- [ ] Tab order is logical
- [ ] All interactive elements are focusable
- [ ] Focus indicators are visible
- [ ] Escape closes modals/dropdowns
- [ ] Enter/Space activate buttons
- [ ] Arrow keys work in menus/tabs

## Screen Reader
- [ ] Page has descriptive title
- [ ] Headings follow hierarchy (h1 → h2 → h3)
- [ ] Images have alt text
- [ ] Form fields have labels
- [ ] Error messages are announced
- [ ] Dynamic content updates are announced

## Visual
- [ ] Text has 4.5:1 contrast (3:1 for large text)
- [ ] UI works at 200% zoom
- [ ] Content reflows at 320px width
- [ ] Focus indicators visible
- [ ] Not relying on color alone
```

---

## Lighthouse CI

### Setup
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          configPath: './lighthouserc.json'
          uploadArtifacts: true
```

### Configuration
```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000/", "http://localhost:3000/about"],
      "startServerCommand": "npm run start",
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### Core Web Vitals Thresholds
```
GOOD:
- LCP (Largest Contentful Paint): ≤2.5s
- FID (First Input Delay): ≤100ms
- CLS (Cumulative Layout Shift): ≤0.1
- INP (Interaction to Next Paint): ≤200ms

NEEDS IMPROVEMENT:
- LCP: 2.5s - 4s
- FID: 100ms - 300ms
- CLS: 0.1 - 0.25
- INP: 200ms - 500ms

POOR:
- LCP: >4s
- FID: >300ms
- CLS: >0.25
- INP: >500ms
```

---

## Visual Regression Testing

### Playwright Visual Comparisons
```javascript
import { test, expect } from '@playwright/test';

test('homepage visual regression', async ({ page }) => {
  await page.goto('/');
  
  // Full page screenshot
  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
    maxDiffPixels: 100
  });
});

test('component visual regression', async ({ page }) => {
  await page.goto('/');
  
  // Component screenshot
  const card = page.locator('.product-card').first();
  await expect(card).toHaveScreenshot('product-card.png');
});

// Test multiple viewports
const viewports = [
  { width: 375, height: 667, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1280, height: 720, name: 'desktop' }
];

for (const viewport of viewports) {
  test(`homepage at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`);
  });
}
```

### Dark Mode Testing
```javascript
test('dark mode visual', async ({ page }) => {
  // Test light mode
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage-light.png');
  
  // Test dark mode
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page).toHaveScreenshot('homepage-dark.png');
});
```

---

## Component Testing

### Testing Library Best Practices
```javascript
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ✅ GOOD: Query by accessible role/label
test('submits form correctly', async () => {
  const user = userEvent.setup();
  render(<ContactForm />);
  
  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/message/i), 'Hello');
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(screen.getByText(/thank you/i)).toBeInTheDocument();
});

// ❌ BAD: Query by test ID when better options exist
test('bad test', () => {
  render(<Button>Click me</Button>);
  screen.getByTestId('submit-button'); // Avoid if possible
});
```

### Testing Focus Management
```javascript
test('modal traps focus', async () => {
  const user = userEvent.setup();
  render(<ModalExample />);
  
  // Open modal
  await user.click(screen.getByRole('button', { name: /open modal/i }));
  
  // Focus should be on modal
  const modal = screen.getByRole('dialog');
  expect(modal).toContainElement(document.activeElement);
  
  // Tab should stay within modal
  const closeButton = within(modal).getByRole('button', { name: /close/i });
  const confirmButton = within(modal).getByRole('button', { name: /confirm/i });
  
  await user.tab();
  expect(confirmButton).toHaveFocus();
  
  await user.tab();
  expect(closeButton).toHaveFocus();
  
  // Tab wraps back to first element
  await user.tab();
  expect(confirmButton).toHaveFocus();
  
  // Escape closes modal
  await user.keyboard('{Escape}');
  expect(modal).not.toBeInTheDocument();
  
  // Focus returns to trigger
  expect(screen.getByRole('button', { name: /open modal/i })).toHaveFocus();
});
```

### Testing Responsive Behavior
```javascript
import { render, screen } from '@testing-library/react';
import matchMediaPolyfill from 'mq-polyfill';

beforeAll(() => {
  matchMediaPolyfill(window);
});

test('navigation collapses on mobile', () => {
  window.resizeTo(375, 667);
  render(<Navigation />);
  
  // Mobile: hamburger visible, nav hidden
  expect(screen.getByRole('button', { name: /menu/i })).toBeVisible();
  expect(screen.queryByRole('navigation')).not.toBeVisible();
});
```

---

## E2E Testing Patterns

### User Flows
```javascript
import { test, expect } from '@playwright/test';

test.describe('checkout flow', () => {
  test('guest checkout', async ({ page }) => {
    // Add product
    await page.goto('/products/widget');
    await page.click('[data-testid="add-to-cart"]');
    
    // Go to cart
    await page.click('[data-testid="cart-icon"]');
    await expect(page.locator('.cart-count')).toHaveText('1');
    
    // Proceed to checkout
    await page.click('text=Checkout');
    
    // Fill shipping
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="name"]', 'Test User');
    await page.fill('[name="address"]', '123 Test St');
    await page.fill('[name="city"]', 'Test City');
    await page.selectOption('[name="state"]', 'CA');
    await page.fill('[name="zip"]', '12345');
    
    await page.click('text=Continue to Payment');
    
    // Fill payment (test mode)
    await page.fill('[name="card"]', '4242424242424242');
    await page.fill('[name="expiry"]', '12/25');
    await page.fill('[name="cvv"]', '123');
    
    await page.click('text=Place Order');
    
    // Verify confirmation
    await expect(page.locator('h1')).toHaveText(/order confirmed/i);
    await expect(page.locator('.order-number')).toBeVisible();
  });
});
```

### Error Handling
```javascript
test('shows validation errors', async ({ page }) => {
  await page.goto('/signup');
  
  // Submit empty form
  await page.click('button[type="submit"]');
  
  // Check error messages
  await expect(page.locator('[data-error="email"]')).toHaveText(/email is required/i);
  await expect(page.locator('[data-error="password"]')).toHaveText(/password is required/i);
  
  // Fill invalid email
  await page.fill('[name="email"]', 'invalid-email');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('[data-error="email"]')).toHaveText(/valid email/i);
});
```

---

## CI Pipeline Integration

### GitHub Actions Complete Setup
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
  
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:a11y
  
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
  
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: treosh/lighthouse-ci-action@v11
        with:
          configPath: './lighthouserc.json'
          uploadArtifacts: true
```

---

## Monitoring & Reporting

### Performance Monitoring
```javascript
// web-vitals reporting
import { onCLS, onFID, onLCP, onINP, onTTFB } from 'web-vitals';

function sendToAnalytics({ name, delta, id }) {
  // Send to your analytics endpoint
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify({ name, delta, id }),
  });
}

onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### Error Tracking
```javascript
// Sentry or similar
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: 'your-dsn',
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
});
```

---

## Quick Reference

### Test Priority
```
1. Accessibility (axe-core)    - Blocks deployment
2. Unit tests (Jest/Vitest)    - Blocks deployment
3. Integration (RTL)           - Blocks deployment
4. E2E critical paths          - Blocks deployment
5. Visual regression           - Warning only
6. Performance (Lighthouse)    - Warning only
```

### Minimum Coverage
```
- Accessibility: 0 violations (axe-core)
- Lighthouse Performance: >90
- Lighthouse Accessibility: >95
- Core Web Vitals: All "Good"
- Unit test coverage: >80%
- E2E: All critical paths
```

### Testing Commands
```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:a11y",
    "test:unit": "vitest run",
    "test:a11y": "jest --config jest.a11y.config.js",
    "test:e2e": "playwright test",
    "test:visual": "playwright test --update-snapshots",
    "lighthouse": "lhci autorun"
  }
}
```
