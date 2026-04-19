# Legacy Polyfill And Wallpaper Fixes Design

## Goal

Keep IE and 2345 compatibility support enabled, restore the missing polyfill script path, and reduce the chance that wallpaper failures leave users stuck on the loading overlay for an excessive amount of time.

This change is intentionally narrow. It does not redesign the compatibility mode or introduce a build-time transpilation pipeline.

## Scope

This work covers three concrete fixes:

1. Restore `js/polyfills.js` so the existing script tag in `index.html` is valid again.
2. Keep the current legacy-browser detection flow and ensure the polyfill script is safe to parse before `main.js` runs.
3. Change wallpaper loading so a full round fails as soon as every configured source has failed, instead of waiting only for the timeout path.

## Non-Goals

- No Babel, core-js, or new build tooling.
- No attempt to fully emulate all modern browser APIs.
- No visual redesign of the legacy mode.
- No changes to `config.js` values unless the implementation proves one is strictly necessary.

## Approach Options

### Option 1: Minimal runtime restoration

- Add a small `js/polyfills.js` file with the specific low-level APIs this site relies on in old IE-class browsers.
- Keep the existing `legacy-compat` class detection.
- Tighten wallpaper failure handling inside `js/wallpaper.js`.

Pros:

- Smallest change set.
- Preserves current architecture.
- Fixes the confirmed 404 immediately.

Cons:

- Compatibility remains selective, not comprehensive.

### Option 2: Remove polyfill file and rely only on legacy mode

- Delete the `polyfills.js` script tag.
- Depend entirely on early legacy detection and simplified rendering.

Pros:

- Less code to maintain.

Cons:

- Conflicts with the requirement to keep IE and 2345 support.
- Leaves some older DOM/runtime gaps unaddressed.

### Option 3: Introduce transpilation and broader compatibility tooling

- Add Babel and broader polyfill management.

Pros:

- Most future-proof for old browsers.

Cons:

- Too large for the current problem.
- Increases build complexity for a static site.

## Recommendation

Use Option 1.

It directly matches the current codebase shape and the stated requirement to keep old-browser support, while staying within the repo's minimal static-site tooling.

## Design

### Polyfills

Add `js/polyfills.js` back as a classic script using old syntax that IE can parse.

It should only include minimal, low-risk polyfills needed by the current code paths before or around initialization, such as:

- `Element.prototype.matches`
- `Element.prototype.closest`
- `NodeList.prototype.forEach`
- `String.prototype.padStart`
- `window.requestAnimationFrame` / `window.cancelAnimationFrame`

The file should avoid modern syntax and avoid trying to polyfill large APIs like `IntersectionObserver`.

### Legacy Compatibility Behavior

Keep the existing inline detection in `index.html` and the current `legacy-compat` short-circuit behavior in `js/main.js`.

This means old browsers still get the simplified content path instead of the full wallpaper and animation experience. The polyfills are there to stabilize the basic scripts and avoid obvious runtime gaps, not to force advanced features to run in IE.

### Wallpaper Failure Handling

Keep multi-source racing, but change round completion semantics:

- Resolve immediately when the first image source loads.
- Reject immediately once every configured source has failed.
- Keep `raceTimeout` as a safety net for hung requests.

Then `_loadWithRetry()` can move to the next retry promptly instead of being gated by the full timeout window on every failed round.

### Lazy Loading Consistency

For this pass, also make lazy loading use the same multi-source retry path as initial loading, or a small shared helper built from it.

That keeps behavior consistent between preload and later scroll-driven loading without a larger refactor.

## Error Handling

- If polyfills cannot apply because the browser is too limited, the page should still fall back to the legacy-compatible path instead of blocking the whole page.
- If wallpaper sources all fail, the loading overlay should still finish and reveal the page.
- If later lazy loads fail, the scroller should continue running without throwing uncaught errors.

## Verification

Because the repo has no automated tests, verification stays command-based plus targeted manual reasoning:

- `npm run lint`
- `npm run format:check`
- `npm run build`

Manual spot checks after implementation:

- `index.html` no longer references a missing local script.
- Legacy mode still skips Font Awesome, wallpaper, scroll reveals, and mobile wallpaper interactions.
- Wallpaper preload exits quickly when all sources fail.
- Lazy-loaded wallpapers use the same source-fallback behavior as preload.

## Risks

- IE-specific parsing limits mean `polyfills.js` must stay conservative and ES5-only.
- Some image endpoints may behave differently across browsers or reject cache-busting query strings.
- Without browser automation, legacy-browser verification is still partial, so command checks only confirm repo integrity, not full IE rendering.
