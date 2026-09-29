import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { isLiteMode, LITE_MODE_ATTRIBUTE, LITE_MODE_BOOT_SCRIPT } from '../src/lib/performance-mode';
import { buildCoverSrcset } from '../src/lib/post-model';

interface Environment {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
    hardwareConcurrency?: number;
    mediaQueries?: string[];
}

const readSource = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

/** Runs the boot script against a faked navigator/matchMedia, as the inline <script> would. */
function boot({ connection, deviceMemory, hardwareConcurrency = 8, mediaQueries = [] }: Environment = {}) {
    const navigatorStub = { connection, deviceMemory, hardwareConcurrency };
    const matchMedia = (query: string) => ({ matches: mediaQueries.some((match) => query.includes(match)) });
    new Function('window', 'document', LITE_MODE_BOOT_SCRIPT)({ navigator: navigatorStub, matchMedia }, document);
    return document.documentElement.getAttribute(LITE_MODE_ATTRIBUTE);
}

afterEach(() => {
    document.documentElement.removeAttribute(LITE_MODE_ATTRIBUTE);
});

describe('lite mode detection', () => {
    it('leaves capable devices on a fast connection alone', () => {
        expect(boot({ connection: { effectiveType: '4g' }, deviceMemory: 8, hardwareConcurrency: 8 })).toBeNull();
        expect(isLiteMode()).toBe(false);
    });

    it('honours Save-Data', () => {
        expect(boot({ connection: { saveData: true, effectiveType: '4g' } })).toBe('lite');
        expect(isLiteMode()).toBe(true);
    });

    it.each(['slow-2g', '2g', '3g'])('treats a %s connection as constrained', (effectiveType) => {
        expect(boot({ connection: { effectiveType } })).toBe('lite');
    });

    it('follows prefers-reduced-data', () => {
        expect(boot({ mediaQueries: ['prefers-reduced-data'] })).toBe('lite');
    });

    it('keeps the full design on a good network, whatever the device', () => {
        // Only a poor network downgrades the site; device class and motion
        // preferences do not (reduced motion has its own CSS/JS handling).
        expect(boot({ deviceMemory: 2, hardwareConcurrency: 2 })).toBeNull();
        expect(boot({ mediaQueries: ['prefers-reduced-motion'] })).toBeNull();
    });

    it('re-applies the attribute after a client-side navigation swap', () => {
        boot({ connection: { saveData: true } });
        // ClientRouter replaces the <html> attributes with the incoming page's.
        document.documentElement.removeAttribute(LITE_MODE_ATTRIBUTE);
        document.dispatchEvent(new Event('astro:after-swap'));
        expect(isLiteMode()).toBe(true);
    });
});

describe('lite mode wiring', () => {
    it('runs before first paint, right after the unsupported-browser check', () => {
        const layout = readSource('src/layouts/BaseLayout.astro');

        expect(layout).toContain('<script is:inline set:html={LITE_MODE_BOOT_SCRIPT} />');
        expect(layout.indexOf('set:html={LITE_MODE_BOOT_SCRIPT}')).toBeGreaterThan(layout.indexOf('/unsupported.html'));
        expect(layout).toContain("import '../styles/performance.css';");
    });

    it('drops the expensive effects in lite mode', () => {
        const css = readSource('src/styles/performance.css');

        expect(css).toContain('backdrop-filter: none !important;');
        expect(css).toMatch(/html\[data-perf='lite'\] \.noise-overlay \{\s*display: none;/);
        expect(css).toContain("html[data-perf='lite'] .hero-marquee__track");
    });

    it('is honoured by the wallpaper, hero, marquee and inertial scroll', () => {
        expect(readSource('src/components/SiteShell.vue')).toContain('{ lite: liteMode }');
        expect(readSource('src/components/HeroWidgetMarquee.vue')).toContain('mediaQuery.matches || liteMode');
        expect(readSource('src/scripts/inertial-scroll.ts')).toContain('if (isLiteMode()) return;');
    });
});

describe('payload on slow networks', () => {
    it('never depends on Google Fonts, which is unreachable from mainland China', () => {
        const layout = readSource('src/layouts/BaseLayout.astro');
        const headers = readSource('public/_headers');

        expect(layout).not.toMatch(/fonts\.(googleapis|gstatic)/);
        expect(headers).not.toMatch(/fonts\.(googleapis|gstatic)/);
        // The original typefaces, self-hosted instead of fetched from Google.
        expect(layout).toContain("import '@fontsource-variable/inter';");
        expect(layout).toContain("import '@fontsource/noto-sans-sc/400.css';");
        expect(layout).toContain("import '@fontsource/noto-serif-sc/400.css';");
    });

    it('keeps the original font stacks and only drops web fonts in lite mode', () => {
        const base = readSource('src/styles/base.css');
        const lite = readSource('src/styles/performance.css');

        expect(base).toContain("--font-ui: 'Inter Variable', 'Inter', 'Noto Sans SC'");
        expect(base).toContain("--font-serif: 'Times New Roman', 'Noto Serif SC'");
        const liteRules = lite.slice(lite.indexOf("html[data-perf='lite'] {"));
        const liteFonts = liteRules.slice(0, liteRules.indexOf('}'));
        expect(liteFonts).toContain('--font-ui:');
        expect(liteFonts).not.toMatch(/Inter|'Noto Sans SC'|'Noto Serif SC'/);
    });

    it('keeps zod out of the modules islands import', () => {
        expect(readSource('src/data/site.ts')).not.toContain('./schema');
        // ...while still validating the config on the server.
        expect(readSource('src/data/validate-site-config.ts')).toContain('parseSiteConfig(editableSiteConfig)');
        expect(readSource('src/layouts/BaseLayout.astro')).toContain("import '../data/validate-site-config';");
    });

    it('caches content-hashed build output forever', () => {
        expect(readSource('public/_headers')).toMatch(
            /\/_astro\/\*\s*\n\s*Cache-Control: public, max-age=31536000, immutable/
        );
    });

    it('offers smaller hero cover renditions to narrow screens', () => {
        expect(
            buildCoverSrcset([
                { src: '/a-640.webp', width: 640 },
                undefined,
                { src: '/a-1400.webp', width: 1400 },
                { src: '/a-960.webp', width: 960 }
            ])
        ).toBe('/a-640.webp 640w, /a-960.webp 960w, /a-1400.webp 1400w');
    });

    it('lists each width once when the source is smaller than a requested rendition', () => {
        expect(
            buildCoverSrcset([
                { src: '/small.webp', width: 600 },
                { src: '/small-again.webp', width: 600 }
            ])
        ).toBe('/small.webp 600w');
    });
});
