import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { scrollToHeading, computeFollowScroll, TOC_TOP_OFFSET } from '../src/lib/toc';

const tocComponent = readFileSync('src/components/ArticleToc.vue', 'utf8');

function makeRect(top: number) {
    return {
        top,
        left: 0,
        right: 0,
        bottom: top,
        width: 0,
        height: 0,
        x: 0,
        y: top,
        toJSON() {
            return this;
        }
    } as DOMRect;
}

describe('TOC scrollspy alignment (click highlight bug)', () => {
    let scroller: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = '<div id="pageScroller"></div>';
        scroller = document.getElementById('pageScroller') as HTMLElement;
        // The scroller is pinned to the viewport top; its scrollTop is the page
        // scroll position we drive through the stubbed scrollTo below.
        scroller.getBoundingClientRect = (() => makeRect(0)) as () => DOMRect;
        scroller.scrollTo = ((opts: ScrollToOptions | number) => {
            const top = typeof opts === 'number' ? opts : (opts?.top ?? 0);
            scroller.scrollTop = top;
        }) as (typeof scroller)['scrollTo'];
        scroller.scrollTop = 0;
    });

    it('exports a TOC_TOP_OFFSET that matches the TopBar band (72px bar + gap)', () => {
        expect(TOC_TOP_OFFSET).toBe(96);
    });

    it('ArticleToc builds its IntersectionObserver band from TOC_TOP_OFFSET', () => {
        // Keeps the active-detection band and the scroll destination in sync so
        // a clicked heading lands inside the band instead of just above it.
        expect(tocComponent).toContain('TOC_TOP_OFFSET');
        expect(tocComponent).toContain('rootMargin: `-${TOC_TOP_OFFSET}px 0px -55% 0px`');
    });

    it('defers expensive TOC layout reads until the article is actually being read', () => {
        expect(tocComponent).toContain('if (bodyActive.value && !layoutMeasureCancel) scheduleLayoutMeasure();');
        expect(tocComponent).toContain(
            'if (!layoutMeasured && !bodyActive.value && !scrollerElement?.scrollTop) return;'
        );
    });

    it('scrollToHeading lands the clicked heading at the band top, not flush at y=0', () => {
        // A heading sitting 600px down the viewport, scroller at the top.
        const heading = document.createElement('h2');
        heading.id = 'section';
        heading.getBoundingClientRect = (() => makeRect(600)) as () => DOMRect;
        document.body.appendChild(heading);

        scrollToHeading('section');

        const absoluteTop = 600; // targetRect.top - scrollerRect.top + scrollTop
        // After scrolling, the heading's viewport position is absoluteTop - scrollTop.
        // It must equal TOC_TOP_OFFSET so the heading sits inside the observer band
        // (previously it landed at 0px, above the band, so the *next* heading lit up).
        expect(absoluteTop - scroller.scrollTop).toBe(TOC_TOP_OFFSET);
        expect(scroller.scrollTop).toBe(Math.max(0, absoluteTop - TOC_TOP_OFFSET));
    });

    it('does not scroll above the top of the page when the heading is near the top', () => {
        const heading = document.createElement('h2');
        heading.id = 'near-top';
        heading.getBoundingClientRect = (() => makeRect(50)) as () => DOMRect;
        document.body.appendChild(heading);

        scrollToHeading('near-top');

        // No negative scroll: clamped to 0.
        expect(scroller.scrollTop).toBe(0);
    });
});

describe('TOC auto-follow centering (computeFollowScroll)', () => {
    const pane = { top: 100, bottom: 500 };
    const headerH = 56;
    // usable area: top = 100 + 56 + 12 = 168, bottom = 500 - 12 = 488, center = 328

    it('returns 0 when the active item is already centered', () => {
        const li = { top: 310, bottom: 346 }; // center 328
        expect(computeFollowScroll(li, pane, headerH)).toBe(0);
    });

    it('recenters downward when the active item is below the usable area', () => {
        const li = { top: 682, bottom: 718 }; // center 700 -> delta +372
        expect(computeFollowScroll(li, pane, headerH)).toBe(372);
    });

    it('recenters upward when the active item is above the header', () => {
        const li = { top: 62, bottom: 98 }; // center 80 -> delta -248
        expect(computeFollowScroll(li, pane, headerH)).toBe(-248);
    });

    it('respects the custom margin', () => {
        const li = { top: 682, bottom: 718 };
        // margin 24 -> usable top 180, bottom 476, center 328 -> delta +372
        expect(computeFollowScroll(li, pane, headerH, 24)).toBe(372);
    });
});
