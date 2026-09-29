// Pure helpers that map the blog collection's flat entry list onto per-locale
// article variants. A post lives in `src/content/blog/<slug>/`:
//
//   index.md        the source article (its `language` declares what it is written in)
//   index.en.md     optional English translation
//   index.ja.md     optional Japanese translation
//
// The content loader flattens those into ids `<slug>` and `<slug>@<locale>`;
// everything below works on that id shape and never touches `astro:content`,
// so it stays unit-testable and safe to import from the client bundle.

import { siteConfig } from '../data/site';
import type { I18nConfig, Locale } from '../types/site';

const i18nConfig = siteConfig.i18n as I18nConfig;

/** Separator between a post's base slug and the locale carried by a translation file. */
export const TRANSLATION_ID_SEPARATOR = '@';

export function isSupportedLocale(value: unknown): value is Locale {
    return typeof value === 'string' && (i18nConfig.locales as readonly string[]).includes(value);
}

/** Config order, so every "available locales" list is presented consistently. */
export function sortLocales(locales: Iterable<Locale>): Locale[] {
    const wanted = new Set(locales);
    return i18nConfig.locales.filter((locale) => wanted.has(locale));
}

/** `foo@en` -> `{ slug: 'foo', locale: 'en' }`; `foo` -> `{ slug: 'foo', locale: null }`. */
export function parsePostEntryId(id: string): { slug: string; locale: Locale | null } {
    const normalized = id.replace(/\\/g, '/');
    const index = normalized.lastIndexOf(TRANSLATION_ID_SEPARATOR);
    if (index <= 0) return { slug: normalized, locale: null };

    const candidate = normalized.slice(index + 1);
    if (!isSupportedLocale(candidate)) return { slug: normalized, locale: null };
    return { slug: normalized.slice(0, index), locale: candidate };
}

/** Inverse of {@link parsePostEntryId}; the source article has no suffix. */
export function buildPostEntryId(slug: string, locale?: Locale | null): string {
    return locale ? `${slug}${TRANSLATION_ID_SEPARATOR}${locale}` : slug;
}

/** Everything the grouping needs to know about an entry, however it is shaped. */
export interface PostTranslationInput {
    id: string;
    language?: string;
    draft?: boolean;
}

export interface PostTranslationGroup<T> {
    slug: string;
    /** The article served when the requested locale has no translation of its own. */
    source: T;
    /** Language the source body is written in. */
    sourceLocale: Locale;
    /** Translations by locale, drafts already removed. Never contains `sourceLocale`. */
    translations: ReadonlyMap<Locale, T>;
    /** Every locale this post has real content for, in config order. */
    availableLocales: Locale[];
}

export interface ResolvedPostTranslation<T> {
    slug: string;
    entry: T;
    /** Locale that was asked for — the route the article is served on. */
    requestedLocale: Locale;
    /** Language of the body actually served. Equals `requestedLocale` only when translated. */
    contentLocale: Locale;
    /** True when a dedicated variant exists for `requestedLocale`. */
    translated: boolean;
    availableLocales: Locale[];
}

/**
 * Collapses a flat entry list into one group per post.
 *
 * Publication is governed by the source article: a drafted `index.md` unpublishes
 * the post in every language. A drafted translation is merely skipped, so the
 * locale falls back to the source instead of disappearing from the site.
 */
export function groupPostTranslations<T>(
    entries: readonly T[],
    read: (entry: T) => PostTranslationInput
): PostTranslationGroup<T>[] {
    interface Draft {
        slug: string;
        source: T | null;
        sourceLocale: Locale;
        sourceIsDraft: boolean;
        translations: Map<Locale, T>;
    }

    const groups = new Map<string, Draft>();

    for (const entry of entries) {
        const { id, language, draft } = read(entry);
        const { slug, locale } = parsePostEntryId(id);
        const group: Draft = groups.get(slug) ?? {
            slug,
            source: null,
            sourceLocale: i18nConfig.defaultLocale,
            sourceIsDraft: false,
            translations: new Map<Locale, T>()
        };

        if (locale === null) {
            group.source = entry;
            group.sourceLocale = isSupportedLocale(language) ? language : i18nConfig.defaultLocale;
            group.sourceIsDraft = draft === true;
        } else if (draft !== true) {
            group.translations.set(locale, entry);
        }

        groups.set(slug, group);
    }

    const resolved: PostTranslationGroup<T>[] = [];

    for (const group of groups.values()) {
        let source = group.source;
        let sourceLocale = group.sourceLocale;

        if (source && group.sourceIsDraft) continue;

        if (!source) {
            // A post shipped as translations only (or whose source is a draft while a
            // translation is not) still needs one variant to fall back to.
            const orphanLocale = sortLocales(group.translations.keys())[0];
            if (!orphanLocale) continue;
            source = group.translations.get(orphanLocale) as T;
            sourceLocale = orphanLocale;
        }

        const translations = new Map(group.translations);
        translations.delete(sourceLocale);

        resolved.push({
            slug: group.slug,
            source,
            sourceLocale,
            translations,
            availableLocales: sortLocales([sourceLocale, ...translations.keys()])
        });
    }

    return resolved;
}

/** Picks the variant to serve at `locale`, falling back to the source article. */
export function resolvePostTranslation<T>(group: PostTranslationGroup<T>, locale: Locale): ResolvedPostTranslation<T> {
    const exact = locale === group.sourceLocale ? group.source : (group.translations.get(locale) ?? null);

    return {
        slug: group.slug,
        entry: exact ?? group.source,
        requestedLocale: locale,
        contentLocale: exact ? locale : group.sourceLocale,
        translated: exact !== null,
        availableLocales: group.availableLocales
    };
}

export function resolvePostTranslations<T>(
    groups: readonly PostTranslationGroup<T>[],
    locale: Locale
): ResolvedPostTranslation<T>[] {
    return groups.map((group) => resolvePostTranslation(group, locale));
}
