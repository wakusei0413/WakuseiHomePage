# Legacy Polyfill And Wallpaper Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the missing polyfill script for IE/2345 compatibility and make wallpaper loading fail fast enough that users do not get stuck behind the loading overlay when image sources are down.

**Architecture:** Keep the existing single-page static-site structure and current `legacy-compat` runtime branch. Add one small ES5-only polyfill script, then tighten `WallpaperScroller` so both preload and lazy loading share the same multi-source image acquisition behavior with immediate all-source failure handling.

**Tech Stack:** Static HTML, classic browser JavaScript, Node build script, ESLint, Prettier

---

## File Map

- Create: `js/polyfills.js`
  Responsibility: Provide minimal ES5-safe polyfills required by the site's initialization path in older browsers.
- Modify: `js/wallpaper.js`
  Responsibility: Fix multi-source loading behavior, reduce failure wait time, and share the same source fallback behavior across preload and lazy loading.

### Task 1: Restore Minimal Polyfills

**Files:**

- Create: `js/polyfills.js`

- [ ] **Step 1: Write the failing verification expectation**

The repo currently fails a basic asset-integrity expectation because `index.html` references `js/polyfills.js` but the file does not exist.

Expected verification target after the fix:

```text
`js/polyfills.js` exists and contains only ES5-compatible syntax.
```

- [ ] **Step 2: Verify the failure state exists before changing code**

Run: `git status --short`
Expected: no `js/polyfills.js` file is present in the working tree before implementation.

- [ ] **Step 3: Write the minimal implementation**

Create `js/polyfills.js` with ES5-safe polyfills for the site's current usage:

```javascript
(function () {
    'use strict';

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function (callback) {
            return window.setTimeout(function () {
                callback(new Date().getTime());
            }, 16);
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function (id) {
            window.clearTimeout(id);
        };
    }

    if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = function (callback, thisArg) {
            var i;
            for (i = 0; i < this.length; i++) {
                callback.call(thisArg, this[i], i, this);
            }
        };
    }

    if (!String.prototype.padStart) {
        String.prototype.padStart = function (targetLength, padString) {
            var result = String(this);
            var fill = typeof padString === 'undefined' ? ' ' : String(padString);

            while (result.length < targetLength) {
                result = fill + result;
            }

            return result.slice(result.length - targetLength);
        };
    }

    if (window.Element && !Element.prototype.matches) {
        Element.prototype.matches =
            Element.prototype.msMatchesSelector ||
            Element.prototype.webkitMatchesSelector ||
            function (selector) {
                var node = this;
                var nodes = (node.document || node.ownerDocument).querySelectorAll(selector);
                var i = 0;

                while (nodes[i] && nodes[i] !== node) {
                    i++;
                }

                return !!nodes[i];
            };
    }

    if (window.Element && !Element.prototype.closest) {
        Element.prototype.closest = function (selector) {
            var node = this;

            while (node && node.nodeType === 1) {
                if (node.matches(selector)) {
                    return node;
                }

                node = node.parentElement || node.parentNode;
            }

            return null;
        };
    }
})();
```

- [ ] **Step 4: Verify the file now exists and is parse-safe by inspection tools**

Run: `npm run lint`
Expected: lint completes without syntax errors from `js/polyfills.js`.

- [ ] **Step 5: Commit**

```bash
git add js/polyfills.js
git commit -m "fix: restore legacy polyfills script"
```

### Task 2: Make Wallpaper Source Failure Fast And Consistent

**Files:**

- Modify: `js/wallpaper.js`

- [ ] **Step 1: Write the failing verification expectation**

Document the current incorrect behavior before changing code:

```text
When every wallpaper API fails quickly, one load round still waits for the timeout path instead of failing immediately, and lazy loading does not reuse the same multi-source strategy as preload.
```

- [ ] **Step 2: Verify the current failure-causing code paths by inspection**

Read and confirm these current behaviors in `js/wallpaper.js`:

```javascript
img.onerror = () => {
    if (done) return;
};

img.src = `${this.apis[0]}?t=${Date.now()}_${index}`;
```

Expected: `_raceLoadImage()` does not reject when all sources error, and `_loadImageLazy()` only uses `this.apis[0]`.

- [ ] **Step 3: Write the minimal implementation**

Update `js/wallpaper.js` with these changes:

```javascript
_buildImageUrl(api, index) {
    return api + '?t=' + Date.now() + '_' + index;
}

_clearImageRequest(img) {
    img.onload = null;
    img.onerror = null;
    if (img.src) {
        img.removeAttribute('src');
    }
}

_raceLoadImage(index) {
    return new Promise((resolve, reject) => {
        const images = this.apis.map(() => new Image());
        let done = false;
        let failureCount = 0;

        const timer = setTimeout(() => {
            if (done) return;
            done = true;
            images.forEach((img) => this._clearImageRequest(img));
            reject(new Error('Timeout'));
        }, this.raceTimeout);

        const finishSuccess = (img) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            images.forEach((candidate) => {
                if (candidate !== img) {
                    this._clearImageRequest(candidate);
                }
            });
            resolve(img);
        };

        const finishFailure = () => {
            failureCount++;
            if (done || failureCount < images.length) return;
            done = true;
            clearTimeout(timer);
            images.forEach((img) => this._clearImageRequest(img));
            reject(new Error('All wallpaper sources failed'));
        };

        images.forEach((img, i) => {
            img.onload = () => finishSuccess(img);
            img.onerror = finishFailure;
            img.src = this._buildImageUrl(this.apis[i], index);
        });
    });
}
```

Then replace the current lazy-load and retry split with one shared loader call:

```javascript
_loadImageIntoPlaceholder(placeholder) {
    if (placeholder.dataset.loaded || placeholder.dataset.loading) return;
    placeholder.dataset.loading = 'true';

    this._loadWithRetry(placeholder.dataset.index)
        .then((img) => {
            placeholder.appendChild(img);
            placeholder.dataset.loaded = 'true';
            delete placeholder.dataset.loading;
            requestAnimationFrame(() => placeholder.classList.add('loaded'));
        })
        .catch(() => {
            delete placeholder.dataset.loading;
            Logger.error('[壁纸] 懒加载失败:', placeholder.dataset.index);
        });
}
```

And hook the observer to that helper instead of the old `_loadImageLazy()` / `_retryLazy()` split.

- [ ] **Step 4: Verify the updated behavior with repo checks**

Run: `npm run lint`
Expected: lint passes with the updated `js/wallpaper.js`.

- [ ] **Step 5: Commit**

```bash
git add js/wallpaper.js
git commit -m "fix: harden wallpaper fallback loading"
```

### Task 3: Final Verification

**Files:**

- Verify only: `index.html`, `js/polyfills.js`, `js/wallpaper.js`, `build.js`

- [ ] **Step 1: Run lint verification**

Run: `npm run lint`
Expected: all checked files pass ESLint.

- [ ] **Step 2: Run format verification**

Run: `npm run format:check`
Expected: Prettier reports all matched files are formatted.

- [ ] **Step 3: Run build verification**

Run: `npm run build`
Expected: build completes and copies/minifies `js/polyfills.js` into `dist/js/polyfills.js` without errors.

- [ ] **Step 4: Inspect final outcomes**

Confirm these end states:

```text
- `index.html` references an existing local polyfill script.
- Legacy-mode runtime path is still intact.
- Wallpaper preload no longer depends only on timeout to detect full-source failure.
- Lazy loading and preload now share the same source-fallback behavior.
```

- [ ] **Step 5: Commit**

```bash
git add js/polyfills.js js/wallpaper.js
git commit -m "fix: improve legacy support and wallpaper resilience"
```
