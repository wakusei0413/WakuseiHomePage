import { translations } from '../data/i18n';
import type { Locale } from '../data/i18n';
import type { I18nConfig } from '../types/site';

const STORAGE_KEY_LANG = 'lang';
const STORAGE_KEY_THEME = 'theme';
const THEME_CHANGE_EVENT = 'wakusei:theme-change';

export type Theme = 'light' | 'dark';

export function getStoredLang(config: I18nConfig): Locale {
    if (typeof localStorage === 'undefined') return config.defaultLocale;
    const stored = localStorage.getItem(STORAGE_KEY_LANG);
    if (stored && config.locales.includes(stored as Locale)) return stored as Locale;
    return config.defaultLocale;
}

export function getStoredTheme(): Theme | null {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY_THEME);
    if (stored === 'light' || stored === 'dark') return stored;
    return null;
}

export function getSystemTheme(): Theme {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
}

export function getCurrentTheme(): Theme {
    if (typeof document !== 'undefined') {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'light' || current === 'dark') return current;
    }
    return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme) {
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
            if (bg) metaThemeColor.setAttribute('content', bg);
        }
    }
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_THEME, theme);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }));
    }
}

export function persistLang(lang: Locale) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_LANG, lang);
}

export { translations };
export type { Locale };
