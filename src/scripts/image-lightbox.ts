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

function showAt(index: number): void {
    if (!images.length) return;
    currentIndex = (index + images.length) % images.length;
    const img = images[currentIndex];
    if (overlayImg) {
        overlayImg.src = img.currentSrc || img.src;
        overlayImg.alt = img.alt || '';
    }
    if (captionEl) captionEl.textContent = img.alt || '';
    if (prevBtn) prevBtn.disabled = images.length <= 1;
    if (nextBtn) nextBtn.disabled = images.length <= 1;
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
