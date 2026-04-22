/**
 * 打字机效果模块
 * 功能：循环展示 Slogan，支持随机/顺序模式
 */

import { CONFIG } from '../config.js';
import { logger } from './logger.js';
import { createSloganSelector } from './slogan-selector.js';

let rafId = null;
let state = 'idle';
let targetText = '';
let charIndex = 0;
let lastFrameTime = 0;
let pauseEndTime = 0;

function cancelTypewriter() {
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    state = 'idle';
}

function initTypewriter() {
    const textEl = document.getElementById('typewriterText');
    const cursor = document.getElementById('cursor');
    const container = document.getElementById('bioContainer');
    if (!textEl) return;

    cancelTypewriter();

    const slogans = CONFIG.slogans.list;
    const typeSpeed = CONFIG.slogans.typeSpeed || 60;
    const pauseDuration = CONFIG.slogans.pauseDuration || 5000;
    const loop = CONFIG.slogans.loop !== false;
    const mode = CONFIG.slogans.mode || 'random';
    const selector = createSloganSelector(mode, slogans);

    if (container) container.style.minHeight = '100px';
    if (cursor && CONFIG.animation && CONFIG.animation.cursorStyle === 'line') {
        cursor.textContent = '|';
    }

    const typeInterval = typeSpeed;
    const deleteInterval = 20;
    const delayAfterDelete = 300;

    function pickNext() {
        const result = selector.next();
        targetText = result.text;
        logger.log('[Slogan ' + (result.index + 1) + '/' + slogans.length + ']:', targetText.substring(0, 30) + '...');
        state = 'typing';
        charIndex = 0;
        lastFrameTime = 0;
    }

    function tick(timestamp) {
        if (!lastFrameTime) lastFrameTime = timestamp;
        const elapsed = timestamp - lastFrameTime;

        if (state === 'typing') {
            if (elapsed >= typeInterval) {
                lastFrameTime = timestamp;
                charIndex++;
                textEl.textContent = targetText.slice(0, charIndex);
                if (charIndex >= targetText.length) {
                    if (loop) {
                        state = 'pausing';
                        pauseEndTime = timestamp + pauseDuration;
                    } else {
                        state = 'done';
                        if (cursor) {
                            cursor.style.animation = 'blink 1.5s step-end infinite';
                            cursor.style.opacity = '0.5';
                        }
                        rafId = null;
                        return;
                    }
                }
            }
        } else if (state === 'pausing') {
            if (timestamp >= pauseEndTime) {
                state = 'deleting';
                lastFrameTime = 0;
            }
        } else if (state === 'deleting') {
            if (elapsed >= deleteInterval) {
                lastFrameTime = timestamp;
                charIndex--;
                textEl.textContent = targetText.slice(0, charIndex);
                if (charIndex <= 0) {
                    state = 'waiting';
                    pauseEndTime = timestamp + delayAfterDelete;
                }
            }
        } else if (state === 'waiting') {
            if (timestamp >= pauseEndTime) {
                pickNext();
            }
        }

        rafId = requestAnimationFrame(tick);
    }

    pickNext();
    rafId = requestAnimationFrame(tick);
}

function destroyTypewriter() {
    cancelTypewriter();
}

export { initTypewriter, destroyTypewriter };
