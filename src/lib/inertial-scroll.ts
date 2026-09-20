export const WHEEL_LINE_HEIGHT = 16;

export function clampScrollTop(value: number, maximum: number): number {
    return Math.min(Math.max(value, 0), Math.max(maximum, 0));
}

export function normalizeWheelDelta(deltaY: number, deltaMode: number, viewportHeight: number): number {
    if (deltaMode === WheelEvent.DOM_DELTA_LINE) return deltaY * WHEEL_LINE_HEIGHT;
    if (deltaMode === WheelEvent.DOM_DELTA_PAGE) return deltaY * viewportHeight;
    return deltaY;
}
