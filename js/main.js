/**
 * 个人主页 - 主脚本入口
 * 功能：配置验证、Font Awesome 加载、壁纸初始化、滚动动画、粘性头像、手机面板
 * 依赖：config.js, js/logger.js, js/utils.js, js/wallpaper.js,
 *        js/typewriter.js, js/time.js, js/social.js
 */

// ========== 配置验证 ==========
(function () {
    if (typeof App === 'undefined' || !App.config) {
        console.error('配置文件未加载！请确保 config.js 在 main.js 之前引入');
        return;
    }
    App.logger.log('%c配置已加载 \u2713', 'color: #FFE600; font-size: 12px;');
    App.logger.log('Slogan 数量:', App.config.slogans.list.length);
})();

function revealMainContent() {
    var main = document.querySelector('.container');
    var overlay = document.getElementById('loadingOverlay');

    App.utils.addClass(main, 'visible');
    App.utils.addClass(overlay, 'hidden');
}

function simplifyLegacyLoadingText() {
    var loadingText = document.getElementById('loadingText');
    if (!App.utils.isLegacyCompatMode() || !loadingText) return;

    var legacyText = loadingText.getAttribute('data-legacy-text');
    if (legacyText) {
        loadingText.textContent = legacyText;
    }
}

// ========== 动态加载 Font Awesome（5秒超时放弃）==========
(function loadFontAwesome() {
    if (App.utils.isLegacyCompatMode()) {
        App.logger.log('[兼容模式] 跳过 Font Awesome');
        return;
    }

    var fontAwesomeUrl = 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css';
    var timeout = 5000;

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontAwesomeUrl;
    link.crossOrigin = 'anonymous';

    var isLoaded = false;

    var timer = setTimeout(function () {
        if (!isLoaded) {
            document.head.removeChild(link);
            App.logger.warn('[Font Awesome] 加载超时，已放弃加载');
        }
    }, timeout);

    link.onload = function () {
        isLoaded = true;
        clearTimeout(timer);
        App.logger.log('[Font Awesome] 加载成功');
    };

    link.onerror = function () {
        isLoaded = true;
        clearTimeout(timer);
        document.head.removeChild(link);
        App.logger.warn('[Font Awesome] 加载失败');
    };

    document.head.appendChild(link);
})();

// ========== 壁纸初始化（模块化调用）==========
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

// ========== 滚动触发动画 ==========
(function initScrollAnimations() {
    if (App.utils.isLegacyCompatMode()) {
        App.logger.log('[兼容模式] 跳过滚动动画');
        return;
    }

    var config = App.config.effects && App.config.effects.scrollReveal;
    if (!config || !config.enabled) return;

    var targetSelectors = ['.social-link', '.info-panel', '.wallpaper-info', '.avatar-box', '.name', '.status-bar'];

    var targets = document.querySelectorAll(targetSelectors.join(','));
    if (!targets.length) return;

    targets.forEach(function (el, index) {
        el.classList.add('scroll-reveal');
        el.style.transitionDelay = index * config.delay + 'ms';
    });

    var observer = new IntersectionObserver(
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
    App.logger.log('[滚动动画] 已初始化，监听元素:', targets.length);
})();

// ========== 移动端粘性头像 ==========
(function initMobileStickyAvatar() {
    if (App.utils.isLegacyCompatMode()) {
        App.logger.log('[兼容模式] 跳过移动端粘性头像');
        return;
    }

    var container = document.querySelector('.container');
    var leftPanel = document.querySelector('.left-panel');
    var avatarBox = document.getElementById('avatarBox');

    if (!container || !avatarBox) return;

    function handleScroll() {
        if (!App.utils.isMobile()) return;
        var scrollContainer = App.utils.isMobile() ? container : leftPanel;
        var scrolled = scrollContainer.scrollTop > 50;
        if (scrolled) {
            avatarBox.classList.add('scrolled');
        } else {
            avatarBox.classList.remove('scrolled');
        }
    }

    avatarBox.addEventListener('click', function () {
        if (!App.utils.isMobile()) return;
        var scrollContainer = App.utils.isMobile() ? container : leftPanel;
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
        App.utils.debounce(function () {
            if (!App.utils.isMobile()) {
                avatarBox.classList.remove('scrolled');
            }
        }, 150)
    );

    App.logger.log('[粘性头像] 已初始化');
})();

// ========== 手机端壁纸面板切换（已禁用，移动端不显示右侧面板） ==========
(function initMobileWallpaperToggle() {
    if (App.utils.isLegacyCompatMode()) {
        App.logger.log('[兼容模式] 跳过移动端壁纸切换');
        return;
    }

    App.logger.log('[壁纸面板] 移动端右侧面板已禁用，跳过切换初始化');
})();

// ========== 初始化完成 ==========
(function initComplete() {
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
})();
