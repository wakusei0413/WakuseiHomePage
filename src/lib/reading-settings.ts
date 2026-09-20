// Reading controls + focus mode: pure, SSR-safe settings state.
// Everything that touches localStorage/window is guarded so the module can be
// imported from the server build without throwing (and without hydrating any
// client-only value into the markup).

export const READING_SETTINGS_STORAGE_KEY = 'wakusei:reading-settings';
export const FOCUS_MODE_STORAGE_KEY = 'wakusei:focus-mode';

export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.3;
export const FONT_SCALE_STEP = 0.05;
export const FONT_SCALE_DEFAULT = 1;

export const LINE_HEIGHT_LEVELS: readonly number[] = [1.6, 1.8, 2.0];
export const DEFAULT_LINE_HEIGHT = 1.8;

export const WIDTH_LEVELS: readonly number[] = [720, 840, 960];
export const DEFAULT_WIDTH = 840;

export interface ReadingSettings {
    fontScale: number;
    lineHeight: number;
    widthPx: number;
}

export function defaultReadingSettings(): ReadingSettings {
    return {
        fontScale: FONT_SCALE_DEFAULT,
        lineHeight: DEFAULT_LINE_HEIGHT,
        widthPx: DEFAULT_WIDTH
    };
}

// Clamp the font scale into [min, max] and snap it to the configured step. The
// final *100/100 round removes binary floating point drift (0.8500000000000001)
// so min/max edge comparisons stay exact.
export function clampFontScale(value: number): number {
    if (!Number.isFinite(value)) return FONT_SCALE_DEFAULT;
    const stepped = Math.round(value / FONT_SCALE_STEP) * FONT_SCALE_STEP;
    const clamped = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, stepped));
    return Math.round(clamped * 100) / 100;
}

export function nextFontScale(current: number, direction: 1 | -1): number {
    const base = Number.isFinite(current) ? current : FONT_SCALE_DEFAULT;
    return clampFontScale(base + direction * FONT_SCALE_STEP);
}

export function normalizeLineHeight(value: unknown): number {
    const n = Number(value);
    return LINE_HEIGHT_LEVELS.some((level) => level === n) ? n : DEFAULT_LINE_HEIGHT;
}

export function normalizeWidth(value: unknown): number {
    const n = Number(value);
    return WIDTH_LEVELS.some((level) => level === n) ? n : DEFAULT_WIDTH;
}

export function normalizeSettings(raw: Partial<ReadingSettings> | null | undefined): ReadingSettings {
    return {
        fontScale: clampFontScale(Number(raw?.fontScale)),
        lineHeight: normalizeLineHeight(raw?.lineHeight),
        widthPx: normalizeWidth(raw?.widthPx)
    };
}

export function readStoredSettings(): ReadingSettings {
    if (typeof localStorage === 'undefined') return defaultReadingSettings();
    try {
        const raw = localStorage.getItem(READING_SETTINGS_STORAGE_KEY);
        return normalizeSettings(raw ? (JSON.parse(raw) as Partial<ReadingSettings>) : null);
    } catch {
        return defaultReadingSettings();
    }
}

export function persistSettings(settings: ReadingSettings): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(READING_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function readStoredFocusMode(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(FOCUS_MODE_STORAGE_KEY) === 'true';
}

export function persistFocusMode(enabled: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(FOCUS_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
}
