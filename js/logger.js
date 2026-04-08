/**
 * Logger 工具 — 统一控制台输出
 * 依赖：全局 CONFIG 对象
 */
(function () {
    'use strict';

    var Logger = {
        log: function () {
            if (typeof CONFIG !== 'undefined' && CONFIG.debug && CONFIG.debug.consoleLog) {
                console.log.apply(console, arguments);
            }
        },
        warn: function () {
            console.warn.apply(console, arguments);
        },
        error: function () {
            console.error.apply(console, arguments);
        }
    };

    window.Logger = Logger;
})();
