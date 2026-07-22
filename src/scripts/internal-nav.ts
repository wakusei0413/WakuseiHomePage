/**
 * 内部链接 —— 先平滑滚到顶部，再 navigate 切页
 * 监听 astro:page-load，确保 view transitions 切页后重新绑定
 */

import { navigate } from 'astro:transitions/client';
import { isHashSectionHref, navigateToHashSection } from '../lib/section-nav';

function isExternalLink(href: string): boolean {
    // Protocol-relative (//host), absolute (https://), and non-http schemes.
    return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(href) || /^(?:mailto|tel):/i.test(href);
}

function shouldHandleNavigationClick(event: MouseEvent, anchor: HTMLAnchorElement): boolean {
    return (
        event.button === 0 &&
        !event.defaultPrevented &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        !anchor.hasAttribute('download') &&
        (!anchor.target || anchor.target === '_self')
    );
}

function scrollCurrentPageToTop(): Promise<void> {
    const s = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    if (s) {
        s.scrollTo({ top: 0, behavior: 'smooth' });
        return new Promise((resolve) => {
            const fallback = window.setTimeout(resolve, 1200);
            const onScrollEnd = () => {
                if (s.scrollTop <= 0) {
                    s.removeEventListener('scroll', onScrollEnd);
                    clearTimeout(fallback);
                    resolve();
                }
            };
            s.addEventListener('scroll', onScrollEnd, { passive: true });
            if (s.scrollTop <= 0) {
                s.removeEventListener('scroll', onScrollEnd);
                clearTimeout(fallback);
                resolve();
            }
        });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    return Promise.resolve();
}

function bindLink(a: HTMLAnchorElement): void {
    if (a.dataset.scrollNav === '1') return;
    a.dataset.scrollNav = '1';
    a.addEventListener('click', (e: MouseEvent) => {
        if (!shouldHandleNavigationClick(e, a)) return;
        const href = a.getAttribute('href');
        if (!href || isExternalLink(href)) return;
        e.preventDefault();
        if (isHashSectionHref(href)) {
            navigateToHashSection(href);
            return;
        }
        scrollCurrentPageToTop().then(() => navigate(href));
    });
}

function enhanceInternalLinks(root: ParentNode): void {
    root.querySelectorAll<HTMLAnchorElement>('a.back-link, a[data-internal-nav]').forEach(bindLink);
}

enhanceInternalLinks(document.body);
document.addEventListener('astro:page-load', () => enhanceInternalLinks(document.body));
