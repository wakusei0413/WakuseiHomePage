<script lang="ts">
    import { onMount } from 'svelte';
    import { createSloganSelector } from '../lib/slogan-selector';
    import type { CursorStyle, SlogansConfig } from '../types/site';

    let { config, cursorStyle }: { config: SlogansConfig; cursorStyle: CursorStyle } = $props();

    let text = $state('');
    let cursorDimmed = $state(false);
    let isIdle = $state(false);
    let frameId: number | undefined;
    let isActive = true;

    onMount(() => {
        const selector = createSloganSelector(config.mode, config.list);

        const schedule = (delay: number, task: () => void) => {
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
        };

        const runCycle = () => {
            const next = selector.next().text;
            let charIndex = 0;

            const typeNext = () => {
                if (!isActive) return;

                if (charIndex < next.length) {
                    charIndex += 1;
                    text = next.slice(0, charIndex);
                    schedule(config.typeSpeed, typeNext);
                    return;
                }

                if (!config.loop) {
                    cursorDimmed = true;
                    isIdle = true;
                    return;
                }

                isIdle = true;
                schedule(config.pauseDuration, deleteNext);
            };

            const deleteNext = () => {
                if (!isActive) return;
                isIdle = false;

                if (charIndex > 0) {
                    charIndex -= 1;
                    text = next.slice(0, charIndex);
                    schedule(20, deleteNext);
                    return;
                }

                schedule(300, runCycle);
            };

            isIdle = false;
            typeNext();
        };

        runCycle();

        return () => {
            isActive = false;
            if (frameId !== undefined) {
                cancelAnimationFrame(frameId);
            }
        };
    });
</script>

<p class="bio">
    <span class="typewriter-text">{text}</span>
    <span class="typewriter-cursor" class:cursor-idle={isIdle} style="opacity: {cursorDimmed ? '0.5' : '1'}">
        {cursorStyle === 'line' ? '|' : '█'}
    </span>
</p>
