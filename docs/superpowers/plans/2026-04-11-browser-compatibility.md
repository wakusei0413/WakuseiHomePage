# Browser Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WakuseiHomePage functional on IE11, Edge Legacy, Firefox 52+, and Chrome 55+ via manual ES5 rewrite, polyfill injection, and CSS graceful degradation.

**Architecture:** New `js/polyfills.js` provides missing APIs (Promise, padStart, startsWith, IntersectionObserver, NodeList.forEach) loaded before business scripts. `wallpaper.js` rewritten from ES6+ to ES5. CSS gets static fallback values for `var()`, `clamp()`, `inset`, `backdrop-filter`, Grid, and `object-fit`.

**Tech Stack:** Plain JS (ES5), CSS with `@supports`, no new npm dependencies.

---

## File Structure

| Action | File              | Responsibility                                                                                                                 |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Create | `js/polyfills.js` | Feature-detected polyfills for Promise, padStart, startsWith, IntersectionObserver, NodeList.forEach                           |
| Modify | `js/wallpaper.js` | ES6+ → ES5 rewrite (class, arrows, templates, async/await, const/let)                                                          |
| Modify | `js/main.js`      | Fix scrollTo options, classList.toggle two-arg form, IntersectionObserver guard                                                |
| Modify | `js/time.js`      | Replace padStart with inline helper                                                                                            |
| Modify | `js/social.js`    | Replace startsWith with indexOf, add object-fit detection                                                                      |
| Modify | `css/style.css`   | Add CSS var fallbacks, clamp fallbacks, inset expansion, backdrop-filter @supports, Grid flexbox fallback, object-fit fallback |
| Modify | `index.html`      | Add meta X-UA-Compatible, add polyfills.js script tag                                                                          |
| Modify | `build.js`        | Add terser ecma:5 option, include polyfills.js in copy list                                                                    |

---

### Task 1: Create `js/polyfills.js`

**Files:**

- Create: `js/polyfills.js`

- [ ] **Step 1: Write the polyfills file**

```js
/**
 * Polyfill 模块 — 为旧版浏览器提供缺失的 API
 * 仅在 API 不存在时注入，不影响现代浏览器
 */
(function () {
    'use strict';

    // Promise polyfill (minimal, ES5-compatible)
    if (typeof Promise === 'undefined') {
        var PENDING = 0;
        var FULFILLED = 1;
        var REJECTED = 2;

        function Promise(executor) {
            var self = this;
            self._state = PENDING;
            self._value = undefined;
            self._handlers = [];

            function resolve(value) {
                settle(self, FULFILLED, value);
            }

            function reject(reason) {
                settle(self, REJECTED, reason);
            }

            try {
                executor(resolve, reject);
            } catch (e) {
                reject(e);
            }
        }

        function settle(promise, state, value) {
            if (promise._state !== PENDING) return;
            promise._state = state;
            promise._value = value;
            drain(promise);
        }

        function drain(promise) {
            if (promise._state === PENDING) return;
            var handlers = promise._handlers.slice();
            promise._handlers = [];
            for (var i = 0; i < handlers.length; i++) {
                handle(promise, handlers[i]);
            }
        }

        function handle(promise, handler) {
            if (promise._state === PENDING) {
                promise._handlers.push(handler);
                return;
            }
            setTimeout(function () {
                var cb = promise._state === FULFILLED ? handler.onFulfilled : handler.onRejected;
                if (cb === null) {
                    (promise._state === FULFILLED ? handler.resolve : handler.reject)(promise._value);
                    return;
                }
                var ret;
                try {
                    ret = cb(promise._value);
                } catch (e) {
                    handler.reject(e);
                    return;
                }
                handler.resolve(ret);
            }, 0);
        }

        Promise.prototype.then = function (onFulfilled, onRejected) {
            var self = this;
            return new Promise(function (resolve, reject) {
                handle(self, {
                    onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
                    onRejected: typeof onRejected === 'function' ? onRejected : null,
                    resolve: resolve,
                    reject: reject
                });
            });
        };

        Promise.prototype.catch = function (onRejected) {
            return this.then(null, onRejected);
        };

        Promise.all = function (iterable) {
            return new Promise(function (resolve, reject) {
                var results = [];
                var remaining = iterable.length;
                if (remaining === 0) {
                    resolve(results);
                    return;
                }
                for (var i = 0; i < iterable.length; i++) {
                    (function (index) {
                        Promise.resolve(iterable[index]).then(function (value) {
                            results[index] = value;
                            remaining--;
                            if (remaining === 0) resolve(results);
                        }, reject);
                    })(i);
                }
            });
        };

        Promise.resolve = function (value) {
            if (value instanceof Promise) return value;
            return new Promise(function (resolve) {
                resolve(value);
            });
        };

        Promise.reject = function (reason) {
            return new Promise(function (_, reject) {
                reject(reason);
            });
        };
    }

    // String.prototype.padStart
    if (!String.prototype.padStart) {
        String.prototype.padStart = function padStart(maxLength, fillString) {
            var str = String(this);
            if (str.length >= maxLength) return str;
            var fill = fillString === undefined ? ' ' : String(fillString);
            var padLen = maxLength - str.length;
            var pad = '';
            while (pad.length < padLen) {
                pad += fill;
            }
            pad = pad.length > padLen ? pad.slice(0, padLen) : pad;
            return pad + str;
        };
    }

    // String.prototype.startsWith
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function startsWith(search, pos) {
            var str = String(this);
            pos = pos === undefined ? 0 : Math.min(Math.max(Math.floor(pos), 0), str.length);
            return str.indexOf(String(search), pos) === pos;
        };
    }

    // NodeList.prototype.forEach
    if (typeof NodeList !== 'undefined' && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }
})();
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node -c js/polyfills.js`
Expected: no output (syntax OK)

- [ ] **Step 3: Commit**

```bash
git add js/polyfills.js
git commit -m "feat: add polyfills.js for IE11/old browser API support"
```

---

### Task 2: Rewrite `js/wallpaper.js` to ES5

**Files:**

- Modify: `js/wallpaper.js`

- [ ] **Step 1: Replace the entire file with ES5-compatible version**

```js
/**
 * 壁纸滚动模块 - 独立封装
 * 功能：无限滚动壁纸、竞速加载、懒加载、自动滚动
 */
(function () {
    'use strict';

    function WallpaperScroller(containerId, wallpaperConfig, loadingConfig, onReady) {
        this.containerId = containerId;
        this.container = null;
        this.wallpaperConfig = wallpaperConfig || {};
        this.loadingConfig = loadingConfig || {};
        this.onReady = onReady || function () {};

        this.imageCounter = 0;
        this.images = [];
        this.observer = null;
        this.currentLoadingTextIndex = 0;
        this.textInterval = null;
        this.isDestroyed = false;
        this.autoScrollId = null;

        var infiniteScroll = this.wallpaperConfig.infiniteScroll || {};
        this.apis = this.wallpaperConfig.apis || ['https://www.loliapi.com/bg/', 'https://www.dmoe.cc/random.php'];
        this.raceTimeout = this.wallpaperConfig.raceTimeout || 10000;
        this.maxRetries = this.wallpaperConfig.maxRetries || 100;
        this.preloadCount = this.wallpaperConfig.preloadCount || 3;
        this.infiniteScrollEnabled = infiniteScroll.enabled !== false;
        this.batchSize = infiniteScroll.batchSize || 3;
        this.maxImages = infiniteScroll.maxImages || 20;
        this.scrollSpeed = infiniteScroll.speed || 1.5;
        this.loadThreshold = 500;
        this.loadingTexts = this.loadingConfig.texts || ['少女祈祷中...'];
        this.textSwitchInterval = this.loadingConfig.textSwitchInterval || 2000;
    }

    WallpaperScroller.prototype.init = function () {
        var self = this;
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            Logger.warn('[壁纸] 容器元素未找到:', this.containerId);
            return;
        }

        if (!this.infiniteScrollEnabled) {
            Logger.log('[壁纸] 无限滚动已禁用');
            return;
        }

        this._setupObserver();
        this._disableInteraction();

        this._loadInitialImages()
            .then(function () {
                self.onReady();
                self._startAutoScroll();
            })
            .catch(function (err) {
                Logger.error('[壁纸] 初始化失败:', err);
                self.onReady();
            });
    };

    WallpaperScroller.prototype.destroy = function () {
        this.isDestroyed = true;

        if (this.textInterval) {
            clearInterval(this.textInterval);
            this.textInterval = null;
        }

        if (this.autoScrollId) {
            cancelAnimationFrame(this.autoScrollId);
            this.autoScrollId = null;
        }

        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        if (this.container) {
            this.container.innerHTML = '';
        }

        this.images = [];
    };

    WallpaperScroller.prototype._setupObserver = function () {
        var self = this;
        this.observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        self._loadImageLazy(entry.target);
                    }
                });
            },
            {
                root: this.container,
                rootMargin: '400px 0px',
                threshold: 0.01
            }
        );
    };

    WallpaperScroller.prototype._disableInteraction = function () {
        this.container.addEventListener(
            'wheel',
            function (e) {
                e.preventDefault();
            },
            { passive: false }
        );
        this.container.addEventListener(
            'touchstart',
            function (e) {
                e.preventDefault();
            },
            { passive: false }
        );
        this.container.addEventListener(
            'touchmove',
            function (e) {
                e.preventDefault();
            },
            { passive: false }
        );
        this.container.addEventListener('mousedown', function (e) {
            e.preventDefault();
        });
    };

    WallpaperScroller.prototype._raceLoadImage = function (index) {
        return new Promise(
            function (resolve, reject) {
                var ts = Date.now();
                var self = this;
                var images = this.apis.map(function () {
                    return new Image();
                });
                var urls = this.apis.map(function (api) {
                    return api + '?t=' + ts + '_' + index;
                });
                var done = false;

                var timer = setTimeout(function () {
                    if (!done) {
                        done = true;
                        images.forEach(function (img) {
                            img.onload = img.onerror = null;
                            if (img.src) img.removeAttribute('src');
                        });
                        reject(new Error('Timeout'));
                    }
                }, this.raceTimeout);

                var finish = function (img) {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    images.forEach(function (i) {
                        i.onload = i.onerror = null;
                        if (i !== img) {
                            if (i.src) i.removeAttribute('src');
                        }
                    });
                    resolve(img);
                };

                images.forEach(function (img, i) {
                    img.onload = function () {
                        finish(img);
                    };
                    img.onerror = function () {
                        if (done) return;
                    };
                    img.src = urls[i];
                });
            }.bind(this)
        );
    };

    WallpaperScroller.prototype._loadWithRetry = function (index) {
        var self = this;
        var attempt = 1;

        function tryOnce() {
            return self._raceLoadImage(index).then(
                function (result) {
                    return result;
                },
                function (err) {
                    Logger.log('[壁纸] 加载中... (' + attempt + '/' + self.maxRetries + ')');
                    attempt++;
                    if (attempt <= self.maxRetries) {
                        return tryOnce();
                    }
                    throw new Error('Max retries exceeded');
                }
            );
        }

        return tryOnce();
    };

    WallpaperScroller.prototype._loadImageLazy = function (placeholder) {
        var self = this;
        if (placeholder.dataset.loaded) return;
        if (placeholder.dataset.loading) return;
        placeholder.dataset.loading = 'true';

        var index = placeholder.dataset.index;
        var img = new Image();

        img.onload = function () {
            placeholder.appendChild(img);
            placeholder.dataset.loaded = 'true';
            delete placeholder.dataset.loading;
            requestAnimationFrame(function () {
                placeholder.classList.add('loaded');
            });
        };

        img.onerror = function () {
            delete placeholder.dataset.loading;
            self._retryLazy(placeholder);
        };

        img.src = this.apis[0] + '?t=' + Date.now() + '_' + index;
    };

    WallpaperScroller.prototype._retryLazy = function (placeholder) {
        var self = this;
        if (placeholder.dataset.loaded) return;
        if (placeholder.dataset.retried) return;
        placeholder.dataset.retried = 'true';
        placeholder.dataset.loading = 'true';

        var index = placeholder.dataset.index;
        var img = new Image();

        img.onload = function () {
            placeholder.appendChild(img);
            placeholder.dataset.loaded = 'true';
            delete placeholder.dataset.loading;
            requestAnimationFrame(function () {
                placeholder.classList.add('loaded');
            });
        };

        img.onerror = function () {
            delete placeholder.dataset.loading;
        };

        if (this.apis.length > 1) {
            img.src = this.apis[1] + '?t=' + Date.now() + '_' + index;
        }
    };

    WallpaperScroller.prototype._createPlaceholder = function () {
        var div = document.createElement('div');
        div.className = 'wallpaper-image';
        return div;
    };

    WallpaperScroller.prototype._addPlaceholders = function (count) {
        for (var i = 0; i < count; i++) {
            var placeholder = this._createPlaceholder();
            placeholder.dataset.index = this.imageCounter++;
            this.container.appendChild(placeholder);
            this.images.push(placeholder);
            this.observer.observe(placeholder);
        }
    };

    WallpaperScroller.prototype._cleanup = function () {
        while (this.images.length > this.maxImages) {
            var old = this.images.shift();
            this.observer.unobserve(old);
            delete old.dataset.index;
            delete old.dataset.loaded;
            delete old.dataset.loading;
            delete old.dataset.retried;
            old.remove();
        }
    };

    WallpaperScroller.prototype._autoScroll = function () {
        var self = this;
        if (this.isDestroyed) return;

        this.container.scrollTop += this.scrollSpeed;

        var scrollBottom = this.container.scrollTop + this.container.clientHeight;
        if (this.container.scrollHeight - scrollBottom < this.loadThreshold) {
            this._addPlaceholders(this.batchSize);
            this._cleanup();
        }

        this.autoScrollId = requestAnimationFrame(function () {
            self._autoScroll();
        });
    };

    WallpaperScroller.prototype._startAutoScroll = function () {
        this._addPlaceholders(this.batchSize);
        var self = this;
        this.autoScrollId = requestAnimationFrame(function () {
            self._autoScroll();
        });
    };

    WallpaperScroller.prototype._loadInitialImages = function () {
        var self = this;
        var loadingText = document.getElementById('loadingText');
        var loadingBar = document.getElementById('loadingBar');
        var loadingPercent = document.getElementById('loadingPercent');

        if (loadingText && this.loadingTexts.length > 1) {
            this.textInterval = setInterval(function () {
                self.currentLoadingTextIndex = (self.currentLoadingTextIndex + 1) % self.loadingTexts.length;
                loadingText.textContent = self.loadingTexts[self.currentLoadingTextIndex];
            }, this.textSwitchInterval);
        }

        var placeholders = [];
        for (var i = 0; i < this.preloadCount; i++) {
            var p = this._createPlaceholder();
            p.dataset.index = this.imageCounter++;
            this.container.appendChild(p);
            this.images.push(p);
            placeholders.push(p);
        }

        var loadedCount = 0;

        var loadPromises = placeholders.map(function (p, idx) {
            return self
                ._loadWithRetry(p.dataset.index)
                .then(function (img) {
                    p.appendChild(img);
                    p.dataset.loaded = 'true';
                    p.classList.add('loaded');

                    loadedCount++;
                    var percent = Math.round((loadedCount / self.preloadCount) * 100);
                    if (loadingBar) loadingBar.style.width = percent + '%';
                    if (loadingPercent) loadingPercent.textContent = percent + '%';
                })
                .catch(function () {
                    Logger.error('[壁纸] 第 ' + (idx + 1) + ' 张加载失败');
                    loadedCount++;
                    var percent = Math.round((loadedCount / self.preloadCount) * 100);
                    if (loadingBar) loadingBar.style.width = percent + '%';
                    if (loadingPercent) loadingPercent.textContent = percent + '%';
                });
        });

        return Promise.all(loadPromises).then(function () {
            if (self.textInterval) {
                clearInterval(self.textInterval);
                self.textInterval = null;
            }

            placeholders.forEach(function (p) {
                self.observer.observe(p);
            });
        });
    };

    window.WallpaperScroller = WallpaperScroller;
})();
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node -c js/wallpaper.js`
Expected: no output (syntax OK)

- [ ] **Step 3: Run lint check**

Run: `npm run lint`
Expected: No errors related to wallpaper.js

- [ ] **Step 4: Commit**

```bash
git add js/wallpaper.js
git commit -m "refactor: rewrite wallpaper.js from ES6+ to ES5 for browser compatibility"
```

---

### Task 3: Fix `js/main.js` compatibility issues

**Files:**

- Modify: `js/main.js`

- [ ] **Step 1: Replace `classList.toggle` two-argument form (line 128)**

Find in `initMobileStickyAvatar`:

```js
avatarBox.classList.toggle('scrolled', scrolled);
```

Replace with:

```js
if (scrolled) {
    avatarBox.classList.add('scrolled');
} else {
    avatarBox.classList.remove('scrolled');
}
```

- [ ] **Step 2: Replace `scrollTo` with options object (line 135)**

Find in the click handler inside `initMobileStickyAvatar`:

```js
scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
```

Replace with:

```js
if ('scrollBehavior' in document.documentElement.style) {
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
} else {
    scrollContainer.scrollTo(0, 0);
}
```

- [ ] **Step 3: Verify no syntax errors**

Run: `node -c js/main.js`
Expected: no output (syntax OK)

- [ ] **Step 4: Run lint check**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add js/main.js
git commit -m "fix: replace ES6 scrollTo options and classList.toggle for IE11 compatibility"
```

---

### Task 4: Fix `js/time.js` — replace `padStart` with inline helper

**Files:**

- Modify: `js/time.js`

- [ ] **Step 1: Add pad helper and replace `padStart` calls**

Find the `updateTime` function body. Replace the clock formatting section (lines 68-79):

```js
if (clockEl) {
    var hours = now.getHours();
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var seconds = String(now.getSeconds()).padStart(2, '0');

    if (config.format === '12h') {
        var period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        clockEl.textContent = String(hours).padStart(2, '0') + ':' + minutes + ':' + seconds + ' ' + period;
    } else {
        clockEl.textContent = String(hours).padStart(2, '0') + ':' + minutes + ':' + seconds;
    }
}
```

Replace with:

```js
function pad2(n) {
    n = String(n);
    return n.length < 2 ? '0' + n : n;
}

if (clockEl) {
    var hours = now.getHours();
    var minutes = pad2(now.getMinutes());
    var seconds = pad2(now.getSeconds());

    if (config.format === '12h') {
        var period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        clockEl.textContent = pad2(hours) + ':' + minutes + ':' + seconds + ' ' + period;
    } else {
        clockEl.textContent = pad2(hours) + ':' + minutes + ':' + seconds;
    }
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node -c js/time.js`
Expected: no output (syntax OK)

- [ ] **Step 3: Commit**

```bash
git add js/time.js
git commit -m "fix: replace padStart with inline pad2 helper for old browser support"
```

---

### Task 5: Fix `js/social.js` — replace `startsWith` with `indexOf`

**Files:**

- Modify: `js/social.js`

- [ ] **Step 1: Replace `startsWith('#')` (line 24)**

Find:

```js
            if (color && color.startsWith('#')) {
```

Replace with:

```js
            if (color && color.indexOf('#') === 0) {
```

- [ ] **Step 2: Replace `startsWith('mailto:')` (lines 37-38)**

Find:

```js
a.target = link.url.startsWith('mailto:') ? '_self' : '_blank';
a.rel = link.url.startsWith('mailto:') ? '' : 'noopener noreferrer';
```

Replace with:

```js
var isMailto = link.url.indexOf('mailto:') === 0;
a.target = isMailto ? '_self' : '_blank';
a.rel = isMailto ? '' : 'noopener noreferrer';
```

- [ ] **Step 3: Verify no syntax errors**

Run: `node -c js/social.js`
Expected: no output (syntax OK)

- [ ] **Step 4: Commit**

```bash
git add js/social.js
git commit -m "fix: replace startsWith with indexOf for IE11 compatibility"
```

---

### Task 6: CSS graceful degradation — `css/style.css`

**Files:**

- Modify: `css/style.css`

This is the largest task. Apply CSS changes in the following order.

- [ ] **Step 6a: Add `var()` fallback values throughout**

For each `var(--name)` usage that lacks a fallback, add the computed default value as a fallback. Key instances:

**body (line 78-82)** — Replace:

```css
font-family: var(--font-mono);
```

With:

```css
font-family: 'IBM Plex Mono', 'Noto Sans SC', monospace;
font-family: var(--font-mono);
```

**body color (line 81)** — Replace:

```css
color: var(--fg);
```

With:

```css
color: #0a0a0a;
color: var(--fg, #0a0a0a);
```

**body background-color (line 82)** — Replace:

```css
background-color: var(--bg);
```

With:

```css
background-color: #fffef7;
background-color: var(--bg, #fffef7);
```

Apply the same pattern (static value first, then `var()` with fallback) for all remaining `var()` usages. The complete list of properties needing fallbacks:

| Selector                                      | Property             | Fallback Value                                                                              |
| --------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `.noise-overlay` z-index                      | `z-index`            | `9999`                                                                                      |
| `.noise-overlay` z-index                      | `z-index`            | `var(--z-noise, 9999)`                                                                      |
| `.loading-overlay` background                 | `background`         | `#fffef7`                                                                                   |
| `.loading-overlay` background                 | `background`         | `var(--bg, #fffef7)`                                                                        |
| `.loading-overlay` z-index                    | `z-index`            | `var(--z-loading, 9998)`                                                                    |
| `.loading-panel` border                       | `border`             | `6px solid #0a0a0a`                                                                         |
| `.loading-panel` border                       | `border`             | `var(--border-heavy, 6px) solid var(--fg, #0a0a0a)`                                         |
| `.loading-panel` background                   | `background`         | `#fffef7`                                                                                   |
| `.loading-panel` background                   | `background`         | `var(--bg, #fffef7)`                                                                        |
| `.loading-panel` box-shadow                   | `box-shadow`         | `10px 10px 0 #0a0a0a`                                                                       |
| `.loading-panel` box-shadow                   | `box-shadow`         | `var(--shadow-offset, 10px) var(--shadow-offset, 10px) 0 var(--fg, #0a0a0a)`                |
| `.loading-spinner` border                     | `border`             | `4px solid #0a0a0a`                                                                         |
| `.loading-spinner` border                     | `border`             | `var(--border-width, 4px) solid var(--fg, #0a0a0a)`                                         |
| `.loading-spinner` background                 | `background`         | `#fffef7`                                                                                   |
| `.loading-spinner` background                 | `background`         | `var(--bg, #fffef7)`                                                                        |
| `.loading-text` font-family                   | `font-family`        | `'Space Grotesk', 'Noto Sans SC', sans-serif`                                               |
| `.loading-text` font-family                   | `font-family`        | `var(--font-display)`                                                                       |
| `.loading-text` color                         | `color`              | `#0a0a0a`                                                                                   |
| `.loading-text` color                         | `color`              | `var(--fg, #0a0a0a)`                                                                        |
| `.loading-progress` border                    | `border`             | `3px solid #0a0a0a`                                                                         |
| `.loading-progress` background                | `background`         | `#fffef7`                                                                                   |
| `.loading-bar` background                     | `background`         | `#0a0a0a`                                                                                   |
| `.loading-bar` background                     | `background`         | `var(--fg, #0a0a0a)`                                                                        |
| `.loading-percent` font-family                | `font-family`        | `'IBM Plex Mono', 'Noto Sans SC', monospace`                                                |
| `.loading-percent` color                      | `color`              | `#666666`                                                                                   |
| `.loading-percent` color                      | `color`              | `var(--muted, #666666)`                                                                     |
| `.container` border-right (in .left-panel)    | see left-panel below |                                                                                             |
| `.left-panel` padding                         | `padding`            | `3rem`                                                                                      |
| `.left-panel` padding                         | `padding`            | `var(--space-xl, 3rem)`                                                                     |
| `.left-panel` border-right                    | `border-right`       | `4px solid #0a0a0a`                                                                         |
| `.left-panel` border-right                    | `border-right`       | `var(--border-width, 4px) solid var(--fg, #0a0a0a)`                                         |
| `.left-panel` background-color                | `background-color`   | `#fffef7`                                                                                   |
| `.left-panel` background-color                | `background-color`   | `var(--bg, #fffef7)`                                                                        |
| `.left-panel` z-index                         | `z-index`            | `var(--z-content, 50)`                                                                      |
| `.right-panel` color                          | `color`              | `#fffef7`                                                                                   |
| `.right-panel` color                          | `color`              | `var(--bg, #fffef7)`                                                                        |
| `.avatar-box` border                          | `border`             | `6px solid #0a0a0a`                                                                         |
| `.avatar-box` border                          | `border`             | `var(--border-heavy, 6px) solid var(--fg, #0a0a0a)`                                         |
| `.avatar-box` margin-bottom                   | `margin`             | `0 0 2rem 0`                                                                                |
| `.avatar-box` margin-bottom                   | `margin`             | `0 0 var(--space-lg, 2rem) 0`                                                               |
| `.avatar-box` background-color                | `background-color`   | `#fffef7`                                                                                   |
| `.avatar-box` background-color                | `background-color`   | `var(--bg, #fffef7)`                                                                        |
| `.avatar-box` box-shadow                      | `box-shadow`         | `10px 10px 0 #0a0a0a`                                                                       |
| `.avatar-box` box-shadow                      | `box-shadow`         | `var(--shadow-offset, 10px) var(--shadow-offset, 10px) 0 var(--fg, #0a0a0a)`                |
| `.name` font-family                           | `font-family`        | `'Space Grotesk', 'Noto Sans SC', sans-serif`                                               |
| `.name` font-family                           | `font-family`        | `var(--font-display)`                                                                       |
| `.name` color                                 | `color`              | `#0a0a0a`                                                                                   |
| `.name` color                                 | `color`              | `var(--fg, #0a0a0a)`                                                                        |
| `.name` margin-bottom                         | `margin-bottom`      | `var(--space-sm, 1rem)`                                                                     |
| `.status-bar` gap                             | `gap`                | `var(--space-xs, 0.5rem)`                                                                   |
| `.status-bar` padding                         | `padding`            | `var(--space-xs, 0.5rem) var(--space-sm, 1rem)`                                             |
| `.status-bar` background-color                | `background-color`   | `#fffef7`                                                                                   |
| `.status-bar` background-color                | `background-color`   | `var(--bg, #fffef7)`                                                                        |
| `.status-bar` margin-bottom                   | `margin-bottom`      | `var(--space-lg, 2rem)`                                                                     |
| `.status-dot` background-color                | `background-color`   | `#ffe600`                                                                                   |
| `.status-dot` background-color                | `background-color`   | `var(--accent-yellow, #ffe600)`                                                             |
| `.status-dot` border                          | `border`             | `2px solid #0a0a0a`                                                                         |
| `.status-text` color                          | `color`              | `#0a0a0a`                                                                                   |
| `.status-text` color                          | `color`              | `var(--fg, #0a0a0a)`                                                                        |
| `.bio-container` margin-bottom                | `margin-bottom`      | `var(--space-xl, 3rem)`                                                                     |
| `.bio-container` padding                      | `padding`            | `var(--space-md, 1.5rem)`                                                                   |
| `.bio-container` border                       | `border`             | `var(--border-width, 4px) solid #0a0a0a`                                                    |
| `.bio-container` box-shadow                   | `box-shadow`         | `var(--shadow-offset-sm, 6px) var(--shadow-offset-sm, 6px) 0 rgba(0,0,0,0.1)`               |
| `.bio` font-family                            | `font-family`        | `var(--font-mono)` with fallback                                                            |
| `.bio` color                                  | `color`              | `var(--fg, #0a0a0a)`                                                                        |
| `.typewriter-cursor` color                    | `color`              | `var(--accent-blue, #3e59ff)`                                                               |
| `.social-links` gap                           | `gap`                | `var(--space-sm, 1rem)`                                                                     |
| `.social-link` gap                            | `gap`                | `var(--space-xs, 0.5rem)`                                                                   |
| `.social-link` padding                        | `padding`            | `var(--space-md, 1.5rem)`                                                                   |
| `.social-link` border                         | `border`             | `var(--border-width, 4px) solid #0a0a0a`                                                    |
| `.social-link` background-color               | `background-color`   | `#fffef7`                                                                                   |
| `.social-link` background-color               | `background-color`   | `var(--bg, #fffef7)`                                                                        |
| `.social-link` color                          | `color`              | `#0a0a0a`                                                                                   |
| `.social-link` color                          | `color`              | `var(--fg, #0a0a0a)`                                                                        |
| `.social-link--yellow` box-shadow             | `box-shadow`         | `var(--shadow-offset-sm, 6px) var(--shadow-offset-sm, 6px) 0 var(--accent-yellow, #ffe600)` |
| `.social-link--yellow:hover` background-color | `background-color`   | `var(--accent-yellow, #ffe600)`                                                             |
| `.social-link--red` box-shadow                | `box-shadow`         | `var(--shadow-offset-sm, 6px) var(--shadow-offset-sm, 6px) 0 var(--accent-red, #ff3e3e)`    |
| `.social-link--red:hover` background-color    | `background-color`   | `var(--accent-red, #ff3e3e)`                                                                |
| `.social-link--blue` box-shadow               | `box-shadow`         | `var(--shadow-offset-sm, 6px) var(--shadow-offset-sm, 6px) 0 var(--accent-blue, #3e59ff)`   |
| `.social-link--blue:hover` background-color   | `background-color`   | `var(--accent-blue, #3e59ff)`                                                               |
| `.social-link--custom` box-shadow             | `box-shadow`         | `var(--shadow-offset-sm, 6px) var(--shadow-offset-sm, 6px) 0 var(--custom-color, #ff6b6b)`  |
| `.social-link--custom:hover` box-shadow       | `box-shadow`         | `10px 10px 0 var(--custom-color, #ff6b6b)`                                                  |
| `.social-link--custom:hover` background-color | `background-color`   | `var(--custom-color, #ff6b6b)`                                                              |
| `.link-label` font-family                     | `font-family`        | `var(--font-mono)` with fallback                                                            |
| `.footer-left` padding-top                    | `padding-top`        | `var(--space-lg, 2rem)`                                                                     |
| `.footer-line` height                         | `height`             | `var(--border-width, 4px)`                                                                  |
| `.footer-line` background-color               | `background-color`   | `#0a0a0a`                                                                                   |
| `.footer-line` background-color               | `background-color`   | `var(--fg, #0a0a0a)`                                                                        |
| `.footer-line` margin-bottom                  | `margin-bottom`      | `var(--space-sm, 1rem)`                                                                     |
| `.footer-text` font-family                    | `font-family`        | `var(--font-mono)` with fallback                                                            |
| `.footer-text` color                          | `color`              | `#666666`                                                                                   |
| `.footer-text` color                          | `color`              | `var(--muted, #666666)`                                                                     |
| `.weekday` font-family                        | `font-family`        | `var(--font-display)` with fallback                                                         |
| `.weekday` color                              | `color`              | `#fffef7`                                                                                   |
| `.weekday` color                              | `color`              | `var(--bg, #fffef7)`                                                                        |
| `.weekday` margin-bottom                      | `margin-bottom`      | `var(--space-xs, 0.5rem)`                                                                   |
| `.date-display` font-family                   | `font-family`        | `var(--font-mono)` with fallback                                                            |
| `.clock` font-family                          | `font-family`        | `var(--font-mono)` with fallback                                                            |
| `.clock` color                                | `color`              | `#ffe600`                                                                                   |
| `.clock` color                                | `color`              | `var(--accent-yellow, #ffe600)`                                                             |
| `.wallpaper-scroll-area` z-index              | `z-index`            | `var(--z-wallpaper, 0)`                                                                     |
| `.wallpaper-scroll-area` background-color     | `background-color`   | `#fffef7`                                                                                   |
| `.wallpaper-scroll-area` background-color     | `background-color`   | `var(--bg, #fffef7)`                                                                        |
| `.wallpaper-image` border-bottom              | `border-bottom`      | `var(--border-heavy, 6px) solid #0a0a0a`                                                    |
| `.wallpaper-toggle` border                    | `border`             | `var(--border-width, 4px) solid #0a0a0a`                                                    |
| `.wallpaper-toggle` background                | `background`         | `#fffef7`                                                                                   |
| `.wallpaper-toggle` background                | `background`         | `var(--bg, #fffef7)`                                                                        |
| `.wallpaper-toggle` color                     | `color`              | `#0a0a0a`                                                                                   |
| `.wallpaper-toggle` color                     | `color`              | `var(--fg, #0a0a0a)`                                                                        |
| `.wallpaper-toggle` box-shadow                | `box-shadow`         | `var(--shadow-offset-sm, 6px) var(--shadow-offset-sm, 6px) 0 #0a0a0a`                       |
| `.wallpaper-toggle.active` background         | `background`         | `#ffe600`                                                                                   |
| `.wallpaper-toggle.active` background         | `background`         | `var(--accent-yellow, #ffe600)`                                                             |
| `.wallpaper-toggle` z-index                   | `z-index`            | `var(--z-buttons, 1000)`                                                                    |
| `.close-panel` z-index                        | `z-index`            | `calc(var(--z-buttons, 1000) + 2)`                                                          |
| `.info-panel` padding                         | `padding`            | `var(--space-md, 1.5rem)`                                                                   |
| `.info-panel` z-index                         | `z-index`            | `var(--z-content, 50)`                                                                      |
| `.right-panel-shadow` z-index                 | `z-index`            | `10`                                                                                        |

> **Implementation note:** The pattern is always: `property: <static-fallback>;` on one line, then `property: var(--name, <static-fallback>);` on the next. IE11 ignores the `var()` line and uses the static value above it.

- [ ] **Step 6b: Add `clamp()` fallbacks**

For each `clamp()` usage, add a static fallback value on the preceding line:

`.avatar-box` width/height (lines 357-358):

```css
width: 150px;
width: clamp(100px, 12vw, 150px);
height: 150px;
height: clamp(100px, 12vw, 150px);
```

`.name` font-size (line 388):

```css
font-size: 3.5rem;
font-size: clamp(2rem, 5vw, 3.5rem);
```

`.weekday` font-size (line 577):

```css
font-size: 5rem;
font-size: clamp(3rem, 8vw, 5rem);
```

`.date-display` font-size (line 588):

```css
font-size: 1.5rem;
font-size: clamp(1rem, 3vw, 1.5rem);
```

`.clock` font-size (line 595):

```css
font-size: 3rem;
font-size: clamp(2rem, 5vw, 3rem);
```

- [ ] **Step 6c: Expand `inset` shorthand to four properties**

`.info-panel::after` (line 346-347) — Replace:

```css
inset: 0;
```

With:

```css
top: 0;
right: 0;
bottom: 0;
left: 0;
```

`.right-panel-shadow` (line 604) — Replace:

```css
inset: 0;
```

With:

```css
top: 0;
right: 0;
bottom: 0;
left: 0;
```

Hover pseudo-element `inset: -15px` (line 809) — Replace:

```css
inset: -15px;
```

With:

```css
top: -15px;
right: -15px;
bottom: -15px;
left: -15px;
```

- [ ] **Step 6d: Add `backdrop-filter` fallback with `@supports`**

Replace the `.info-panel` background and backdrop section:

```css
.info-panel {
    padding: var(--space-md, 1.5rem);
    padding-bottom: 0;
    background: rgba(10, 10, 10, 0.92);
    border-bottom: 1px solid rgba(255, 254, 247, 0.15);
    box-shadow:
        0 8px 40px rgba(0, 0, 0, 0.35),
        0 16px 64px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 254, 247, 0.12),
        inset 0 -1px 0 rgba(0, 0, 0, 0.15),
        inset 0 0 0 1px rgba(255, 254, 247, 0.05);
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: var(--z-content, 50);
}

@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
    .info-panel {
        background: rgba(10, 10, 10, 0.75);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
    }
}
```

- [ ] **Step 6e: Add Flexbox fallback for `.social-links` Grid**

Replace the `.social-links` block:

```css
.social-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm, 1rem);
}

@supports (display: grid) {
    .social-links {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    }
}
```

Add flex-basis fallback for `.social-link` inside the flex layout:

```css
.social-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs, 0.5rem);
    padding: var(--space-md, 1.5rem);
    border: var(--border-width, 4px) solid var(--fg, #0a0a0a);
    background-color: var(--bg, #fffef7);
    color: var(--fg, #0a0a0a);
    text-decoration: none;
    position: relative;
    flex: 0 0 calc(33.333% - 0.67rem);
    max-width: calc(33.333% - 0.67rem);
    transition:
        transform 0.08s cubic-bezier(0.2, 0, 0, 1),
        box-shadow 0.08s cubic-bezier(0.2, 0, 0, 1);
}

@supports (display: grid) {
    .social-link {
        flex: none;
        max-width: none;
    }
}
```

Also update the mobile override for `.social-links` (line 754):

```css
.social-links {
    flex-wrap: wrap;
}

@supports (display: grid) {
    .social-links {
        grid-template-columns: repeat(2, 1fr);
    }
}

.social-link {
    flex: 0 0 calc(50% - 0.5rem);
    max-width: calc(50% - 0.5rem);
}

@supports (display: grid) {
    .social-link {
        flex: none;
        max-width: none;
    }
}
```

- [ ] **Step 6f: Add `object-fit` fallback for IE11**

Add this at the end of the CSS file:

```css
.no-object-fit .avatar-image {
    display: none;
}

.no-object-fit .avatar-box {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}
```

- [ ] **Step 6g: Add `fill` gap fallback for `.loading-panel`**

Replace:

```css
gap: 1.5rem;
```

With:

```css
gap: 1.5rem;
```

Add fallback spacing for IE11 (which doesn't support gap in flexbox) — add after `.loading-panel`:

```css
/* IE11 flexbox gap fallback */
.loading-panel > * + * {
    margin-top: 1.5rem;
}

@supports (gap: 1.5rem) {
    .loading-panel > * + * {
        margin-top: 0;
    }
}
```

Do the same for `.status-bar` gap:

```css
.status-bar {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs, 0.5rem);
    padding: var(--space-xs, 0.5rem) var(--space-sm, 1rem);
    border: 3px solid var(--fg, #0a0a0a);
    background-color: var(--bg, #fffef7);
    margin-bottom: var(--space-lg, 2rem);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

.status-dot {
    margin-right: var(--space-xs, 0.5rem);
}

@supports (gap: 0.5rem) {
    .status-dot {
        margin-right: 0;
    }
}
```

Similarly for `.social-link` gap:

```css
.social-link {
    ...
}
/* IE11 flexbox gap fallback */
.social-link > * + * {
    margin-top: var(--space-xs, 0.5rem);
}

@supports (gap: 0.5rem) {
    .social-link > * + * {
        margin-top: 0;
    }
}
```

And `.wallpaper-toggle` (which has justify-content: center instead of gap, so no change needed).

- [ ] **Step 6h: Run format check**

Run: `npm run format:check`
Expected: All files pass (may need `npm run format` if there are issues)

- [ ] **Step 6i: Commit**

```bash
git add css/style.css
git commit -m "feat: add CSS graceful degradation for IE11/old browsers"
```

---

### Task 7: Add object-fit JS detection in `js/social.js`

**Files:**

- Modify: `js/social.js`

- [ ] **Step 1: Add object-fit detection at the end of the IIFE**

Find the closing `window.applyProfileConfig = applyProfileConfig;` section. After `applyProfileConfig` definition and before `window.initSocialLinks`, add:

```js
function detectObjectFit() {
    if (!('objectFit' in document.documentElement.style)) {
        document.documentElement.className += ' no-object-fit';
    }
}

detectObjectFit();
```

Then update the avatar image setup in `applyProfileConfig` to set background-image when object-fit is unsupported:

Find in `applyProfileConfig`:

```js
var avatarImg = document.querySelector('.avatar-image');
if (avatarImg && config.avatar) {
    avatarImg.src = config.avatar;
}
```

Replace with:

```js
var avatarImg = document.querySelector('.avatar-image');
var avatarBox = document.getElementById('avatarBox');
if (config.avatar) {
    if (avatarImg) avatarImg.src = config.avatar;
    if (avatarBox && !('objectFit' in document.documentElement.style)) {
        avatarBox.style.backgroundImage = 'url(' + config.avatar + ')';
    }
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node -c js/social.js`
Expected: no output (syntax OK)

- [ ] **Step 3: Commit**

```bash
git add js/social.js
git commit -m "feat: add object-fit JS detection and fallback for IE11"
```

---

### Task 8: Update `index.html`

**Files:**

- Modify: `index.html`

- [ ] **Step 1: Add X-UA-Compatible meta tag**

After `<meta charset="UTF-8" />` (line 4), add:

```html
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
```

- [ ] **Step 2: Add polyfills.js script tag**

After `<script src="config.js"></script>` (line 143), add:

```html
<!-- Polyfill -->
<script src="js/polyfills.js"></script>
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add polyfills.js and IE=edge meta to index.html"
```

---

### Task 9: Update `build.js`

**Files:**

- Modify: `build.js`

- [ ] **Step 1: Update terser config to target ES5**

Find the terser minify call (around line 51):

```js
const result = await minify(code, {
    compress: { drop_console: false },
    mangle: true
});
```

Replace with:

```js
const result = await minify(code, {
    compress: { drop_console: false, ecma: 5 },
    output: { ecma: 5 },
    mangle: true
});
```

- [ ] **Step 2: Verify build still works**

Run: `npm run build`
Expected: Build completes without errors, output in `dist/`

- [ ] **Step 3: Commit**

```bash
git add build.js
git commit -m "fix: set terser output ecma to 5 for build compatibility"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Run format check**

Run: `npm run format:check`
Expected: All files pass

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build completes successfully

- [ ] **Step 4: Verify all JS files parse as valid ES5**

Run: `node -c js/polyfills.js && node -c js/wallpaper.js && node -c js/main.js && node -c js/time.js && node -c js/social.js`
Expected: No output (all valid)

- [ ] **Step 5: Commit lint/format fixes if needed**

If any auto-fixes were applied:

```bash
git add -A
git commit -m "style: lint and format fixes for browser compatibility changes"
```
