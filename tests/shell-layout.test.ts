import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const baseLayout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
const siteShell = readFileSync('src/components/SiteShell.vue', 'utf8');
const topBar = readFileSync('src/components/TopBar.vue', 'utf8');
const homepageApp = readFileSync('src/components/HomepageApp.vue', 'utf8');
const indexPage = readFileSync('src/pages/index.astro', 'utf8');
const postDetailPage = readFileSync('src/pages/posts/[...slug].astro', 'utf8');
const notFoundPage = readFileSync('src/pages/404.astro', 'utf8');
const transitionsCss = readFileSync('src/styles/transitions.css', 'utf8');
const topbarCss = readFileSync('src/styles/topbar.css', 'utf8');
const baseCss = readFileSync('src/styles/base.css', 'utf8');
const responsiveCss = readFileSync('src/styles/responsive.css', 'utf8');

describe('persistent shell layout guardrails', () => {
    it('keeps SiteShell, page content, and footer in one page scroller', () => {
        expect(baseLayout).toContain('id="pageScroller"');
        expect(baseLayout).toContain('class="page-scroller"');
        expect(baseLayout).toContain('id="pageTransitionSurface"');
        expect(baseLayout).toContain('transition:name="site-shell"');
        expect(baseLayout).toContain('transition:persist');
        expect(baseLayout).toContain('transition:name="site-footer"');
    });

    it('uses props-driven shellMode instead of pathname inference', () => {
        expect(baseLayout).toContain('shellMode');
        expect(baseLayout).toContain('shellTitle');
        expect(baseLayout).not.toContain('const isShellPage');
        expect(baseLayout).not.toContain('const pathname = Astro.url.pathname');
    });

    it('does not use isShellPage or conditional shell branch', () => {
        expect(baseLayout).not.toContain('isShellPage');
        expect(baseLayout).not.toContain('data-shell-page');
    });

    it('orders shell, page content, and footer inside the page scroller', () => {
        const scrollerIndex = baseLayout.indexOf('id="pageScroller"');
        const surfaceIndex = baseLayout.indexOf('id="pageTransitionSurface"');
        const footerIndex = baseLayout.indexOf('transition:name="site-footer"');

        expect(scrollerIndex).toBeGreaterThanOrEqual(0);
        expect(surfaceIndex).toBeGreaterThan(scrollerIndex);
        expect(footerIndex).toBeGreaterThan(surfaceIndex);
    });

    it('keeps footer ownership out of SiteShell during BaseLayout shell ownership', () => {
        expect(siteShell).not.toContain("import Footer from './Footer.vue';");
        expect(siteShell).not.toContain('<Footer');
    });

    it('uses the page-shell store for mode-driven rendering', () => {
        expect(siteShell).toContain('pageShell.mode');
        expect(siteShell).toContain('getPageShellStateFromDocument');
        expect(siteShell).toContain('subscribePageShellStateChange');
    });

    it('exposes shell data on the content transition surface', () => {
        expect(baseLayout).toContain('data-shell-mode');
        expect(baseLayout).toContain('data-page-title');
        expect(baseLayout).toContain('data-is-home');
    });

    it('moves shared hero ownership into SiteShell', () => {
        expect(siteShell).toContain('wallpaper-scroll-area');
        expect(siteShell).toContain('left-panel');
        expect(siteShell).toContain('hero-sticky');
    });

    it('no page uses PageFrame', () => {
        expect(homepageApp).not.toContain('PageFrame');
        expect(indexPage).not.toContain('PageFrame');
        expect(postDetailPage).not.toContain('PageFrame');
        expect(notFoundPage).not.toContain('PageFrame');
    });

    it('does not rely on legacy Font Awesome class icons in pages', () => {
        expect(notFoundPage).not.toContain('<i class="fa-solid');
        expect(notFoundPage).toContain("import Icon from '../components/Icon.vue'");
    });

    it('does not gate hero by isShellPage', () => {
        expect(siteShell).not.toContain('isShellPage');
    });

    it('renders four shell modes in SiteShell left panel', () => {
        expect(siteShell).toContain("pageShell.mode === 'home'");
        expect(siteShell).toContain("pageShell.mode === 'blog'");
        expect(siteShell).toContain("pageShell.mode === 'article'");
    });

    it('marks home hero-sticky so mobile can hide non-home first screens', () => {
        expect(siteShell).toContain('data-is-home');
        expect(siteShell).toContain('data-shell-mode');
        expect(responsiveCss).toMatch(/\.hero-sticky:not\(\[data-is-home\]\)/);
    });

    it('has transition surface with z-index and background', () => {
        expect(transitionsCss).toContain('.page-transition-surface');
        expect(transitionsCss).toMatch(/z-index:\s*var\(--z-content/);
        expect(transitionsCss).toMatch(/background:\s*var\(--bg/);
    });

    it('has hero-sticky with content z-index', () => {
        expect(transitionsCss).toContain('.hero-sticky');
        expect(transitionsCss).toMatch(/\.hero-sticky\s*\{[\s\S]*?z-index:\s*var\(--z-content/);
    });

    it('unifies body styles across all pages', () => {
        expect(topbarCss).not.toContain('padding-top: 72px');
        expect(topbarCss).not.toContain('body.is-home');
        expect(baseCss).not.toContain('html.is-home');
        expect(baseCss).not.toContain('body.is-home');
    });

    it('applies TopBar expansion animation to all desktop modes', () => {
        expect(topBar).not.toContain('if (!pageShell.isHomePage) return 1');
        expect(topBar).toContain('expansionProgress');
    });
});
