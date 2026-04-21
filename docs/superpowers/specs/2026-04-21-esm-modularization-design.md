# ESM Modularization + Config Validation + CI

Date: 2026-04-21

## Overview

Refactor the site's script loading from 9 sequential `<script>` tags to a single ES Module entry point with explicit import declarations, add a startup config validation function, and add a minimal GitHub Actions CI pipeline.

## 1. ES Modules Single-Entry Migration

### Current state

`index.html` loads scripts in fixed order via individual `<script>` tags:

```html
<script src="config.js"></script>
<script src="js/polyfills.js"></script>
<script src="js/logger.js"></script>
<script src="js/utils.js"></script>
<script src="js/slogan-selector.js"></script>
<script src="js/typewriter.js"></script>
<script src="js/time.js"></script>
<script src="js/social.js"></script>
<script src="js/wallpaper.js"></script>
<script src="js/main.js"></script>
```

Each file is an IIFE that attaches to `window.App`. Dependencies are implicit and rely on load order.

### Target state

One entry point:

```html
<script type="module" src="js/app.js"></script>
```

Each module uses `export`/`import`. The dependency graph is explicit:

```
js/app.js
  ├── config.js         (export CONFIG)
  ├── js/polyfills.js   (side-effect import)
  ├── js/logger.js      → import { CONFIG } from '../config.js'
  ├── js/utils.js       (standalone, no imports)
  ├── js/slogan-selector.js (standalone, no imports)
  ├── js/typewriter.js  → import { CONFIG } from '../config.js'
  │                      → import { createLogger } from './logger.js'
  │                      → import { createSloganSelector } from './slogan-selector.js'
  ├── js/time.js         → import { CONFIG } from '../config.js'
  ├── js/social.js       → import { CONFIG } from '../config.js'
  │                      → import { createLogger } from './logger.js'
  │                      → import { utils } from './utils.js'
  └── js/wallpaper.js    → import { CONFIG } from '../config.js'
                         → import { createLogger } from './logger.js'
```

### Module-by-module changes

**config.js**

- Remove `var CONFIG = { ... }` + IIFE guard + `module.exports`
- Replace with `export const CONFIG = { ... }` (same object structure)
- Remove `window.App.config = CONFIG` assignment
- Node tests that do `require('../config')` will switch to dynamic `import()` or a separate CJS wrapper

**polyfills.js**

- Remove IIFE wrapper (ESM has its own scope, no need for IIFE)
- No named exports (side-effect only)
- `app.js` imports it as `import './polyfills.js'`

**logger.js**

- Remove IIFE, `window.App.logger = Logger`
- Import `CONFIG` from `../config.js` directly (no factory — single app, single config)
- Export a `logger` object with `log`, `warn`, `error` methods
- Internal: `isDebugEnabled()` reads from imported CONFIG

**utils.js**

- Remove IIFE, `window.App.utils = { ... }`
- Export named functions: `debounce`, `isLegacyCompatMode`, `isMobile`, `addClass`
- Export as `utils` object for convenience: `export const utils = { debounce, isLegacyCompatMode, isMobile, addClass }`

**slogan-selector.js**

- Remove IIFE, `window.App.sloganSelector` and `module.exports`
- Export `createSloganSelector` as named export
- Node test uses dynamic `import()` or keeps dual CJS/ESM

**typewriter.js**

- Remove IIFE, `window.App.typewriter`
- Import CONFIG, logger, sloganSelector from their respective modules
- Export `initTypewriter()` and `destroyTypewriter()` — they read CONFIG and logger from imported modules

**time.js**

- Remove IIFE, `window.App.time`
- Import CONFIG from `../config.js`
- Export `initTime()` and `destroyTime()`

**social.js**

- Remove IIFE, `window.App.social`
- Import CONFIG, logger, utils from their respective modules
- Export `initSocialLinks()` and `applyProfileConfig()`

**wallpaper.js**

- Remove IIFE, `window.App.wallpaper`
- Import CONFIG, logger from their respective modules
- Export `WallpaperScroller` constructor

**app.js (new)**

- Import all modules in dependency order
- Call `validate(CONFIG)` first
- Initialize polyfills (side-effect import)
- Create logger, utils instances
- Wire up modules in correct order
- Remove all `window.App` references; orchestrate from this single point

### HTML changes

Replace the 9 `<script>` tags with:

```html
<script type="module" src="js/app.js"></script>
```

### ESLint changes

- `.eslintrc.json`: change `sourceType` from `"script"` to `"module"`
- Add rule `"no-var": "error"` (migrate all `var` to `const`/`let`)
- Remove global `"App": "readonly"` (no longer needed)
- Add `parserOptions.ecmaVersion: 2022` (already set)

### Prettier changes

- No changes needed (already compatible with ESM)

### Build script changes

- `build.js`: continue to minify individual JS files in `dist/js/`, but now they are ESM
  - Terser: add `module: true` option for ESM output
  - `dist/index.html`: ensure `<script type="module">` path is correct
- The `config.js` → `dist/config.js` copy + minify without mangle remains unchanged

### Test changes

- `tests/config-fields.test.js`: switch from `require('../config')` to dynamic `import()` or add a CJS wrapper
- `tests/slogan-selector.test.js`: switch from `require('../js/slogan-selector')` to dynamic `import()`
- Node.js `--test` supports ESM via `--experimental-vm-modules` or by renaming test files to `.mjs`

Decision: rename test files to `.mjs` and use `import` statements. Update `package.json` test script accordingly. Also add `"type": "module"` to `package.json` so that `.js` files are treated as ESM by Node.js (this affects build.js and any Node scripts). Alternatively, keep `"type": "commonjs"` (default) and use `.mjs` only for test files and source modules that Node needs to import — this is safer since `build.js` uses `require()`/`module.exports`. Preferred: keep `"type": "commonjs"`, use `.mjs` for tests.

### Compatibility considerations

- `<script type="module">` triggers strict mode by default — all modules must be strict-mode-safe
- ESM loads asynchronously; `DOMContentLoaded` fires before or after module execution. The current code runs at script end, which in ESM is after parsing. Since we target modern browsers (already requiring IntersectionObserver etc.), this is fine.
- `defer` behavior is implicit in ES modules, so no FOUC concern

## 2. Config Validation

### New file: `js/validate-config.js`

Export `validate(CONFIG)` which:

1. Checks required top-level keys exist (`profile`, `socialLinks`, `slogans`, `wallpaper`, `time`, `loading`, `animation`, `effects`, `debug`)
2. For each key, validates field types:
   - `profile.name`: string, non-empty
   - `profile.status`: string
   - `profile.avatar`: string
   - `socialLinks.links`: array of objects with `name` (string), `url` (string), `icon` (string), optional `color` (string)
   - `socialLinks.colorScheme`: `'cycle'` | `'same'`
   - `slogans.list`: non-empty array of strings
   - `slogans.mode`: `'random'` | `'sequence'`
   - `slogans.typeSpeed`: number > 0
   - `slogans.pauseDuration`: number > 0
   - `wallpaper.apis`: non-empty array of strings
   - `wallpaper.raceTimeout`: number > 0
   - `time.format`: `'24h'` | `'12h'`
   - `time.updateInterval`: number > 0
3. Returns `{ valid: boolean, errors: string[] }`
4. On `valid: false`, `app.js` logs all errors with `console.error` and aborts initialization (shows page content with error state)

### Integration

In `app.js`:

```js
import { CONFIG } from '../config.js';
import { validate } from './validate-config.js';

const result = validate(CONFIG);
if (!result.valid) {
    result.errors.forEach(e => console.error(`[CONFIG] ${e}`));
    // Show page anyway but skip module init
    document.querySelector('.container')?.classList.add('visible');
    document.getElementById('loadingOverlay')?.classList.add('hidden');
    throw new Error('Config validation failed');
}
```

## 3. GitHub Actions CI

### New file: `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run build
```

- No deploy step (Vercel handles deployment separately)
- No test step yet (test files will be migrated to .mjs as part of the ESM migration, tests can be added in a follow-up)

## Implementation Order

1. **ES Modules migration** — convert all JS files and config.js, create app.js, update HTML, update ESLint, update build.js, migrate tests
2. **Config validation** — add validate-config.js, integrate into app.js
3. **CI** — add .github/workflows/ci.yml

Each step is independently deployable. The ESM migration is the largest change and should be done first since config validation and CI both benefit from the modular structure.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| ESM async loading changes initialization timing | ESM `defer` behavior is equivalent to current `<script>` at end of body; existing init patterns still work |
| `var` → `const`/`let` migration may introduce scoping bugs | Use `const` by default, `let` only for reassigned variables; linter catches unused vars |
| Node test compatibility with ESM | Rename test files to `.mjs`, use `import` syntax |
| Terser needs `module: true` for ESM | Add option to build.js minification config |
| Polyfills run before module code | Side-effect import `import './polyfills.js'` at top of `app.js` ensures execution order |