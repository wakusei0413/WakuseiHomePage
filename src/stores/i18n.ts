import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Locale } from '../data/i18n';
import { translations } from '../data/i18n';
import { siteConfig } from '../data/site';
import { getStoredLang, persistLang } from '../lib/i18n';

export const useI18nStore = defineStore('i18n', () => {
    const locale = ref<Locale>(
        typeof document !== 'undefined'
            ? (getStoredLang(siteConfig.i18n) as Locale) || siteConfig.i18n.defaultLocale
            : siteConfig.i18n.defaultLocale
    );

    function t(key: string): string {
        const entry = translations[locale.value];
        if (entry && key in entry) return entry[key];
        const fallback = translations[siteConfig.i18n.defaultLocale];
        if (fallback && key in fallback) return fallback[key];
        return key;
    }

    function setLocale(newLocale: Locale) {
        locale.value = newLocale;
        persistLang(newLocale);
    }

    return { locale, t, setLocale };
});
