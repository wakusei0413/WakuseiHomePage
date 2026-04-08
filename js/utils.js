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

    window.Utils = {
        debounce: debounce
    };
})();
