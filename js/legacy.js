/**
 * 旧版浏览器回退脚本（ES5 兼容）
 * 当浏览器不支持 ES Modules 时，提供基础功能：
 * 个人信息、社交链接、加载遮罩隐藏
 *
 * 注意：此文件中的 CONFIG 数据需与 config.js 保持同步
 */
(function () {
    'use strict';

    // ===== 配置（需与 config.js 保持同步）=====
    var CONFIG = {
        version: '1.0.0',
        profile: {
            name: '遊星 Wakusei',
            status: '正在过大关.jpg',
            avatar: 'res/img/logo.png'
        },
        socialLinks: {
            colorScheme: 'cycle',
            links: [
                { name: 'GITHUB', url: 'https://github.com/wakusei0413', icon: 'fab fa-github', color: '#ffe600' },
                {
                    name: 'Linux.Do',
                    url: 'https://linux.do/u/wakusei/summary',
                    icon: 'fa-solid fa-bars-staggered',
                    color: '#f2411d'
                },
                { name: 'EMAIL', url: 'mailto:wakusei0413@outlook.com', icon: 'fas fa-envelope', color: '#3e59ff' },
                {
                    name: 'BILIBILI',
                    url: 'https://space.bilibili.com/438168974',
                    icon: 'fab fa-bilibili',
                    color: '#ffa69e'
                },
                { name: 'BLOG', url: 'https://blog.wakusei.top/', icon: 'fa-solid fa-blog', color: '#f58f1a' },
                {
                    name: 'STATUS',
                    url: 'https://status.wakusei.top/',
                    icon: 'fa-solid fa-arrow-up-right-dots',
                    color: '#caa62e'
                },
                { name: 'TESTING', url: 'https://testing.wakusei.top/', icon: 'fa-solid fa-flask', color: '#16deca' }
            ]
        },
        footer: {
            text: '咕!咕!嘎!嘎!-"罗德岛"有限公司出品'
        },
        debug: { consoleLog: false }
    };

    // ===== 最小 Polyfills（IE11 兼容）=====
    if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = function (callback, thisArg) {
            var i;
            for (i = 0; i < this.length; i++) {
                callback.call(thisArg, this[i], i, this);
            }
        };
    }

    if (window.Element && !Element.prototype.matches) {
        Element.prototype.matches =
            Element.prototype.msMatchesSelector ||
            Element.prototype.webkitMatchesSelector ||
            function (selector) {
                var node = this;
                var nodes = (node.document || node.ownerDocument).querySelectorAll(selector);
                var i = 0;
                while (nodes[i] && nodes[i] !== node) {
                    i++;
                }
                return !!nodes[i];
            };
    }

    if (window.Element && !Element.prototype.closest) {
        Element.prototype.closest = function (selector) {
            var node = this;
            while (node && node.nodeType === 1) {
                if (node.matches(selector)) {
                    return node;
                }
                node = node.parentElement || node.parentNode;
            }
            return null;
        };
    }

    // ===== 日志工具 =====
    function log() {
        if (CONFIG.debug && CONFIG.debug.consoleLog) {
            console.log.apply(console, arguments);
        }
    }

    // 错误日志：兼容模式下始终输出
    // 可用 console.error 直接调用

    // ===== 简化加载文本 =====
    function simplifyLegacyLoadingText() {
        var loadingText = document.getElementById('loadingText');
        if (!loadingText) return;
        var legacyText = loadingText.getAttribute('data-legacy-text');
        if (legacyText) {
            loadingText.textContent = legacyText;
        }
    }

    // ===== 隐藏加载遮罩 =====
    function revealMainContent() {
        var main = document.querySelector('.container');
        var overlay = document.getElementById('loadingOverlay');
        if (main) main.className += ' visible';
        if (overlay) overlay.className += ' hidden';
    }

    // ===== 应用个人信息 =====
    function applyProfileConfig() {
        var config = CONFIG.profile;

        var nameEl = document.querySelector('.name');
        if (nameEl && config.name) {
            nameEl.textContent = config.name;
        }

        var statusTextEl = document.querySelector('.status-text');
        if (statusTextEl && config.status) {
            statusTextEl.textContent = config.status;
        }

        var avatarImg = document.querySelector('.avatar-image');
        var avatarBox = document.getElementById('avatarBox');
        if (config.avatar) {
            if (avatarImg) avatarImg.src = config.avatar;
            if (avatarBox && !('objectFit' in document.documentElement.style)) {
                avatarBox.style.backgroundImage = 'url(' + config.avatar + ')';
            }
        }

        var footerTextEl = document.getElementById('footerText');
        if (footerTextEl && CONFIG.footer) {
            var text = CONFIG.footer.text || 'BUILT WITH PASSION';
            var year = new Date().getFullYear();
            footerTextEl.textContent = text + ' \u2022 ' + year;
        }

        log('[兼容模式] 个人信息已应用');
    }

    // ===== 生成社交链接 =====
    function initSocialLinks() {
        if (!CONFIG.socialLinks || !CONFIG.socialLinks.links) return;

        var socialContainer = document.getElementById('socialLinks');
        if (!socialContainer) return;

        var links = CONFIG.socialLinks.links;
        var colorScheme = CONFIG.socialLinks.colorScheme || 'cycle';
        var cycleColors = ['#ffe600', '#ff3e3e', '#3e59ff'];

        socialContainer.innerHTML = '';

        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            var color = link.color;

            if (!color) {
                if (colorScheme === 'same') {
                    color = cycleColors[0];
                } else {
                    color = cycleColors[i % cycleColors.length];
                }
            }

            var a = document.createElement('a');
            a.href = link.url;
            a.setAttribute('aria-label', link.name);
            var isMailto = link.url.indexOf('mailto:') === 0;
            a.target = isMailto ? '_self' : '_blank';
            a.rel = isMailto ? '' : 'noopener noreferrer';

            a.className = 'social-link social-link--custom';
            if (a.style && a.style.setProperty) {
                a.style.setProperty('--custom-color', color);
            }
            a.style.color = color;

            var label = document.createElement('span');
            label.className = 'link-label';
            label.textContent = link.name;

            // 兼容模式下不加载 Font Awesome 图标
            a.appendChild(label);
            socialContainer.appendChild(a);
        }

        log('[兼容模式] 已生成 ' + links.length + ' 个社交链接');
    }

    // ===== Object Fit 检测 =====
    function detectObjectFit() {
        if (!('objectFit' in document.documentElement.style)) {
            document.documentElement.className += ' no-object-fit';
        }
    }

    // ===== 执行初始化 =====
    function init() {
        simplifyLegacyLoadingText();
        detectObjectFit();
        applyProfileConfig();
        initSocialLinks();
        revealMainContent();
        log('[兼容模式] 仅保留基础资料与社交链接');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
