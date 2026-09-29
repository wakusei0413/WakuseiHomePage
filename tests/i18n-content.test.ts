import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAtomFeed, createRssFeed, type FeedMetadata, type FeedPost } from '../src/lib/feed';
import { getAlternateLocaleUrls } from '../src/lib/i18n-routing';
import { localizedSiteMeta } from '../src/lib/i18n';
import { createArchiveGroups } from '../src/lib/archive';
import { formatPostDateLabel, localizedMonthName, type PostListItem } from '../src/lib/post-model';
import { createSearchUrlTemplate } from '../src/lib/search-query';
import { siteConfig } from '../src/data/site';
import { translations, type Locale } from '../src/data/i18n';

const LOCALES: Locale[] = ['zh-CN', 'en', 'ja'];

function readSource(relativePath: string): string {
    return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('localized article dates', () => {
    it('formats the publication date in each locale', () => {
        expect(formatPostDateLabel('2026-09-28', 'zh-CN')?.label).toBe('2026年9月28日');
        expect(formatPostDateLabel('2026-09-28', 'en')?.label).toBe('September 28, 2026');
        expect(formatPostDateLabel('2026-09-28', 'ja')?.label).toBe('2026年9月28日');
    });

    it('keeps the machine-readable date locale independent', () => {
        for (const locale of LOCALES) {
            expect(formatPostDateLabel('2026-09-28', locale)?.iso).toBe('2026-09-28');
        }
    });

    it('defaults to the site default locale', () => {
        expect(formatPostDateLabel('2026-09-28')?.label).toBe(formatPostDateLabel('2026-09-28', 'zh-CN')?.label);
    });

    it('returns null for missing or unparsable dates', () => {
        expect(formatPostDateLabel(undefined, 'en')).toBeNull();
        expect(formatPostDateLabel('not-a-date', 'en')).toBeNull();
    });

    it('names months in each locale and clamps out-of-range input', () => {
        expect(localizedMonthName(9, 'en')).toBe('September');
        expect(localizedMonthName(9, 'ja')).toBe('9月');
        expect(localizedMonthName(0, 'en')).toBe('January');
        expect(localizedMonthName(13, 'en')).toBe('December');
    });

    it('labels archive months in the requested locale', () => {
        const post = {
            slug: 'a',
            data: { title: 'A', description: 'a', pubDate: '2026-06-20' },
            dateLabel: '2026-06-20',
            wordCount: 10
        } as PostListItem;

        expect(createArchiveGroups([post], 'en').years[0].months[0].label).toBe('June');
        expect(createArchiveGroups([post], 'ja').years[0].months[0].label).toBe('6月');
    });
});

describe('localized site metadata', () => {
    it('falls back to the top-level config for the default locale', () => {
        expect(localizedSiteMeta(siteConfig.i18n.defaultLocale)).toEqual({
            title: siteConfig.title,
            description: siteConfig.description
        });
    });

    it('never hands a non-default locale the default-language copy', () => {
        for (const locale of ['en', 'ja'] as Locale[]) {
            const meta = localizedSiteMeta(locale);
            expect(meta.title).not.toBe(siteConfig.title);
            expect(meta.description).not.toBe(siteConfig.description);
        }
    });
});

describe('hreflang alternates', () => {
    const site = 'https://www.wakusei.top';

    it('covers every configured locale by default', () => {
        expect(getAlternateLocaleUrls('/archives', site).map((item) => item.locale)).toEqual(['zh-CN', 'en', 'ja']);
    });

    it('is restricted to the locales a page actually has content for', () => {
        const alternates = getAlternateLocaleUrls('/posts/hello', site, ['zh-CN', 'en']);

        expect(alternates).toEqual([
            { locale: 'zh-CN', href: `${site}/posts/hello` },
            { locale: 'en', href: `${site}/en/posts/hello` }
        ]);
    });
});

describe('localized feeds', () => {
    const posts: FeedPost[] = [
        {
            slug: 'hello',
            data: { title: 'Hello', description: 'hi', pubDate: '2026-01-01T00:00:00.000Z' },
            contentHtml: '<p>hi</p>'
        }
    ];

    const metadata = (locale?: Locale): FeedMetadata => ({
        siteUrl: new URL('https://www.wakusei.top'),
        title: 'Site',
        description: 'desc',
        language: locale ?? 'zh-CN',
        authorName: 'Wakusei',
        locale
    });

    it('keeps the default feed on unprefixed URLs', () => {
        const feed = createRssFeed(metadata(), posts);

        expect(feed).toContain('<link>https://www.wakusei.top/posts/hello</link>');
        expect(feed).toContain('href="https://www.wakusei.top/rss.xml"');
        expect(feed).not.toContain('/en/');
    });

    it('prefixes item, channel and self links with the feed locale', () => {
        const feed = createRssFeed(metadata('en'), posts);

        expect(feed).toContain('<link>https://www.wakusei.top/en/posts/hello</link>');
        expect(feed).toContain('<link>https://www.wakusei.top/en/</link>');
        expect(feed).toContain('href="https://www.wakusei.top/en/rss.xml"');
        expect(feed).toContain('<language>en</language>');
    });

    it('localizes atom ids and links too', () => {
        const feed = createAtomFeed(metadata('ja'), posts);

        expect(feed).toContain('<id>https://www.wakusei.top/ja/posts/hello</id>');
        expect(feed).toContain('href="https://www.wakusei.top/ja/atom.xml"');
    });
});

describe('localized search entry points', () => {
    it('targets the locale search route in the SearchAction template', () => {
        expect(createSearchUrlTemplate('https://www.wakusei.top', '/en/search')).toBe(
            'https://www.wakusei.top/en/search?q={search_term_string}'
        );
    });

    it('fetches the search index of the requested locale', () => {
        const source = readSource('src/lib/search-index-client.ts');

        expect(source).toContain("resolveLocalizedPath('/search-index.json', locale)");
        // One cache entry per locale, or switching languages reuses the wrong articles.
        expect(source).toContain('Map<Locale, Promise<SearchIndexEntry[]>>');
    });

    it('passes the active locale from both search surfaces', () => {
        for (const file of ['src/components/SearchPage.vue', 'src/components/SearchModal.vue']) {
            expect(readSource(file)).toContain('loadClientSearchIndex(locale.value)');
        }
    });
});

describe('translation authoring contract', () => {
    it('loads index.md next to an index.<locale>.md sibling per configured locale', () => {
        const source = readSource('src/content.config.ts');

        expect(source).toContain(
            "pattern: ['**/index.md', ...siteConfig.i18n.locales.map((locale) => `**/index.${locale}.md`)]"
        );
        expect(source).toContain('buildPostEntryId(slug, locale');
    });

    it('offers the fallback notice in every locale', () => {
        for (const locale of LOCALES) {
            expect(translations[locale]['post.translation.fallback']).toBeTruthy();
            expect(translations[locale]['post.date']).toBeTruthy();
        }
    });

    it('serves untranslated locales the source language in <html lang>', () => {
        const layout = readSource('src/layouts/BaseLayout.astro');

        expect(layout).toContain('lang={resolvedContentLocale}');
        expect(layout).toContain('data-ui-lang={locale}');
        // The fallback copy must point search engines back at the real article.
        expect(layout).toContain('const isLocaleFallback = resolvedContentLocale !== locale;');
        // The pre-paint boot script must not overwrite the server-rendered content language.
        expect(layout).not.toMatch(/documentElement\.lang\s*=/);
    });

    it('keeps fallback article routes out of the sitemap', () => {
        const config = readSource('astro.config.mjs');

        // One scanner shared with the unit-tested helper, not a second copy of the rules.
        expect(config).toContain("import { getBlogDateMetadata, parsePostUrl } from './src/lib/sitemap-helper';");
        expect(config).toContain('const locales = postLocales.get(post.slug);');
        expect(config).toContain('return locales ? locales.has(post.locale) : true;');
    });
});
