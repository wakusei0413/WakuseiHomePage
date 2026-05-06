import { createSignal, onCleanup, onMount } from 'solid-js';

import { createSloganSelector } from '../lib/slogan-selector';
import type { CursorStyle, SlogansConfig } from '../types/site';

export function TypewriterSlogan(props: { config: SlogansConfig; cursorStyle: CursorStyle }) {
    const [text, setText] = createSignal('');
    const [cursorDimmed, setCursorDimmed] = createSignal(false);
    let frameId: number | undefined;
    let isActive = true;

    onMount(() => {
        const selector = createSloganSelector(props.config.mode, props.config.list);

        const schedule = (delay: number, task: () => void) => {
            const targetTime = performance.now() + delay;

            const tick = (now: number) => {
                if (!isActive) {
                    return;
                }

                if (now >= targetTime) {
                    frameId = undefined;
                    task();
                    return;
                }

                frameId = window.requestAnimationFrame(tick);
            };

            frameId = window.requestAnimationFrame(tick);
        };

        const runCycle = () => {
            const next = selector.next().text;
            let charIndex = 0;

            const typeNext = () => {
                if (!isActive) {
                    return;
                }

                if (charIndex < next.length) {
                    charIndex += 1;
                    setText(next.slice(0, charIndex));
                    schedule(props.config.typeSpeed, typeNext);
                    return;
                }

                if (!props.config.loop) {
                    setCursorDimmed(true);
                    return;
                }

                schedule(props.config.pauseDuration, deleteNext);
            };

            const deleteNext = () => {
                if (!isActive) {
                    return;
                }

                if (charIndex > 0) {
                    charIndex -= 1;
                    setText(next.slice(0, charIndex));
                    schedule(20, deleteNext);
                    return;
                }

                schedule(300, runCycle);
            };

            typeNext();
        };

        runCycle();
    });

    onCleanup(() => {
        isActive = false;
        if (frameId !== undefined) {
            window.cancelAnimationFrame(frameId);
        }
    });

    return (
        <p class="bio">
            <span class="typewriter-text">{text()}</span>
            <span
                class="typewriter-cursor"
                style={{
                    opacity: cursorDimmed() ? '0.5' : '1'
                }}
            >
                {props.cursorStyle === 'line' ? '|' : '█'}
            </span>
        </p>
    );
}
