import type { PostFrontmatter } from './post-model';

export interface FeedPost {
    slug: string;
    data: PostFrontmatter;
}

export interface FeedMetadata {
    siteUrl: URL;
    title: string;
    description: string;
    language: string;
    authorName: string;
}

const EPOCH = new Date(0).toISOString();

function escapeXml(value: string): string {
    return value.replace(/[<>&"']/g, (character) => {
        const entities: Record<string, string> = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&apos;'
        };
        return entities[character];
    });
}

function toIsoDate(value?: string): string {
    if (!value) return EPOCH;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? EPOCH : date.toISOString();
}

function toRfc822Date(value?: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toUTCString();
}

function postUrl(siteUrl: URL, slug: string): string {
    return new URL(`/posts/${slug}`, siteUrl).toString();
}

function feedUpdated(posts: FeedPost[]): string {
    return posts.reduce((latest, post) => {
        const candidate = toIsoDate(post.data.updatedDate ?? post.data.pubDate);
        return candidate > latest ? candidate : latest;
    }, EPOCH);
}

export function createRssFeed(metadata: FeedMetadata, posts: FeedPost[]): string {
    const selfUrl = new URL('/rss.xml', metadata.siteUrl).toString();
    const channelUrl = metadata.siteUrl.toString();
    const items = posts
        .map((post) => {
            const url = postUrl(metadata.siteUrl, post.slug);
            const pubDate = toRfc822Date(post.data.pubDate);
            return [
                '    <item>',
                `      <title>${escapeXml(post.data.title)}</title>`,
                `      <link>${escapeXml(url)}</link>`,
                `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
                `      <description>${escapeXml(post.data.description)}</description>`,
                ...(pubDate ? [`      <pubDate>${pubDate}</pubDate>`] : []),
                '    </item>'
            ].join('\n');
        })
        .join('\n');

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0">',
        '  <channel>',
        `    <title>${escapeXml(metadata.title)}</title>`,
        `    <link>${escapeXml(channelUrl)}</link>`,
        `    <description>${escapeXml(metadata.description)}</description>`,
        `    <language>${escapeXml(metadata.language)}</language>`,
        `    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom" />`,
        items,
        '  </channel>',
        '</rss>',
        ''
    ].join('\n');
}

export function createAtomFeed(metadata: FeedMetadata, posts: FeedPost[]): string {
    const selfUrl = new URL('/atom.xml', metadata.siteUrl).toString();
    const channelUrl = metadata.siteUrl.toString();
    const entries = posts
        .map((post) => {
            const url = postUrl(metadata.siteUrl, post.slug);
            const published = toIsoDate(post.data.pubDate);
            const updated = toIsoDate(post.data.updatedDate ?? post.data.pubDate);
            return [
                '  <entry>',
                `    <title>${escapeXml(post.data.title)}</title>`,
                `    <id>${escapeXml(url)}</id>`,
                `    <link href="${escapeXml(url)}" />`,
                `    <published>${published}</published>`,
                `    <updated>${updated}</updated>`,
                `    <summary>${escapeXml(post.data.description)}</summary>`,
                '  </entry>'
            ].join('\n');
        })
        .join('\n');

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<feed xmlns="http://www.w3.org/2005/Atom">',
        `  <title>${escapeXml(metadata.title)}</title>`,
        `  <id>${escapeXml(channelUrl)}</id>`,
        `  <link href="${escapeXml(channelUrl)}" />`,
        `  <link href="${escapeXml(selfUrl)}" rel="self" type="application/atom+xml" />`,
        `  <updated>${feedUpdated(posts)}</updated>`,
        `  <subtitle>${escapeXml(metadata.description)}</subtitle>`,
        `  <author><name>${escapeXml(metadata.authorName)}</name></author>`,
        entries,
        '</feed>',
        ''
    ].join('\n');
}
