# Testing Patterns

**Analysis Date:** 2026-08-25

## Test Framework

**Runner:**
- Vitest 4.1.11
- Config: `vitest.config.ts` (separate from `vite.config.ts` to exclude PWA plugin during tests)
- Environment: `node` (for pure function testing; will expand to `jsdom` when React component tests are added)

**Assertion Library:**
- Vitest built-in assertions (via `expect()`)
- No external assertion library configured yet (could use Chai, jest-expect, etc.)

**Run Commands:**
```bash
npm run test              # Run all tests once, exit with status
npm run test:watch       # Watch mode — re-run on file changes
npm run typecheck        # TypeScript type checking (separate from tests)
```

**Configuration Reference:**
- `vitest.config.ts` lines 10-13:
  ```typescript
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  }
  ```

## Test File Organization

**Location:**
- Co-located with source files (not separate test/ directory)
- Pattern: `src/**/*.{test,spec}.ts`

**Naming:**
- Suffix with `.test.ts` or `.spec.ts` before file extension
- Example (not yet created): `src/utils/calculations.test.ts`, `src/utils/formatCurrency.spec.ts`

**Structure:**
```
src/
├── utils/
│   ├── calculations.ts
│   ├── calculations.test.ts      ← Test file (once created)
│   ├── formatCurrency.ts
│   └── formatCurrency.test.ts    ← Test file (once created)
├── hooks/
│   ├── useBillScanner.ts
│   └── useBillScanner.test.ts    ← Test file (once created)
```

## Test Structure

**Current State:**
- No test files exist yet (0% coverage)
- vitest configured and ready

**Suite Organization (planned):**
```typescript
import { describe, it, expect } from 'vitest'
import { calculateTax } from '../calculations'

describe('calculateTax', () => {
  it('should extract tax from subtotal when taxIncluded=true', () => {
    const result = calculateTax(10800, 8, true)
    expect(result).toBe(800) // IVA already in price
  })

  it('should add tax to subtotal when taxIncluded=false', () => {
    const result = calculateTax(10000, 8, false)
    expect(result).toBe(800) // IVA to be added
  })
})
```

**Patterns (to implement):**
- Use `describe()` blocks for logical grouping by function/module
- Use `it()` or `test()` for individual test cases
- One assertion per test when possible (or logically related assertions)
- Arrange-Act-Assert (AAA) pattern within each test

## Mocking

**Framework:**
- Vitest provides `vi` for mocking (no separate mock library needed)
- Not yet configured; will be added when needed for:
  - Mocking fetch/API calls in `src/hooks/useBillScanner.ts`
  - Mocking context in component tests (when jsdom added)
  - Mocking file system operations

**Patterns (to implement):**
- Mock fetch for scanBill tests:
  ```typescript
  import { vi } from 'vitest'
  
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ items: [...] })
    })
  ))
  ```

**What to Mock:**
- External API calls (fetch to Cloudflare Worker)
- Browser APIs (navigator.vibrate in tests)
- File I/O (though useBillScanner currently uses Image/Canvas APIs)

**What NOT to Mock:**
- Pure utility functions (calculateTax, calculateSubtotal) — test directly
- Constants (PERSON_COLORS, MAX_DIMENSION) — no mocking needed
- React hooks when testing utilities that use them — test the hook, not mock React

## Fixtures and Factories

**Test Data (planned):**
- Create factory functions for common test objects:
  ```typescript
  // fixtures/bill.ts
  function createMockBillItem(overrides?: Partial<BillItem>): BillItem {
    return {
      id: 'test-1',
      name: 'Test Item',
      price: 10000,
      quantity: 1,
      assignedTo: [],
      ...overrides
    }
  }

  function createMockBillState(overrides?: Partial<BillState>): BillState {
    return {
      step: 1,
      items: [],
      people: [],
      taxPercent: 8,
      taxIncluded: true,
      tipPercent: 10,
      tipAmount: 0,
      tipType: 'percent',
      tipIsVoluntary: true,
      entryMode: 'manual',
      isLoading: false,
      ...overrides
    }
  }
  ```

**Location (planned):**
- `src/__fixtures__/` or `src/test/fixtures/` for shared test data
- Or inline in test files if minimal

## Coverage

**Requirements:** None enforced yet

**Targets (recommended):**
- 80%+ coverage for `src/utils/` (pure functions)
- 60%+ coverage for `src/hooks/` (utilities)
- 40%+ coverage for `src/components/` (UI, harder to test)

**View Coverage:**
```bash
npm run test -- --coverage
```
*(Coverage config not yet set up; uses vitest default reporter)*

## Test Types

**Unit Tests:**
- **Scope:** Individual functions in `src/utils/` and `src/hooks/`
- **Approach:** Test pure functions in isolation
- **Examples to add:**
  - `calculateTax()` with different taxIncluded values
  - `calculateTip()` with percent and fixed amounts
  - `roundToNearest100()` edge cases
  - `formatCOP()` number formatting
  - `calculateSplit()` person assignment logic

**Integration Tests:**
- **Scope:** Context reducer (BillContext) state transitions
- **Approach:** Dispatch actions, verify state changes
- **Examples (planned):**
  - ADD_ITEM followed by ASSIGN_PERSON maintains data integrity
  - REMOVE_PERSON cleans up all item assignments
  - SET_STEP clears originalImage on step > 1

**E2E Tests:**
- Not implemented
- Would require `@testing-library/react` + jsdom environment
- Planned for future when component integration is critical

## Common Patterns

**Async Testing:**
- Use `async/await` with vitest's native support:
  ```typescript
  it('should scan bill from image', async () => {
    const result = await scanBill(base64, 'image/jpeg')
    expect(result.items).toHaveLength(2)
  })
  ```
- Mock fetch before test to avoid real API calls
- Timeouts handled via `vi.useFakeTimers()` if needed

**Error Testing:**
- Test error paths explicitly:
  ```typescript
  it('should throw on missing VITE_WORKER_URL', async () => {
    vi.stubEnv('VITE_WORKER_URL', undefined)
    await expect(scanBill('base64', 'image/jpeg')).rejects.toThrow('no está configurado')
  })
  ```
- Verify error messages are user-friendly
- Test catch/finally blocks

**Edge Cases (priority for first tests):**
- Division by zero in calculateTax (when taxPercent = 0)
- Empty items array in calculateSubtotal (should return 0)
- Single-person split (tip/tax division by 1)
- Rounding edge cases (amounts that end in .50)
- Invalid input sanitization from OCR (`src/hooks/useBillScanner.ts` lines 29-35)

## Test Readability

**Naming Conventions:**
- Test case names describe behavior, not implementation:
  - ✅ `should calculate tax correctly when IVA is included in price`
  - ❌ `test_calculateTax_with_taxIncluded_true`

**AAA Pattern (Arrange-Act-Assert):**
```typescript
it('should divide item cost equally among assigned people', () => {
  // Arrange
  const item: BillItem = { id: '1', name: 'Dish', price: 30000, quantity: 1, assignedTo: ['p1', 'p2'] }
  const state = createMockBillState({ items: [item], people: [...] })

  // Act
  const splits = calculateSplit(state)

  // Assert
  expect(splits[0].subtotal).toBe(15000)
  expect(splits[1].subtotal).toBe(15000)
})
```

---

*Testing analysis: 2026-08-25*
