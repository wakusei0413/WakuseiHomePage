import { createArchiveGroups, filterArchiveGroups } from '../src/lib/archive';
import type { PostListItem } from '../src/lib/post-model';

function post(slug: string, pubDate?: string, draft = false, category?: string, tags?: string[]): PostListItem {
    return {
        slug,
        data: {
            title: slug,
            description: `${slug} description`,
            pubDate,
            draft,
            category,
            tags
        },
        dateLabel: pubDate ?? null,
        wordCount: 300
    };
}

describe('archive groups', () => {
    it('groups posts by year and month in descending order', () => {
        const archive = createArchiveGroups([
            post('old', '2025-12-01'),
            post('newer', '2026-01-02'),
            post('newest', '2026-06-20'),
            post('middle', '2026-06-15')
        ]);

        expect(archive.years.map((year) => year.year)).toEqual([2026, 2025]);
        expect(archive.years[0].months.map((month) => month.month)).toEqual([6, 1]);
        expect(archive.years[0].months[0].posts.map((item) => item.slug)).toEqual(['newest', 'middle']);
        expect(archive.totalPosts).toBe(4);
        expect(archive.totalMonths).toBe(3);
    });

    it('keeps same-day ordering stable with a slug tie-breaker', () => {
        const archive = createArchiveGroups([post('beta', '2026-06-20'), post('alpha', '2026-06-20')]);

        expect(archive.years[0].months[0].posts.map((item) => item.slug)).toEqual(['alpha', 'beta']);
    });

    it('does not include draft posts', () => {
        const archive = createArchiveGroups([post('published', '2026-06-20'), post('draft', '2026-06-21', true)]);

        expect(archive.totalPosts).toBe(1);
        expect(archive.years[0].months[0].posts.map((item) => item.slug)).toEqual(['published']);
    });

    it('places missing or invalid dates into the undated group', () => {
        const archive = createArchiveGroups([
            post('published', '2026-06-20'),
            post('missing-date'),
            post('invalid-date', 'not-a-date')
        ]);

        expect(archive.undated.map((item) => item.slug)).toEqual(['missing-date', 'invalid-date']);
        expect(archive.totalPosts).toBe(3);
    });

    it('filters by category and removes empty months and years', () => {
        const archive = createArchiveGroups([
            post('life-new', '2026-06-20', false, '生活', ['Astro']),
            post('study', '2026-04-06', false, '学习', ['化学']),
            post('life-old', '2025-12-01', false, '生活', ['随笔'])
        ]);
        const filtered = filterArchiveGroups(archive, { category: '学习' });

        expect(filtered.years.map((year) => year.year)).toEqual([2026]);
        expect(filtered.years[0].months.map((month) => month.month)).toEqual([4]);
        expect(filtered.years[0].months[0].posts.map((item) => item.slug)).toEqual(['study']);
        expect(filtered.totalPosts).toBe(1);
        expect(filtered.totalMonths).toBe(1);
    });

    it('filters by tag while preserving the existing post order', () => {
        const archive = createArchiveGroups([
            post('newest', '2026-06-20', false, '生活', ['Astro']),
            post('middle', '2026-06-15', false, '学习', ['Astro', '化学']),
            post('oldest', '2026-04-06', false, '生活', ['随笔'])
        ]);
        const filtered = filterArchiveGroups(archive, { tag: 'Astro' });

        expect(filtered.years[0].months[0].posts.map((item) => item.slug)).toEqual(['newest', 'middle']);
        expect(filtered.totalPosts).toBe(2);
        expect(filtered.totalMonths).toBe(1);
    });

    it('combines category and tag filters with AND semantics', () => {
        const archive = createArchiveGroups([
            post('life-astro', '2026-06-20', false, '生活', ['Astro']),
            post('study-astro', '2026-06-15', false, '学习', ['Astro']),
            post('life-note', '2026-04-06', false, '生活', ['随笔'])
        ]);
        const filtered = filterArchiveGroups(archive, { category: '生活', tag: 'Astro' });

        expect(filtered.years[0].months[0].posts.map((item) => item.slug)).toEqual(['life-astro']);
        expect(filtered.totalPosts).toBe(1);
    });

    it('returns an empty archive when no posts match', () => {
        const archive = createArchiveGroups([post('only', '2026-06-20', false, '生活', ['Astro'])]);
        const filtered = filterArchiveGroups(archive, { tag: '不存在' });

        expect(filtered).toEqual({ years: [], undated: [], totalPosts: 0, totalMonths: 0 });
    });

    it('filters undated posts and includes them in the recalculated total', () => {
        const archive = createArchiveGroups([
            post('dated', '2026-06-20', false, '生活', ['Astro']),
            post('undated-match', undefined, false, '生活', ['Astro']),
            post('undated-other', undefined, false, '学习', ['化学'])
        ]);
        const filtered = filterArchiveGroups(archive, { category: '生活', tag: 'Astro' });

        expect(filtered.undated.map((item) => item.slug)).toEqual(['undated-match']);
        expect(filtered.totalPosts).toBe(2);
        expect(filtered.totalMonths).toBe(1);
    });
});
