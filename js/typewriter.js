/**
 * 打字机效果模块
 * 功能：循环展示 Slogan，支持随机/顺序模式
 */

import { CONFIG } from '../config.js';
import { logger } from './logger.js';
import { createSloganSelector } from './slogan-selector.js';

let pendingTimers = [];

function initTypewriter() {
    const textEl = document.getElementById('typewriterText');
    const cursor = document.getElementById('cursor');
    const container = document.getElementById('bioContainer');

    if (!textEl) return;

    const slogans = CONFIG.slogans.list;
    const typeSpeed = CONFIG.slogans.typeSpeed || 60;
    const pauseDuration = CONFIG.slogans.pauseDuration || 5000;
    const loop = CONFIG.slogans.loop !== false;
    const mode = CONFIG.slogans.mode || 'random';

    const selector = createSloganSelector(mode, slogans);

    if (container) container.style.minHeight = '100px';

    if (cursor && CONFIG.animation) {
        if (CONFIG.animation.cursorStyle === 'line') {
            cursor.textContent = '|';
        }
    }

    function typeText(text, callback) {
        textEl.textContent = '';
        let i = 0;
        function type() {
            if (i < text.length) {
                textEl.textContent += text.charAt(i);
                i++;
                pendingTimers.push(setTimeout(type, typeSpeed));
            } else {
                if (callback) callback();
            }
        }
        type();
    }

    function clearText(callback) {
        const currentText = textEl.textContent;
        let i = currentText.length;
        function clear() {
            if (i > 0) {
                textEl.textContent = currentText.substring(0, i - 1);
                i--;
                pendingTimers.push(setTimeout(clear, 20));
            } else {
                if (callback) callback();
            }
        }
        clear();
    }

    function runTypewriter() {
        const result = selector.next();
        const slogan = result.text;
        logger.log('[Slogan ' + (result.index + 1) + '/' + slogans.length + ']:', slogan.substring(0, 30) + '...');

        typeText(slogan, function () {
            if (loop) {
                pendingTimers.push(
                    setTimeout(function () {
                        clearText(function () {
                            pendingTimers.push(setTimeout(runTypewriter, 300));
                        });
                    }, pauseDuration)
                );
            } else {
                if (cursor) {
                    cursor.style.animation = 'blink 1.5s step-end infinite';
                    cursor.style.opacity = '0.5';
                }
            }
        });
    }

    pendingTimers.push(setTimeout(runTypewriter, typeSpeed * 5));
}

function destroyTypewriter() {
    for (let i = 0; i < pendingTimers.length; i++) {
        clearTimeout(pendingTimers[i]);
    }
    pendingTimers = [];
}

export { initTypewriter, destroyTypewriter };
