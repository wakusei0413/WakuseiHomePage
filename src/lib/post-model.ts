// Client-safe post types and pure helpers. Do not import astro:content here.

export interface PostFrontmatter {
    title: string;
    description: string;
    cover?: string;
    coverLayout?: 'overlay' | 'below';
    language?: string;
    category?: string;
    tags?: string[];
    draft?: boolean;
    pubDate?: string;
    updatedDate?: string;
}

export interface PostListItem {
    slug: string;
    data: PostFrontmatter;
    dateLabel: string | null;
    wordCount: number;
}

export interface PostNavEntry {
    slug: string;
    title: string;
    cover?: string;
    dateLabel: string | null;
}

export type TaxonomyKind = 'category' | 'tag';

export interface TaxonomyTerm {
    name: string;
    href: string;
    count: number;
    posts: PostListItem[];
}

export interface TaxonomyPageProps {
    term: TaxonomyTerm;
    terms: TaxonomyTerm[];
    posts: PostListItem[];
}

export interface PostDateLabel {
    iso: string;
    label: string;
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

export const formatPostDateLabel = (raw?: string | Date): PostDateLabel | null => {
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    const iso = formatDate(d);
    if (!iso) return null;
    return {
        iso,
        label: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
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
