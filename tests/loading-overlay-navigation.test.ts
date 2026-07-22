import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const baseLayout = readFileSync(join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
const homepageApp = readFileSync(join(process.cwd(), 'src', 'components', 'HomepageApp.vue'), 'utf8');
const navigationRuntime = readFileSync(join(process.cwd(), 'src', 'scripts', 'navigation-runtime.ts'), 'utf8');

const layoutCss = readFileSync(join(process.cwd(), 'src', 'styles', 'layout.css'), 'utf8');
const transitionsCss = readFileSync(join(process.cwd(), 'src', 'styles', 'transitions.css'), 'utf8');

describe('navigation behavior', () => {
    it('does not render a blocking loading overlay on first paint', () => {
        // The full-screen loading overlay was removed so SSR content (and the LCP
        // element) paints at first contentful paint instead of being occluded.
        expect(baseLayout).not.toMatch(/<div id="globalLoadingOverlay"/);
        expect(baseLayout).not.toMatch(/var skipEntryLoader = sessionStorage/);
        expect(baseLayout).not.toMatch(/function shouldWaitForShell/);
        expect(baseLayout).not.toMatch(/function shouldWaitForHomepage/);
        expect(baseLayout).not.toMatch(/__wakusei_skip_entry_loader/);
    });

    it('preserves route chrome state from the incoming Astro document', () => {
        expect(navigationRuntime).toMatch(/swapEvent\.newDocument\.body\.classList\.contains\('is-home'\)/);
        expect(navigationRuntime).toMatch(/applyHomePageChromeState\(incomingIsHomePage\)/);
    });

    it('inherits the selected theme before Astro swaps in a new document', () => {
        expect(navigationRuntime).toMatch(
            /swapEvent\.newDocument\.documentElement\.setAttribute\('data-theme', theme\)/
        );
        expect(navigationRuntime).toMatch(/swapEvent\.newDocument\.querySelector\('meta\[name="theme-color"\]'\)/);
        expect(navigationRuntime).toMatch(/incomingThemeColor\.setAttribute\('content', nextThemeColor\)/);
    });

    it('keeps the homepage component free of loading overlay ownership', () => {
        expect(homepageApp).not.toMatch(/LoadingOverlay/);
        expect(homepageApp).not.toMatch(/loadingPercent/);
        expect(homepageApp).not.toMatch(/loadingText/);
    });

    it('does not keep the legacy homepage blur reveal after the global loader is skipped', () => {
        expect(layoutCss).not.toMatch(/filter:\s*blur\(30px\)/);
        expect(layoutCss).not.toMatch(/filter\s+0\.5s\s+ease-out/);
        expect(layoutCss).toMatch(/\.container\s*\{[\s\S]*?filter:\s*none;/);
        expect(baseLayout).not.toMatch(/__wakusei_skip_homepage_reveal/);
        expect(homepageApp).not.toMatch(/__wakusei_skip_homepage_reveal/);
    });

    it('wraps page content in a named transition surface while keeping the shell persistent', () => {
        expect(baseLayout).toMatch(/id="pageTransitionSurface"/);
        expect(baseLayout).toMatch(/class="page-transition-surface"/);
        expect(baseLayout).toMatch(/<html[^>]*transition:name="root"[^>]*transition:animate="none"/);
        expect(baseLayout).toMatch(/transition:name="page-content"/);
        expect(baseLayout).toMatch(/transition:name="site-shell"/);
        expect(baseLayout).toMatch(/transition:persist/);
    });

    it('animates the page content surface instead of the whole root document', () => {
        expect(transitionsCss).toMatch(/::view-transition-old\(page-content\)/);
        expect(transitionsCss).toMatch(/::view-transition-new\(page-content\)/);
        expect(transitionsCss).not.toMatch(/::view-transition-old\(root\)/);
        expect(transitionsCss).not.toMatch(/::view-transition-new\(root\)/);
    });

    it('renders and drives a delayed top navigation progress bar', () => {
        expect(baseLayout).toMatch(/id="navigationProgress"/);
        expect(baseLayout).toMatch(/import '..\/scripts\/navigation-runtime'/);
        expect(navigationRuntime).toMatch(/astro:before-preparation/);
        expect(navigationRuntime).toMatch(/astro:after-swap/);
        expect(navigationRuntime).toMatch(/const SHOW_DELAY = 120;/);
        expect(navigationRuntime).toMatch(/navigation-progress--visible/);
    });

    it('refreshes navigation progress elements after Astro body swaps', () => {
        expect(baseLayout).not.toMatch(/transition:persist="navigation-progress"/);
        expect(navigationRuntime).toMatch(/function getNavigationProgressElements\(\)/);
        expect(navigationRuntime).toMatch(/const progress = document\.getElementById\('navigationProgress'\)/);
        expect(navigationRuntime).toMatch(/const bar = document\.getElementById\('navigationProgressBar'\)/);
        expect(navigationRuntime).toMatch(/let progressVisible = false;/);
        expect(navigationRuntime).toMatch(/progressVisible = true;/);
        expect(navigationRuntime).toMatch(/if \(!progressVisible\) \{/);
    });

    it('registers navigation runtime listeners only once across inline script reruns', () => {
        expect(navigationRuntime).toMatch(/if \(window\.__wakuseiNavigationRuntimeInitialized\) return;/);
        expect(navigationRuntime).toMatch(/window\.__wakuseiNavigationRuntimeInitialized = true;/);
    });

    it('keeps navigation runtime free of debug console noise', () => {
        expect(navigationRuntime).not.toMatch(/console\.log\([\s\S]*NavigationProgress/);
    });

    it('clears pending home readiness waits when navigation progress settles', () => {
        expect(navigationRuntime).toMatch(/function clearPendingResourceWait\(\)/);
        expect(navigationRuntime).toMatch(/function settle\(\)/);
        expect(navigationRuntime).toMatch(/if \(epoch !== navigationEpoch\) return;/);
        expect(navigationRuntime).toMatch(/resourceTimeout = window\.setTimeout\(settle, 10000\)/);
    });

    it('recovers from homepage readiness events fired before after-swap listeners attach', () => {
        expect(navigationRuntime).toMatch(/function isIncomingHomeReady\(\)/);
        expect(navigationRuntime).toMatch(/document\.querySelector\('\.container\.visible'\)/);
        expect(navigationRuntime).toMatch(/resourceProbeTimer = window\.setTimeout/);
    });

    it('finishes navigation progress immediately for non-home Astro swaps', () => {
        expect(navigationRuntime).toMatch(
            /function waitForResources\(\) \{[\s\S]*if \(!incomingIsHomePage\) \{\s*finish\(\);\s*return;\s*\}/
        );
        expect(navigationRuntime).toMatch(
            /if \(!incomingIsHomePage\) \{[\s\S]*window\.addEventListener\('wakusei:homepage-ready'/
        );
    });

    it('resets the page scroller after swaps', () => {
        expect(navigationRuntime).toContain("document.getElementById('pageScroller')");
        expect(navigationRuntime).toContain('scrollTo({ top: 0 })');
    });

    it('styles the top navigation progress bar without blocking clicks', () => {
        expect(transitionsCss).toMatch(/\.navigation-progress/);
        expect(transitionsCss).toMatch(/position:\s*fixed/);
        expect(transitionsCss).toMatch(/pointer-events:\s*none/);
        expect(transitionsCss).toMatch(/\.navigation-progress--visible/);
    });
});
