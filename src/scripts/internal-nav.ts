/**
 * 内部链接 —— 直接 navigate 切页（新页在 after-swap 滚顶）
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
        navigate(href);
    });
}

function enhanceInternalLinks(root: ParentNode): void {
    root.querySelectorAll<HTMLAnchorElement>('a.back-link, a[data-internal-nav]').forEach(bindLink);
}

enhanceInternalLinks(document.body);
document.addEventListener('astro:page-load', () => enhanceInternalLinks(document.body));
