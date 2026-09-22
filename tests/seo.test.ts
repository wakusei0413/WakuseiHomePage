import {
    createArticleSeoMetadata,
    createBlogPostingJsonLd,
    createBreadcrumbListJsonLd,
    createWebSiteJsonLd,
    serializeJsonLd
} from '../src/lib/seo';

const defaultAuthor = {
    name: 'Wakusei',
    url: 'https://www.wakusei.top/'
};

describe('article structured SEO', () => {
    it('uses the site author and publication time when optional overrides are absent', () => {
        const metadata = createArticleSeoMetadata({
            publishedTime: '2026-06-15T00:00:00.000Z',
            fallbackAuthor: defaultAuthor,
            language: 'zh-CN'
        });

        expect(metadata.author).toEqual(defaultAuthor);
        expect(metadata.author).not.toBe(defaultAuthor);
        expect(metadata.modifiedTime).toBe(metadata.publishedTime);
        expect(metadata.image).toBeUndefined();
    });

    it('keeps an article author override and explicit update time', () => {
        const author = {
            name: 'Guest Author',
            url: 'https://example.com/author'
        };
        const metadata = createArticleSeoMetadata({
            publishedTime: '2026-06-15T00:00:00.000Z',
            updatedTime: '2026-06-21T00:00:00.000Z',
            author,
            fallbackAuthor: defaultAuthor,
            language: 'en'
        });

        expect(metadata.author).toEqual(author);
        expect(metadata.modifiedTime).toBe('2026-06-21T00:00:00.000Z');
    });

    it('creates a complete BlogPosting with article and publisher metadata', () => {
        const jsonLd = createBlogPostingJsonLd({
            canonicalUrl: 'https://www.wakusei.top/posts/example',
            headline: 'Example post',
            description: 'A structured article.',
            publishedTime: '2026-06-15T00:00:00.000Z',
            modifiedTime: '2026-06-21T00:00:00.000Z',
            author: {
                name: 'Guest Author',
                url: 'https://example.com/author'
            },
            publisher: {
                ...defaultAuthor,
                image: 'https://www.wakusei.top/res/img/logo.png'
            },
            image: 'https://www.wakusei.top/_astro/cover.webp',
            language: 'en',
            section: 'Notes',
            tags: [' Astro ', 'SEO']
        });

        expect(jsonLd).toEqual({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': 'https://www.wakusei.top/posts/example'
            },
            headline: 'Example post',
            description: 'A structured article.',
            url: 'https://www.wakusei.top/posts/example',
            datePublished: '2026-06-15T00:00:00.000Z',
            dateModified: '2026-06-21T00:00:00.000Z',
            author: {
                '@type': 'Person',
                name: 'Guest Author',
                url: 'https://example.com/author'
            },
            publisher: {
                '@type': 'Person',
                name: 'Wakusei',
                url: 'https://www.wakusei.top/',
                image: 'https://www.wakusei.top/res/img/logo.png'
            },
            inLanguage: 'en',
            image: 'https://www.wakusei.top/_astro/cover.webp',
            articleSection: 'Notes',
            keywords: ['Astro', 'SEO']
        });
    });

    it('omits blank optional article fields instead of using the publisher image', () => {
        const jsonLd = createBlogPostingJsonLd({
            canonicalUrl: 'https://www.wakusei.top/posts/without-cover',
            headline: 'Without cover',
            description: 'No article image.',
            publishedTime: '2026-06-15T00:00:00.000Z',
            modifiedTime: '2026-06-15T00:00:00.000Z',
            author: defaultAuthor,
            publisher: defaultAuthor,
            image: '   ',
            language: 'zh-CN',
            section: ' ',
            tags: [' ', 'SEO']
        });

        expect(jsonLd.image).toBeUndefined();
        expect(jsonLd.articleSection).toBeUndefined();
        expect(jsonLd.keywords).toEqual(['SEO']);
        expect(jsonLd.publisher.image).toBeUndefined();
    });

    it('serializes JSON-LD without allowing script-tag breakout', () => {
        const value = {
            headline: '</script><script>alert(1)</script>',
            separators: '\u2028\u2029'
        };
        const serialized = serializeJsonLd(value);

        expect(serialized).not.toContain('</script>');
        expect(serialized).toContain('\\u003c/script>');
        expect(serialized).toContain('\\u2028\\u2029');
        expect(JSON.parse(serialized)).toEqual(value);
    });
});

describe('site-level structured data', () => {
    it('describes the site and its search endpoint', () => {
        const jsonLd = createWebSiteJsonLd({
            name: 'Wakusei HomePage',
            url: 'https://www.wakusei.top/',
            description: 'Wakusei - 个人主页',
            language: 'zh-CN',
            publisher: { ...defaultAuthor, image: 'https://www.wakusei.top/res/img/logo.png' },
            searchUrlTemplate: 'https://www.wakusei.top/search?q={search_term_string}'
        });

        expect(jsonLd['@type']).toBe('WebSite');
        expect(jsonLd.inLanguage).toBe('zh-CN');
        expect(jsonLd.publisher).toEqual({
            '@type': 'Person',
            name: 'Wakusei',
            url: 'https://www.wakusei.top/',
            image: 'https://www.wakusei.top/res/img/logo.png'
        });
        expect(jsonLd.potentialAction.target.urlTemplate).toContain('{search_term_string}');
        expect(jsonLd.potentialAction['query-input']).toBe('required name=search_term_string');
    });
});

describe('breadcrumb structured data', () => {
    const home = { name: '首页', url: 'https://www.wakusei.top/' };
    const article = { name: '一篇文章', url: 'https://www.wakusei.top/posts/example/' };

    it('numbers the trail from the home page down to the article', () => {
        const jsonLd = createBreadcrumbListJsonLd([
            home,
            { name: '生活', url: 'https://www.wakusei.top/categories/%E7%94%9F%E6%B4%BB' },
            article
        ]);

        expect(jsonLd?.['@type']).toBe('BreadcrumbList');
        expect(jsonLd?.itemListElement.map((item) => item.position)).toEqual([1, 2, 3]);
        expect(jsonLd?.itemListElement[1].name).toBe('生活');
        expect(jsonLd?.itemListElement[2].item).toBe(article.url);
    });

    it('keeps the two-level trail for uncategorised articles', () => {
        const jsonLd = createBreadcrumbListJsonLd([home, article]);

        expect(jsonLd?.itemListElement).toHaveLength(2);
        expect(jsonLd?.itemListElement[1].name).toBe('一篇文章');
    });

    it('drops blank entries and refuses to emit a single-item trail', () => {
        expect(createBreadcrumbListJsonLd([home, { name: ' ', url: ' ' }])).toBeNull();
        expect(createBreadcrumbListJsonLd([{ name: '', url: '' }, home])).toBeNull();
    });
});
