import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Locale } from '../data/i18n';
import { siteConfig } from '../data/site';
import { persistLang, translate } from '../lib/i18n';
import type { I18nConfig } from '../types/site';

const i18nConfig = siteConfig.i18n as I18nConfig;

export const useI18nStore = defineStore('i18n', () => {
    // The store keeps the app-level locale. It starts at the SSR default so every
    // island hydrates against matching markup; islands adopt the persisted locale
    // individually after their own hydration (see useI18n), which avoids Vue
    // hydration mismatches caused by islands hydrating at different times.
    const locale = ref<Locale>(i18nConfig.defaultLocale);

    function t(key: string, localeOverride?: Locale, params?: Record<string, string | number>): string {
        return translate(localeOverride ?? locale.value, key, params);
    }

    function setLocale(newLocale: Locale) {
        locale.value = newLocale;
        persistLang(newLocale);
        if (typeof document !== 'undefined') {
            document.documentElement.lang = newLocale;
        }
    }

    return { locale, t, setLocale };
});
