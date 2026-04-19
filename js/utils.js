/**
 * 工具函数
 */
(function () {
    'use strict';

    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var ctx = this;
            var args = arguments;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(ctx, args);
            }, delay);
        };
    }

    function isLegacyCompatMode() {
        var root = document.documentElement;
        if (!root) return false;
        if (root.classList) {
            return root.classList.contains('legacy-compat');
        }

        return /(^|\s)legacy-compat(\s|$)/.test(root.className || '');
    }

    function isMobile(breakpoint) {
        return window.innerWidth <= (breakpoint || 900);
    }

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

    window.Utils = {
        debounce: debounce,
        isLegacyCompatMode: isLegacyCompatMode,
        isMobile: isMobile,
        addClass: addClass
    };
})();
