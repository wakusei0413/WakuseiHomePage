import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const topbarComponent = readFileSync(join(process.cwd(), 'src', 'components', 'TopBar.tsx'), 'utf-8');

describe('TopBar unified navigation component', () => {
    it('renders a fixed top bar with avatar, name, and dock items', () => {
        assert.match(topbarComponent, /class="top-bar"/);
        assert.match(topbarComponent, /class="top-bar-left"/);
        assert.match(topbarComponent, /class="top-bar-avatar"/);
        assert.match(topbarComponent, /class="top-bar-name"/);
        assert.match(topbarComponent, /class="top-bar-right"/);
    });

    it('supports theme toggle via dock action items', () => {
        assert.match(topbarComponent, /case 'toggleTheme'/);
        assert.match(topbarComponent, /toggleTheme\(\)/);
        assert.match(topbarComponent, /if \(typeof doc\.startViewTransition === 'function'\)/);
    });

    it('supports language panel with popup portal', () => {
        assert.match(topbarComponent, /case 'language'/);
        assert.match(topbarComponent, /toggleLanguagePanel\(\)/);
        assert.match(topbarComponent, /class="top-bar-language-popup"/);
        assert.match(topbarComponent, /import \{ Portal \} from 'solid-js\/web'/);
    });

    it('uses dock lib helpers for item rendering', () => {
        assert.match(topbarComponent, /getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel/);
        assert.match(topbarComponent, /resolveDockLabel\(display, t\)/);
        assert.match(topbarComponent, /resolveDockIcon\(display, active\(\)\)/);
        assert.match(
            topbarComponent,
            /getDockItemActiveState\(item, \{ isDark: isDark\(\), activePanel: activePanel\(\) \}\)/
        );
    });

    it('supports link items with new tab option', () => {
        assert.match(topbarComponent, /item\.openInNewTab/);
        assert.match(topbarComponent, /window\.open\(item\.href, '_blank', 'noopener,noreferrer'\)/);
    });

    it('respects disabled state for dock links', () => {
        assert.match(topbarComponent, /isDockLinkDisabled\(item\.href\)/);
        assert.match(topbarComponent, /if \(disabled\) return;/);
    });

    it('computes left opacity from scroll progress on desktop', () => {
        assert.match(topbarComponent, /const leftOpacity = \(\) => \{/);
        assert.match(topbarComponent, /const sp = props\.scrollProgress\(\);/);
        assert.match(topbarComponent, /if \(sp <= 0\.15\) return 0;/);
        assert.match(topbarComponent, /if \(sp >= 0\.4\) return 1;/);
        assert.match(topbarComponent, /return \(sp - 0\.15\) \/ 0\.25;/);
    });

    it('exposes onMobileMenuOpen callback for mobile avatar click', () => {
        assert.match(topbarComponent, /onMobileMenuOpen: \(\) => void/);
        assert.match(topbarComponent, /props\.onMobileMenuOpen\(\)/);
    });

    it('has outside click cleanup for language popup', () => {
        assert.match(topbarComponent, /let outsideClickCleanup: \(\(\) => void\) \| undefined/);
        assert.match(topbarComponent, /setupOutsideClick\(\)/);
        assert.match(topbarComponent, /document\.addEventListener\('click', handler\)/);
    });
});
