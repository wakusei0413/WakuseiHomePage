import { navigate } from 'astro:transitions/client';

// Matches internal hrefs that point at a homepage section, e.g. "/#posts".
const HASH_SECTION_RE = /^\/#(.+)$/;

export function isHashSectionHref(href: string): boolean {
    return HASH_SECTION_RE.test(href);
}

// Scrolls the custom page scroller so the element with `id` sits at the top
// of the viewport. Uses bounding-rect math instead of offsetTop, because the
// section's offsetParent is the relatively-positioned page-transition-surface,
// not the scroll container — offsetTop would only return the padding inside
// the surface and scroll to the wrong place.
function scrollPageScrollerToElement(id: string): boolean {
    const scroller = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    const target = document.getElementById(id);
    if (!(scroller instanceof HTMLElement) || !target) return false;
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset = targetRect.top - scrollerRect.top + scroller.scrollTop;
    scroller.scrollTo({ top: offset, behavior: 'smooth' });
    return true;
}

// Handles internal links that target a homepage section ("/#id").
// When already on the homepage it just scrolls; otherwise it navigates
// home and scrolls to the section once the new page has loaded.
// On a direct load (or browser back/forward) of "/#posts", the browser's
// native hash-scroll can't reach the section because it lives inside the custom
// #pageScroller scroll container, not the document. This scrolls it into view
// after layout settles. Safe to call on every page-load: it no-ops unless the
// URL is "/" with a non-empty hash whose target element exists.
export function initHashSectionScrollOnLoad(): void {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== '/') return;
    const id = window.location.hash.slice(1);
    if (!id) return;
    requestAnimationFrame(() =>
        requestAnimationFrame(() => {
            const scroller = document.getElementById('pageScroller');
            const target = document.getElementById(id);
            if (!(scroller instanceof HTMLElement) || !target) return;
            const scrollerRect = scroller.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            scroller.scrollTo({ top: targetRect.top - scrollerRect.top + scroller.scrollTop });
        })
    );
}

export function navigateToHashSection(href: string): void {
    const match = href.match(HASH_SECTION_RE);
    if (!match) return;
    const id = match[1];

    if (window.location.pathname === '/') {
        scrollPageScrollerToElement(id);
        return;
    }

    const onLoaded = () => {
        document.removeEventListener('astro:page-load', onLoaded);
        requestAnimationFrame(() => scrollPageScrollerToElement(id));
    };
    document.addEventListener('astro:page-load', onLoaded);
    navigate('/');
}
