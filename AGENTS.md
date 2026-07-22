# AGENTS

Astro 6 **static** + Vue 3 (`<script setup>`) + Pinia + TypeScript. Node `>=22.12.0`.

**Trust this file + `package.json` / `astro.config.mjs` / CI / README.**

## Commands

```bash
npm run dev          # localhost:4321
npm run build        # → dist/
npm run serve        # static preview of dist/
npm run preview      # astro preview
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run check        # astro check
npm test             # vitest run (jsdom)
npm test -- tests/foo.test.ts   # single file
```

CI (`.github/workflows/ci.yml`, Node 22.12.0, triggers on `main` only): **`lint → format:check → test → check → build`**. Run the same order before claiming done.

Prettier: 4-space, single quotes, semicolons, `printWidth: 120`, `trailingComma: "none"`. ESLint globs: `src/**/*.{ts,vue}`, `tests/**/*.test.ts`, `astro.config.mjs` — **not** `.astro` bodies. Prettier covers `.astro` + CSS.

## Architecture (easy to miss)

- **Page entry** → `BaseLayout.astro` (CSS, SEO, theme FOUC script, `ClientRouter`) → slot content.
- **Persistent shell**: `SiteShell` + `Footer` use `transition:persist` inside `#pageScroller`. Shell mode is **props-driven**, not pathname inference: pass `shellMode` + `shellTitle` into `BaseLayout` (`home` | `blog` | `article` | `error`).
- **Pinia**: `src/pages/_app.ts` (Vue `appEntrypoint`). Stores: `theme`, `i18n`, `page-shell`, `search`.
- **Cross-page shell state**: `page-shell` store + `src/lib/page-shell-context.ts` + `data-shell-mode` / `data-page-title` on `#pageTransitionSurface`. `navigation-runtime.ts` re-syncs after View Transitions.
- Islands: default **`client:idle`**; **`client:load`** only where latency matters (`SearchPage`, `ArticleToc`, and interactive search path). Match neighbors.
- In-app navigation: `navigate` from `astro:transitions/client` (not full reloads). **Do not reintroduce `@swup/astro`.**
- Article DOM enhancers: `src/scripts/*` (copy code, heading links, lightbox, reading progress, back-to-top) via `article-runtime.ts`, re-bind on `astro:page-load`.

## Config chain

```
src/data/customize.ts  →  site.ts (Zod via schema.ts)  →  siteConfig
```

- Day-to-day copy/links/colors/wallpaper/dock: **only** `customize.ts`.
- New field: `types/site.ts` + `schema.ts` + `customize.ts` together.
- New locale: `data/i18n.ts` + `customize.ts` `i18n.locales` + `types/site.ts` `Locale` (tests require key parity).
- Theme: `<html data-theme="light|dark">`; head script reads `localStorage.theme` (FOUC).
- Default wallpaper: `public/res/img/wallpaper/default.webp`. Keep WebP; replace in place. Runtime: race/retry `wallpaper.apis`; Ken Burns CSS while active (`layout.css` / `--wallpaper-zoom-ms`). Failure must not break the page.
- Dock **settings** is still a placeholder (`href: '#'`, i18n “coming soon”) — do not invent a full settings UI unless asked.

## Blog / content

- Posts: `src/content/blog/<slug>/index.md` — Content Collections (`src/content.config.ts`).
- Frontmatter Zod in `content.config.ts` (`astro/zod`). **`description` is required** (lists/SEO); write a real summary, not the first body line or a raw URL.
- Fields: `title`, `description`, `cover`, `coverLayout` (`overlay` | `below`), `category`, `tags`, `pubDate`, `updatedDate`, `language`, `draft`.
- Server loaders: `src/lib/posts.ts` (`getCollection` / `getImage` / `render`) — **never import from Vue islands** (build fails: `ServerOnlyModule` / `astro:content`).
- Client-safe: `src/lib/post-model.ts` (+ `archive.ts` / `search.ts`). Search modal uses `/search-index.json` (`src/pages/search-index.json.ts`).
- Covers: next to the post (`./cover.webp` / `./cover.jpg`) so `image()` + `getImage` optimize. **Not** `public/` paths for covers.
- Sort: newest `pubDate` first (slug tie-break). Home list: CSS **`columns` masonry** — do **not** switch to row-major Grid unless the user asks.
- `draft: true` excluded from lists, search, feeds, static paths.

## Routes

| Path | Notes |
|------|--------|
| `/` | home + post list (`#posts`) |
| `/posts/[...slug]` | article (`shellMode="article"`) |
| `/archives`, `/topics`, `/categories`, `/tags`, `/search` | blog shell |
| `/rss.xml`, `/atom.xml` | feeds |
| `/search-index.json` | client search index (build-time) |
| `/404` | `shellMode="error"` |

Static assets: `public/res/`. Sitemap: `@astrojs/sitemap` → `sitemap-index.xml` / `sitemap-0.xml`. `robots.txt` points at the index. **Do not** re-add hand-written `public/sitemap.xml`.

## CSS

Import order in `BaseLayout.astro` is load order (do not reshuffle casually):

`base → layout → transitions → components → responsive → dock → topbar → footer → article → toc`

Prefer existing tokens (`--panel-*`, `--glass-*`, `--font-serif` / `--font-ui` / `--font-mono`, `--curve-delicate`) over inventing new card systems.

## Repo hygiene

- Gitignored tool junk: `tmp/`, `output/`, `.playwright-cli/`, `terminals/`, `agent-tools/`, `dist/`, `.astro/`. **Never stage screenshots, Lighthouse JSON, or migrate helpers as product.**
- Icons: `Icon.vue` maps FA class names → inline SVG (no Font Awesome package).
- Old Hexo HTML → MD is lossy; hand-fix after bulk import. One-off scripts stay out of the repo tree that ships.
