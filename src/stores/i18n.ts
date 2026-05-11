import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Locale } from '../data/i18n';
import { translations } from '../data/i18n';
import { siteConfig } from '../data/site';
import { getStoredLang, persistLang } from '../lib/i18n';
import type { I18nConfig } from '../types/site';

const i18nConfig = siteConfig.i18n as I18nConfig;

export const useI18nStore = defineStore('i18n', () => {
    const locale = ref<Locale>(
        typeof document !== 'undefined'
            ? getStoredLang(i18nConfig) || i18nConfig.defaultLocale
            : i18nConfig.defaultLocale
    );

    function t(key: string): string {
        const entry = translations[locale.value];
        if (entry && key in entry) return entry[key];
        const fallback = translations[i18nConfig.defaultLocale];
        if (fallback && key in fallback) return fallback[key];
        return key;
    }

    function setLocale(newLocale: Locale) {
        locale.value = newLocale;
        persistLang(newLocale);
    }

    return { locale, t, setLocale };
});
