/**
 * Logger 工具 — 统一控制台输出
 * 日志级别策略：
 *   log  — 受 CONFIG.debug.consoleLog 控制，生产环境默认关闭
 *   warn — 受 CONFIG.debug.consoleLog 控制，与 log 一致
 *   error — 始终输出，确保异常不被静默吞掉
 */

import { CONFIG } from '../config.js';

const logger = {
    log: function (...args) {
        if (CONFIG.debug && CONFIG.debug.consoleLog) {
            console.log(...args);
        }
    },
    warn: function (...args) {
        if (CONFIG.debug && CONFIG.debug.consoleLog) {
            console.warn(...args);
        }
    },
    error: function (...args) {
        console.error(...args);
    }
};

export { logger };
