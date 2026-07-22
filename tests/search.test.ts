import { createSearchIndex, searchPosts, type SearchIndexEntry, type SearchIndexSource } from '../src/lib/search';
import type { PostFrontmatter } from '../src/lib/post-model';

function source(
    slug: string,
    data: Partial<PostFrontmatter>,
    rawContent: string,
    dateLabel = '2026-01-01'
): SearchIndexSource {
    return {
        slug,
        data: {
            title: slug,
            description: `${slug} description`,
            pubDate: dateLabel,
            ...data
        },
        dateLabel,
        wordCount: 300,
        rawContent
    };
}

function index(entries: SearchIndexSource[]): SearchIndexEntry[] {
    return createSearchIndex(entries);
}

describe('site search', () => {
    it('matches title, description and body text', () => {
        const entries = index([
            source('title-hit', { title: 'Astro 搜索体验', description: 'nothing here' }, 'plain body'),
            source('description-hit', { title: 'Other', description: '干净整洁的视觉搜索' }, 'plain body'),
            source('body-hit', { title: 'Other', description: 'nothing here' }, '正文里包含 优雅 搜索')
        ]);

        expect(searchPosts(entries, 'Astro').map((entry) => entry.slug)).toEqual(['title-hit']);
        expect(searchPosts(entries, '视觉').map((entry) => entry.slug)).toEqual(['description-hit']);
        expect(searchPosts(entries, '优雅').map((entry) => entry.slug)).toEqual(['body-hit']);
    });

    it('does not include draft posts in the search index', () => {
        const entries = index([
            source('published', { title: 'Published' }, 'visible'),
            source('draft', { title: 'Draft', draft: true }, 'hidden')
        ]);

        expect(entries.map((entry) => entry.slug)).toEqual(['published']);
        expect(searchPosts(entries, 'hidden')).toEqual([]);
    });

    it('requires every query token to match somewhere in the post', () => {
        const entries = index([
            source('complete', { title: 'Astro' }, 'Vue search body'),
            source('partial', { title: 'Astro' }, 'body only')
        ]);

        expect(searchPosts(entries, 'Astro Vue').map((entry) => entry.slug)).toEqual(['complete']);
    });

    it('ranks title matches above description and body matches', () => {
        const entries = index([
            source('body', { title: 'Body', description: 'plain' }, 'Astro appears here', '2026-03-01'),
            source('description', { title: 'Description', description: 'Astro appears here' }, 'plain', '2026-02-01'),
            source('title', { title: 'Astro appears here', description: 'plain' }, 'plain', '2026-01-01')
        ]);

        expect(searchPosts(entries, 'Astro').map((entry) => entry.slug)).toEqual(['title', 'description', 'body']);
    });

    it('returns all posts by publish date for an empty query', () => {
        const entries = index([
            source('old', { title: 'Old' }, 'body', '2026-01-01'),
            source('new', { title: 'New' }, 'body', '2026-03-01'),
            source('middle', { title: 'Middle' }, 'body', '2026-02-01')
        ]);

        expect(searchPosts(entries, '').map((entry) => entry.slug)).toEqual(['new', 'middle', 'old']);
    });

    it('creates a bounded highlighted snippet for body matches', () => {
        const entries = index([
            source(
                'body-snippet',
                { title: 'Body snippet', description: 'plain' },
                `${'前文'.repeat(40)} 关键字 ${'后文'.repeat(40)}`
            )
        ]);
        const [result] = searchPosts(entries, '关键字');
        const snippetText = result.snippet?.parts.map((part) => part.text).join('');

        expect(result.snippet?.field).toBe('body');
        expect(result.snippet?.parts.some((part) => part.highlighted && part.text === '关键字')).toBe(true);
        expect(snippetText?.length).toBeLessThanOrEqual(120);
    });
});
