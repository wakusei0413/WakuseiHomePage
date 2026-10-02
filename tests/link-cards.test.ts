import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import rehypeLinkCards, { createLinkCard, getStandaloneLink, parseLinkCardMeta } from '../src/lib/link-cards';

const TEST_CACHE_DIR = path.resolve('node_modules/.cache/test-link-cards');

function link(href: string, label = href) {
    return {
        type: 'element',
        tagName: 'a',
        properties: { href },
        children: [{ type: 'text', value: label }]
    };
}

function paragraph(...children: object[]) {
    return { type: 'element', tagName: 'p', properties: {}, children };
}

describe('getStandaloneLink', () => {
    it('matches a paragraph holding a single external link', () => {
        expect(getStandaloneLink(paragraph(link('https://example.com/')) as never)).not.toBeNull();
        expect(
            getStandaloneLink(paragraph({ type: 'text', value: '\n' }, link('https://example.com/')) as never)
        ).not.toBeNull();
    });

    it('ignores inline links, relative links and non-paragraphs', () => {
        expect(getStandaloneLink(paragraph({ type: 'text', value: '见 ' }, link('https://a.com')) as never)).toBeNull();
        expect(getStandaloneLink(paragraph(link('/posts/foo')) as never)).toBeNull();
        expect(getStandaloneLink(link('https://a.com') as never)).toBeNull();
    });
});

describe('parseLinkCardMeta', () => {
    it('reads Open Graph tags, decodes entities and resolves images', () => {
        const html = `<head>
            <title>Fallback</title>
            <meta property="og:title" content="Tom &amp; Jerry" />
            <meta name="description" content="Plain description" />
            <meta property="og:site_name" content="Example" />
            <meta property="og:image" content="/cover.png" />
        </head>`;
        expect(parseLinkCardMeta(html, 'https://example.com/a')).toEqual({
            title: 'Tom & Jerry',
            description: 'Plain description',
            siteName: 'Example',
            image: 'https://example.com/cover.png'
        });
    });

    it('falls back to <title> and drops insecure images', () => {
        const meta = parseLinkCardMeta(
            '<title>Only title</title><meta property="og:image" content="http://x.com/a.png">',
            'https://x.com/'
        );
        expect(meta.title).toBe('Only title');
        expect(meta.image).toBeUndefined();
    });
});

describe('createLinkCard', () => {
    it('renders a host-only card when metadata is missing', () => {
        const card = createLinkCard('https://linux.do/t/topic/1', 'https://linux.do/t/topic/1', undefined);
        expect(card.tagName).toBe('a');
        expect(card.properties).toMatchObject({ href: 'https://linux.do/t/topic/1', target: '_blank' });
        expect(JSON.stringify(card)).toContain('linux.do/t/topic/1');
        expect(JSON.stringify(card)).not.toContain('link-card__image');
    });
});

describe('rehypeLinkCards', () => {
    afterEach(() => {
        fs.rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
    });

    it('replaces standalone links, fetches each URL once and caches the result', async () => {
        const cacheFile = path.join(TEST_CACHE_DIR, `cache-${Date.now()}.json`);
        const fetcher = vi.fn().mockResolvedValue({ title: 'Example', siteName: 'Ex' });
        const transform = rehypeLinkCards({ cacheFile, fetcher, forceRefresh: false });

        const tree = {
            type: 'root',
            children: [paragraph(link('https://example.com/')), paragraph({ type: 'text', value: 'text' })]
        };
        await transform(tree as never);
        await transform({ type: 'root', children: [paragraph(link('https://example.com/'))] } as never);

        expect(fetcher).toHaveBeenCalledTimes(1);
        expect((tree.children[0] as { tagName: string }).tagName).toBe('a');
        expect((tree.children[1] as { tagName: string }).tagName).toBe('p');
        expect(JSON.parse(fs.readFileSync(cacheFile, 'utf8'))).toEqual({
            'https://example.com/': { title: 'Example', siteName: 'Ex' }
        });
    });

    it('does not cache failed fetches', async () => {
        const cacheFile = path.join(TEST_CACHE_DIR, `failed-${Date.now()}.json`);
        const transform = rehypeLinkCards({ cacheFile, fetcher: vi.fn().mockResolvedValue(null) });
        await transform({ type: 'root', children: [paragraph(link('https://blocked.example/'))] } as never);
        expect(fs.existsSync(cacheFile)).toBe(false);
    });
});
