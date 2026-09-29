import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18nStore } from '../stores/i18n';
import { applyDocumentLanguage, getStoredLang } from '../lib/i18n';
import { extractLocaleFromPath } from '../lib/i18n-routing';
import { siteConfig } from '../data/site';
import type { I18nConfig, Locale } from '../types/site';

const i18nConfig = siteConfig.i18n as I18nConfig;

function getCurrentLocale(): Locale {
    if (typeof window !== 'undefined') {
        const routeLocale = extractLocaleFromPath(window.location.pathname);
        if (routeLocale !== i18nConfig.defaultLocale) {
            return routeLocale;
        }
    }
    return getStoredLang(i18nConfig);
}

export function useI18n() {
    const store = useI18nStore();
    const locale = ref<Locale>(i18nConfig.defaultLocale);

    const adoptLocale = () => {
        const next = getCurrentLocale();
        if (next !== locale.value) {
            locale.value = next;
        }
        if (store.locale !== next) {
            store.setLocale(next);
        }
        applyDocumentLanguage(next);
    };

    onMounted(adoptLocale);

    // Persistent islands (site shell, top bar, footer) do not re-mount after a
    // client-side navigation, so re-adopt the new page's locale once the new
    // document has been swapped in.
    if (typeof document !== 'undefined') {
        document.addEventListener('astro:after-swap', adoptLocale);
    }
    onUnmounted(() => {
        if (typeof document !== 'undefined') {
            document.removeEventListener('astro:after-swap', adoptLocale);
        }
    });

    // Propagate UI language changes made through the store to every island.
    watch(
        () => store.locale,
        (next) => {
            locale.value = next;
        }
    );

    return {
        locale,
        t: (key: string, params?: Record<string, string | number>) => store.t(key, locale.value, params),
        setLocale: (lang: Locale) => {
            locale.value = lang;
            store.setLocale(lang);
        }
    };
}
