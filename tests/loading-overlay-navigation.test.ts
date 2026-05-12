import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const baseLayout = readFileSync(join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
const pageFrame = readFileSync(join(process.cwd(), 'src', 'components', 'PageFrame.vue'), 'utf8');
const layoutCss = readFileSync(join(process.cwd(), 'src', 'styles', 'layout.css'), 'utf8');
const transitionsCss = readFileSync(join(process.cwd(), 'src', 'styles', 'transitions.css'), 'utf8');

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

    it('lets the incoming loader script consume the internal-swap skip flag', () => {
        expect(baseLayout).not.toMatch(
            /document\.addEventListener\('astro:after-swap', \(\) => \{\s*sessionStorage\.removeItem\('__wakusei_skip_entry_loader'\);/
        );
    });

    it('preserves route chrome state from the incoming Astro document', () => {
        expect(baseLayout).toMatch(/event\.newDocument\.body\.classList\.contains\('is-home'\)/);
        expect(baseLayout).toMatch(/applyHomePageChromeState\(incomingIsHomePage\)/);
    });

    it('inherits the selected theme before Astro swaps in a new document', () => {
        expect(baseLayout).toMatch(/event\.newDocument\.documentElement\.setAttribute\('data-theme', theme\)/);
        expect(baseLayout).toMatch(/event\.newDocument\.querySelector\('meta\[name="theme-color"\]'\)/);
        expect(baseLayout).toMatch(/incomingThemeColor\.setAttribute\('content', nextThemeColor\)/);
    });

    it('keeps the homepage component free of loading overlay ownership', () => {
        expect(pageFrame).not.toMatch(/LoadingOverlay/);
        expect(pageFrame).not.toMatch(/loadingPercent/);
        expect(pageFrame).not.toMatch(/loadingText/);
    });

    it('waits for homepage readiness before hiding direct homepage entry loads', () => {
        expect(baseLayout).toMatch(/window\.addEventListener\('wakusei:homepage-ready'/);
        expect(baseLayout).toMatch(/document\.querySelector\('\.page-scroller'\)/);
        expect(pageFrame).toMatch(/window\.dispatchEvent\(new CustomEvent\('wakusei:homepage-ready'\)\)/);
    });

    it('does not keep the legacy homepage blur reveal after the global loader is skipped', () => {
        expect(layoutCss).not.toMatch(/filter:\s*blur\(30px\)/);
        expect(layoutCss).not.toMatch(/filter\s+0\.5s\s+ease-out/);
        expect(layoutCss).toMatch(/\.container\s*\{[\s\S]*?filter:\s*none;/);
        expect(baseLayout).not.toMatch(/__wakusei_skip_homepage_reveal/);
        expect(pageFrame).not.toMatch(/__wakusei_skip_homepage_reveal/);
    });

    it('renders and drives a delayed top navigation progress bar', () => {
        expect(baseLayout).toMatch(/id="navigationProgress"/);
        expect(baseLayout).toMatch(/astro:before-preparation/);
        expect(baseLayout).toMatch(/astro:after-swap/);
        expect(baseLayout).toMatch(/var showDelay = 120;/);
        expect(baseLayout).toMatch(/navigation-progress--visible/);
    });

    it('refreshes navigation progress elements after Astro body swaps', () => {
        expect(baseLayout).not.toMatch(/transition:persist="navigation-progress"/);
        expect(baseLayout).toMatch(/function getNavigationProgressElements\(\)/);
        expect(baseLayout).toMatch(/const progress = document\.getElementById\('navigationProgress'\)/);
        expect(baseLayout).toMatch(/const bar = document\.getElementById\('navigationProgressBar'\)/);
        expect(baseLayout).toMatch(/var progressVisible = false;/);
        expect(baseLayout).toMatch(/progressVisible = true;/);
        expect(baseLayout).toMatch(/if \(!progressVisible\) \{/);
    });

    it('registers navigation runtime listeners only once across inline script reruns', () => {
        expect(baseLayout).toMatch(/if \(!window\.__wakuseiNavigationRuntimeInitialized\) \{/);
        expect(baseLayout).toMatch(/window\.__wakuseiNavigationRuntimeInitialized = true;/);
    });

    it('styles the top navigation progress bar without blocking clicks', () => {
        expect(transitionsCss).toMatch(/\.navigation-progress/);
        expect(transitionsCss).toMatch(/position:\s*fixed/);
        expect(transitionsCss).toMatch(/pointer-events:\s*none/);
        expect(transitionsCss).toMatch(/\.navigation-progress--visible/);
    });
});
