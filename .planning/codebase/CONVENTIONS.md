# Coding Conventions

**Analysis Date:** 2026-08-25

## Naming Patterns

**Files:**
- React components: PascalCase with .tsx extension — `PersonAvatar.tsx`, `Step1Entry.tsx`, `StepFooter.tsx`
- Utilities and helpers: camelCase with .ts extension — `formatCurrency.ts`, `calculations.ts`
- Custom hooks: camelCase, prefixed with `use` — `useBillScanner.ts`, `useBillSplit.ts`, `useHaptic.ts`
- Context files: PascalCase — `BillContext.tsx`
- Type definition files: camelCase — `bill.ts`
- Directories: kebab-case (multi-word) or lowercase — `src/components/steps/`, `src/utils/`, `src/hooks/`

**Functions:**
- camelCase for all functions (both exported and internal)
- Descriptive action verbs: `calculateTax()`, `fileToBase64()`, `scanBill()`, `formatCOP()`
- Boolean getters/checks: `isValid`, `isDragActive` (adjective prefix, not verb)
- Private/internal functions: no leading underscore, just standard camelCase — `roundUpTo100()`

**Variables:**
- camelCase for all variables — `selectedFile`, `isLoading`, `personSubtotals`, `originalImage`
- Boolean variables start with `is` or `has` — `isValid`, `hasError`, `isDragActive`
- Derived/computed variables: `priceStr`, `qtyNum` (descriptive suffix for type/transformation)

**Types:**
- Interface names: PascalCase, descriptive nouns — `BillState`, `PersonSplit`, `BillItem`, `Person`
- Type aliases: PascalCase — `BillAction` (discriminated union for reducer actions)
- Generic type parameters: single uppercase letter or descriptive PascalCase — `React.Dispatch<BillAction>`

**Constants:**
- UPPER_SNAKE_CASE for module-level constants — `PERSON_COLORS`, `MAX_DIMENSION`, `JPEG_QUALITY`
- Grouped in types file or utility file where used — `src/types/bill.ts` contains `PERSON_COLORS`

## Code Style

**Formatting:**
- No explicit ESLint/Prettier config in codebase
- Inferred from TypeScript strict mode and project files:
  - 2-space indentation (standard for React projects with Vite)
  - Semicolons at end of statements
  - Single quotes in template strings (when applicable)
  - Trailing commas in multiline structures

**Linting:**
- TypeScript strict mode enforced via `tsconfig.json` settings:
  - `strict: true` — all strict checks enabled
  - `noUnusedLocals: true` — no unused variables allowed
  - `noUnusedParameters: true` — parameters must be used
  - `noFallthroughCasesInSwitch: true` — switch cases must return/break
  - `isolatedModules: true` — each file treated independently

**No External Linter:**
- No .eslintrc or .prettierrc file in repo
- Relies on TypeScript compiler for style/correctness
- Type safety is primary validation mechanism

## Import Organization

**Order:**
1. React/React-DOM utilities first — `import { useState, useRef } from 'react'`
2. Third-party library imports — `import { AnimatePresence, motion } from 'framer-motion'`
3. Internal utilities and types — `import { BillItem } from '../types/bill'`
4. Context/state management — `import { useBill } from '../context/BillContext'`
5. Component imports — `import ItemForm from '../ui/ItemForm'`

See `src/components/steps/Step2Review.tsx` for canonical example.

**Path Aliases:**
- All imports use relative paths with `../` navigation
- No path alias configuration (e.g., `@/` not used)
- Relative paths reflect component hierarchy clearly — Step components import from `../../context/`, `../../utils/`, etc.

**Barrel Files:**
- Not used in this codebase
- Each file imported directly, e.g., `import { useBill } from '../context/BillContext'` (not from `../context`)

## Error Handling

**Patterns:**
- **Try/catch for async operations** — `src/components/steps/Step1Entry.tsx` lines 79-94:
  ```typescript
  try {
    const { base64, mediaType } = await fileToBase64(selectedFile);
    // ... processing steps
  } catch (err) {
    setError(
      err instanceof Error ? err.message : 'No se pudo leer la factura. Intenta de nuevo o ingresa manualmente.'
    );
  } finally {
    setIsLoading(false);
  }
  ```
- **Response status checking** — `src/hooks/useBillScanner.ts` lines 20-23:
  ```typescript
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? 'Error al procesar la factura');
  }
  ```
- **User-friendly error messages** — always in Spanish (Colombian Spanish), with fallback options
- **Error UI component** — `src/components/ui/ErrorMessage.tsx` renders error with optional action button
- **State-based error display** — errors stored in component state (`setError`) and rendered conditionally

## Logging

**Framework:** None — no logging library used

**Patterns:**
- No console.log() statements in codebase
- Errors communicated via UI only (ErrorMessage component, error state)
- For debugging during development: TypeScript compiler error messages + browser DevTools
- Comments preferred over logs for intent documentation

## Comments

**When to Comment:**
- Complex business logic (tax/tip calculations) — always explained with JSDoc
- Memory management (URL cleanup, blob references) — inline comments required
- Non-obvious code transformations (string regex, type coercion) — inline comment per operation
- Algorithm choices (rounding logic, proportional splitting) — brief explanation

**JSDoc/TSDoc:**
- Used for exported functions with complex parameters
- Example from `src/utils/calculations.ts` lines 7-11:
  ```typescript
  /**
   * Calcula el IVA según si los precios ya lo incluyen o no.
   * - taxIncluded=true:  extrae el IVA del subtotal (ya estaba incluido, solo informativo)
   * - taxIncluded=false: calcula el IVA sobre el subtotal (se sumará al total)
   */
  export function calculateTax(subtotal: number, taxPercent: number, taxIncluded: boolean): number
  ```
- Not required for trivial getters/setters
- Always in Spanish (project language)

**Inline Comments:**
- Explain "why" not "what" (code shows what, comment explains intent)
- Example from `src/context/BillContext.tsx` line 48:
  ```typescript
  // Liberar la imagen al salir del step 1
  originalImage: action.step > 1 ? undefined : state.originalImage,
  ```
- Short, one-line comments for single statements
- Multi-line comments (/** ... */) for complex logic blocks

## Function Design

**Size:** 
- Prefer small, focused functions under 30 lines
- Extract helpers for repeated logic — `roundUpTo100()` in calculations.ts is private helper
- Long components (Steps) acceptable; kept under 200 lines via helper subcomponents

**Parameters:**
- Destructure object parameters for clarity — `{ item, onUpdate, onRemove }` in ItemCard subcomponent
- Limit to 3-4 logical parameters; use objects for more
- Type all parameters explicitly with TypeScript

**Return Values:**
- Async functions always return Promise<T> explicitly typed
- Pure functions return derived data without side effects
- Component functions return JSX.Element or void
- Helper hooks return single value or object of related values — `useBillSplit()` returns `BillSummary`

**Early Returns:**
- Use early returns to avoid deep nesting — `Step1Entry.tsx` returns different UI branches with early conditional returns
- Guard clauses for validation — `if (!isValid) return;` before processing

## Module Design

**Exports:**
- Default export for React components (one component per file) — `export default function PersonAvatar() { ... }`
- Named exports for utilities, hooks, types — `export function calculateTax() { ... }`, `export interface BillState { ... }`
- Re-export types from index files (if needed) — currently not used

**Context Pattern:**
- Provider component (`BillProvider`) wraps app tree in `src/main.tsx`
- Custom hook `useBill()` with null-check for context access
- Throws descriptive error if hook used outside provider

**State Management:**
- useReducer for complex state (BillContext)
- Discriminated union types for actions: `type: 'ACTION_NAME'` + payload
- Example action from `src/context/BillContext.tsx` lines 19-40:
  ```typescript
  type BillAction =
    | { type: 'SET_STEP'; step: BillState['step'] }
    | { type: 'ADD_ITEM'; item: BillItem }
    // ...
  ```
- Helper methods in provider (nextStep, prevStep) for common operations

**CSS and Styling:**
- NO hardcoded colors in components — all colors via CSS variables from `src/theme.css`
- Inline styles use `var()` function — `style={{ color: 'var(--color-purple)' }}`
- Tailwind classes combined with inline styles (no Tailwind color utilities except brand tokens)
- Brand tokens in Tailwind config map to CSS variables with RGB values for opacity support

---

*Convention analysis: 2026-08-25*
