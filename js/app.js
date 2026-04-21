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
