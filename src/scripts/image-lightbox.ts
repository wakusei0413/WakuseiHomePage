/** 文章图片灯箱：由 article-runtime 在空闲阶段装饰。 */

const CLOSE_ICON =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M6 6l12 12M18 6L6 18"/></svg>';

const PREV_ICON =
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M15 6l-6 6 6 6"/></svg>';

const NEXT_ICON =
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M9 6l6 6-6 6"/></svg>';

const TRANSITION = 220;
const SWAP_OUT_MS = 120;
const WARM_TIMEOUT_MS = 1500;

let activeRoot: HTMLElement | null = null;
let listenerController: AbortController | null = null;
let images: HTMLImageElement[] = [];
let overlay: HTMLElement | null = null;
let overlayImg: HTMLImageElement | null = null;
let captionEl: HTMLElement | null = null;
let prevBtn: HTMLButtonElement | null = null;
let nextBtn: HTMLButtonElement | null = null;
let currentIndex = 0;
let closeTimer: number | null = null;
let openFrame: number | null = null;
let lockedBody: HTMLElement | null = null;
let previousBodyOverflow = '';
let swapToken = 0;

/**
 * In-flight `warmImage` results, keyed by URL. Warming does the network fetch
 * *and* the decode ahead of time, so the swap that follows is a cached paint
 * instead of a fetch-then-decode on the main thread.
 */
const warmed = new Map<string, Promise<void>>();
const warmTimers = new Set<number>();

function prefersReducedMotion(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Resolves once `src` is fetched and decoded. `load` and `error` both settle it,
 * and a timeout backstops a request that never settles — the UI must never be
 * held hostage by a warm-up, so a late or failed warm just means the swap falls
 * back to the browser's own timing.
 */
function warmImage(src: string): Promise<void> {
    const cached = warmed.get(src);
    if (cached) return cached;

    const promise = new Promise<void>((resolve) => {
        const image = new Image();
        image.decoding = 'async';
        const finish = () => resolve();
        const timer = window.setTimeout(() => {
            warmTimers.delete(timer);
            finish();
        }, WARM_TIMEOUT_MS);
        warmTimers.add(timer);
        const settle = () => {
            window.clearTimeout(timer);
            warmTimers.delete(timer);
            finish();
        };

        image.onload = () => {
            if (typeof image.decode === 'function') {
                image.decode().then(settle, settle);
                return;
            }
            settle();
        };
        image.onerror = settle;
        image.src = src;
    });

    warmed.set(src, promise);
    return promise;
}

function ensureOverlay(): HTMLElement {
    if (overlay) {
        if (!overlay.isConnected) document.body.appendChild(overlay);
        return overlay;
    }

    overlay = document.createElement('div');
    overlay.className = 'article-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '图片预览');
    overlay.innerHTML =
        '<button type="button" class="article-lightbox__close" aria-label="关闭"></button>' +
        '<button type="button" class="article-lightbox__nav article-lightbox__nav--prev" aria-label="上一张"></button>' +
        '<img class="article-lightbox__img" alt="" />' +
        '<p class="article-lightbox__caption"></p>' +
        '<button type="button" class="article-lightbox__nav article-lightbox__nav--next" aria-label="下一张"></button>';

    overlayImg = overlay.querySelector<HTMLImageElement>('.article-lightbox__img');
    captionEl = overlay.querySelector<HTMLParagraphElement>('.article-lightbox__caption');
    prevBtn = overlay.querySelector<HTMLButtonElement>('.article-lightbox__nav--prev');
    nextBtn = overlay.querySelector<HTMLButtonElement>('.article-lightbox__nav--next');
    const closeBtn = overlay.querySelector<HTMLButtonElement>('.article-lightbox__close');

    closeBtn!.innerHTML = CLOSE_ICON;
    prevBtn!.innerHTML = PREV_ICON;
    nextBtn!.innerHTML = NEXT_ICON;

    closeBtn!.addEventListener('click', close);
    prevBtn!.addEventListener('click', (e) => {
        e.stopPropagation();
        prev();
    });
    nextBtn!.addEventListener('click', (e) => {
        e.stopPropagation();
        next();
    });
    // Click on the backdrop (not the image/nav) closes; image click advances.
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
    if (overlayImg) {
        overlayImg.addEventListener('click', (e) => {
            e.stopPropagation();
            next();
        });
    }

    document.body.appendChild(overlay);
    return overlay;
}

function restoreBodyOverflow(): void {
    if (!lockedBody) return;
    lockedBody.style.overflow = previousBodyOverflow;
    lockedBody = null;
    previousBodyOverflow = '';
}

/**
 * Pre-fetches and decodes the images on either side of the current one. The
 * body images are themselves `loading="lazy"`, so by the time the reader has
 * scrolled to the one they clicked, the neighbours are usually already in the
 * HTTP cache — warming them then costs a decode, not a round trip.
 */
function warmNeighbours(): void {
    if (images.length <= 1) return;
    for (const offset of [1, -1]) {
        const neighbour = images[(currentIndex + offset + images.length) % images.length];
        if (neighbour) void warmImage(neighbour.currentSrc || neighbour.src);
    }
}

/**
 * Swaps the overlay image through a short fade-out / fade-in instead of a hard
 * cut. Two things make it read as smooth rather than as a flicker:
 *   - the target is warmed first, so the `src` assignment paints from cache;
 *   - the new `src` is committed while opacity is 0, which hides the box
 *     resizing to the new image's aspect ratio.
 */
async function swapImage(src: string, alt: string): Promise<void> {
    if (!overlayImg || overlayImg.getAttribute('src') === src) return;

    const token = ++swapToken;
    await warmImage(src);
    if (token !== swapToken || !overlayImg) return;

    // Nothing to fade out on the overlay's first frame (and reduced motion asks
    // for no fade at all) — the bitmap is already decoded, so committing it
    // straight away is a clean paint. The overlay's own fade-in supplies the
    // entrance on open.
    if (!overlayImg.getAttribute('src') || prefersReducedMotion()) {
        overlayImg.src = src;
        overlayImg.alt = alt;
        return;
    }

    overlayImg.classList.add('article-lightbox__img--swapping');
    await new Promise<void>((resolve) => window.setTimeout(resolve, SWAP_OUT_MS));
    if (token !== swapToken || !overlayImg) return;

    overlayImg.src = src;
    overlayImg.alt = alt;
    // Let the browser paint one frame at opacity 0 so the box can resize to the
    // new aspect ratio unobserved, then fade the image back in.
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    if (token !== swapToken || !overlayImg) return;

    overlayImg.classList.remove('article-lightbox__img--swapping');
}

function showAt(index: number): void {
    if (!images.length) return;
    currentIndex = (index + images.length) % images.length;
    const img = images[currentIndex];
    // Caption, alt and button state update synchronously; only the bitmap swap
    // is deferred behind the warm-up and the fade.
    if (overlayImg) overlayImg.alt = img.alt || '';
    if (captionEl) captionEl.textContent = img.alt || '';
    if (prevBtn) prevBtn.disabled = images.length <= 1;
    if (nextBtn) nextBtn.disabled = images.length <= 1;

    void swapImage(img.currentSrc || img.src, img.alt || '');
    warmNeighbours();
}

function open(index: number): void {
    if (!images.length) return;
    const el = ensureOverlay();
    if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
    }
    if (openFrame !== null) window.cancelAnimationFrame(openFrame);
    el.style.display = 'flex';
    if (!lockedBody) {
        lockedBody = document.body;
        previousBodyOverflow = lockedBody.style.overflow;
    }
    lockedBody.style.overflow = 'hidden';
    showAt(index);
    openFrame = window.requestAnimationFrame(() => {
        openFrame = null;
        if (el.style.display !== 'none') el.classList.add('article-lightbox--visible');
    });
}

function close(): void {
    if (openFrame !== null) {
        window.cancelAnimationFrame(openFrame);
        openFrame = null;
    }
    restoreBodyOverflow();
    if (!overlay) return;
    overlay.classList.remove('article-lightbox--visible');
    if (closeTimer) window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
        closeTimer = null;
        if (overlay) overlay.style.display = 'none';
    }, TRANSITION);
}

function prev(): void {
    showAt(currentIndex - 1);
}

function next(): void {
    showAt(currentIndex + 1);
}

function onRootClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !activeRoot || !activeRoot.contains(target)) return;
    if (!target.classList.contains('lightbox-eligible')) return;

    const index = images.indexOf(target);
    if (index < 0) return;
    event.preventDefault();
    open(index);
}

function onKeydown(event: KeyboardEvent): void {
    if (!overlay || overlay.style.display === 'none') return;
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowLeft') prev();
    else if (event.key === 'ArrowRight') next();
}

export function teardownImageLightbox(): void {
    listenerController?.abort();
    listenerController = null;
    activeRoot = null;
    images = [];
    // Invalidate any in-flight swap so a late warm-up cannot write into the
    // next article's overlay, and drop the warm-up bookkeeping with it.
    swapToken += 1;
    warmed.clear();
    warmTimers.forEach((timer) => window.clearTimeout(timer));
    warmTimers.clear();
    if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
    }
    if (openFrame !== null) {
        window.cancelAnimationFrame(openFrame);
        openFrame = null;
    }
    restoreBodyOverflow();
    overlay?.classList.remove('article-lightbox--visible');
    overlayImg?.classList.remove('article-lightbox__img--swapping');
    // Drop the bitmap too: the overlay is reused across navigations, and a stale
    // `src` would both flash the previous article's image and make the next open
    // take the crossfade path instead of a clean first paint.
    overlayImg?.removeAttribute('src');
    if (overlay) overlay.style.display = 'none';
}

export function enhanceImageLightbox(root: HTMLElement): void {
    if (activeRoot === root && listenerController) return;

    teardownImageLightbox();
    activeRoot = root;
    images = Array.from(root.querySelectorAll<HTMLImageElement>('img')).filter((image) => !image.closest('a'));
    images.forEach((image) => image.classList.add('lightbox-eligible'));

    listenerController = new AbortController();
    root.addEventListener('click', onRootClick, { signal: listenerController.signal });
    document.addEventListener('keydown', onKeydown, { signal: listenerController.signal });
}
