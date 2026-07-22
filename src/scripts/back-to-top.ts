/**
 * 返回顶部浮控 —— 文章页滚动超过阈值后，左下角出现一个圆形按钮，点击平滑
 * 滚回 #pageScroller 顶部。监听 astro:page-load，切页后重新绑定。
 */

const THRESHOLD = 480;
const SCROLLER_SELECTOR = '#pageScroller, .page-scroller';

let btn: HTMLElement | null = null;
let scrollerEl: HTMLElement | null = null;
let scrollHandler: (() => void) | null = null;
let clickHandler: (() => void) | null = null;

function getScroller(): HTMLElement | null {
    const el = document.querySelector<HTMLElement>(SCROLLER_SELECTOR);
    return el instanceof HTMLElement ? el : null;
}

function update(): void {
    if (!btn || !scrollerEl) return;
    btn.classList.toggle('back-to-top--visible', scrollerEl.scrollTop > THRESHOLD);
}

function teardown(): void {
    if (scrollHandler && scrollerEl) scrollerEl.removeEventListener('scroll', scrollHandler);
    if (clickHandler && btn) btn.removeEventListener('click', clickHandler);
    scrollHandler = null;
    clickHandler = null;
    btn = null;
    scrollerEl = null;
}

function bind(): void {
    teardown();
    btn = document.querySelector<HTMLElement>('.back-to-top');
    scrollerEl = getScroller();
    if (!btn || !scrollerEl) return;
    scrollHandler = update;
    clickHandler = () => scrollerEl?.scrollTo({ top: 0, behavior: 'smooth' });
    scrollerEl.addEventListener('scroll', scrollHandler, { passive: true });
    btn.addEventListener('click', clickHandler);
    update();
}

bind();
document.addEventListener('astro:page-load', bind);

export {};
