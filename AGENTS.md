# AGENTS

Astro 6 static site + Vue 3 (`<script setup>`) + Pinia + TypeScript. Node `>=22.12.0`.

CLAUDE.md may still mention deleted SolidJS-era code — trust this file + `package.json` / `astro.config.mjs` / CI / README.

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

CI (`.github/workflows/ci.yml`, Node 22.12.0): **`lint → format:check → test → check → build`**. Run the same order before claiming done.

Prettier: 4-space, single quotes, semicolons, `printWidth: 120`, `trailingComma: "none"`. ESLint: `no-var`, `eqeqeq`, forced semicolons, `plugin:vue/recommended`. Lint globs: `src/**/*.{ts,vue}`, `tests/**/*.test.ts`, `astro.config.mjs` (not `.astro` files).

## Architecture (easy to miss)

- **Page entry** → `BaseLayout.astro` (CSS, SEO, theme FOUC script, `ClientRouter`) → slot content.
- **Persistent shell**: `SiteShell` + `Footer` use `transition:persist` inside `#pageScroller`. Shell mode is **props-driven**, not pathname inference: pass `shellMode` + `shellTitle` into `BaseLayout` (`home` | `blog` | `article` | `error`).
- **Pinia**: registered in `src/pages/_app.ts` (Astro Vue `appEntrypoint`). Stores: `theme`, `i18n`, `page-shell`, `search`.
- **Cross-page shell state**: `page-shell` store + `src/lib/page-shell-context.ts` + `data-shell-mode` / `data-page-title` on `#pageTransitionSurface`. `navigation-runtime.ts` re-syncs after View Transitions.
- Vue islands are mostly **`client:idle`**; search / article TOC use **`client:load`**. Prefer matching neighbors, not guessing.
- In-app navigation: `navigate` from `astro:transitions/client` (not full reloads). Do not reintroduce `@swup/astro`.
- Article-only DOM enhancers live in `src/scripts/` (copy code, TOC, lightbox, reading progress, etc.), often re-run on `astro:page-load`.

## Config chain (content edits)

```
src/data/customize.ts  →  site.ts (Zod via schema.ts)  →  siteConfig
```

- Day-to-day copy/links/colors/wallpaper/dock: **only** `customize.ts`.
- New config field: `types/site.ts` + `schema.ts` + `customize.ts` together.
- New locale: `data/i18n.ts` translations + `customize.ts` `i18n.locales` + `types/site.ts` `Locale` (and keep all translation keys in lockstep — tests enforce completeness).
- Theme colors: `<html data-theme="light|dark">`; FOUC prevented by inline head script reading `localStorage.theme`.
- Default wallpaper file: `public/res/img/wallpaper/default.webp` (`wallpaper.defaultImage`). Keep WebP; replace in place if changing the hero wallpaper.

## Blog / content

- Posts: `src/content/blog/<slug>/index.md` via **Content Collections** (`src/content.config.ts` + `getCollection` in `src/lib/posts.ts`).
- Frontmatter Zod schema lives in `content.config.ts` (`astro/zod`). New fields: update schema + markdown + UI consumers.
- Server loaders: `src/lib/posts.ts` (`getCollection` / `getImage` / `render`) — **never import from Vue islands** (build fails with `ServerOnlyModule` / `astro:content`).
- Client-safe types/helpers: `src/lib/post-model.ts` (+ `archive.ts` / `search.ts`). Search modal fetches `/search-index.json` (built by `src/pages/search-index.json.ts`).
- Serialized `PostFrontmatter`: `cover` = optimized URL string; dates = ISO strings.
- Covers: put next to the post (`./cover.webp` or `./cover.jpg`) so `image()` + `getImage` can optimize. Do not use `public/` paths for covers.
- Lists/feeds/home sort **newest `pubDate` first** (stable slug tie-break). Home grid is CSS **`columns` masonry** (fills left column top→bottom, then right) — do not switch to row-major Grid unless the user asks.
- `draft: true` is filtered out of lists/feeds/search/static paths.
- Useful fields: `title`, `description`, `cover`, `coverLayout` (`overlay` | `below`), `category`, `tags`, `pubDate`, `updatedDate`, `language`, `draft`.

## Routes

| Path | Notes |
|------|--------|
| `/` | home + post list (`#posts`) |
| `/posts/[...slug]` | article (`shellMode="article"`) |
| `/archives`, `/topics`, `/categories`, `/tags`, `/search` | blog-mode shell |
| `/rss.xml`, `/atom.xml` | feeds |
| `/search-index.json` | client search index (static at build) |
| `/404` | `shellMode="error"` |

Static assets: `public/res/`. Sitemap: `@astrojs/sitemap` in `astro.config.mjs` → build outputs `sitemap-index.xml` / `sitemap-0.xml`. `robots.txt` points at the index. Do not re-add a hand-written `public/sitemap.xml`.

## CSS

Import order is load order (do not reshuffle casually) in `BaseLayout.astro`:

`base → layout → transitions → components → responsive → dock → topbar → footer → article → toc`

Design tokens live in `base.css` / inline `:root`. Prefer existing `--panel-*` / `--glass-*` / font tokens (`--font-serif`, `--font-ui`, `--font-mono`, …) over inventing card shadows.

## Runtime gotchas

- Wallpaper: multi-API race + retries from `wallpaper.apis`; failure must not break the page. Prefetch uses `defaultImage` first.
- Icons: `Icon.vue` maps FA class names to inline SVG; `public/fa/` is legacy.
- `CLAUDE.md` lists deleted composables/stores (`useHomepage`, `homepage` store, ClockPanel, etc.) — **do not revive them**; current code uses `lib/` + `SiteShell` + `page-shell`.
- Migrating old Hexo HTML → Markdown is lossy (bold/`**` glue, tags scraped from theme chrome). Prefer hand-fixing body markup after bulk import (`tmp/migrate-old-blog.mjs` is a one-off helper, not product code).
