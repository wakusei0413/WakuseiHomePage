import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatDateParts, formatTimeString } from '../src/lib/time';

describe('time formatting helpers', () => {
    const exampleDate = new Date('2026-04-23T15:30:35');

    it('formats Chinese weekday and date parts', () => {
        const parts = formatDateParts(exampleDate);

        assert.strictEqual(parts.weekday, '星期四');
        assert.strictEqual(parts.dateDisplay, '四月二十三日');
    });

    it('formats 24-hour time strings', () => {
        assert.strictEqual(formatTimeString(exampleDate, '24h'), '15:30:35');
    });

    it('formats 12-hour time strings with AM/PM', () => {
        assert.strictEqual(formatTimeString(exampleDate, '12h'), '03:30:35 PM');
    });
});
