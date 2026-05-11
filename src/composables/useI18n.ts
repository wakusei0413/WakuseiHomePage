import { useI18nStore } from '../stores/i18n';
import type { Locale } from '../types/site';

export function useI18n() {
    const store = useI18nStore();
    return {
        locale: store.locale,
        t: (key: string) => store.t(key),
        setLocale: (lang: Locale) => store.setLocale(lang)
    };
}
