import { getImage } from 'astro:assets';
import { getCollection, render, type CollectionEntry } from 'astro:content';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import { createArchiveGroups } from './archive';
import {
    countWords,
    estimateReadingTime,
    formatDate,
    type PostFrontmatter,
    type PostListItem,
    type PostNavEntry,
    type TaxonomyKind,
    type TaxonomyPageProps,
    type TaxonomyTerm
} from './post-model';
import { createSearchIndex, type SearchIndexEntry } from './search';

export { createArchiveGroups, filterArchiveGroups } from './archive';
export type { ArchiveFilter, ArchiveGroups, ArchiveMonthGroup, ArchivePostItem, ArchiveYearGroup } from './archive';
export {
    countWords,
    estimateReadingTime,
    formatDate,
    formatPostDateLabel,
    type PostDateLabel,
    type PostFrontmatter,
    type PostListItem,
    type PostNavEntry,
    type TaxonomyKind,
    type TaxonomyPageProps,
    type TaxonomyTerm
} from './post-model';
export type { SearchHighlightPart, SearchIndexEntry, SearchMatchSnippet, SearchResult } from './search';

export type BlogEntry = CollectionEntry<'blog'>;

export interface PostEntry {
    slug: string;
    data: PostFrontmatter;
    body: string;
}

export interface PostPageProps {
    frontmatter: PostFrontmatter;
    Content: AstroComponentFactory;
    readingMinutes: number;
    prev: PostNavEntry | null;
    next: PostNavEntry | null;
}

const COVER_WIDTH_LIST = 800;
const COVER_WIDTH_HERO = 1400;

export function postSlug(entry: BlogEntry): string {
    return entry.id.replace(/\\/g, '/').replace(/\/index$/i, '');
}

function toIsoString(value?: Date | string): string | undefined {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
}

export async function resolveCoverUrl(
    cover: BlogEntry['data']['cover'] | undefined,
    width: number
): Promise<string | undefined> {
    if (!cover) return undefined;
    const image = await getImage({
        src: cover,
        width,
        format: 'webp',
        quality: 80
    });
    return image.src;
}

export function serializeFrontmatter(data: BlogEntry['data'], coverUrl?: string): PostFrontmatter {
    return {
        title: data.title,
        description: data.description,
        cover: coverUrl,
        coverLayout: data.coverLayout,
        language: data.language,
        category: data.category,
        tags: data.tags,
        draft: data.draft,
        pubDate: toIsoString(data.pubDate),
        updatedDate: toIsoString(data.updatedDate)
    };
}

export async function loadPublishedEntries(): Promise<BlogEntry[]> {
    const posts = await getCollection('blog', ({ data }) => data.draft !== true);
    // Newest first; same-day ties break by slug so order is stable.
    return posts.sort((a, b) => {
        const da = a.data.pubDate?.getTime() ?? 0;
        const db = b.data.pubDate?.getTime() ?? 0;
        if (db !== da) return db - da;
        return postSlug(a).localeCompare(postSlug(b));
    });
}

export async function loadPublishedPostEntries(): Promise<PostEntry[]> {
    const posts = await loadPublishedEntries();
    return Promise.all(
        posts.map(async (entry) => {
            const cover = await resolveCoverUrl(entry.data.cover, COVER_WIDTH_LIST);
            return {
                slug: postSlug(entry),
                data: serializeFrontmatter(entry.data, cover),
                body: entry.body ?? ''
            };
        })
    );
}

export function toPostListItem(entry: PostEntry): PostListItem {
    return {
        slug: entry.slug,
        data: entry.data,
        dateLabel: formatDate(entry.data.pubDate),
        wordCount: countWords(entry.body)
    };
}

export function toPostNavEntry(entry: PostEntry): PostNavEntry {
    return {
        slug: entry.slug,
        title: entry.data.title,
        cover: entry.data.cover,
        dateLabel: formatDate(entry.data.pubDate)
    };
}

export async function loadPublishedPosts(): Promise<PostListItem[]> {
    return (await loadPublishedPostEntries()).map(toPostListItem);
}

/** Lightweight cards for the hero marquee — only the first N posts, smaller covers, no body. */
export interface FeaturedPostItem {
    slug: string;
    title: string;
    description: string;
    category: string | null;
    cover: string | null;
    dateLabel: string | null;
}

const COVER_WIDTH_FEATURED = 480;
const FEATURED_DEFAULT_LIMIT = 3;

export async function loadFeaturedPosts(limit = FEATURED_DEFAULT_LIMIT): Promise<FeaturedPostItem[]> {
    const entries = (await loadPublishedEntries()).slice(0, Math.max(0, limit));
    return Promise.all(
        entries.map(async (entry) => {
            const cover = await resolveCoverUrl(entry.data.cover, COVER_WIDTH_FEATURED);
            return {
                slug: postSlug(entry),
                title: entry.data.title,
                description: entry.data.description,
                category: entry.data.category ?? null,
                cover: cover ?? null,
                dateLabel: formatDate(toIsoString(entry.data.pubDate))
            };
        })
    );
}

/** Lightweight taxonomy/post counts for hero stat cards (no body, no cover). */
export interface SiteStats {
    postCount: number;
    categoryCount: number;
    tagCount: number;
    /** Inclusive span of publication years, e.g. 5 for 2022–2026. */
    yearSpan: number;
    yearFrom: number | null;
    yearTo: number | null;
}

export async function loadSiteStats(): Promise<SiteStats> {
    const entries = await loadPublishedEntries();
    const categories = new Set<string>();
    const tags = new Set<string>();
    let yearFrom: number | null = null;
    let yearTo: number | null = null;

    for (const entry of entries) {
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
}

/** Most recently updated post (by updatedDate, else pubDate), optional exclude slugs. */
export async function loadRecentlyUpdatedPost(excludeSlugs: string[] = []): Promise<FeaturedPostItem | null> {
    const exclude = new Set(excludeSlugs);
    const entries = await loadPublishedEntries();
    const ranked = entries
        .map((entry) => {
            const updated = entry.data.updatedDate;
            const published = entry.data.pubDate;
            const stamp =
                updated instanceof Date && !Number.isNaN(updated.getTime())
                    ? updated.getTime()
                    : published instanceof Date && !Number.isNaN(published.getTime())
                      ? published.getTime()
                      : 0;
            return { entry, stamp };
        })
        .filter(({ entry, stamp }) => stamp > 0 && !exclude.has(postSlug(entry)))
        .sort((a, b) => b.stamp - a.stamp);

    const top = ranked[0]?.entry;
    if (!top) return null;

    const cover = await resolveCoverUrl(top.data.cover, COVER_WIDTH_FEATURED);
    const dateRaw = top.data.updatedDate ?? top.data.pubDate;
    return {
        slug: postSlug(top),
        title: top.data.title,
        description: top.data.description,
        category: top.data.category ?? null,
        cover: cover ?? null,
        dateLabel: formatDate(toIsoString(dateRaw))
    };
}

export async function loadArchiveGroups() {
    return createArchiveGroups(await loadPublishedPosts());
}

export async function loadSearchIndex(): Promise<SearchIndexEntry[]> {
    return createSearchIndex(
        (await loadPublishedPostEntries()).map((entry) => {
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
}

function getTaxonomyHref(kind: TaxonomyKind, name: string) {
    const base = kind === 'category' ? '/categories' : '/tags';
    return `${base}/${encodeURIComponent(name)}`;
}

function compareTerms(a: TaxonomyTerm, b: TaxonomyTerm) {
    if (a.count !== b.count) {
        return b.count - a.count;
    }
    return a.name.localeCompare(b.name, 'zh-CN');
}

function createTaxonomyTerms(kind: TaxonomyKind, posts: PostListItem[]): TaxonomyTerm[] {
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
            href: getTaxonomyHref(kind, name),
            count: groupedPosts.length,
            posts: groupedPosts
        }))
        .sort(compareTerms);
}

export async function loadTaxonomyTerms(kind: TaxonomyKind): Promise<TaxonomyTerm[]> {
    return createTaxonomyTerms(kind, await loadPublishedPosts());
}

export async function getCategoryStaticPaths() {
    const terms = await loadTaxonomyTerms('category');

    return terms.map((term) => ({
        params: { category: term.name },
        props: {
            term,
            terms,
            posts: term.posts
        } satisfies TaxonomyPageProps
    }));
}

export async function getTagStaticPaths() {
    const terms = await loadTaxonomyTerms('tag');

    return terms.map((term) => ({
        params: { tag: term.name },
        props: {
            term,
            terms,
            posts: term.posts
        } satisfies TaxonomyPageProps
    }));
}

export async function getPostStaticPaths() {
    const posts = await loadPublishedEntries();
    const serialized = await Promise.all(
        posts.map(async (entry) => {
            const cover = await resolveCoverUrl(entry.data.cover, COVER_WIDTH_LIST);
            return {
                entry,
                slug: postSlug(entry),
                data: serializeFrontmatter(entry.data, cover),
                body: entry.body ?? ''
            };
        })
    );

    return Promise.all(
        serialized.map(async (item, index) => {
            const listShape: PostEntry = {
                slug: item.slug,
                data: item.data,
                body: item.body
            };
            const prev = index > 0 ? toPostNavEntry(serialized[index - 1]) : null;
            const next = index < serialized.length - 1 ? toPostNavEntry(serialized[index + 1]) : null;
            const { Content } = await render(item.entry);
            const heroCover = await resolveCoverUrl(item.entry.data.cover, COVER_WIDTH_HERO);
            const frontmatter = serializeFrontmatter(item.entry.data, heroCover ?? item.data.cover);

            return {
                params: { slug: item.slug },
                props: {
                    frontmatter,
                    Content,
                    readingMinutes: estimateReadingTime(countWords(listShape.body)),
                    prev,
                    next
                } satisfies PostPageProps
            };
        })
    );
}
