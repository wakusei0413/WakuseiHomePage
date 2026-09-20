import { describe, expect, it } from 'vitest';
import { clampScrollTop, normalizeWheelDelta, WHEEL_LINE_HEIGHT } from '../src/lib/inertial-scroll';

describe('inertial scroll helpers', () => {
    it('normalizes line and page wheel input to pixels', () => {
        expect(normalizeWheelDelta(2, WheelEvent.DOM_DELTA_LINE, 800)).toBe(2 * WHEEL_LINE_HEIGHT);
        expect(normalizeWheelDelta(1, WheelEvent.DOM_DELTA_PAGE, 800)).toBe(800);
        expect(normalizeWheelDelta(12, WheelEvent.DOM_DELTA_PIXEL, 800)).toBe(12);
    });

    it('keeps animated targets inside the scrollable range', () => {
        expect(clampScrollTop(-100, 640)).toBe(0);
        expect(clampScrollTop(320, 640)).toBe(320);
        expect(clampScrollTop(900, 640)).toBe(640);
    });
});
