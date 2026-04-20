# App Namespace Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate 10 scattered global symbols into a single `window.App` namespace using the module object pattern.

**Architecture:** Each IIFE module switches its `window.X` export to `App.xxx`. Internal cross-module references (`CONFIG`, `Logger`, `Utils`) switch to `App.config`, `App.logger`, `App.utils`. main.js updates all consumption points. ESLint globals reduced to `App` only.

**Tech Stack:** Vanilla JS (ES5-compatible, `sourceType: "script"`), ESLint, Prettier, terser (build)

---

### Task 1: Update config.js — Mount CONFIG onto App

**Files:**
- Modify: `config.js:229-231`

- [ ] **Step 1: Add App namespace mount after module.exports block**

In `config.js`, after the existing `module.exports` block (lines 229-231), add:

```js
if (typeof window.App === 'undefined') { window.App = {}; }
window.App.config = CONFIG;
```

The end of config.js should now read:

```js
// 导出配置（供其他脚本使用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

if (typeof window.App === 'undefined') { window.App = {}; }
window.App.config = CONFIG;
```

- [ ] **Step 2: Run lint and format check**

Run: `npm run lint && npm run format:check`
Expected: Pass (no new issues introduced)

---

### Task 2: Update logger.js — Export via App.logger, reference App.config

**Files:**
- Modify: `js/logger.js`

- [ ] **Step 1: Replace `window.Logger = Logger` with App namespace mount**

In `js/logger.js`, replace the line:

```js
    window.Logger = Logger;
```

with:

```js
    window.App = window.App || {};
    window.App.logger = Logger;
```

- [ ] **Step 2: Replace internal `CONFIG` reference with `App.config`**

In `js/logger.js`, the `isDebugEnabled` function references `CONFIG`. Replace:

```js
    function isDebugEnabled() {
        return typeof CONFIG !== 'undefined' && CONFIG.debug && CONFIG.debug.consoleLog;
    }
```

with:

```js
    function isDebugEnabled() {
        return typeof App !== 'undefined' && App.config && App.config.debug && App.config.debug.consoleLog;
    }
```

- [ ] **Step 3: Run lint and format check**

Run: `npm run lint && npm run format:check`
Expected: Pass

---

### Task 3: Update utils.js — Export via App.utils

**Files:**
- Modify: `js/utils.js`

- [ ] **Step 1: Replace `window.Utils = {...}` with App namespace mount**

In `js/utils.js`, replace:

```js
    window.Utils = {
        debounce: debounce,
        isLegacyCompatMode: isLegacyCompatMode,
        isMobile: isMobile,
        addClass: addClass
    };
```

with:

```js
    window.App = window.App || {};
    window.App.utils = {
        debounce: debounce,
        isLegacyCompatMode: isLegacyCompatMode,
        isMobile: isMobile,
        addClass: addClass
    };
```

- [ ] **Step 2: Run lint and format check**

Run: `npm run lint && npm run format:check`
Expected: Pass

---

### Task 4: Update typewriter.js — Export via App.typewriter, reference App.config/App.logger

**Files:**
- Modify: `js/typewriter.js`

- [ ] **Step 1: Replace `window.initTypewriter` / `window.destroyTypewriter` with App mount**

In `js/typewriter.js`, replace:

```js
    window.initTypewriter = initTypewriter;
    window.destroyTypewriter = destroyTypewriter;
```

with:

```js
    window.App = window.App || {};
    window.App.typewriter = { init: initTypewriter, destroy: destroyTypewriter };
```

- [ ] **Step 2: Replace internal `CONFIG` references with `App.config`**

In `js/typewriter.js`, replace all occurrences of `CONFIG.` with `App.config.`:

```js
        var slogans = App.config.slogans.list;
        var typeSpeed = App.config.slogans.typeSpeed || 60;
        var pauseDuration = App.config.slogans.pauseDuration || 5000;
        var loop = App.config.slogans.loop !== false;
        var mode = App.config.slogans.mode || 'random';
```

And:

```js
        if (cursor && App.config.animation) {
            if (App.config.animation.cursorStyle === 'line') {
```

- [ ] **Step 3: Replace internal `Logger` references with `App.logger`**

In `js/typewriter.js`, replace:

```js
            Logger.log('[Slogan ' + (currentIndex + 1) + '/' + slogans.length + ']:', slogan.substring(0, 30) + '...');
```

with:

```js
            App.logger.log('[Slogan ' + (currentIndex + 1) + '/' + slogans.length + ']:', slogan.substring(0, 30) + '...');
```

- [ ] **Step 4: Run lint and format check**

Run: `npm run lint && npm run format:check`
Expected: Pass

---

### Task 5: Update time.js — Export via App.time, reference App.config

**Files:**
- Modify: `js/time.js`

- [ ] **Step 1: Replace `window.initTime` / `window.destroyTime` with App mount**

In `js/time.js`, replace:

```js
    window.initTime = initTime;
    window.destroyTime = destroyTime;
```

with:

```js
    window.App = window.App || {};
    window.App.time = { init: initTime, destroy: destroyTime };
```

- [ ] **Step 2: Replace internal `CONFIG` references with `App.config`**

In `js/time.js`, replace:

```js
            var config = CONFIG.time;
```

with:

```js
            var config = App.config.time;
```

And replace:

```js
        timerId = setInterval(updateTime, CONFIG.time.updateInterval || 1000);
```

with:

```js
        timerId = setInterval(updateTime, App.config.time.updateInterval || 1000);
```

- [ ] **Step 3: Run lint and format check**

Run: `npm run lint && npm run format:check`
Expected: Pass

---

### Task 6: Update social.js — Export via App.social, reference App.config/App.utils/App.logger

**Files:**
- Modify: `js/social.js`

- [ ] **Step 1: Replace `window.initSocialLinks` / `window.applyProfileConfig` with App mount**

In `js/social.js`, replace:

```js
    window.initSocialLinks = initSocialLinks;
    window.applyProfileConfig = applyProfileConfig;
```

with:

```js
    window.App = window.App || {};
    window.App.social = { initLinks: initSocialLinks, applyProfile: applyProfileConfig };
```

- [ ] **Step 2: Replace internal `CONFIG` references with `App.config`**

In `js/social.js`, in `initSocialLinks`, replace:

```js
        if (!CONFIG.socialLinks || !CONFIG.socialLinks.links) return;
```

with:

```js
        if (!App.config.socialLinks || !App.config.socialLinks.links) return;
```

Replace:

```js
        var links = CONFIG.socialLinks.links;
        var colorScheme = CONFIG.socialLinks.colorScheme || 'cycle';
```

with:

```js
        var links = App.config.socialLinks.links;
        var colorScheme = App.config.socialLinks.colorScheme || 'cycle';
```

In `applyProfileConfig`, replace:

```js
        var config = CONFIG.profile;
```

with:

```js
        var config = App.config.profile;
```

And replace:

```js
        if (footerTextEl && CONFIG.footer) {
            var text = CONFIG.footer.text || 'BUILT WITH PASSION';
```

with:

```js
        if (footerTextEl && App.config.footer) {
            var text = App.config.footer.text || 'BUILT WITH PASSION';
```

- [ ] **Step 3: Replace internal `Utils` references with `App.utils`**

In `js/social.js`, replace:

```js
        var legacyCompatMode = Utils.isLegacyCompatMode();
```

with:

```js
        var legacyCompatMode = App.utils.isLegacyCompatMode();
```

- [ ] **Step 4: Replace internal `Logger` references with `App.logger`**

In `js/social.js`, replace:

```js
        Logger.log('[配置] 已生成 ' + links.length + ' 个社交链接');
```

with:

```js
        App.logger.log('[配置] 已生成 ' + links.length + ' 个社交链接');
```

And replace:

```js
        Logger.log('[配置] 个人信息已应用');
```

with:

```js
        App.logger.log('[配置] 个人信息已应用');
```

- [ ] **Step 5: Run lint and format check**

Run: `npm run lint && npm run format:check`
Expected: Pass

---

### Task 7: Update wallpaper.js — Export via App.wallpaper, reference App.logger

**Files:**
- Modify: `js/wallpaper.js`

- [ ] **Step 1: Replace `window.WallpaperScroller = WallpaperScroller` with App mount**

In `js/wallpaper.js`, replace:

```js
    window.WallpaperScroller = WallpaperScroller;
```

with:

```js
    window.App = window.App || {};
    window.App.wallpaper = WallpaperScroller;
```

- [ ] **Step 2: Replace internal `Logger` references with `App.logger`**

In `js/wallpaper.js`, replace all `Logger.log(` with `App.logger.log(`, all `Logger.warn(` with `App.logger.warn(`, and all `Logger.error(` with `App.logger.error(`.

The occurrences are:

- `Logger.warn('[壁纸] 未配置壁纸 API，壁纸功能不可用');` → `App.logger.warn(...)`
- `Logger.error('[壁纸] 容器元素未找到:', this.containerId);` → `App.logger.error(...)`
- `Logger.log('[壁纸] 无限滚动已禁用');` → `App.logger.log(...)`
- `Logger.error('[壁纸] 初始化失败:', err);` → `App.logger.error(...)`
- `Logger.log('[壁纸] 加载中... (' + attempt + '/' + self.maxRetries + ')');` → `App.logger.log(...)`
- `Logger.error('[壁纸] 懒加载失败:', placeholder.dataset.index);` → `App.logger.error(...)`
- `Logger.error('[壁纸] 第 ' + (index + 1) + ' 张加载失败');` → `App.logger.error(...)`

- [ ] **Step 3: Run lint and format check**

Run: `npm run lint && npm run format:check`
Expected: Pass

---

### Task 8: Update main.js — All references switch to App namespace

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Replace config validation block**

In `js/main.js`, replace:

```js
    if (typeof CONFIG === 'undefined') {
        console.error('配置文件未加载！请确保 config.js 在 main.js 之前引入');
        return;
    }
    Logger.log('%c配置已加载 \u2713', 'color: #FFE600; font-size: 12px;');
    Logger.log('Slogan 数量:', CONFIG.slogans.list.length);
```

with:

```js
    if (typeof App === 'undefined' || !App.config) {
        console.error('配置文件未加载！请确保 config.js 在 main.js 之前引入');
        return;
    }
    App.logger.log('%c配置已加载 \u2713', 'color: #FFE600; font-size: 12px;');
    App.logger.log('Slogan 数量:', App.config.slogans.list.length);
```

- [ ] **Step 2: Replace `revealMainContent` — Utils → App.utils**

Replace:

```js
    Utils.addClass(main, 'visible');
    Utils.addClass(overlay, 'hidden');
```

with:

```js
    App.utils.addClass(main, 'visible');
    App.utils.addClass(overlay, 'hidden');
```

- [ ] **Step 3: Replace `simplifyLegacyLoadingText` — Utils → App.utils**

Replace:

```js
    if (!Utils.isLegacyCompatMode() || !loadingText) return;
```

with:

```js
    if (!App.utils.isLegacyCompatMode() || !loadingText) return;
```

- [ ] **Step 4: Replace Font Awesome IIFE — Utils/Logger → App.utils/App.logger**

Replace:

```js
    if (Utils.isLegacyCompatMode()) {
        Logger.log('[兼容模式] 跳过 Font Awesome');
```

with:

```js
    if (App.utils.isLegacyCompatMode()) {
        App.logger.log('[兼容模式] 跳过 Font Awesome');
```

Replace:

```js
            Logger.warn('[Font Awesome] 加载超时，已放弃加载');
```

with:

```js
            App.logger.warn('[Font Awesome] 加载超时，已放弃加载');
```

Replace:

```js
        Logger.log('[Font Awesome] 加载成功');
```

with:

```js
        App.logger.log('[Font Awesome] 加载成功');
```

Replace:

```js
            Logger.warn('[Font Awesome] 加载失败');
```

with:

```js
            App.logger.warn('[Font Awesome] 加载失败');
```

- [ ] **Step 5: Replace wallpaper init IIFE — Utils/Logger/WallpaperScroller/CONFIG → App equivalents**

Replace the wallpaper init block. The full block from line 77 to line 106 becomes:

```js
(function initWallpaper() {
    if (App.utils.isLegacyCompatMode()) {
        App.logger.log('[兼容模式] 跳过壁纸模块');
        revealMainContent();
        return;
    }

    if (typeof App.wallpaper === 'undefined') {
        console.error('[壁纸] WallpaperScroller 模块未加载');
        revealMainContent();
        return;
    }

    try {
        var wallpaper = new App.wallpaper(
            'wallpaperScrollArea',
            App.config.wallpaper,
            App.config.loading,
            function onWallpaperReady() {
                revealMainContent();
            }
        );

        wallpaper.init();
        App.logger.log('[壁纸] 模块已初始化');
    } catch (error) {
        console.error('[壁纸] 初始化失败', error);
        revealMainContent();
    }
})();
```

- [ ] **Step 6: Replace scroll animations IIFE — Utils/Logger/CONFIG → App equivalents**

Replace:

```js
    if (Utils.isLegacyCompatMode()) {
        Logger.log('[兼容模式] 跳过滚动动画');
```

with:

```js
    if (App.utils.isLegacyCompatMode()) {
        App.logger.log('[兼容模式] 跳过滚动动画');
```

Replace:

```js
    var config = CONFIG.effects && CONFIG.effects.scrollReveal;
```

with:

```js
    var config = App.config.effects && App.config.effects.scrollReveal;
```

Replace:

```js
    Logger.log('[滚动动画] 已初始化，监听元素:', targets.length);
```

with:

```js
    App.logger.log('[滚动动画] 已初始化，监听元素:', targets.length);
```

- [ ] **Step 7: Replace mobile sticky avatar IIFE — Utils/Logger → App.utils/App.logger**

Replace all `Utils.` calls with `App.utils.`:

```js
    if (App.utils.isLegacyCompatMode()) {
        App.logger.log('[兼容模式] 跳过移动端粘性头像');
```

```js
        if (!App.utils.isMobile()) return;
```

```js
        var scrollContainer = App.utils.isMobile() ? container : leftPanel;
```

(two occurrences of `Utils.isMobile()` — both become `App.utils.isMobile()`)

```js
        var scrollContainer = App.utils.isMobile() ? container : leftPanel;
```

```js
            if (!App.utils.isMobile()) {
```

Replace:

```js
        Utils.debounce(function () {
```

with:

```js
        App.utils.debounce(function () {
```

Replace:

```js
    Logger.log('[粘性头像] 已初始化');
```

with:

```js
    App.logger.log('[粘性头像] 已初始化');
```

- [ ] **Step 8: Replace mobile wallpaper toggle IIFE — Utils/Logger → App equivalents**

Replace:

```js
    if (Utils.isLegacyCompatMode()) {
        Logger.log('[兼容模式] 跳过移动端壁纸切换');
```

with:

```js
    if (App.utils.isLegacyCompatMode()) {
        App.logger.log('[兼容模式] 跳过移动端壁纸切换');
```

Replace:

```js
    Logger.log('[壁纸面板] 移动端右侧面板已禁用，跳过切换初始化');
```

with:

```js
    App.logger.log('[壁纸面板] 移动端右侧面板已禁用，跳过切换初始化');
```

- [ ] **Step 9: Replace init complete IIFE — all symbol references → App equivalents**

Replace:

```js
    simplifyLegacyLoadingText();
    initSocialLinks();
    applyProfileConfig();

    if (Utils.isLegacyCompatMode()) {
        revealMainContent();
        Logger.log('[兼容模式] 仅保留基础资料与社交链接');
    } else {
        initTypewriter();
        initTime();
    }

    Logger.log('%c个人主页脚本已加载', 'color: #FFE600; font-size: 12px;');
    Logger.log('功能：打字机效果 (Slogan 循环) | 时间显示 | 壁纸轮播');
```

with:

```js
    simplifyLegacyLoadingText();
    App.social.initLinks();
    App.social.applyProfile();

    if (App.utils.isLegacyCompatMode()) {
        revealMainContent();
        App.logger.log('[兼容模式] 仅保留基础资料与社交链接');
    } else {
        App.typewriter.init();
        App.time.init();
    }

    App.logger.log('%c个人主页脚本已加载', 'color: #FFE600; font-size: 12px;');
    App.logger.log('功能：打字机效果 (Slogan 循环) | 时间显示 | 壁纸轮播');
```

- [ ] **Step 10: Run lint and format check**

Run: `npm run lint && npm run format:check`
Expected: Pass

---

### Task 9: Update ESLint config — Reduce globals to App only

**Files:**
- Modify: `.eslintrc.json`

- [ ] **Step 1: Replace 10 individual globals with single App global**

In `.eslintrc.json`, replace the entire `globals` block:

```json
  "globals": {
    "CONFIG": "readonly",
    "WallpaperScroller": "readonly",
    "Logger": "readonly",
    "Utils": "readonly",
    "initTypewriter": "readonly",
    "destroyTypewriter": "readonly",
    "initTime": "readonly",
    "destroyTime": "readonly",
    "initSocialLinks": "readonly",
    "applyProfileConfig": "readonly"
  }
```

with:

```json
  "globals": {
    "App": "readonly"
  }
```

- [ ] **Step 2: Run lint and format check**

Run: `npm run lint && npm run format:check`
Expected: Pass

---

### Task 10: Final verification — lint, format, build

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: 0 errors, 0 warnings

- [ ] **Step 2: Run format check**

Run: `npm run format:check`
Expected: All files pass

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build completes successfully, dist/ created

- [ ] **Step 4: Commit all changes**

```bash
git add config.js js/logger.js js/utils.js js/typewriter.js js/time.js js/social.js js/wallpaper.js js/main.js .eslintrc.json
git commit -m "refactor: consolidate globals into window.App namespace"
```