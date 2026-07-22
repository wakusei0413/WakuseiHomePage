import type { PostFrontmatter } from './post-model';

export interface SearchIndexEntry {
    slug: string;
    data: PostFrontmatter;
    dateLabel: string | null;
    wordCount: number;
    bodyText: string;
    publishedAt: number;
}

export interface SearchHighlightPart {
    text: string;
    highlighted: boolean;
}

export interface SearchMatchSnippet {
    field: 'description' | 'body';
    parts: SearchHighlightPart[];
}

export interface SearchResult extends SearchIndexEntry {
    score: number;
    snippet: SearchMatchSnippet | null;
}

export interface SearchIndexSource {
    slug: string;
    data: PostFrontmatter;
    dateLabel: string | null;
    wordCount: number;
    rawContent: string;
}

const SNIPPET_RADIUS = 52;

export function normalizeSearchText(value: string): string {
    return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

export function tokenizeSearchQuery(query: string): string[] {
    return Array.from(new Set(normalizeSearchText(query).split(' ').filter(Boolean)));
}

export function stripMarkdownToText(markdown: string): string {
    return markdown
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^[>\-*+\d.)\s]+/gm, '')
        .replace(/[*_~>#|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function createSearchIndexEntry(
    slug: string,
    data: PostFrontmatter,
    dateLabel: string | null,
    wordCount: number,
    rawContent: string
): SearchIndexEntry {
    const publishedAt = data.pubDate ? new Date(data.pubDate).getTime() : 0;

    return {
        slug,
        data,
        dateLabel,
        wordCount,
        bodyText: stripMarkdownToText(rawContent),
        publishedAt: Number.isNaN(publishedAt) ? 0 : publishedAt
    };
}

export function createSearchIndex(sources: SearchIndexSource[]): SearchIndexEntry[] {
    return sources
        .filter((source) => !source.data.draft)
        .map((source) =>
            createSearchIndexEntry(source.slug, source.data, source.dateLabel, source.wordCount, source.rawContent)
        );
}

function getScore(entry: SearchIndexEntry, tokens: string[]): number | null {
    const title = normalizeSearchText(entry.data.title);
    const description = normalizeSearchText(entry.data.description);
    const body = normalizeSearchText(entry.bodyText);
    const combined = `${title} ${description} ${body}`;
    let score = 0;

    for (const token of tokens) {
        if (!combined.includes(token)) {
            return null;
        }
        if (title.includes(token)) score += 30;
        if (description.includes(token)) score += 15;
        if (body.includes(token)) score += 5;
    }

    return score;
}

function findFirstTokenIndex(text: string, tokens: string[]): { index: number; token: string } | null {
    const normalizedText = normalizeSearchText(text);
    let bestIndex = Number.POSITIVE_INFINITY;
    let bestToken = '';

    tokens.forEach((token) => {
        const index = normalizedText.indexOf(token);
        if (index !== -1 && index < bestIndex) {
            bestIndex = index;
            bestToken = token;
        }
    });

    return bestToken ? { index: bestIndex, token: bestToken } : null;
}

function createHighlightedParts(text: string, tokens: string[]): SearchHighlightPart[] {
    const parts: SearchHighlightPart[] = [];
    const tokenPattern = tokens.map(escapeRegExp).join('|');
    const matcher = new RegExp(tokenPattern, 'gi');
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(text))) {
        if (match.index > lastIndex) {
            parts.push({ text: text.slice(lastIndex, match.index), highlighted: false });
        }
        parts.push({ text: match[0], highlighted: true });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push({ text: text.slice(lastIndex), highlighted: false });
    }

    return parts.length ? parts : [{ text, highlighted: false }];
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createSnippetParts(text: string, tokens: string[]): SearchHighlightPart[] {
    const hit = findFirstTokenIndex(text, tokens);
    if (!hit) {
        return [];
    }

    const start = Math.max(0, hit.index - SNIPPET_RADIUS);
    const end = Math.min(text.length, hit.index + hit.token.length + SNIPPET_RADIUS);
    const excerpt = `${start > 0 ? '...' : ''}${text.slice(start, end).trim()}${end < text.length ? '...' : ''}`;

    return createHighlightedParts(excerpt, tokens);
}

function createSnippet(entry: SearchIndexEntry, tokens: string[]): SearchMatchSnippet | null {
    const descriptionParts = createSnippetParts(entry.data.description, tokens);
    if (descriptionParts.length) {
        return { field: 'description', parts: descriptionParts };
    }

    const bodyParts = createSnippetParts(entry.bodyText, tokens);
    if (bodyParts.length) {
        return { field: 'body', parts: bodyParts };
    }

    return null;
}

function compareByDate(a: SearchIndexEntry, b: SearchIndexEntry): number {
    if (a.publishedAt !== b.publishedAt) {
        return b.publishedAt - a.publishedAt;
    }
    return a.slug.localeCompare(b.slug, 'zh-CN');
}

export function searchPosts(entries: SearchIndexEntry[], query: string): SearchResult[] {
    const tokens = tokenizeSearchQuery(query);

    if (!tokens.length) {
        return [...entries].sort(compareByDate).map((entry) => ({
            ...entry,
            score: 0,
            snippet: null
        }));
    }

    return entries
        .map((entry) => {
            const score = getScore(entry, tokens);
            if (score === null) return null;
            return {
                ...entry,
                score,
                snippet: createSnippet(entry, tokens)
            };
        })
        .filter((entry): entry is SearchResult => entry !== null)
        .sort((a, b) => {
            if (a.score !== b.score) {
                return b.score - a.score;
            }
            return compareByDate(a, b);
        });
}
