import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18nStore } from '../stores/i18n';
import { getStoredLang } from '../lib/i18n';
import { siteConfig } from '../data/site';
import type { I18nConfig, Locale } from '../types/site';

const i18nConfig = siteConfig.i18n as I18nConfig;

export function useI18n() {
    const store = useI18nStore();
    // Always seed from the SSR default locale so this island's hydration render
    // matches the server markup, even when the user previously selected another
    // language (the store keeps that choice and it is applied after hydration).
    // Astro mounts each island as a separate Vue app that hydrates at a
    // different time (client:load vs client:idle), so a shared store value
    // switched by the first island would make later islands mismatch the SSR
    // (default-locale) text. Each island therefore adopts the persisted locale
    // only after its own hydration.
    const locale = ref<Locale>(i18nConfig.defaultLocale);

    const adoptStoredLocale = () => {
        const stored = getStoredLang(i18nConfig);
        if (stored !== locale.value) {
            locale.value = stored;
        }
        if (typeof document !== 'undefined') {
            document.documentElement.lang = stored;
        }
    };

    onMounted(adoptStoredLocale);

    // Persistent islands (site shell, top bar, footer) do not re-mount after a
    // client-side navigation, so re-adopt the stored locale once the new page
    // has been swapped in.
    if (typeof document !== 'undefined') {
        document.addEventListener('astro:after-swap', adoptStoredLocale);
    }
    onUnmounted(() => {
        if (typeof document !== 'undefined') {
            document.removeEventListener('astro:after-swap', adoptStoredLocale);
        }
    });

    // Propagate UI language changes made through the store to every island.
    // Pinia unwraps setup-store refs, so store.locale is the Locale value here.
    watch(
        () => store.locale,
        (next) => {
            locale.value = next;
        }
    );

    return {
        locale,
        t: (key: string) => store.t(key, locale.value),
        setLocale: (lang: Locale) => {
            // Update this island's ref synchronously (the store watcher below is
            // deferred); the store persists the choice and syncs the document lang.
            locale.value = lang;
            store.setLocale(lang);
        }
    };
}
