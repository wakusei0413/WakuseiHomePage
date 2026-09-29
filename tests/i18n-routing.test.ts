import {
    extractLocaleFromPath,
    stripLocalePrefix,
    resolveLocalizedPath,
    switchLocalePath,
    getAlternateLocaleUrls,
    NON_DEFAULT_LOCALES
} from '../src/lib/i18n-routing';
import { homepagePagePath, homepagePageHref } from '../src/lib/home-pagination';

describe('i18n-routing', () => {
    it('defines non-default locales properly', () => {
        expect(NON_DEFAULT_LOCALES).toEqual(['en', 'ja']);
    });

    describe('extractLocaleFromPath', () => {
        it('identifies non-default locales from pathname', () => {
            expect(extractLocaleFromPath('/en')).toBe('en');
            expect(extractLocaleFromPath('/en/')).toBe('en');
            expect(extractLocaleFromPath('/en/archives')).toBe('en');
            expect(extractLocaleFromPath('/ja/posts/test')).toBe('ja');
        });

        it('defaults to zh-CN for standard and root paths', () => {
            expect(extractLocaleFromPath('/')).toBe('zh-CN');
            expect(extractLocaleFromPath('/archives')).toBe('zh-CN');
            expect(extractLocaleFromPath('/posts/test')).toBe('zh-CN');
            expect(extractLocaleFromPath('/page/2')).toBe('zh-CN');
        });
    });

    describe('stripLocalePrefix', () => {
        it('removes non-default locale prefix while preserving the rest of the path', () => {
            expect(stripLocalePrefix('/en')).toBe('/');
            expect(stripLocalePrefix('/en/')).toBe('/');
            expect(stripLocalePrefix('/en/archives')).toBe('/archives');
            expect(stripLocalePrefix('/ja/posts/test-post')).toBe('/posts/test-post');
            expect(stripLocalePrefix('/ja/categories/dev')).toBe('/categories/dev');
        });

        it('returns path unchanged if no locale prefix is present', () => {
            expect(stripLocalePrefix('/')).toBe('/');
            expect(stripLocalePrefix('/archives')).toBe('/archives');
            expect(stripLocalePrefix('/posts/test')).toBe('/posts/test');
        });
    });

    describe('resolveLocalizedPath', () => {
        it('keeps default locale paths clean without prefix', () => {
            expect(resolveLocalizedPath('/archives', 'zh-CN')).toBe('/archives');
            expect(resolveLocalizedPath('/', 'zh-CN')).toBe('/');
            expect(resolveLocalizedPath('/#posts', 'zh-CN')).toBe('/#posts');
            expect(resolveLocalizedPath('/posts/test', 'zh-CN')).toBe('/posts/test');
        });

        it('adds appropriate prefix for non-default locales', () => {
            expect(resolveLocalizedPath('/archives', 'en')).toBe('/en/archives');
            expect(resolveLocalizedPath('/archives', 'ja')).toBe('/ja/archives');
            expect(resolveLocalizedPath('/', 'en')).toBe('/en/');
            expect(resolveLocalizedPath('/#posts', 'en')).toBe('/en/#posts');
            expect(resolveLocalizedPath('/posts/whataboutblog01', 'ja')).toBe('/ja/posts/whataboutblog01');
            expect(resolveLocalizedPath('/search?q=hello', 'en')).toBe('/en/search?q=hello');
        });

        it('handles paths that already have a locale prefix gracefully', () => {
            expect(resolveLocalizedPath('/en/archives', 'en')).toBe('/en/archives');
            expect(resolveLocalizedPath('/en/archives', 'ja')).toBe('/ja/archives');
            expect(resolveLocalizedPath('/en/archives', 'zh-CN')).toBe('/archives');
        });

        it('leaves external links untouched', () => {
            expect(resolveLocalizedPath('https://example.com', 'en')).toBe('https://example.com');
            expect(resolveLocalizedPath('mailto:test@example.com', 'ja')).toBe('mailto:test@example.com');
        });
    });

    describe('switchLocalePath', () => {
        it('switches between locales seamlessly', () => {
            expect(switchLocalePath('/archives', 'en')).toBe('/en/archives');
            expect(switchLocalePath('/en/archives', 'ja')).toBe('/ja/archives');
            expect(switchLocalePath('/ja/archives', 'zh-CN')).toBe('/archives');
            expect(switchLocalePath('/en/posts/demo?filter=1#heading', 'ja')).toBe('/ja/posts/demo?filter=1#heading');
        });
    });

    describe('getAlternateLocaleUrls', () => {
        it('generates alternate URLs for all supported locales', () => {
            const alternates = getAlternateLocaleUrls('/archives', 'https://www.wakusei.top');
            expect(alternates).toHaveLength(3);
            expect(alternates).toEqual([
                { locale: 'zh-CN', href: 'https://www.wakusei.top/archives' },
                { locale: 'en', href: 'https://www.wakusei.top/en/archives' },
                { locale: 'ja', href: 'https://www.wakusei.top/ja/archives' }
            ]);
        });
    });

    describe('homepagePagePath with locale', () => {
        it('generates localized pagination paths', () => {
            expect(homepagePagePath(1)).toBe('/');
            expect(homepagePagePath(2)).toBe('/page/2');
            expect(homepagePagePath(1, 'en')).toBe('/en/');
            expect(homepagePagePath(2, 'en')).toBe('/en/page/2');
            expect(homepagePagePath(3, 'ja')).toBe('/ja/page/3');
            expect(homepagePageHref(2, 'en')).toBe('/en/page/2#posts');
        });
    });
});
