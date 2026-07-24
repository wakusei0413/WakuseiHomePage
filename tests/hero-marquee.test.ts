import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('hero widget marquee', () => {
    const marquee = read('src/components/HeroWidgetMarquee.vue');
    const shell = read('src/components/SiteShell.vue');
    const layout = read('src/layouts/BaseLayout.astro');
    const posts = read('src/lib/posts.ts');
    const componentsCss = read('src/styles/components.css');
    const i18n = read('src/data/i18n.ts');
    const useTime = read('src/composables/useTime.ts');

    it('is mounted from SiteShell with featuredPosts and stats props', () => {
        expect(shell).toContain('HeroWidgetMarquee');
        expect(shell).toContain('featuredPosts');
        expect(shell).toContain('siteStats');
        expect(shell).toMatch(/:posts="props\.featuredPosts"/);
        expect(shell).toMatch(/:stats="props\.siteStats"/);
    });

    it('loads featured posts and site stats via lightweight server helpers', () => {
        expect(posts).toContain('export async function loadFeaturedPosts');
        expect(posts).toContain('export async function loadSiteStats');
        expect(layout).toContain('loadFeaturedPosts');
        expect(layout).toContain('loadSiteStats');
        expect(layout).toContain('featuredPosts={featuredPosts}');
        expect(layout).toContain('siteStats={siteStats}');
        expect(layout).not.toMatch(/loadPublishedPosts\(\)/);
    });

    it('uses seamless half-track loop with paper tickets and consolidated stats', () => {
        expect(marquee).toContain('[...base, ...base]');
        expect(marquee).not.toContain('minCards');
        expect(marquee).toContain("kind: 'clock'");
        expect(marquee).toContain("kind: 'search'");
        expect(marquee).toContain("kind: 'slogan'");
        expect(marquee).toContain('createSloganSelector');
        expect(marquee).toContain('scheduleSloganRotation');
        expect(marquee).toContain('siteConfig.slogans.pauseDuration');
        expect(marquee).toContain('initialSloganIndex');
        expect(marquee).toContain('hero-ticket-quote');
        expect(marquee).toContain('clearTimeout(sloganRotationTimer)');
        expect(marquee).toContain("kind: 'archive'");
        expect(marquee).toContain("kind: 'stats'");
        expect(marquee).toContain("kind: 'post'");
        expect(marquee).toContain('searchStore.open');
        expect(marquee).toContain('statCells');
        expect(marquee).toContain('hero-ticket');
        expect(marquee).toContain('Icon');
        expect(posts).toContain('loadRecentlyUpdatedPost');
    });

    it('pauses on hover/focus and page visibility', () => {
        expect(marquee).toContain('hero-marquee--paused');
        expect(marquee).toContain('visibilitychange');
        expect(marquee).toContain('@pointerenter');
        expect(marquee).toContain('prefers-reduced-motion');
        expect(marquee).toContain('rampPlaybackRate(0, 850, true)');
        expect(marquee).toContain('rampPlaybackRate(1, 650, false)');
        expect(marquee).toContain('animation.updatePlaybackRate');
        expect(marquee).toContain('requestAnimationFrame(step)');
    });

    it('reveals after shell-ready so the strip paints last', () => {
        expect(marquee).toContain('wakusei:shell-ready');
        expect(marquee).toContain('hero-marquee--revealed');
        expect(marquee).toContain('revealMarquee');
        expect(componentsCss).toMatch(/\.hero-marquee--revealed \.hero-marquee__viewport\s*\{/);
    });

    it('keeps both layers inside the full-width first-screen scene and beneath the left panel', () => {
        expect(componentsCss).toMatch(/\.hero-marquee\s*\{[\s\S]*?left:\s*0/);
        expect(componentsCss).toMatch(/\.hero-marquee-defocus\s*\{[\s\S]*?left:\s*0/);
        expect(componentsCss).toMatch(/\.hero-marquee\s*\{[\s\S]*?position:\s*absolute/);
        expect(componentsCss).not.toMatch(/\.hero-marquee\s*\{[\s\S]*?position:\s*fixed/);
        expect(shell).toMatch(/layer="rail"/);
        expect(shell).toMatch(/layer="defocus"/);
        expect(shell).not.toMatch(/<HeroWidgetMarquee\s+v-if="pageShell\.isHomePage"/);
        expect(shell.indexOf('layer="defocus"')).toBeLessThan(shell.indexOf('layer="rail"'));
        const heroContent = shell.slice(shell.indexOf('<div class="hero-content"'), shell.indexOf('<TopBar'));
        expect(heroContent).toContain('layer="defocus"');
        expect(heroContent).toContain('layer="rail"');
        expect(shell).not.toContain('hero-marquee-scene');
        expect(marquee).toContain("layer === 'rail'");
        expect(marquee).toContain("layer === 'defocus'");
        expect(marquee).toContain('defocusOpacity');
        expect(marquee).not.toContain('railShellStyle');
        expect(marquee).toContain("'--marquee-defocus-opacity'");
        expect(marquee).not.toContain('scrollLiftVh');
        expect(marquee).not.toContain('translate3d(0, ${-lift}vh, 0)');
        expect(componentsCss).toMatch(/\.hero-marquee\s*\{[^}]*z-index:\s*5/);
        expect(componentsCss).toMatch(/\.hero-marquee-defocus\s*\{[^}]*bottom:\s*0;[^}]*z-index:\s*4/);
        expect(marquee).toContain('usePageShellStore');
    });

    it('keeps the persistent marquee mounted for every shell mode', () => {
        const heroContent = shell.slice(shell.indexOf('<div class="hero-content"'), shell.indexOf('<TopBar'));
        expect(heroContent.match(/<HeroWidgetMarquee/g)?.length).toBe(2);
        expect(heroContent).not.toMatch(/HeroWidgetMarquee[\s\S]*v-if="pageShell\.isHomePage"/);
        expect(layout).toContain('transition:persist');
        const responsiveCss = read('src/styles/responsive.css');
        expect(responsiveCss).toContain('.hero-sticky:not([data-is-home]) .left-panel');
        expect(responsiveCss).toMatch(
            /\.hero-sticky:not\(\[data-is-home\]\)\s*\{[^}]*height:\s*calc\(var\(--ticket-height\)/
        );
    });

    it('uses progressive Gaussian defocus under the strip; cards clamp long titles', () => {
        expect(shell).toContain('<HeroWidgetMarquee');
        expect(marquee).toContain('hero-marquee-defocus');
        expect(marquee).toContain('hero-marquee-defocus__layer--far');
        expect(marquee).toContain('hero-marquee-defocus__layer--mid');
        expect(marquee).toContain('hero-marquee-defocus__layer--near');
        expect(componentsCss).toMatch(/hero-marquee-defocus__layer--near/);
        expect(componentsCss).toMatch(
            /\.hero-marquee-defocus--revealed \.hero-marquee-defocus__layer--near[\s\S]*?backdrop-filter:\s*blur\(48px\)/
        );
        expect(componentsCss).toMatch(
            /\.hero-marquee-defocus--revealed \.hero-marquee-defocus__layer--far[\s\S]*?backdrop-filter:\s*blur\(12px\)/
        );
        expect(componentsCss).toMatch(/Never put opacity < 1 on this root/);
        expect(componentsCss).toMatch(/--ticket-paper/);
        expect(componentsCss).toMatch(/--ticket-height:\s*7\.5rem/);
        expect(componentsCss).toMatch(/-webkit-line-clamp:\s*2/);
        expect(componentsCss).toMatch(/overflow-wrap:\s*anywhere/);
        expect(componentsCss).toMatch(/grid-template-columns:\s*5rem minmax\(0,\s*1fr\)/);
        expect(componentsCss).toMatch(
            /\.hero-ticket__hit--post:not\(:has\(\.hero-ticket__cover\)\)\s*\{[^}]*padding:\s*0/
        );
        expect(componentsCss).toMatch(/\.hero-ticket__title\s*\{[^}]*flex:\s*0 0 auto/);
        expect(componentsCss).not.toMatch(/\.hero-ticket\s*\{[\s\S]*?backdrop-filter:\s*blur/);
        expect(i18n).toContain("'widgets.stats.kicker'");
    });

    it('shares a single clock timer across subscribers', () => {
        expect(useTime).toContain('subscriberCount');
        expect(useTime).toContain('sharedNow');
        expect(useTime).toContain('ensureSharedTimer');
    });
});
