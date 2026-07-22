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

    it('syncs ken-burns duration to the rotation interval on attach', () => {
        const props: Record<string, string> = {};
        const container = {
            style: {
                setProperty(name: string, value: string) {
                    props[name] = value;
                }
            }
        };

        const controller = new WallpaperController({
            ...baseConfig,
            rotation: { enabled: true, interval: 45000 }
        });
        controller.attach(container as unknown as HTMLElement);

        expect(props['--wallpaper-zoom-ms']).toBe('45000ms');
    });
});
