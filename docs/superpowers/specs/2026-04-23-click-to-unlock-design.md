# 点击解锁（Click-to-Unlock）功能设计

## 背景与目标

背景音频自动播放被现代浏览器阻止后，我们引入了 `tryPlay` 的被动恢复机制（监听 `mousedown`/`touchstart`/`keydown`），但由于页面存在内容保护模块（`app.js:82` 的 `mousedown` 上阻止默认行为），浏览器的用户激活手势被 `preventDefault()` 取消，导致恢复播放始终失败。

**目标**：在首次访问时通过一个全屏交互覆盖层，让用户的一次点击同时满足：
1. 浏览器的用户激活手势（解锁音频自动播放）
2. 用户的体验同意（记录到本地，下次跳过）
3. 页面的视觉过渡（从模糊到清晰，保持无感）

## 设计方案：预显模糊层

采用**方案 B**——加载完成后，主页面以模糊状态隐约可见，覆盖层压在上方，用户点击任意处后模糊解除、覆盖层淡出、音频开始播放。

### 与用户选择的对应关系

| 用户选择 | 实现对应 |
|---------|---------|
| 加载完成后、主页面显示之前覆盖（选项 A） | Loading Overlay 先淡出，然后 `.container` 以 `blur(12px) brightness(0.35)` 显示，再叠加 Consent Overlay |
| 简短文案（1行）（选项 A） | 覆盖层正中一行大字："点击任意处以继续" |
| 纯视觉暗示（选项 C 的精神） | 文字下方配一个缓慢上下浮动的黄色光标 `▾` 作为点击暗示 |
| 不调用全屏 API（选项 B） | 仅解除遮罩和播放音频，不调用 `requestFullscreen()` |
| 记住偏好 | 使用 `localStorage` 存储 `wakusei_consent_v1 = granted`，有效期 30 天 |

## 视觉规格

### 主页面模糊状态

当加载完成但尚未获得用户同意时，`.container` 应用以下滤镜：

```css
.container.consent-required {
    filter: blur(12px) brightness(0.35);
    transition: filter 0.4s ease-out;
}
```

这样用户能看到模糊的轮廓（头像、壁纸色块、文字布局），但无法阅读具体内容，产生一种"需要解锁"的预期。

### 覆盖层

新建元素 `.consent-overlay`，规格如下：

```css
.consent-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(10, 10, 10, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9997; /* 低于 loading-overlay (9998)，高于主内容 (50) */
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
```

### 文案样式

```css
.consent-text {
    font-family: var(--font-display);
    font-size: clamp(1.5rem, 4vw, 3rem);
    font-weight: 700;
    color: #fffef7;
    text-align: center;
    letter-spacing: 0.05em;
    user-select: none;
    pointer-events: none; /* 文字本身不拦截点击，点击透传给覆盖层 */
}

.consent-cursor {
    display: block;
    margin-top: 1.5rem;
    font-size: 2rem;
    color: var(--accent-yellow, #ffe600);
    text-align: center;
    animation: consent-bounce 1.2s ease-in-out infinite;
    user-select: none;
    pointer-events: none;
}

@keyframes consent-bounce {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(8px);
    }
}
```

### 状态类定义

```css
/* 主内容区模糊 */
.container.consent-required {
    filter: blur(12px) brightness(0.35);
}

.container.consent-granted {
    filter: blur(0) brightness(1);
}

/* 覆盖层显示/隐藏 */
.consent-overlay.active {
    opacity: 1;
    pointer-events: auto;
}

.consent-overlay.dismissed {
    opacity: 0;
    pointer-events: none;
}
```

## 交互流程

### 首次访问（无 consent）

```
页面加载 (0%) 
  → loading overlay 显示进度 (spinner + 文字 + 进度条)
  → 壁纸/资源加载完成 (100%)
  → loading overlay 淡出 (opacity 0, visibility hidden)
  → .container 添加 .consent-required (模糊+暗化)
  → consent-overlay 显示 (淡入 opacity 1)
  → 用户点击任意处（mousedown / touchstart / keydown）
    → 写入 localStorage ('wakusei_consent_v1', 'granted', { expires: Date.now() + 30d })
    → consent-overlay 淡出 (opacity 0, 200ms)
    → .container 移除 .consent-required，添加 .consent-granted
    → 主内容滤镜解除 (blur(0) brightness(1), 400ms)
    → audio.play() 被调用（此时有有效用户激活手势）
    → 音频开始播放
```

### 已同意访问（有 consent）

```
页面加载 (0%)
  → 读取 localStorage，发现 consent 存在且未过期
  → 跳过 consent 覆盖层
  → loading overlay 淡出后，.container 直接添加 .visible (无模糊)
  → audio.play() 尝试自动播放
    → 如果浏览器允许（某些设置下），直接播放
    → 如果被阻止，进入现有 tryPlay 的 NotAllowedError catch（但用户很快就会点击，所以通常不需要）
```

### 事件优先级顺序

由于内容保护模块在 `mousedown` 的**冒泡阶段**调用了 `e.preventDefault()`，我们的 consent 解锁处理必须在**捕获阶段**绑定，确保在 `preventDefault()` 之前执行：

```javascript
document.addEventListener('mousedown', handleConsent, { capture: true, once: true });
document.addEventListener('touchstart', handleConsent, { capture: true, once: true });
document.addEventListener('keydown', handleConsent, { capture: true, once: true });
```

这样即使用户点击了页面中的按钮或链接，`handleConsent` 也能在 `preventDefault()` 之前获得执行机会，产生有效的用户激活手势。

## 技术实现

### HTML 结构

在 `index.html` 中 `</body>` 之前，`<script type="module">` 之前插入新的覆盖层：

```html
<!-- 首次访问同意覆盖层 -->
<div class="consent-overlay" id="consentOverlay">
    <div class="consent-panel">
        <p class="consent-text">点击任意处以继续</p>
        <span class="consent-cursor">▾</span>
    </div>
</div>
```

### CSS 类（新增到 `css/components.css`）

```css
/* ===== 同意覆盖层 ===== */
.consent-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
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
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(8px);
    }
}

/* ===== 主内容区 consent 状态 ===== */
.container.consent-required {
    filter: blur(12px) brightness(0.35);
    transition: filter 0.4s ease-out;
}

.container.consent-granted {
    filter: blur(0) brightness(1);
    transition: filter 0.4s ease-out;
}
```

### JS 模块：`js/consent.js`

新建独立模块 `js/consent.js`，职责单一：管理同意状态、控制覆盖层、触发音频播放。

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
        if (!raw) return false;
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            granted: true,
            timestamp: Date.now()
        }));
    } catch (e) {
        // localStorage 不可用时静默失败，每次加载都重新请求同意
    }
}

/**
 * 显示同意覆盖层，主页面变为模糊
 */
function showConsentOverlay(container, overlay) {
    if (container) container.classList.add('consent-required');
    if (overlay) overlay.classList.add('active');
}

/**
 * 隐藏同意覆盖层，主页面解除模糊
 */
function dismissConsentOverlay(container, overlay) {
    if (overlay) {
        overlay.classList.remove('active');
        overlay.classList.add('dismissed');
    }
    if (container) {
        container.classList.remove('consent-required');
        container.classList.add('consent-granted');
    }
}

/**
 * 监听用户的第一次交互，触发同意解锁
 * 使用 capture: true 确保在内容保护 preventDefault 之前执行
 */
function bindConsentEvents(container, overlay, onConsent, logger) {
    var triggered = false;

    function handleConsent() {
        if (triggered) return;
        triggered = true;

        saveConsent();
        dismissConsentOverlay(container, overlay);

        if (logger) logger.log('[Consent] 用户已同意，解锁体验');

        // 延迟移除覆盖层（等淡出动画完成）
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
 * @param {HTMLElement} container - .container 元素
 * @param {HTMLElement} overlay - #consentOverlay 元素
 * @param {Function} onConsent - 用户同意后的回调（触发音频播放等）
 * @param {Object} logger - logger 实例
 */
export function initConsent(container, overlay, onConsent, logger) {
    // 已有有效 consent，直接跳过
    if (hasValidConsent()) {
        if (logger) logger.log('[Consent] 已有有效 consent，跳过解锁');
        if (typeof onConsent === 'function') {
            // 延迟执行，让页面先完成加载动画
            setTimeout(onConsent, 100);
        }
        return;
    }

    // 首次访问，显示覆盖层
    showConsentOverlay(container, overlay);
    bindConsentEvents(container, overlay, onConsent, logger);
}

/**
 * 供外部调用的 consent 状态查询（例如 legacy.js 判断是否需要跳过）
 */
export function consentGranted() {
    return hasValidConsent();
}
```

### 与现有模块的集成

在 `js/app.js` 中，移除所有分散的 `tryPlay(audio, logger)` 调用，替换为统一的 consent 管理：

```javascript
import { initConsent } from './consent.js';

// ... 其他 imports 不变 ...

// audio 初始化（仅加载，不播放）
const audio = initAudio(CONFIG.audio, logger);

// 同意管理器初始化
// onConsent 回调统一触发音频播放
initConsent(
    document.getElementById('mainContent'),
    document.getElementById('consentOverlay'),
    function onConsent() {
        tryPlay(audio, logger);
    },
    logger
);
```

移除 `app.js` 中原有的所有 `tryPlay(audio, logger)` 调用点（壁纸回调中、兼容模式中、初始化完成后等），全部交由 `onConsent` 回调统一处理。

### 修改 `js/audio.js` 的 `tryPlay`

`tryPlay` 不再注册交互监听器（这些逻辑已移至 `consent.js`），只负责尝试播放和错误日志。如果以后需要，仍可保留简单的 `NotAllowedError` catch，但不再主动添加事件监听。

```javascript
export function tryPlay(audio, logger) {
    if (!audio) return;

    var playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise
            .then(function () {
                logger.log('[音频] 播放已开始');
            })
            .catch(function (error) {
                if (error.name === 'NotAllowedError') {
                    logger.warn('[音频] 浏览器阻止播放（用户激活手势可能已失效）');
                } else {
                    logger.warn('[音频] 播放失败:', error.message);
                }
            });
    }
}
```

## 状态管理

| 状态 | 存储位置 | 有效期 | 说明 |
|------|---------|--------|------|
| consent.granted | localStorage `wakusei_consent_v1` | 30 天 | JSON 字符串 `{ "granted": true, "timestamp": 1716483200000 }` |
| DOM: `.container` 的 class | 内存（CSS 类） | 单次会话 | `consent-required` / `consent-granted` |
| DOM: `#consentOverlay` 的 class | 内存（CSS 类） | 单次会话 | `active` / `dismissed` |

## 边界情况

### 禁用 JavaScript（`<noscript>`）

`noscript` 样式分支保持现有行为：`.container` 直接显示，无模糊，无音频。consent 覆盖层依赖于 JS，不显示。

### 禁用 localStorage

`hasValidConsent()` 和 `saveConsent()` 都被 `try/catch` 包裹。如果 `localStorage` 不可用（例如 Safari 无痕模式）：
- `hasValidConsent()` 返回 `false` → 显示覆盖层
- `saveConsent()` 静默失败 → 下次访问仍显示覆盖层（无法记住偏好）

这是可接受的行为退化。

### 内容保护冲突

`bindConsentEvents` 使用 `capture: true` 在捕获阶段监听 `mousedown`，确保在 `app.js:82` 的 `mousedown`（冒泡阶段 `preventDefault`）之前执行。事件处理使用 `{ once: true }`，只在第一次交互时触发，之后事件被自动移除。

### 浏览器回退（legacy.js）

`legacy.js` 中新增 `consentGranted()` 查询：

```javascript
var consentGranted = false;
try {
    var raw = localStorage.getItem('wakusei_consent_v1');
    if (raw) {
        var data = JSON.parse(raw);
        if (data && data.granted) consentGranted = true;
    }
} catch (e) {}
```

如果 `consentGranted` 为 `false`，在 `legacy.js` 的加载完成后显示一个简化的文本提示："点击任意处继续"。由于 legacy 模式下无音频，此提示仅用于视觉一致性，不实际播放音乐。

### 移动端触摸

同时监听 `mousedown` 和 `touchstart`。在触摸屏上，`touchstart` 先触发，且 `touchstart` 同样可以在捕获阶段被响应。`{ once: true }` 确保两个事件不会触发两次。

为移动端添加 `.no-touch` 支持：如果检测到 `('ontouchstart' in window)`，在 `.consent-overlay` 上添加 `touch-action: manipulation`，避免 300ms 点击延迟（虽然现代浏览器大多已移除，但无害）。

## 测试策略

新增 `tests/consent.test.mjs` 模块，测试以下场景：

1. `hasValidConsent()` 返回 `false`（无 localStorage 数据）
2. `hasValidConsent()` 返回 `true`（有有效数据）
3. `hasValidConsent()` 返回 `false`（数据过期）
4. `hasValidConsent()` 返回 `false`（数据损坏/非 JSON）
5. `hasValidConsent()` 返回 `false`（localStorage 不存在的环境）
6. `saveConsent()` 正确写入 localStorage
7. `dismissConsentOverlay` 正确切换 CSS 类
8. `bindConsentEvents` 在 `mousedown` 触发时调用一次 `onConsent`
9. `bindConsentEvents` 只触发一次（`once: true`）

## 配置改动

在 `config.js` 中无需新增配置项（consent 是全局行为，不需要用户自定义）。但需要在 `validate-config.js` 中确认没有误拦截 consent 相关的运行时检查。

无需改动 `legacy.js` 中的 CONFIG 数据对象（consent 是运行时行为，不涉及配置）。

## 与 Autoplay Audio 设计的关系

本设计是对 `2026-04-23-autoplay-audio-design.md` 的**修正方案**：

| 原设计 | 本设计修正 |
|--------|-----------|
| `tryPlay` 被动监听 `click/touchstart/keydown` 恢复播放 | `tryPlay` 简化，不再主动注册监听器 |
| 内容保护模块导致恢复失败 | consent 模块在捕获阶段接收交互，绕过 `preventDefault` |
| 用户随时点击都可能恢复（无状态） | 首次访问统一走 consent 流程，同意后有 30 天有效期 |
| 加载完成直接显示页面 | 加载完成后页面先模糊，点击后解锁 |

`js/audio.js` 从"播放 + 恢复管理"退化为纯"播放尝试"模块，恢复逻辑由 `js/consent.js` 接管。

## 总结

本方案通过将首次访问同意作为一道优雅的"解锁门"，一次性解决了三个问题：
1. **音频自动播放**：点击产生有效用户激活手势，浏览器允许播放
2. **持久化偏好**：`localStorage` 记住选择，30 天内不再打扰
3. **视觉无感**：模糊到清晰的过渡让用户感到自然，不像是"被弹窗打断"

并且利用 `capture: true` 巧妙绕过了内容保护模块对默认行为的干扰。
