import { createSignal } from 'solid-js';
import { translations } from '../data/i18n';
import type { Locale } from '../data/i18n';
import type { I18nConfig } from '../types/site';

const STORAGE_KEY_LANG = 'lang';
const STORAGE_KEY_THEME = 'theme';
const THEME_CHANGE_EVENT = 'wakusei:theme-change';

export type Theme = 'light' | 'dark';

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

export function getStoredTheme(): Theme | null {
    if (typeof localStorage === 'undefined') {
        return null;
    }
    const stored = localStorage.getItem(STORAGE_KEY_THEME);
    if (stored === 'light' || stored === 'dark') {
        return stored;
    }
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
        if (current === 'light' || current === 'dark') {
            return current;
        }
    }

    return getStoredTheme() ?? getSystemTheme();
}

export function subscribeThemeChange(callback: (theme: Theme) => void) {
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    const handleThemeChange = (event: Event) => {
        const detail = (event as CustomEvent<{ theme?: Theme }>).detail;
        callback(detail?.theme ?? getCurrentTheme());
    };

    const handleStorage = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY_THEME && (event.newValue === 'light' || event.newValue === 'dark')) {
            callback(event.newValue);
        }
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.addEventListener('storage', handleStorage);

    return () => {
        window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
        window.removeEventListener('storage', handleStorage);
    };
}

export function applyTheme(theme: Theme) {
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
            if (bg) {
                metaThemeColor.setAttribute('content', bg);
            }
        }
    }
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_THEME, theme);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }));
    }
}
