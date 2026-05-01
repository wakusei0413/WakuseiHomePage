import { createSignal, onCleanup, onMount } from 'solid-js';

import { createSloganSelector } from '../lib/slogan-selector';
import type { I18nContext } from '../lib/i18n';
import type { CursorStyle, SlogansConfig } from '../types/site';

export function TypewriterSlogan(props: { config: SlogansConfig; cursorStyle: CursorStyle; i18n: I18nContext }) {
    const [text, setText] = createSignal('');
    const [cursorDimmed, setCursorDimmed] = createSignal(false);
    let timeoutId: number | undefined;
    let isActive = true;

    const getSloganList = () => {
        const { t } = props.i18n;
        const slogans: string[] = [];
        let i = 1;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const key = `slogan.${i}`;
            const value = t(key);
            if (value === key) {
                break;
            }
            slogans.push(value);
            i++;
        }
        if (slogans.length === 0) {
            return props.config.list;
        }
        return slogans;
    };

    onMount(() => {
        const runCycle = () => {
            const selector = createSloganSelector(props.config.mode, getSloganList());
            const next = selector.next().text;
            let charIndex = 0;

            const typeNext = () => {
                if (!isActive) {
                    return;
                }

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
                if (!isActive) {
                    return;
                }

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
        isActive = false;
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