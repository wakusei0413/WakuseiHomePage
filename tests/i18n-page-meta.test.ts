import { createApp, defineComponent, h } from 'vue';
import { createPinia } from 'pinia';
import { translate } from '../src/lib/i18n';
import { usePageMeta } from '../src/composables/usePageMeta';
import { siteConfig } from '../src/data/site';

const META_TAGS = [
    ['name', 'description'],
    ['property', 'og:title'],
    ['property', 'og:description'],
    ['name', 'twitter:title'],
    ['name', 'twitter:description']
] as const;

function seedDocument() {
    document.head.innerHTML = '';
    document.body.innerHTML = '<div id="pageTransitionSurface" data-page-title=""></div>';

    for (const [attribute, key] of META_TAGS) {
        const meta = document.createElement('meta');
        meta.setAttribute(attribute, key);
        meta.setAttribute('content', 'seed');
        document.head.appendChild(meta);
    }
}

function metaContent(attribute: string, key: string): string | null {
    return document.querySelector(`meta[${attribute}="${key}"]`)?.getAttribute('content') ?? null;
}

function mountPageMetaHarness() {
    const pinia = createPinia();
    const host = document.createElement('div');
    document.body.appendChild(host);

    const Harness = defineComponent({
        setup() {
            usePageMeta({
                titleKey: 'pages.archives.title',
                descriptionKey: 'pages.archives.description',
                params: () => ({ categories: 3, tags: 5, posts: 9 }),
                mode: 'blog'
            });
            return () => h('div');
        }
    });

    const app = createApp(Harness);
    app.use(pinia);
    app.mount(host);

    return app;
}

describe('translate', () => {
    it('interpolates named placeholders', () => {
        expect(translate('en', 'post.reading', { minutes: 7 })).toBe('7 min read');
        expect(translate('zh-CN', 'post.reading', { minutes: 7 })).toBe('7 分钟阅读');
        expect(translate('ja', 'post.reading', { minutes: 7 })).toBe('約7分');
    });

    it('leaves placeholders intact when the caller omits a value', () => {
        expect(translate('zh-CN', 'search.summary.total')).toBe('共 {count} 篇文章');
        expect(translate('zh-CN', 'search.summary.total', { other: 1 })).toBe('共 {count} 篇文章');
    });

    it('falls back to the key itself for unknown entries', () => {
        expect(translate('zh-CN', 'definitely.not.a.key')).toBe('definitely.not.a.key');
    });

    it('resolves page-level metadata keys for every locale', () => {
        for (const locale of ['zh-CN', 'en', 'ja'] as const) {
            expect(translate(locale, 'pages.archives.title')).not.toContain('pages.');
            expect(translate(locale, 'pages.archives.description', { categories: 1, tags: 2, posts: 3 })).not.toContain(
                '{'
            );
        }
    });
});

describe('usePageMeta', () => {
    beforeEach(() => {
        seedDocument();
        localStorage.clear();
        document.title = '';
    });

    it('writes the localized title and metadata on mount', () => {
        const app = mountPageMetaHarness();

        expect(document.title).toBe(`${translate('zh-CN', 'pages.archives.title')} | ${siteConfig.title}`);
        expect(metaContent('name', 'description')).toBe(
            translate('zh-CN', 'pages.archives.description', { categories: 3, tags: 5, posts: 9 })
        );
        expect(metaContent('property', 'og:title')).toBe(translate('zh-CN', 'pages.archives.title'));
        expect(metaContent('name', 'twitter:title')).toBe(translate('zh-CN', 'pages.archives.title'));
        expect(document.getElementById('pageTransitionSurface')?.dataset.pageTitle).toBe(
            translate('zh-CN', 'pages.archives.title')
        );

        app.unmount();
    });

    it('rewrites the metadata when the persisted locale is adopted', async () => {
        localStorage.setItem('lang', 'en');
        const app = mountPageMetaHarness();
        await Promise.resolve();

        expect(document.title).toContain(translate('en', 'pages.archives.title'));
        expect(metaContent('name', 'description')).toBe(
            translate('en', 'pages.archives.description', { categories: 3, tags: 5, posts: 9 })
        );
        expect(document.getElementById('pageTransitionSurface')?.dataset.pageTitle).toBe(
            translate('en', 'pages.archives.title')
        );

        app.unmount();
    });
});
