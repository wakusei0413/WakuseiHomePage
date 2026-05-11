import { formatDateParts, formatTimeString } from '../src/lib/time';

describe('time formatting helpers', () => {
    const exampleDate = new Date('2026-04-23T15:30:35');

    it('formats Chinese weekday and date parts', () => {
        const parts = formatDateParts(exampleDate);

        expect(parts.weekday).toBe('星期四');
        expect(parts.dateDisplay).toBe('四月二十三日');
    });

    it('formats 24-hour time strings', () => {
        expect(formatTimeString(exampleDate, '24h')).toBe('15:30:35');
    });

    it('formats 12-hour time strings with AM/PM', () => {
        expect(formatTimeString(exampleDate, '12h')).toBe('03:30:35 PM');
    });
});
