import { getImage } from 'astro:assets';
import { getCollection, render, type CollectionEntry } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { Locale } from '../data/i18n';
import { siteConfig } from '../data/site';
import { NON_DEFAULT_LOCALES } from './i18n-routing';
import { groupPostTranslations, resolvePostTranslations, type ResolvedPostTranslation } from './post-locale';
import { createArchiveGroups } from './archive';
import type { FeedPost } from './feed';
import {
    buildCoverSrcset,
    countWords,
    estimateReadingTime,
    formatDate,
    normalizeRepost,
    type PostFrontmatter,
    type PostListItem,
    type PostNavEntry,
    type PublishedPostFrontmatter,
    type TaxonomyKind,
    type TaxonomyPageProps,
    type TaxonomyTerm,
    type TaxonomyTermSummary
} from './post-model';
import { createSearchIndex, type SearchIndexEntry } from './search';
import { memoizeAsync, memoizeAsyncByKey } from './memoize-async';

type BlogEntry = CollectionEntry<'blog'>;

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale as Locale;

export interface PostEntry {
    slug: string;
    data: PostFrontmatter;
    body: string;
    /** Language of the body actually served at the requested locale. */
    contentLocale: Locale;
    /** False when the requested locale fell back to the source article. */
    translated: boolean;
    /** Locales this post has real content for, in config order. */
    availableLocales: Locale[];
}

export interface PostPageProps {
    frontmatter: PublishedPostFrontmatter;
    Content: AstroComponentFactory;
    readingMinutes: number;
    prev: PostNavEntry | null;
    next: PostNavEntry | null;
    /** Dimensions of the hero cover, needed for `og:image:width` / `height`. */
    coverMeta?: CoverImageMeta;
    /** `srcset` for the hero cover, so phones do not download the 1400px desktop image. */
    coverSrcset?: string;
    /** Route locale — what the surrounding UI is rendered in. */
    locale?: Locale;
    /** Language of the article body, which falls back to the source when untranslated. */
    contentLocale: Locale;
    translated: boolean;
    availableLocales: Locale[];
}

/** The processed cover plus the dimensions the image service actually emitted. */
export interface CoverImageMeta {
    src: string;
    width: number;
    height: number;
    format: string;
}

const COVER_WIDTH_LIST = 800;
const COVER_WIDTH_HERO = 1400;
/** Smaller renditions offered next to the hero cover in its `srcset`. */
const COVER_WIDTHS_HERO_SRCSET = [640, 960] as const;

function toIsoString(value?: Date | string): string | undefined {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
}

async function resolveCoverMeta(
    cover: BlogEntry['data']['cover'] | undefined,
    width: number
): Promise<CoverImageMeta | undefined> {
    if (!cover) return undefined;

    const image = await getImage({
        src: cover,
        width,
        format: 'webp',
        quality: 80,
        layout: 'none'
    });

    const attributes = image.attributes as { width?: unknown; height?: unknown; format?: unknown };
    const resolvedWidth = Number(attributes.width) || cover.width;
    // Astro preserves the source aspect ratio (`Math.round(width / aspectRatio)`),
    // so this mirrors the service for the unlikely case the attributes are empty.
    const resolvedHeight = Number(attributes.height) || Math.round(resolvedWidth / (cover.width / cover.height));

    return {
        src: image.src,
        width: resolvedWidth,
        height: resolvedHeight,
        format: typeof attributes.format === 'string' ? attributes.format : 'webp'
    };
}

/**
 * `data.language` is normalized to the language of the body being served, so every
 * consumer downstream (SEO tags, JSON-LD, feeds) reads the truth instead of whatever
 * the author happened to type in the frontmatter.
 */
function serializeFrontmatter(item: ResolvedEntry, coverUrl?: string): PublishedPostFrontmatter {
    const { entry, contentLocale, repost, comments } = item;
    const data = entry.data;
    return {
        title: data.title,
        description: data.description,
        cover: coverUrl,
        coverLayout: data.coverLayout,
        language: contentLocale,
        category: data.category,
        tags: data.tags,
        author: data.author ? { ...data.author } : undefined,
        repost: normalizeRepost(repost),
        comments,
        draft: data.draft,
        pubDate: data.pubDate.toISOString(),
        updatedDate: toIsoString(data.updatedDate)
    };
}

const rememberDuringBuild = () => import.meta.env.PROD;

/** Every entry in the collection, drafts included, keyed by its loader id. */
const loadEntryIndexCached = memoizeAsync(async (): Promise<Map<string, BlogEntry>> => {
    const entries = await getCollection('blog');
    return new Map(entries.map((entry) => [entry.id, entry]));
}, rememberDuringBuild);

/**
 * Compiled markdown is keyed by entry id rather than by slug, so the locales that
 * fall back to the same source article share one Shiki/Unified compilation instead
 * of recompiling it per language route.
 */
const renderEntryCached = memoizeAsyncByKey(async (id: string) => {
    const entry = (await loadEntryIndexCached()).get(id);
    if (!entry) throw new Error(`Unknown blog entry "${id}"`);
    return render(entry);
}, rememberDuringBuild);

const resolveEntryCoverCached = memoizeAsyncByKey(async (key: string): Promise<CoverImageMeta | undefined> => {
    const separator = key.lastIndexOf('#');
    const id = key.slice(0, separator);
    const width = Number(key.slice(separator + 1));
    const entry = (await loadEntryIndexCached()).get(id);
    if (!entry) throw new Error(`Unknown blog entry "${id}"`);
    return resolveCoverMeta(entry.data.cover, width);
}, rememberDuringBuild);

async function entryCoverSrcset(entry: BlogEntry, hero: CoverImageMeta | undefined): Promise<string | undefined> {
    if (!hero) return undefined;
    const smaller = await Promise.all(COVER_WIDTHS_HERO_SRCSET.map((width) => entryCoverMeta(entry, width)));
    return buildCoverSrcset([...smaller, hero]);
}

function entryCoverMeta(entry: BlogEntry, width: number): Promise<CoverImageMeta | undefined> {
    return resolveEntryCoverCached(`${entry.id}#${width}`);
}

async function entryCoverUrl(entry: BlogEntry, width: number): Promise<string | undefined> {
    return (await entryCoverMeta(entry, width))?.src;
}

type ResolvedEntry = ResolvedPostTranslation<BlogEntry> & {
    /** The served entry's own `repost`, else the source article's. */
    repost: BlogEntry['data']['repost'];
    /** The served entry's own `comments`, else the source article's. */
    comments: BlogEntry['data']['comments'];
};

/**
 * The published article set for one locale: each post resolved to its translation
 * when it has one, to the source article otherwise, newest first.
 */
const loadResolvedEntriesCached = memoizeAsyncByKey(async (locale: Locale): Promise<ResolvedEntry[]> => {
    const groups = groupPostTranslations(await getCollection('blog'), (entry) => ({
        id: entry.id,
        language: entry.data.language,
        draft: entry.data.draft === true
    }));
    const sources = new Map(groups.map((group) => [group.slug, group.source]));

    // Whether a post is a repost, or takes comments, does not depend on the language
    // it is read in, so a translation that does not repeat a field inherits it from index.md.
    const resolved = resolvePostTranslations(groups, locale).map((item) => ({
        ...item,
        repost: item.entry.data.repost ?? sources.get(item.slug)?.data.repost,
        comments: item.entry.data.comments ?? sources.get(item.slug)?.data.comments
    }));

    // Same-day ties break by slug so the order is stable across builds.
    return resolved.sort((a, b) => {
        const da = a.entry.data.pubDate?.getTime() ?? 0;
        const db = b.entry.data.pubDate?.getTime() ?? 0;
        if (db !== da) return db - da;
        return a.slug.localeCompare(b.slug);
    });
}, rememberDuringBuild);

function loadResolvedEntries(locale: Locale = DEFAULT_LOCALE): Promise<ResolvedEntry[]> {
    return loadResolvedEntriesCached(locale);
}

const loadPublishedPostEntriesCached = memoizeAsyncByKey(async (locale: Locale): Promise<PostEntry[]> => {
    const resolved = await loadResolvedEntries(locale);
    return Promise.all(
        resolved.map(async (item) => {
            const cover = await entryCoverUrl(item.entry, COVER_WIDTH_LIST);
            return {
                slug: item.slug,
                data: serializeFrontmatter(item, cover),
                body: item.entry.body ?? '',
                contentLocale: item.contentLocale,
                translated: item.translated,
                availableLocales: item.availableLocales
            };
        })
    );
}, rememberDuringBuild);

export function loadPublishedPostEntries(locale: Locale = DEFAULT_LOCALE): Promise<PostEntry[]> {
    return loadPublishedPostEntriesCached(locale);
}

const loadFeedDocumentsCached = memoizeAsyncByKey(async (locale: Locale): Promise<FeedPost[]> => {
    const resolved = await loadResolvedEntries(locale);
    const container = await AstroContainer.create();

    return Promise.all(
        resolved.map(async (item) => {
            const cover = await entryCoverUrl(item.entry, COVER_WIDTH_HERO);
            const { Content } = await renderEntryCached(item.entry.id);
            const contentHtml = await container.renderToString(Content);
            if (contentHtml.includes('__ASTRO_IMAGE_') || /<!doctype html>/i.test(contentHtml)) {
                throw new Error(`Feed HTML for "${item.slug}" was not a resolved article fragment`);
            }

            return {
                slug: item.slug,
                data: serializeFrontmatter(item, cover),
                contentHtml
            };
        })
    );
}, rememberDuringBuild);

/** Published posts with the same rendered HTML the article page uses, for RSS and Atom. */
export function loadFeedDocuments(locale: Locale = DEFAULT_LOCALE): Promise<FeedPost[]> {
    return loadFeedDocumentsCached(locale);
}

function toPostListItem(entry: PostEntry): PostListItem {
    return {
        slug: entry.slug,
        data: entry.data,
        dateLabel: formatDate(entry.data.pubDate),
        wordCount: countWords(entry.body),
        contentLocale: entry.contentLocale,
        translated: entry.translated
    };
}

function toPostNavEntry(entry: PostEntry): PostNavEntry {
    return {
        slug: entry.slug,
        title: entry.data.title,
        cover: entry.data.cover,
        dateLabel: formatDate(entry.data.pubDate)
    };
}

export async function loadPublishedPosts(locale: Locale = DEFAULT_LOCALE): Promise<PostListItem[]> {
    return (await loadPublishedPostEntries(locale)).map(toPostListItem);
}

/** Lightweight cards for the hero marquee — only the first N posts, smaller covers, no body. */
interface FeaturedPostItem {
    slug: string;
    title: string;
    description: string;
    category: string | null;
    cover: string | null;
    dateLabel: string | null;
}

const COVER_WIDTH_FEATURED = 480;
const FEATURED_DEFAULT_LIMIT = 3;

const loadFeaturedPostsCached = memoizeAsyncByKey(async (key: string): Promise<FeaturedPostItem[]> => {
    const [locale, rawLimit] = key.split('#') as [Locale, string];
    const entries = (await loadResolvedEntries(locale)).slice(0, Number(rawLimit));
    return Promise.all(
        entries.map(async (item) => {
            const cover = await entryCoverUrl(item.entry, COVER_WIDTH_FEATURED);
            return {
                slug: item.slug,
                title: item.entry.data.title,
                description: item.entry.data.description,
                category: item.entry.data.category ?? null,
                cover: cover ?? null,
                dateLabel: formatDate(toIsoString(item.entry.data.pubDate))
            };
        })
    );
}, rememberDuringBuild);

export function loadFeaturedPosts(
    limit = FEATURED_DEFAULT_LIMIT,
    locale: Locale = DEFAULT_LOCALE
): Promise<FeaturedPostItem[]> {
    return loadFeaturedPostsCached(`${locale}#${Math.max(0, limit)}`);
}

/** Lightweight taxonomy/post counts for hero stat cards (no body, no cover). */
interface SiteStats {
    postCount: number;
    categoryCount: number;
    tagCount: number;
    /** Inclusive span of publication years, e.g. 5 for 2022–2026. */
    yearSpan: number;
    yearFrom: number | null;
    yearTo: number | null;
}

const loadSiteStatsCached = memoizeAsyncByKey(async (locale: Locale): Promise<SiteStats> => {
    const entries = await loadResolvedEntries(locale);
    const categories = new Set<string>();
    const tags = new Set<string>();
    let yearFrom: number | null = null;
    let yearTo: number | null = null;

    for (const { entry } of entries) {
        const category = entry.data.category?.trim();
        if (category) categories.add(category);
        for (const tag of entry.data.tags ?? []) {
            const name = tag?.trim();
            if (name) tags.add(name);
        }
        const pub = entry.data.pubDate;
        if (pub instanceof Date && !Number.isNaN(pub.getTime())) {
            const y = pub.getFullYear();
            yearFrom = yearFrom === null ? y : Math.min(yearFrom, y);
            yearTo = yearTo === null ? y : Math.max(yearTo, y);
        }
    }

    const yearSpan = yearFrom !== null && yearTo !== null ? Math.max(1, yearTo - yearFrom + 1) : 0;

    return {
        postCount: entries.length,
        categoryCount: categories.size,
        tagCount: tags.size,
        yearSpan,
        yearFrom,
        yearTo
    };
}, rememberDuringBuild);

export function loadSiteStats(locale: Locale = DEFAULT_LOCALE): Promise<SiteStats> {
    return loadSiteStatsCached(locale);
}

/** Most recently updated post (by updatedDate, else pubDate), optional exclude slugs. */
const loadRecentlyUpdatedPostCached = memoizeAsyncByKey(async (key: string): Promise<FeaturedPostItem | null> => {
    const [locale, excludeKey] = key.split('#') as [Locale, string];
    const exclude = new Set(excludeKey ? excludeKey.split('\0') : []);
    const entries = await loadResolvedEntries(locale);
    const ranked = entries
        .map((item) => {
            const updated = item.entry.data.updatedDate;
            const published = item.entry.data.pubDate;
            const stamp =
                updated instanceof Date && !Number.isNaN(updated.getTime())
                    ? updated.getTime()
                    : published instanceof Date && !Number.isNaN(published.getTime())
                      ? published.getTime()
                      : 0;
            return { item, stamp };
        })
        .filter(({ item, stamp }) => stamp > 0 && !exclude.has(item.slug))
        .sort((a, b) => b.stamp - a.stamp);

    const top = ranked[0]?.item;
    if (!top) return null;

    const cover = await entryCoverUrl(top.entry, COVER_WIDTH_FEATURED);
    const dateRaw = top.entry.data.updatedDate ?? top.entry.data.pubDate;
    return {
        slug: top.slug,
        title: top.entry.data.title,
        description: top.entry.data.description,
        category: top.entry.data.category ?? null,
        cover: cover ?? null,
        dateLabel: formatDate(toIsoString(dateRaw))
    };
}, rememberDuringBuild);

export function loadRecentlyUpdatedPost(
    excludeSlugs: string[] = [],
    locale: Locale = DEFAULT_LOCALE
): Promise<FeaturedPostItem | null> {
    return loadRecentlyUpdatedPostCached(`${locale}#${[...excludeSlugs].sort().join('\0')}`);
}

const loadArchiveGroupsCached = memoizeAsyncByKey(async (locale: Locale) => {
    return createArchiveGroups(await loadPublishedPosts(locale), locale);
}, rememberDuringBuild);

export function loadArchiveGroups(locale: Locale = DEFAULT_LOCALE) {
    return loadArchiveGroupsCached(locale);
}

const loadSearchIndexCached = memoizeAsyncByKey(async (locale: Locale): Promise<SearchIndexEntry[]> => {
    return createSearchIndex(
        (await loadPublishedPostEntries(locale)).map((entry) => {
            const listItem = toPostListItem(entry);
            return {
                slug: entry.slug,
                data: entry.data,
                dateLabel: listItem.dateLabel,
                wordCount: listItem.wordCount,
                rawContent: entry.body
            };
        })
    );
}, rememberDuringBuild);

export function loadSearchIndex(locale: Locale = DEFAULT_LOCALE): Promise<SearchIndexEntry[]> {
    return loadSearchIndexCached(locale);
}

function getTaxonomyHref(kind: TaxonomyKind, name: string, locale?: Locale) {
    const prefix = locale && locale !== DEFAULT_LOCALE ? `/${locale}` : '';
    const base = kind === 'category' ? '/categories' : '/tags';
    return `${prefix}${base}/${encodeURIComponent(name)}`;
}

function compareTerms(a: TaxonomyTerm, b: TaxonomyTerm) {
    if (a.count !== b.count) {
        return b.count - a.count;
    }
    return a.name.localeCompare(b.name, 'zh-CN');
}

function createTaxonomyTerms(kind: TaxonomyKind, posts: PostListItem[], locale: Locale): TaxonomyTerm[] {
    const groups = new Map<string, PostListItem[]>();

    posts.forEach((post) => {
        const rawTerms = kind === 'category' ? [post.data.category] : post.data.tags;
        rawTerms
            ?.map((term) => term?.trim())
            .filter((term): term is string => Boolean(term))
            .forEach((term) => {
                const group = groups.get(term) ?? [];
                group.push(post);
                groups.set(term, group);
            });
    });

    return Array.from(groups.entries())
        .map(([name, groupedPosts]) => ({
            name,
            href: getTaxonomyHref(kind, name, locale),
            count: groupedPosts.length,
            posts: groupedPosts
        }))
        .sort(compareTerms);
}

/**
 * Terms are derived from the locale-resolved article set, so a translated post
 * contributes the categories and tags written in its own language.
 */
const loadTaxonomyTermsCached = memoizeAsyncByKey(async (key: string) => {
    const [kind, locale] = key.split('#') as [TaxonomyKind, Locale];
    return createTaxonomyTerms(kind, await loadPublishedPosts(locale), locale);
}, rememberDuringBuild);

export function toTaxonomyTermSummary(term: TaxonomyTerm): TaxonomyTermSummary {
    return {
        name: term.name,
        href: term.href,
        count: term.count
    };
}

export function loadTaxonomyTerms(kind: TaxonomyKind, locale: Locale = DEFAULT_LOCALE): Promise<TaxonomyTerm[]> {
    return loadTaxonomyTermsCached(`${kind}#${locale}`);
}

export async function loadTaxonomyTermSummaries(
    kind: TaxonomyKind,
    locale: Locale = DEFAULT_LOCALE
): Promise<TaxonomyTermSummary[]> {
    return (await loadTaxonomyTerms(kind, locale)).map(toTaxonomyTermSummary);
}

async function createTaxonomyStaticPaths(kind: TaxonomyKind, locale: Locale, withLocaleParam: boolean) {
    const terms = await loadTaxonomyTerms(kind, locale);
    const termSummaries = terms.map(toTaxonomyTermSummary);
    const paramKey = kind === 'category' ? 'category' : 'tag';

    return terms.map((term) => ({
        params: withLocaleParam ? { locale, [paramKey]: term.name } : { [paramKey]: term.name },
        props: {
            term: toTaxonomyTermSummary(term),
            terms: termSummaries,
            posts: term.posts,
            locale
        } satisfies TaxonomyPageProps
    }));
}

async function createLocalizedTaxonomyStaticPaths(kind: TaxonomyKind) {
    const perLocale = await Promise.all(
        NON_DEFAULT_LOCALES.map((locale) => createTaxonomyStaticPaths(kind, locale, true))
    );
    return perLocale.flat();
}

export function getCategoryStaticPaths() {
    return createTaxonomyStaticPaths('category', DEFAULT_LOCALE, false);
}

export function getLocalizedCategoryStaticPaths() {
    return createLocalizedTaxonomyStaticPaths('category');
}

export function getTagStaticPaths() {
    return createTaxonomyStaticPaths('tag', DEFAULT_LOCALE, false);
}

export function getLocalizedTagStaticPaths() {
    return createLocalizedTaxonomyStaticPaths('tag');
}

export interface PostStaticPath {
    params: { slug: string };
    props: PostPageProps;
}

const getPostStaticPathsCached = memoizeAsyncByKey(async (locale: Locale): Promise<PostStaticPath[]> => {
    const resolved = await loadResolvedEntries(locale);
    const navEntries = await Promise.all(
        resolved.map(async (item) => {
            const cover = await entryCoverUrl(item.entry, COVER_WIDTH_LIST);
            return toPostNavEntry({
                slug: item.slug,
                data: serializeFrontmatter(item, cover),
                body: '',
                contentLocale: item.contentLocale,
                translated: item.translated,
                availableLocales: item.availableLocales
            });
        })
    );

    return Promise.all(
        resolved.map(async (item, index) => {
            const { Content } = await renderEntryCached(item.entry.id);
            const coverMeta = await entryCoverMeta(item.entry, COVER_WIDTH_HERO);
            const coverSrcset = await entryCoverSrcset(item.entry, coverMeta);
            const frontmatter = serializeFrontmatter(item, coverMeta?.src);

            return {
                params: { slug: item.slug },
                props: {
                    frontmatter,
                    Content,
                    readingMinutes: estimateReadingTime(countWords(item.entry.body ?? '')),
                    prev: index > 0 ? navEntries[index - 1] : null,
                    next: index < navEntries.length - 1 ? navEntries[index + 1] : null,
                    coverMeta,
                    coverSrcset,
                    locale,
                    contentLocale: item.contentLocale,
                    translated: item.translated,
                    availableLocales: item.availableLocales
                } satisfies PostPageProps
            };
        })
    );
}, rememberDuringBuild);

export function getPostStaticPaths(locale: Locale = DEFAULT_LOCALE): Promise<PostStaticPath[]> {
    return getPostStaticPathsCached(locale);
}

export async function getLocalizedPostStaticPaths() {
    const perLocale = await Promise.all(
        NON_DEFAULT_LOCALES.map(async (locale) => {
            const paths = await getPostStaticPaths(locale);
            return paths.map((item) => ({
                params: { locale, slug: item.params.slug },
                props: item.props
            }));
        })
    );
    return perLocale.flat();
}
