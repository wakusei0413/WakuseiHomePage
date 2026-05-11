# Global Entry Loading Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the loading animation only for full browser entries into the site, regardless of route, and skip it during in-site Astro navigation.

**Architecture:** Move loading overlay ownership from `HomepageApp.svelte` to `BaseLayout.astro`. `BaseLayout.astro` renders the overlay globally and uses a one-time `sessionStorage` skip flag set by Astro router events to distinguish an internal route swap from a full document load.

**Tech Stack:** Astro 6, Svelte 5, TypeScript, Node test runner, `astro:transitions` ClientRouter.

---

## File Structure

- Modify `tests/loading-overlay-navigation.test.ts`: define behavior tests for the global overlay, full browser entries, internal swaps, and homepage ownership removal.
- Modify `src/layouts/BaseLayout.astro`: render the global loading overlay markup and add the inline controller script before routed content.
- Modify `src/components/HomepageApp.svelte`: remove homepage-local `LoadingOverlay` import, state, and rendering while keeping wallpaper readiness controlling `.container.visible`.

### Task 1: Update Behavior Tests

**Files:**

- Modify: `tests/loading-overlay-navigation.test.ts`

- [ ] **Step 1: Replace the test file with route-agnostic loading behavior checks**

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const baseLayout = readFileSync(join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
const homepageApp = readFileSync(join(process.cwd(), 'src', 'components', 'HomepageApp.svelte'), 'utf8');

describe('loading overlay navigation behavior', () => {
    it('renders the loading overlay from the global layout', () => {
        assert.match(baseLayout, /<div id="globalLoadingOverlay" class="loading-overlay">/);
        assert.match(baseLayout, /<div id="globalLoadingText" class="loading-text">/);
        assert.match(baseLayout, /<div id="globalLoadingBar" class="loading-bar"/);
        assert.match(baseLayout, /<div id="globalLoadingPercent" class="loading-percent">0%<\/div>/);
    });

    it('shows the loader only on full browser entries before marking the tab as routed', () => {
        assert.match(
            baseLayout,
            /var skipEntryLoader = sessionStorage\.getItem\('__wakusei_skip_entry_loader'\) === 'true';/
        );
        assert.match(baseLayout, /if \(skipEntryLoader\) \{/);
        assert.match(baseLayout, /overlay\.classList\.add\('hidden'\);/);
        assert.match(baseLayout, /sessionStorage\.removeItem\('__wakusei_skip_entry_loader'\);/);
    });

    it('pre-hides incoming loaders during internal Astro swaps', () => {
        assert.match(baseLayout, /document\.addEventListener\('astro:before-swap', \(event\) => \{/);
        assert.match(baseLayout, /event\.newDocument\.querySelector\('#globalLoadingOverlay'\)/);
        assert.match(baseLayout, /incomingOverlay\.classList\.add\('hidden'\)/);
        assert.match(baseLayout, /sessionStorage\.setItem\('__wakusei_skip_entry_loader', 'true'\);/);
    });

    it('keeps the homepage component free of loading overlay ownership', () => {
        assert.doesNotMatch(homepageApp, /LoadingOverlay/);
        assert.doesNotMatch(homepageApp, /loadingPercent/);
        assert.doesNotMatch(homepageApp, /loadingText/);
    });
});
```

- [ ] **Step 2: Run test to verify it fails before implementation**

Run: `npm test -- tests/loading-overlay-navigation.test.ts`

Expected: FAIL because the global overlay markup and `__wakusei_skip_entry_loader` controller do not exist yet.

### Task 2: Move Loading Overlay To The Global Layout

**Files:**

- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/HomepageApp.svelte`

- [ ] **Step 1: Remove homepage-local loading UI ownership**

In `src/components/HomepageApp.svelte`, remove the `LoadingOverlay` import, `loadingText`, `loadingPercent`, all updates to those state variables, and the `<LoadingOverlay />` line. Keep `ready` so wallpaper loading still controls `.container.visible`.

The wallpaper controller callback should become:

```ts
wallpaperController = new WallpaperScrollerController(siteConfig.wallpaper, siteConfig.loading, {
    onReady: () => {
        logger.log('Wallpaper ready - showing homepage content');
        ready = true;
    }
});
```

The mobile branch should become:

```ts
if (mobile) {
    logger.log('Mobile layout detected - skipping wallpaper loading');
    ready = true;
} else {
    logger.log('Desktop layout detected - starting wallpaper loading');
    ready = false;
    startWallpaperLoading();
}
```

- [ ] **Step 2: Add global loading overlay markup to `BaseLayout.astro`**

Add this immediately inside `<body>` before `<slot />`:

```astro
<div id="globalLoadingOverlay" class="loading-overlay">
    <div class="loading-panel">
        <div class="loading-spinner"></div>
        <div id="globalLoadingText" class="loading-text">{siteConfig.loading.texts[0]}</div>
        <div class="loading-progress">
            <div id="globalLoadingBar" class="loading-bar" style="width: 0%"></div>
        </div>
        <div id="globalLoadingPercent" class="loading-percent">0%</div>
    </div>
</div>
```

- [ ] **Step 3: Add the global loading controller script to `BaseLayout.astro`**

Add this inline script after the overlay markup and before `<slot />`:

```astro
<script is:inline define:vars={{ loadingTexts: siteConfig.loading.texts }}>
    (function () {
        var storageKey = '__wakusei_skip_entry_loader';
        var overlay = document.getElementById('globalLoadingOverlay');
        var text = document.getElementById('globalLoadingText');
        var bar = document.getElementById('globalLoadingBar');
        var percentLabel = document.getElementById('globalLoadingPercent');
        var skipEntryLoader = sessionStorage.getItem('__wakusei_skip_entry_loader') === 'true';
        var progress = 0;
        var textIndex = 0;
        var progressTimer;
        var textTimer;

        function setProgress(value) {
            progress = Math.max(progress, Math.min(100, Math.round(value)));
            if (bar) bar.style.width = progress + '%';
            if (percentLabel) percentLabel.textContent = progress + '%';
        }

        function hideOverlay() {
            setProgress(100);
            window.setTimeout(function () {
                if (overlay) overlay.classList.add('hidden');
                window.clearInterval(progressTimer);
                window.clearInterval(textTimer);
                sessionStorage.removeItem(storageKey);
            }, 250);
        }

        if (!overlay) return;

        if (skipEntryLoader) {
            overlay.classList.add('hidden');
            sessionStorage.removeItem('__wakusei_skip_entry_loader');
            return;
        }

        progressTimer = window.setInterval(function () {
            if (progress < 90) setProgress(progress + 3);
        }, 100);

        if (loadingTexts.length > 1 && text) {
            textTimer = window.setInterval(function () {
                textIndex = (textIndex + 1) % loadingTexts.length;
                text.textContent = loadingTexts[textIndex];
            }, 900);
        }

        if (document.readyState === 'complete') {
            hideOverlay();
        } else {
            window.addEventListener('load', hideOverlay, { once: true });
        }
    })();
</script>
```

- [ ] **Step 4: Add internal swap pre-hide logic to the existing route script**

Extend `BaseLayout.astro` route handling with:

```ts
document.addEventListener('astro:before-swap', (event) => {
    sessionStorage.setItem('__wakusei_skip_entry_loader', 'true');
    const incomingOverlay = event.newDocument.querySelector('#globalLoadingOverlay');
    if (incomingOverlay) incomingOverlay.classList.add('hidden');
});
```

- [ ] **Step 5: Run the focused test and verify it passes**

Run: `npm test -- tests/loading-overlay-navigation.test.ts`

Expected: PASS for all `loading overlay navigation behavior` tests.

### Task 3: Verify The Site

**Files:**

- No additional code files.

- [ ] **Step 1: Run project tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run Astro check**

Run: `npm run check`

Expected: no type or Astro diagnostics.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: production build completes and writes `dist/`.

## Self-Review

- Spec coverage: the plan covers full browser entries on any route, internal Astro swaps, homepage return behavior, and moving ownership out of the homepage component.
- Placeholder scan: no placeholders remain.
- Type consistency: file paths, event names, element IDs, and one-time skip storage key are consistent across tests and implementation.
