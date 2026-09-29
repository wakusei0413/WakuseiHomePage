// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { siteConfig } from '../src/data/site';
import { parseSiteConfig } from '../src/data/schema';
import { commentThreadPath, TWIKOO_LOCALE_BASE, twikooLang, twikooLocaleChunk } from '../src/lib/comments';
import type { Locale } from '../src/types/site';

const init = vi.fn();
const getVisitorsCount = vi.fn();
vi.mock('twikoo', () => ({ default: { init, getVisitorsCount } }));

const read = (...segments: string[]) => readFileSync(join(process.cwd(), ...segments), 'utf8');
const postPages = [
    read('src', 'pages', 'posts', '[...slug].astro'),
    read('src', 'pages', '[locale]', 'posts', '[...slug].astro')
];

describe('comment thread keys', () => {
    it('drops the locale so every translation shares one thread and counter', () => {
        expect(commentThreadPath('whataboutblog01')).toBe('/posts/whataboutblog01');
        expect(commentThreadPath('/nested/slug/')).toBe('/posts/nested/slug');
    });
});

describe('Twikoo language wiring', () => {
    it('maps every site locale to a Twikoo language', () => {
        expect(siteConfig.i18n.locales.map((locale) => twikooLang(locale as Locale))).toEqual(['zh-CN', 'en', 'ja']);
    });

    it('ships a chunk from the installed package for every locale Twikoo does not bundle', () => {
        for (const locale of siteConfig.i18n.locales) {
            const chunk = twikooLocaleChunk(locale as Locale);
            if (chunk === null) continue;
            expect(existsSync(join(process.cwd(), 'node_modules', 'twikoo', 'dist', 'locales', `${chunk}.js`))).toBe(
                true
            );
        }
    });

    it('serves the chunks where the components tell Twikoo to look', () => {
        expect(existsSync(join(process.cwd(), 'src', 'pages', TWIKOO_LOCALE_BASE, 'locales', '[name].js.ts'))).toBe(
            true
        );
    });
});

describe('Twikoo loader', () => {
    it('unwraps the UMD default export and loads the bundle only once', async () => {
        const { loadTwikoo } = await import('../src/lib/twikoo-client');
        const first = await loadTwikoo();
        const second = await loadTwikoo();
        expect(first.init).toBe(init);
        expect(second).toBe(first);
    });

    it('finds the API on the namespace when Vite dev interop makes `default` the init function itself', async () => {
        vi.resetModules();
        vi.doMock('twikoo', () => ({ default: init, init, getVisitorsCount }));
        const { loadTwikoo } = await import('../src/lib/twikoo-client');
        expect((await loadTwikoo()).getVisitorsCount).toBe(getVisitorsCount);
        vi.doUnmock('twikoo');
    });

    it('never counts views from a local preview', async () => {
        const { isLocalPreview } = await import('../src/lib/twikoo-client');
        vi.stubGlobal('window', { location: { hostname: 'localhost' } });
        expect(isLocalPreview()).toBe(true);
        vi.stubGlobal('window', { location: { hostname: 'www.wakusei.top' } });
        expect(isLocalPreview()).toBe(false);
        vi.unstubAllGlobals();
    });
});

describe('comments config', () => {
    it('refuses to enable comments without an https backend URL', () => {
        const withComments = (comments: object) => () =>
            parseSiteConfig({ ...siteConfig, comments: { ...siteConfig.comments, ...comments } });
        expect(withComments({ enabled: true, envId: '' })).toThrow();
        expect(withComments({ enabled: true, envId: 'http://comment.example.com' })).toThrow();
        expect(withComments({ enabled: true, envId: 'https://comment.example.com' })).not.toThrow();
        expect(withComments({ enabled: false, envId: '' })).not.toThrow();
    });

    it('allows the configured backend in the CSP once comments are on', () => {
        if (!siteConfig.comments.enabled) return;
        const csp = read('public', '_headers').match(/Content-Security-Policy:(.*)/)?.[1] ?? '';
        const connectSrc = csp.match(/connect-src([^;]*)/)?.[1] ?? '';
        expect(connectSrc.split(/\s+/)).toContain(new URL(siteConfig.comments.envId).origin);
    });
});

describe('post page wiring', () => {
    it.each(postPages.map((source, index) => [index === 0 ? 'default locale' : '[locale]', source]))(
        'gates comments and views on config and frontmatter (%s)',
        (_label, source) => {
            expect(source).toMatch(/commentThreadPath\(/);
            expect(source).toMatch(/siteConfig\.comments\.enabled && frontmatter\.comments !== false/);
            expect(source).toMatch(/siteConfig\.comments\.enabled && siteConfig\.comments\.pageview/);
            expect(source).toMatch(/<PostComments client:visible threadPath=\{threadPath\} \/>/);
            expect(source).toMatch(/<PostViews client:idle threadPath=\{threadPath\} \/>/);
        }
    );
});
