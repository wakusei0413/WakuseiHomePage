import type { WallpaperConfig } from '../types/site';

type WallpaperCallbacks = {
    onReady?: () => void;
    /**
     * Fires whenever a layer's image has finished loading and been adopted
     * (first frame and every preload), while the image is still hidden. The
     * glass surfaces pre-bake their blurred textures from this element so the
     * swap itself is a cheap texture change.
     */
    onWallpaperPreload?: (img: HTMLImageElement) => void;
    /**
     * Fires whenever a layer becomes the active wallpaper frame. The glass
     * surfaces use this to switch their static pre-blurred wallpaper copies to
     * the new frame (one texture swap per change, never a live re-sample).
     */
    onWallpaperChange?: (img: HTMLImageElement) => void;
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
 *     is shown. By the time the rotation interval fires the next image is usually
 *     already decoded, so the swap is an instant crossfade instead of a
 *     multi-second wait on a stale frame.
 *   - Rotation is readiness-driven: each swap is scheduled `interval` ms after
 *     the previous one, and if the preload has not landed yet the swap happens
 *     the instant it does — never on a fixed grid that can leave a ready frame
 *     sitting hidden for most of an extra interval (a slow API then delays the
 *     rotation by exactly its fetch time, not by up to a whole interval).
 *   - Only one network request is in flight at any time.
 */
export class WallpaperController {
    private container: HTMLElement | null = null;
    private layers: HTMLImageElement[] = [];
    private ready: boolean[] = [false, false];
    // One Ken Burns animation per layer, so a freshly activated layer can adopt
    // the exact playback phase of the layer it replaces (see activateLayer).
    private kenburns: (Animation | null)[] = [null, null];
    private activeIndex = 0;
    private rotationTimer: number | null = null;
    /** True while a rotation is waiting for its preload to land (see rotate()). */
    private rotationPending = false;
    private visibilityHandler: (() => void) | null = null;
    private isDestroyed = false;
    private isPaused = false;
    private hasReadyFired = false;
    private preloadingSlot: number | null = null;
    private reduceMotion = false;
    // The crossfade transition in layout.css runs for 0.9s. Replacing the layer we
    // just hid while it is still fading out would cut the transition short, so we
    // wait for it to finish before recycling that slot for the next preload.
    private readonly fadeMs = 1000;
    private readonly callbacks: WallpaperCallbacks;

    constructor(
        private readonly wallpaperConfig: WallpaperConfig,
        callbacks: WallpaperCallbacks = {}
    ) {
        this.callbacks = callbacks;
    }

    attach(container: HTMLElement) {
        this.container = container;
    }

    init() {
        this.isDestroyed = false;
        this.reduceMotion =
            typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        if (!this.container) {
            this.fireReady();
            return;
        }

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
                this.scheduleRotation();
                // Kick the next image off immediately so the first crossfade is
                // instant instead of waiting an entire interval for a fresh fetch.
                this.preloadOther(0);
            }
        });
    }

    pause() {
        this.isPaused = true;
        this.stopRotation();
        this.rotationPending = false;
    }

    resume() {
        this.isPaused = false;
        if (this.wallpaperConfig.rotation.enabled) {
            this.scheduleRotation();
            // If the hidden layer never finished preloading before the tab was
            // hidden, resume it now so the next swap is still instant.
            this.preloadOther(this.activeIndex);
        }
    }

    destroy() {
        this.isDestroyed = true;
        this.stopRotation();
        this.rotationPending = false;
        this.teardownVisibilityHandling();

        if (this.container) {
            this.container.innerHTML = '';
        }

        this.layers = [];
        this.ready = [false, false];
        this.cancelKenBurns();
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
        this.cancelKenBurns();
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
        this.kenburns[slot]?.cancel();
        this.kenburns[slot] = null;

        this.layers[slot] = image;
        this.container?.appendChild(image);
        this.ready[slot] = true;

        // The image is loaded and in the DOM (hidden until activated): let the
        // glass surfaces pre-bake their blurred textures from this exact element
        // so the eventual swap is a plain texture change with no decode, no
        // extra network request and no filter re-rasterization.
        this.callbacks.onWallpaperPreload?.(image);
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
            // If a rotation is waiting on this fetch, complete it right now
            // instead of on the next interval tick.
            this.resolvePendingRotation();
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
        // opacity 1 instead of running the 0.9s crossfade transition.
        if (target) {
            target.classList.remove('active');
            void target.offsetWidth;
            target.classList.add('active');
        }
        otherEl?.classList.remove('active');
        this.activeIndex = slot;

        // Notify glass surfaces of the newly active frame so their static
        // blurred copies can switch to it (one texture swap per change).
        this.callbacks.onWallpaperChange?.(this.layers[slot]);

        // Start the new layer's Ken Burns at the exact phase the outgoing layer is
        // currently at. The zoom keeps flowing without the scale(1.1) -> scale(1)
        // jump that restarting the animation from scratch would produce.
        this.startKenBurns(slot, this.getPhaseMs(other));
    }

    /**
     * Drives the Ken Burns zoom with the Web Animations API so each layer can pick
     * up the current phase of the layer it replaces (zero visual jump on swap).
     *
     * With rotation enabled the animation is a slow breathing loop (1 -> 1.1 -> 1)
     * whose cycle length equals the rotation interval, so every swap lands on the
     * same phase the outgoing layer ended on and the zoom restarts naturally with
     * the fresh frame. Without rotation it is a single long push to 1.1.
     */
    private startKenBurns(slot: number, phaseMs: number) {
        const el = this.layers[slot];
        if (!el) {
            return;
        }

        const previous = this.kenburns[slot];
        if (previous) {
            previous.cancel();
        }

        if (this.reduceMotion) {
            el.style.transform = 'scale(1)';
            this.kenburns[slot] = null;
            return;
        }

        const rotating = this.wallpaperConfig.rotation.enabled;
        const cycleMs = rotating ? this.wallpaperConfig.rotation.interval : 90000;
        const keyframes = rotating
            ? [
                  // Both segments use the same ease-in-out curve so the turn-around
                  // at the peak is seamless — velocity touches zero from both sides.
                  { transform: 'scale(1)', offset: 0, easing: 'cubic-bezier(0.37, 0, 0.63, 1)' },
                  { transform: 'scale(1.1)', offset: 0.68, easing: 'cubic-bezier(0.37, 0, 0.63, 1)' },
                  { transform: 'scale(1)', offset: 1 }
              ]
            : [{ transform: 'scale(1)', easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' }, { transform: 'scale(1.1)' }];

        const animation = el.animate(keyframes, {
            duration: cycleMs,
            iterations: rotating ? Infinity : 1,
            fill: 'both'
        });
        // Seek to the outgoing layer's phase (no-op on the very first frame, where
        // phaseMs is 0) and make sure the animation actually plays from there.
        animation.currentTime = phaseMs;
        animation.play();
        this.kenburns[slot] = animation;
    }

    /** Playback phase (0..cycle) of a layer's Ken Burns animation, or 0 when idle. */
    private getPhaseMs(slot: number): number {
        const animation = this.kenburns[slot];
        if (!animation || animation.playState === 'idle') {
            return 0;
        }

        const cycleMs = this.wallpaperConfig.rotation.enabled ? this.wallpaperConfig.rotation.interval : 90000;
        const current = typeof animation.currentTime === 'number' ? animation.currentTime : 0;
        return current - Math.floor(current / cycleMs) * cycleMs;
    }

    private cancelKenBurns() {
        this.kenburns.forEach((animation) => animation?.cancel());
        this.kenburns = [null, null];
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

    /**
     * Schedules the next rotation `interval` ms from now (a chained timeout, not
     * a fixed grid), so a swap that was delayed by a slow fetch never pushes the
     * following ones further off — each interval is measured from its own swap.
     */
    private scheduleRotation() {
        if (this.rotationTimer !== null || this.isDestroyed || this.isPaused) {
            return;
        }

        this.rotationTimer = window.setTimeout(() => {
            this.rotationTimer = null;
            void this.rotate();
        }, this.wallpaperConfig.rotation.interval);
    }

    private stopRotation() {
        if (this.rotationTimer !== null) {
            clearTimeout(this.rotationTimer);
            this.rotationTimer = null;
        }
    }

    private async rotate() {
        if (this.isDestroyed || this.isPaused) {
            return;
        }

        const next = (this.activeIndex + 1) % this.layers.length;

        if (!this.ready[next]) {
            // The preloaded image has not landed yet (slow network). Keep the
            // current frame on screen rather than flashing to a blank layer, but
            // swap the instant the in-flight fetch completes instead of waiting
            // for the next interval tick (resolvePendingRotation).
            this.rotationPending = true;
            this.preloadOther(this.activeIndex);
            return;
        }

        const vacated = this.activeIndex;
        this.activateLayer(next);
        this.ready[vacated] = false;
        // Next swap is scheduled from THIS swap (readiness-driven cadence).
        this.scheduleRotation();
        // Begin preloading the slot we just vacated once its crossfade has
        // finished, so the following swap is instant too.
        window.setTimeout(() => {
            if (this.isDestroyed || this.isPaused) {
                return;
            }
            this.preloadOther(this.activeIndex);
        }, this.fadeMs);
    }

    /** Fires a pending rotation as soon as its preload becomes ready. */
    private resolvePendingRotation() {
        if (!this.rotationPending || this.isDestroyed || this.isPaused) {
            return;
        }

        this.rotationPending = false;
        void this.rotate();
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
                this.scheduleRotation();
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
