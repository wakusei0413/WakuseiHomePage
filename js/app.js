/**
 * 个人主页 - 主入口
 * 功能：配置校验、模块初始化、Font Awesome 加载、壁纸、滚动动画、移动端交互
 */

import { CONFIG } from '../config.js';
import './polyfills.js';
import { logger } from './logger.js';
import { utils } from './utils.js';
import {
    initMobileStickyAvatar,
    initScrollAnimations,
    revealMainContent,
    showConfigFailureState,
    simplifyLegacyLoadingText
} from './bootstrap.js';
import { initTypewriter } from './typewriter.js';
import { initTime } from './time.js';
import { initSocialLinks, applyProfileConfig } from './social.js';
import { WallpaperScroller } from './wallpaper.js';
import { validate } from './validate-config.js';

// ========== 配置验证 ==========
const validationResult = validate(CONFIG);
if (!validationResult.valid) {
    showConfigFailureState(validationResult.errors);
    throw new Error('Config validation failed: ' + validationResult.errors.join('; '));
}

logger.log('%c配置已加载 \u2713', 'color: #FFE600; font-size: 12px;');
logger.log('Slogan 数量:', CONFIG.slogans.list.length);

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
(function bootstrapScrollAnimations() {
    initScrollAnimations(CONFIG.effects && CONFIG.effects.scrollReveal);
})();

// ========== 移动端粘性头像 ==========
(function bootstrapMobileStickyAvatar() {
    initMobileStickyAvatar();
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
