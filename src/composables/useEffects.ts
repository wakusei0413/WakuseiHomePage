import { onUnmounted } from 'vue';
import { enableContentProtection, initScrollAnimations, initMobileStickyAvatar } from '../lib/runtime-effects';

export function useEffects() {
    const cleanups: Array<() => void> = [];

    onUnmounted(() => {
        cleanups.forEach((fn) => fn());
        cleanups.length = 0;
    });

    function initContentProtection(enabled: boolean) {
        if (enabled) {
            cleanups.push(enableContentProtection(true));
        }
    }

    function initScrollReveal(delay: number, offset: number) {
        cleanups.push(initScrollAnimations(delay, offset));
    }

    function initMobileSticky(container: HTMLElement, avatarBox: HTMLElement) {
        cleanups.push(initMobileStickyAvatar(container, avatarBox));
    }

    return { initContentProtection, initScrollReveal, initMobileSticky };
}
