// Client-safe helpers for the comment section (Twikoo). No astro:content here.

import type { Locale } from '../types/site';

/** Twikoo ships zh-CN and en inside its main bundle; every other UI language is a lazy chunk. */
const TWIKOO_LANG: Record<Locale, { lang: string; chunk: string | null }> = {
    'zh-CN': { lang: 'zh-CN', chunk: null },
    en: { lang: 'en', chunk: null },
    ja: { lang: 'ja', chunk: 'ja-JP' }
};

/** Where the build publishes Twikoo's lazy language chunks (see src/pages/twikoo/locales). */
export const TWIKOO_LOCALE_BASE = '/twikoo';

export function twikooLang(locale: Locale): string {
    return TWIKOO_LANG[locale].lang;
}

/** Name of the language chunk Twikoo will `import()` for this locale, or null when it is built in. */
export function twikooLocaleChunk(locale: Locale): string | null {
    return TWIKOO_LANG[locale].chunk;
}

/**
 * The thread key for a post. It leaves the locale prefix out on purpose, so
 * `/posts/x`, `/en/posts/x` and `/ja/posts/x` share one comment thread and one
 * view counter instead of splitting readers by language.
 */
export function commentThreadPath(slug: string): string {
    return `/posts/${slug.replace(/^\/+|\/+$/g, '')}`;
}
