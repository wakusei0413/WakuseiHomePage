/**
 * 壁纸滚动模块 - 独立封装
 * 功能：无限滚动壁纸、竞速加载、懒加载、自动滚动
 */

(function () {
    'use strict';

    class WallpaperScroller {
        constructor(containerId, wallpaperConfig, loadingConfig, onReady) {
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

            var infiniteScroll = this.wallpaperConfig.infiniteScroll || {};
            this.apis = this.wallpaperConfig.apis || ['https://www.loliapi.com/bg/', 'https://www.dmoe.cc/random.php'];
            this.raceTimeout = this.wallpaperConfig.raceTimeout || 10000;
            this.maxRetries = this.wallpaperConfig.maxRetries || 100;
            this.preloadCount = this.wallpaperConfig.preloadCount || 3;
            this.infiniteScrollEnabled = infiniteScroll.enabled !== false;
            this.batchSize = infiniteScroll.batchSize || 3;
            this.maxImages = infiniteScroll.maxImages || 20;
            this.scrollSpeed = infiniteScroll.speed || 1.5;
            this.loadThreshold = 500;
            this.loadingTexts = this.loadingConfig.texts || ['少女祈祷中...'];
            this.textSwitchInterval = this.loadingConfig.textSwitchInterval || 2000;
        }

        init() {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                Logger.warn('[壁纸] 容器元素未找到:', this.containerId);
                return;
            }

            if (!this.infiniteScrollEnabled) {
                Logger.log('[壁纸] 无限滚动已禁用');
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
                    Logger.error('[壁纸] 初始化失败:', err);
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
                            this._loadImageLazy(entry.target);
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
            this.container.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
            this.container.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
            this.container.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
            this.container.addEventListener('mousedown', (e) => e.preventDefault());
        }

        _raceLoadImage(index) {
            return new Promise((resolve, reject) => {
                const ts = Date.now();
                const images = this.apis.map(() => new Image());
                const urls = this.apis.map((api) => `${api}?t=${ts}_${index}`);
                let done = false;

                const timer = setTimeout(() => {
                    if (!done) {
                        done = true;
                        images.forEach((img) => {
                            img.onload = img.onerror = null;
                            if (img.src) img.removeAttribute('src');
                        });
                        reject(new Error('Timeout'));
                    }
                }, this.raceTimeout);

                const finish = (img) => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    images.forEach((i) => {
                        i.onload = i.onerror = null;
                        if (i !== img) {
                            if (i.src) i.removeAttribute('src');
                        }
                    });
                    resolve(img);
                };

                images.forEach((img, i) => {
                    img.onload = () => finish(img);
                    img.onerror = () => {
                        if (done) return;
                    };
                    img.src = urls[i];
                });
            });
        }

        async _loadWithRetry(index) {
            for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
                try {
                    return await this._raceLoadImage(index);
                } catch (err) {
                    Logger.log(`[壁纸] 加载中... (${attempt}/${this.maxRetries})`);
                }
            }
            throw new Error('Max retries exceeded');
        }

        _loadImageLazy(placeholder) {
            if (placeholder.dataset.loaded) return;
            if (placeholder.dataset.loading) return;
            placeholder.dataset.loading = 'true';

            const index = placeholder.dataset.index;
            const img = new Image();

            img.onload = () => {
                placeholder.appendChild(img);
                placeholder.dataset.loaded = 'true';
                delete placeholder.dataset.loading;
                requestAnimationFrame(() => placeholder.classList.add('loaded'));
            };

            img.onerror = () => {
                delete placeholder.dataset.loading;
                this._retryLazy(placeholder);
            };

            img.src = `${this.apis[0]}?t=${Date.now()}_${index}`;
        }

        _retryLazy(placeholder) {
            if (placeholder.dataset.loaded) return;
            if (placeholder.dataset.retried) return;
            placeholder.dataset.retried = 'true';
            placeholder.dataset.loading = 'true';

            const index = placeholder.dataset.index;
            const img = new Image();

            img.onload = () => {
                placeholder.appendChild(img);
                placeholder.dataset.loaded = 'true';
                delete placeholder.dataset.loading;
                requestAnimationFrame(() => placeholder.classList.add('loaded'));
            };

            img.onerror = () => {
                delete placeholder.dataset.loading;
            };

            if (this.apis.length > 1) {
                img.src = `${this.apis[1]}?t=${Date.now()}_${index}`;
            }
        }

        _createPlaceholder() {
            const div = document.createElement('div');
            div.className = 'wallpaper-image';
            return div;
        }

        _addPlaceholders(count) {
            for (let i = 0; i < count; i++) {
                const placeholder = this._createPlaceholder();
                placeholder.dataset.index = this.imageCounter++;
                this.container.appendChild(placeholder);
                this.images.push(placeholder);
                this.observer.observe(placeholder);
            }
        }

        _cleanup() {
            while (this.images.length > this.maxImages) {
                const old = this.images.shift();
                this.observer.unobserve(old);
                delete old.dataset.index;
                delete old.dataset.loaded;
                delete old.dataset.loading;
                delete old.dataset.retried;
                old.remove();
            }
        }

        _autoScroll() {
            if (this.isDestroyed) return;

            this.container.scrollTop += this.scrollSpeed;

            const scrollBottom = this.container.scrollTop + this.container.clientHeight;
            if (this.container.scrollHeight - scrollBottom < this.loadThreshold) {
                this._addPlaceholders(this.batchSize);
                this._cleanup();
            }

            this.autoScrollId = requestAnimationFrame(() => this._autoScroll());
        }

        _startAutoScroll() {
            this._addPlaceholders(this.batchSize);
            this.autoScrollId = requestAnimationFrame(() => this._autoScroll());
        }

        async _loadInitialImages() {
            const loadingText = document.getElementById('loadingText');
            const loadingBar = document.getElementById('loadingBar');
            const loadingPercent = document.getElementById('loadingPercent');

            if (loadingText && this.loadingTexts.length > 1) {
                this.textInterval = setInterval(() => {
                    this.currentLoadingTextIndex = (this.currentLoadingTextIndex + 1) % this.loadingTexts.length;
                    loadingText.textContent = this.loadingTexts[this.currentLoadingTextIndex];
                }, this.textSwitchInterval);
            }

            const placeholders = [];
            for (let i = 0; i < this.preloadCount; i++) {
                const p = this._createPlaceholder();
                p.dataset.index = this.imageCounter++;
                this.container.appendChild(p);
                this.images.push(p);
                placeholders.push(p);
            }

            let loadedCount = 0;

            const loadPromises = placeholders.map((p, i) =>
                this._loadWithRetry(p.dataset.index)
                    .then((img) => {
                        p.appendChild(img);
                        p.dataset.loaded = 'true';
                        p.classList.add('loaded');

                        loadedCount++;
                        const percent = Math.round((loadedCount / this.preloadCount) * 100);
                        if (loadingBar) loadingBar.style.width = `${percent}%`;
                        if (loadingPercent) loadingPercent.textContent = `${percent}%`;
                    })
                    .catch(() => {
                        Logger.error(`[壁纸] 第 ${i + 1} 张加载失败`);
                        loadedCount++;
                        const percent = Math.round((loadedCount / this.preloadCount) * 100);
                        if (loadingBar) loadingBar.style.width = `${percent}%`;
                        if (loadingPercent) loadingPercent.textContent = `${percent}%`;
                    })
            );

            await Promise.all(loadPromises);

            if (this.textInterval) {
                clearInterval(this.textInterval);
                this.textInterval = null;
            }

            placeholders.forEach((p) => this.observer.observe(p));
        }
    }

    window.WallpaperScroller = WallpaperScroller;
})();
