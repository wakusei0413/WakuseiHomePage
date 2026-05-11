import { ref, onMounted, onUnmounted } from 'vue';
import { createSloganSelector } from '../lib/slogan-selector';
import type { SlogansConfig } from '../types/site';

export function useSlogan(config: SlogansConfig) {
    const text = ref('');
    const cursorDimmed = ref(false);
    const isIdle = ref(false);
    let frameId: number | undefined;
    let isActive = true;

    function schedule(delay: number, task: () => void) {
        const targetTime = performance.now() + delay;
        const tick = (now: number) => {
            if (!isActive) return;
            if (now >= targetTime) {
                frameId = undefined;
                task();
                return;
            }
            frameId = requestAnimationFrame(tick);
        };
        frameId = requestAnimationFrame(tick);
    }

    onMounted(() => {
        const selector = createSloganSelector(config.mode, config.list);

        const runCycle = () => {
            const next = selector.next().text;
            let charIndex = 0;

            const typeNext = () => {
                if (!isActive) return;
                if (charIndex < next.length) {
                    charIndex += 1;
                    text.value = next.slice(0, charIndex);
                    schedule(config.typeSpeed, typeNext);
                    return;
                }
                if (!config.loop) {
                    cursorDimmed.value = true;
                    isIdle.value = true;
                    return;
                }
                isIdle.value = true;
                schedule(config.pauseDuration, deleteNext);
            };

            const deleteNext = () => {
                if (!isActive) return;
                isIdle.value = false;
                if (charIndex > 0) {
                    charIndex -= 1;
                    text.value = next.slice(0, charIndex);
                    schedule(20, deleteNext);
                    return;
                }
                schedule(300, runCycle);
            };

            isIdle.value = false;
            typeNext();
        };

        runCycle();
    });

    onUnmounted(() => {
        isActive = false;
        if (frameId !== undefined) cancelAnimationFrame(frameId);
    });

    return { text, cursorDimmed, isIdle };
}
