import type { WallpaperConfig } from '../types/site';

type WallpaperCallbacks = {
    onReady?: () => void;
};

type WallpaperPrefetch = {
    img: HTMLImageElement;
};

export function decorateWallpaperImage(image: HTMLImageElement) {
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    return image;
}

export function prepareWallpaperImageForDisplay(image: HTMLImageElement) {
    image.loading = 'lazy';
    image.decoding = 'async';
    return image;
}

/**
 * Single-image wallpaper controller.
 *
 * Shows one full-bleed image at a time and crossfades to a freshly fetched image
 * every `rotation.interval` milliseconds.
 *
 * Performance notes:
 *   - BaseLayout injects an inline `<head>` script that starts fetching the first
 *     wallpaper the moment the HTML is parsed (in parallel with CSS/fonts/JS),
 *     storing the loading `Image()` on `window.__wallpaperPrefetch`. The controller
 *     adopts that exact element, so the first frame never waits for hydration and
 *     never downloads the same URL twice.
 *   - The next image is preloaded into the hidden layer the moment the current one
 *     is shown. By the time the rotation interval fires the next image is already
 *     decoded, so the swap is an instant crossfade instead of a multi-second wait
 *     on a stale frame.
 *   - Only one network request is in flight at any time.
 */
export class WallpaperController {
    private container: HTMLElement | null = null;
    private layers: HTMLImageElement[] = [];
    private ready: boolean[] = [false, false];
    private activeIndex = 0;
    private rotationTimer: ReturnType<typeof setInterval> | null = null;
    private visibilityHandler: (() => void) | null = null;
    private isDestroyed = false;
    private isPaused = false;
    private hasReadyFired = false;
    private preloadingSlot: number | null = null;
    // The crossfade transition in layout.css runs for 0.8s. Replacing the layer we
    // just hid while it is still fading out would cut the transition short, so we
    // wait for it to finish before recycling that slot for the next preload.
    private readonly fadeMs = 900;
    private readonly callbacks: WallpaperCallbacks;

    constructor(
        private readonly wallpaperConfig: WallpaperConfig,
        callbacks: WallpaperCallbacks = {}
    ) {
        this.callbacks = callbacks;
    }

    attach(container: HTMLElement) {
        this.container = container;
        this.syncZoomDuration();
    }

    init() {
        this.isDestroyed = false;

        if (!this.container) {
            this.fireReady();
            return;
        }

        this.syncZoomDuration();
        this.bindVisibilityHandling();
        this.buildLayers();

        void this.loadFirstLayer().then((ok) => {
            if (this.isDestroyed) {
                return;
            }

            if (ok) {
                this.activateLayer(0);
            }

            this.fireReady();

            if (this.wallpaperConfig.rotation.enabled) {
                this.startRotation();
                // Kick the next image off immediately so the first crossfade is
                // instant instead of waiting an entire interval for a fresh fetch.
                this.preloadOther(0);
            }
        });
    }

    pause() {
        this.isPaused = true;
        this.stopRotation();
    }

    resume() {
        this.isPaused = false;
        if (this.wallpaperConfig.rotation.enabled) {
            this.startRotation();
            // If the hidden layer never finished preloading before the tab was
            // hidden, resume it now so the next swap is still instant.
            this.preloadOther(this.activeIndex);
        }
    }

    destroy() {
        this.isDestroyed = true;
        this.stopRotation();
        this.teardownVisibilityHandling();

        if (this.container) {
            this.container.innerHTML = '';
        }

        this.layers = [];
        this.ready = [false, false];
    }

    // ----- image loading (kept from the previous implementation) -----

    buildImageUrl(api: string, index: number) {
        return `${api}?t=${Date.now()}_${index}`;
    }

    clearImageRequest(image: HTMLImageElement) {
        image.onload = null;
        image.onerror = null;
        if (image.src) {
            image.removeAttribute('src');
        }
    }

    async raceLoadImage(index: number) {
        if (this.wallpaperConfig.apis.length === 0) {
            throw new Error('No wallpaper APIs configured');
        }

        return await new Promise<HTMLImageElement>((resolve, reject) => {
            const candidates = this.wallpaperConfig.apis.map(() => new Image());
            let resolved = false;
            let failureCount = 0;

            const timer = window.setTimeout(() => {
                if (resolved) {
                    return;
                }

                resolved = true;
                candidates.forEach((candidate) => this.clearImageRequest(candidate));
                reject(new Error('Wallpaper timeout'));
            }, this.wallpaperConfig.raceTimeout);

            const finishSuccess = (image: HTMLImageElement) => {
                if (resolved) {
                    return;
                }

                resolved = true;
                window.clearTimeout(timer);
                candidates.forEach((candidate) => {
                    if (candidate !== image) {
                        this.clearImageRequest(candidate);
                    }
                });
                resolve(image);
            };

            const finishFailure = () => {
                if (resolved) {
                    return;
                }

                failureCount += 1;
                if (failureCount < candidates.length) {
                    return;
                }

                resolved = true;
                window.clearTimeout(timer);
                candidates.forEach((candidate) => this.clearImageRequest(candidate));
                reject(new Error('All wallpaper sources failed'));
            };

            candidates.forEach((candidate, candidateIndex) => {
                decorateWallpaperImage(candidate);
                // Load wallpaper images as credentialless CORS requests so third-party
                // wallpaper APIs cannot set/send cookies (avoids Lighthouse cookie issues).
                candidate.crossOrigin = 'anonymous';
                candidate.onload = () => finishSuccess(candidate);
                candidate.onerror = finishFailure;
                candidate.src = this.buildImageUrl(this.wallpaperConfig.apis[candidateIndex], index);
            });
        });
    }

    waitForRetry(delay: number) {
        return new Promise<void>((resolve) => {
            setTimeout(resolve, delay);
        });
    }

    getRetryDelay(attempt: number) {
        return Math.min(1000 * 2 ** (attempt - 1), 8000);
    }

    async loadWithRetry(index: number) {
        let attempt = 0;

        while (attempt < this.wallpaperConfig.maxRetries) {
            attempt += 1;

            try {
                return await this.raceLoadImage(index);
            } catch (error) {
                if (attempt >= this.wallpaperConfig.maxRetries) {
                    throw error;
                }

                await this.waitForRetry(this.getRetryDelay(attempt));
            }
        }

        throw new Error('Wallpaper retries exhausted');
    }

    // ----- single-image rotation -----

    private buildLayers() {
        if (!this.container) {
            return;
        }

        this.container.innerHTML = '';
        this.layers = [null, null] as unknown as HTMLImageElement[];
        this.ready = [false, false];
    }

    /**
     * Loads the very first frame. Prefers the `Image()` that BaseLayout started
     * fetching from the `<head>` so the first wallpaper appears as early as
     * possible (the request began during HTML parse, not at hydration).
     */
    private async loadFirstLayer(): Promise<boolean> {
        const prefetched = this.consumePrefetch();

        if (prefetched) {
            const ok = await this.awaitImage(prefetched, this.wallpaperConfig.raceTimeout);

            if (this.isDestroyed) {
                return false;
            }

            if (ok) {
                this.adoptImageAsLayer(0, prefetched);
                return true;
            }
            // The prefetch failed/timed out — fall back to a normal fetch below.
        }

        return this.loadIntoLayer(0);
    }

    private consumePrefetch(): HTMLImageElement | null {
        const w = window as unknown as { __wallpaperPrefetch?: WallpaperPrefetch };
        const prefetch = w.__wallpaperPrefetch;

        if (!prefetch || !prefetch.img) {
            return null;
        }

        // Adopt it once; never reuse a stale prefetch across navigations.
        w.__wallpaperPrefetch = undefined;
        return prefetch.img;
    }

    private awaitImage(image: HTMLImageElement, timeout: number): Promise<boolean> {
        if (image.complete && image.naturalWidth > 0) {
            return Promise.resolve(true);
        }

        return new Promise<boolean>((resolve) => {
            const timer = window.setTimeout(() => resolve(false), timeout);

            const finish = (ok: boolean) => {
                window.clearTimeout(timer);
                image.onload = null;
                image.onerror = null;
                resolve(ok);
            };

            image.onload = () => finish(image.naturalWidth > 0);
            image.onerror = () => finish(false);
        });
    }

    private adoptImageAsLayer(slot: number, image: HTMLImageElement) {
        image.className = 'wallpaper-image';
        image.setAttribute('aria-hidden', 'true');
        image.decoding = 'async';
        // The image is already fully loaded, so a synchronous paint of the next
        // frame is safe; eager ensures the browser does not defer its display.
        image.loading = 'eager';

        const previous = this.layers[slot];
        if (previous && previous.parentElement) {
            previous.remove();
        }

        this.layers[slot] = image;
        this.container?.appendChild(image);
        this.ready[slot] = true;
    }

    private async loadIntoLayer(slot: number): Promise<boolean> {
        if (this.preloadingSlot !== null && this.preloadingSlot !== slot) {
            // Only one fetch at a time; if another slot is mid-load, let it finish
            // first to avoid bursting the network with parallel wallpaper requests.
            return false;
        }

        this.preloadingSlot = slot;

        try {
            const image = await this.loadWithRetry(Date.now());
            if (this.isDestroyed) {
                return false;
            }

            // Adopt the already-downloaded image directly. Because the URL carries a
            // unique cache-buster, the browser would otherwise re-fetch it when we
            // set layer.src (these APIs commonly reply with no-store). Reusing the
            // loaded element avoids a redundant second download + decode entirely.
            this.adoptImageAsLayer(slot, image);
            return true;
        } catch {
            return false;
        } finally {
            this.preloadingSlot = null;
        }
    }

    private activateLayer(slot: number) {
        const other = (slot + 1) % this.layers.length;
        const target = this.layers[slot];
        const otherEl = this.layers[other];
        // Force a style/layout flush so a freshly-attached layer is committed at
        // opacity 0 before we add .active. Without this, the very first image (and
        // any layer added and activated in the same tick) would snap straight to
        // opacity 1 instead of running the 0.8s crossfade transition.
        // Also restarts wallpaper-ken-burns when the same node is re-activated.
        if (target) {
            target.classList.remove('active');
            void target.offsetWidth;
            target.classList.add('active');
        }
        otherEl?.classList.remove('active');
        this.activeIndex = slot;
    }

    /** Match Ken Burns duration to the rotation window (or a long hold when rotation is off). */
    private syncZoomDuration() {
        if (!this.container) {
            return;
        }

        const ms = this.wallpaperConfig.rotation.enabled
            ? this.wallpaperConfig.rotation.interval
            : 90000;
        this.container.style.setProperty('--wallpaper-zoom-ms', `${ms}ms`);
    }

    private preloadOther(active: number) {
        if (this.isDestroyed || this.isPaused) {
            return;
        }

        const other = (active + 1) % this.layers.length;
        if (this.ready[other] || this.preloadingSlot !== null) {
            return;
        }

        void this.loadIntoLayer(other);
    }

    private fireReady() {
        if (this.hasReadyFired) {
            return;
        }

        this.hasReadyFired = true;
        this.callbacks.onReady?.();
    }

    private startRotation() {
        if (this.rotationTimer !== null || this.isDestroyed || this.isPaused) {
            return;
        }

        this.rotationTimer = setInterval(() => {
            void this.rotate();
        }, this.wallpaperConfig.rotation.interval);
    }

    private stopRotation() {
        if (this.rotationTimer !== null) {
            clearInterval(this.rotationTimer);
            this.rotationTimer = null;
        }
    }

    private async rotate() {
        if (this.isDestroyed || this.isPaused) {
            return;
        }

        const next = (this.activeIndex + 1) % this.layers.length;

        if (!this.ready[next]) {
            // The preloaded image is not ready yet (slow network). Keep the current
            // frame on screen rather than flashing to a blank layer; the in-flight
            // preload will land shortly and the next tick will swap.
            this.preloadOther(this.activeIndex);
            return;
        }

        const vacated = this.activeIndex;
        this.activateLayer(next);
        this.ready[vacated] = false;
        // Begin preloading the slot we just vacated once its crossfade has finished,
        // so the following swap is instant too.
        window.setTimeout(() => {
            if (this.isDestroyed || this.isPaused) {
                return;
            }
            this.preloadOther(this.activeIndex);
        }, this.fadeMs);
    }

    private bindVisibilityHandling() {
        if (this.visibilityHandler || typeof document === 'undefined') {
            return;
        }

        this.visibilityHandler = () => {
            if (document.hidden) {
                this.stopRotation();
                return;
            }

            if (!this.isPaused) {
                this.startRotation();
                this.preloadOther(this.activeIndex);
            }
        };

        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    private teardownVisibilityHandling() {
        if (!this.visibilityHandler) {
            return;
        }

        document.removeEventListener('visibilitychange', this.visibilityHandler);
        this.visibilityHandler = null;
    }
}
