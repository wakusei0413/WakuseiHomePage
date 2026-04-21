/**
 * 工具函数
 */

export function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

export function isLegacyCompatMode() {
    const root = document.documentElement;
    if (!root) return false;
    if (root.classList) {
        return root.classList.contains('legacy-compat');
    }
    return /(^|\s)legacy-compat(\s|$)/.test(root.className || '');
}

export function isMobile(breakpoint) {
    return window.innerWidth <= (breakpoint || 900);
}

export function addClass(el, className) {
    if (!el) return;
    if (el.classList) {
        el.classList.add(className);
        return;
    }
    if (!new RegExp('(^|\\s)' + className + '(\\s|$)').test(el.className || '')) {
        el.className = (el.className ? el.className + ' ' : '') + className;
    }
}

export const utils = { debounce, isLegacyCompatMode, isMobile, addClass };
