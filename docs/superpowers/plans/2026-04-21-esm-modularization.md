# ESM Modularization + Config Validation + CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the site from 9 sequential `<script>` tags to a single ES Module entry point, add startup config validation, and add a GitHub Actions CI pipeline.

**Architecture:** Each existing IIFE module becomes an ESM file with named exports, orchestrated by a new `js/app.js` entry point. `config.js` becomes an ESM export. A new `js/validate-config.js` validates CONFIG before initialization. A `.github/workflows/ci.yml` runs lint, format check, and build on push/PR.

**Tech Stack:** ES Modules (browser native), Node.js test runner, ESLint, Prettier, Terser, GitHub Actions

---

## File Structure

**Created:**
- `js/app.js` — Single ESM entry point; imports and initializes all modules
- `js/validate-config.js` — Validates CONFIG shape at startup
- `.github/workflows/ci.yml` — GitHub Actions CI pipeline

**Modified:**
- `config.js` — Convert from `var CONFIG` + `module.exports` + `window.App.config` to `export const CONFIG`
- `js/polyfills.js` — Remove IIFE, keep as side-effect module
- `js/logger.js` — Remove IIFE, export `logger` object; import CONFIG
- `js/utils.js` — Remove IIFE, export named functions and `utils` object
- `js/slogan-selector.js` — Remove IIFE + `module.exports`, export `createSloganSelector`
- `js/typewriter.js` — Remove IIFE, import dependencies, export `initTypewriter` / `destroyTypewriter`
- `js/time.js` — Remove IIFE, import CONFIG, export `initTime` / `destroyTime`
- `js/social.js` — Remove IIFE, import dependencies, export `initSocialLinks` / `applyProfileConfig`
- `js/wallpaper.js` — Remove IIFE, import dependencies, export `WallpaperScroller`
- `js/main.js` — **DELETE** (replaced by `js/app.js`)
- `index.html` — Replace 9 `<script>` tags with single `<script type="module">`
- `.eslintrc.json` — `sourceType: "module"`, `no-var: "error"`, remove `App` global
- `build.js` — Add Terser `module: true`, handle `<script type="module">` in HTML
- `package.json` — Update test script for `.mjs` files
- `tests/config-fields.test.mjs` — Rename from `.js`, use `import`
- `tests/slogan-selector.test.mjs` — Rename from `.js`, use `import`

**Deleted:**
- `js/main.js`
- `tests/config-fields.test.js`
- `tests/slogan-selector.test.js`
- `tests/build-output.test.js` (if not migrated; see Task 10)

---

### Task 1: Convert config.js to ESM

**Files:**
- Modify: `config.js`

- [ ] **Step 1: Rewrite config.js as ESM export**

Replace the entire file content. The object shape stays identical but the export mechanism changes:

```js
/**
 * 个人主页 - 配置文件
 * 在此编辑所有可配置项
 */

export const CONFIG = {
    version: '0.5.5',
    // ============================================================
    // 个人信息配置
    // ============================================================
    profile: {
        name: '遊星 Wakusei',
        status: '正在过大关.jpg',
        avatar: 'res/img/logo.png'
    },

    // ============================================================
    // 社交链接配置
    // ============================================================
    socialLinks: {
        colorScheme: 'cycle',
        links: [
            {
                name: 'GITHUB',
                url: 'https://github.com/wakusei0413',
                icon: 'fab fa-github',
                color: '#ffe600'
            },
            {
                name: 'Linux.Do',
                url: 'https://linux.do/u/wakusei/summary',
                icon: 'fa-solid fa-bars-staggered',
                color: '#f2411d'
            },
            {
                name: 'EMAIL',
                url: 'mailto:wakusei0413@outlook.com',
                icon: 'fas fa-envelope',
                color: '#3e59ff'
            },
            {
                name: 'BILIBILI',
                url: 'https://space.bilibili.com/438168974',
                icon: 'fab fa-bilibili',
                color: '#ffa69e'
            },
            {
                name: 'BLOG',
                url: 'https://blog.wakusei.top/',
                icon: 'fa-solid fa-blog',
                color: '#f58f1a'
            },
            {
                name: 'STATUS',
                url: 'https://status.wakusei.top/',
                icon: 'fa-solid fa-arrow-up-right-dots',
                color: '#caa62e'
            },
            {
                name: 'TESTING',
                url: 'https://testing.wakusei.top/',
                icon: 'fa-solid fa-flask',
                color: '#16deca'
            }
        ]
    },

    // ============================================================
    // 底部版权配置
    // ============================================================
    footer: {
        text: '咕!咕!嘎!嘎!-"罗德岛"有限公司出品'
    },

    // ============================================================
    // Slogan / 简介配置
    // ============================================================
    slogans: {
        list: [
            '安静，吵到我用使用锤子的TNT vibe coding了！',
            '武装保卫开源社区！',
            '说的好！我完全同意。',
            '正在测试中...',
            '以真诚待人为荣，以虚伪欺人为耻；以友善热心为荣，以傲慢冷漠为耻；以团结协作为荣，以孤立对抗为耻；以专业敬业为荣，以敷衍了事为耻。',
            '用冰冷的理性温暖世界。',
            '"天下为公"是出自《礼记·礼运》的经典儒家政治理念，意指天下是天下人的天下，而非一人一姓所有。它描述了一个选贤与能、讲信修睦的"大同"理想社会。孙中山先生一生致力于践行此理念，并将其作为其三民主义思想的核心精神。'
        ],
        mode: 'random',
        typeSpeed: 60,
        pauseDuration: 5000,
        loop: true
    },

    // ============================================================
    // 时间组件配置
    // ============================================================
    time: {
        format: '24h',
        showWeekday: true,
        showDate: true,
        updateInterval: 1000
    },

    // ============================================================
    // 加载界面配置
    // ============================================================
    loading: {
        texts: [
            '少女祈祷中...',
            '正在给服务器喂猫粮...',
            '正在数像素...114...514...',
            '正在和404谈判...',
            '正在召唤服务器精灵...',
            '正在给图片上色...',
            '正在连接异次元...',
            '正在偷取你的带宽...（开玩笑的）',
            '正在加载大量萌要素...',
            '服务器正在喝茶...'
        ],
        textSwitchInterval: 2000
    },

    // ============================================================
    // 壁纸配置
    // ============================================================
    wallpaper: {
        apis: ['https://www.loliapi.com/bg/', 'https://www.dmoe.cc/random.php'],
        raceTimeout: 10000,
        maxRetries: 5,
        preloadCount: 3,
        infiniteScroll: {
            enabled: true,
            speed: 1.5,
            batchSize: 5,
            maxImages: 50
        }
    },

    // ============================================================
    // 动画配置
    // ============================================================
    animation: {
        cursorStyle: 'block'
    },

    // ============================================================
    // 调试配置
    // ============================================================
    debug: {
        consoleLog: true
    },

    // ============================================================
    // 交互特效配置
    // ============================================================
    effects: {
        scrollReveal: {
            enabled: true,
            offset: 50,
            delay: 50
        }
    }
};
```

Key changes: `var CONFIG` → `export const CONFIG`, removed `module.exports` block, removed `window.App.config = CONFIG` block.

- [ ] **Step 2: Run lint to check for issues**

Run: `npm run lint`
Expected: May show errors in `config.js` due to `export` keyword with `sourceType: "script"`. We'll fix ESLint config in Task 8. If other files show errors, those need fixing before proceeding.

- [ ] **Step 3: Commit**

```bash
git add config.js
git commit -m "refactor: convert config.js to ESM export"
```

---

### Task 2: Convert polyfills.js to ESM side-effect

**Files:**
- Modify: `js/polyfills.js`

- [ ] **Step 1: Remove IIFE wrapper from polyfills.js**

Replace entire file content:

```js
/**
 * 旧版浏览器最小 Polyfills
 * 仅补齐当前站点初始化路径会用到的基础 API。
 */

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
        let i;
        for (i = 0; i < this.length; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}

if (!String.prototype.padStart) {
    String.prototype.padStart = function (targetLength, padString) {
        let result = String(this);
        let fill = typeof padString === 'undefined' ? ' ' : String(padString || ' ');

        targetLength = targetLength >> 0;

        if (result.length >= targetLength) {
            return result;
        }

        while (fill.length < targetLength - result.length) {
            fill += fill;
        }

        return fill.slice(0, targetLength - result.length) + result;
    };
}

if (window.Element && !Element.prototype.matches) {
    Element.prototype.matches =
        Element.prototype.msMatchesSelector ||
        Element.prototype.webkitMatchesSelector ||
        function (selector) {
            const node = this;
            const nodes = (node.document || node.ownerDocument).querySelectorAll(selector);
            let i = 0;

            while (nodes[i] && nodes[i] !== node) {
                i++;
            }

            return !!nodes[i];
        };
}

if (window.Element && !Element.prototype.closest) {
    Element.prototype.closest = function (selector) {
        let node = this;

        while (node && node.nodeType === 1) {
            if (node.matches(selector)) {
                return node;
            }

            node = node.parentElement || node.parentNode;
        }

        return null;
    };
}
```

Key changes: removed IIFE wrapper, changed `var` to `let`, `const`. No exports — this is a side-effect module.

- [ ] **Step 2: Commit**

```bash
git add js/polyfills.js
git commit -m "refactor: convert polyfills.js to ESM side-effect module"
```

---

### Task 3: Convert logger.js to ESM

**Files:**
- Modify: `js/logger.js`

- [ ] **Step 1: Rewrite logger.js as ESM**

```js
/**
 * Logger 工具 — 统一控制台输出
 * 依赖：全局 CONFIG 对象
 *
 * 日志级别策略：
 *   log  — 受 CONFIG.debug.consoleLog 控制，生产环境默认关闭
 *   warn — 受 CONFIG.debug.consoleLog 控制，与 log 一致
 *   error — 始终输出，确保异常不被静默吞掉
 */

import { CONFIG } from '../config.js';

const logger = {
    log: function (...args) {
        if (CONFIG.debug && CONFIG.debug.consoleLog) {
            console.log(...args);
        }
    },
    warn: function (...args) {
        if (CONFIG.debug && CONFIG.debug.consoleLog) {
            console.warn(...args);
        }
    },
    error: function (...args) {
        console.error(...args);
    }
};

export { logger };
```

Key changes: removed IIFE, import CONFIG directly, use rest params, export `logger` object.

- [ ] **Step 2: Commit**

```bash
git add js/logger.js
git commit -m "refactor: convert logger.js to ESM with explicit import"
```

---

### Task 4: Convert utils.js to ESM

**Files:**
- Modify: `js/utils.js`

- [ ] **Step 1: Rewrite utils.js as ESM**

```js
/**
 * 工具函数
 */

export function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

export function isLegacyCompatMode() {
    const root = document.documentElement;
    if (!root) return false;
    if (root.classList) {
        return root.classList.contains('legacy-compat');
    }
    return /(^|\s)legacy-compat(\s|$)/.test(root.className || '');
}

export function isMobile(breakpoint) {
    return window.innerWidth <= (breakpoint || 900);
}

export function addClass(el, className) {
    if (!el) return;
    if (el.classList) {
        el.classList.add(className);
        return;
    }
    if (!new RegExp('(^|\\s)' + className + '(\\s|$)').test(el.className || '')) {
        el.className = (el.className ? el.className + ' ' : '') + className;
    }
}

export const utils = { debounce, isLegacyCompatMode, isMobile, addClass };
```

Key changes: removed IIFE + `window.App.utils`, exported named functions and `utils` object, `var` → `let`/`const`.

- [ ] **Step 2: Commit**

```bash
git add js/utils.js
git commit -m "refactor: convert utils.js to ESM with named exports"
```

---

### Task 5: Convert slogan-selector.js to ESM

**Files:**
- Modify: `js/slogan-selector.js`

- [ ] **Step 1: Rewrite slogan-selector.js as ESM**

```js
/**
 * Slogan 选择器模块
 * 功能：纯函数，按随机或顺序模式从列表中选取下一条 Slogan
 */

export function createSloganSelector(mode, slogans) {
    let currentIndex = -1;

    function next() {
        if (mode === 'random') {
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * slogans.length);
            } while (newIndex === currentIndex && slogans.length > 1);
            currentIndex = newIndex;
        } else {
            currentIndex = (currentIndex + 1) % slogans.length;
        }
        return { index: currentIndex, text: slogans[currentIndex] };
    }

    return { next };
}
```

Key changes: removed IIFE, `var` → `let`, removed `window.App.sloganSelector` and `module.exports`, exported `createSloganSelector`.

- [ ] **Step 2: Commit**

```bash
git add js/slogan-selector.js
git commit -m "refactor: convert slogan-selector.js to ESM named export"
```

---

### Task 6: Convert typewriter.js to ESM

**Files:**
- Modify: `js/typewriter.js`

- [ ] **Step 1: Rewrite typewriter.js as ESM**

```js
/**
 * 打字机效果模块
 * 功能：循环展示 Slogan，支持随机/顺序模式
 */

import { CONFIG } from '../config.js';
import { logger } from './logger.js';
import { createSloganSelector } from './slogan-selector.js';

let pendingTimers = [];

function initTypewriter() {
    const textEl = document.getElementById('typewriterText');
    const cursor = document.getElementById('cursor');
    const container = document.getElementById('bioContainer');

    if (!textEl) return;

    const slogans = CONFIG.slogans.list;
    const typeSpeed = CONFIG.slogans.typeSpeed || 60;
    const pauseDuration = CONFIG.slogans.pauseDuration || 5000;
    const loop = CONFIG.slogans.loop !== false;
    const mode = CONFIG.slogans.mode || 'random';

    const selector = createSloganSelector(mode, slogans);

    if (container) container.style.minHeight = '100px';

    if (cursor && CONFIG.animation) {
        if (CONFIG.animation.cursorStyle === 'line') {
            cursor.textContent = '|';
        }
    }

    function typeText(text, callback) {
        textEl.textContent = '';
        let i = 0;
        function type() {
            if (i < text.length) {
                textEl.textContent += text.charAt(i);
                i++;
                pendingTimers.push(setTimeout(type, typeSpeed));
            } else {
                if (callback) callback();
            }
        }
        type();
    }

    function clearText(callback) {
        const currentText = textEl.textContent;
        let i = currentText.length;
        function clear() {
            if (i > 0) {
                textEl.textContent = currentText.substring(0, i - 1);
                i--;
                pendingTimers.push(setTimeout(clear, 20));
            } else {
                if (callback) callback();
            }
        }
        clear();
    }

    function runTypewriter() {
        const result = selector.next();
        const slogan = result.text;
        logger.log(
            '[Slogan ' + (result.index + 1) + '/' + slogans.length + ']:',
            slogan.substring(0, 30) + '...'
        );

        typeText(slogan, function () {
            if (loop) {
                pendingTimers.push(
                    setTimeout(function () {
                        clearText(function () {
                            pendingTimers.push(setTimeout(runTypewriter, 300));
                        });
                    }, pauseDuration)
                );
            } else {
                if (cursor) {
                    cursor.style.animation = 'blink 1.5s step-end infinite';
                    cursor.style.opacity = '0.5';
                }
            }
        });
    }

    pendingTimers.push(setTimeout(runTypewriter, typeSpeed * 5));
}

function destroyTypewriter() {
    for (let i = 0; i < pendingTimers.length; i++) {
        clearTimeout(pendingTimers[i]);
    }
    pendingTimers = [];
}

export { initTypewriter, destroyTypewriter };
```

Key changes: removed IIFE + `window.App.typewriter`, import CONFIG/logger/createSloganSelector, `var` → `let`, exported `initTypewriter` and `destroyTypewriter`.

- [ ] **Step 2: Commit**

```bash
git add js/typewriter.js
git commit -m "refactor: convert typewriter.js to ESM with explicit imports"
```

---

### Task 7: Convert time.js to ESM

**Files:**
- Modify: `js/time.js`

- [ ] **Step 1: Rewrite time.js as ESM**

```js
/**
 * 时间组件模块
 * 功能：显示中文格式化的星期、日期、时间
 */

import { CONFIG } from '../config.js';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const NUMBERS = [
    '〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九',
    '二十', '二十一', '二十二', '二十三', '二十四', '二十五', '二十六',
    '二十七', '二十八', '二十九', '三十', '三十一'
];

function numberToChinese(num) {
    return NUMBERS[num] || num.toString();
}

let timerId = null;

function initTime() {
    const weekdayEl = document.getElementById('weekday');
    const dateEl = document.getElementById('dateDisplay');
    const clockEl = document.getElementById('clock');

    if (timerId !== null) {
        clearInterval(timerId);
    }

    function updateTime() {
        const now = new Date();
        const config = CONFIG.time;

        if (weekdayEl && config.showWeekday !== false) {
            weekdayEl.textContent = WEEKDAYS[now.getDay()];
        }

        if (dateEl && config.showDate !== false) {
            const month = MONTHS[now.getMonth()];
            const day = numberToChinese(now.getDate());
            dateEl.textContent = month + day + '日';
        }

        if (clockEl) {
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            if (config.format === '12h') {
                const period = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                clockEl.textContent = String(hours).padStart(2, '0') + ':' + minutes + ':' + seconds + ' ' + period;
            } else {
                clockEl.textContent = String(hours).padStart(2, '0') + ':' + minutes + ':' + seconds;
            }
        }
    }

    updateTime();
    timerId = setInterval(updateTime, CONFIG.time.updateInterval || 1000);
}

function destroyTime() {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
}

export { initTime, destroyTime };
```

Key changes: removed IIFE + `window.App.time`, import CONFIG, `var` → `let`/`const`, exported `initTime` and `destroyTime`, `hours` uses `let` since it may be reassigned in 12h mode.

- [ ] **Step 2: Commit**

```bash
git add js/time.js
git commit -m "refactor: convert time.js to ESM with explicit import"
```

---

### Task 8: Convert social.js to ESM

**Files:**
- Modify: `js/social.js`

- [ ] **Step 1: Rewrite social.js as ESM**

```js
/**
 * 社交链接模块
 * 功能：根据 CONFIG 动态生成社交链接
 */

import { CONFIG } from '../config.js';
import { logger } from './logger.js';
import { utils } from './utils.js';

function initSocialLinks() {
    if (!CONFIG.socialLinks || !CONFIG.socialLinks.links) return;

    const socialContainer = document.getElementById('socialLinks');
    if (!socialContainer) return;

    const links = CONFIG.socialLinks.links;
    const colorScheme = CONFIG.socialLinks.colorScheme || 'cycle';
    const cycleColors = ['#ffe600', '#ff3e3e', '#3e59ff'];
    const legacyCompatMode = utils.isLegacyCompatMode();

    socialContainer.innerHTML = '';

    links.forEach(function (link, index) {
        let color = link.color;

        if (!color) {
            if (colorScheme === 'same') {
                color = cycleColors[0];
            } else {
                color = cycleColors[index % cycleColors.length];
            }
        }

        const a = document.createElement('a');
        a.href = link.url;
        a.setAttribute('aria-label', link.name);
        const isMailto = link.url.indexOf('mailto:') === 0;
        a.target = isMailto ? '_self' : '_blank';
        a.rel = isMailto ? '' : 'noopener noreferrer';

        a.className = 'social-link social-link--custom';
        a.style.setProperty('--custom-color', color);
        if (legacyCompatMode) {
            a.style.color = color;
        }

        const label = document.createElement('span');
        label.className = 'link-label';
        label.textContent = link.name;

        if (!legacyCompatMode && link.icon) {
            const icon = document.createElement('i');
            icon.className = link.icon;
            icon.setAttribute('aria-hidden', 'true');
            a.appendChild(icon);
        }

        a.appendChild(label);
        socialContainer.appendChild(a);
    });

    logger.log('[配置] 已生成 ' + links.length + ' 个社交链接');
}

function applyProfileConfig() {
    const config = CONFIG.profile;

    const nameEl = document.querySelector('.name');
    if (nameEl && config.name) {
        nameEl.textContent = config.name;
    }

    const statusTextEl = document.querySelector('.status-text');
    if (statusTextEl && config.status) {
        statusTextEl.textContent = config.status;
    }

    const avatarImg = document.querySelector('.avatar-image');
    const avatarBox = document.getElementById('avatarBox');
    if (config.avatar) {
        if (avatarImg) avatarImg.src = config.avatar;
        if (avatarBox && !('objectFit' in document.documentElement.style)) {
            avatarBox.style.backgroundImage = 'url(' + config.avatar + ')';
        }
    }

    const footerTextEl = document.getElementById('footerText');
    if (footerTextEl && CONFIG.footer) {
        const text = CONFIG.footer.text || 'BUILT WITH PASSION';
        const year = new Date().getFullYear();
        footerTextEl.textContent = text + ' \u2022 ' + year;
    }

    logger.log('[配置] 个人信息已应用');
}

function detectObjectFit() {
    if (!('objectFit' in document.documentElement.style)) {
        document.documentElement.className += ' no-object-fit';
    }
}

detectObjectFit();

export { initSocialLinks, applyProfileConfig };
```

Key changes: removed IIFE + `window.App.social`, import CONFIG/logger/utils, `var` → `let`/`const`, exported `initSocialLinks` and `applyProfileConfig`.

- [ ] **Step 2: Commit**

```bash
git add js/social.js
git commit -m "refactor: convert social.js to ESM with explicit imports"
```

---

### Task 9: Convert wallpaper.js to ESM

**Files:**
- Modify: `js/wallpaper.js`

- [ ] **Step 1: Rewrite wallpaper.js as ESM**

This is the largest file. The transformation pattern is the same: remove IIFE, remove `window.App.wallpaper = WallpaperScroller`, add imports, use `const`/`let`, add `export`.

```js
/**
 * 壁纸滚动模块 - 独立封装
 * 功能：无限滚动壁纸、竞速加载、懒加载、自动滚动
 */

import { CONFIG } from '../config.js';
import { logger } from './logger.js';

function WallpaperScroller(containerId, wallpaperConfig, loadingConfig, onReady) {
    const infiniteScroll = (wallpaperConfig && wallpaperConfig.infiniteScroll) || {};

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

    this.apis =
        this.wallpaperConfig.apis ||
        (function () {
            logger.warn('[壁纸] 未配置壁纸 API，壁纸功能不可用');
            return [];
        })();
    this.raceTimeout = this.wallpaperConfig.raceTimeout || 10000;
    this.maxRetries = this.wallpaperConfig.maxRetries || 5;
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
    const self = this;

    this.container = document.getElementById(this.containerId);
    if (!this.container) {
        logger.error('[壁纸] 容器元素未找到:', this.containerId);
        return;
    }

    if (!this.infiniteScrollEnabled) {
        logger.log('[壁纸] 无限滚动已禁用');
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
            logger.error('[壁纸] 初始化失败:', err);
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
    const self = this;

    this.observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    self._loadImageIntoPlaceholder(entry.target);
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
    this.container.addEventListener(
        'mousedown',
        function (e) {
            e.preventDefault();
        },
        { passive: false }
    );
};

WallpaperScroller.prototype._buildImageUrl = function (api, index) {
    return api + '?t=' + Date.now() + '_' + index;
};

WallpaperScroller.prototype._clearImageRequest = function (img) {
    img.onload = null;
    img.onerror = null;
    if (img.src) {
        img.removeAttribute('src');
    }
};

WallpaperScroller.prototype._raceLoadImage = function (index) {
    const self = this;

    return new Promise(function (resolve, reject) {
        const images = self.apis.map(function () {
            return new Image();
        });
        let done = false;
        let failureCount = 0;

        const timer = setTimeout(function () {
            if (done) return;
            done = true;
            images.forEach(function (img) {
                self._clearImageRequest(img);
            });
            reject(new Error('Timeout'));
        }, self.raceTimeout);

        function finishSuccess(img) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            images.forEach(function (candidate) {
                if (candidate !== img) {
                    self._clearImageRequest(candidate);
                }
            });
            resolve(img);
        }

        function finishFailure() {
            if (done) return;

            failureCount++;
            if (failureCount < images.length) return;

            done = true;
            clearTimeout(timer);
            images.forEach(function (img) {
                self._clearImageRequest(img);
            });
            reject(new Error('All wallpaper sources failed'));
        }

        images.forEach(function (img, i) {
            img.onload = function () {
                finishSuccess(img);
            };
            img.onerror = finishFailure;
            img.src = self._buildImageUrl(self.apis[i], index);
        });
    });
};

WallpaperScroller.prototype._loadWithRetry = function (index) {
    const self = this;
    let attempt = 0;

    function tryLoad() {
        attempt++;

        return self._raceLoadImage(index).catch(function (err) {
            logger.log('[壁纸] 加载中... (' + attempt + '/' + self.maxRetries + ')');
            if (attempt >= self.maxRetries) {
                throw err;
            }
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
            return new Promise(function (resolve) {
                setTimeout(resolve, delay);
            }).then(function () {
                return tryLoad();
            });
        });
    }

    return tryLoad();
};

WallpaperScroller.prototype._loadImageIntoPlaceholder = function (placeholder) {
    if (placeholder.dataset.loaded) return;
    if (placeholder.dataset.loading) return;

    placeholder.dataset.loading = 'true';

    this._loadWithRetry(placeholder.dataset.index)
        .then(function (img) {
            placeholder.appendChild(img);
            placeholder.dataset.loaded = 'true';
            delete placeholder.dataset.loading;
            requestAnimationFrame(function () {
                placeholder.classList.add('loaded');
            });
        })
        .catch(function () {
            delete placeholder.dataset.loading;
            logger.error('[壁纸] 懒加载失败:', placeholder.dataset.index);
        });
};

WallpaperScroller.prototype._createPlaceholder = function () {
    const div = document.createElement('div');
    div.className = 'wallpaper-image';
    return div;
};

WallpaperScroller.prototype._addPlaceholders = function (count) {
    let i;
    for (i = 0; i < count; i++) {
        const placeholder = this._createPlaceholder();
        placeholder.dataset.index = this.imageCounter++;
        this.container.appendChild(placeholder);
        this.images.push(placeholder);
        this.observer.observe(placeholder);
    }
};

WallpaperScroller.prototype._cleanup = function () {
    while (this.images.length > this.maxImages) {
        const old = this.images.shift();
        this.observer.unobserve(old);
        delete old.dataset.index;
        delete old.dataset.loaded;
        delete old.dataset.loading;
        old.remove();
    }
};

WallpaperScroller.prototype._autoScroll = function () {
    const self = this;
    let scrollBottom;

    if (this.isDestroyed) return;

    this.container.scrollTop += this.scrollSpeed;

    scrollBottom = this.container.scrollTop + this.container.clientHeight;
    if (this.container.scrollHeight - scrollBottom < this.loadThreshold) {
        this._addPlaceholders(this.batchSize);
        this._cleanup();
    }

    this.autoScrollId = requestAnimationFrame(function () {
        self._autoScroll();
    });
};

WallpaperScroller.prototype._startAutoScroll = function () {
    const self = this;

    this._addPlaceholders(this.batchSize);
    this.autoScrollId = requestAnimationFrame(function () {
        self._autoScroll();
    });
};

WallpaperScroller.prototype._loadInitialImages = function () {
    const self = this;
    const loadingText = document.getElementById('loadingText');
    const loadingBar = document.getElementById('loadingBar');
    const loadingPercent = document.getElementById('loadingPercent');
    const placeholders = [];
    let loadedCount = 0;
    let i;

    if (loadingText && this.loadingTexts.length > 1) {
        this.textInterval = setInterval(function () {
            self.currentLoadingTextIndex = (self.currentLoadingTextIndex + 1) % self.loadingTexts.length;
            loadingText.textContent = self.loadingTexts[self.currentLoadingTextIndex];
        }, this.textSwitchInterval);
    }

    for (i = 0; i < this.preloadCount; i++) {
        const placeholder = this._createPlaceholder();
        placeholder.dataset.index = this.imageCounter++;
        this.container.appendChild(placeholder);
        this.images.push(placeholder);
        placeholders.push(placeholder);
    }

    function updateProgress() {
        const percent = Math.round((loadedCount / self.preloadCount) * 100);
        if (loadingBar) loadingBar.style.width = percent + '%';
        if (loadingPercent) loadingPercent.textContent = percent + '%';
    }

    return Promise.all(
        placeholders.map(function (placeholder, index) {
            return self
                ._loadWithRetry(placeholder.dataset.index)
                .then(function (img) {
                    placeholder.appendChild(img);
                    placeholder.dataset.loaded = 'true';
                    placeholder.classList.add('loaded');
                    loadedCount++;
                    updateProgress();
                })
                .catch(function () {
                    logger.error('[壁纸] 第 ' + (index + 1) + ' 张加载失败');
                    loadedCount++;
                    updateProgress();
                });
        })
    ).then(function () {
        placeholders.forEach(function (placeholder) {
            self.observer.observe(placeholder);
        });

        if (self.textInterval) {
            clearInterval(self.textInterval);
            self.textInterval = null;
        }
    });
};

export { WallpaperScroller };
```

Key changes: removed IIFE + `window.App.wallpaper`, import CONFIG/logger, `var` → `let`/`const`, exported `WallpaperScroller`. All `App.logger` → `logger`, all `App.config` references were already using constructor params so they stay as `this.wallpaperConfig` etc.

- [ ] **Step 2: Commit**

```bash
git add js/wallpaper.js
git commit -m "refactor: convert wallpaper.js to ESM with explicit imports"
```

---

### Task 10: Create js/app.js entry point

**Files:**
- Create: `js/app.js`
- Delete: `js/main.js`

This is the orchestration file that replaces `js/main.js`. It imports all modules and wires them together.

- [ ] **Step 1: Create js/app.js**

```js
/**
 * 个人主页 - 主入口
 * 功能：配置校验、模块初始化、Font Awesome 加载、壁纸、滚动动画、移动端交互
 */

import { CONFIG } from '../config.js';
import './polyfills.js';
import { logger } from './logger.js';
import { utils } from './utils.js';
import { initTypewriter, destroyTypewriter } from './typewriter.js';
import { initTime, destroyTime } from './time.js';
import { initSocialLinks, applyProfileConfig } from './social.js';
import { WallpaperScroller } from './wallpaper.js';
import { validate } from './validate-config.js';

// ========== 配置验证 ==========
const validationResult = validate(CONFIG);
if (!validationResult.valid) {
    validationResult.errors.forEach(function (e) {
        console.error('[CONFIG] ' + e);
    });
    // 仍然显示页面内容，但跳过模块初始化
    const mainEl = document.querySelector('.container');
    const overlayEl = document.getElementById('loadingOverlay');
    if (mainEl) mainEl.classList.add('visible');
    if (overlayEl) overlayEl.classList.add('hidden');
    throw new Error('Config validation failed: ' + validationResult.errors.join('; '));
}

logger.log('%c配置已加载 \u2713', 'color: #FFE600; font-size: 12px;');
logger.log('Slogan 数量:', CONFIG.slogans.list.length);

function revealMainContent() {
    const main = document.querySelector('.container');
    const overlay = document.getElementById('loadingOverlay');

    utils.addClass(main, 'visible');
    utils.addClass(overlay, 'hidden');
}

function simplifyLegacyLoadingText() {
    const loadingText = document.getElementById('loadingText');
    if (!utils.isLegacyCompatMode() || !loadingText) return;

    const legacyText = loadingText.getAttribute('data-legacy-text');
    if (legacyText) {
        loadingText.textContent = legacyText;
    }
}

// ========== 动态加载 Font Awesome（5秒超时放弃）==========
(function loadFontAwesome() {
    if (utils.isLegacyCompatMode()) {
        logger.log('[兼容模式] 跳过 Font Awesome');
        return;
    }

    const fontAwesomeUrl = 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css';
    const timeout = 5000;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontAwesomeUrl;
    link.crossOrigin = 'anonymous';

    let isLoaded = false;

    const timer = setTimeout(function () {
        if (!isLoaded) {
            document.head.removeChild(link);
            logger.warn('[Font Awesome] 加载超时，已放弃加载');
        }
    }, timeout);

    link.onload = function () {
        isLoaded = true;
        clearTimeout(timer);
        logger.log('[Font Awesome] 加载成功');
    };

    link.onerror = function () {
        isLoaded = true;
        clearTimeout(timer);
        document.head.removeChild(link);
        logger.warn('[Font Awesome] 加载失败');
    };

    document.head.appendChild(link);
})();

// ========== 壁纸初始化 ==========
(function initWallpaper() {
    if (utils.isLegacyCompatMode()) {
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

// ========== 滚动触发动画 ==========
(function initScrollAnimations() {
    if (utils.isLegacyCompatMode()) {
        logger.log('[兼容模式] 跳过滚动动画');
        return;
    }

    const config = CONFIG.effects && CONFIG.effects.scrollReveal;
    if (!config || !config.enabled) return;

    const targetSelectors = ['.social-link', '.info-panel', '.wallpaper-info', '.avatar-box', '.name', '.status-bar'];

    const targets = document.querySelectorAll(targetSelectors.join(','));
    if (!targets.length) return;

    targets.forEach(function (el, index) {
        el.classList.add('scroll-reveal');
        el.style.transitionDelay = index * config.delay + 'ms';
    });

    const observer = new IntersectionObserver(
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

    targets.forEach(function (el) {
        observer.observe(el);
    });
    logger.log('[滚动动画] 已初始化，监听元素:', targets.length);
})();

// ========== 移动端粘性头像 ==========
(function initMobileStickyAvatar() {
    if (utils.isLegacyCompatMode()) {
        logger.log('[兼容模式] 跳过移动端粘性头像');
        return;
    }

    const container = document.querySelector('.container');
    const leftPanel = document.querySelector('.left-panel');
    const avatarBox = document.getElementById('avatarBox');

    if (!container || !avatarBox) return;

    function handleScroll() {
        if (!utils.isMobile()) return;
        const scrollContainer = utils.isMobile() ? container : leftPanel;
        const scrolled = scrollContainer.scrollTop > 50;
        if (scrolled) {
            avatarBox.classList.add('scrolled');
        } else {
            avatarBox.classList.remove('scrolled');
        }
    }

    avatarBox.addEventListener('click', function () {
        if (!utils.isMobile()) return;
        const scrollContainer = utils.isMobile() ? container : leftPanel;
        if (scrollContainer.scrollTop > 50) {
            if ('scrollBehavior' in document.documentElement.style) {
                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                scrollContainer.scrollTo(0, 0);
            }
        }
    });

    container.addEventListener('scroll', handleScroll);
    leftPanel.addEventListener('scroll', handleScroll);

    window.addEventListener(
        'resize',
        utils.debounce(function () {
            if (!utils.isMobile()) {
                avatarBox.classList.remove('scrolled');
            }
        }, 150)
    );

    logger.log('[粘性头像] 已初始化');
})();

// ========== 手机端壁纸面板切换（已禁用）==========
(function initMobileWallpaperToggle() {
    if (utils.isLegacyCompatMode()) {
        logger.log('[兼容模式] 跳过移动端壁纸切换');
        return;
    }

    logger.log('[壁纸面板] 移动端右侧面板已禁用，跳过切换初始化');
})();

// ========== 初始化完成 ==========
(function initComplete() {
    simplifyLegacyLoadingText();
    initSocialLinks();
    applyProfileConfig();

    if (utils.isLegacyCompatMode()) {
        revealMainContent();
        logger.log('[兼容模式] 仅保留基础资料与社交链接');
    } else {
        initTypewriter();
        initTime();
    }

    logger.log('%c个人主页脚本已加载', 'color: #FFE600; font-size: 12px;');
    logger.log('功能：打字机效果 (Slogan 循环) | 时间显示 | 壁纸轮播');
})();
```

- [ ] **Step 2: Delete js/main.js**

```bash
rm js/main.js
git rm js/main.js
```

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: add app.js ESM entry point and remove main.js"
```

---

### Task 11: Create js/validate-config.js

**Files:**
- Create: `js/validate-config.js`

- [ ] **Step 1: Create validate-config.js**

```js
/**
 * 配置校验模块
 * 功能：启动期校验 CONFIG 关键字段的存在性和类型
 */

export function validate(config) {
    const errors = [];

    function exists(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length; i++) {
            if (current === undefined || current === null) {
                errors.push(path + ' is missing');
                return false;
            }
            current = current[parts[i]];
        }
        if (current === undefined || current === null) {
            errors.push(path + ' is missing');
            return false;
        }
        return true;
    }

    function required(obj, path, type, extra) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length; i++) {
            if (current === undefined || current === null) {
                errors.push(path + ' is missing');
                return;
            }
            current = current[parts[i]];
        }
        if (current === undefined || current === null) {
            errors.push(path + ' is missing');
            return;
        }
        if (type === 'string') {
            if (typeof current !== 'string') {
                errors.push(path + ' must be a string');
            } else if (extra === 'nonEmpty' && current.length === 0) {
                errors.push(path + ' must be non-empty');
            }
        } else if (type === 'number') {
            if (typeof current !== 'number') {
                errors.push(path + ' must be a number');
            } else if (extra === 'positive' && current <= 0) {
                errors.push(path + ' must be a positive number');
            }
        } else if (type === 'array') {
            if (!Array.isArray(current)) {
                errors.push(path + ' must be an array');
            } else if (extra === 'nonEmpty' && current.length === 0) {
                errors.push(path + ' must be a non-empty array');
            }
        } else if (type === 'enum') {
            if (!extra.includes(current)) {
                errors.push(path + ' must be one of: ' + extra.join(', '));
            }
        }
    }

    // Top-level keys (existence only — they are objects)
    exists(config, 'profile');
    exists(config, 'socialLinks');
    exists(config, 'slogans');
    exists(config, 'wallpaper');
    exists(config, 'time');
    exists(config, 'loading');
    exists(config, 'debug');

    if (config.profile) {
        required(config.profile, 'name', 'string', 'nonEmpty');
        required(config.profile, 'status', 'string');
        required(config.profile, 'avatar', 'string');
    }

    if (config.socialLinks) {
        required(config.socialLinks, 'links', 'array', 'nonEmpty');
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
        required(config.socialLinks, 'colorScheme', 'enum', ['cycle', 'same']);
    }

    if (config.slogans) {
        required(config.slogans, 'list', 'array', 'nonEmpty');
        if (Array.isArray(config.slogans.list)) {
            config.slogans.list.forEach(function (s, i) {
                if (typeof s !== 'string') {
                    errors.push('slogans.list[' + i + '] must be a string');
                }
            });
        }
        required(config.slogans, 'mode', 'enum', ['random', 'sequence']);
        required(config.slogans, 'typeSpeed', 'number', 'positive');
        required(config.slogans, 'pauseDuration', 'number', 'positive');
    }

    if (config.wallpaper) {
        required(config.wallpaper, 'apis', 'array', 'nonEmpty');
        required(config.wallpaper, 'raceTimeout', 'number', 'positive');
        required(config.wallpaper, 'maxRetries', 'number', 'positive');
        required(config.wallpaper, 'preloadCount', 'number', 'positive');
    }

    if (config.time) {
        required(config.time, 'format', 'enum', ['24h', '12h']);
        required(config.time, 'updateInterval', 'number', 'positive');
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}
```

- [ ] **Step 2: Commit**

```bash
git add js/validate-config.js
git commit -m "feat: add config validation module"
```

---

### Task 12: Update index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace script tags in index.html**

Find the section at the bottom of `<body>` that currently has:

```html
        <!-- JavaScript -->
        <!-- 配置文件（同步加载，其他脚本依赖 CONFIG） -->
        <script src="config.js"></script>
        <!-- Polyfill -->
        <script src="js/polyfills.js"></script>
        <!-- 工具模块 -->
        <script src="js/logger.js"></script>
        <script src="js/utils.js"></script>
        <!-- 功能模块 -->
        <script src="js/slogan-selector.js"></script>
        <script src="js/typewriter.js"></script>
        <script src="js/time.js"></script>
        <script src="js/social.js"></script>
        <!-- 壁纸模块 -->
        <script src="js/wallpaper.js"></script>
        <!-- 主脚本 -->
        <script src="js/main.js"></script>
```

Replace with:

```html
        <!-- JavaScript（ES Module 单入口） -->
        <script type="module" src="js/app.js"></script>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "refactor: replace script tags with single ESM entry point"
```

---

### Task 13: Update ESLint config

**Files:**
- Modify: `.eslintrc.json`

- [ ] **Step 1: Update .eslintrc.json**

Replace the entire file:

```json
{
  "env": {
    "browser": true,
    "es2022": true
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "no-undef": "off",
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console": "off",
    "prefer-const": "warn",
    "no-var": "error",
    "eqeqeq": ["error", "always"],
    "no-trailing-spaces": "error",
    "no-multiple-empty-lines": ["error", { "max": 1 }],
    "semi": ["error", "always"]
  }
}
```

Key changes: `sourceType` → `"module"`, `no-var` → `"error"`, removed `"App": "readonly"` global.

- [ ] **Step 2: Run lint to find remaining var usage**

Run: `npm run lint`
Expected: Various `no-var` errors in files not yet migrated (should be none since all are migrated now, but verify). Also check for `App` references that should have been removed.

- [ ] **Step 3: Fix any lint errors**

If errors remain, fix them per the pattern already applied (replace `var` with `const`/`let`, remove `App` references, etc.).

- [ ] **Step 4: Commit**

```bash
git add .eslintrc.json
git commit -m "refactor: update ESLint config for ESM and no-var rule"
```

---

### Task 14: Update build.js for ESM

**Files:**
- Modify: `build.js`

- [ ] **Step 1: Add `module: true` to Terser options**

In `build.js`, find the JS minification section and update the Terser options. Change:

```js
const result = await minify(code, {
    compress: { drop_console: true },
    mangle: true
});
```

To:

```js
const result = await minify(code, {
    compress: { drop_console: true },
    mangle: true,
    module: true
});
```

Also, in the index.html processing section, add a replacement to ensure the `<script type="module">` path is correct. After the existing `html = html.replace(/\n\s*\n/g, '\n');` line, add:

```js
// Verify module script reference is intact
if (!html.includes('type="module"')) {
    console.warn('  Warning: index.html does not contain type="module" script tag');
}
```

- [ ] **Step 2: Remove main.js from build (it no longer exists)**

In `build.js`, no special change needed — it copies the entire `js/` directory. `main.js` won't exist, so it won't be copied. `app.js` will be copied automatically.

- [ ] **Step 3: Run build and verify**

Run: `npm run build`
Expected: Successful build, `dist/js/app.js` exists, `dist/js/main.js` does not exist, `dist/config.js` exists.

- [ ] **Step 4: Commit**

```bash
git add build.js
git commit -m "refactor: update build.js for ESM module support"
```

---

### Task 15: Migrate tests to ESM (.mjs)

**Files:**
- Rename: `tests/config-fields.test.js` → `tests/config-fields.test.mjs`
- Rename: `tests/slogan-selector.test.js` → `tests/slogan-selector.test.mjs`
- Modify: `tests/config-fields.test.mjs`
- Modify: `tests/slogan-selector.test.mjs`
- Modify: `package.json`
- Delete: `tests/build-output.test.js` (depends on old file structure)

- [ ] **Step 1: Rewrite tests/config-fields.test.mjs**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';

describe('CONFIG key fields', () => {
    it('has version string', () => {
        assert.strictEqual(typeof CONFIG.version, 'string');
        assert.ok(CONFIG.version.length > 0);
    });

    it('has profile with name', () => {
        assert.ok(CONFIG.profile);
        assert.strictEqual(typeof CONFIG.profile.name, 'string');
        assert.ok(CONFIG.profile.name.length > 0);
    });

    it('has slogans.list as non-empty array', () => {
        assert.ok(Array.isArray(CONFIG.slogans.list));
        assert.ok(CONFIG.slogans.list.length > 0);
    });

    it('has socialLinks.links as non-empty array', () => {
        assert.ok(Array.isArray(CONFIG.socialLinks.links));
        assert.ok(CONFIG.socialLinks.links.length > 0);
    });

    it('has wallpaper.apis as non-empty array', () => {
        assert.ok(Array.isArray(CONFIG.wallpaper.apis));
        assert.ok(CONFIG.wallpaper.apis.length > 0);
    });

    it('slogans.mode is random or sequence', () => {
        assert.ok(['random', 'sequence'].includes(CONFIG.slogans.mode));
    });
});
```

- [ ] **Step 2: Rewrite tests/slogan-selector.test.mjs**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSloganSelector } from '../js/slogan-selector.js';

describe('createSloganSelector', () => {
    it('sequence mode: returns slogans in order and wraps', () => {
        const slogans = ['alpha', 'beta', 'gamma'];
        const selector = createSloganSelector('sequence', slogans);
        assert.strictEqual(selector.next().text, 'alpha');
        assert.strictEqual(selector.next().text, 'beta');
        assert.strictEqual(selector.next().text, 'gamma');
        assert.strictEqual(selector.next().text, 'alpha');
    });

    it('sequence mode: tracks index starting at 0', () => {
        const slogans = ['a', 'b', 'c'];
        const selector = createSloganSelector('sequence', slogans);
        assert.strictEqual(selector.next().index, 0);
        assert.strictEqual(selector.next().index, 1);
        assert.strictEqual(selector.next().index, 2);
        assert.strictEqual(selector.next().index, 0);
    });

    it('random mode: never repeats the same slogan consecutively', () => {
        const slogans = ['x', 'y', 'z'];
        const selector = createSloganSelector('random', slogans);
        let prev = selector.next();
        for (let i = 0; i < 50; i++) {
            const curr = selector.next();
            assert.notStrictEqual(curr.text, prev.text);
            prev = curr;
        }
    });

    it('random mode: single-item list does not infinite-loop', () => {
        const slogans = ['only'];
        const selector = createSloganSelector('random', slogans);
        const result = selector.next();
        assert.strictEqual(result.text, 'only');
        assert.strictEqual(result.index, 0);
    });

    it('sequence mode: single-item list always returns the same item', () => {
        const slogans = ['only'];
        const selector = createSloganSelector('sequence', slogans);
        assert.strictEqual(selector.next().text, 'only');
        assert.strictEqual(selector.next().text, 'only');
    });

    it('defaults to sequence mode for unknown mode values', () => {
        const slogans = ['a', 'b'];
        const selector = createSloganSelector('unknown', slogans);
        assert.strictEqual(selector.next().text, 'a');
        assert.strictEqual(selector.next().text, 'b');
    });
});
```

- [ ] **Step 3: Add validate-config test**

Create `tests/validate-config.test.mjs`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../js/validate-config.js';
import { CONFIG } from '../config.js';

describe('validate-config', () => {
    it('passes with the current CONFIG', () => {
        const result = validate(CONFIG);
        assert.ok(result.valid, 'CONFIG should be valid, errors: ' + result.errors.join('; '));
    });

    it('reports errors for missing required fields', () => {
        const result = validate({});
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors.length > 0);
    });

    it('reports error for empty slogans.list', () => {
        const config = JSON.parse(JSON.stringify(CONFIG));
        config.slogans.list = [];
        const result = validate(config);
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('slogans.list')));
    });

    it('reports error for invalid time.format', () => {
        const config = JSON.parse(JSON.stringify(CONFIG));
        config.time.format = '25h';
        const result = validate(config);
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('time.format')));
    });

    it('reports error for missing profile.name', () => {
        const config = JSON.parse(JSON.stringify(CONFIG));
        delete config.profile.name;
        const result = validate(config);
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('profile.name')));
    });
});
```

- [ ] **Step 4: Delete old test files**

```bash
rm tests/config-fields.test.js tests/slogan-selector.test.js tests/build-output.test.js
```

- [ ] **Step 5: Update package.json test script**

Change in `package.json`:

```json
"test": "node --test tests/*.test.mjs"
```

Also, to make `import` work from `.js` files in Node, we need `"type": "module"` or we keep `.mjs` for tests. Since `build.js` uses `require()`, we keep `"type": "commonjs"` (default) and use `.mjs` extension for test files. But our source files are `.js` and use ESM syntax — Node.js needs `"type": "module"` to parse `import`/`export` in `.js` files. However, `build.js` uses `require()`.

The resolution: add `"type": "module"` to `package.json`, and rename `build.js` to `build.mjs` (or use dynamic `import()` inside). Actually, the simplest path is:

- Keep `"type": "commonjs"` (default, no change to package.json)
- Source `.js` files with ESM syntax need to be loaded by the browser as `<script type="module">`, which doesn't care about Node's `"type"` field
- Node.js tests need `.mjs` extension to use `import` syntax
- `build.js` uses `require()` so stays as `.js` (commonjs)

This works because the browser doesn't care about Node's `"type"`, and Node test runner supports `.mjs` files.

Update `package.json` test script:

```json
"test": "node --test tests/*.test.mjs"
```

- [ ] **Step 6: Run tests and verify they pass**

Run: `node --test tests/*.test.mjs`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add tests/ package.json
git commit -m "refactor: migrate tests to ESM (.mjs), add validate-config tests"
```

---

### Task 16: Run lint, format check, and build

**Files:**
- N/A (verification only)

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 2: Run format check**

Run: `npm run format:check`
Expected: No errors.

- [ ] **Step 3: Format any issues**

Run: `npm run format`

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Successful build output in `dist/`.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit any formatting fixes**

```bash
git add -A
git commit -m "style: fix formatting after ESM migration"
```

(Only if there were formatting changes.)

---

### Task 17: Add GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create .github/workflows directory and ci.yml**

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/ci.yml`:

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

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI pipeline"
```

---

### Task 18: Update AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update AGENTS.md to reflect new architecture**

Update the "Repo Shape" section to reflect the new ESM architecture. Key changes:

- Replace "global scripts from `js/` in order" with "single ESM entry point `js/app.js`"
- Replace "config.js… browser code relies on the global `CONFIG` constant" with "config.js exports `CONFIG` as an ESM named export"
- Add `js/validate-config.js` to the module list
- Remove `js/main.js` from the module list

Update "Runtime Gotchas" section:

- Remove note about `config.js` exporting `module.exports` and browser code relying on global `CONFIG`
- Add note about ES Module loading being async/deferred by default
- Add note about Node tests using `.mjs` extension

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md to reflect ESM architecture"
```

---

### Task 19: Final verification and clean commit

**Files:**
- N/A (verification only)

- [ ] **Step 1: Run full verification suite**

```bash
npm run lint
npm run format:check
npm run build
npm test
```

Expected: All pass without errors.

- [ ] **Step 2: Verify no `window.App` references remain in source**

```bash
grep -r "window\.App" js/ config.js
```

Expected: No results (all `window.App` references removed).

- [ ] **Step 3: Verify no `var` remains in source files**

```bash
grep -rn "\bvar\b" js/ config.js
```

Expected: No results (all `var` replaced with `const`/`let`).

- [ ] **Step 4: Verify index.html has only one script tag**

Check that `index.html` contains exactly one `<script` tag: `<script type="module" src="js/app.js"></script>`.