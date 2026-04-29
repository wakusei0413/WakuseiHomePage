import type { SloganMode } from '../types/site';

export function createSloganSelector(mode: SloganMode, slogans: string[]) {
    let currentIndex = -1;

    return {
        next() {
            if (mode === 'random') {
                let nextIndex = currentIndex;

                while (slogans.length > 1 && nextIndex === currentIndex) {
                    nextIndex = Math.floor(Math.random() * slogans.length);
                }

                currentIndex = nextIndex;
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
