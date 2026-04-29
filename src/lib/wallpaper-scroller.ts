import type { LoadingConfig, WallpaperConfig } from '../types/site';

type WallpaperCallbacks = {
    onLoadingTextChange?: (text: string) => void;
    onProgressChange?: (percent: number) => void;
    onReady?: () => void;
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

export class WallpaperScrollerController {
    public container: HTMLElement | null = null;
    public images: HTMLElement[] = [];
    public observer: IntersectionObserver | null = null;

    private imageCounter = 0;
    private textInterval: ReturnType<typeof setInterval> | null = null;
    private autoScrollId: number | null = null;
    private hasStartedAutoScroll = false;
    private interactionHandler: ((event: Event) => void) | null = null;
    private visibilityHandler: (() => void) | null = null;
    private readonly callbacks: WallpaperCallbacks;
    private readonly loadingConfig?: LoadingConfig;

    constructor(
        private readonly wallpaperConfig: WallpaperConfig,
        loadingConfig?: LoadingConfig,
        callbacks: WallpaperCallbacks = {}
    ) {
        this.loadingConfig = loadingConfig;
        this.callbacks = callbacks;
    }

    attach(container: HTMLElement) {
        this.container = container;
    }

    init() {
        if (!this.container || this.wallpaperConfig.infiniteScroll.enabled === false) {
            this.callbacks.onReady?.();
            return;
        }

        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        void this.loadImageIntoPlaceholder(entry.target as HTMLElement);
                    }
                });
            },
            {
                root: this.container,
                rootMargin: '400px 0px',
                threshold: 0.01
            }
        );

        this.disableInteraction();
        this.bindVisibilityHandling();

        void this.loadInitialImages().then(() => {
            this.callbacks.onReady?.();
            this.startAutoScroll();
        });
    }

    destroy() {
        if (this.textInterval) {
            clearInterval(this.textInterval);
            this.textInterval = null;
        }

        if (this.autoScrollId !== null) {
            cancelAnimationFrame(this.autoScrollId);
            this.autoScrollId = null;
        }

        this.observer?.disconnect();
        this.observer = null;
        this.teardownInteraction();
        this.teardownVisibilityHandling();

        if (this.container) {
            this.container.innerHTML = '';
        }

        this.images = [];
    }

    buildImageUrl(api: string, index: string | number) {
        return `${api}?t=${Date.now()}_${index}`;
    }

    clearImageRequest(image: HTMLImageElement) {
        image.onload = null;
        image.onerror = null;
        if (image.src) {
            image.removeAttribute('src');
        }
    }

    async raceLoadImage(index: string | number) {
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

    async loadWithRetry(index: string) {
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

    cleanupOverflowImages() {
        const maxImages = this.wallpaperConfig.infiniteScroll.maxImages;

        while (this.images.length > maxImages) {
            const oldest = this.images.shift();

            if (!oldest) {
                return;
            }

            this.observer?.unobserve(oldest);
            delete oldest.dataset.index;
            delete oldest.dataset.loaded;
            delete oldest.dataset.loading;
            oldest.remove();
        }
    }

    private disableInteraction() {
        if (!this.container || this.interactionHandler) {
            return;
        }

        this.interactionHandler = (event) => event.preventDefault();

        ['wheel', 'touchstart', 'touchmove', 'mousedown'].forEach((eventName) => {
            this.container?.addEventListener(eventName, this.interactionHandler as EventListener, { passive: false });
        });
    }

    private teardownInteraction() {
        if (!this.container || !this.interactionHandler) {
            return;
        }

        ['wheel', 'touchstart', 'touchmove', 'mousedown'].forEach((eventName) => {
            this.container?.removeEventListener(eventName, this.interactionHandler as EventListener);
        });

        this.interactionHandler = null;
    }

    private bindVisibilityHandling() {
        if (this.visibilityHandler || typeof document === 'undefined') {
            return;
        }

        this.visibilityHandler = () => {
            if (document.hidden) {
                if (this.autoScrollId !== null) {
                    cancelAnimationFrame(this.autoScrollId);
                    this.autoScrollId = null;
                }
                return;
            }

            this.startAutoScroll();
        };

        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    private teardownVisibilityHandling() {
        if (!this.visibilityHandler || typeof document === 'undefined') {
            return;
        }

        document.removeEventListener('visibilitychange', this.visibilityHandler);
        this.visibilityHandler = null;
    }

    private createPlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.className = 'wallpaper-image';
        placeholder.dataset.index = String(this.imageCounter);
        this.imageCounter += 1;
        return placeholder;
    }

    private appendPlaceholder() {
        const placeholder = this.createPlaceholder();
        this.container?.appendChild(placeholder);
        this.images.push(placeholder);
        return placeholder;
    }

    private observePlaceholder(placeholder: HTMLElement) {
        this.observer?.observe(placeholder);
    }

    private addPlaceholders(count: number) {
        for (let index = 0; index < count; index += 1) {
            this.observePlaceholder(this.appendPlaceholder());
        }
    }

    private async loadImageIntoPlaceholder(placeholder: HTMLElement) {
        if (placeholder.dataset.loaded || placeholder.dataset.loading) {
            return;
        }

        placeholder.dataset.loading = 'true';

        try {
            const image = await this.loadWithRetry(placeholder.dataset.index ?? '0');
            prepareWallpaperImageForDisplay(image);
            placeholder.appendChild(image);
            placeholder.dataset.loaded = 'true';
            delete placeholder.dataset.loading;
            requestAnimationFrame(() => placeholder.classList.add('loaded'));
        } catch {
            delete placeholder.dataset.loading;
        }
    }

    private async loadInitialImages() {
        const placeholders = Array.from({ length: this.wallpaperConfig.preloadCount }, () => this.appendPlaceholder());
        const loadingTexts = this.loadingConfig?.texts ?? [];
        let loadedCount = 0;
        let loadingTextIndex = 0;

        if (loadingTexts.length > 0) {
            this.callbacks.onLoadingTextChange?.(loadingTexts[0]);
        }

        if (loadingTexts.length > 1) {
            this.textInterval = setInterval(() => {
                loadingTextIndex = (loadingTextIndex + 1) % loadingTexts.length;
                this.callbacks.onLoadingTextChange?.(loadingTexts[loadingTextIndex]);
            }, this.loadingConfig?.textSwitchInterval ?? 2000);
        }

        await Promise.all(
            placeholders.map(async (placeholder) => {
                try {
                    const image = await this.loadWithRetry(placeholder.dataset.index ?? '0');
                    prepareWallpaperImageForDisplay(image);
                    placeholder.appendChild(image);
                    placeholder.dataset.loaded = 'true';
                    placeholder.classList.add('loaded');
                } finally {
                    loadedCount += 1;
                    this.callbacks.onProgressChange?.(Math.round((loadedCount / placeholders.length) * 100));
                }
            })
        );

        placeholders.forEach((placeholder) => this.observePlaceholder(placeholder));

        if (this.textInterval) {
            clearInterval(this.textInterval);
            this.textInterval = null;
        }
    }

    private autoScroll = () => {
        if (!this.container) {
            return;
        }

        const scrollBottom = this.container.scrollTop + this.container.clientHeight;
        this.container.scrollTop += this.wallpaperConfig.infiniteScroll.speed;

        if (this.container.scrollHeight - scrollBottom < 500) {
            this.addPlaceholders(this.wallpaperConfig.infiniteScroll.batchSize);
            this.cleanupOverflowImages();
        }

        this.autoScrollId = requestAnimationFrame(this.autoScroll);
    };

    private startAutoScroll() {
        if (!this.container || this.autoScrollId !== null) {
            return;
        }

        if (!this.hasStartedAutoScroll) {
            this.addPlaceholders(this.wallpaperConfig.infiniteScroll.batchSize);
            this.hasStartedAutoScroll = true;
        }

        this.autoScrollId = requestAnimationFrame(this.autoScroll);
    }
}
