import { siteConfig } from '../data/site';
import { getStoredLang, persistLang, translations } from './i18n';
import type { Locale } from '../data/i18n';

let _locale = $state<Locale>(
    typeof document !== 'undefined' ? getStoredLang(siteConfig.i18n) : siteConfig.i18n.defaultLocale
);

export function getLocale(): Locale {
    return _locale;
}

export function setLocale(newLocale: Locale) {
    _locale = newLocale;
    persistLang(newLocale);
}

export function t(key: string): string {
    const entry = translations[_locale];
    if (entry && key in entry) return entry[key];
    const fallback = translations[siteConfig.i18n.defaultLocale];
    if (fallback && key in fallback) return fallback[key];
    return key;
}
