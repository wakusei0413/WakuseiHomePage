import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentsCss = readFileSync(join(process.cwd(), 'src', 'styles', 'components.css'), 'utf8');

describe('social link interaction styles', () => {
    it('keeps social link hover areas inside each card gap', () => {
        expect(componentsCss).not.toMatch(
            /\.avatar-box::before,\s*\.social-link::before,\s*\.wallpaper-toggle::before,\s*\.close-panel::before/
        );
    });

    it('uses the glass-lens hover lift for custom social links', () => {
        expect(componentsCss).toMatch(
            /\.social-link\s*\{[\s\S]*transition:\s*transform\s+0\.5s\s+var\(--curve-delicate\),[\s\S]*box-shadow\s+0\.8s\s+var\(--curve-delicate\),[\s\S]*background-color\s+0\.6s\s+ease,[\s\S]*border-color\s+0\.6s\s+ease;/
        );
        expect(componentsCss).toMatch(
            /\.social-link-slot[\s\S]*?\.social-link--custom\s*\{[\s\S]*?transform:\s*translate3d\(-2px,\s*-2px,\s*0\);[\s\S]*?box-shadow:[\s\S]*?0 0 70px 10px color-mix\(in srgb, var\(--custom-color,\s*#ffe600\) 12%, transparent\),[\s\S]*?0 0 36px 4px color-mix\(in srgb, var\(--custom-color,\s*#ffe600\) 22%, transparent\),[\s\S]*?0 0 14px 2px color-mix\(in srgb, var\(--custom-color,\s*#ffe600\) 38%, transparent\);/
        );
    });

    it('keeps paginated social cards square on sparse pages', () => {
        expect(componentsCss).toMatch(/\.social-links-page\s*\{[\s\S]*?align-content:\s*start;[\s\S]*?\}/);
        expect(componentsCss).toMatch(
            /\.social-links-page\s+\.social-link\s*\{[\s\S]*?height:\s*auto;[\s\S]*?aspect-ratio:\s*1;[\s\S]*?\}/
        );
    });

    it('treats paginated social links as part of the left panel surface', () => {
        expect(componentsCss).toMatch(
            /\.social-links-wrapper\s*\{[\s\S]*?position:\s*relative;[\s\S]*?width:\s*100%;[\s\S]*?overflow:\s*visible;[\s\S]*?cursor:\s*grab;[\s\S]*?touch-action:\s*pan-y;[\s\S]*?\}/
        );
        expect(componentsCss).not.toMatch(/\.social-links-wrapper\s*\{[^}]*?(background|border|box-shadow):/);
        expect(componentsCss).toMatch(/\.social-links-wrapper:active\s*\{[\s\S]*?cursor:\s*grabbing;[\s\S]*?\}/);
        expect(componentsCss).not.toMatch(/\.social-links-viewport\s*\{/);
        expect(componentsCss).toMatch(
            /\.social-links-page\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(3, 1fr\);[\s\S]*?overflow:\s*visible;[\s\S]*?\}/
        );
        expect(componentsCss).toMatch(
            /\.social-link-slot--placeholder\s*\{[\s\S]*?visibility:\s*hidden;[\s\S]*?pointer-events:\s*none;[\s\S]*?\}/
        );
        expect(componentsCss).toMatch(
            /@media \(max-width:\s*900px\)\s*\{[\s\S]*?\.social-links-page\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, 1fr\);[\s\S]*?\}/
        );
        expect(componentsCss).toMatch(
            /@media \(max-width:\s*900px\)\s*\{[\s\S]*?\.social-links-page\s+\.social-link\s*\{[\s\S]*?aspect-ratio:\s*auto;[\s\S]*?min-height:\s*120px;[\s\S]*?\}/
        );
        expect(componentsCss).toMatch(
            /@media \(max-width:\s*900px\)\s*\{[\s\S]*?\.social-link-slot--placeholder\s*\{[\s\S]*?aspect-ratio:\s*auto;[\s\S]*?min-height:\s*120px;[\s\S]*?\}/
        );
    });

    it('uses fade swap animations instead of exposing adjacent pages', () => {
        expect(componentsCss).toMatch(/\.social-links-page\.is-swap-fade\s*\{/);
        expect(componentsCss).toMatch(/\.social-links-page\.is-swap-fade\.is-animation-alt\s*\{/);
        expect(componentsCss).toMatch(/@keyframes social-page-fade/);
        expect(componentsCss).toMatch(/@keyframes social-page-fade-alt/);
        expect(componentsCss).not.toMatch(/scroll-snap-type:\s*x mandatory/);
        expect(componentsCss).not.toMatch(/overflow-x:\s*auto/);
    });
});
