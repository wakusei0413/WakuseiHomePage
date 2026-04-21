# Smoke Tests Design

## Goal

Add 2-3 minimal smoke tests to prevent regressions on config structure changes and typewriter slogan-selection logic. No heavy test framework — use Node built-in `node:test` + `node:assert`.

## Approach

- **Framework**: `node:test` (zero new dependencies)
- **Test runner**: `node --test tests/*.test.js`
- **Pattern**: Extract pure logic from IIFE into testable module; test build output with `fs.existsSync`

## Files

### New: `js/slogan-selector.js`

Extract `getNextSlogan` from `js/typewriter.js` into a pure function `createSloganSelector(mode, slogans)`.

- Returns `{ next() }` where `next()` returns `{ index, text }`
- `mode === 'random'`: random index, avoids consecutive repeats
- `mode === 'sequence'`: sequential cycling with modulo
- Edge case: single-item list doesn't infinite-loop in random mode
- Dual export: `window.App.sloganSelector.create` (browser) + `module.exports` (Node)

### Modify: `js/typewriter.js`

Replace inline `getNextSlogan` + `currentIndex` closure with `App.sloganSelector.create(mode, slogans)`. Log message uses `selector.next()` return values.

### New: `tests/slogan-selector.test.js`

Test `createSloganSelector` logic:
- `sequence` mode: returns slogans in order, wraps around
- `random` mode: never repeats same slogan consecutively (with list length > 1)
- Single-item list: both modes return the only item without errors

### New: `tests/config-fields.test.js`

Require `config.js` and assert key fields exist and are non-empty:
- `profile.name` (string)
- `slogans.list` (non-empty array)
- `socialLinks.links` (non-empty array)
- `wallpaper.apis` (non-empty array)
- `version` (string)

### New: `tests/build-output.test.js`

Run `node build.js` via `child_process.execSync`, then assert:
- `dist/index.html` exists
- `dist/config.js` exists

### Modify: `package.json`

Add script: `"test": "node --test tests/*.test.js"`

## Not In Scope

- DOM-dependent logic (typewriter animation, wallpaper scroll)
- Full config value validation
- Performance or load testing
- Coverage enforcement