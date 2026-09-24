import { createAtomFeed, createRssFeed, type FeedMetadata, type FeedPost } from '../src/lib/feed';

const metadata: FeedMetadata = {
    siteUrl: new URL('https://www.wakusei.top'),
    title: 'Wakusei & blog',
    description: 'Notes <and> updates',
    language: 'zh-CN',
    authorName: 'Wakusei'
};

const posts: FeedPost[] = [
    {
        slug: 'new-post',
        data: {
            title: 'New <post>',
            description: 'A & B',
            cover: '/_astro/cover.webp',
            category: '生活',
            tags: ['测试', '生活'],
            pubDate: '2026-07-10',
            updatedDate: '2026-07-11'
        },
        contentHtml:
            '<p>Full &amp; body</p><img src="/_astro/a.webp" srcset="/_astro/a.webp 800w, /_astro/b.webp 1400w" alt="pic"><a href="#part">jump</a><img src="https://cdn.example/a.png" alt="remote">'
    },
    {
        slug: 'undated-post',
        data: { title: 'Undated', description: 'No date' },
        contentHtml: ''
    }
];

describe('feed generation', () => {
    it('creates RSS with canonical links, escaped metadata, and valid publication dates', () => {
        const feed = createRssFeed(metadata, posts);

        expect(feed).toContain('<rss version="2.0"');
        expect(feed).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
        expect(feed).toContain('type="application/rss+xml"');
        expect(feed).toContain('<title>Wakusei &amp; blog</title>');
        expect(feed).toContain('<link>https://www.wakusei.top/posts/new-post</link>');
        expect(feed).toContain('<description>&lt;img src=&quot;https://www.wakusei.top/_astro/cover.webp&quot;');
        expect(feed).toContain('&lt;p&gt;Full &amp;amp; body&lt;/p&gt;');
        expect(feed).toContain('<content:encoded>&lt;img src=&quot;https://www.wakusei.top/_astro/cover.webp&quot;');
        expect(feed).toContain(
            'https://www.wakusei.top/_astro/a.webp 800w, https://www.wakusei.top/_astro/b.webp 1400w'
        );
        expect(feed).toContain('https://www.wakusei.top/posts/new-post#part');
        expect(feed).toContain('https://cdn.example/a.png');
        expect(feed).toContain('<category>生活</category>');
        expect(feed).toContain('<category>测试</category>');
        expect(feed).not.toContain('&quot;/_astro/');
        expect(feed).not.toContain('<p>Full');
        expect(feed).toContain('<pubDate>Fri, 10 Jul 2026 00:00:00 GMT</pubDate>');
        expect(feed).toContain('<lastBuildDate>Sat, 11 Jul 2026 00:00:00 GMT</lastBuildDate>');
        expect(feed).not.toContain('<pubDate>Thu, 01 Jan 1970');
        expect(feed).toContain('&lt;p&gt;No date&lt;/p&gt;');
    });

    it('creates Atom with deterministic feed and entry update timestamps', () => {
        const feed = createAtomFeed(metadata, posts);

        expect(feed).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
        expect(feed).toContain('<link href="https://www.wakusei.top/atom.xml" rel="self" type="application/atom+xml"');
        expect(feed).toContain('<updated>2026-07-11T00:00:00.000Z</updated>');
        expect(feed).toContain('<summary>A &amp; B</summary>');
        expect(feed).toContain(
            '<content type="html">&lt;img src=&quot;https://www.wakusei.top/_astro/cover.webp&quot;'
        );
        expect(feed).toContain('https://www.wakusei.top/posts/new-post#part');
        expect(feed).toContain('<published>1970-01-01T00:00:00.000Z</published>');
    });
});
