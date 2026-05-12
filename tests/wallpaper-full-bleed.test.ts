import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pageFrame = readFileSync(join(process.cwd(), 'src', 'components', 'PageFrame.vue'), 'utf8');
const layoutCss = readFileSync(join(process.cwd(), 'src', 'styles', 'layout.css'), 'utf8');
const responsiveCss = readFileSync(join(process.cwd(), 'src', 'styles', 'responsive.css'), 'utf8');

describe('wallpaper full-bleed layout', () => {
    it('places wallpaper-scroll-area outside right-panel as a sibling of left-panel', () => {
        expect(pageFrame).toMatch(/class="wallpaper-scroll-area"/);
        expect(pageFrame).not.toMatch(/<aside[^>]*class="right-panel"[^>]*>[\s\S]*?wallpaper-scroll-area/);
    });

    it('makes wallpaper-fill-area span the full container', () => {
        expect(layoutCss).toMatch(
            /\.wallpaper-scroll-area\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;[\s\S]*?\}/
        );
    });

    it('keeps wallpaper visible on mobile screens', () => {
        expect(responsiveCss).not.toMatch(/\.wallpaper-scroll-area[\s\S]*?display:\s*none/);
    });

    it('keeps left-panel above the wallpaper with frosted glass', () => {
        expect(layoutCss).toMatch(/\.left-panel\s*\{[\s\S]*?z-index:\s*var\(--z-content,\s*50\);/);
        expect(layoutCss).toMatch(/\.left-panel\s*\{[\s\S]*?backdrop-filter:\s*var\(--panel-blur\)/);
        expect(layoutCss).toMatch(/\.left-panel\s*\{[\s\S]*?background-color:\s*var\(--panel-bg\)/);
    });
});
