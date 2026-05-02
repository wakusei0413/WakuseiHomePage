import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDateParts, formatTimeString } from '../src/lib/time';

describe('locale-aware time formatting', () => {
    it('formats weekday in Chinese by default', () => {
        const date = new Date(2026, 0, 5); // Monday, Jan 5 2026
        const parts = formatDateParts(date);
        assert.equal(parts.weekday, '星期一');
    });

    it('formats weekday in English when locale is en', () => {
        const date = new Date(2026, 0, 5);
        const parts = formatDateParts(date, 'en');
        assert.equal(parts.weekday, 'Monday');
    });

    it('formats weekday in Japanese when locale is ja', () => {
        const date = new Date(2026, 0, 5); // Monday
        const parts = formatDateParts(date, 'ja');
        assert.equal(parts.weekday, '月曜日');
    });

    it('formats date display in Chinese by default', () => {
        const date = new Date(2026, 0, 5);
        const parts = formatDateParts(date);
        assert.ok(parts.dateDisplay.includes('一月'));
    });

    it('formats date display in English when locale is en', () => {
        const date = new Date(2026, 0, 5);
        const parts = formatDateParts(date, 'en');
        assert.ok(parts.dateDisplay.includes('January'));
    });

    it('formats date display in Japanese when locale is ja', () => {
        const date = new Date(2026, 0, 5);
        const parts = formatDateParts(date, 'ja');
        assert.equal(parts.dateDisplay, '一月五日');
    });

    it('formats 24h time correctly', () => {
        const date = new Date(2026, 0, 5, 14, 30, 0);
        const result = formatTimeString(date, '24h');
        assert.equal(result, '14:30:00');
    });

    it('formats 12h time correctly', () => {
        const date = new Date(2026, 0, 5, 14, 30, 0);
        const result = formatTimeString(date, '12h');
        assert.equal(result, '02:30:00 PM');
    });
});
