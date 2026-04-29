# AGENTS

## Repo Shape

- Astro 5 static site with SolidJS components and TypeScript. Entry point: `src/pages/index.astro` → renders `src/layouts/BaseLayout.astro` wrapping `src/components/HomepageApp.tsx`.
- Components use SolidJS reactivity (`createSignal`, `onMount`, `onCleanup`). All client components hydrate with `client:load`.
- `src/data/customize.ts` exports `editableSiteConfig` — the main customization surface; most content changes happen there.
- `src/data/site.ts` imports `editableSiteConfig`, validates via `src/data/schema.ts` (Zod), and exports `siteConfig` consumed by all components.
- `src/types/site.ts` defines all TypeScript interfaces. Schema and types must stay in sync.
- `src/lib/` holds reusable utilities: `logger.ts`, `time.ts`, `slogan-selector.ts`, `font-awesome.ts`, `runtime-effects.ts`, `wallpaper-scroller.ts`.
- CSS is 4-layer: `css/base.css` → `css/layout.css` → `css/components.css` → `css/responsive.css`, imported by `BaseLayout.astro`.
- No legacy browser support — v1.5.0 targets modern browsers only.

## Commands

- Install tooling with `npm install`.
- Lint checks `src/**/*.{ts,tsx}` and `tests/`: `npm run lint`
- Auto-fix lint issues: `npm run lint:fix`
- Prettier covers TS/TSX/Astro/CSS/config files: `npm run format` or `npm run format:check`
- TypeScript check: `npm run check` (astro check)
- Run tests: `npm test` (uses Node.js test runner with tsx loader)
- Development server: `npm run dev`
- Production build: `npm run build` (astro build → dist/)
- Static preview: `npx serve dist` or `npm run preview`

## Verification

- Tests live in `tests/*.test.ts` and use Node.js built-in test runner with `node --import tsx --test`.
- For most changes, run: `npm run lint`, `npm run format:check`, `npm test`, then `npm run build`.
- CI runs on push/PR to `main`: lint → format:check → test → build (see `.github/workflows/ci.yml`).

## Build And Deploy Quirks

- `astro build` outputs static HTML/JS/CSS to `dist/`. No custom build script needed.
- `dist/` is ignored by git. Deployed to Cloudflare Pages.
- SolidJS components are bundled client-side with `module: true` (ESM).

## Style Constraints

- ESLint: `no-var: "error"`, `eqeqeq: "error"`, semicolons always, no-console off, `@typescript-eslint/recommended`.
- Prettier: 4-space indentation, semicolons, single quotes, `printWidth: 120`, `trailingComma: "none"`.
- Astro files use `prettier-plugin-astro`.

## Config Flow

- `src/data/customize.ts` (edit here) → `src/data/site.ts` (re-exports + validates via Zod) → consumed by components and layout.
- Add new config fields: update `src/types/site.ts`, `src/data/schema.ts`, and `src/data/customize.ts`.

## Runtime Gotchas

- SolidJS components hydrate client-side. Server-rendered HTML is static; interactivity activates after JS loads.
- Wallpaper loading depends on external image APIs in `wallpaper.apis`; failures affect loading UX but not core functionality.
- Font Awesome is loaded dynamically via `requestIdleCallback` with 5s timeout; missing icons in network-restricted environments are expected.
- Google Fonts load via `rel="preload"` with `onload` swap; `<noscript>` fallback ensures fonts in no-JS scenarios.
