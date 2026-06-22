import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const baseLayout = readFileSync(join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
const homepageApp = readFileSync(join(process.cwd(), 'src', 'components', 'HomepageApp.vue'), 'utf8');

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

    it('clears the internal-swap skip flag after Astro swaps so it never leaks into browser refreshes', () => {
        expect(baseLayout).toMatch(
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
        expect(homepageApp).not.toMatch(/LoadingOverlay/);
        expect(homepageApp).not.toMatch(/loadingPercent/);
        expect(homepageApp).not.toMatch(/loadingText/);
    });

    it('waits for shell readiness before hiding entry loads on shell pages', () => {
        expect(baseLayout).toContain('wakusei:shell-ready');
        expect(baseLayout).toMatch(/var shellReady = false;/);
        expect(baseLayout).toMatch(/shouldWaitForShell/);
        expect(baseLayout).toMatch(/shouldWaitForShell\(\) \|\| shouldWaitForHomepage\(\)/);
    });

    it('waits for homepage readiness before hiding direct homepage entry loads', () => {
        const loaderStart = baseLayout.indexOf("var storageKey = '__wakusei_skip_entry_loader';");
        const loaderEnd = baseLayout.indexOf('</script>', loaderStart);
        const loaderBlock = baseLayout.slice(loaderStart, loaderEnd);

        expect(baseLayout).toMatch(/window\.addEventListener\('wakusei:homepage-ready'/);
        expect(baseLayout).toMatch(/document\.documentElement\.classList\.contains\('is-home'\)/);
        expect(baseLayout).toMatch(/document\.body\.classList\.contains\('is-home'\)/);
        expect(loaderBlock).not.toMatch(/document\.querySelector\('\.page-scroller'\)/);
        expect(loaderBlock).not.toContain("document.querySelector('.page-scroller') && !homepageReady");
    });

    it('does not make non-home direct entry loads wait on homepage readiness', () => {
        expect(baseLayout).toMatch(/function shouldWaitForHomepage\(\) \{[\s\S]*const isHomeRoute =/);
        expect(baseLayout).toMatch(/return isHomeRoute && !homepageReady;/);
        expect(baseLayout).not.toMatch(/return !!document\.querySelector\('\.page-scroller'\) && !homepageReady;/);
    });

    it('shows the loading overlay on non-home refreshes instead of hiding it immediately', () => {
        // Previously a non-home route early-return added `hidden` and returned before
        // wiring up readiness listeners. That made the overlay never appear on refresh
        // of blog/article/404 pages. Assert that path is gone.
        expect(baseLayout).not.toMatch(/非首页（文章\/博客\/404）无需等待壁纸\/hero 就绪，直接隐藏 overlay/);
        expect(baseLayout).not.toMatch(
            /if \(!isHomeRoute\) \{\s*overlay\.classList\.add\('hidden'\);[\s\S]*?return;[\s\S]*?\}/
        );
    });

    it('waits for shell readiness on every route so non-home pages stay loaded until the wallpaper is ready', () => {
        // Unifies homepage and non-home behavior: the overlay must not dismiss before
        // the shell (wallpaper) is ready, otherwise non-home pages flash an unloaded
        // wallpaper. shouldWaitForShell must not be gated by isHomeRoute.
        expect(baseLayout).toMatch(/function shouldWaitForShell\(\) \{\s*return !shellReady;\s*\}/);
        expect(baseLayout).not.toMatch(/function shouldWaitForShell\(\) \{[\s\S]*const isHomeRoute =/);
        expect(baseLayout).not.toMatch(/return isHomeRoute && !shellReady;/);
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

    it('keeps navigation runtime free of debug console noise', () => {
        expect(baseLayout).not.toMatch(/console\.log\([\s\S]*NavigationProgress/);
    });

    it('clears pending home readiness waits when navigation progress settles', () => {
        expect(baseLayout).toMatch(/function clearPendingResourceWait\(\)/);
        expect(baseLayout).toMatch(/function settle\(\)/);
        expect(baseLayout).toMatch(/if \(epoch !== navigationEpoch\) return;/);
        expect(baseLayout).toMatch(/resourceTimeout = window\.setTimeout\(settle, 10000\)/);
    });

    it('recovers from homepage readiness events fired before after-swap listeners attach', () => {
        expect(baseLayout).toMatch(/function isIncomingHomeReady\(\)/);
        expect(baseLayout).toMatch(/document\.querySelector\('\.container\.visible'\)/);
        expect(baseLayout).toMatch(/resourceProbeTimer = window\.setTimeout/);
    });

    it('finishes navigation progress immediately for non-home Astro swaps', () => {
        expect(baseLayout).toMatch(
            /function waitForResources\(\) \{[\s\S]*if \(!incomingIsHomePage\) \{\s*finish\(\);\s*return;\s*\}/
        );
        expect(baseLayout).toMatch(
            /if \(!incomingIsHomePage\) \{[\s\S]*window\.addEventListener\('wakusei:homepage-ready'/
        );
    });

    it('resets the page scroller after swaps', () => {
        expect(baseLayout).toContain("document.getElementById('pageScroller')");
        expect(baseLayout).toContain('scrollTo({ top: 0 })');
    });

    it('styles the top navigation progress bar without blocking clicks', () => {
        expect(transitionsCss).toMatch(/\.navigation-progress/);
        expect(transitionsCss).toMatch(/position:\s*fixed/);
        expect(transitionsCss).toMatch(/pointer-events:\s*none/);
        expect(transitionsCss).toMatch(/\.navigation-progress--visible/);
    });
});
