# Codebase Concerns

**Analysis Date:** 2026-08-25

## Test Coverage Gaps

**Missing Unit Tests:**
- What's not tested: All calculation logic (`src/utils/calculations.ts`), OCR integration (`src/hooks/useBillScanner.ts`), and state management (`src/context/BillContext.tsx`)
- Files: `src/utils/calculations.ts`, `src/hooks/useBillScanner.ts`, `src/context/BillContext.tsx`
- Risk: Critical financial app without tests. A calculation bug (tax/tip rounding) could persist undetected. Refactoring calculations becomes dangerous.
- Priority: High
- Fix approach: Set up React Testing Library + Vitest. Start with calculation unit tests, then integration tests for reducer logic, then component snapshot tests.

**Missing Component Tests:**
- What's not tested: React component rendering, user interactions (clicks, form inputs), animation behavior
- Files: All files in `src/components/`
- Risk: UI regressions silent. Form validation bugs not caught until manual testing. Accessibility issues not detected.
- Priority: High (after unit tests)
- Fix approach: Add React Testing Library setup to vitest.config.ts, create `.test.tsx` files for each component, focus on user workflows (drag-drop, form submission, step navigation).

**No E2E Tests:**
- What's missing: End-to-end flow testing (Steps 1-6, OCR integration, result sharing)
- Risk: Full workflow regressions only discovered in production. Browser API changes break quietly.
- Priority: Medium (after unit + component tests)
- Fix approach: Consider Playwright or Cypress for critical user journeys.

## Calculation & Rounding Issues

**PersonSplit Rounding Discrepancy:**
- Issue: `calculateSplit()` in `src/utils/calculations.ts` returns `PersonSplit` objects with unrounded individual values. `useBillSplit()` in `src/hooks/useBillSplit.ts` rounds only the grand `total`. Individual person amounts may not sum to the rounded total.
- Files: `src/utils/calculations.ts:42-81`, `src/hooks/useBillSplit.ts:13-25`
- Cause: Line 74 in calculations.ts returns `personTip: tip * proportion` without rounding; personSubtotal and personTax also unrounded.
- Impact: Step6Result displays unrounded person totals. If total is $10,100 but splits are $5,049 + $5,049 = $10,098, a $2 discrepancy appears.
- Fix approach: Round `personSubtotal`, `personTax`, and `personTip` in `calculateSplit()` using `roundToNearest100()`. Test that sum of person totals equals grand total.

**Floating-Point Precision in Item Division:**
- Issue: Line 56 in calculations.ts: `const sharePerPerson = (item.price * item.quantity) / item.assignedTo.length` produces float. Multiple divisions can accumulate rounding errors.
- Files: `src/utils/calculations.ts:56`
- Risk: If 3 people share an $11,111 item, each gets $3,703.67 (not stored). Summing produces $11,110.01, off by $0.01.
- Fix approach: Apply `roundToNearest100()` per share, document why, add test case for 3-way splits.

**Tip Calculation on Pre-Tax Base:**
- Issue: Line 36-39 in calculations.ts: when `taxIncluded=true`, tip base is `subtotal / (1 + taxPercent/100)`. Floating-point division. Line 39 applies `roundUpTo100()` on result.
- Files: `src/utils/calculations.ts:36-39`
- Risk: If subtotal is $10,000, 8% IVA, tip is 10%: base = $10,000/(1.08) = $9,259.26 → 10% = $925.93 → rounded up = $1,000. Correct. But edge cases (very small bills) may round unexpectedly.
- Fix approach: Add test cases for tip calculation at boundaries ($100, $1,000, $10,000 with various tax rates). Document rounding direction.

## Browser API Compatibility & Fallbacks

**Clipboard API Not Available on HTTP:**
- Issue: `navigator.clipboard.writeText()` in `src/components/steps/Step6Result.tsx:190` fails on HTTP (only works HTTPS). Also silently fails in some browsers.
- Files: `src/components/steps/Step6Result.tsx:189-195`
- Risk: If Web Share API unavailable and clipboard fails silently, user cannot share result. No error feedback.
- Fix approach: Wrap in try-catch with more granular error message. If clipboard fails, show fallback: open WhatsApp with pre-filled text or copy-to-clipboard instruction.

**Vibration API Inconsistent Support:**
- Issue: `navigator.vibrate` in `src/hooks/useHaptic.ts` not supported on all devices (iOS, desktop, some Androids). No feature detection.
- Files: `src/hooks/useHaptic.ts`
- Risk: Silent failure (no haptic). Users on unsupported devices get no feedback. Not necessarily a bug, but UX degrades silently.
- Fix approach: Add feature detection; return early if not supported. Consider adding visual feedback (flash, animation) as fallback.

**Web Share API Fallback Weak:**
- Issue: `navigator.share()` in `src/components/steps/Step6Result.tsx:181-187` wrapped in try-catch, but fallback only copies to clipboard. No feedback if share fails for other reasons.
- Files: `src/components/steps/Step6Result.tsx:179-196`
- Risk: User taps "Compartir", nothing visible happens, assumes failure. Share might have worked but app doesn't confirm.
- Fix approach: Add toast/feedback when share succeeds or fails. Show which method was used (Share API vs Clipboard).

## Performance & Memory Issues

**Large Components Without Code Splitting:**
- Issue: `Step2Review.tsx` (292 lines), `Step6Result.tsx` (267 lines), `Step5TaxTip.tsx` (224 lines) are monolithic. ItemCard and PersonCard are nested subcomponents, not separated.
- Files: `src/components/steps/Step2Review.tsx`, `src/components/steps/Step6Result.tsx`, `src/components/steps/Step5TaxTip.tsx`
- Impact: Larger bundle size. If either component re-renders, all nested elements re-render (ItemCard, PersonCard). No component isolation.
- Fix approach: Extract `ItemCard` to `src/components/ui/ItemCard.tsx`, extract `PersonCard` to `src/components/ui/PersonCard.tsx`. Memoize with `React.memo()` to prevent unnecessary re-renders.

**Image Processing on Main Thread:**
- Issue: `fileToBase64()` in `src/hooks/useBillScanner.ts:43-77` creates Image and Canvas on main thread. Large images (4MB) cause UI thread blocking during resize.
- Files: `src/hooks/useBillScanner.ts:43-77`
- Risk: App freezes while processing photo. On low-end devices, noticeable lag.
- Fix approach: Offload to Web Worker if large file (>2MB). Or reduce `MAX_DIMENSION` from 1200 to 800 to reduce processing time.

**Unrevoked Blob URLs in Memory:**
- Issue: Step1Entry creates `URL.createObjectURL()` for preview. While cleanup exists (line 18-24), if user navigates away or app crashes before cleanup, blob leaks memory.
- Files: `src/components/steps/Step1Entry.tsx:29, 66-68`
- Impact: Repeated photo uploads could leak memory on some browsers.
- Fix approach: Add AbortController-like mechanism. Store blob URL in ref and revoke on unmount + state change. Already partially done; ensure all paths revoke.

**No Pagination/Virtualization for Large Item Lists:**
- Issue: Step2Review and Step4Assign render all items in a scrollable div. If user adds 100+ items, all render.
- Files: `src/components/steps/Step2Review.tsx:249-256`, `src/components/steps/Step4Assign.tsx:52-87`
- Risk: Unlikely in normal use, but performance degrades with large invoices.
- Fix approach: Add virtualization (react-window) if list > 20 items. Or warn user if > 50 items.

## State Management Issues

**In-Memory State Only:**
- Issue: All state in `src/context/BillContext.tsx` is ephemeral (useReducer). No localStorage or IndexedDB. Closing tab = data loss.
- Files: `src/context/BillContext.tsx`, `src/App.tsx`
- Risk: User fills out Steps 1-5, app crashes/browser closes, user loses all work.
- Impact: High frustration for long invoices (10+ items, multiple people).
- Fix approach: Save state to localStorage or IndexedDB after each dispatch. Hydrate on app load. Add "Your data was restored" toast.

**No Undo/Redo:**
- Issue: State commits are final. Delete an item → no way to undo except manual re-entry.
- Files: `src/context/BillContext.tsx` dispatch handlers
- Risk: Accidental deletions frustrating. No way to revert to previous bill state.
- Fix approach: Implement undo/redo stack in reducer. Or add "Undo" button at app level. Low priority unless users report frequent mistakes.

**Missing Validation on Person Names:**
- Issue: Step3People accepts any string for person name. No validation for length, special characters, or duplicates.
- Files: `src/components/steps/Step3People.tsx:15`
- Risk: Very long names break layout. Emoji names work but may cause OCR issues later if exported. Duplicate names confusing.
- Fix approach: Add validation: max 50 chars, alphanumeric + spaces, no duplicates (warn if same name added twice).

## Accessibility Issues

**Missing ARIA Labels on Icon Buttons:**
- Issue: Many emoji buttons lack `aria-label`. Examples: "✏️" edit button (Step2Review:73), "🗑️" delete (Step2Review:81), "🔄" retake photo (Step1Entry:182).
- Files: `src/components/steps/Step2Review.tsx`, `src/components/steps/Step1Entry.tsx`, `src/components/steps/Step6Result.tsx`
- Risk: Screen reader users cannot understand button purpose.
- Fix approach: Add `aria-label="Editar ítem"` to every emoji button. Consider alt text for complex icons.

**Semantic HTML Missing:**
- Issue: Step components use `<div>` + `<button>` for everything. No `<nav>`, `<form>`, `<section>` tags.
- Files: All step components
- Risk: Screen readers lose semantic structure. Navigation flow unclear.
- Fix approach: Wrap forms in `<form>`, sections in `<section>`, update Stepper to use `<nav>`. Lower priority but improves a11y.

## Security Concerns

**CSP Header Allows Unsafe-Inline:**
- Issue: `vercel.json` line 12 sets `script-src 'self' 'unsafe-inline'`. Weakens XSS protection.
- Files: `vercel.json:12`
- Risk: If any DOM-based XSS exists, 'unsafe-inline' makes exploitation easier.
- Fix approach: Remove 'unsafe-inline' if possible. Use nonce-based CSP for any inline scripts. Currently safe if no inline <script> tags in HTML, but leaves door open.

**Rate Limiting in Worker Relies on Memory Map:**
- Issue: `worker/index.js:14-15, 267-277` uses in-memory Map for rate limiting if Cloudflare KV unavailable. Map is per-worker instance, resets on redeploy or timeout.
- Files: `worker/index.js:14-15, 267-277`
- Risk: Rate limiting ineffective between worker restarts. Attacker can DOS during worker restart window.
- Impact: Low for now (low-traffic app), but should migrate to KV.
- Fix approach: Require `RATE_LIMIT_KV` binding in `wrangler.toml`. Document setup. Add monitoring for rate limit hits.

**No Input Validation on OCR Results:**
- Issue: OCR returns items with `name`, `price`, `quantity`. Worker sanitizes (lines 156-164), but frontend `scanBill()` hook doesn't validate response schema before parsing.
- Files: `src/hooks/useBillScanner.ts:25-35`
- Risk: If worker response is malformed, `data.items.map()` could throw or create invalid items.
- Fix approach: Add Zod schema validation. Parse response safely, throw descriptive error if invalid.

**VITE_WORKER_URL Exposed in Frontend Code:**
- Issue: Worker URL is in `useBillScanner.ts:3` from `import.meta.env`. If frontend is reverse-engineered, attacker knows worker endpoint.
- Files: `src/hooks/useBillScanner.ts:3`
- Risk: Low (worker already public), but combined with rate limit bypass, could enable DOS.
- Fix approach: No immediate fix needed, but document that worker endpoint should not contain secrets.

## Fragile Areas

**OCR Prompt String Magic:**
- Issue: Claude OCR prompt in `worker/index.js:71-74` is hardcoded. If changed, behavior differs silently. No versioning.
- Files: `worker/index.js:71-74`
- Risk: If someone updates prompt without testing, OCR quality drops or response format changes, breaking parsing.
- Fix approach: Move prompt to env var or separate file. Add prompt version in response for debugging.

**Calculation Logic Interdependencies:**
- Issue: `calculateTax()`, `calculateTip()`, `calculateSplit()` are tightly coupled. Changing one affects others.
- Files: `src/utils/calculations.ts`
- Risk: Refactoring one function is risky without full test coverage.
- Fix approach: Add comprehensive unit tests for all combinations (taxIncluded true/false, tipType percent/fixed, multiple people/items).

**Canvas Image Resize Edge Cases:**
- Issue: `fileToBase64()` assumes Image onload triggers. On some broken files, onload might never fire.
- Files: `src/hooks/useBillScanner.ts:48`
- Risk: User selects bad image, promise never resolves, UI hangs in loading state forever.
- Fix approach: Add timeout (e.g., 10s). Reject promise if timeout. Show error message.

**Person ID Generation Using Date.now():**
- Issue: `Step3People:21` uses `person-${Date.now()}` for ID. If two people added in same millisecond, collision.
- Files: `src/components/steps/Step3People.tsx:21`
- Risk: Extremely low (millisecond precision), but theoretically possible in rapid clicks. Could cause assignment bugs.
- Fix approach: Use `crypto.randomUUID()` or increment counter. Or use `Date.now()` + random suffix.

**Stepper Progress Bar Hidden on Step 6:**
- Issue: App.tsx line 28 hides Stepper on step 6. User cannot see progress, feels disconnected.
- Files: `src/App.tsx:28`
- Risk: Low, but UX could be improved.
- Fix approach: Show Stepper on step 6 as well, or show completion badge.

## Missing Critical Features

**No Receipt History:**
- What's missing: App doesn't save past bills. User must re-enter data each time.
- Blocks: Power user workflows (track spending, compare bills).
- Workaround: Users manually screenshot or copy result.
- Priority: Low (MVP feature not required, but valuable for future).

**No Currency Conversion:**
- What's missing: App hardcoded to COP. No support for other currencies.
- Blocks: International use.
- Impact: Limits market to Colombia only.
- Fix approach: Add currency selector. Use exchange rates API. Store rates in localStorage to cache.

**No Dark/Light Mode Toggle:**
- What's missing: CLAUDE.md says "App always in mode oscuro (class="dark" fijo)". No toggle.
- Blocks: Users who prefer light mode.
- Impact: Accessibility issue for some users, but intentional per spec.
- Fix approach: Already by design; no change needed.

**No Custom Tip Percentage Presets:**
- What's missing: Step5TaxTip requires manual entry. No quick "10%, 15%, 20%" buttons.
- Blocks: Fast checkout flow.
- Impact: Minor UX friction.
- Fix approach: Add quick-select buttons (10%, 15%, 20%, Other).

## Known Bugs & Workarounds

**Image Preview Memory Cleanup:**
- Symptoms: If user uploads many large photos without navigating away, memory usage grows.
- Files: `src/components/steps/Step1Entry.tsx:18-24`
- Workaround: Navigate to another step or close tab to trigger cleanup.
- Root cause: While blob URLs are revoked on preview change, multiple simultaneous previews could leak.

**App Share Button Silent Failure:**
- Symptoms: Tapping "Compartir resultado" in Step6 does nothing (no visible error, no share sheet).
- Files: `src/components/steps/Step6Result.tsx:179-196`
- Trigger: On browsers without Web Share API + clipboard API blocked (e.g., sandboxed iframe).
- Workaround: Try again, or manually copy from WhatsApp button per-person shares.
- Root cause: Promise rejection not surfaced to user.

**Very Large Item Prices Overflow UI:**
- Symptoms: Price like $9,999,999 breaks card layout in Step6 result.
- Files: `src/components/steps/Step6Result.tsx:72` (text-2xl font may overflow)
- Trigger: OCR misreads price, or manual entry of very large number.
- Workaround: Edit item in Step2 to correct price.
- Root cause: No max-width or text truncation on price display.

## Dependencies at Risk

**framer-motion Major Version Updates:**
- Risk: Next major release (v13+) may have breaking changes to AnimatePresence or layout animations.
- Current: v12.35.2
- Impact: All animations (Step transitions, ItemCard expand, Person card stagger) could break.
- Migration plan: Pin version, monitor releases. When updating, test all animated flows.

**React Dropzone Maintenance:**
- Risk: Low activity. May not support future React versions.
- Current: v15.0.0
- Alternative: React Spring or custom drag-drop.
- Action: Monitor GitHub. If unmaintained > 1 year, consider replacing.

**@dicebear/core for Avatar Generation:**
- Risk: Avatar API could change. Seed-based generation could become inconsistent.
- Current: v9.4.0
- Impact: User avatars might change appearance on library update (visual regression, confusing).
- Fix approach: Lock version. Test avatar generation after any package update. Consider generating avatars server-side if consistency critical.

## Deploy & Build Issues

**Missing Typecheck in Build Pipeline:**
- Issue: `vite build` does not run TypeScript check. Separate `npm run typecheck` required.
- Files: `package.json:8` (build script), `package.json:9` (typecheck script)
- Risk: TypeScript errors slip into production build. CI/CD may not catch if typecheck not in pipeline.
- Fix approach: Modify build script: `"build": "tsc --noEmit && vite build"`. Or add pre-commit hook to enforce typecheck.

**No Environment Variable Validation:**
- Issue: If `VITE_WORKER_URL` not set, app loads but OCR fails silently with "no env var" error.
- Files: `src/hooks/useBillScanner.ts:10-12`
- Risk: Developer deploy without .env.production, users see cryptic error.
- Fix approach: Validate all required env vars at app startup. Show error page if missing.

**PWA Build Artifacts Not Tested:**
- Issue: `vite-plugin-pwa` generates service worker, but no e2e test verifies offline functionality.
- Files: `vite.config.ts:8-31`
- Risk: Service worker could have bugs. Cache invalidation could fail silently.
- Fix approach: Add e2e test: load app, go offline, verify cached pages load.

**Cloudflare Worker Deployment Manual:**
- Issue: Worker deployed with `npx wrangler deploy`. No CI/CD automation. ANTHROPIC_API_KEY secret set manually.
- Files: `worker/index.js`
- Risk: Secret could be exposed via logs. Manual deploys error-prone.
- Fix approach: Add GitHub Actions or similar. Use Cloudflare API for secret management. Document deploy checklist.

## Recommended Priorities

### Immediate (before public launch):
1. Add unit tests for `src/utils/calculations.ts` — financial correctness critical.
2. Fix rounding discrepancy in PersonSplit.
3. Add error handling + user feedback for clipboard/share API failures.
4. Run TypeScript check in build script.

### Soon (next 1-2 weeks):
1. Add component tests for core workflows (Step1-6, OCR integration).
2. Implement localStorage persistence for bill state.
3. Extract ItemCard and PersonCard to separate files + memoize.
4. Add ARIA labels to all icon buttons.

### Medium term (next month):
1. Migrate worker rate limiting from memory Map to Cloudflare KV.
2. Add receipt history / bill storage.
3. Support currency selection and conversion.
4. Add tap-to-select tip percentages (10%, 15%, 20%).
5. E2E test suite with Playwright.

---

*Concerns audit: 2026-08-25*
