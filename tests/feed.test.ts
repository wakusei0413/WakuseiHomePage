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
            pubDate: '2026-07-10',
            updatedDate: '2026-07-11'
        }
    },
    {
        slug: 'undated-post',
        data: { title: 'Undated', description: 'No date' }
    }
];

describe('feed generation', () => {
    it('creates RSS with canonical links, escaped metadata, and valid publication dates', () => {
        const feed = createRssFeed(metadata, posts);

        expect(feed).toContain('<rss version="2.0">');
        expect(feed).toContain('type="application/rss+xml"');
        expect(feed).toContain('<title>Wakusei &amp; blog</title>');
        expect(feed).toContain('<link>https://www.wakusei.top/posts/new-post</link>');
        expect(feed).toContain('<description>A &amp; B</description>');
        expect(feed).toContain('<pubDate>Fri, 10 Jul 2026 00:00:00 GMT</pubDate>');
        expect(feed).not.toContain('<pubDate>Thu, 01 Jan 1970');
    });

    it('creates Atom with deterministic feed and entry update timestamps', () => {
        const feed = createAtomFeed(metadata, posts);

        expect(feed).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
        expect(feed).toContain('<link href="https://www.wakusei.top/atom.xml" rel="self" type="application/atom+xml"');
        expect(feed).toContain('<updated>2026-07-11T00:00:00.000Z</updated>');
        expect(feed).toContain('<summary>A &amp; B</summary>');
        expect(feed).toContain('<published>1970-01-01T00:00:00.000Z</published>');
    });
});
