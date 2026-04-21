import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WallpaperScroller } from '../js/wallpaper.js';

function createPlaceholder(index) {
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

describe('WallpaperScroller internals', () => {
    it('cleanup removes oldest placeholders beyond maxImages', () => {
        const scroller = new WallpaperScroller('wallpaper', {
            apis: ['https://example.com/wallpaper'],
            infiniteScroll: { maxImages: 2 }
        });
        const placeholders = [createPlaceholder(0), createPlaceholder(1), createPlaceholder(2), createPlaceholder(3)];
        const unobserved = [];

        scroller.images = placeholders.slice();
        scroller.maxImages = 2;
        scroller.observer = {
            unobserve(target) {
                unobserved.push(target);
            }
        };

        scroller._cleanupOverflowImages();

        assert.deepStrictEqual(scroller.images, placeholders.slice(2));
        assert.deepStrictEqual(unobserved, placeholders.slice(0, 2));
        assert.strictEqual(placeholders[0].removed, true);
        assert.strictEqual(placeholders[1].removed, true);
        assert.deepStrictEqual(placeholders[0].dataset, {});
        assert.deepStrictEqual(placeholders[1].dataset, {});
        assert.deepStrictEqual(placeholders[2].dataset, {
            index: '2',
            loaded: 'true',
            loading: 'true'
        });
    });

    it('loadWithRetry re-attempts until race load succeeds', async () => {
        const scroller = new WallpaperScroller('wallpaper', {
            apis: ['https://example.com/wallpaper'],
            maxRetries: 4
        });
        const delays = [];
        const requestedAttempts = [];
        const waitCalls = [];
        const image = { src: 'success' };
        let attempts = 0;

        scroller._raceLoadImage = function (index) {
            requestedAttempts.push(index);
            attempts++;

            if (attempts < 3) {
                return Promise.reject(new Error('temporary failure'));
            }

            return Promise.resolve(image);
        };
        scroller._getRetryDelay = function (attempt) {
            delays.push(attempt);
            return attempt * 10;
        };
        scroller._waitForRetry = function (delay) {
            waitCalls.push(delay);
            return Promise.resolve();
        };

        const result = await scroller._loadWithRetry('7');

        assert.strictEqual(result, image);
        assert.strictEqual(attempts, 3);
        assert.deepStrictEqual(requestedAttempts, ['7', '7', '7']);
        assert.deepStrictEqual(delays, [1, 2]);
        assert.deepStrictEqual(waitCalls, [10, 20]);
    });
});
