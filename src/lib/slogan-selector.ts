import type { SloganMode } from '../types/site';

export function createSloganSelector(mode: SloganMode, slogans: string[]) {
    let currentIndex = -1;

    return {
        next() {
            if (mode === 'random') {
                if (slogans.length <= 1) {
                    // A single slogan never changes.
                    currentIndex = 0;
                } else {
                    let nextIndex = currentIndex;
                    while (nextIndex === currentIndex) {
                        nextIndex = Math.floor(Math.random() * slogans.length);
                    }
                    currentIndex = nextIndex;
                }
            } else {
                currentIndex = (currentIndex + 1) % slogans.length;
            }

            return {
                index: currentIndex,
                text: slogans[currentIndex]
            };
        }
    };
}
