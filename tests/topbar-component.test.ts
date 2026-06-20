import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const topbarComponent = readFileSync(join(process.cwd(), 'src', 'components', 'TopBar.vue'), 'utf-8');

describe('TopBar unified navigation component', () => {
    it('renders a fixed top bar with avatar, name, and dock items', () => {
        expect(topbarComponent).toMatch(/class="top-bar"/);
        expect(topbarComponent).toMatch(/class="top-bar-left"/);
        expect(topbarComponent).toMatch(/class="top-bar-avatar"/);
        expect(topbarComponent).toMatch(/class="top-bar-name"/);
        expect(topbarComponent).toMatch(/class="top-bar-right"/);
    });

    it('supports theme toggle via dock action items', () => {
        expect(topbarComponent).toMatch(/case 'toggleTheme'/);
        expect(topbarComponent).toMatch(/toggleTheme\(\)/);
        expect(topbarComponent).toMatch(/import.*useTheme.*from/);
    });

    it('supports language panel with popup', () => {
        expect(topbarComponent).toMatch(/case 'language'/);
        expect(topbarComponent).toMatch(/toggleLanguagePanel\(\)/);
        expect(topbarComponent).toMatch(/class="top-bar-language-popup"/);
    });

    it('uses dock lib helpers for item rendering', () => {
        expect(topbarComponent).toMatch(
            /getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel/
        );
        expect(topbarComponent).toMatch(/resolveDockLabel\(display, t\)/);
        expect(topbarComponent).toMatch(/resolveDockIcon\(display, active\)/);
    });

    it('supports link items with new tab option', () => {
        expect(topbarComponent).toMatch(/openInNewTab/);
        expect(topbarComponent).toMatch(/target="_blank"/);
        expect(topbarComponent).toMatch(/rel="noopener noreferrer"/);
    });

    it('respects disabled state for dock links', () => {
        expect(topbarComponent).toMatch(/isDockLinkDisabled/);
        expect(topbarComponent).toMatch(/isDockLinkDisabled\(item\.href\)/);
        expect(topbarComponent).toMatch(/e\.preventDefault\(\)/);
    });

    it('uses expansion progress to drive bar expansion CSS variables', () => {
        expect(topbarComponent).toMatch(/const expansionProgress = computed\(\(\) =>/);
        expect(topbarComponent).toMatch(/--left-width/);
        expect(topbarComponent).toMatch(/--bar-left/);
    });

    it('does not use translateX for bar layout', () => {
        expect(topbarComponent).not.toMatch(/barStyle/);
        expect(topbarComponent).not.toMatch(/rightStyle/);
        expect(topbarComponent).not.toMatch(/leftStyle/);
        expect(topbarComponent).not.toMatch(/translateX\(calc\(var\(--left-panel-width/);
    });

    it('uses barExpandStyle to drive bar left offset', () => {
        expect(topbarComponent).toMatch(/const barExpandStyle = computed/);
        expect(topbarComponent).toMatch(/:style="barExpandStyle"/);
    });

    it('opens mobile sidebar on avatar click', () => {
        expect(topbarComponent).toMatch(/openSidebar\(\)/);
    });

    it('uses anchor navigation for desktop home click to preserve transitions', () => {
        expect(topbarComponent).toMatch(/href="\/"/);
        expect(topbarComponent).not.toMatch(/window\.location\.href = '\/'/);
        expect(topbarComponent).toMatch(/const isCurrentHome = window\.location\.pathname === '\/';/);
        expect(topbarComponent).toMatch(/if \(isCurrentHome && s\) \{/);
    });

    it('scrolls the active page scroller for repeated same-route dock clicks', () => {
        expect(topbarComponent).toMatch(/function scrollCurrentPageToTop\(\)/);
        expect(topbarComponent).toMatch(/document\.querySelector\('\.page-scroller'\)/);
        expect(topbarComponent).toMatch(/s\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\)/);
        expect(topbarComponent).toMatch(/window\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\)/);
    });

    it('accepts initialIsHomePage prop for SSR snapshot', () => {
        expect(topbarComponent).toMatch(/initialIsHomePage: boolean/);
    });

    it('has outside click cleanup for language popup', () => {
        expect(topbarComponent).toMatch(/outsideClickCleanup/);
        expect(topbarComponent).toMatch(/setupOutsideClick\(\)/);
        expect(topbarComponent).toMatch(/document\.addEventListener\('click', handler\)/);
    });

    it('renders mobile sidebar mode within the same component', () => {
        expect(topbarComponent).toMatch(/class="top-bar-sidebar"/);
        expect(topbarComponent).toMatch(/class="top-bar-sidebar-overlay"/);
        expect(topbarComponent).toMatch(/isMobile/);
    });

    it('uses page shell store for scroll-driven expansion', () => {
        expect(topbarComponent).toContain('usePageShellStore');
        expect(topbarComponent).toContain('pageShell.scrollProgress');
    });

    it('keeps real bar expansion CSS variables', () => {
        expect(topbarComponent).toMatch(/--bar-left/);
        expect(topbarComponent).toMatch(/--left-width/);
        expect(topbarComponent).not.toMatch(/rightStyle/);
        expect(topbarComponent).not.toMatch(/translateX\(/);
    });
});
