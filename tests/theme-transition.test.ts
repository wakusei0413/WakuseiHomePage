import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const themeStore = readFileSync(join(process.cwd(), 'src', 'stores', 'theme.ts'), 'utf-8');
const topbarCss = readFileSync(join(process.cwd(), 'src', 'styles', 'topbar.css'), 'utf-8');
const transitionsCss = readFileSync(join(process.cwd(), 'src', 'styles', 'transitions.css'), 'utf-8');

describe('theme transition behavior', () => {
    it('applies theme directly instead of wrapping fixed chrome in a root view transition', () => {
        expect(themeStore).not.toContain('startViewTransition');
        expect(themeStore).toContain('applyTheme(newTheme)');
    });

    it('keeps the top bar outside animated page view transitions', () => {
        expect(topbarCss).toContain('view-transition-name: top-bar');
        expect(transitionsCss).toContain('::view-transition-old(top-bar)');
        expect(transitionsCss).toContain('::view-transition-new(top-bar)');
        expect(transitionsCss).toMatch(/::view-transition-old\(top-bar\)[\s\S]*animation:\s*none;/);
    });

    it('animates top bar colors when the theme changes', () => {
        expect(topbarCss).toContain('background-color var(--transition-normal)');
        expect(topbarCss).toContain('[data-theme=\'dark\'] .top-bar');
    });
});