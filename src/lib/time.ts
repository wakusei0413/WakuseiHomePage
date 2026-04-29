import type { ClockFormat } from '../types/site';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const ONES = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

function toChineseDay(day: number) {
    if (day <= 10) {
        return day === 10 ? '十' : ONES[day];
    }

    if (day < 20) {
        return `十${ONES[day % 10]}`;
    }

    if (day < 30) {
        return `二十${ONES[day % 10]}`;
    }

    return day === 30 ? '三十' : `三十${ONES[day % 10]}`;
}

function pad(value: number) {
    return String(value).padStart(2, '0');
}

export function formatDateParts(date: Date) {
    return {
        weekday: WEEKDAYS[date.getDay()],
        dateDisplay: `${MONTHS[date.getMonth()]}${toChineseDay(date.getDate())}日`
    };
}

export function formatTimeString(date: Date, format: ClockFormat) {
    if (format === '12h') {
        const hours = date.getHours();
        const displayHours = hours % 12 || 12;
        const suffix = hours >= 12 ? 'PM' : 'AM';

        return `${pad(displayHours)}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${suffix}`;
    }

    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
