import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { translations } from '../src/data/i18n';
import { normalizeRepost, repostSourceLabel } from '../src/lib/post-model';
import { createBlogPostingJsonLd } from '../src/lib/seo';

const readSource = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const person = { name: 'Wakusei', url: 'https://www.wakusei.top/' };
const posting = (basedOn?: string) =>
    createBlogPostingJsonLd({
        canonicalUrl: 'https://www.wakusei.top/posts/example',
        headline: 'Example',
        description: 'Example',
        publishedTime: '2026-06-15T00:00:00.000Z',
        modifiedTime: '2026-06-15T00:00:00.000Z',
        author: person,
        publisher: person,
        language: 'zh-CN',
        basedOn
    });

describe('repost metadata', () => {
    it('treats a missing field as original and `true` as a repost of unknown origin', () => {
        expect(normalizeRepost(undefined)).toBeUndefined();
        expect(normalizeRepost(true)).toEqual({});
        expect(normalizeRepost({ source: 'JLPT', url: 'https://www.jlpt.jp/' })).toEqual({
            source: 'JLPT',
            url: 'https://www.jlpt.jp/'
        });
    });

    it('names the source, falling back to the URL host', () => {
        expect(repostSourceLabel({ source: 'JLPT 官网', url: 'https://www.jlpt.jp/cn/' })).toBe('JLPT 官网');
        expect(repostSourceLabel({ url: 'https://www.washingtonpost.com/world/' })).toBe('washingtonpost.com');
        expect(repostSourceLabel({})).toBeUndefined();
    });

    it('points structured data at the original article', () => {
        expect(posting('https://www.jlpt.jp/cn/about/levelsummary.html').isBasedOn).toBe(
            'https://www.jlpt.jp/cn/about/levelsummary.html'
        );
        expect(posting()).not.toHaveProperty('isBasedOn');
    });

    it('has copy in every locale', () => {
        for (const dictionary of Object.values(translations)) {
            expect(dictionary['post.repost.badge']).toBeTruthy();
            expect(dictionary['post.repost.notice']).toContain('{source}');
            expect(dictionary['post.repost.noticeUnknown']).toBeTruthy();
            expect(dictionary['post.repost.author']).toContain('{author}');
        }
    });
});

describe('repost wiring', () => {
    it('is part of the content schema and inherited by translations', () => {
        expect(readSource('src/content.config.ts')).toMatch(/repost: z\s*\.union/);
        expect(readSource('src/lib/posts.ts')).toContain(
            'repost: item.entry.data.repost ?? sources.get(item.slug)?.data.repost'
        );
    });

    it('is shown on cards, archives and both article routes', () => {
        expect(readSource('src/components/PostCard.vue')).toContain("t('post.repost.badge')");
        expect(readSource('src/components/ArchivesPage.vue')).toContain("t('post.repost.badge')");
        for (const page of ['src/pages/posts/[...slug].astro', 'src/pages/[locale]/posts/[...slug].astro']) {
            const source = readSource(page);
            expect(source).toContain('<RepostNotice repost={frontmatter.repost} locale={locale} />');
            expect(source).toContain('basedOn: frontmatter.repost?.url');
        }
    });
});
