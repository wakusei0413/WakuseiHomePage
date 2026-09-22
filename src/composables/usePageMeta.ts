import { onMounted, onUnmounted, watch } from 'vue';
import { siteConfig } from '../data/site';
import { usePageShellStore, type ShellMode } from '../stores/page-shell';
import { useI18n } from './useI18n';

export interface PageMetaOptions {
    /** i18n key for the page heading, reused as the tab title and shell title. */
    titleKey: string;
    /** i18n key for the meta description. */
    descriptionKey: string;
    /** Interpolation values, read lazily so reactive callers stay in sync. */
    params?: () => Record<string, string | number>;
    mode: ShellMode;
    isHomePage?: boolean;
    /** Opt out on pages whose SSR metadata is already correct (e.g. home page 1). */
    enabled?: () => boolean;
    /**
     * Skip the shell-title update. The paginated home pages keep the profile
     * name in the hero panel and only need the document metadata refreshed.
     */
    syncShell?: boolean;
}

type MetaAttribute = 'name' | 'property';

function setMetaContent(attribute: MetaAttribute, key: string, content: string) {
    const element = document.querySelector(`meta[${attribute}="${key}"]`);
    if (element) element.setAttribute('content', content);
}

/**
 * Keeps the document-level page metadata in step with the active locale.
 *
 * The site is a static build without per-locale routes, so the served HTML can
 * only ever carry the default locale in `<title>` and the `og:*` / `twitter:*`
 * tags. Islands call this composable to rewrite that metadata once hydration
 * adopts the persisted locale, and again on every language switch.
 */
export function usePageMeta(options: PageMetaOptions) {
    const { t, locale } = useI18n();
    const pageShell = usePageShellStore();
    let isMounted = false;

    function syncPageMeta() {
        if (options.enabled && !options.enabled()) return;

        const params = options.params?.();
        const title = t(options.titleKey, params);
        const description = t(options.descriptionKey, params);

        document.title = `${title} | ${siteConfig.title}`;
        setMetaContent('name', 'description', description);
        setMetaContent('property', 'og:title', title);
        setMetaContent('property', 'og:description', description);
        setMetaContent('name', 'twitter:title', title);
        setMetaContent('name', 'twitter:description', description);

        if (options.syncShell === false) return;

        // The surface's `data-page-title` is what the persistent shell reads
        // after a View Transitions swap, so it has to move with the store.
        const surface = document.getElementById('pageTransitionSurface');
        if (surface) surface.dataset.pageTitle = title;

        pageShell.enterPage({
            title,
            mode: options.mode,
            isHomePage: options.isHomePage ?? false
        });
    }

    // `useI18n` only adopts the stored locale after the island hydrates, so the
    // first paint keeps the SSR (default-locale) metadata; sync once mounted and
    // again whenever the locale changes.
    onMounted(() => {
        isMounted = true;
        syncPageMeta();
    });

    onUnmounted(() => {
        isMounted = false;
    });

    watch(locale, () => {
        if (isMounted) syncPageMeta();
    });

    return { syncPageMeta };
}
