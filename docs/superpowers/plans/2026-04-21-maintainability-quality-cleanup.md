# Maintainability And Quality Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current static site easier to maintain by shrinking `js/app.js` into an orchestrator, isolating page bootstrap concerns, simplifying config validation internals, and adding targeted regression coverage without changing the public behavior of the site.

**Architecture:** Keep the existing ESM static-site structure, but move page-scoped startup helpers into a dedicated bootstrap module and reorganize `WallpaperScroller` internals around smaller responsibilities. Preserve `WallpaperScroller` as the public runtime API, keep `validate()` as a hand-written validator, and use small Node test files with lightweight DOM stubs to cover startup and regression-prone behavior.

**Tech Stack:** Vanilla JavaScript ES modules, Node.js built-in test runner, ESLint, Prettier, static HTML/CSS build script

---

## File Structure Map

- Modify: `js/app.js`
  - Responsibility: runtime orchestration only; validate config, branch on compatibility mode, and call page/bootstrap helpers in a clear order.
- Create: `js/bootstrap.js`
  - Responsibility: page-scoped DOM helpers such as revealing the main content, config-failure fallback UI, legacy loading text downgrade, scroll animations, and mobile sticky avatar setup.
- Modify: `js/validate-config.js`
  - Responsibility: keep the same validation contract while centralizing nested-path access and type assertion logic.
- Modify: `js/wallpaper.js`
  - Responsibility: preserve `WallpaperScroller` as the exported constructor while splitting internal behavior into smaller methods for retry logic, placeholder lifecycle, and cleanup.
- Create: `tests/bootstrap.test.mjs`
  - Responsibility: regression tests for config-failure fallback and legacy loading text logic using lightweight DOM stubs.
- Modify: `tests/validate-config.test.mjs`
  - Responsibility: expand validator coverage for nested missing fields, invalid link fields, and repeated path lookups.
- Create: `tests/wallpaper.test.mjs`
  - Responsibility: targeted tests for cleanup and retry behavior that avoid real network requests.

### Task 1: Extract Page Bootstrap Helpers And Thin `app.js`

**Files:**
- Create: `js/bootstrap.js`
- Create: `tests/bootstrap.test.mjs`
- Modify: `js/app.js:33-235`

- [ ] **Step 1: Write the failing bootstrap tests**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { revealMainContent, showConfigFailureState, simplifyLegacyLoadingText } from '../js/bootstrap.js';

function createElement() {
    const classes = new Set();
    return {
        textContent: '',
        className: '',
        dataset: {},
        getAttribute(name) {
            return this.dataset[name.replace('data-', '').replace(/-([a-z])/g, function (_, char) {
                return char.toUpperCase();
            })];
        },
        classList: {
            add(name) {
                classes.add(name);
            },
            contains(name) {
                return classes.has(name);
            }
        }
    };
}

describe('bootstrap helpers', () => {
    it('revealMainContent adds visible and hidden classes', () => {
        const container = createElement();
        const overlay = createElement();

        revealMainContent({
            documentRef: {
                querySelector(selector) {
                    return selector === '.container' ? container : null;
                },
                getElementById(id) {
                    return id === 'loadingOverlay' ? overlay : null;
                }
            },
            utilsRef: {
                addClass(element, className) {
                    element.classList.add(className);
                }
            }
        });

        assert.ok(container.classList.contains('visible'));
        assert.ok(overlay.classList.contains('hidden'));
    });

    it('showConfigFailureState logs every config error and reveals the page shell', () => {
        const container = createElement();
        const overlay = createElement();
        const logged = [];

        showConfigFailureState(['profile.name is missing', 'wallpaper.apis must be an array'], {
            documentRef: {
                querySelector(selector) {
                    return selector === '.container' ? container : null;
                },
                getElementById(id) {
                    return id === 'loadingOverlay' ? overlay : null;
                }
            },
            utilsRef: {
                addClass(element, className) {
                    element.classList.add(className);
                }
            },
            consoleRef: {
                error(message) {
                    logged.push(message);
                }
            }
        });

        assert.deepStrictEqual(logged, ['[CONFIG] profile.name is missing', '[CONFIG] wallpaper.apis must be an array']);
        assert.ok(container.classList.contains('visible'));
        assert.ok(overlay.classList.contains('hidden'));
    });

    it('simplifyLegacyLoadingText swaps to the legacy loading text only in compat mode', () => {
        const loadingText = createElement();
        loadingText.dataset.legacyText = 'Loading...';
        loadingText.textContent = '少女祈祷中...';

        simplifyLegacyLoadingText({
            documentRef: {
                getElementById(id) {
                    return id === 'loadingText' ? loadingText : null;
                }
            },
            utilsRef: {
                isLegacyCompatMode() {
                    return true;
                }
            }
        });

        assert.strictEqual(loadingText.textContent, 'Loading...');
    });
});
```

- [ ] **Step 2: Run the new bootstrap test file and verify it fails**

Run: `node --test tests/bootstrap.test.mjs -v`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `../js/bootstrap.js`

- [ ] **Step 3: Implement `js/bootstrap.js` with explicit dependency injection points for tests**

```javascript
import { logger } from './logger.js';
import { utils } from './utils.js';

export function revealMainContent(options) {
    const deps = options || {};
    const documentRef = deps.documentRef || document;
    const utilsRef = deps.utilsRef || utils;
    const main = documentRef.querySelector('.container');
    const overlay = documentRef.getElementById('loadingOverlay');

    utilsRef.addClass(main, 'visible');
    utilsRef.addClass(overlay, 'hidden');
}

export function showConfigFailureState(errors, options) {
    const deps = options || {};
    const consoleRef = deps.consoleRef || console;

    errors.forEach(function (error) {
        consoleRef.error('[CONFIG] ' + error);
    });

    revealMainContent(options);
}

export function simplifyLegacyLoadingText(options) {
    const deps = options || {};
    const documentRef = deps.documentRef || document;
    const utilsRef = deps.utilsRef || utils;
    const loadingText = documentRef.getElementById('loadingText');

    if (!utilsRef.isLegacyCompatMode() || !loadingText) {
        return;
    }

    const legacyText = loadingText.getAttribute('data-legacy-text');
    if (legacyText) {
        loadingText.textContent = legacyText;
    }
}

export function initScrollAnimations(config, options) {
    const deps = options || {};
    const documentRef = deps.documentRef || document;
    const loggerRef = deps.loggerRef || logger;
    const observerFactory =
        deps.observerFactory ||
        function (callback, observerOptions) {
            return new IntersectionObserver(callback, observerOptions);
        };

    if (!config || !config.enabled) {
        return null;
    }

    const targets = documentRef.querySelectorAll(
        '.social-link, .info-panel, .wallpaper-info, .avatar-box, .name, .status-bar'
    );
    if (!targets.length) {
        return null;
    }

    targets.forEach(function (element, index) {
        element.classList.add('scroll-reveal');
        element.style.transitionDelay = index * config.delay + 'ms';
    });

    const observer = observerFactory(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('scroll-reveal--visible');
                }
            });
        },
        {
            root: null,
            rootMargin: '0px 0px -' + config.offset + 'px 0px',
            threshold: 0.1
        }
    );

    targets.forEach(function (element) {
        observer.observe(element);
    });

    loggerRef.log('[滚动动画] 已初始化，监听元素:', targets.length);
    return observer;
}

export function initMobileStickyAvatar(options) {
    const deps = options || {};
    const documentRef = deps.documentRef || document;
    const windowRef = deps.windowRef || window;
    const utilsRef = deps.utilsRef || utils;
    const loggerRef = deps.loggerRef || logger;
    const container = documentRef.querySelector('.container');
    const leftPanel = documentRef.querySelector('.left-panel');
    const avatarBox = documentRef.getElementById('avatarBox');

    if (!container || !leftPanel || !avatarBox) {
        return;
    }

    function getScrollContainer() {
        return utilsRef.isMobile() ? container : leftPanel;
    }

    function handleScroll() {
        if (!utilsRef.isMobile()) {
            return;
        }

        const scrolled = getScrollContainer().scrollTop > 50;
        avatarBox.classList.toggle('scrolled', scrolled);
    }

    avatarBox.addEventListener('click', function () {
        if (!utilsRef.isMobile()) {
            return;
        }

        const scrollContainer = getScrollContainer();
        if (scrollContainer.scrollTop > 50) {
            if ('scrollBehavior' in documentRef.documentElement.style) {
                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                scrollContainer.scrollTo(0, 0);
            }
        }
    });

    container.addEventListener('scroll', handleScroll);
    leftPanel.addEventListener('scroll', handleScroll);
    windowRef.addEventListener(
        'resize',
        utilsRef.debounce(function () {
            if (!utilsRef.isMobile()) {
                avatarBox.classList.remove('scrolled');
            }
        }, 150)
    );

    loggerRef.log('[粘性头像] 已初始化');
}
```

- [ ] **Step 4: Update `js/app.js` to import and use the bootstrap helpers instead of in-file implementations**

```javascript
import {
    initMobileStickyAvatar,
    initScrollAnimations,
    revealMainContent,
    showConfigFailureState,
    simplifyLegacyLoadingText
} from './bootstrap.js';

const validationResult = validate(CONFIG);
if (!validationResult.valid) {
    showConfigFailureState(validationResult.errors);
    throw new Error('Config validation failed: ' + validationResult.errors.join('; '));
}

const isLegacyMode = utils.isLegacyCompatMode();

(function initWallpaper() {
    if (isLegacyMode) {
        logger.log('[兼容模式] 跳过壁纸模块');
        revealMainContent();
        return;
    }

    try {
        const wallpaper = new WallpaperScroller(
            'wallpaperScrollArea',
            CONFIG.wallpaper,
            CONFIG.loading,
            function onWallpaperReady() {
                revealMainContent();
            }
        );

        wallpaper.init();
        logger.log('[壁纸] 模块已初始化');
    } catch (error) {
        console.error('[壁纸] 初始化失败', error);
        revealMainContent();
    }
})();

(function initComplete() {
    simplifyLegacyLoadingText();
    initSocialLinks();
    applyProfileConfig();

    if (isLegacyMode) {
        revealMainContent();
        logger.log('[兼容模式] 仅保留基础资料与社交链接');
        return;
    }

    initTypewriter();
    initTime();
    initScrollAnimations(CONFIG.effects && CONFIG.effects.scrollReveal);
    initMobileStickyAvatar();

    logger.log('%c个人主页脚本已加载', 'color: #FFE600; font-size: 12px;');
    logger.log('功能：打字机效果 (Slogan 循环) | 时间显示 | 壁纸轮播');
})();
```

- [ ] **Step 5: Run bootstrap tests and the existing slogan selector tests**

Run: `node --test tests/bootstrap.test.mjs tests/slogan-selector.test.mjs -v`
Expected: PASS for both files

- [ ] **Step 6: Commit the orchestration extraction**

```bash
git add js/app.js js/bootstrap.js tests/bootstrap.test.mjs
git commit -m "refactor: extract page bootstrap helpers"
```

### Task 2: Refactor `validate-config.js` Without Changing Its Contract

**Files:**
- Modify: `js/validate-config.js:6-132`
- Modify: `tests/validate-config.test.mjs:1-41`

- [ ] **Step 1: Add failing validator tests for missing profile fields and invalid wallpaper API entries**

```javascript
it('reports missing profile.avatar', () => {
    const config = JSON.parse(JSON.stringify(CONFIG));
    delete config.profile.avatar;

    const result = validate(config);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes('profile.avatar is missing'));
});

it('reports non-string wallpaper api entries', () => {
    const config = JSON.parse(JSON.stringify(CONFIG));
    config.wallpaper.apis = ['https://valid.example', 42, null];

    const result = validate(config);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes('wallpaper.apis[1] must be a non-empty string'));
    assert.ok(result.errors.includes('wallpaper.apis[2] must be a non-empty string'));
});
```

- [ ] **Step 2: Run the validator test file and confirm the new assertions fail first**

Run: `node --test tests/validate-config.test.mjs -v`
Expected: FAIL because the current validator does not yet verify individual `wallpaper.apis` entries

- [ ] **Step 3: Replace duplicated traversal with centralized helper functions in `js/validate-config.js`**

```javascript
function getValueAtPath(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length; i++) {
        if (current === undefined || current === null) {
            return { exists: false, value: undefined };
        }
        current = current[parts[i]];
    }

    if (current === undefined || current === null) {
        return { exists: false, value: undefined };
    }

    return { exists: true, value: current };
}

function pushMissing(errors, path) {
    errors.push(path + ' is missing');
}

function checkExists(errors, obj, path) {
    const result = getValueAtPath(obj, path);
    if (!result.exists) {
        pushMissing(errors, path);
        return false;
    }
    return true;
}

function checkRequired(errors, obj, path, type, extra) {
    const result = getValueAtPath(obj, path);
    if (!result.exists) {
        pushMissing(errors, path);
        return;
    }

    const current = result.value;
    if (type === 'string') {
        if (typeof current !== 'string') {
            errors.push(path + ' must be a string');
        } else if (extra === 'nonEmpty' && current.length === 0) {
            errors.push(path + ' must be non-empty');
        }
        return;
    }

    if (type === 'number') {
        if (typeof current !== 'number') {
            errors.push(path + ' must be a number');
        } else if (extra === 'positive' && current <= 0) {
            errors.push(path + ' must be a positive number');
        }
        return;
    }

    if (type === 'array') {
        if (!Array.isArray(current)) {
            errors.push(path + ' must be an array');
        } else if (extra === 'nonEmpty' && current.length === 0) {
            errors.push(path + ' must be a non-empty array');
        }
        return;
    }

    if (type === 'enum' && !extra.includes(current)) {
        errors.push(path + ' must be one of: ' + extra.join(', '));
    }
}

export function validate(config) {
    const errors = [];

    checkExists(errors, config, 'profile');
    checkExists(errors, config, 'socialLinks');
    checkExists(errors, config, 'slogans');
    checkExists(errors, config, 'wallpaper');
    checkExists(errors, config, 'time');
    checkExists(errors, config, 'loading');
    checkExists(errors, config, 'debug');

    if (config.profile) {
        checkRequired(errors, config.profile, 'name', 'string', 'nonEmpty');
        checkRequired(errors, config.profile, 'status', 'string');
        checkRequired(errors, config.profile, 'avatar', 'string');
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}
```

- [ ] **Step 4: Re-apply the existing detailed social, slogan, wallpaper, and time rules on top of the centralized helpers**

```javascript
if (config.socialLinks) {
    checkRequired(errors, config.socialLinks, 'links', 'array', 'nonEmpty');
    if (Array.isArray(config.socialLinks.links)) {
        config.socialLinks.links.forEach(function (link, i) {
            const prefix = 'socialLinks.links[' + i + ']';
            if (typeof link.name !== 'string' || link.name.length === 0) {
                errors.push(prefix + '.name must be a non-empty string');
            }
            if (typeof link.url !== 'string' || link.url.length === 0) {
                errors.push(prefix + '.url must be a non-empty string');
            }
            if (link.icon !== undefined && typeof link.icon !== 'string') {
                errors.push(prefix + '.icon must be a string');
            }
            if (link.color !== undefined && typeof link.color !== 'string') {
                errors.push(prefix + '.color must be a string');
            }
        });
    }
    checkRequired(errors, config.socialLinks, 'colorScheme', 'enum', ['cycle', 'same']);
}

if (config.slogans) {
    checkRequired(errors, config.slogans, 'list', 'array', 'nonEmpty');
    if (Array.isArray(config.slogans.list)) {
        config.slogans.list.forEach(function (slogan, i) {
            if (typeof slogan !== 'string') {
                errors.push('slogans.list[' + i + '] must be a string');
            }
        });
    }
    checkRequired(errors, config.slogans, 'mode', 'enum', ['random', 'sequence']);
    checkRequired(errors, config.slogans, 'typeSpeed', 'number', 'positive');
    checkRequired(errors, config.slogans, 'pauseDuration', 'number', 'positive');
}

if (config.wallpaper) {
    checkRequired(errors, config.wallpaper, 'apis', 'array', 'nonEmpty');
    if (Array.isArray(config.wallpaper.apis)) {
        config.wallpaper.apis.forEach(function (api, i) {
            if (typeof api !== 'string' || api.length === 0) {
                errors.push('wallpaper.apis[' + i + '] must be a non-empty string');
            }
        });
    }
    checkRequired(errors, config.wallpaper, 'raceTimeout', 'number', 'positive');
    checkRequired(errors, config.wallpaper, 'maxRetries', 'number', 'positive');
    checkRequired(errors, config.wallpaper, 'preloadCount', 'number', 'positive');
}

if (config.time) {
    checkRequired(errors, config.time, 'format', 'enum', ['24h', '12h']);
    checkRequired(errors, config.time, 'updateInterval', 'number', 'positive');
}
```

- [ ] **Step 5: Run the validator tests again**

Run: `node --test tests/validate-config.test.mjs -v`
Expected: PASS with all existing and newly added cases green

- [ ] **Step 6: Commit the validator cleanup**

```bash
git add js/validate-config.js tests/validate-config.test.mjs
git commit -m "refactor: simplify config validation helpers"
```

### Task 3: Reorganize `WallpaperScroller` Internals And Add Safe Regression Coverage

**Files:**
- Modify: `js/wallpaper.js:8-372`
- Create: `tests/wallpaper.test.mjs`

- [ ] **Step 1: Write failing wallpaper tests for cleanup and retry behavior**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WallpaperScroller } from '../js/wallpaper.js';

describe('WallpaperScroller internals', () => {
    it('cleanup removes oldest placeholders beyond maxImages', () => {
        const removed = [];
        const scroller = new WallpaperScroller('wallpaperScrollArea', { apis: ['https://a.example'] }, {}, function () {});
        scroller.maxImages = 2;
        scroller.images = [
            {
                dataset: { index: '0', loaded: 'true', loading: 'true' },
                remove() {
                    removed.push('0');
                }
            },
            {
                dataset: { index: '1' },
                remove() {
                    removed.push('1');
                }
            },
            {
                dataset: { index: '2' },
                remove() {
                    removed.push('2');
                }
            }
        ];
        scroller.observer = {
            unobserve() {}
        };

        scroller._cleanupOverflowImages();

        assert.deepStrictEqual(removed, ['0']);
        assert.strictEqual(scroller.images.length, 2);
    });

    it('loadWithRetry retries until race loading succeeds', async () => {
        const scroller = new WallpaperScroller('wallpaperScrollArea', { apis: ['https://a.example'], maxRetries: 3 }, {}, function () {});
        let attempts = 0;
        const originalSetTimeout = global.setTimeout;

        scroller._raceLoadImage = function () {
            attempts++;
            if (attempts < 3) {
                return Promise.reject(new Error('temporary'));
            }
            return Promise.resolve({ src: 'ok' });
        };

        global.setTimeout = function (fn) {
            fn();
            return 0;
        };

        try {
            const result = await scroller._loadWithRetry(5);
            assert.deepStrictEqual(result, { src: 'ok' });
            assert.strictEqual(attempts, 3);
        } finally {
            global.setTimeout = originalSetTimeout;
        }
    });
});
```

- [ ] **Step 2: Run the wallpaper test file and confirm it fails because the helper structure is not present yet**

Run: `node --test tests/wallpaper.test.mjs -v`
Expected: FAIL with `_cleanupOverflowImages is not a function`

- [ ] **Step 3: Split placeholder and retry responsibilities into named private methods without changing the exported constructor**

```javascript
WallpaperScroller.prototype._appendPlaceholder = function (placeholder) {
    this.container.appendChild(placeholder);
    this.images.push(placeholder);
};

WallpaperScroller.prototype._observePlaceholder = function (placeholder) {
    if (this.observer) {
        this.observer.observe(placeholder);
    }
};

WallpaperScroller.prototype._cleanupOverflowImages = function () {
    while (this.images.length > this.maxImages) {
        const oldest = this.images.shift();
        if (this.observer) {
            this.observer.unobserve(oldest);
        }
        delete oldest.dataset.index;
        delete oldest.dataset.loaded;
        delete oldest.dataset.loading;
        oldest.remove();
    }
};

WallpaperScroller.prototype._getRetryDelay = function (attempt) {
    return Math.min(1000 * Math.pow(2, attempt - 1), 8000);
};

WallpaperScroller.prototype._waitForRetry = function (attempt) {
    const delay = this._getRetryDelay(attempt);
    return new Promise(function (resolve) {
        setTimeout(resolve, delay);
    });
};
```

- [ ] **Step 4: Rewrite the existing call sites to use the new internal helper boundaries**

```javascript
WallpaperScroller.prototype._addPlaceholders = function (count) {
    for (let i = 0; i < count; i++) {
        const placeholder = this._createPlaceholder();
        placeholder.dataset.index = this.imageCounter++;
        this._appendPlaceholder(placeholder);
        this._observePlaceholder(placeholder);
    }
};

WallpaperScroller.prototype._loadWithRetry = function (index) {
    const self = this;
    let attempt = 0;

    function tryLoad() {
        attempt++;

        return self._raceLoadImage(index).catch(function (error) {
            logger.log('[壁纸] 加载中... (' + attempt + '/' + self.maxRetries + ')');
            if (attempt >= self.maxRetries) {
                throw error;
            }
            return self._waitForRetry(attempt).then(function () {
                return tryLoad();
            });
        });
    }

    return tryLoad();
};

WallpaperScroller.prototype._autoScroll = function () {
    const self = this;
    const scrollBottom = this.container.scrollTop + this.container.clientHeight;

    if (this.isDestroyed) {
        return;
    }

    this.container.scrollTop += this.scrollSpeed;

    if (this.container.scrollHeight - scrollBottom < this.loadThreshold) {
        this._addPlaceholders(this.batchSize);
        this._cleanupOverflowImages();
    }

    this.autoScrollId = requestAnimationFrame(function () {
        self._autoScroll();
    });
};
```

- [ ] **Step 5: Run wallpaper tests and the broader test suite**

Run: `node --test tests/wallpaper.test.mjs tests/validate-config.test.mjs tests/bootstrap.test.mjs -v`
Expected: PASS for all listed files

- [ ] **Step 6: Commit the wallpaper cleanup**

```bash
git add js/wallpaper.js tests/wallpaper.test.mjs
git commit -m "refactor: split wallpaper scroller internals"
```

### Task 4: Full Verification And Final Cleanup

**Files:**
- Modify: any files from Tasks 1-3 only if verification reveals real issues

- [ ] **Step 1: Run lint and fix any issues revealed by the refactor**

Run: `npm run lint`
Expected: `eslint js/ config.js` exits with code 0

- [ ] **Step 2: Run format check and apply formatting if needed**

Run: `npm run format:check`
Expected: Prettier reports all matched files use the configured style

- [ ] **Step 3: Run the full Node test suite**

Run: `npm test`
Expected: PASS with the existing tests plus `bootstrap.test.mjs` and `wallpaper.test.mjs`

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: `dist/` is generated successfully without JavaScript minification errors

- [ ] **Step 5: Commit the final verification fixes if any were necessary**

```bash
git add js/app.js js/bootstrap.js js/validate-config.js js/wallpaper.js tests/bootstrap.test.mjs tests/validate-config.test.mjs tests/wallpaper.test.mjs
git commit -m "test: add regression coverage for startup paths"
```

## Self-Review Checklist

- Spec coverage: startup orchestration, config validation cleanup, wallpaper internal cleanup, and regression tests are each mapped to an explicit task.
- Placeholder scan: no `TBD`, `TODO`, or unspecified "handle this later" steps remain.
- Type consistency: the plan uses `revealMainContent`, `showConfigFailureState`, `initScrollAnimations`, `initMobileStickyAvatar`, and `_cleanupOverflowImages` consistently across tasks.
