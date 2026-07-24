import { clampScrollTop, normalizeWheelDelta } from '../lib/inertial-scroll';

const EASING = 0.16;
const WHEEL_DISTANCE = 0.82;
const SETTLE_DISTANCE = 0.5;

declare global {
    interface Window {
        __wakuseiInertialScrollInitialized?: boolean;
    }
}

function canScrollVertically(element: HTMLElement, delta: number): boolean {
    const style = window.getComputedStyle(element);
    if (!/(auto|scroll|overlay)/.test(style.overflowY)) return false;
    if (element.scrollHeight <= element.clientHeight) return false;
    return delta < 0 ? element.scrollTop > 0 : element.scrollTop < element.scrollHeight - element.clientHeight;
}

function hasScrollableAncestor(target: EventTarget | null, scroller: HTMLElement, delta: number): boolean {
    let element = target instanceof HTMLElement ? target : null;
    while (element && element !== scroller) {
        if (canScrollVertically(element, delta)) return true;
        element = element.parentElement;
    }
    return false;
}

function initInertialScroll() {
    if (window.__wakuseiInertialScrollInitialized) return;
    window.__wakuseiInertialScrollInitialized = true;

    const pageScroller = document.getElementById('pageScroller');
    if (!(pageScroller instanceof HTMLElement)) return;
    const scroller: HTMLElement = pageScroller;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let targetTop = scroller.scrollTop;
    let frame: number | undefined;
    let lastAppliedTop: number | undefined;

    function stopAnimation() {
        if (frame !== undefined) window.cancelAnimationFrame(frame);
        frame = undefined;
        lastAppliedTop = undefined;
    }

    function animate() {
        const currentTop = scroller.scrollTop;
        const distance = targetTop - currentTop;
        if (Math.abs(distance) <= SETTLE_DISTANCE) {
            lastAppliedTop = targetTop;
            scroller.scrollTop = targetTop;
            frame = undefined;
            return;
        }

        const nextTop = currentTop + distance * EASING;
        lastAppliedTop = nextTop;
        scroller.scrollTop = nextTop;
        frame = window.requestAnimationFrame(animate);
    }

    function scheduleAnimation() {
        if (frame === undefined) frame = window.requestAnimationFrame(animate);
    }

    function handleWheel(event: WheelEvent) {
        if (reducedMotion.matches || event.ctrlKey || event.shiftKey) return;
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

        const delta = normalizeWheelDelta(event.deltaY, event.deltaMode, scroller.clientHeight);
        if (delta === 0 || hasScrollableAncestor(event.target, scroller, delta)) return;

        const startTop = frame === undefined ? scroller.scrollTop : targetTop;
        const maximum = scroller.scrollHeight - scroller.clientHeight;
        const nextTop = clampScrollTop(startTop + delta * WHEEL_DISTANCE, maximum);
        if (nextTop === startTop) return;

        event.preventDefault();
        targetTop = nextTop;
        scheduleAnimation();
    }

    function syncExternalScroll() {
        if (lastAppliedTop !== undefined && Math.abs(scroller.scrollTop - lastAppliedTop) <= SETTLE_DISTANCE) return;
        targetTop = scroller.scrollTop;
        stopAnimation();
    }

    scroller.addEventListener('wheel', handleWheel, { passive: false });
    scroller.addEventListener('scroll', syncExternalScroll, { passive: true });
    window.addEventListener('pagehide', stopAnimation);
}

initInertialScroll();
