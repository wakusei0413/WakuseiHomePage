import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const topBarComponent = readFileSync(join(process.cwd(), 'src', 'components', 'TopBar.vue'), 'utf-8');
const siteShellComponent = readFileSync(join(process.cwd(), 'src', 'components', 'SiteShell.vue'), 'utf-8');
const socialLinksComponent = readFileSync(join(process.cwd(), 'src', 'components', 'SocialLinks.vue'), 'utf-8');

describe('component lifecycle cleanup', () => {
    it('registers TopBar cleanup with onUnmounted instead of returning from onMounted', () => {
        expect(topBarComponent).toMatch(/onUnmounted/);
        expect(topBarComponent).toMatch(/onUnmounted\(\(\) => \{/);
        expect(topBarComponent).toMatch(/onUnmounted\(\(\) => \{[\s\S]*?cleanups\.forEach/);
    });

    it('registers SiteShell cleanup with onUnmounted instead of returning from onMounted', () => {
        expect(siteShellComponent).toMatch(/onUnmounted/);
        expect(siteShellComponent).toMatch(/onUnmounted\(\(\) => \{/);
        expect(siteShellComponent).not.toMatch(/onMounted\(\(\) => \{[\s\S]*?return \(\) => \{/);
    });

    it('registers SocialLinks cleanup with onUnmounted instead of returning from onMounted', () => {
        expect(socialLinksComponent).toMatch(/onUnmounted/);
        expect(socialLinksComponent).toMatch(/onUnmounted\(\(\) => \{/);
        expect(socialLinksComponent).not.toMatch(/onMounted\(\(\) => \{[\s\S]*?return \(\) => \{/);
    });

    it('clears delayed outside-click listener registration before cleanup completes', () => {
        expect(topBarComponent).toMatch(/let outsideClickTimer: ReturnType<typeof setTimeout> \| undefined;/);
        expect(topBarComponent).toMatch(/clearTimeout\(outsideClickTimer\)/);
    });

    it('SiteShell cleans up persistent hero resources', () => {
        expect(siteShellComponent).toContain('onUnmounted');
        expect(siteShellComponent).toContain('teardownWallpaper');
        expect(siteShellComponent).toContain('pageCleanups.forEach');
        expect(siteShellComponent).toContain('subscribePageShellStateChange');
    });

    it('SiteShell dispatches readiness from live page-shell state instead of stale props', () => {
        // Initial shell-state props only seed the store for SSR/client hydration parity;
        // readiness events must still read the live page-shell store state.
        expect(siteShellComponent).toContain('pageShell.enterPage');
        expect(siteShellComponent).toContain('watch([ready, () => pageShell.isHomePage]');
        expect(siteShellComponent).toContain('dispatchShellReadyEvents');
        expect(siteShellComponent).toContain('readyEventTimer = setTimeout');
        expect(siteShellComponent).toMatch(/if \(pageShell\.isHomePage\) \{[\s\S]*?wakusei:homepage-ready/);
    });
});
