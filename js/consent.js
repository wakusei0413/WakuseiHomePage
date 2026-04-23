/**
 * 首次访问同意管理器
 * 管理点击解锁流程：模糊页面 → 点击同意 → 存储偏好 → 解锁音频与视觉效果
 */

const STORAGE_KEY = 'wakusei_consent_v1';
const CONSENT_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

/**
 * 读取并验证 localStorage 中的 consent
 * @returns {boolean} 是否已有有效 consent
 */
function hasValidConsent() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return false;
        }
        const data = JSON.parse(raw);
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
                timestamp: Date.now(),
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
    let triggered = false;

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

        setTimeout(() => {
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
