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

    it('keeps left-panel above the wallpaper with frosted paper', () => {
        expect(layoutCss).toMatch(/\.left-panel\s*\{[\s\S]*?z-index:\s*var\(--z-content,\s*50\);/);
        // Opaque paper base so the sharp animated wallpaper never leaks through.
        expect(layoutCss).toMatch(/\.left-panel\s*\{[\s\S]*?background-color:\s*var\(--panel-bg-solid\)/);
        // Performance contract: frosted glass is faked with a flat tint sampled
        // from the current wallpaper (--glass-panel-tint, written by SiteShell
        // on every wallpaper change) — no baked texture, no CSS filter, and
        // never a live backdrop-filter that re-samples on every Ken Burns frame.
        expect(layoutCss).toMatch(/\.left-panel::before\s*\{[\s\S]*?var\(--glass-panel-tint/);
        // A wallpaper change crossfades the tint via a background-color
        // transition in sync with the wallpaper's own crossfade. The tint var
        // lives on the persisted shell root, not <html>, so Astro's
        // view-transition swap (which resets <html> attributes) never clears it.
        expect(layoutCss).toMatch(/\.left-panel::before\s*\{[\s\S]*?transition:\s*background-color 0\.9s/);
        expect(layoutCss).not.toMatch(/html\.glass-(swapping|kenburns|no-transition)/);
        expect(layoutCss).not.toMatch(/\.left-panel::before\s*\{[\s\S]*?filter:/);
        expect(layoutCss).not.toMatch(/\.left-panel\s*\{[\s\S]*?backdrop-filter:/);
    });

    it('paints the panel glass as a flat tint, not a texture', () => {
        // A tint has no geometry, so it can never drift out of sync with the
        // wallpaper — no cover mirror, no Ken Burns mirror, no texture slots.
        expect(layoutCss).not.toMatch(/\.left-panel::before\s*\{[\s\S]*?background-image:/);
        expect(layoutCss).not.toMatch(/\.left-panel::after/);
        expect(layoutCss).not.toMatch(/@keyframes glass-kenburns/);
        expect(layoutCss).not.toMatch(/\.glass-kenburns/);
        expect(layoutCss).not.toMatch(/--kenburns-duration/);
        expect(layoutCss).not.toMatch(/\.glass-swapping/);
        expect(layoutCss).not.toMatch(/\.glass-no-transition/);
        expect(siteShell).toContain('sampleGlassTints');
        expect(siteShell).toContain('--glass-panel-tint');
        expect(siteShell).not.toContain('glass-kenburns');
        expect(siteShell).not.toContain('glass-swapping');
    });

    it('keeps page content above hero and wallpaper', () => {
        expect(layoutCss).toContain('.homepage-content');
        expect(layoutCss).toContain('.homepage-section-title');
        expect(layoutCss).toContain('.homepage-section-lead');
    });

    it('crossfades wallpaper layers with a smooth opacity transition', () => {
        expect(layoutCss).toMatch(/\.wallpaper-image\s*\{[\s\S]*?transition:\s*opacity[^;]*;/);
        expect(layoutCss).toMatch(/\.wallpaper-image\.active\s*\{[\s\S]*?opacity:\s*1;/);
    });

    it('shortens the crossfade when the user prefers reduced motion', () => {
        expect(layoutCss).toMatch(
            /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[\s\S]*?\.wallpaper-image[\s\S]*?transition-duration:\s*0\.4s;/
        );
    });
});
