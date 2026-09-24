import type { PostFrontmatter } from './post-model';

export interface FeedPost {
    slug: string;
    data: PostFrontmatter;
    /** Rendered article HTML. Image and link URLs may still be site-relative. */
    contentHtml: string;
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

function escapeHtmlAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function rewriteUrl(value: string, base: URL): string {
    const trimmed = value.trim();
    if (!trimmed) return value;
    try {
        return new URL(trimmed, base).toString();
    } catch {
        return value;
    }
}

function rewriteSrcset(value: string, base: URL): string {
    return value
        .split(',')
        .map((candidate) => {
            const trimmed = candidate.trim();
            if (!trimmed) return candidate;
            const match = /^(\S+)(.*)$/.exec(trimmed);
            if (!match) return candidate;
            return `${rewriteUrl(match[1], base)}${match[2]}`;
        })
        .join(', ');
}

/** Readers cannot resolve `/_astro/...` or in-page anchors against the feed URL. */
export function absolutizeFeedHtml(html: string, base: URL): string {
    return html.replace(
        /(\s(?:href|src|poster|srcset))=(["'])([\s\S]*?)\2/gi,
        (_full, attr: string, quote: string, value: string) => {
            const rewritten =
                attr.trim().toLowerCase() === 'srcset' ? rewriteSrcset(value, base) : rewriteUrl(value, base);
            return `${attr}=${quote}${rewritten}${quote}`;
        }
    );
}

function articleHtml(metadata: FeedMetadata, post: FeedPost): string {
    const pageUrl = new URL(postUrl(metadata.siteUrl, post.slug));
    const cover = post.data.cover
        ? `<img src="${escapeHtmlAttr(post.data.cover)}" alt="${escapeHtmlAttr(post.data.title)}">`
        : '';
    const body = post.contentHtml.trim() ? post.contentHtml : `<p>${escapeHtmlAttr(post.data.description)}</p>`;
    return absolutizeFeedHtml(`${cover}${body}`, pageUrl);
}

function categoryTags(post: FeedPost, indent: string): string[] {
    const names = [post.data.category, ...(post.data.tags ?? [])]
        .map((name) => name?.trim())
        .filter((name): name is string => Boolean(name));
    return [...new Set(names)].map((name) => `${indent}<category>${escapeXml(name)}</category>`);
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
            const html = escapeXml(articleHtml(metadata, post));
            return [
                '    <item>',
                `      <title>${escapeXml(post.data.title)}</title>`,
                `      <link>${escapeXml(url)}</link>`,
                `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
                `      <description>${html}</description>`,
                `      <content:encoded>${html}</content:encoded>`,
                ...categoryTags(post, '      '),
                ...(pubDate ? [`      <pubDate>${pubDate}</pubDate>`] : []),
                '    </item>'
            ].join('\n');
        })
        .join('\n');

    const lastBuildDate = toRfc822Date(feedUpdated(posts));

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
        '  <channel>',
        `    <title>${escapeXml(metadata.title)}</title>`,
        `    <link>${escapeXml(channelUrl)}</link>`,
        `    <description>${escapeXml(metadata.description)}</description>`,
        `    <language>${escapeXml(metadata.language)}</language>`,
        ...(lastBuildDate ? [`    <lastBuildDate>${lastBuildDate}</lastBuildDate>`] : []),
        `    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />`,
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
            const html = escapeXml(articleHtml(metadata, post));
            const categories = categoryTags(post, '    ');
            return [
                '  <entry>',
                `    <title>${escapeXml(post.data.title)}</title>`,
                `    <id>${escapeXml(url)}</id>`,
                `    <link href="${escapeXml(url)}" />`,
                `    <published>${published}</published>`,
                `    <updated>${updated}</updated>`,
                `    <summary>${escapeXml(post.data.description)}</summary>`,
                `    <content type="html">${html}</content>`,
                ...categories,
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
