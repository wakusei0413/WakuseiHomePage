import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { getBlogDateMetadata, parsePostUrl } from '../src/lib/sitemap-helper';

function withFixtureDir(files: Record<string, string>, assert: (dir: string) => void) {
    const dir = mkdtempSync(path.join(tmpdir(), 'sitemap-helper-'));
    try {
        for (const [relativePath, content] of Object.entries(files)) {
            const target = path.join(dir, relativePath);
            mkdirSync(path.dirname(target), { recursive: true });
            writeFileSync(target, content, 'utf8');
        }
        assert(dir);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

const post = (extra = '') => `---\ntitle: 'T'\ndescription: 'D'\npubDate: '2026-01-01'\n${extra}---\n\nbody\n`;

describe('sitemap lastmod and i18n alternates', () => {
    it('extracts post publication and update dates from Markdown frontmatter', () => {
        const { postDates, latestSiteDate } = getBlogDateMetadata();
        expect(postDates.size).toBeGreaterThan(0);
        expect(latestSiteDate).toBeDefined();

        // Check a known post with updatedDate
        const androidPost = postDates.get('android-12-quick-hands-on-compromise');
        expect(androidPost).toBeDefined();
        expect(new Date(androidPost!).getTime()).not.toBeNaN();

        // Check that drafts are excluded
        expect(postDates.has('test-draft')).toBe(false);
    });

    it('records which locales each post has real content for', () => {
        withFixtureDir(
            {
                'translated/index.md': post(),
                'translated/index.en.md': post("language: 'en'\nupdatedDate: '2026-02-02'\n"),
                'untranslated/index.md': post(),
                'english-source/index.md': post("language: 'en'\n"),
                'draft-translation/index.md': post(),
                'draft-translation/index.ja.md': post('draft: true\n'),
                'draft-source/index.md': post('draft: true\n'),
                'draft-source/index.en.md': post()
            },
            (dir) => {
                const { postDates, postLocales } = getBlogDateMetadata({ contentDir: dir });

                expect([...(postLocales.get('translated') ?? [])].sort()).toEqual(['en', 'zh-CN']);
                expect([...(postLocales.get('untranslated') ?? [])]).toEqual(['zh-CN']);
                expect([...(postLocales.get('english-source') ?? [])]).toEqual(['en']);
                // A drafted translation drops only its own locale...
                expect([...(postLocales.get('draft-translation') ?? [])]).toEqual(['zh-CN']);
                // ...while a drafted source article unpublishes the post entirely.
                expect(postLocales.has('draft-source')).toBe(false);

                // Each translation carries its own lastmod.
                expect(postDates.get('translated@en')).toBe(new Date('2026-02-02').toISOString());
                expect(postDates.get('translated')).toBe(new Date('2026-01-01').toISOString());
            }
        );
    });

    it('splits article URLs into their locale and slug', () => {
        expect(parsePostUrl('https://www.wakusei.top/posts/hello/')).toEqual({ locale: 'zh-CN', slug: 'hello' });
        expect(parsePostUrl('https://www.wakusei.top/en/posts/hello/')).toEqual({ locale: 'en', slug: 'hello' });
        expect(parsePostUrl('/ja/posts/hello')).toEqual({ locale: 'ja', slug: 'hello' });
        expect(parsePostUrl('https://www.wakusei.top/en/archives/')).toBeNull();
        expect(parsePostUrl('https://www.wakusei.top/')).toBeNull();
    });

    it('emits lastmod and alternate hreflang tags in build sitemap', () => {
        const sitemapPath = path.resolve('dist/sitemap-0.xml');
        if (!existsSync(sitemapPath)) {
            // Test runs before build in some environments, skip if dist does not exist
            return;
        }

        const content = readFileSync(sitemapPath, 'utf8');
        expect(content).toContain('<lastmod>');
        expect(content).toContain('hreflang="zh-CN"');
        expect(content).toContain('hreflang="en"');
        expect(content).toContain('hreflang="ja"');

        // Check specific post URL has lastmod
        expect(content).toMatch(/<loc>[^<]*\/posts\/whataboutblog01\/<\/loc><lastmod>/);
    });
});
