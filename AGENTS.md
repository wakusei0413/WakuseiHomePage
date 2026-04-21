# AGENTS

## Repo Shape

- This is a plain static site, not a framework app. Runtime entrypoint is `index.html`, which loads a single ES Module entry point `js/app.js`.
- `js/app.js` imports all modules with explicit `import`/`export` declarations. No `window.App` global namespace — dependencies are resolved through ESM imports.
- `config.js` exports `CONFIG` as an ESM named export (`export const CONFIG`). It is the main customization surface; most content changes should happen there.
- `js/validate-config.js` validates CONFIG at startup — missing or mistyped fields produce console errors and prevent initialization.
- Module dependency graph: `app.js` → `config.js`, `polyfills.js` (side-effect), `logger.js`, `utils.js`, `validate-config.js`, `typewriter.js`, `time.js`, `social.js`, `wallpaper.js`, `slogan-selector.js`

## Commands

- Install tooling with `npm install`.
- Lint checks `js/` and `config.js`: `npm run lint`
- Auto-fix lint issues: `npm run lint:fix`
- Prettier covers `js/**/*.js`, `config.js`, `css/**/*.css`, and `index.html`: `npm run format` or `npm run format:check`
- Production build: `npm run build`
- Run tests: `npm test` (uses Node.js test runner with `.mjs` files)
- Local static preview: `npx serve .` or `python -m http.server 8080`

## Verification

- Tests live in `tests/*.test.mjs` and use Node.js built-in test runner with ESM imports.
- For most changes, the useful verification path is `npm run lint`, `npm run format:check`, `npm test`, then `npm run build`.
- CI runs on push/PR to `main`: lint, format:check, build (see `.github/workflows/ci.yml`).

## Build And Deploy Quirks

- `build.js` copies `res/`, `css/`, `js/`, `config.js`, `LICENSE`, and `index.html` into `dist/`, then minifies JS/CSS there.
- JS modules are minified individually with Terser `module: true` (ESM mode); `config.js` is minified without mangling.
- `dist/` is ignored by git.
- `vercel.json` sets `buildCommand` to `null` and `outputDirectory` to `.`. Vercel serves the repo root, not `dist/`, unless that config is changed.

## Style Constraints From Config

- ESLint is configured for ES modules (`sourceType: "module"`) with `no-var: "error"`.
- Prettier uses 4-space indentation, semicolons, single quotes, `printWidth: 120`.

## Runtime Gotchas

- ES Modules load asynchronously with `defer` semantics. All modules execute after HTML parsing, equivalent to the old `<script>` tags at end of body.
- `package.json` stays `"type": "commonjs"` (default) because `build.js` uses `require()`. Test files use `.mjs` extension for ESM in Node.
- Wallpaper loading depends on external image APIs in `CONFIG.wallpaper.apis`; failures here can affect local manual verification without meaning the app code is broken.
- Font Awesome is loaded dynamically in `js/app.js` with a 5s timeout, so missing icons during local/network-restricted runs may be external.