import { createSignal } from 'solid-js';
import { translations } from '../data/i18n';
import type { Locale } from '../data/i18n';
import type { I18nConfig } from '../types/site';

const STORAGE_KEY_LANG = 'lang';
const STORAGE_KEY_THEME = 'theme';

export function createI18n(config: I18nConfig) {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_LANG) : null;
    const initial = (stored && config.locales.includes(stored as Locale) ? stored : config.defaultLocale) as Locale;

    const [locale, setLocaleSignal] = createSignal<Locale>(initial);

    function setLocale(newLocale: Locale) {
        setLocaleSignal(newLocale);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY_LANG, newLocale);
        }
    }

    function t(key: string): string {
        const currentLocale = locale();
        const entry = translations[currentLocale];
        if (entry && key in entry) {
            return entry[key];
        }
        const fallback = translations[config.defaultLocale];
        if (fallback && key in fallback) {
            return fallback[key];
        }
        return key;
    }

    return { locale, setLocale, t };
}

export type I18nContext = ReturnType<typeof createI18n>;

export function getStoredTheme(): 'light' | 'dark' | null {
    if (typeof localStorage === 'undefined') {
        return null;
    }
    const stored = localStorage.getItem(STORAGE_KEY_THEME);
    if (stored === 'light' || stored === 'dark') {
        return stored;
    }
    return null;
}

export function getSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
}

export function applyTheme(theme: 'light' | 'dark') {
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
    }
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_THEME, theme);
    }
}
