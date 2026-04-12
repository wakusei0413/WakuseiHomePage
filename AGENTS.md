# AGENTS

## Repo Shape

- This is a plain static site, not a framework app. Runtime entrypoint is `index.html`, which loads `config.js` first and then global scripts from `js/` in order.
- `config.js` is the main customization surface. Most content changes should happen there instead of hardcoding values into `index.html` or feature scripts.
- The main wiring lives in `js/main.js`; feature modules attach globals on `window` such as `WallpaperScroller`, `initTypewriter`, `initTime`, `initSocialLinks`, and `applyProfileConfig`.

## Commands

- Install tooling with `npm install`.
- Lint only checks `js/` and `config.js`: `npm run lint`
- Auto-fix lint issues: `npm run lint:fix`
- Prettier covers `js/**/*.js`, `config.js`, `css/**/*.css`, and `index.html`: `npm run format` or `npm run format:check`
- Production build: `npm run build`
- Local static preview: `npx serve .` or `python -m http.server 8080`

## Verification

- There are no automated tests or typecheck scripts in this repo.
- For most changes, the useful verification path is `npm run lint`, `npm run format:check`, then `npm run build`.

## Build And Deploy Quirks

- `build.js` copies `res/`, `css/`, `js/`, `config.js`, `LICENSE`, and `index.html` into `dist/`, then minifies JS/CSS there.
- JS modules are minified individually; `config.js` is minified without mangling.
- `dist/` is ignored by git.
- `vercel.json` sets `buildCommand` to `null` and `outputDirectory` to `.`. Vercel serves the repo root, not `dist/`, unless that config is changed.

## Style Constraints From Config

- ESLint is configured for browser globals and classic script files (`sourceType: "script"`), not ES modules.
- Prettier uses 4-space indentation, semicolons, single quotes, `printWidth: 120`.

## Runtime Gotchas

- `config.js` exports `module.exports = CONFIG` for Node tooling, but browser code relies on the global `CONFIG` constant.
- Wallpaper loading depends on external image APIs in `CONFIG.wallpaper.apis`; failures here can affect local manual verification without meaning the app code is broken.
- Font Awesome is loaded dynamically in `js/main.js` with a 5s timeout, so missing icons during local/network-restricted runs may be external.
