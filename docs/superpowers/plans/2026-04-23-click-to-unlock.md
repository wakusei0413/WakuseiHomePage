# Click-to-Unlock Consent Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace passive autoplay recovery with an explicit click-to-unlock consent overlay that grants audio permission, persists in localStorage for 30 days, and uses capture-phase event binding to bypass content-protection preventDefault.

**Architecture:** A new `js/consent.js` module manages consent state via localStorage, controls a fullscreen overlay HTML element, and triggers `tryPlay(audio)` via a callback after user interaction. The overlay shows on first visit; dismissed visits skip it. CSS blur transitions and overlay styles live in `css/components.css`.

**Tech Stack:** Vanilla ES modules, localStorage, CSS transitions, Node.js built-in test runner with `.mjs`.

---

## Files to Create or Modify

| File | Action | Responsibility |
|------|--------|---------------|
| `js/consent.js` | Create | Consent state machine: read/write localStorage, show/dismiss overlay, bind capture-phase events, trigger audio callback |
| `js/audio.js` | Modify | Remove passive recovery listener logic; simplify `tryPlay` to a pure play attempt with error logging |
| `js/app.js` | Modify | Remove all scattered `tryPlay(audio, logger)` calls; import and initialize `initConsent`; pass audio, container, overlay, logger |
| `css/components.css` | Modify | Add `.consent-overlay`, `.consent-panel`, `.consent-text`, `.consent-cursor` styles |
| `index.html` | Modify | Insert `#consentOverlay` HTML element before `<!-- JavaScript（ES Module 单入口） -->` |
| `tests/consent.test.mjs` | Create | Unit tests for localStorage read/write, overlay DOM manipulation, event binding, consentGranted query |
| `js/legacy.js` | Modify | Add consent check and simplified consent text display in legacy mode (no audio) |

---

### Task 1: Create `js/consent.js`

**Rationale:** Centralize consent logic in one dedicated module. No code in this plan depends on external state beyond localStorage and the DOM.

**Files:**
- Create: `js/consent.js`
- Test: `tests/consent.test.mjs` (will write in Task 7)

```javascript
/**
 * 首次访问同意管理器
 * 管理点击解锁流程：模糊页面 → 点击同意 → 存储偏好 → 解锁音频与视觉效果
 */

var STORAGE_KEY = 'wakusei_consent_v1';
var CONSENT_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

/**
 * 读取并验证 localStorage 中的 consent
 * @returns {boolean} 是否已有有效 consent
 */
function hasValidConsent() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return false;
        }
        var data = JSON.parse(raw);
        if (data && data.granted && typeof data.timestamp === 'number') {
            return Date.now() - data.timestamp < CONSENT_DURATION_MS;
        }
    } catch (e) {
        // localStorage 不可用或数据损坏，视为无 consent
    }
    return false;
}

/**
 * 写入 consent 到 localStorage
 */
function saveConsent() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                granted: true,
                timestamp: Date.now()
            })
        );
    } catch (e) {
        // localStorage 不可用时静默失败，每次加载都重新请求同意
    }
}

/**
 * 显示同意覆盖层，主页面变为模糊
 * @param {HTMLElement} container — `.container` 元素
 * @param {HTMLElement} overlay — `#consentOverlay` 元素
 */
function showConsentOverlay(container, overlay) {
    if (container) {
        container.style.filter = 'blur(12px) brightness(0.35)';
        container.style.pointerEvents = 'none';
    }
    if (overlay) {
        overlay.classList.add('active');
    }
}

/**
 * 隐藏同意覆盖层，主页面解除模糊
 * @param {HTMLElement} container — `.container` 元素
 * @param {HTMLElement} overlay — `#consentOverlay` 元素
 */
function dismissConsentOverlay(container, overlay) {
    if (overlay) {
        overlay.classList.remove('active');
        overlay.classList.add('dismissed');
    }
    if (container) {
        container.style.filter = '';
        container.style.pointerEvents = '';
        container.classList.add('visible');
    }
}

/**
 * 监听用户的第一次交互，触发同意解锁
 * 使用 capture: true 确保在内容保护 preventDefault 之前执行
 * @param {HTMLElement} container — `.container` 元素
 * @param {HTMLElement} overlay — `#consentOverlay` 元素
 * @param {Function} onConsent — 用户同意后的回调（触发音频播放等）
 * @param {Object} logger — logger 实例
 */
function bindConsentEvents(container, overlay, onConsent, logger) {
    var triggered = false;

    function handleConsent() {
        if (triggered) {
            return;
        }
        triggered = true;

        saveConsent();
        dismissConsentOverlay(container, overlay);

        if (logger) {
            logger.log('[Consent] 用户已同意，解锁体验');
        }

        setTimeout(function () {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);

        if (typeof onConsent === 'function') {
            onConsent();
        }
    }

    document.addEventListener('mousedown', handleConsent, { capture: true, once: true });
    document.addEventListener('touchstart', handleConsent, { capture: true, once: true });
    document.addEventListener('keydown', handleConsent, { capture: true, once: true });
}

/**
 * 初始化同意管理器
 * @param {HTMLElement} container — `.container` 元素
 * @param {HTMLElement} overlay — `#consentOverlay` 元素
 * @param {Function} onConsent — 用户同意后的回调（触发音频播放等）
 * @param {Object} logger — logger 实例
 */
export function initConsent(container, overlay, onConsent, logger) {
    if (hasValidConsent()) {
        if (logger) {
            logger.log('[Consent] 已有有效 consent，跳过解锁');
        }
        if (typeof onConsent === 'function') {
            setTimeout(onConsent, 100);
        }
        return;
    }

    showConsentOverlay(container, overlay);
    bindConsentEvents(container, overlay, onConsent, logger);
}

/**
 * 供外部调用的 consent 状态查询（例如 legacy.js 判断是否需要跳过）
 * @returns {boolean}
 */
export function consentGranted() {
    return hasValidConsent();
}
```

- [ ] **Step 1: Write `js/consent.js`**

Create the file with the above content.

- [ ] **Step 2: Run lint on new file**

Run: `npm run lint -- js/consent.js`  
Expected: Pass with no errors.

- [ ] **Step 3: Commit**

```bash
git add js/consent.js
git commit -m "feat: add consent manager module for click-to-unlock"
```

---

### Task 2: Modify `js/audio.js` — Remove Passive Recovery

**Rationale:** The `tryPlay` function currently adds `mousedown`/`touchstart`/`keydown` listeners on `NotAllowedError` to attempt recovery. After the consent overlay refactor, recovery is unnecessary — the user's click already triggered consent and `tryPlay` is called with a valid activation gesture. Removing this simplifies the module and prevents duplicate listeners.

**Files:**
- Modify: `js/audio.js:57-98`

Replace the entire `tryPlay` function body with:

```javascript
export function tryPlay(audio, logger) {
    if (!audio) {
        return;
    }

    var playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise
            .then(function () {
                if (logger) {
                    logger.log('[音频] 播放已开始');
                }
            })
            .catch(function (error) {
                if (logger) {
                    if (error.name === 'NotAllowedError') {
                        logger.warn('[音频] 浏览器阻止播放');
                    } else {
                        logger.warn('[音频] 播放失败:', error.message);
                    }
                }
            });
    }
}
```

- [ ] **Step 1: Edit `js/audio.js`**

Replace `tryPlay` with the simplified version above.

- [ ] **Step 2: Verify existing tests still pass**

Run: `npm test -- tests/audio.test.mjs`  
Expected: PASS (the test only checks `does not throw when audio is null`, which still passes).

- [ ] **Step 3: Run lint on modified file**

Run: `npm run lint -- js/audio.js`  
Expected: Pass.

- [ ] **Step 4: Commit**

```bash
git add js/audio.js
git commit -m "refactor: simplify tryPlay — delegate recovery to consent module"
```

---

### Task 3: Modify `index.html` — Insert Consent Overlay Element

**Rationale:** The overlay must exist in the DOM before `app.js` runs, so it can be passed to `initConsent`.

**Files:**
- Modify: `index.html:172`

Insert the following HTML before the `<!-- JavaScript（ES Module 单入口） -->` comment:

```html
        <!-- 首次访问同意覆盖层 -->
        <div class="consent-overlay" id="consentOverlay">
            <div class="consent-panel">
                <p class="consent-text">点击任意处以继续</p>
                <span class="consent-cursor">▾</span>
            </div>
        </div>
```

The exact insertion point is after line 171 (`</button>`) and before line 173 (`<!-- JavaScript（ES Module 单入口） -->`).

- [ ] **Step 1: Edit `index.html`**

Insert the consent overlay HTML.

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add consent overlay HTML element"
```

---

### Task 4: Modify `css/components.css` — Add Consent Overlay Styles

**Rationale:** The overlay needs Brutalist styling: bold borders, high contrast, yellow accent cursor. We must also ensure `.consent-cursor` is declared after any conflicting cursor styles. `.container` filter is managed via inline style in JS, so no `.container` class styles are needed.

**Files:**
- Modify: `css/components.css` (append to file)

Append to the end of `css/components.css`:

```css
/* ===== 同意覆盖层 ===== */
.consent-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    /* 半透明黑，让模糊页面若隐若现 */
    background: rgba(10, 10, 10, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9997;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease-out;
}

.consent-overlay.active {
    opacity: 1;
    pointer-events: auto;
}

.consent-overlay.dismissed {
    opacity: 0;
    pointer-events: none;
}

.consent-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
}

/* IE11 flexbox gap fallback */
.consent-panel > * + * {
    margin-top: 1.5rem;
}

@supports (gap: 1.5rem) {
    .consent-panel > * + * {
        margin-top: 0;
    }
}

.consent-text {
    font-family: var(--font-display, 'Space Grotesk', 'Noto Sans SC', sans-serif);
    font-size: clamp(1.5rem, 4vw, 3rem);
    font-weight: 700;
    color: #fffef7;
    text-align: center;
    letter-spacing: 0.05em;
    user-select: none;
    pointer-events: none;
}

.consent-cursor {
    display: block;
    font-size: 2rem;
    color: var(--accent-yellow, #ffe600);
    animation: consent-bounce 1.2s ease-in-out infinite;
    user-select: none;
    pointer-events: none;
}

@keyframes consent-bounce {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(8px);
    }
}
```

- [ ] **Step 1: Append styles to `css/components.css`**

- [ ] **Step 2: Run format check on CSS**

Run: `npm run format:check`  
Expected: All matched files use Prettier code style.

- [ ] **Step 3: Commit**

```bash
git add css/components.css
git commit -m "feat: add consent overlay CSS styles"
```

---

### Task 5: Modify `js/app.js` — Integrate Consent Module

**Rationale:** `app.js` currently calls `tryPlay(audio, logger)` at four scattered points (legacy mode, wallpaper ready, wallpaper error, init completion). These must be replaced by a single `initConsent` call that manages the consent lifecycle.

**Files:**
- Modify: `js/app.js`

**Changes:**

1. **Add import:**

   Replace the import line:
   ```javascript
   import { initAudio, tryPlay } from './audio.js';
   ```
   with:
   ```javascript
   import { initAudio } from './audio.js';
   import { initConsent } from './consent.js';
   ```

2. **Replace the Legacy Mode `revealMainContent + tryPlay` block:**

   Replace:
   ```javascript
   // ========== 壁纸初始化 ==========
   if (utils.isLegacyCompatMode()) {
       logger.log('[兼容模式] 跳过壁纸模块');
       revealMainContent();
       tryPlay(audio, logger);
   } else {
       try {
           const wallpaper = new WallpaperScroller('wallpaperScrollArea', CONFIG.wallpaper, CONFIG.loading, function () {
               revealMainContent();
               tryPlay(audio, logger);
           });
           wallpaper.init();
           logger.log('[壁纸] 模块已初始化');
       } catch (error) {
           logger.error('[壁纸] 初始化失败', error);
           revealMainContent();
           tryPlay(audio, logger);
       }
   }
   ```
   with:
   ```javascript
   // 同意管理器初始化（必须在 revealMainContent 之前捕获 DOM 引用）
   var container = document.getElementById('mainContent');
   var consentOverlay = document.getElementById('consentOverlay');

   function triggerAudio() {
       tryPlay(audio, logger);
   }

   // ========== 壁纸初始化 ==========
   if (utils.isLegacyCompatMode()) {
       logger.log('[兼容模式] 跳过壁纸模块');
       revealMainContent();
       initConsent(container, consentOverlay, triggerAudio, logger);
   } else {
       try {
           var wallpaper = new WallpaperScroller('wallpaperScrollArea', CONFIG.wallpaper, CONFIG.loading, function () {
               revealMainContent();
               initConsent(container, consentOverlay, triggerAudio, logger);
           });
           wallpaper.init();
           logger.log('[壁纸] 模块已初始化');
       } catch (error) {
           logger.error('[壁纸] 初始化失败', error);
           revealMainContent();
           initConsent(container, consentOverlay, triggerAudio, logger);
       }
   }
   ```

3. **Remove trailing `tryPlay` at init completion:**

   Replace:
   ```javascript
   if (utils.isLegacyCompatMode()) {
       revealMainContent();
       tryPlay(audio, logger);
       logger.log('[兼容模式] 仅保留基础资料与社交链接');
   } else {
       initTypewriter();
       initTime();
   }
   ```
   with:
   ```javascript
   if (utils.isLegacyCompatMode()) {
       logger.log('[兼容模式] 仅保留基础资料与社交链接');
   } else {
       initTypewriter();
       initTime();
   }
   ```

   Note: `revealMainContent()` is no longer called here because it was already called earlier in the legacy branch.

   Wait — actually, the second `revealMainContent` call in the legacy branch at the bottom of the file is a duplicate that was already present in the original. Let me re-examine the original `app.js`:

   Original lines 97-101: `if (utils.isLegacyCompatMode()) { revealMainContent(); tryPlay(audio, logger); }`
   Original lines 127-131: `if (utils.isLegacyCompatMode()) { revealMainContent(); tryPlay(audio, logger); ... }`

   So `revealMainContent` IS called twice in legacy mode in the original — the first in the wallpaper init block, the second in the "init completion" block. The second one is a no-op for the overlay (already `.hidden`) but re-adds `.visible` to `.container`.

   In the refactored version, the second `if (utils.isLegacyCompatMode())` block should only log and not call `revealMainContent` or `tryPlay` again, because they were already handled.

4. **Remove old `tryPlay(audio, logger)` import dependency:**

   The `tryPlay` function must still exist (it's used in `triggerAudio`), so keep importing it. Actually, since `triggerAudio` calls `tryPlay`, we still need it. So...

   Wait, let me re-examine. The import should be:
   ```javascript
   import { initAudio, tryPlay } from './audio.js';
   ```
   Because `triggerAudio` calls `tryPlay`. The original import was fine.

   So the only change is:
   - Add `import { initConsent } from './consent.js';`
   - Create `container` and `consentOverlay` references
   - Create `triggerAudio` helper
   - Replace all `tryPlay(audio, logger)` with `initConsent(...)` in all four call sites
   - Remove the second `revealMainContent()`/`tryPlay()` in the legacy branch at init completion

   Wait, but I also said to simplify the `initAudio` import. Actually no — we still need `tryPlay`, so the original `import { initAudio, tryPlay } from './audio.js';` is correct.

   So the correct import changes: just add the `initConsent` import.

- [ ] **Step 1: Edit `js/app.js` — add `initConsent` import and wrap all reveal/tryPlay with consent**

Make the changes described above. After editing, `app.js` should:
- Import `{ initAudio, tryPlay }` from `'./audio.js'` (unchanged) and add `import { initConsent } from './consent.js';`
- Define `var container = document.getElementById('mainContent');`
- Define `var consentOverlay = document.getElementById('consentOverlay');`
- Define `var triggerAudio = function() { tryPlay(audio, logger); };`
- In legacy mode: `revealMainContent(); initConsent(container, consentOverlay, triggerAudio, logger);`
- In wallpaper ready: `revealMainContent(); initConsent(container, consentOverlay, triggerAudio, logger);`
- In wallpaper error: `revealMainContent(); initConsent(container, consentOverlay, triggerAudio, logger);`
- Remove the second `revealMainContent(); tryPlay(audio, logger);` in the bottom legacy branch

- [ ] **Step 2: Run lint**

Run: `npm run lint`  
Expected: Pass with no errors.

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: integrate consent module — replace scattered tryPlay with unified consent flow"
```

---

### Task 6: Modify `js/legacy.js` — Legacy Mode Consent Check

**Rationale:** In legacy mode (IE/old Edge), there is no audio but we still want to show a simplified consent text for visual consistency if the user hasn't consented.

**Files:**
- Modify: `js/legacy.js`

After the existing `var supportsCssVars = ...` block and before the loading text manipulation, add:

```javascript
var consentGranted = false;
try {
    var consentRaw = localStorage.getItem('wakusei_consent_v1');
    if (consentRaw) {
        var consentData = JSON.parse(consentRaw);
        if (consentData && consentData.granted) {
            consentGranted = true;
        }
    }
} catch (e) {}

if (!consentGranted) {
    // 简化的首次访问提示（legacy 模式下无音频，仅用于视觉一致性）
    var consentTextEl = document.createElement('div');
    consentTextEl.className = 'legacy-consent-text';
    consentTextEl.innerHTML = '点击任意处以继续';
    consentTextEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);color:#fffef7;font-size:2rem;font-weight:bold;z-index:9997;cursor:pointer;';
    document.body.appendChild(consentTextEl);

    function dismissLegacyConsent() {
        if (consentTextEl && consentTextEl.parentNode) {
            consentTextEl.parentNode.removeChild(consentTextEl);
        }
        try {
            localStorage.setItem('wakusei_consent_v1', JSON.stringify({ granted: true, timestamp: Date.now() }));
        } catch (e) {}
    }

    document.addEventListener('click', dismissLegacyConsent, { once: true });
    document.addEventListener('touchstart', dismissLegacyConsent, { once: true });
    document.addEventListener('keydown', dismissLegacyConsent, { once: true });
}
```

- [ ] **Step 1: Edit `js/legacy.js`**

Insert the code after the browser capability detection block.

- [ ] **Step 2: Commit**

```bash
git add js/legacy.js
git commit -m "feat: legacy mode consent overlay (visual-only, no audio)"
```

---

### Task 7: Create `tests/consent.test.mjs`

**Rationale:** Test localStorage read/write, DOM class toggling, and event handler dispatch independently.

**Files:**
- Create: `tests/consent.test.mjs`

```javascript
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initConsent, consentGranted } from '../js/consent.js';

describe('consent module', () => {
    beforeEach(() => {
        // Reset localStorage between tests
        try {
            localStorage.clear();
        } catch (e) {
            // localStorage may not exist in test env
        }
    });

    it('consentGranted returns false when no localStorage key exists', () => {
        assert.strictEqual(consentGranted(), false);
    });

    it('consentGranted returns false when localStorage data is invalid JSON', () => {
        try {
            localStorage.setItem('wakusei_consent_v1', 'not-json');
        } catch (e) {}
        assert.strictEqual(consentGranted(), false);
    });

    it('consentGranted returns false when consent is expired (>30d)', () => {
        try {
            localStorage.setItem(
                'wakusei_consent_v1',
                JSON.stringify({ granted: true, timestamp: Date.now() - 31 * 24 * 60 * 60 * 1000 })
            );
        } catch (e) {}
        assert.strictEqual(consentGranted(), false);
    });

    it('consentGranted returns true when consent is within 30 days', () => {
        try {
            localStorage.setItem(
                'wakusei_consent_v1',
                JSON.stringify({ granted: true, timestamp: Date.now() - 1000 })
            );
        } catch (e) {}
        assert.strictEqual(consentGranted(), true);
    });

    it('initConsent calls onConsent immediately when consent already granted', () => {
        try {
            localStorage.setItem(
                'wakusei_consent_v1',
                JSON.stringify({ granted: true, timestamp: Date.now() })
            );
        } catch (e) {}

        let called = false;
        initConsent(null, null, function () {
            called = true;
        }, null);

        assert.strictEqual(called, true);
    });
});
```

- [ ] **Step 1: Create test file**

- [ ] **Step 2: Run tests**

Run: `npm test`  
Expected: All 73 existing tests + new consent tests pass. Total suites ~20.

- [ ] **Step 3: Commit**

```bash
git add tests/consent.test.mjs
git commit -m "test: add consent manager unit tests"
```

---

### Task 8: End-to-End Verification

**Files:** (none new — verification step)

- [ ] **Step 1: Run lint**

Run: `npm run lint`  
Expected: No errors.

- [ ] **Step 2: Run format check**

Run: `npm run format:check`  
Expected: All matched files use Prettier code style.

- [ ] **Step 3: Run tests**

Run: `npm test`  
Expected: All tests pass.

- [ ] **Step 4: Run build**

Run: `npm run build`  
Expected: Build completes successfully, copying the new `consent.js`, `tests/consent.test.mjs`, and updated files to `dist/`.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete click-to-unlock consent overlay implementation

- First-time visitors see blurred page + '点击任意处以继续' overlay
- capture-phase event binding bypasses content-protection preventDefault
- localStorage persists consent for 30 days
- Simplified legacy.js consent display (no audio)
- Unified audio trigger via onConsent callback, replaces scattered tryPlay"
```

---

## Plan Self-Review

**Spec coverage check:**

| Spec Requirement | Task |
|-----------------|------|
| `hasValidConsent()` / `saveConsent()` localStorage read/write | Task 1 (consent.js) |
| `showConsentOverlay()` | Task 1 (consent.js) |
| `dismissConsentOverlay()` | Task 1 (consent.js) |
| `bindConsentEvents` with `capture: true` | Task 1 (consent.js) |
| `initConsent(container, overlay, onConsent, logger)` | Task 1 + 5 (consent.js + app.js) |
| Overlay HTML element `#consentOverlay` | Task 3 (index.html) |
| Consent CSS styles (`.consent-overlay`, `.consent-text`, `.consent-cursor`) | Task 4 (components.css) |
| `container.style.filter = 'blur(12px) brightness(0.35)'` | Task 1 (consent.js) |
| Remove passive recovery from `tryPlay` | Task 2 (audio.js) |
| Replace scattered `tryPlay` with `initConsent` in app.js | Task 5 (app.js) |
| Legacy mode consent check (no audio) | Task 6 (legacy.js) |
| Tests for consent logic | Task 7 (consent.test.mjs) |

**Placeholder scan:** No TODO/TBD placeholders found — all steps have concrete code and commands.

**Type consistency:** 
- `STORAGE_KEY = 'wakusei_consent_v1'` used in consent.js matches legacy.js reference.
- `hasValidConsent`, `saveConsent`, `showConsentOverlay`, `dismissConsentOverlay`, `bindConsentEvents`, and `initConsent` are all defined in Task 1 and consumed consistently.

## Execution Handoff

**Plan complete.** Saved to `docs/superpowers/plans/`.

**Two execution options:**

1. **Subagent-Driven (recommended):** I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution:** I execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach do you prefer?**
