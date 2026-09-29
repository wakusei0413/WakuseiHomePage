// Client-safe post types and pure helpers. Do not import astro:content here.

export interface PostAuthor {
    name: string;
    url?: string;
}

/** Where a reposted article came from. Every field may be unknown. */
export interface PostRepost {
    /** Name of the original publication or site. */
    source?: string;
    url?: string;
    /** Original author, when different from the publication. */
    author?: string;
}

export interface PostFrontmatter {
    title: string;
    description: string;
    cover?: string;
    coverLayout?: 'overlay' | 'below';
    language?: string;
    category?: string;
    tags?: string[];
    author?: PostAuthor;
    /** Set on reposts only; originals leave it undefined. */
    repost?: PostRepost;
    /** `false` hides the comment section; absent means on. */
    comments?: boolean;
    draft?: boolean;
    pubDate?: string;
    updatedDate?: string;
}

export interface PublishedPostFrontmatter extends PostFrontmatter {
    pubDate: string;
}

export interface PostListItem {
    slug: string;
    data: PostFrontmatter;
    dateLabel: string | null;
    wordCount: number;
    /** Language of the body this list entry points at. */
    contentLocale?: Locale;
    /** False when the current locale is showing the source article as a fallback. */
    translated?: boolean;
}

export interface PostNavEntry {
    slug: string;
    title: string;
    cover?: string;
    dateLabel: string | null;
}

import type { Locale } from '../data/i18n';
import { translate } from './i18n';

export type TaxonomyKind = 'category' | 'tag';

export interface TaxonomyTermSummary {
    name: string;
    href: string;
    count: number;
}

export interface TaxonomyTerm extends TaxonomyTermSummary {
    posts: PostListItem[];
}

export interface TaxonomyPageProps {
    term: TaxonomyTermSummary;
    terms: TaxonomyTermSummary[];
    posts: PostListItem[];
    locale?: Locale;
}

export interface PostDateLabel {
    iso: string;
    label: string;
}

/**
 * Builds a width-descriptor `srcset` from image renditions (missing ones are
 * skipped). A source smaller than a requested width yields the same width twice;
 * only the first of those is kept so no width is listed more than once.
 */
export function buildCoverSrcset(renditions: Array<{ src: string; width: number } | undefined>): string {
    const byWidth = new Map<number, string>();
    for (const rendition of renditions) {
        if (rendition && !byWidth.has(rendition.width)) byWidth.set(rendition.width, rendition.src);
    }
    return [...byWidth]
        .sort(([a], [b]) => a - b)
        .map(([width, src]) => `${src} ${width}w`)
        .join(', ');
}

/** Frontmatter `repost: true` means "reposted, source unknown". */
export function normalizeRepost(value: true | PostRepost | undefined): PostRepost | undefined {
    if (value === undefined) return undefined;
    return value === true ? {} : { ...value };
}

/** Display name of a repost's origin: its `source`, else the URL's host. */
export function repostSourceLabel(repost: PostRepost): string | undefined {
    if (repost.source) return repost.source;
    if (!repost.url) return undefined;
    try {
        return new URL(repost.url).hostname.replace(/^www\./, '');
    } catch {
        return repost.url;
    }
}

export function estimateReadingTime(wordCount: number): number {
    if (!wordCount || wordCount <= 0) return 1;
    return Math.max(1, Math.round(wordCount / 300));
}

export const formatDate = (raw?: string | Date): string | null => {
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const MONTH_KEYS = [
    'time.month.jan',
    'time.month.feb',
    'time.month.mar',
    'time.month.apr',
    'time.month.may',
    'time.month.jun',
    'time.month.jul',
    'time.month.aug',
    'time.month.sep',
    'time.month.oct',
    'time.month.nov',
    'time.month.dec'
] as const;

/** Month name in `locale`, e.g. `September` / `九月` / `9月`. */
export const localizedMonthName = (month: number, locale: Locale): string =>
    translate(locale, MONTH_KEYS[Math.min(Math.max(month, 1), 12) - 1]);

export const formatPostDateLabel = (raw?: string | Date, locale: Locale = 'zh-CN'): PostDateLabel | null => {
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    const iso = formatDate(d);
    if (!iso) return null;
    const month = d.getMonth() + 1;
    return {
        iso,
        label: translate(locale, 'post.date', {
            year: d.getFullYear(),
            month,
            day: d.getDate(),
            monthName: localizedMonthName(month, locale)
        })
    };
};

export const countWords = (raw?: string): number => {
    if (!raw) return 0;
    const text = raw.trim();
    if (!text) return 0;
    const cnCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const enCount = (text.match(/[a-zA-Z0-9_]+/g) || []).length;
    return cnCount + enCount;
};
