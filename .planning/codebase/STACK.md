# Technology Stack

**Analysis Date:** 2026-08-25

## Languages

**Primary:**
- TypeScript 5.6.2 - Frontend application and configuration files (`src/**/*.ts`, `src/**/*.tsx`, `*.config.ts`)
- JavaScript (ES2020 target) - Cloudflare Worker runtime (`worker/index.js`)

**Secondary:**
- HTML5 - Application shell (`index.html`)
- CSS3 - Styling via Tailwind CSS and custom theme system (`src/theme.css`)

## Runtime

**Environment:**
- Node.js (implied by package.json type: "module", using ES modules)
- Browser runtime - React 18.3.1 running in modern browsers with ES2020 support
- Cloudflare Workers runtime - JavaScript/WebAssembly runtime for Cloudflare platform

**Package Manager:**
- npm - Primary package manager
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.3.1 - UI framework for frontend application (`src/`)
- Vite 8.0.16 - Build tool and dev server

**Styling:**
- Tailwind CSS 3.4.14 - Utility-first CSS framework (`tailwind.config.js`, `src/**/*.tsx`)
- PostCSS 8.4.47 - CSS transformation pipeline (`postcss.config.js`)
- Autoprefixer 10.4.20 - Vendor prefix insertion for CSS

**Animation & Interaction:**
- framer-motion 12.35.2 - React animation library for transitions, stagger effects, and gestures (`src/components/**/*.tsx`)
- react-dropzone 15.0.0 - Drag & drop file input component (`src/components/steps/Step1Entry.tsx`)

**PWA & Installation:**
- vite-plugin-pwa 1.3.0 - PWA installation and offline support via service workers (`vite.config.ts`)

**Avatar Generation:**
- @dicebear/core 9.4.0 - Avatar generation library
- @dicebear/collection 9.4.0 - Avatar style collection (funEmoji style used) (`src/components/ui/PersonAvatar.tsx`)

**Testing:**
- Vitest 4.1.11 - Unit test runner and assertion library (`vitest.config.ts`)
- Environment: Node.js (currently testing pure functions only; component testing requires jsdom + @testing-library/react)

**Build/Dev:**
- @vitejs/plugin-react 6.0.2 - React JSX transformation for Vite
- TypeScript 5.6.2 - Type checking compiler

## Key Dependencies

**Critical:**
- React 18.3.1 - Core UI rendering engine; state management through Context API
- Vite 8.0.16 - Fast dev server and production bundler; reduces build time vs Webpack
- Tailwind CSS 3.4.14 - Reduces custom CSS; all design tokens centralized in `src/theme.css`

**Infrastructure:**
- framer-motion 12.35.2 - Smooth step transitions and interactive animations (required for UX specification)
- @dicebear/core + @dicebear/collection 9.4.0 - Local avatar generation (no external API calls)
- react-dropzone 15.0.0 - File upload and camera input handling
- vite-plugin-pwa 1.3.0 - Service worker generation for offline PWA functionality

## Configuration

**Environment:**
- Frontend: `.env` file with `VITE_WORKER_URL` variable (not committed; example: `VITE_WORKER_URL=https://splitbill-worker.jcbuitrago99.workers.dev`)
- Worker: Environment secrets configured via Cloudflare dashboard or CLI:
  - `ANTHROPIC_API_KEY` - Anthropic API authentication key
  - `ALLOWED_ORIGIN` - Comma-separated list of allowed frontend origins (e.g., `https://split-pay-ochre.vercel.app,http://localhost:5173`)

**Build:**
- `vite.config.ts` - Vite build configuration including PWA plugin and React plugin
- `vitest.config.ts` - Test runner configuration (Node environment, pattern-based include)
- `tailwind.config.js` - Tailwind CSS configuration with custom brand color tokens (bg, surface, darkest, gold, rose, etc.)
- `postcss.config.js` - PostCSS plugins configuration (Tailwind + Autoprefixer)
- `tsconfig.json` - TypeScript compilation settings (ES2020 target, JSX react-jsx)
- `worker/wrangler.toml` - Cloudflare Workers configuration (name, main entry, compatibility date)

## Platform Requirements

**Development:**
- Node.js (version not pinned; npm 10+ recommended)
- Modern web browser with WebGL support (for avatar rendering)
- Camera access for mobile devices (Step1 image capture)
- Cloudflare account for Worker deployment

**Production:**
- Frontend: Vercel hosting (`vercel.json` configured; outputs to `dist/` directory)
- Worker: Cloudflare Workers platform (deployed via `npx wrangler deploy`)
- External API: Anthropic Claude Vision API (claude-haiku-4-5 model via HTTPS)
- CDN: Vercel's global CDN for frontend, Cloudflare CDN for Worker
- DNS: None required; uses platform defaults

## Build Process

**Commands:**
- `npm run dev` - Start Vite dev server at `http://localhost:5173`
- `npm run build` - Production build: runs `vite build` → outputs to `dist/`
- `npm run typecheck` - TypeScript type checking without emit (`tsc --noEmit`)
- `npm run test` - Run Vitest suite once
- `npm run test:watch` - Run Vitest in watch mode
- `npm run preview` - Preview production build locally

**Worker Deployment:**
- `npx wrangler deploy` - Deploy worker code to Cloudflare platform
- Environment secrets: `npx wrangler secret put <NAME>`

---

*Stack analysis: 2026-08-25*
