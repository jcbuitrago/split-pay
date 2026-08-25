<!-- refreshed: 2026-08-25 -->
# Architecture

**Analysis Date:** 2026-08-25

## System Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                        │
│  ┌──────────┬──────────────┬──────────────┬─────────────────────┐ │
│  │ Step1    │ Step2        │ Step3-5      │ Step6               │ │
│  │ Entry    │ Review       │ People/      │ Result              │ │
│  │ (Scan)   │ (Items)      │ Assign/Tax   │ (Share)             │ │
│  └──────────┴──────────────┴──────────────┴─────────────────────┘ │
│                   `src/components/steps/`                          │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              UI Components (Shared)                           │ │
│  │  PersonAvatar  │ PersonChips │ ItemForm │ StepFooter         │ │
│  │  `src/components/ui/`                                         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │         Context API State Management                          │ │
│  │  `src/context/BillContext.tsx` — useReducer + dispatch        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌────────────────┬──────────────────┬────────────────────────┐   │
│  │ useBillScanner │ useBillSplit     │ useHaptic             │   │
│  │ (OCR call)     │ (Calculations)   │ (Vibration feedback) │   │
│  │ `hooks/`       │                  │                      │   │
│  └────────────────┴──────────────────┴────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │         Utilities & Types                                    │ │
│  │  calculations.ts  formatCurrency.ts  bill.ts                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│         fetch() → POST /scan (base64 image)                      │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│              Cloudflare Worker (Proxy + OCR)                      │
│  `worker/index.js`                                               │
│                                                                  │
│  • CORS security (origin whitelist from ALLOWED_ORIGIN env)     │
│  • Rate limiting (20 req/hr per IP via KV + memory fallback)    │
│  • Image validation (max 8MB base64, resize on client)          │
│  • Claude Vision API call (claude-haiku-4-5)                    │
│  • Sanitize OCR output (name/price/qty limits)                  │
│  • 25s timeout with AbortController                            │
│  • Respond with { items, currency }                            │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
          Claude API (Anthropic Vision)
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **App** | Renders step dispatcher & layout wrapper | `src/App.tsx` |
| **Step1Entry** | Scan/manual entry, drag & drop, OCR call | `src/components/steps/Step1Entry.tsx` |
| **Step2Review** | Item list, edit/delete items, subtotal | `src/components/steps/Step2Review.tsx` |
| **Step3People** | Add/remove people, assign colors | `src/components/steps/Step3People.tsx` |
| **Step4Assign** | Assign items to people, show per-person totals | `src/components/steps/Step4Assign.tsx` |
| **Step5TaxTip** | Configure tax & tip, preview totals | `src/components/steps/Step5TaxTip.tsx` |
| **Step6Result** | Show splits, share via WhatsApp/clipboard | `src/components/steps/Step6Result.tsx` |
| **PersonAvatar** | DiceBear funEmoji avatar, size/assigned state | `src/components/ui/PersonAvatar.tsx` |
| **PersonChips** | Horizontal scrollable avatar list | `src/components/ui/PersonChips.tsx` |
| **ItemForm** | Reusable form for item name/qty/price | `src/components/ui/ItemForm.tsx` |
| **Stepper** | Progress bar (step indicator) | `src/components/ui/Stepper.tsx` |
| **StepFooter** | Shared "Back" / "Continue" button footer | `src/components/ui/StepFooter.tsx` |
| **ErrorMessage** | Error display with fallback action | `src/components/ui/ErrorMessage.tsx` |
| **BillContext** | Global state + reducer + dispatch | `src/context/BillContext.tsx` |
| **useBillScanner** | Fetch to Worker, image compression | `src/hooks/useBillScanner.ts` |
| **useBillSplit** | Calculate splits based on state | `src/hooks/useBillSplit.ts` |
| **useHaptic** | Haptic feedback (navigator.vibrate) | `src/hooks/useHaptic.ts` |

## Pattern Overview

**Overall:** Multi-step flow with centralized state management

**Key Characteristics:**
- **Linear progression:** 6-step wizard (step 1 → 6, reversible)
- **Context-based state:** useReducer in BillContext, dispatch from any component
- **Functional components:** All React 18+ hooks (no class components)
- **Separated concerns:** Steps handle UI, hooks handle logic, utils handle calculations
- **Stateless utilities:** calculations.ts is pure functions (no hooks)

## Layers

**Presentation Layer (Components):**
- Purpose: Render UI, handle user interaction, call dispatch & hooks
- Location: `src/components/steps/` (step flows), `src/components/ui/` (reusable)
- Contains: TSX files with inline Tailwind, framer-motion animations
- Depends on: useBill(), useBillSplit(), useBillScanner(), custom hooks
- Used by: App.tsx (entry point)

**Business Logic Layer (Hooks):**
- Purpose: Encapsulate reusable logic (OCR calls, calculations, haptics)
- Location: `src/hooks/`
- Contains: useBillSplit (calculation orchestrator), useBillScanner (fetch to Worker), useHaptic (vibration)
- Depends on: Context (useBill), utilities (calculations.ts, formatCurrency.ts)
- Used by: Step components

**State Management Layer (Context):**
- Purpose: Hold global bill state, provide dispatch mechanism
- Location: `src/context/BillContext.tsx`
- Contains: useReducer, BillProvider, useBill hook
- Depends on: TypeScript types (bill.ts)
- Used by: All components via useBill()

**Data/Utility Layer (Utils):**
- Purpose: Pure functions for calculations, formatting, type definitions
- Location: `src/utils/` (calculations, formatCurrency), `src/types/` (bill.ts, interfaces)
- Contains: No side effects, no hooks, reusable logic
- Depends on: TypeScript only
- Used by: Hooks, context, components

**External Integration Layer (Worker):**
- Purpose: OCR proxy, CORS security, rate limiting
- Location: `worker/index.js`, deployed to Cloudflare
- Depends on: Claude API (Anthropic)
- Used by: Frontend via useBillScanner.ts fetch call

## Data Flow

### Primary Request Path (Scan OCR)

1. **User taps "📷 Escanear factura"** (`Step1Entry.tsx:47`)
   - Opens device camera or file picker via `<input type="file" capture="environment">`

2. **User selects image or takes photo** (`Step1Entry.tsx:58`)
   - `handleFileChange()` → setFile() → shows preview

3. **User taps "✅ Usar esta foto"** (`Step1Entry.tsx:75`)
   - Calls `fileToBase64()` (resize to 1200px, JPEG 82% quality, base64 encode)
   - Dispatch `SET_ORIGINAL_IMAGE` action (store base64)
   - Dispatch `SET_LOADING` true
   - Fetch to Worker: `POST /scan` with { image, mediaType }

4. **Cloudflare Worker processes** (`worker/index.js:18`)
   - Validate CORS origin (whitelist check, never reflect request origin)
   - Rate limit check (20 req/hr per IP)
   - Call Claude Vision API with prompt (claude-haiku-4-5)
   - Sanitize response (name ≤200 chars, price ≥0, qty 1-99)
   - Return { items, currency }

5. **Frontend receives items** (`Step1Entry.tsx:82`)
   - Parse response → `items: BillItem[]`
   - Dispatch `SET_ITEMS` action (populate item list)
   - Dispatch `SET_ENTRY_MODE('scan')`
   - Call `nextStep()` → move to Step2

**State mutations:** No image stored beyond Step1 (cleared in SET_STEP case when step > 1, see `BillContext.tsx:49`)

### Secondary Flow (Manual Entry)

1. **User taps "✏️ Ingresar manualmente"** (`Step1Entry.tsx:52`)
   - Dispatch `SET_ENTRY_MODE('manual')`
   - Call `nextStep()` → Step2

2. **User adds items in Step2** (`Step2Review.tsx`)
   - Tap "+ Agregar ítem" → ItemForm modal/inline
   - Enter name, quantity, price
   - Dispatch `ADD_ITEM` or `UPDATE_ITEM`

### State Management Pattern

**Reducer logic** (`BillContext.tsx:42`):
- Actions: SET_STEP, ADD_ITEM, UPDATE_ITEM, REMOVE_ITEM, ADD_PERSON, REMOVE_PERSON, ASSIGN_PERSON, etc.
- Immutable updates (spread operator, map, filter)
- Cascading deletes: Remove person → filter from all items' assignedTo arrays

**Context hook** (`useBill()` at line 177):
- Returns { state, dispatch, nextStep, prevStep, nextPersonColor }
- Throws if used outside BillProvider

### Calculation Flow (useBillSplit)

1. **componentReceives state** from BillContext
2. **calculateSubtotal()** — sum of all (item.price × item.quantity)
3. **calculateTax()** — handles two modes:
   - `taxIncluded=true`: extract IVA from subtotal (already in prices)
   - `taxIncluded=false`: add IVA on top
4. **calculateTip()** — on pre-tax base, round up to nearest $100
5. **calculateSplit()** — per-person breakdown:
   - Distribute item cost across assignedTo persons equally
   - Allocate proportional tax & tip
   - Round final totals to nearest $100
6. **Returns BillSummary** — { subtotal, tax, tip, total, splits: PersonSplit[] }

## Key Abstractions

**BillState:**
- Purpose: Represents entire bill at any moment
- Examples: `src/types/bill.ts`
- Pattern: TypeScript interface, immutable updates via reducer

**BillItem:**
- Purpose: Single line item with price, quantity, assignment
- Examples: `name: "Ceviche"`, `price: 45000`, `quantity: 2`, `assignedTo: ["p1", "p2"]`
- Pattern: Flat structure, IDs are string UUIDs (generated with `Date.now()`), assignedTo is list of person IDs

**Person:**
- Purpose: Bill participant with generated avatar
- Examples: `{ id, name, color }`
- Pattern: Color assigned from PERSON_COLORS palette (20 options, cycles by index)

**PersonSplit:**
- Purpose: Calculated breakdown of costs for one person
- Examples: `{ person, subtotal, tax, tip, total, items: [] }`
- Pattern: Derived from state (not stored), computed by useBillSplit

**Haptic Feedback:**
- Purpose: Subtle vibration on user actions
- Pattern: `useHaptic()` returns function `haptic()` or `haptic([50, 30, 50])` (pattern array)

## Entry Points

**Frontend Entry:**
- Location: `src/main.tsx`
- Triggers: App initialization (when user visits https://split-pay-ochre.vercel.app)
- Responsibilities:
  1. Wrap App in BillProvider
  2. Mount to #root div
  3. Load theme.css (color system)

**Component Entry (Step dispatcher):**
- Location: `src/App.tsx:10` (StepContent function)
- Triggers: On every render when state.step changes
- Responsibilities: Switch on step number, render correct Step component

**Step1Entry (Scan entry point):**
- Location: `src/components/steps/Step1Entry.tsx`
- Triggers: App mounts or user goes back to step 1
- Responsibilities: Handle camera input, call OCR, show preview

**Worker Entry (Cloudflare):**
- Location: `worker/index.js:18` (fetch handler)
- Triggers: POST request to /scan endpoint
- Responsibilities: Proxy OCR, security checks, rate limiting

## Architectural Constraints

- **Threading:** Single-threaded event loop (browser). Worker is also single-threaded (Cloudflare runtime).
- **Global state:** BillContext is the only global store. No localStorage or cookies (state in memory only).
- **Circular imports:** None detected. Layers are strictly separated (components → hooks → utils).
- **Image size limit:** Frontend: client-side resize to 1200px max. Backend: reject base64 > 8MB (line 62-65 worker/index.js).
- **OCR timeout:** 25 seconds (AbortController). Responds 504 if exceeded.
- **Rate limiting:** Memory Map per IP, 20 requests per hour. Falls back to KV if available. No persistence between Worker deployments.
- **Mobile-first:** Designed for 375-430px width (viewport). Desktop still works but not optimized.
- **Offline capability:** 100% offline except Step1 OCR (requires network to call Worker).
- **Browser APIs required:** `navigator.vibrate` (haptics), File API (camera/dropzone), navigator.share (Step6 WhatsApp).

## Anti-Patterns

### Global Image in BillState After Step1

**What happens:** Originally, `originalImage` (base64) was stored in BillState without being cleared.
**Why it's wrong:** Images consume memory (~6MB uncompressed). Persisting it causes memory leaks if user navigates back to Step1 or restarts app.
**Do this instead:** Clear `originalImage` when leaving Step1. Current code does this correctly in `BillContext.tsx:49` — when SET_STEP action fires with step > 1, originalImage is set to undefined.

### Hardcoded Tailwind Colors in Components

**What happens:** Colors were originally hex codes inline in JSX (e.g., `style={{ color: '#f5c542' }}`).
**Why it's wrong:** Changing the design system requires updating dozens of files. CSS variables can't be used in Tailwind classes without tokens.
**Do this instead:** All colors via CSS variables from `theme.css` (single source of truth). Use inline `style={{ color: 'var(--color-gold)' }}` or Tailwind tokens (brand-gold) defined in tailwind.config.js.

### Type-safety Bypassed with `any`

**What happens:** Temptation to use `any` for API responses or complex nested state updates.
**Why it's wrong:** Loses type safety, makes refactoring risky, hidden runtime errors.
**Do this instead:** Define interfaces (ScanResult, PersonSplit, etc. in `src/types/bill.ts`). Validate response shape before using.

## Error Handling

**Strategy:** Fail gracefully with user-friendly messages + fallback actions

**Patterns:**

1. **OCR Failure** (`Step1Entry.tsx:87`)
   - Show ErrorMessage component with fallback button: "Ingresar manualmente"
   - User can retry or switch to manual entry
   - Common causes: blurry photo, non-restaurant bill, network timeout

2. **Invalid Input** (Step2-5)
   - Form validation before dispatch (e.g., ItemForm checks name.length > 0 && price > 0)
   - No dispatch if invalid; button disabled
   - Visual feedback (error text inline, red border)

3. **Network Errors** (Worker timeout, CORS block)
   - Worker returns 504 if Claude API timeout
   - Worker returns 403 if origin not in whitelist
   - Frontend shows error message: "No se pudo procesar. Intenta de nuevo."
   - No retry UI (user must restart)

4. **Type Errors**
   - TypeScript compilation catches most at build time
   - Runtime: guard with `typeof`, `Array.isArray()`, null checks

## Cross-Cutting Concerns

**Logging:** Console only (no external service). Dev: `console.log()` for debugging. Prod: Minimal logging (only errors in Worker).

**Validation:**
- Frontend: Light validation (empty string, negative price, no items assigned)
- Backend: Heavy validation in Worker (item name ≤200 chars, price >= 0, quantity 1-99)

**Authentication:** None. App is public (no login). Worker uses API key in env var (hidden from client).

**Internationalization:** Spanish (Colombian) only. All UI text hardcoded, no i18n library.

---

*Architecture analysis: 2026-08-25*
