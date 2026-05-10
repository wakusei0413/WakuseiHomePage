import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const homepageApp = readFileSync(join(process.cwd(), 'src', 'components', 'HomepageApp.tsx'), 'utf8');
const layoutCss = readFileSync(join(process.cwd(), 'src', 'styles', 'layout.css'), 'utf8');
const responsiveCss = readFileSync(join(process.cwd(), 'src', 'styles', 'responsive.css'), 'utf8');

describe('wallpaper full-bleed layout', () => {
    it('places wallpaper-scroll-area outside right-panel as a sibling of left-panel', () => {
        assert.match(homepageApp, /class="wallpaper-scroll-area"/);
        assert.doesNotMatch(
            homepageApp,
            /<aside[^>]*class="right-panel"[^>]*>[\s\S]*?wallpaper-scroll-area/,
            'wallpaper-scroll-area should not be inside right-panel'
        );
    });

    it('makes wallpaper-fill-area span the full container', () => {
        assert.match(
            layoutCss,
            /\.wallpaper-scroll-area\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;[\s\S]*?\}/,
            'wallpaper should be absolutely positioned with inset:0 to fill the container'
        );
    });

    it('hides wallpaper on mobile screens', () => {
        assert.match(
            responsiveCss,
            /\.wallpaper-scroll-area[\s\S]*?display:\s*none/,
            'wallpaper should be hidden on mobile'
        );
    });

    it('keeps left-panel above the wallpaper with frosted glass', () => {
        assert.match(
            layoutCss,
            /\.left-panel\s*\{[\s\S]*?z-index:\s*var\(--z-content,\s*50\);/,
            'left-panel must have a z-index above the wallpaper'
        );
        assert.match(
            layoutCss,
            /\.left-panel\s*\{[\s\S]*?backdrop-filter:\s*var\(--panel-blur\)/,
            'left-panel must use backdrop-filter for frosted glass effect'
        );
        assert.match(
            layoutCss,
            /\.left-panel\s*\{[\s\S]*?background-color:\s*var\(--panel-bg\)/,
            'left-panel must use semi-transparent background via --panel-bg'
        );
    });
});
