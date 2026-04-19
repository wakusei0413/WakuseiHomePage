/**
 * 时间组件模块
 * 功能：显示中文格式化的星期、日期、时间
 */
(function () {
    'use strict';

    var WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    var MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    var NUMBERS = [
        '〇',
        '一',
        '二',
        '三',
        '四',
        '五',
        '六',
        '七',
        '八',
        '九',
        '十',
        '十一',
        '十二',
        '十三',
        '十四',
        '十五',
        '十六',
        '十七',
        '十八',
        '十九',
        '二十',
        '二十一',
        '二十二',
        '二十三',
        '二十四',
        '二十五',
        '二十六',
        '二十七',
        '二十八',
        '二十九',
        '三十',
        '三十一'
    ];

    function numberToChinese(num) {
        return NUMBERS[num] || num.toString();
    }

    var timerId = null;

    function initTime() {
        var weekdayEl = document.getElementById('weekday');
        var dateEl = document.getElementById('dateDisplay');
        var clockEl = document.getElementById('clock');

        if (timerId !== null) {
            clearInterval(timerId);
        }

        function updateTime() {
            var now = new Date();
            var config = CONFIG.time;

            if (weekdayEl && config.showWeekday !== false) {
                weekdayEl.textContent = WEEKDAYS[now.getDay()];
            }

            if (dateEl && config.showDate !== false) {
                var month = MONTHS[now.getMonth()];
                var day = numberToChinese(now.getDate());
                dateEl.textContent = month + day + '日';
            }

            if (clockEl) {
                var hours = now.getHours();
                var minutes = String(now.getMinutes()).padStart(2, '0');
                var seconds = String(now.getSeconds()).padStart(2, '0');

                if (config.format === '12h') {
                    var period = hours >= 12 ? 'PM' : 'AM';
                    hours = hours % 12 || 12;
                    clockEl.textContent = String(hours).padStart(2, '0') + ':' + minutes + ':' + seconds + ' ' + period;
                } else {
                    clockEl.textContent = String(hours).padStart(2, '0') + ':' + minutes + ':' + seconds;
                }
            }
        }

        updateTime();
        timerId = setInterval(updateTime, CONFIG.time.updateInterval || 1000);
    }

    function destroyTime() {
        if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
        }
    }

    window.initTime = initTime;
    window.destroyTime = destroyTime;
})();
