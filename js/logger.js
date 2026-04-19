/**
 * Logger 工具 — 统一控制台输出
 * 依赖：全局 CONFIG 对象
 *
 * 日志级别策略：
 *   log  — 受 CONFIG.debug.consoleLog 控制，生产环境默认关闭
 *   warn — 受 CONFIG.debug.consoleLog 控制，与 log 一致
 *   error — 始终输出，确保异常不被静默吞掉
 */
(function () {
    'use strict';

    function isDebugEnabled() {
        return typeof CONFIG !== 'undefined' && CONFIG.debug && CONFIG.debug.consoleLog;
    }

    var Logger = {
        log: function () {
            if (isDebugEnabled()) {
                console.log.apply(console, arguments);
            }
        },
        warn: function () {
            if (isDebugEnabled()) {
                console.warn.apply(console, arguments);
            }
        },
        error: function () {
            console.error.apply(console, arguments);
        }
    };

    window.Logger = Logger;
})();
