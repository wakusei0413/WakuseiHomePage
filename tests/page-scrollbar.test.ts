import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MIN_THUMB_SIZE, computeThumb, scrollTopForThumbOffset } from '../src/lib/page-scrollbar';
import { bindPageScrollbar, teardownPageScrollbar } from '../src/scripts/page-scrollbar';

const baseLayout = readFileSync(join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
const transitionsCss = readFileSync(join(process.cwd(), 'src', 'styles', 'transitions.css'), 'utf8');

describe('page scrollbar: geometry', () => {
    it('returns null when content does not overflow', () => {
        expect(computeThumb(0, 800, 800, 800)).toBeNull();
        expect(computeThumb(0, 500, 800, 800)).toBeNull();
        expect(computeThumb(0, 2000, 800, 0)).toBeNull();
    });

    it('sizes the thumb by the visible ratio and positions it by scroll progress', () => {
        expect(computeThumb(0, 1600, 800, 800)).toEqual({ size: 400, offset: 0 });
        expect(computeThumb(400, 1600, 800, 800)).toEqual({ size: 400, offset: 200 });
        expect(computeThumb(800, 1600, 800, 800)).toEqual({ size: 400, offset: 400 });
    });

    it('enforces a minimum thumb size on very long pages and clamps overscroll', () => {
        const geometry = computeThumb(99999, 100000, 800, 800);
        expect(geometry?.size).toBe(MIN_THUMB_SIZE);
        expect(geometry?.offset).toBe(800 - MIN_THUMB_SIZE);
        expect(computeThumb(-50, 1600, 800, 800)?.offset).toBe(0);
    });

    it('maps a thumb offset back to scrollTop (inverse of computeThumb)', () => {
        expect(scrollTopForThumbOffset(0, 400, 1600, 800, 800)).toBe(0);
        expect(scrollTopForThumbOffset(200, 400, 1600, 800, 800)).toBe(400);
        expect(scrollTopForThumbOffset(9999, 400, 1600, 800, 800)).toBe(800);
        expect(scrollTopForThumbOffset(-10, 400, 1600, 800, 800)).toBe(0);
        expect(scrollTopForThumbOffset(10, 800, 1600, 800, 800)).toBe(0);
    });
});

describe('page scrollbar: lifecycle', () => {
    afterEach(() => {
        teardownPageScrollbar();
        document.body.innerHTML = '';
    });

    it('injects one aria-hidden track per bind and removes it on teardown', () => {
        document.body.innerHTML = '<div id="pageScroller" class="page-scroller"><div></div></div>';
        bindPageScrollbar();
        bindPageScrollbar();
        const tracks = document.querySelectorAll('.page-scrollbar');
        expect(tracks).toHaveLength(1);
        expect(tracks[0].getAttribute('aria-hidden')).toBe('true');
        expect(tracks[0].querySelector('.page-scrollbar__thumb')).not.toBeNull();
        teardownPageScrollbar();
        expect(document.querySelector('.page-scrollbar')).toBeNull();
    });

    it('does nothing without a page scroller', () => {
        bindPageScrollbar();
        expect(document.querySelector('.page-scrollbar')).toBeNull();
    });
});

describe('page scrollbar: wiring', () => {
    it('loads site-wide from the base layout', () => {
        expect(baseLayout).toContain("import '../scripts/page-scrollbar';");
    });

    it('keeps the native scrollbar hidden and styles the overlay with tokens', () => {
        expect(transitionsCss).toContain('scrollbar-width: none;');
        expect(transitionsCss).toContain('.page-scrollbar--disabled');
        expect(transitionsCss).toContain('color-mix(in srgb, var(--fg)');
        expect(transitionsCss).toContain('@media (prefers-reduced-motion: reduce)');
    });
});
