import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const componentsCss = readFileSync(join(process.cwd(), 'src', 'styles', 'components.css'), 'utf8');

describe('social link interaction styles', () => {
    it('keeps social link hover areas inside each card gap', () => {
        assert.doesNotMatch(
            componentsCss,
            /\.avatar-box::before,\s*\.social-link::before,\s*\.wallpaper-toggle::before,\s*\.close-panel::before/,
            'social link hover hot-zone should not bleed into neighboring card gaps'
        );
    });

    it('uses the glass-lens hover lift for custom social links', () => {
        assert.match(
            componentsCss,
            /\.social-link\s*\{[\s\S]*transition:\s*transform\s+0\.5s\s+var\(--curve-delicate\),[\s\S]*box-shadow\s+0\.8s\s+var\(--curve-delicate\),[\s\S]*background-color\s+0\.6s\s+ease,[\s\S]*border-color\s+0\.6s\s+ease;/
        );
        assert.match(
            componentsCss,
            /\.social-link-slot[\s\S]*?\.social-link--custom\s*\{[\s\S]*?transform:\s*translate3d\(-2px,\s*-2px,\s*0\);[\s\S]*?box-shadow:[\s\S]*?0 0 70px 10px color-mix\(in srgb, var\(--custom-color,\s*#ffe600\) 12%, transparent\),[\s\S]*?0 0 36px 4px color-mix\(in srgb, var\(--custom-color,\s*#ffe600\) 22%, transparent\),[\s\S]*?0 0 14px 2px color-mix\(in srgb, var\(--custom-color,\s*#ffe600\) 38%, transparent\);/
        );
    });

    it('keeps paginated social cards square on sparse pages', () => {
        assert.match(
            componentsCss,
            /\.social-links-page\s*\{[\s\S]*?align-content:\s*start;[\s\S]*?\}/,
            'sparse carousel pages should not stretch their lone grid row to the full track height'
        );
        assert.match(
            componentsCss,
            /\.social-links-page\s+\.social-link\s*\{[\s\S]*?height:\s*auto;[\s\S]*?aspect-ratio:\s*1;[\s\S]*?\}/,
            'paginated cards should use aspect-ratio instead of the base height: 100% rule'
        );
    });

    it('treats paginated social links as part of the left panel surface', () => {
        assert.match(
            componentsCss,
            /\.social-links-wrapper\s*\{[\s\S]*?position:\s*relative;[\s\S]*?width:\s*100%;[\s\S]*?overflow:\s*visible;[\s\S]*?cursor:\s*grab;[\s\S]*?touch-action:\s*pan-y;[\s\S]*?\}/,
            'the wrapper should be a transparent drag and wheel surface'
        );
        assert.doesNotMatch(
            componentsCss,
            /\.social-links-wrapper\s*\{[^}]*?(background|border|box-shadow):/,
            'the wrapper should not look like a separate panel'
        );
        assert.match(
            componentsCss,
            /\.social-links-wrapper:active\s*\{[\s\S]*?cursor:\s*grabbing;[\s\S]*?\}/,
            'the full interaction surface should show drag feedback'
        );
        assert.doesNotMatch(componentsCss, /\.social-links-viewport\s*\{/);
        assert.match(
            componentsCss,
            /\.social-links-page\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(3, 1fr\);[\s\S]*?overflow:\s*visible;[\s\S]*?\}/,
            'the visible page should be an open grid, not a scrolling strip'
        );
        assert.match(
            componentsCss,
            /\.social-link-slot--placeholder\s*\{[\s\S]*?visibility:\s*hidden;[\s\S]*?pointer-events:\s*none;[\s\S]*?\}/,
            'invisible slots should preserve the two-row hit area on sparse pages'
        );
        assert.match(
            componentsCss,
            /@media \(max-width:\s*900px\)\s*\{[\s\S]*?\.social-links-page\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, 1fr\);[\s\S]*?\}/,
            'paginated pages should keep the mobile two-column social layout'
        );
        assert.match(
            componentsCss,
            /@media \(max-width:\s*900px\)\s*\{[\s\S]*?\.social-links-page\s+\.social-link\s*\{[\s\S]*?aspect-ratio:\s*auto;[\s\S]*?min-height:\s*120px;[\s\S]*?\}/,
            'mobile paginated buttons should be compact instead of square viewport-sized cards'
        );
        assert.match(
            componentsCss,
            /@media \(max-width:\s*900px\)\s*\{[\s\S]*?\.social-link-slot--placeholder\s*\{[\s\S]*?aspect-ratio:\s*auto;[\s\S]*?min-height:\s*120px;[\s\S]*?\}/,
            'mobile placeholder slots should match the compact button height'
        );
    });

    it('uses fade swap animations instead of exposing adjacent pages', () => {
        assert.match(componentsCss, /\.social-links-page\.is-swap-fade\s*\{/);
        assert.match(componentsCss, /\.social-links-page\.is-swap-fade\.is-animation-alt\s*\{/);
        assert.match(componentsCss, /@keyframes social-page-fade/);
        assert.match(componentsCss, /@keyframes social-page-fade-alt/);
        assert.doesNotMatch(componentsCss, /scroll-snap-type:\s*x mandatory/);
        assert.doesNotMatch(componentsCss, /overflow-x:\s*auto/);
    });
});
