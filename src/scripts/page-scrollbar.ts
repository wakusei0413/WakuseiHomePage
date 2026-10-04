/**
 * 叠加式页面滚动条 —— #pageScroller 的原生滚动条被刻意隐藏（hero 用 100vw，
 * 原生滚动条会挤占宽度），这里在右缘画一条 position:fixed 的细滚动条：
 * 滚动/悬停时淡入、可拖动、点轨道跳转，静止后淡出。纯视觉增强（aria-hidden），
 * 键盘与读屏仍走原生滚动。触屏（pointer: coarse）不渲染。
 * 监听 astro:page-load，view transitions 切页后重新绑定。
 */
import { computeThumb, scrollTopForThumbOffset } from '../lib/page-scrollbar';

const SCROLLER_SELECTOR = '#pageScroller, .page-scroller';
const IDLE_HIDE_DELAY = 1000;

let track: HTMLElement | null = null;
let thumb: HTMLElement | null = null;
let scroller: HTMLElement | null = null;
let resizeObserver: ResizeObserver | null = null;
let frame: number | null = null;
let hideTimer: number | null = null;
let thumbSize = 0;
let dragOffset: number | null = null;
let cleanups: Array<() => void> = [];

function render() {
    frame = null;
    if (!track || !thumb || !scroller) return;
    const geometry = computeThumb(scroller.scrollTop, scroller.scrollHeight, scroller.clientHeight, track.clientHeight);
    track.classList.toggle('page-scrollbar--disabled', geometry === null);
    if (!geometry) return;
    thumbSize = geometry.size;
    thumb.style.height = geometry.size + 'px';
    thumb.style.transform = 'translateY(' + geometry.offset + 'px)';
}

function scheduleRender() {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(render);
}

function reveal() {
    if (!track) return;
    track.classList.add('page-scrollbar--active');
    if (hideTimer !== null) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
        hideTimer = null;
        if (dragOffset === null) track?.classList.remove('page-scrollbar--active');
    }, IDLE_HIDE_DELAY);
}

function scrollToThumbOffset(offset: number) {
    if (!track || !scroller) return;
    scroller.scrollTop = scrollTopForThumbOffset(
        offset,
        thumbSize,
        scroller.scrollHeight,
        scroller.clientHeight,
        track.clientHeight
    );
}

function onScroll() {
    scheduleRender();
    reveal();
}

function onTrackPointerDown(event: PointerEvent) {
    if (!track || !thumb || event.button !== 0) return;
    event.preventDefault();
    const trackTop = track.getBoundingClientRect().top;
    if (event.target === thumb) {
        dragOffset = event.clientY - thumb.getBoundingClientRect().top;
    } else {
        // 点轨道：让滑块中心落到点击处，然后继续按住即可拖动
        dragOffset = thumbSize / 2;
        scrollToThumbOffset(event.clientY - trackTop - dragOffset);
    }
    track.setPointerCapture(event.pointerId);
    track.classList.add('page-scrollbar--dragging');
    reveal();
}

function onTrackPointerMove(event: PointerEvent) {
    if (!track || dragOffset === null) return;
    scrollToThumbOffset(event.clientY - track.getBoundingClientRect().top - dragOffset);
}

function onTrackPointerUp(event: PointerEvent) {
    if (!track || dragOffset === null) return;
    dragOffset = null;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    track.classList.remove('page-scrollbar--dragging');
    reveal();
}

function ensureElements(): HTMLElement {
    if (track?.isConnected && thumb) return track;
    track = document.createElement('div');
    track.className = 'page-scrollbar page-scrollbar--disabled';
    track.setAttribute('aria-hidden', 'true');
    thumb = document.createElement('div');
    thumb.className = 'page-scrollbar__thumb';
    track.appendChild(thumb);
    document.body.appendChild(track);
    return track;
}

export function teardownPageScrollbar() {
    cleanups.forEach((cleanup) => cleanup());
    cleanups = [];
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    if (hideTimer !== null) window.clearTimeout(hideTimer);
    hideTimer = null;
    dragOffset = null;
    track?.remove();
    track = null;
    thumb = null;
    scroller = null;
}

export function bindPageScrollbar() {
    teardownPageScrollbar();
    if (window.matchMedia?.('(pointer: coarse)').matches) return;
    const el = document.querySelector<HTMLElement>(SCROLLER_SELECTOR);
    if (!(el instanceof HTMLElement)) return;
    scroller = el;
    const bar = ensureElements();

    const listen = <K extends keyof HTMLElementEventMap>(
        target: HTMLElement | Window,
        type: K,
        handler: (event: HTMLElementEventMap[K]) => void
    ) => {
        target.addEventListener(type, handler as EventListener, { passive: type === 'scroll' });
        cleanups.push(() => target.removeEventListener(type, handler as EventListener));
    };
    listen(el, 'scroll', onScroll);
    listen(window, 'resize', scheduleRender);
    listen(bar, 'pointerdown', onTrackPointerDown);
    listen(bar, 'pointermove', onTrackPointerMove);
    listen(bar, 'pointerup', onTrackPointerUp);
    listen(bar, 'pointercancel', onTrackPointerUp);
    listen(bar, 'pointerenter', reveal);

    // 评论等异步内容撑高页面时重算滑块
    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(scheduleRender);
        resizeObserver.observe(el);
        Array.from(el.children).forEach((child) => resizeObserver?.observe(child));
    }
    scheduleRender();
}

bindPageScrollbar();
document.addEventListener('astro:page-load', bindPageScrollbar);
