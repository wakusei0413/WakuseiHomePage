import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const siteShell = readFileSync(join(process.cwd(), 'src', 'components', 'SiteShell.vue'), 'utf8');
const layoutCss = readFileSync(join(process.cwd(), 'src', 'styles', 'layout.css'), 'utf8');
const responsiveCss = readFileSync(join(process.cwd(), 'src', 'styles', 'responsive.css'), 'utf8');

describe('wallpaper full-bleed layout', () => {
    it('places wallpaper-scroll-area outside right-panel as a sibling of left-panel', () => {
        expect(siteShell).toMatch(/class="wallpaper-scroll-area"/);
        expect(siteShell).not.toMatch(/<aside[^>]*class="right-panel"[^>]*>[\s\S]*?wallpaper-scroll-area/);
    });

    it('makes wallpaper-fill-area span the full container', () => {
        expect(layoutCss).toMatch(
            /\.wallpaper-scroll-area\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;[\s\S]*?\}/
        );
    });

    it('hides wallpaper on mobile screens', () => {
        expect(responsiveCss).toMatch(/\.wallpaper-scroll-area[\s\S]*?display:\s*none/);
    });

    it('keeps left-panel above the wallpaper with frosted glass', () => {
        expect(layoutCss).toMatch(/\.left-panel\s*\{[\s\S]*?z-index:\s*var\(--z-content,\s*50\);/);
        expect(layoutCss).toMatch(/\.left-panel\s*\{[\s\S]*?backdrop-filter:\s*var\(--panel-blur\)/);
        expect(layoutCss).toMatch(/\.left-panel\s*\{[\s\S]*?background-color:\s*var\(--panel-bg\)/);
    });

    it('keeps page content above hero and wallpaper', () => {
        expect(layoutCss).toContain('.homepage-content');
        expect(layoutCss).toContain('.homepage-section-title');
        expect(layoutCss).toContain('.homepage-section-lead');
    });

    it('applies a slow non-linear zoom while each wallpaper is active', () => {
        expect(layoutCss).toMatch(/@keyframes\s+wallpaper-ken-burns/);
        expect(layoutCss).toMatch(
            /\.wallpaper-image\.active\s*\{[\s\S]*?animation:\s*wallpaper-ken-burns/
        );
        expect(layoutCss).toMatch(
            /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[\s\S]*?\.wallpaper-image\.active[\s\S]*?animation:\s*none/
        );
    });
});
