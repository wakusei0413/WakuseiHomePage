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

    it('reuses expansion progress for left-side transition timing', () => {
        expect(topbarComponent).toMatch(/const expansionProgress = computed\(\(\) =>/);
        expect(topbarComponent).toMatch(/const raw = \(sp - 0\.02\) \/ 0\.43;/);
        expect(topbarComponent).toMatch(/const p = expansionProgress\.value;/);
        expect(topbarComponent).toMatch(/const x = \(1 - expansionProgress\.value\) \* 18;/);
    });

    it('dispatches custom event on mobile avatar click', () => {
        expect(topbarComponent).toMatch(/wakusei:open-mobile-menu/);
        expect(topbarComponent).toMatch(/new CustomEvent\('wakusei:open-mobile-menu'\)/);
    });

    it('uses anchor navigation for desktop home click to preserve transitions', () => {
        expect(topbarComponent).toMatch(/href="\/"/);
        expect(topbarComponent).not.toMatch(/window\.location\.href = '\/'/);
    });

    it('accepts initialIsHomePage prop for SSR snapshot', () => {
        expect(topbarComponent).toMatch(/initialIsHomePage: boolean/);
    });

    it('has outside click cleanup for language popup', () => {
        expect(topbarComponent).toMatch(/outsideClickCleanup/);
        expect(topbarComponent).toMatch(/setupOutsideClick\(\)/);
        expect(topbarComponent).toMatch(/document\.addEventListener\('click', handler\)/);
    });
});
