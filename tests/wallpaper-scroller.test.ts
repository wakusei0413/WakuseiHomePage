import {
    decorateWallpaperImage,
    prepareWallpaperImageForDisplay,
    WallpaperScrollerController
} from '../src/lib/wallpaper-scroller';

function createPlaceholder(index: number) {
    return {
        dataset: {
            index: String(index),
            loaded: 'true',
            loading: 'true'
        },
        removed: false,
        remove() {
            this.removed = true;
        }
    };
}

describe('WallpaperScrollerController internals', () => {
    it('cleans up the oldest placeholders when maxImages is exceeded', () => {
        const controller = new WallpaperScrollerController({
            apis: ['https://example.com/wallpaper'],
            raceTimeout: 1000,
            maxRetries: 2,
            preloadCount: 2,
            infiniteScroll: {
                enabled: true,
                speed: 1,
                batchSize: 2,
                maxImages: 2
            }
        });

        const placeholders = [createPlaceholder(0), createPlaceholder(1), createPlaceholder(2), createPlaceholder(3)];
        const unobserved: unknown[] = [];

        controller.images = placeholders.slice() as unknown as HTMLElement[];
        controller.observer = {
            unobserve(target: unknown) {
                unobserved.push(target);
            }
        } as IntersectionObserver;

        controller.cleanupOverflowImages();

        expect(controller.images).toEqual(placeholders.slice(2));
        expect(unobserved).toEqual(placeholders.slice(0, 2));
        expect(placeholders[0].removed).toBe(true);
        expect(placeholders[1].removed).toBe(true);
    });

    it('retries loading until raceLoadImage succeeds', async () => {
        const controller = new WallpaperScrollerController({
            apis: ['https://example.com/wallpaper'],
            raceTimeout: 1000,
            maxRetries: 4,
            preloadCount: 2,
            infiniteScroll: {
                enabled: true,
                speed: 1,
                batchSize: 2,
                maxImages: 10
            }
        });

        let attempts = 0;
        controller.raceLoadImage = async () => {
            attempts += 1;

            if (attempts < 3) {
                throw new Error('temporary failure');
            }

            return { src: 'ok' } as HTMLImageElement;
        };
        controller.waitForRetry = async () => undefined;

        const result = await controller.loadWithRetry('7');

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
});
