export interface TocItem {
    id: string;
    level: 2 | 3;
    title: string;
    children: TocItem[];
}

// Px reserved at the top of the scroller viewport for the fixed TopBar (72px)
// plus a small breathing gap. This must stay in sync with the
// IntersectionObserver rootMargin top in ArticleToc.vue: a heading scrolled to
// via scrollToHeading has to land *inside* the active-detection band rather than
// above it, otherwise the heading below the clicked one gets highlighted.
export const TOC_TOP_OFFSET = 96;

// Strips the rehype-autolink-headings "#" anchor text so the TOC shows the
// clean heading title.
export function getHeadingTitle(el: HTMLElement): string {
    return (el.textContent || '').replace(/#\s*$/, '').trim();
}

// Builds a two-level tree (h2 entries with their h3 children) from a flat list.
export function buildTocTree(headings: { id: string; level: 2 | 3; title: string }[]): TocItem[] {
    const tree: TocItem[] = [];
    let current: TocItem | null = null;
    for (const h of headings) {
        const item: TocItem = { id: h.id, level: h.level, title: h.title, children: [] };
        if (h.level === 2) {
            tree.push(item);
            current = item;
        } else if (current) {
            current.children.push(item);
        } else {
            // h3 before any h2: promote to top level.
            tree.push(item);
        }
    }
    return tree;
}

// Scrolls the custom page scroller so the heading with `id` sits at the top of
// the active-detection band (TOC_TOP_OFFSET from the viewport top) rather than
// flush against the very top. Landing flush at y=0 leaves the heading *above*
// the IntersectionObserver band, so the next heading would be marked active
// instead of the one the reader clicked. Interrupts any in-flight smooth scroll
// first so rapid clicks do not queue up.
export function scrollToHeading(id: string): void {
    const scroller = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    const target = document.getElementById(id);
    if (!(scroller instanceof HTMLElement) || !target) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset = targetRect.top - scrollerRect.top + scroller.scrollTop - TOC_TOP_OFFSET;
    scroller.scrollTo({ top: scroller.scrollTop });
    scroller.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
}

// Returns the delta to add to a TOC panel's scrollTop so the active item is
// centered in the usable area (below the sticky header). Called on each active-
// heading change; the panel then tracks the reader's position instead of
// merely pinning the active item to the bottom edge. The browser clamps the
// resulting scrollTop to the valid scroll range, so the first/last items settle
// at the top/bottom rather than forcing empty scroll space.
export function computeFollowScroll(
    liRect: { top: number; bottom: number },
    paneRect: { top: number; bottom: number },
    headerHeight: number,
    margin = 12
): number {
    const usableTop = paneRect.top + headerHeight + margin;
    const usableBottom = paneRect.bottom - margin;
    const liCenter = liRect.top + (liRect.bottom - liRect.top) / 2;
    const usableCenter = (usableTop + usableBottom) / 2;
    return Math.round(liCenter - usableCenter);
}
