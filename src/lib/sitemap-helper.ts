import fs from 'node:fs';
import path from 'node:path';

// Imported by `astro.config.mjs`, which is loaded before the content layer exists,
// so this scans the Markdown files directly instead of going through `astro:content`.
// It must stay in step with `src/lib/post-locale.ts`, which applies the same rules
// to the collection entries at render time.
const POST_FILE_PATTERN = /^index(?:\.([^.]+))?\.md$/i;

export interface BlogSitemapMetadata {
    /** `lastmod` per `<slug>` (the source article) and per `<slug>@<locale>` translation. */
    postDates: Map<string, string>;
    /** Locales each post has real content for; other locales only serve a fallback copy. */
    postLocales: Map<string, Set<string>>;
    latestSiteDate: string | undefined;
}

export interface BlogSitemapOptions {
    contentDir?: string;
    defaultLocale?: string;
    locales?: readonly string[];
}

function readFrontmatterField(content: string, field: string): string | undefined {
    const match = content.match(new RegExp(`^${field}:\\s*['"]?([^'"\\r\\n]+)['"]?`, 'm'));
    return match?.[1]?.trim();
}

function toIso(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/**
 * Scans `src/content/blog` at config time for sitemap `lastmod` values and for the
 * set of locales each post is genuinely available in.
 *
 * A drafted `index.md` unpublishes the post in every language; a drafted translation
 * only removes that one language, which then falls back to the source article.
 */
export function getBlogDateMetadata(options: BlogSitemapOptions | string = {}): BlogSitemapMetadata {
    const {
        contentDir = path.resolve('src/content/blog'),
        defaultLocale = 'zh-CN',
        locales = ['zh-CN', 'en', 'ja']
    } = typeof options === 'string' ? { contentDir: options } : options;

    const postDates = new Map<string, string>();
    const postLocales = new Map<string, Set<string>>();
    let latestTimestamp = 0;

    if (!fs.existsSync(contentDir)) {
        return { postDates, postLocales, latestSiteDate: undefined };
    }

    const rememberDate = (key: string, date: string | undefined) => {
        if (!date) return;
        postDates.set(key, date);
        const stamp = new Date(date).getTime();
        if (stamp > latestTimestamp) latestTimestamp = stamp;
    };

    for (const entry of fs.readdirSync(contentDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const slug = entry.name;
        const postDir = path.join(contentDir, slug);

        const variants = [];
        for (const file of fs.readdirSync(postDir, { withFileTypes: true })) {
            if (!file.isFile()) continue;
            const match = POST_FILE_PATTERN.exec(file.name);
            if (!match) continue;
            const suffix = match[1];
            if (suffix && !locales.includes(suffix)) continue;

            const content = fs.readFileSync(path.join(postDir, file.name), 'utf8');
            variants.push({
                locale: suffix ?? null,
                draft: /^draft:\s*true\b/m.test(content),
                language: readFrontmatterField(content, 'language'),
                date: toIso(readFrontmatterField(content, 'updatedDate') ?? readFrontmatterField(content, 'pubDate'))
            });
        }

        const source = variants.find((variant) => variant.locale === null);
        if (!source || source.draft) continue;

        const sourceLocale = source.language && locales.includes(source.language) ? source.language : defaultLocale;
        const available = new Set<string>([sourceLocale]);
        rememberDate(slug, source.date);

        for (const variant of variants) {
            if (!variant.locale || variant.draft || variant.locale === sourceLocale) continue;
            available.add(variant.locale);
            rememberDate(`${slug}@${variant.locale}`, variant.date);
        }

        postLocales.set(slug, available);
    }

    return {
        postDates,
        postLocales,
        latestSiteDate: latestTimestamp > 0 ? new Date(latestTimestamp).toISOString() : undefined
    };
}

/** Splits `/en/posts/my-slug/` into its locale and slug; returns null for other routes. */
export function parsePostUrl(
    rawUrl: string,
    { defaultLocale = 'zh-CN', locales = ['zh-CN', 'en', 'ja'] }: BlogSitemapOptions = {}
): { locale: string; slug: string } | null {
    let pathname: string;
    try {
        pathname = new URL(rawUrl).pathname;
    } catch {
        pathname = rawUrl;
    }

    const segments = pathname.split('/').filter(Boolean);
    const locale = locales.includes(segments[0]) ? (segments.shift() as string) : defaultLocale;
    if (segments[0] !== 'posts' || segments.length < 2) return null;

    return { locale, slug: decodeURIComponent(segments.slice(1).join('/')) };
}
