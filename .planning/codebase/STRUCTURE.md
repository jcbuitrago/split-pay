# Codebase Structure

**Analysis Date:** 2026-08-25

## Directory Layout

```
split-pay/
├── src/                              # Frontend source code
│   ├── components/
│   │   ├── steps/                   # Multi-step flow components
│   │   │   ├── Step1Entry.tsx       # Scan/manual entry
│   │   │   ├── Step2Review.tsx      # Item list review
│   │   │   ├── Step3People.tsx      # Add people
│   │   │   ├── Step4Assign.tsx      # Assign items to people
│   │   │   ├── Step5TaxTip.tsx      # Configure tax & tip
│   │   │   └── Step6Result.tsx      # Final split breakdown
│   │   └── ui/                      # Reusable UI components
│   │       ├── PersonAvatar.tsx     # DiceBear avatar
│   │       ├── PersonChips.tsx      # Avatar list
│   │       ├── ItemForm.tsx         # Item editor
│   │       ├── Stepper.tsx          # Progress bar
│   │       ├── StepFooter.tsx       # Shared navigation
│   │       └── ErrorMessage.tsx     # Error display
│   ├── context/
│   │   └── BillContext.tsx          # State + reducer + provider
│   ├── hooks/
│   │   ├── useBillScanner.ts        # OCR (calls Worker)
│   │   ├── useBillSplit.ts          # Calculation orchestrator
│   │   └── useHaptic.ts             # Vibration feedback
│   ├── types/
│   │   └── bill.ts                  # TypeScript interfaces
│   ├── utils/
│   │   ├── calculations.ts          # Pure calculation logic
│   │   └── formatCurrency.ts        # Format COP currency
│   ├── App.tsx                      # Main app component
│   ├── main.tsx                     # React entry point
│   ├── index.css                    # Global styles
│   ├── theme.css                    # Color system (SINGLE SOURCE OF TRUTH)
│   └── vite-env.d.ts                # Vite type defs
├── worker/                          # Cloudflare Worker (OCR proxy)
│   ├── index.js                     # Worker fetch handler
│   └── wrangler.toml                # Cloudflare config
├── public/
│   └── icons/
│       └── icon.svg                 # PWA icon
├── docs/                            # Design & specification docs
│   ├── ARCHITECTURE.md
│   ├── DESIGN_SPEC.md
│   ├── LOGIC_SPEC.md
│   ├── CODE_STYLE_SPEC.md
│   └── ...
├── .planning/
│   └── codebase/                    # Codebase maps (generated)
│       ├── ARCHITECTURE.md
│       └── STRUCTURE.md
├── package.json                     # npm dependencies
├── package-lock.json
├── tsconfig.json                    # TypeScript config
├── tsconfig.node.json               # TypeScript config (build tools)
├── vite.config.ts                   # Vite bundler config
├── vitest.config.ts                 # Test runner config
├── tailwind.config.js               # Tailwind CSS config
├── postcss.config.js                # PostCSS config
├── vercel.json                      # Vercel deployment config
├── index.html                       # HTML entry point
├── CLAUDE.md                        # Project instructions (in repo)
└── README.md

```

## Directory Purposes

**`src/components/steps/`:**
- Purpose: Step-by-step flow screens (linear 6-step wizard)
- Contains: Step1Entry.tsx through Step6Result.tsx
- Each file: One step, exports default component, imports useBill() + hooks
- Pattern: Each step handles its own local state (editing, preview) + calls dispatch via useBill()

**`src/components/ui/`:**
- Purpose: Reusable UI building blocks shared across steps
- Contains: PersonAvatar, PersonChips, ItemForm, Stepper, StepFooter, ErrorMessage
- Pattern: Presentational components, accept props for data & callbacks, no dispatch calls

**`src/context/`:**
- Purpose: Global state management
- Contains: BillContext.tsx (useReducer, BillProvider, useBill hook)
- Pattern: Context provider wraps App, all components use useBill() hook

**`src/hooks/`:**
- Purpose: Reusable logic (custom hooks)
- Contains: useBillScanner (OCR fetch), useBillSplit (calculations), useHaptic (vibration)
- Pattern: Pure functions or hooks that call other hooks/utilities, no JSX

**`src/types/`:**
- Purpose: TypeScript interface definitions
- Contains: bill.ts with BillItem, Person, BillState, PersonSplit, PERSON_COLORS
- Pattern: No implementation, only types and constants

**`src/utils/`:**
- Purpose: Pure utility functions and formatters
- Contains: calculations.ts (math), formatCurrency.ts (COP formatting)
- Pattern: No hooks, no side effects, pure functions

**`worker/`:**
- Purpose: Cloudflare Worker (serverless proxy)
- Contains: index.js (fetch handler), wrangler.toml (config)
- Pattern: Deployed separately via `wrangler deploy`
- Role: OCR gateway, CORS shield, rate limiting, API key protection

**`public/`:**
- Purpose: Static assets served directly
- Contains: SVG icon for PWA manifest
- Not committed: Images/photos generated at runtime

**`docs/`:**
- Purpose: Specifications and design documents
- Contains: Architecture, design spec, logic, code style
- Exists: For human reference, not used by code

**`.planning/codebase/`:**
- Purpose: Generated codebase maps (used by GSD tools)
- Contains: ARCHITECTURE.md, STRUCTURE.md (this file)
- Generated by: `/gsd-map-codebase` command

## Key File Locations

**Entry Points:**
- `src/main.tsx` — React app initialization, BillProvider wrapper
- `src/App.tsx` — Step dispatcher (renders Step1-6 based on state.step)
- `index.html` — HTML shell with `<div id="root">`
- `worker/index.js` — Cloudflare Worker fetch handler

**Configuration:**
- `vite.config.ts` — Vite bundler (React plugin, PWA plugin)
- `tailwind.config.js` — Tailwind CSS (extends brand colors from theme.css)
- `tsconfig.json` — TypeScript strict mode on
- `vercel.json` — Vercel deployment (Next.js-like but uses Vite)
- `wrangler.toml` — Cloudflare Worker project config
- `.env` (local only) — VITE_WORKER_URL for dev

**Core Logic:**
- `src/context/BillContext.tsx` — Global state machine (useReducer)
- `src/utils/calculations.ts` — All math (tax, tip, split, rounding)
- `src/hooks/useBillSplit.ts` — Orchestrates calculations
- `src/types/bill.ts` — Type definitions (single source of truth for data shape)

**Theme/Styling:**
- `src/theme.css` — **SINGLE SOURCE OF TRUTH** for color palette
- `src/index.css` — Global Tailwind @import and resets
- `tailwind.config.js` — Extends Tailwind with brand tokens

**Testing:**
- `vitest.config.ts` — Vitest test runner (no test files present yet)

## Naming Conventions

**Files:**
- React components: `CamelCase.tsx` (e.g., `Step1Entry.tsx`, `PersonAvatar.tsx`)
- Utilities/hooks: `camelCase.ts` (e.g., `useBillScanner.ts`, `calculations.ts`)
- Config files: lowercase with dots (e.g., `vite.config.ts`, `tailwind.config.js`)
- Constants/types: `lowercase.ts` or exported from CamelCase (e.g., PERSON_COLORS in `bill.ts`)

**Directories:**
- Feature folders: lowercase plural (e.g., `components`, `hooks`, `types`, `utils`)
- Logical groupings: lowercase (e.g., `steps`, `ui`, `context`)

**TypeScript/React:**
- Component props: `CamelCaseProps` interface (e.g., `PersonAvatarProps`)
- State slices: `CamelCase` (e.g., `BillItem`, `Person`, `BillState`)
- Functions: `camelCase` or `useHookName` for hooks (e.g., `calculateTax()`, `useBillSplit()`)
- Constants: `SCREAMING_SNAKE_CASE` for arrays/lookups (e.g., `PERSON_COLORS`, `MAX_REQUESTS_PER_HOUR`)
- CSS variables: `--color-name`, `--glow-name`, `--gradient-name` (kebab-case, semantic)

**IDs/Keys:**
- Unique IDs: Generated with `Date.now()` + index (e.g., `scanned-1234567-0`)
- Person IDs: Same pattern, UUID-style strings
- React keys: Always `id` from BillItem or Person object

## Where to Add New Code

**New Step (Step7, Step8):**
- Create: `src/components/steps/Step7Name.tsx`
- Import: In `App.tsx`, add case in StepContent switch
- State: Add step 7 type to BillState: `step: 1 | 2 | 3 | 4 | 5 | 6 | 7`
- Pattern: Follow Step1-6 (use useBill(), call dispatch, call nextStep())

**New UI Component:**
- Create: `src/components/ui/MyComponent.tsx`
- Pattern: Export default component, accept props (data + callbacks), no dispatch
- Example: PersonAvatar takes `{ name, size, assigned, onToggle }`

**New Calculation Logic:**
- Add to: `src/utils/calculations.ts`
- Pattern: Pure function, take params, return number (no state dependency)
- Example: If adding rounding options, add `roundToNearest25()`, export from calculations.ts

**New Utility/Formatter:**
- Create: `src/utils/newUtility.ts`
- Pattern: Export named functions
- Example: For new export format, add `exportToCSV()` alongside `formatCOP()`

**New API Integration:**
- Create: `src/hooks/useNewAPI.ts`
- Pattern: Follow useBillScanner (fetch call, error handling, return typed result)
- Backend call: If calling external API, route through Cloudflare Worker (never direct from frontend)

**New Global State (beyond Bill):**
- Extend: `src/context/BillContext.tsx`
- Pattern: Add to BillState interface, add action types, handle in reducer
- Example: Adding `userPreferences` → add to BillState, add SET_PREFERENCES action

**New Test Suite:**
- Create: `src/__tests__/moduleName.test.ts`
- Runner: `vitest run` or `vitest --watch`
- Pattern: Import function, test with expect()
- Focus: Utilities (calculations.ts) before components

**New Environment Variable:**
- Add to: `.env.local` (development), Vercel dashboard (production)
- Pattern: `VITE_*` prefix for frontend (accessible at build time)
- Backend: Use Cloudflare dashboard (wrangler secret put ANTHROPIC_API_KEY)

## Special Directories

**`node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: `npm install`
- Committed: No (.gitignore)
- Cleanup: `npm ci` (uses package-lock.json for exact versions)

**`dist/`:**
- Purpose: Build output from Vite
- Generated: `npm run build`
- Committed: No (.gitignore)
- Deployed to: Vercel (points to dist/ as web root)

**`.git/`:**
- Purpose: Git repository metadata
- Committed: Yes (only .git/ dir, not contents)
- Cleanup: Never delete

**`public/`:**
- Purpose: Static assets (PWA icon, favicon)
- Committed: Yes (files in here)
- Deployment: Copied to dist/ root during build

**`docs/`:**
- Purpose: Human-readable specifications
- Committed: Yes
- Built: No (markdown only, for reference)

**`.planning/codebase/`:**
- Purpose: GSD tool outputs (auto-generated by `/gsd-map-codebase`)
- Committed: Yes (part of project history)
- Regenerate: Run `/gsd-map-codebase --focus arch` to refresh

---

*Structure analysis: 2026-08-25*
