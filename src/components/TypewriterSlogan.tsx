import { createSignal, onCleanup, onMount } from 'solid-js';

import { createSloganSelector } from '../lib/slogan-selector';
import type { CursorStyle, SlogansConfig } from '../types/site';

export function TypewriterSlogan(props: { config: SlogansConfig; cursorStyle: CursorStyle }) {
    const [text, setText] = createSignal('');
    const [cursorDimmed, setCursorDimmed] = createSignal(false);
    let timeoutId: number | undefined;

    onMount(() => {
        const selector = createSloganSelector(props.config.mode, props.config.list);

        const runCycle = () => {
            const next = selector.next().text;
            let charIndex = 0;

            const typeNext = () => {
                if (charIndex < next.length) {
                    charIndex += 1;
                    setText(next.slice(0, charIndex));
                    timeoutId = window.setTimeout(typeNext, props.config.typeSpeed);
                    return;
                }

                if (!props.config.loop) {
                    setCursorDimmed(true);
                    return;
                }

                timeoutId = window.setTimeout(deleteNext, props.config.pauseDuration);
            };

            const deleteNext = () => {
                if (charIndex > 0) {
                    charIndex -= 1;
                    setText(next.slice(0, charIndex));
                    timeoutId = window.setTimeout(deleteNext, 20);
                    return;
                }

                timeoutId = window.setTimeout(runCycle, 300);
            };

            typeNext();
        };

        runCycle();
    });

    onCleanup(() => {
        if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
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
