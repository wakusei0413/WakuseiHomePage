import { logger } from './logger.js';
import { utils } from './utils.js';

export function revealMainContent(deps) {
    const documentRef = (deps && deps.document) || document;
    const utilsRef = (deps && deps.utils) || utils;
    const main = documentRef.querySelector('.container');
    const overlay = documentRef.getElementById('loadingOverlay');

    utilsRef.addClass(main, 'visible');
    utilsRef.addClass(overlay, 'hidden');
}

export function showConfigFailureState(validationErrors, deps) {
    const loggerRef = (deps && deps.logger) || logger;

    validationErrors.forEach(function (error) {
        loggerRef.error('[CONFIG] ' + error);
    });

    revealMainContent(deps);
}

export function simplifyLegacyLoadingText(deps) {
    const documentRef = (deps && deps.document) || document;
    const utilsRef = (deps && deps.utils) || utils;
    const loadingText = documentRef.getElementById('loadingText');
    if (!utilsRef.isLegacyCompatMode() || !loadingText) return;

    const legacyText = loadingText.getAttribute('data-legacy-text');
    if (legacyText) {
        loadingText.textContent = legacyText;
    }
}

export function initScrollAnimations(scrollRevealConfig, deps) {
    const utilsRef = (deps && deps.utils) || utils;
    const documentRef = (deps && deps.document) || document;
    const loggerRef = (deps && deps.logger) || logger;

    if (utilsRef.isLegacyCompatMode()) {
        loggerRef.log('[兼容模式] 跳过滚动动画');
        return;
    }

    if (!scrollRevealConfig || !scrollRevealConfig.enabled) return;

    const targetSelectors = ['.social-link', '.info-panel', '.wallpaper-info', '.avatar-box', '.name', '.status-bar'];
    const targets = documentRef.querySelectorAll(targetSelectors.join(','));
    if (!targets.length) return;

    const IntersectionObserverRef =
        (deps && deps.IntersectionObserver) ||
        (typeof IntersectionObserver !== 'undefined' ? IntersectionObserver : null);
    if (!IntersectionObserverRef) return;

    targets.forEach(function (el, index) {
        el.classList.add('scroll-reveal');
        el.style.transitionDelay = index * scrollRevealConfig.delay + 'ms';
    });

    const observer = new IntersectionObserverRef(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('scroll-reveal--visible');
                }
            });
        },
        {
            root: null,
            rootMargin: '0px 0px -' + scrollRevealConfig.offset + 'px 0px',
            threshold: 0.1
        }
    );

    targets.forEach(function (el) {
        observer.observe(el);
    });
    loggerRef.log('[滚动动画] 已初始化，监听元素:', targets.length);
}

export function initMobileStickyAvatar(deps) {
    const utilsRef = (deps && deps.utils) || utils;
    const documentRef = (deps && deps.document) || document;
    const windowRef = (deps && deps.window) || window;
    const loggerRef = (deps && deps.logger) || logger;
    const container = documentRef.querySelector('.container');
    const avatarBox = documentRef.getElementById('avatarBox');

    if (utilsRef.isLegacyCompatMode()) {
        loggerRef.log('[兼容模式] 跳过移动端粘性头像');
        return;
    }

    if (!container || !avatarBox) return;

    let isMobileCached = utilsRef.isMobile();

    function handleScroll() {
        if (!isMobileCached) return;
        if (container.scrollTop > 50) {
            avatarBox.classList.add('scrolled');
        } else {
            avatarBox.classList.remove('scrolled');
        }
    }

    avatarBox.addEventListener('click', function () {
        if (!isMobileCached) return;
        if (container.scrollTop > 50) {
            if ('scrollBehavior' in documentRef.documentElement.style) {
                container.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                container.scrollTo(0, 0);
            }
        }
    });

    container.addEventListener('scroll', handleScroll);

    windowRef.addEventListener(
        'resize',
        utilsRef.debounce(function () {
            isMobileCached = utilsRef.isMobile();
            if (!isMobileCached) {
                avatarBox.classList.remove('scrolled');
            }
        }, 150)
    );

    loggerRef.log('[粘性头像] 已初始化');
}
