/**
 * 壁纸滚动模块 - 独立封装
 * 功能：无限滚动壁纸、竞速加载、懒加载、自动滚动
 */

import { logger } from './logger.js';

class WallpaperScroller {
    constructor(containerId, wallpaperConfig, loadingConfig, onReady) {
        const infiniteScroll = (wallpaperConfig && wallpaperConfig.infiniteScroll) || {};

        this.containerId = containerId;
        this.container = null;
        this.wallpaperConfig = wallpaperConfig || {};
        this.loadingConfig = loadingConfig || {};
        this.onReady = onReady || function () {};

        this.imageCounter = 0;
        this.images = [];
        this.observer = null;
        this.currentLoadingTextIndex = 0;
        this.textInterval = null;
        this.isDestroyed = false;
        this.autoScrollId = null;

        this.apis = this.wallpaperConfig.apis || [];
        if (!this.apis.length) {
            logger.warn('[壁纸] 未配置壁纸 API，壁纸功能不可用');
        }
        this.raceTimeout = this.wallpaperConfig.raceTimeout || 10000;
        this.maxRetries = this.wallpaperConfig.maxRetries || 5;
        this.preloadCount = this.wallpaperConfig.preloadCount || 3;
        this.infiniteScrollEnabled = infiniteScroll.enabled !== false;
        this.batchSize = infiniteScroll.batchSize || 3;
        this.maxImages = infiniteScroll.maxImages || 20;
        this.scrollSpeed = infiniteScroll.speed || 1.5;
        this.loadThreshold = 500;
        this.loadingTexts = this.loadingConfig.texts || ['少女祈祷中...'];
        this.textSwitchInterval = this.loadingConfig.textSwitchInterval || 2000;

        // 绑定 RAF 回调，避免每次创建新函数
        this._boundAutoScroll = this._autoScroll.bind(this);
    }

    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            logger.error('[壁纸] 容器元素未找到:', this.containerId);
            this.onReady();
            return;
        }
        if (!this.infiniteScrollEnabled) {
            logger.log('[壁纸] 无限滚动已禁用');
            this.onReady();
            return;
        }

        this._setupObserver();
        this._disableInteraction();

        this._loadInitialImages()
            .then(() => {
                this.onReady();
                this._startAutoScroll();
            })
            .catch((err) => {
                logger.error('[壁纸] 初始化失败:', err);
                this.onReady();
            });
    }

    destroy() {
        this.isDestroyed = true;
        if (this.textInterval) {
            clearInterval(this.textInterval);
            this.textInterval = null;
        }
        if (this.autoScrollId) {
            cancelAnimationFrame(this.autoScrollId);
            this.autoScrollId = null;
        }
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.images = [];
    }

    _setupObserver() {
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        this._loadImageIntoPlaceholder(entry.target);
                    }
                });
            },
            {
                root: this.container,
                rootMargin: '400px 0px',
                threshold: 0.01
            }
        );
    }

    _disableInteraction() {
        const handler = (e) => e.preventDefault();
        this.container.addEventListener('wheel', handler, { passive: false });
        this.container.addEventListener('touchstart', handler, { passive: false });
        this.container.addEventListener('touchmove', handler, { passive: false });
        this.container.addEventListener('mousedown', handler, { passive: false });
    }

    _buildImageUrl(api, index) {
        return api + '?t=' + Date.now() + '_' + index;
    }

    _clearImageRequest(img) {
        img.onload = null;
        img.onerror = null;
        if (img.src) img.removeAttribute('src');
    }

    _raceLoadImage(index) {
        if (!this.apis || !this.apis.length) {
            return Promise.reject(new Error('No wallpaper APIs configured'));
        }

        return new Promise((resolve, reject) => {
            const images = this.apis.map(() => new Image());
            let done = false;
            let failureCount = 0;

            const timer = setTimeout(() => {
                if (done) return;
                done = true;
                images.forEach((img) => this._clearImageRequest(img));
                reject(new Error('Timeout'));
            }, this.raceTimeout);

            const finishSuccess = (img) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                images.forEach((candidate) => {
                    if (candidate !== img) this._clearImageRequest(candidate);
                });
                resolve(img);
            };

            const finishFailure = () => {
                if (done) return;
                failureCount++;
                if (failureCount < images.length) return;
                done = true;
                clearTimeout(timer);
                images.forEach((img) => this._clearImageRequest(img));
                reject(new Error('All wallpaper sources failed'));
            };

            images.forEach((img, i) => {
                img.onload = () => finishSuccess(img);
                img.onerror = finishFailure;
                img.src = this._buildImageUrl(this.apis[i], index);
            });
        });
    }

    _loadWithRetry(index) {
        let attempt = 0;
        const tryLoad = () => {
            attempt++;
            return this._raceLoadImage(index).catch((err) => {
                logger.log('[壁纸] 加载中... (' + attempt + '/' + this.maxRetries + ')');
                if (attempt >= this.maxRetries) throw err;
                return this._waitForRetry(this._getRetryDelay(attempt)).then(tryLoad);
            });
        };
        return tryLoad();
    }

    _loadImageIntoPlaceholder(placeholder) {
        if (placeholder.dataset.loaded || placeholder.dataset.loading) return;
        placeholder.dataset.loading = 'true';

        this._loadWithRetry(placeholder.dataset.index)
            .then((img) => {
                placeholder.appendChild(img);
                placeholder.dataset.loaded = 'true';
                delete placeholder.dataset.loading;
                requestAnimationFrame(() => placeholder.classList.add('loaded'));
            })
            .catch(() => {
                delete placeholder.dataset.loading;
                logger.error('[壁纸] 懒加载失败:', placeholder.dataset.index);
            });
    }

    _createPlaceholder() {
        const div = document.createElement('div');
        div.className = 'wallpaper-image';
        return div;
    }

    _appendPlaceholder() {
        const placeholder = this._createPlaceholder();
        placeholder.dataset.index = this.imageCounter++;
        this.container.appendChild(placeholder);
        this.images.push(placeholder);
        return placeholder;
    }

    _observePlaceholder(placeholder) {
        this.observer.observe(placeholder);
    }

    _getRetryDelay(attempt) {
        return Math.min(1000 * Math.pow(2, attempt - 1), 8000);
    }

    _waitForRetry(delay) {
        return new Promise((resolve) => setTimeout(resolve, delay));
    }

    _addPlaceholders(count) {
        for (let i = 0; i < count; i++) {
            this._observePlaceholder(this._appendPlaceholder());
        }
    }

    _cleanupOverflowImages() {
        while (this.images.length > this.maxImages) {
            const old = this.images.shift();
            this.observer.unobserve(old);
            delete old.dataset.index;
            delete old.dataset.loaded;
            delete old.dataset.loading;
            old.remove();
        }
    }

    _cleanup() {
        this._cleanupOverflowImages();
    }

    _autoScroll() {
        if (this.isDestroyed) return;
        const scrollBottom = this.container.scrollTop + this.container.clientHeight;
        this.container.scrollTop += this.scrollSpeed;

        if (this.container.scrollHeight - scrollBottom < this.loadThreshold) {
            this._addPlaceholders(this.batchSize);
            this._cleanupOverflowImages();
        }
        this.autoScrollId = requestAnimationFrame(this._boundAutoScroll);
    }

    _startAutoScroll() {
        this._addPlaceholders(this.batchSize);
        this.autoScrollId = requestAnimationFrame(this._boundAutoScroll);
    }

    _loadInitialImages() {
        const loadingText = document.getElementById('loadingText');
        const loadingBar = document.getElementById('loadingBar');
        const loadingPercent = document.getElementById('loadingPercent');
        const placeholders = [];
        let loadedCount = 0;

        if (loadingText && this.loadingTexts.length > 1) {
            this.textInterval = setInterval(() => {
                this.currentLoadingTextIndex = (this.currentLoadingTextIndex + 1) % this.loadingTexts.length;
                loadingText.textContent = this.loadingTexts[this.currentLoadingTextIndex];
            }, this.textSwitchInterval);
        }

        for (let i = 0; i < this.preloadCount; i++) {
            placeholders.push(this._appendPlaceholder());
        }

        const updateProgress = () => {
            const percent = Math.round((loadedCount / this.preloadCount) * 100);
            if (loadingBar) loadingBar.style.width = percent + '%';
            if (loadingPercent) loadingPercent.textContent = percent + '%';
        };

        return Promise.all(
            placeholders.map((placeholder, index) =>
                this._loadWithRetry(placeholder.dataset.index)
                    .then((img) => {
                        placeholder.appendChild(img);
                        placeholder.dataset.loaded = 'true';
                        placeholder.classList.add('loaded');
                        loadedCount++;
                        updateProgress();
                    })
                    .catch(() => {
                        logger.error('[壁纸] 第 ' + (index + 1) + ' 张加载失败');
                        loadedCount++;
                        updateProgress();
                    })
            )
        ).then(() => {
            placeholders.forEach((placeholder) => this._observePlaceholder(placeholder));
            if (this.textInterval) {
                clearInterval(this.textInterval);
                this.textInterval = null;
            }
        });
    }
}

export { WallpaperScroller };
