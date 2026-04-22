/**
 * 时间组件模块
 * 功能：显示中文格式化的星期、日期、时间
 */

import { CONFIG } from '../config.js';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const CN_ONES = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

function numberToChinese(num) {
    if (num <= 10) return CN_ONES[num] || '〇';
    if (num < 20) return '十' + CN_ONES[num % 10];
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return (tens === 2 ? '二' : '三') + '十' + CN_ONES[ones];
}

let timerId = null;

function initTime() {
    const weekdayEl = document.getElementById('weekday');
    const dateEl = document.getElementById('dateDisplay');
    const clockEl = document.getElementById('clock');

    if (timerId !== null) {
        clearInterval(timerId);
    }

    const cfg = CONFIG.time;
    const showWeekday = cfg.showWeekday !== false;
    const showDate = cfg.showDate !== false;
    const is12h = cfg.format === '12h';
    const interval = cfg.updateInterval || 1000;

    if (weekdayEl && !showWeekday) {
        weekdayEl.style.display = 'none';
    }
    if (dateEl && !showDate) {
        dateEl.style.display = 'none';
    }

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    function updateTime() {
        const now = new Date();

        if (weekdayEl && showWeekday) {
            weekdayEl.textContent = WEEKDAYS[now.getDay()];
        }

        if (dateEl && showDate) {
            dateEl.textContent = MONTHS[now.getMonth()] + numberToChinese(now.getDate()) + '日';
        }

        if (clockEl) {
            let hours = now.getHours();
            const minutes = pad(now.getMinutes());
            const seconds = pad(now.getSeconds());

            if (is12h) {
                const period = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                clockEl.textContent = pad(hours) + ':' + minutes + ':' + seconds + ' ' + period;
            } else {
                clockEl.textContent = pad(hours) + ':' + minutes + ':' + seconds;
            }
        }
    }

    updateTime();
    timerId = setInterval(updateTime, interval);
}

function destroyTime() {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
}

export { initTime, destroyTime };
