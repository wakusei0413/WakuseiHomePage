import fs from 'node:fs';
import path from 'node:path';

/**
 * 文章链接卡片（构建期 rehype 插件，仅服务端使用）。
 *
 * 正文里「独占一段、且只有一个外链」的段落会被替换成预览卡片：
 * 站点名 / 标题 / 摘要 / 预览图取自目标页的 Open Graph 元数据。
 *
 * 元数据缓存在 `src/data/link-cards.json` 并随仓库提交：
 * - 缓存里没有的链接在构建时抓取一次并写回；抓取失败不写入，下次构建重试。
 * - 抓取不到的站点（如 Cloudflare 拦截）会回落为只有域名与链接的简洁卡片，
 *   也可以手动在 JSON 里补上 title / description / image。
 * - `REFRESH_LINK_CARDS=true` 强制重新抓取全部链接。
 */

export interface LinkCardMeta {
    title?: string;
    description?: string;
    siteName?: string;
    image?: string;
}

export type LinkCardCache = Record<string, LinkCardMeta>;

export type LinkCardFetcher = (url: string) => Promise<LinkCardMeta | null>;

export interface LinkCardOptions {
    cacheFile?: string;
    fetcher?: LinkCardFetcher;
    forceRefresh?: boolean;
}

interface HastText {
    type: 'text';
    value: string;
}

interface HastElement {
    type: 'element';
    tagName: string;
    properties: Record<string, unknown>;
    children: HastNode[];
}

interface HastParent {
    type: string;
    children: HastNode[];
}

type HastNode = HastText | HastElement | (HastParent & Record<string, unknown>) | { type: string };

export const DEFAULT_LINK_CARDS_CACHE_FILE = path.resolve('src/data/link-cards.json');

const USER_AGENT = 'Mozilla/5.0 (compatible; WakuseiLinkCard/1.0; +https://www.wakusei.top)';
const MAX_DESCRIPTION_LENGTH = 160;

function isElement(node: HastNode | undefined): node is HastElement {
    return node?.type === 'element';
}

function isWhitespaceText(node: HastNode): boolean {
    return node.type === 'text' && (node as HastText).value.trim() === '';
}

function textContent(node: HastNode): string {
    if (node.type === 'text') return (node as HastText).value;
    if ('children' in node && Array.isArray(node.children)) return node.children.map(textContent).join('');
    return '';
}

function isExternalUrl(value: unknown): value is string {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
}

/** 段落里只有一个外链（允许首尾空白）时返回该链接，否则 null。 */
export function getStandaloneLink(node: HastNode): HastElement | null {
    if (!isElement(node) || node.tagName !== 'p') return null;
    const meaningful = node.children.filter((child) => !isWhitespaceText(child));
    if (meaningful.length !== 1) return null;
    const [link] = meaningful;
    if (!isElement(link) || link.tagName !== 'a' || !isExternalUrl(link.properties.href)) return null;
    return link;
}

function decodeEntities(value: string): string {
    return value
        .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');
}

function clean(value: string | undefined): string | undefined {
    const text = value ? decodeEntities(value).replace(/\s+/g, ' ').trim() : '';
    return text || undefined;
}

function truncate(value: string | undefined, max: number): string | undefined {
    if (!value || value.length <= max) return value;
    return `${value.slice(0, max - 1).trimEnd()}…`;
}

/** 从 HTML 中解析 Open Graph / 常规 meta 元数据。 */
export function parseLinkCardMeta(html: string, pageUrl: string): LinkCardMeta {
    const meta = new Map<string, string>();
    for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
        const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
        const content = tag.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
        if (!key || !content || meta.has(key)) continue;
        meta.set(key, content[1] ?? content[2] ?? '');
    }

    const title = clean(meta.get('og:title') ?? meta.get('twitter:title') ?? html.match(/<title[^>]*>([^<]*)/i)?.[1]);
    const description = clean(meta.get('og:description') ?? meta.get('twitter:description') ?? meta.get('description'));
    const siteName = clean(meta.get('og:site_name'));
    const rawImage = clean(meta.get('og:image') ?? meta.get('twitter:image'));

    let image: string | undefined;
    if (rawImage) {
        try {
            const resolved = new URL(rawImage, pageUrl);
            if (resolved.protocol === 'https:') image = resolved.href;
        } catch {
            image = undefined;
        }
    }

    return {
        title,
        description: truncate(description, MAX_DESCRIPTION_LENGTH),
        siteName,
        image
    };
}

export async function fetchLinkCardMeta(url: string, timeoutMs = 10000): Promise<LinkCardMeta | null> {
    try {
        const response = await fetch(url, {
            headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
            redirect: 'follow',
            signal: AbortSignal.timeout(timeoutMs)
        });
        if (!response.ok || !(response.headers.get('content-type') ?? '').includes('html')) return null;
        const meta = parseLinkCardMeta(await response.text(), response.url || url);
        return meta.title ? meta : null;
    } catch {
        return null;
    }
}

function readCache(file: string): LinkCardCache {
    try {
        const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
        return parsed && typeof parsed === 'object' ? (parsed as LinkCardCache) : {};
    } catch {
        return {};
    }
}

function writeCache(file: string, cache: LinkCardCache): void {
    try {
        const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, `${JSON.stringify(sorted, null, 4)}\n`, 'utf8');
    } catch {
        // 写缓存失败不影响构建
    }
}

function hostnameOf(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

function el(tagName: string, properties: Record<string, unknown>, children: HastNode[] = []): HastElement {
    return { type: 'element', tagName, properties, children };
}

function text(value: string): HastText {
    return { type: 'text', value };
}

/** 生成卡片的 hast 节点；`meta` 为空时回落为只有域名与链接文字的卡片。 */
export function createLinkCard(url: string, linkText: string, meta: LinkCardMeta | undefined): HastElement {
    const host = hostnameOf(url);
    const label = linkText.trim();
    const title = meta?.title ?? (label && label !== url ? label : url.replace(/^https?:\/\//i, ''));

    const body: HastNode[] = [
        el('span', { className: ['link-card__site'] }, [text(meta?.siteName ? `${meta.siteName} · ${host}` : host)]),
        el('span', { className: ['link-card__title'] }, [text(title)])
    ];
    if (meta?.description) {
        body.push(el('span', { className: ['link-card__desc'] }, [text(meta.description)]));
    }

    const children: HastNode[] = [el('span', { className: ['link-card__body'] }, body)];
    if (meta?.image) {
        children.push(
            el('span', { className: ['link-card__media'] }, [
                el('img', {
                    className: ['link-card__image'],
                    src: meta.image,
                    alt: '',
                    loading: 'lazy',
                    decoding: 'async',
                    referrerPolicy: 'no-referrer'
                })
            ])
        );
    }

    return el(
        'a',
        {
            className: meta?.image ? ['link-card', 'link-card--media'] : ['link-card'],
            href: url,
            target: '_blank',
            rel: ['noopener', 'noreferrer']
        },
        children
    );
}

function collectStandaloneLinks(
    node: HastNode,
    found: Array<{ parent: HastParent; index: number; link: HastElement }>
) {
    if (!('children' in node) || !Array.isArray(node.children)) return;
    const parent = node as HastParent;
    parent.children.forEach((child, index) => {
        const link = getStandaloneLink(child);
        if (link) found.push({ parent, index, link });
        else collectStandaloneLinks(child, found);
    });
}

const sharedCaches = new Map<string, LinkCardCache>();

export default function rehypeLinkCards(options: LinkCardOptions = {}) {
    const {
        cacheFile = DEFAULT_LINK_CARDS_CACHE_FILE,
        fetcher = fetchLinkCardMeta,
        forceRefresh = process.env.REFRESH_LINK_CARDS === 'true'
    } = options;
    const attempted = new Set<string>();

    return async (tree: HastNode) => {
        const found: Array<{ parent: HastParent; index: number; link: HastElement }> = [];
        collectStandaloneLinks(tree, found);
        if (found.length === 0) return;

        let cache = sharedCaches.get(cacheFile);
        if (!cache) {
            cache = readCache(cacheFile);
            sharedCaches.set(cacheFile, cache);
        }

        let dirty = false;
        for (const { parent, index, link } of found) {
            const url = link.properties.href as string;
            // 同一次构建里每个链接最多抓一次（多语种路由会重复渲染同一篇文章）
            const shouldFetch = (forceRefresh || !(url in cache)) && !attempted.has(url);
            if (shouldFetch) {
                attempted.add(url);
                const meta = await fetcher(url);
                if (meta) {
                    cache[url] = meta;
                    dirty = true;
                }
            }
            parent.children[index] = createLinkCard(url, textContent(link), cache[url]);
        }

        if (dirty) writeCache(cacheFile, cache);
    };
}
