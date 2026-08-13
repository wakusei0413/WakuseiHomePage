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
        // Performance contract: frosted glass is faked with *static
        // pre-blurred* wallpaper copies (.left-panel::before/::after) whose
        // blur is baked into the bitmap by SiteShell while the frame is still
        // preloading — no CSS filter and never a live backdrop-filter that
        // re-samples on every Ken Burns frame.
        expect(layoutCss).toMatch(/\.left-panel::before\s*\{[\s\S]*?var\(--glass-panel\)/);
        expect(layoutCss).toMatch(/\.left-panel::after\s*\{[\s\S]*?var\(--glass-panel-next\)/);
        // A wallpaper change crossfades the two texture slots via opacity
        // (.glass-swapping) instead of hard-swapping the surface. The state
        // class lives on the persisted shell root, not <html>, so Astro's
        // view-transition swap (which resets <html> attributes) never clears it.
        expect(layoutCss).toMatch(/\.glass-swapping \.left-panel::before\s*\{[\s\S]*?opacity:\s*0;/);
        expect(layoutCss).toMatch(/\.glass-swapping \.left-panel::after\s*\{[\s\S]*?opacity:\s*0\.18;/);
        expect(layoutCss).not.toMatch(/html\.glass-(swapping|kenburns|no-transition)/);
        expect(layoutCss).not.toMatch(/\.left-panel::before\s*\{[\s\S]*?filter:/);
        expect(layoutCss).not.toMatch(/\.left-panel\s*\{[\s\S]*?backdrop-filter:/);
    });

    it('mirrors the wallpaper Ken Burns zoom on the panel glass', () => {
        expect(layoutCss).toMatch(/@keyframes glass-kenburns/);
        expect(layoutCss).toMatch(
            /\.glass-kenburns \.left-panel::before[\s\S]*?animation:\s*glass-kenburns var\(--kenburns-duration,\s*8s\) infinite/
        );
        // The mirror is a pure transform animation — no filter re-rasterization.
        expect(layoutCss).not.toMatch(/\.glass-kenburns[^}]*filter:/);
        expect(siteShell).toContain('glass-kenburns');
        expect(siteShell).toContain('--kenburns-duration');
    });

    it('mirrors the wallpaper cover exactly (full-viewport box, not a re-crop)', () => {
        // The wallpaper is object-fit: cover on the full scene, so the glass
        // must paint the same cover on a full-viewport box anchored to the
        // panel's top-left — never `inset: -64px` (which re-cropped/squashed the
        // image to the narrow panel box).
        expect(layoutCss).toMatch(
            /\.left-panel::before,\s*\.left-panel::after\s*\{[\s\S]*?width:\s*100vw;[\s\S]*?height:\s*100vh;[\s\S]*?background-size:\s*cover;/
        );
        expect(layoutCss).not.toMatch(/\.left-panel::before,[\s\S]*?inset:\s*-64px/);
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
