# Liminal Frontend Test Suite

Comprehensive test suite for the Liminal frontend, covering both component-level and end-to-end UI testing using modern, industry-standard tooling.

## Technology Stack

### End-to-End Testing
- **Playwright** - Modern, fast, cross-browser E2E testing framework
  - Multi-browser support (Chromium, Firefox, WebKit)
  - Mobile device emulation
  - Auto-wait functionality
  - Parallel test execution
  - Built-in test reports

### Component Testing
- **Vitest** - Next-generation test runner (Vite-powered, faster than Jest)
- **React Testing Library** - User-centric component testing
- **@testing-library/jest-dom** - Custom matchers for DOM assertions
- **@testing-library/user-event** - Realistic user interaction simulation
- **jsdom** - Lightweight DOM implementation for testing

## Running Tests

### Quick Start

```bash
# Install dependencies (if not already installed)
npm install

# Run all component tests
npm test

# Run all E2E tests
npm run test:e2e

# Run all tests (component + E2E)
npm run test:all
```

### Component Tests (Vitest)

```bash
# Run component tests in watch mode (development)
npm test

# Run component tests once (CI mode)
npm test -- --run

# Run with UI interface
npm run test:ui

# Run tests matching a pattern
npm test -- TaskCard

# Run with coverage
npm test -- --coverage
```

### E2E Tests (Playwright)

```bash
# Run E2E tests (headless mode)
npm run test:e2e

# Run with Playwright UI (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/focus-mode.spec.ts

# Run specific browser
npx playwright test --project=chromium

# Run with debugging
npx playwright test --debug
```

### Using Test Runner Script

```bash
cd frontend
./run-tests.sh
```

### In Docker

```bash
# Install dependencies first (one-time)
docker exec liminal_frontend npm install

# Run component tests
docker exec liminal_frontend npm test -- --run

# Run E2E tests (requires display)
docker exec liminal_frontend npm run test:e2e
```

## Test Coverage

### Component Tests (`__tests__/components/`)

**TaskCard Component** (8 tests)
- ✓ Renders task title
- ✓ Displays estimated time when provided
- ✓ Hides estimated time when not provided
- ✓ Applies correct priority styling (high/medium/low)
- ✓ Renders checkbox button
- ✓ Has hover effects

**QuickCapture Component** (9 tests)
- ✓ Renders input with placeholder
- ✓ Allows typing in input
- ✓ Renders submit button
- ✓ Clears input after submission
- ✓ Prevents empty input submission
- ✓ Prevents whitespace-only submission
- ✓ Logs captured task to console
- ✓ Submits via button click
- ✓ Disables button when empty

**FocusToggle Component** (10 tests)
- ✓ Renders in planning mode by default
- ✓ Displays correct icon and text
- ✓ Toggles to focus mode on click
- ✓ Displays focus mode styling
- ✓ Toggles back to planning mode
- ✓ Applies correct styles (planning/focus)
- ✓ Has proper title attributes
- ✓ Updates global Zustand state
- ✓ Has rounded styling

### E2E Tests (`e2e/`)

**Homepage Tests** (`homepage.spec.ts` - 8 tests)
- ✓ Displays page title and greeting
- ✓ Shows all tasks in planning mode
- ✓ Displays task priorities with colors
- ✓ Shows estimated time for tasks
- ✓ Shows Quick Capture input
- ✓ Displays sidebar with progress/streak
- ✓ Has navigation to board page

**Focus Mode Tests** (`focus-mode.spec.ts` - 7 tests)
- ✓ Starts in planning mode by default
- ✓ Toggles to focus mode
- ✓ Shows only one task in focus mode
- ✓ Hides sidebar in focus mode
- ✓ Makes Quick Capture less prominent
- ✓ Toggles back to planning mode
- ✓ Documents state persistence behavior

**Quick Capture Tests** (`quick-capture.spec.ts` - 8 tests)
- ✓ Displays input field
- ✓ Allows typing
- ✓ Shows submit button on focus
- ✓ Submits and clears on Enter
- ✓ Prevents empty submission
- ✓ Submits via button click
- ✓ Handles multiple captures in sequence
- ✓ Logs captured task to console

**Board Tests** (`board.spec.ts` - 15 tests)
- ✓ Displays board title and description
- ✓ Shows all three columns (To Do, In Progress, Done)
- ✓ Shows task counts in headers
- ✓ Displays tasks with correct information
- ✓ Shows priority indicators
- ✓ Displays theme filter buttons
- ✓ Has "New Initiative" button
- ✓ Has link back to Focus Mode
- ✓ Navigation between pages works
- ✓ Displays tasks in correct columns
- ✓ Shows user avatar initials
- ✓ Drag-and-drop smoke test

**Total E2E Tests:** 38 tests across 4 test files

## Test Structure

```
frontend/
├── __tests__/              # Component tests
│   └── components/
│       ├── TaskCard.test.tsx
│       ├── QuickCapture.test.tsx
│       └── FocusToggle.test.tsx
├── e2e/                    # End-to-end tests
│   ├── homepage.spec.ts
│   ├── focus-mode.spec.ts
│   ├── quick-capture.spec.ts
│   └── board.spec.ts
├── playwright.config.ts    # Playwright configuration
├── vitest.config.ts       # Vitest configuration
├── vitest.setup.ts        # Test setup (jest-dom)
└── run-tests.sh           # Test runner script
```

## Key Features

### Playwright (E2E Tests)
- **Multi-browser testing**: Chrome, Firefox, Safari, Mobile
- **Auto-wait**: No manual waits needed
- **Parallel execution**: Fast test runs
- **Video recording**: On failure (configurable)
- **Screenshots**: Captured on failure
- **Trace viewer**: Detailed test execution traces
- **Accessibility testing**: Built-in ARIA role selectors

### Vitest (Component Tests)
- **Fast**: Powered by Vite, instant hot module reload
- **Watch mode**: Re-runs tests on file changes
- **Coverage**: Built-in code coverage with c8
- **Compatible**: Jest-compatible API
- **TypeScript**: First-class TypeScript support
- **UI Mode**: Interactive test UI

### Testing Library
- **User-centric**: Tests that resemble how users interact
- **Accessibility**: Encourages accessible component patterns
- **No implementation details**: Tests behavior, not internals

## Browser Support (E2E Tests)

By default, Playwright tests run on:
- Desktop Chrome (Chromium)
- Desktop Firefox
- Desktop Safari (WebKit)
- Mobile Chrome (Pixel 5 emulation)
- Mobile Safari (iPhone 12 emulation)

Configure in `playwright.config.ts` to adjust browsers.

## Continuous Integration

For CI environments:
- Component tests run in CI mode (no watch)
- E2E tests run with retries (2 retries on failure)
- Test artifacts (videos, traces) saved on failure
- Tests run in parallel for speed

Example CI commands:
```bash
# Component tests
npm test -- --run --reporter=verbose

# E2E tests
npm run test:e2e -- --reporter=line
```

## Debugging

### Component Tests
```bash
# Run specific test file
npm test TaskCard

# Run in watch mode with verbose output
npm test -- --reporter=verbose

# Open Vitest UI
npm run test:ui
```

### E2E Tests
```bash
# Debug mode (opens inspector)
npx playwright test --debug

# Debug specific test
npx playwright test focus-mode --debug

# Open trace viewer for failed test
npx playwright show-trace trace.zip

# Generate and view test report
npx playwright show-report
```

## Best Practices

1. **E2E Tests**: Test user flows and critical paths
2. **Component Tests**: Test isolated component behavior
3. **Accessibility**: Use semantic HTML and ARIA roles
4. **User-centric**: Select elements as users would (by role, text, label)
5. **Avoid implementation details**: Don't test internal state or CSS classes unnecessarily
6. **Meaningful assertions**: Test behavior, not markup structure

## Test Reports

### Playwright
After running E2E tests, view HTML report:
```bash
npx playwright show-report
```

### Vitest
Coverage report:
```bash
npm test -- --coverage
```

## Notes

- E2E tests require the dev server to be running (auto-started by Playwright)
- Component tests run in isolation with jsdom (no dev server needed)
- Playwright automatically downloads browser binaries on first install
- Mock data is used throughout tests (no backend required)
- Focus mode state is managed by Zustand store (tested in integration)
