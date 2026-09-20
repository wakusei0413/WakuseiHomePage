import { describe, expect, it, vi } from 'vitest';
import {
    decorateWallpaperImage,
    prepareWallpaperImageForDisplay,
    WallpaperController
} from '../src/lib/wallpaper-scroller';

const baseConfig = {
    apis: ['https://example.com/wallpaper'],
    raceTimeout: 1000,
    maxRetries: 4,
    rotation: { enabled: true, interval: 60000 }
};

describe('WallpaperController internals', () => {
    it('retries loading until raceLoadImage succeeds', async () => {
        const controller = new WallpaperController({ ...baseConfig });

        let attempts = 0;
        controller.raceLoadImage = async () => {
            attempts += 1;

            if (attempts < 3) {
                throw new Error('temporary failure');
            }

            return { src: 'ok' } as HTMLImageElement;
        };
        controller.waitForRetry = async () => undefined;

        const result = await controller.loadWithRetry(7);

        expect(result.src).toBe('ok');
        expect(attempts).toBe(3);
    });

    it('marks wallpaper images as decorative for accessibility audits', () => {
        const attributes: Record<string, string> = {};
        const image = {
            alt: 'wallpaper',
            setAttribute(name: string, value: string) {
                attributes[name] = value;
            }
        };

        decorateWallpaperImage(image as unknown as HTMLImageElement);

        expect(image.alt).toBe('');
        expect(attributes['aria-hidden']).toBe('true');
    });

    it('keeps preload images eager before they are inserted into the page', () => {
        const attributes: Record<string, string> = {};
        const image = {
            alt: 'wallpaper',
            loading: 'eager',
            decoding: 'sync',
            setAttribute(name: string, value: string) {
                attributes[name] = value;
            }
        };

        decorateWallpaperImage(image as unknown as HTMLImageElement);

        expect(image.loading).toBe('eager');
        expect(image.decoding).toBe('sync');
        expect(attributes['aria-hidden']).toBe('true');
    });

    it('marks rendered wallpaper images for lazy loading', () => {
        const image = {
            alt: 'wallpaper',
            loading: 'eager',
            decoding: 'sync'
        };

        prepareWallpaperImageForDisplay(image as unknown as HTMLImageElement);

        expect(image.loading).toBe('lazy');
        expect(image.decoding).toBe('async');
    });

    it('fires onWallpaperPreload with the loaded element before activation', async () => {
        const preloaded: string[] = [];
        const controller = new WallpaperController(
            { ...baseConfig },
            { onWallpaperPreload: (img) => preloaded.push(img.src) }
        );
        const container = { innerHTML: '', appendChild() {} } as unknown as HTMLElement;
        controller.attach(container);

        controller.loadWithRetry = async () =>
            ({
                src: 'frame-X',
                className: '',
                setAttribute() {},
                remove() {},
                classList: { remove() {}, add() {} },
                get offsetWidth() {
                    return 1;
                },
                animate() {
                    return { currentTime: 0, play() {}, cancel() {}, playState: 'idle' };
                },
                style: {}
            }) as unknown as HTMLImageElement;

        await (controller as unknown as { loadIntoLayer(slot: number): Promise<boolean> }).loadIntoLayer(0);

        expect(preloaded).toEqual(['frame-X']);
    });

    it('swaps as soon as a late preload lands (readiness-driven rotation)', async () => {
        vi.useFakeTimers();
        try {
            const activeSrcs: string[] = [];
            const controller = new WallpaperController(
                { ...baseConfig, rotation: { enabled: true, interval: 100 } },
                { onWallpaperChange: (img) => activeSrcs.push(img.src) }
            );
            const container = { innerHTML: '', appendChild() {} } as unknown as HTMLElement;
            controller.attach(container);

            const makeImage = (src: string) =>
                ({
                    src,
                    className: '',
                    setAttribute() {},
                    remove() {},
                    classList: { remove() {}, add() {} },
                    get offsetWidth() {
                        return 1;
                    },
                    animate() {
                        return { currentTime: 0, play() {}, cancel() {}, playState: 'idle' };
                    },
                    style: {}
                }) as unknown as HTMLImageElement;

            let resolveSecond!: (img: HTMLImageElement) => void;
            const secondLoad = new Promise<HTMLImageElement>((resolve) => {
                resolveSecond = resolve;
            });
            let firstCall = true;
            controller.loadWithRetry = async () => {
                if (firstCall) {
                    firstCall = false;
                    return makeImage('frame-A');
                }
                return secondLoad;
            };

            // First frame loads instantly; the second (hidden) frame stays
            // in-flight while the interval fires.
            controller.init();
            await vi.advanceTimersByTimeAsync(0);
            expect(activeSrcs).toEqual(['frame-A']);

            // Interval fires at 100ms while the preload is still in flight:
            // the current frame must stay on screen.
            await vi.advanceTimersByTimeAsync(100);
            expect(activeSrcs).toEqual(['frame-A']);

            // The preload lands 50ms later — the swap must happen immediately,
            // not wait for the next interval tick.
            resolveSecond(makeImage('frame-B'));
            await vi.advanceTimersByTimeAsync(50);
            expect(activeSrcs).toEqual(['frame-A', 'frame-B']);
        } finally {
            vi.useRealTimers();
        }
    });
});
