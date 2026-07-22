import { ref, onMounted, onUnmounted } from 'vue';
import { createSloganSelector } from '../lib/slogan-selector';
import type { SlogansConfig } from '../types/site';

export function useSlogan(config: SlogansConfig) {
    // Render the first slogan immediately (SSR) so the bio has content at first paint.
    // The typing animation only runs when cycling to the *next* slogan, which keeps the
    // growing bio text from becoming a late Largest Contentful Paint element.
    const text = ref(config.list[0] ?? '');
    const cursorDimmed = ref(false);
    const isIdle = ref(false);
    let timerId: ReturnType<typeof setTimeout> | undefined;
    let isActive = true;

    // setTimeout (not a requestAnimationFrame polling loop) keeps typing steps off the
    // main thread between frames and avoids burning CPU during the load window.
    function schedule(delay: number, task: () => void) {
        timerId = setTimeout(() => {
            timerId = undefined;
            if (isActive) task();
        }, delay);
    }

    onMounted(() => {
        const selector = createSloganSelector(config.mode, config.list);
        // The first slogan is already shown; advance the selector past it so the cycle
        // begins with the second slogan.
        selector.next();

        let charIndex = text.value.length;

        const typeSlogan = (next: string) => {
            charIndex = 0;
            isIdle.value = false;
            const type = () => {
                if (!isActive) return;
                if (charIndex < next.length) {
                    charIndex += 1;
                    text.value = next.slice(0, charIndex);
                    schedule(config.typeSpeed, type);
                    return;
                }
                if (!config.loop) {
                    cursorDimmed.value = true;
                    isIdle.value = true;
                    return;
                }
                isIdle.value = true;
                schedule(config.pauseDuration, () => {
                    isIdle.value = false;
                    deleteSlogan();
                });
            };
            type();
        };

        const deleteSlogan = () => {
            if (!isActive) return;
            if (charIndex > 0) {
                charIndex -= 1;
                text.value = text.value.slice(0, charIndex);
                schedule(20, deleteSlogan);
                return;
            }
            schedule(300, () => typeSlogan(selector.next().text));
        };

        // Idle on the first slogan, then start cycling to the next one.
        isIdle.value = true;
        if (config.loop && config.list.length > 1) {
            schedule(config.pauseDuration, deleteSlogan);
        }
    });

    onUnmounted(() => {
        isActive = false;
        if (timerId !== undefined) clearTimeout(timerId);
    });

    return { text, cursorDimmed, isIdle };
}
