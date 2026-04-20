# App Namespace Refactor Design

## Context

The site loads scripts in order via `<script>` tags in index.html. Each module currently attaches individual globals to `window`:

| Source | Global Symbols |
|---|---|
| config.js | `CONFIG` |
| logger.js | `Logger` |
| utils.js | `Utils` |
| typewriter.js | `initTypewriter`, `destroyTypewriter` |
| time.js | `initTime`, `destroyTime` |
| social.js | `initSocialLinks`, `applyProfileConfig` |
| wallpaper.js | `WallpaperScroller` |

10 global symbols across 7 files. Dependencies are maintained purely by script load order. ESLint declares all 10 as `readonly` globals with `sourceType: "script"`.

## Goal

Consolidate all modules under a single `window.App` namespace (module object pattern) before any ESM migration. Reduce global surface from 10 symbols to 1 (`App`). Preserve the IIFE-per-file structure and script-load-order dependency model.

## Approach: Module Object Pattern (C)

Each file exports its public API as a sub-object on `App`:

```js
window.App = {
    config: CONFIG,                      // config.js
    logger:  { log, warn, error },       // logger.js
    utils:   { debounce, isLegacyCompatMode, isMobile, addClass }, // utils.js
    typewriter: { init, destroy },        // typewriter.js
    time:    { init, destroy },           // time.js
    social:  { initLinks, applyProfile }, // social.js
    wallpaper: WallpaperScroller          // wallpaper.js
};
```

This maps 1:1 to future ESM exports, making migration mechanical.

## File Changes

### config.js

Append after the existing `module.exports` block:

```js
if (typeof window.App === 'undefined') { window.App = {}; }
window.App.config = CONFIG;
```

The `var CONFIG = {…}` declaration is kept for now (will be removed in ESM migration).

### logger.js

Replace `window.Logger = Logger;` with:

```js
if (typeof window.App === 'undefined') { window.App = {}; }
window.App.logger = Logger;
```

Internal references (`Logger.log(...)`) inside the IIFE stay as-is (local variable).

### utils.js

Replace `window.Utils = {…};` with:

```js
if (typeof window.App === 'undefined') { window.App = {}; }
window.App.utils = { debounce: debounce, isLegacyCompatMode: isLegacyCompatMode, isMobile: isMobile, addClass: addClass };
```

### typewriter.js

Replace the two `window.initTypewriter` / `window.destroyTypewriter` lines with:

```js
if (typeof window.App === 'undefined') { window.App = {}; }
window.App.typewriter = { init: initTypewriter, destroy: destroyTypewriter };
```

### time.js

Replace the two `window.initTime` / `window.destroyTime` lines with:

```js
if (typeof window.App === 'undefined') { window.App = {}; }
window.App.time = { init: initTime, destroy: destroyTime };
```

### social.js

Replace the two `window.initSocialLinks` / `window.applyProfileConfig` lines with:

```js
if (typeof window.App === 'undefined') { window.App = {}; }
window.App.social = { initLinks: initSocialLinks, applyProfile: applyProfileConfig };
```

### wallpaper.js

Replace `window.WallpaperScroller = WallpaperScroller;` with:

```js
if (typeof window.App === 'undefined') { window.App = {}; }
window.App.wallpaper = WallpaperScroller;
```

### main.js

All cross-module references change from bare globals to `App.xxx`:

| Before | After |
|---|---|
| `Logger.log(...)` | `App.logger.log(...)` |
| `Utils.addClass(...)` | `App.utils.addClass(...)` |
| `Utils.isLegacyCompatMode()` | `App.utils.isLegacyCompatMode()` |
| `Utils.isMobile()` | `App.utils.isMobile()` |
| `Utils.debounce(...)` | `App.utils.debounce(...)` |
| `typeof CONFIG === 'undefined'` | `typeof App === 'undefined' || !App.config` |
| `CONFIG.xxx` | `App.config.xxx` |
| `new WallpaperScroller(...)` | `new App.wallpaper(...)` |
| `initTypewriter()` | `App.typewriter.init()` |
| `initTime()` | `App.time.init()` |
| `initSocialLinks()` | `App.social.initLinks()` |
| `applyProfileConfig()` | `App.social.applyProfile()` |

### Internal references within feature modules

Each feature module that references `CONFIG`, `Logger`, or `Utils` internally must also switch to `App.config`, `App.logger`, `App.utils` respectively.

### polyfills.js

No changes needed (no App interaction).

### index.html

Script load order stays the same. Each file self-initializes `window.App = window.App || {}` if needed, so no extra bootstrap line is required.

### .eslintrc.json

Replace the 10 individual globals with:

```json
"globals": {
    "App": "readonly"
}
```

### build.js

No changes needed. Terser mangles local variables but not property accesses on objects, so `App.xxx.yyy` is safe.

## Verification

1. `npm run lint` — should pass with only `App` as a global
2. `npm run format:check` — formatting should be clean
3. `npm run build` — dist output should minify correctly
4. Browser test — site should function identically (typewriter, clock, wallpaper, social links)

## Non-Goals

- Migrating to ES modules (deferred to future work)
- Changing the IIFE-per-file structure
- Merging or splitting files
- Adding new features