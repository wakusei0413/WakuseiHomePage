/**
 * 文章图片灯箱 —— 点击 .post-body 内、不在链接中的图片放大查看。
 * 支持点击遮罩/ESC 关闭、左右键或按钮切换。监听 astro:page-load，
 * view transitions 切页后重新装饰。
 */

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

let images: HTMLImageElement[] = [];
let overlay: HTMLElement | null = null;
let overlayImg: HTMLImageElement | null = null;
let captionEl: HTMLElement | null = null;
let prevBtn: HTMLButtonElement | null = null;
let nextBtn: HTMLButtonElement | null = null;
let currentIndex = 0;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;
const TRANSITION = 220;

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

    keyHandler = (e: KeyboardEvent) => {
        if (!overlay || overlay.style.display === 'none') return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') prev();
        else if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', keyHandler);

    document.body.appendChild(overlay);
    return overlay;
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
        clearTimeout(closeTimer);
        closeTimer = null;
    }
    el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    showAt(index);
    // Force a frame so the opacity transition fires.
    requestAnimationFrame(() => el.classList.add('article-lightbox--visible'));
}

function close(): void {
    if (!overlay) return;
    overlay.classList.remove('article-lightbox--visible');
    document.body.style.overflow = '';
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
    }, TRANSITION);
}

function prev(): void {
    showAt(currentIndex - 1);
}

function next(): void {
    showAt(currentIndex + 1);
}

function enhance(): void {
    close();
    const body = document.querySelector('.post-body');
    images = body ? Array.from(body.querySelectorAll<HTMLImageElement>('img')).filter((img) => !img.closest('a')) : [];
    images.forEach((img, i) => {
        if (img.dataset.lightboxReady === '1') return;
        img.dataset.lightboxReady = '1';
        img.classList.add('lightbox-eligible');
        img.addEventListener('click', (e) => {
            e.preventDefault();
            open(i);
        });
    });
}

enhance();
document.addEventListener('astro:page-load', enhance);

export {};
