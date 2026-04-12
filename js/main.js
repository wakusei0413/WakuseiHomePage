/**
 * 个人主页 - 主脚本入口
 * 功能：配置验证、Font Awesome 加载、壁纸初始化、滚动动画、粘性头像、手机面板
 * 依赖：config.js, js/logger.js, js/utils.js, js/wallpaper.js,
 *        js/typewriter.js, js/time.js, js/social.js
 */

// ========== 配置验证 ==========
(function () {
    if (typeof CONFIG === 'undefined') {
        console.error('配置文件未加载！请确保 config.js 在 main.js 之前引入');
        return;
    }
    Logger.log('%c配置已加载 \u2713', 'color: #FFE600; font-size: 12px;');
    Logger.log('Slogan 数量:', CONFIG.slogans.list.length);
})();

function isLegacyCompatMode() {
    var root = document.documentElement;
    if (!root) return false;
    if (root.classList) {
        return root.classList.contains('legacy-compat');
    }

    return /(^|\s)legacy-compat(\s|$)/.test(root.className || '');
}

function revealMainContent() {
    var main = document.querySelector('.container');
    var overlay = document.getElementById('loadingOverlay');

    function addClass(el, className) {
        if (!el) return;
        if (el.classList) {
            el.classList.add(className);
            return;
        }
        if (!new RegExp('(^|\\s)' + className + '(\\s|$)').test(el.className || '')) {
            el.className = (el.className ? el.className + ' ' : '') + className;
        }
    }

    addClass(main, 'visible');
    addClass(overlay, 'hidden');
}

function simplifyLegacyLoadingText() {
    var loadingText = document.getElementById('loadingText');
    if (!isLegacyCompatMode() || !loadingText) return;

    var legacyText = loadingText.getAttribute('data-legacy-text');
    if (legacyText) {
        loadingText.textContent = legacyText;
    }
}

// ========== 动态加载 Font Awesome（5秒超时放弃）==========
(function loadFontAwesome() {
    if (isLegacyCompatMode()) {
        Logger.log('[兼容模式] 跳过 Font Awesome');
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
            console.warn('Font Awesome 加载超时，已放弃加载');
        }
    }, timeout);

    link.onload = function () {
        isLoaded = true;
        clearTimeout(timer);
        console.log('Font Awesome 加载成功');
    };

    link.onerror = function () {
        isLoaded = true;
        clearTimeout(timer);
        document.head.removeChild(link);
        console.warn('Font Awesome 加载失败');
    };

    document.head.appendChild(link);
})();

// ========== 壁纸初始化（模块化调用）==========
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

    try {
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
    } catch (error) {
        console.error('[壁纸] 初始化失败', error);
        revealMainContent();
    }
})();

// ========== 滚动触发动画 ==========
(function initScrollAnimations() {
    if (isLegacyCompatMode()) {
        Logger.log('[兼容模式] 跳过滚动动画');
        return;
    }

    var config = CONFIG.effects && CONFIG.effects.scrollReveal;
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
    Logger.log('[滚动动画] 已初始化，监听元素:', targets.length);
})();

// ========== 移动端粘性头像 ==========
(function initMobileStickyAvatar() {
    if (isLegacyCompatMode()) {
        Logger.log('[兼容模式] 跳过移动端粘性头像');
        return;
    }

    var container = document.querySelector('.container');
    var leftPanel = document.querySelector('.left-panel');
    var avatarBox = document.getElementById('avatarBox');

    if (!container || !avatarBox) return;

    function isMobile() {
        return window.innerWidth <= 900;
    }

    function handleScroll() {
        if (!isMobile()) return;
        var scrollContainer = isMobile() ? container : leftPanel;
        var scrolled = scrollContainer.scrollTop > 50;
        if (scrolled) {
            avatarBox.classList.add('scrolled');
        } else {
            avatarBox.classList.remove('scrolled');
        }
    }

    avatarBox.addEventListener('click', function () {
        if (!isMobile()) return;
        var scrollContainer = isMobile() ? container : leftPanel;
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
        Utils.debounce(function () {
            if (!isMobile()) {
                avatarBox.classList.remove('scrolled');
            }
        }, 150)
    );

    Logger.log('[粘性头像] 已初始化');
})();

// ========== 手机端壁纸面板切换 ==========
(function initMobileWallpaperToggle() {
    if (isLegacyCompatMode()) {
        Logger.log('[兼容模式] 跳过移动端壁纸切换');
        return;
    }

    var toggleBtn = document.getElementById('wallpaperToggle');
    var closeBtn = document.getElementById('closePanel');
    var rightPanel = document.querySelector('.right-panel');

    if (!toggleBtn || !closeBtn || !rightPanel) return;

    function isMobile() {
        return window.innerWidth <= 900;
    }

    function showPanel() {
        rightPanel.classList.add('active');
        toggleBtn.classList.add('active');
        closeBtn.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hidePanel() {
        rightPanel.classList.remove('active');
        toggleBtn.classList.remove('active');
        closeBtn.classList.remove('active');
        document.body.style.overflow = '';
    }

    toggleBtn.addEventListener('click', function () {
        if (rightPanel.classList.contains('active')) {
            hidePanel();
        } else {
            showPanel();
        }
    });

    closeBtn.addEventListener('click', hidePanel);

    window.addEventListener(
        'resize',
        Utils.debounce(function () {
            if (!isMobile()) {
                hidePanel();
            }
        }, 150)
    );

    Logger.log('[壁纸面板] 已初始化');
})();

// ========== 初始化完成 ==========
(function initComplete() {
    simplifyLegacyLoadingText();
    initSocialLinks();
    applyProfileConfig();

    if (isLegacyCompatMode()) {
        revealMainContent();
        Logger.log('[兼容模式] 仅保留基础资料与社交链接');
    } else {
        initTypewriter();
        initTime();
    }

    Logger.log('%c个人主页脚本已加载', 'color: #FFE600; font-size: 12px;');
    Logger.log('功能：打字机效果 (Slogan 循环) | 时间显示 | 壁纸轮播');
})();
