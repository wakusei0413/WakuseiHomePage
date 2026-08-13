/**
 * 文章阅读进度条 —— 监听 #pageScroller 滚动，按 .post-body 在视口中的位置
 * 计算 0-1 进度，写入 .reading-progress__fill 的 transform。只在文章页生效
 * （.post-body 与 .reading-progress__fill 同时存在时才绑定）。
 * 监听 astro:page-load，view transitions 切页后重新绑定。
 */

const FILL_SELECTOR = '.reading-progress__fill';
const SCROLLER_SELECTOR = '#pageScroller, .page-scroller';

function getScroller(): HTMLElement | null {
    const el = document.querySelector<HTMLElement>(SCROLLER_SELECTOR);
    return el instanceof HTMLElement ? el : null;
}

function getPostBody(): HTMLElement | null {
    const el = document.querySelector<HTMLElement>('.post-body');
    return el instanceof HTMLElement ? el : null;
}

// 用 bounding-rect 算比例（与 toc.ts / section-nav.ts 同理，避免 offsetTop 走错
// offsetParent）。start = body 顶部对齐视口顶部时的 scrollTop；end = body
// 底部对齐视口底部（读完）时的 scrollTop。
function computeProgress(scroller: HTMLElement, body: HTMLElement): number {
    const sRect = scroller.getBoundingClientRect();
    const bRect = body.getBoundingClientRect();
    const vh = sRect.height;
    if (vh <= 0) return 0;
    const start = bRect.top - sRect.top + scroller.scrollTop;
    const end = bRect.bottom - sRect.top + scroller.scrollTop - vh;
    if (end <= start) return 1;
    const p = (scroller.scrollTop - start) / (end - start);
    if (!Number.isFinite(p)) return 0;
    return Math.max(0, Math.min(1, p));
}

let fillEl: HTMLElement | null = null;
let scrollerEl: HTMLElement | null = null;
let bodyEl: HTMLElement | null = null;
let scrollHandler: (() => void) | null = null;
let resizeHandler: (() => void) | null = null;
let frame: number | null = null;

function applyProgress() {
    if (!fillEl || !scrollerEl || !bodyEl) return;
    fillEl.style.transform = 'scaleX(' + computeProgress(scrollerEl, bodyEl) + ')';
}

// Coalesce to one update per animation frame: the scroller fires many scroll
// events per frame, and each computeProgress call reads two bounding rects
// (forced layout). Running it once per frame keeps the article scroll path cheap.
function scheduleProgress() {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(() => {
        frame = null;
        applyProgress();
    });
}

function teardown() {
    if (scrollHandler && scrollerEl) scrollerEl.removeEventListener('scroll', scrollHandler);
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
    }
    scrollHandler = null;
    resizeHandler = null;
    fillEl = null;
    scrollerEl = null;
    bodyEl = null;
}

function bind() {
    teardown();
    fillEl = document.querySelector<HTMLElement>(FILL_SELECTOR);
    scrollerEl = getScroller();
    bodyEl = getPostBody();
    if (!fillEl || !scrollerEl || !bodyEl) return;
    scrollHandler = scheduleProgress;
    resizeHandler = scheduleProgress;
    scrollerEl.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', resizeHandler, { passive: true });
    applyProgress();
}

bind();
document.addEventListener('astro:page-load', bind);

export {};
