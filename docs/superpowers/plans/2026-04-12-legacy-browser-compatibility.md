# Legacy Browser Compatibility Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an automatically triggered legacy compatibility mode that strips the homepage down to the left-side essentials for old browsers while keeping the modern experience intact for supported browsers.

**Architecture:** Add an early compatibility detector in `index.html`, expose that state to runtime code through a root class and body attribute, then branch initialization in `js/main.js` so unsupported browsers skip wallpaper, typewriter, time, Font Awesome, and interactive effects. Add a dedicated late CSS override section in `css/style.css` to collapse the page into a simple single-column layout with only avatar, name, status, social links, footer, and a simplified loading state.

**Tech Stack:** Static HTML, classic browser scripts, CSS, ESLint, Prettier, Node build script

---

## File Map

- Modify: `index.html`
    - Add an early inline legacy-browser detector before complex UI initialization.
    - Add a simple fallback loading text node that can be reused by compatibility mode.
- Modify: `js/main.js`
    - Centralize `isLegacyCompat` detection.
    - Branch feature initialization so compatibility mode only applies profile/social rendering and reveals content quickly.
- Modify: `js/social.js`
    - Make social link rendering tolerate missing icon fonts by preserving readable labels and optional icon suppression in compatibility mode.
- Modify: `css/style.css`
    - Add a late `legacy-compat` override block that disables the right panel, slogan, noise, animated loading visuals, hover transforms, and complex layout rules.

## Task 1: Add Early Legacy Detection In `index.html`

**Files:**

- Modify: `index.html`

- [ ] **Step 1: Add a tiny compatibility detector before the stylesheet and app scripts**

Insert this block inside `<head>` after the favicon and before the preconnect/font links:

```html
<script>
    (function () {
        var root = document.documentElement;

        function supportsCssVars() {
            return !!(window.CSS && window.CSS.supports && window.CSS.supports('--legacy-test', '0'));
        }

        function isOldEdge() {
            return !!window.StyleMedia && !/Edg\//.test(navigator.userAgent || '');
        }

        function shouldUseLegacyCompat() {
            try {
                if (document.documentMode) return true;
                if (isOldEdge()) return true;
                if (!('classList' in root)) return true;
                if (!('IntersectionObserver' in window)) return true;
                if (!supportsCssVars()) return true;
            } catch (_error) {
                return true;
            }

            return false;
        }

        if (shouldUseLegacyCompat()) {
            root.className += (root.className ? ' ' : '') + 'legacy-compat';
        }
    })();
</script>
```

- [ ] **Step 2: Add a compatibility-friendly loading text hook in the loading overlay**

Change the loading panel in `index.html` from:

```html
<div class="loading-text" id="loadingText">少女祈祷中...</div>
```

to:

```html
<div class="loading-text" id="loadingText" data-legacy-text="Loading...">少女祈祷中...</div>
```

- [ ] **Step 3: Run formatting check for the edited HTML**

Run: `npm run format:check`

Expected: Prettier reports `index.html` is formatted or identifies only formatting changes to apply after all edits are finished.

- [ ] **Step 4: Commit the HTML detection change**

```bash
git add index.html
git commit -m "feat: detect legacy browsers early"
```

## Task 2: Branch Runtime Initialization For Compatibility Mode

**Files:**

- Modify: `js/main.js`

- [ ] **Step 1: Add a shared compatibility-mode helper near the top of `js/main.js`**

Add this block after the config validation IIFE:

```js
function isLegacyCompatMode() {
    var root = document.documentElement;
    return !!(root && root.classList && root.classList.contains('legacy-compat'));
}

function revealMainContent() {
    var main = document.querySelector('.container');
    var overlay = document.getElementById('loadingOverlay');

    if (main) {
        main.classList.add('visible');
    }

    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function simplifyLegacyLoadingText() {
    if (!isLegacyCompatMode()) return;

    var loadingText = document.getElementById('loadingText');
    if (loadingText && loadingText.getAttribute('data-legacy-text')) {
        loadingText.textContent = loadingText.getAttribute('data-legacy-text');
    }
}
```

- [ ] **Step 2: Skip Font Awesome and wallpaper initialization in compatibility mode**

Update the existing Font Awesome loader and wallpaper initializer so they return early when compatibility mode is active:

```js
(function loadFontAwesome() {
    if (isLegacyCompatMode()) {
        Logger.log('[兼容模式] 跳过 Font Awesome');
        return;
    }

    var fontAwesomeUrl = 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css';
    var timeout = 5000;
    // keep the rest of the current implementation unchanged
})();
```

```js
(function initWallpaper() {
    if (isLegacyCompatMode()) {
        Logger.log('[兼容模式] 跳过壁纸模块');
        revealMainContent();
        return;
    }

    if (typeof WallpaperScroller === 'undefined') {
        console.error('[壁纸] WallpaperScroller 模块未加载');
        revealMainContent();
        return;
    }

    var wallpaper = new WallpaperScroller(
        'wallpaperScrollArea',
        CONFIG.wallpaper,
        CONFIG.loading,
        function onWallpaperReady() {
            revealMainContent();
        }
    );

    wallpaper.init();
    Logger.log('[壁纸] 模块已初始化');
})();
```

- [ ] **Step 3: Skip effect-heavy modules in compatibility mode**

Add the same early return pattern to these IIFEs:

```js
(function initScrollAnimations() {
    if (isLegacyCompatMode()) {
        Logger.log('[兼容模式] 跳过滚动动画');
        return;
    }

    // keep existing implementation
})();
```

```js
(function initMobileStickyAvatar() {
    if (isLegacyCompatMode()) {
        Logger.log('[兼容模式] 跳过移动端头像交互');
        return;
    }

    // keep existing implementation
})();
```

```js
(function initMobileWallpaperToggle() {
    if (isLegacyCompatMode()) {
        Logger.log('[兼容模式] 跳过壁纸面板切换');
        return;
    }

    // keep existing implementation
})();
```

- [ ] **Step 4: Keep only the basic modules running in compatibility mode**

Replace the final initializer block with:

```js
(function initComplete() {
    simplifyLegacyLoadingText();
    initSocialLinks();
    applyProfileConfig();

    if (!isLegacyCompatMode()) {
        initTypewriter();
        initTime();
        Logger.log('功能：打字机效果 (Slogan 循环) | 时间显示 | 壁纸轮播');
    } else {
        revealMainContent();
        Logger.log('[兼容模式] 仅保留基础资料与社交链接');
    }

    Logger.log('%c个人主页脚本已加载', 'color: #FFE600; font-size: 12px;');
})();
```

- [ ] **Step 5: Run lint on the modified script**

Run: `npm run lint`

Expected: ESLint passes with no errors.

- [ ] **Step 6: Commit the runtime branching change**

```bash
git add js/main.js
git commit -m "feat: add legacy compatibility runtime path"
```

## Task 3: Make Social Links Readable Without Icon Fonts

**Files:**

- Modify: `js/social.js`

- [ ] **Step 1: Add a compatibility helper in `js/social.js`**

Add this helper near the top of the module:

```js
function isLegacyCompatMode() {
    var root = document.documentElement;
    return !!(root && root.classList && root.classList.contains('legacy-compat'));
}
```

- [ ] **Step 2: Suppress icon-only dependency in compatibility mode**

Inside `initSocialLinks()`, replace the icon creation section:

```js
var icon = document.createElement('i');
icon.className = link.icon;
icon.setAttribute('aria-hidden', 'true');

var label = document.createElement('span');
label.className = 'link-label';
label.textContent = link.name;
```

with:

```js
var legacyCompat = isLegacyCompatMode();
var label = document.createElement('span');
label.className = 'link-label';
label.textContent = link.name;

if (!legacyCompat && link.icon) {
    var icon = document.createElement('i');
    icon.className = link.icon;
    icon.setAttribute('aria-hidden', 'true');
    a.appendChild(icon);
}
```

Then keep only this append order at the end of the loop:

```js
a.appendChild(label);
socialContainer.appendChild(a);
```

- [ ] **Step 3: Keep the rest of the color assignment logic unchanged**

Do not alter:

```js
if (isHexColor) {
    a.className = 'social-link social-link--custom';
    a.style.setProperty('--custom-color', color);
} else {
    a.className = 'social-link social-link--' + color;
}
```

The CSS compatibility block will neutralize the visual complexity later.

- [ ] **Step 4: Run lint to verify the DOM changes**

Run: `npm run lint`

Expected: ESLint passes with no errors.

- [ ] **Step 5: Commit the social fallback change**

```bash
git add js/social.js
git commit -m "feat: keep social links readable in legacy mode"
```

## Task 4: Add Legacy Compatibility CSS Overrides

**Files:**

- Modify: `css/style.css`

- [ ] **Step 1: Append a dedicated late override block at the end of `css/style.css`**

Add this block after the existing styles so it wins the cascade:

```css
/* ===== 旧版浏览器兼容模式 ===== */
.legacy-compat html,
html.legacy-compat,
.legacy-compat body,
body.legacy-compat {
    height: auto;
    overflow: auto;
}

.legacy-compat .noise-overlay,
.legacy-compat .right-panel,
.legacy-compat .bio-container,
.legacy-compat .wallpaper-toggle,
.legacy-compat .close-panel,
.legacy-compat .loading-spinner,
.legacy-compat .loading-progress,
.legacy-compat .loading-percent,
.legacy-compat .right-panel-shadow,
.legacy-compat .info-panel {
    display: none !important;
}

.legacy-compat .container {
    display: block;
    height: auto;
    min-height: 0;
    overflow: visible;
    filter: none;
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
}

.legacy-compat .left-panel {
    width: auto;
    min-width: 0;
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 20px;
    border-right: 0;
    box-shadow: none;
    overflow: visible;
}

.legacy-compat .left-panel .hero,
.legacy-compat .footer-left,
.legacy-compat .avatar-box,
.legacy-compat .status-bar,
.legacy-compat .social-link,
.legacy-compat .name,
.legacy-compat .status-dot,
.legacy-compat .typewriter-cursor {
    animation: none !important;
    transition: none !important;
    transform: none !important;
}

.legacy-compat .avatar-box {
    width: 120px;
    height: 120px;
    cursor: default;
    box-shadow: none;
}

.legacy-compat .avatar-box:hover,
.legacy-compat .social-link:hover,
.legacy-compat .wallpaper-toggle:hover,
.legacy-compat .close-panel:hover {
    transform: none;
    box-shadow: none;
}

.legacy-compat .avatar-box::before,
.legacy-compat .social-link::before,
.legacy-compat .wallpaper-toggle::before,
.legacy-compat .close-panel::before {
    display: none;
}

.legacy-compat .name {
    font-size: 40px;
    margin-bottom: 12px;
}

.legacy-compat .status-bar {
    margin-bottom: 24px;
}

.legacy-compat .social-links {
    display: block;
}

.legacy-compat .social-link {
    display: block;
    margin-bottom: 12px;
    padding: 14px 16px;
    box-shadow: none;
}

.legacy-compat .social-link i {
    display: none;
}

.legacy-compat .link-label {
    display: inline-block;
    font-size: 14px;
}

.legacy-compat .loading-overlay {
    background: #fffef7;
}

.legacy-compat .loading-panel {
    padding: 24px;
    box-shadow: none;
    animation: none;
}

.legacy-compat .loading-text {
    min-height: 0;
    font-size: 16px;
    letter-spacing: 0.04em;
}
```

- [ ] **Step 2: Add one responsive override for smaller screens in compatibility mode**

Append this small block after the compatibility section:

```css
@media (max-width: 600px) {
    .legacy-compat .left-panel {
        padding: 20px 16px;
    }

    .legacy-compat .name {
        font-size: 32px;
    }

    .legacy-compat .avatar-box {
        width: 96px;
        height: 96px;
    }
}
```

- [ ] **Step 3: Run format check to validate CSS style**

Run: `npm run format:check`

Expected: Prettier reports `css/style.css` is formatted or only needs final formatting after all edits are complete.

- [ ] **Step 4: Commit the CSS compatibility layer**

```bash
git add css/style.css
git commit -m "feat: add legacy compatibility layout overrides"
```

## Task 5: Final Verification And Manual Compatibility Checks

**Files:**

- Modify if needed: `index.html`, `js/main.js`, `js/social.js`, `css/style.css`

- [ ] **Step 1: Run the full project verification suite**

Run: `npm run lint`

Expected: PASS with no ESLint errors.

Run: `npm run format:check`

Expected: PASS with no Prettier issues.

Run: `npm run build`

Expected: PASS and `dist/` regenerated successfully.

- [ ] **Step 2: Manually verify the modern-browser path**

Open the site in a current browser and confirm:

```text
1. Left and right panels both render.
2. Slogan typewriter runs.
3. Time widget appears.
4. Wallpaper area initializes.
5. Social links still show icons.
```

- [ ] **Step 3: Manually verify the compatibility path without an old browser**

Temporarily force compatibility mode by editing the root element in DevTools to:

```html
<html lang="zh-CN" class="legacy-compat"></html>
```

Then confirm:

```text
1. Only the left panel remains visible.
2. Avatar, name, status, social links, and footer are visible.
3. Slogan block is hidden.
4. Right panel, wallpaper buttons, noise overlay, and loading spinner/progress are hidden.
5. Social links are readable even without icon fonts.
6. The page is immediately usable and not stuck in loading.
```

- [ ] **Step 4: If verification exposed issues, apply the smallest fix and rerun all three commands**

Use the smallest possible patch in one of these files:

```text
index.html
js/main.js
js/social.js
css/style.css
```

Then rerun:

```bash
npm run lint
npm run format:check
npm run build
```

Expected: all three commands pass after the fix.

- [ ] **Step 5: Commit the verified final state**

```bash
git add index.html js/main.js js/social.js css/style.css
git commit -m "feat: add legacy browser compatibility mode"
```
