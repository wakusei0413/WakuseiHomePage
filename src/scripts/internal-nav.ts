/**
 * 内部链接 —— 直接 navigate 切页（新页在 after-swap 滚顶）
 * 监听 astro:page-load，确保 view transitions 切页后重新绑定
 */

import { navigate } from 'astro:transitions/client';
import { isExternalHref, shouldEnhanceAnchorClick } from '../lib/navigation-click';
import { isHashSectionHref, navigateToHashSection } from '../lib/section-nav';

function bindLink(a: HTMLAnchorElement): void {
    if (a.dataset.scrollNav === '1') return;
    a.dataset.scrollNav = '1';
    a.addEventListener('click', (e: MouseEvent) => {
        if (!shouldEnhanceAnchorClick(e, a)) return;
        const href = a.getAttribute('href');
        if (!href || isExternalHref(href)) return;
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
