import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const baseLayout = readFileSync(join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
const homepageApp = readFileSync(join(process.cwd(), 'src', 'components', 'HomepageApp.vue'), 'utf8');
const layoutCss = readFileSync(join(process.cwd(), 'src', 'styles', 'layout.css'), 'utf8');

describe('loading overlay navigation behavior', () => {
    it('renders the loading overlay from the global layout', () => {
        expect(baseLayout).toMatch(/<div id="globalLoadingOverlay" class="loading-overlay">/);
        expect(baseLayout).toMatch(/<div id="globalLoadingText" class="loading-text">/);
        expect(baseLayout).toMatch(/<div id="globalLoadingBar" class="loading-bar"/);
        expect(baseLayout).toMatch(/<div id="globalLoadingPercent" class="loading-percent">0%<\/div>/);
    });

    it('skips the loader only for the next internal Astro swap', () => {
        expect(baseLayout).toMatch(
            /var skipEntryLoader = sessionStorage\.getItem\('__wakusei_skip_entry_loader'\) === 'true';/
        );
        expect(baseLayout).toMatch(/if \(skipEntryLoader\) \{/);
        expect(baseLayout).toMatch(/overlay\.classList\.add\('hidden'\);/);
        expect(baseLayout).toMatch(/sessionStorage\.removeItem\('__wakusei_skip_entry_loader'\);/);
    });

    it('pre-hides incoming loaders during internal Astro swaps', () => {
        expect(baseLayout).toMatch(/document\.addEventListener\('astro:before-swap', \(event\) => \{/);
        expect(baseLayout).toMatch(/event\.newDocument\.querySelector\('#globalLoadingOverlay'\)/);
        expect(baseLayout).toMatch(/incomingOverlay\.classList\.add\('hidden'\)/);
        expect(baseLayout).toMatch(/sessionStorage\.setItem\('__wakusei_skip_entry_loader', 'true'\);/);
    });

    it('keeps the homepage component free of loading overlay ownership', () => {
        expect(homepageApp).not.toMatch(/LoadingOverlay/);
        expect(homepageApp).not.toMatch(/loadingPercent/);
        expect(homepageApp).not.toMatch(/loadingText/);
    });

    it('waits for homepage readiness before hiding direct homepage entry loads', () => {
        expect(baseLayout).toMatch(/window\.addEventListener\('wakusei:homepage-ready'/);
        expect(baseLayout).toMatch(/document\.querySelector\('\.page-scroller'\)/);
        expect(homepageApp).toMatch(/window\.dispatchEvent\(new CustomEvent\('wakusei:homepage-ready'\)\)/);
    });

    it('does not keep the legacy homepage blur reveal after the global loader is skipped', () => {
        expect(layoutCss).not.toMatch(/filter:\s*blur\(30px\)/);
        expect(layoutCss).not.toMatch(/filter\s+0\.5s\s+ease-out/);
        expect(layoutCss).toMatch(/\.container\s*\{[\s\S]*?filter:\s*none;/);
        expect(baseLayout).not.toMatch(/__wakusei_skip_homepage_reveal/);
        expect(homepageApp).not.toMatch(/__wakusei_skip_homepage_reveal/);
    });
});
