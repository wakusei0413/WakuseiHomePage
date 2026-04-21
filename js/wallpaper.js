/**
 * 壁纸滚动模块 - 独立封装
 * 功能：无限滚动壁纸、竞速加载、懒加载、自动滚动
 */

import { logger } from './logger.js';

function WallpaperScroller(containerId, wallpaperConfig, loadingConfig, onReady) {
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

    this.apis =
        this.wallpaperConfig.apis ||
        (function () {
            logger.warn('[壁纸] 未配置壁纸 API，壁纸功能不可用');
            return [];
        })();
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
}

WallpaperScroller.prototype.init = function () {
    const self = this;

    this.container = document.getElementById(this.containerId);
    if (!this.container) {
        logger.error('[壁纸] 容器元素未找到:', this.containerId);
        return;
    }

    if (!this.infiniteScrollEnabled) {
        logger.log('[壁纸] 无限滚动已禁用');
        return;
    }

    this._setupObserver();
    this._disableInteraction();

    this._loadInitialImages()
        .then(function () {
            self.onReady();
            self._startAutoScroll();
        })
        .catch(function (err) {
            logger.error('[壁纸] 初始化失败:', err);
            self.onReady();
        });
};

WallpaperScroller.prototype.destroy = function () {
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
};

WallpaperScroller.prototype._setupObserver = function () {
    const self = this;

    this.observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    self._loadImageIntoPlaceholder(entry.target);
                }
            });
        },
        {
            root: this.container,
            rootMargin: '400px 0px',
            threshold: 0.01
        }
    );
};

WallpaperScroller.prototype._disableInteraction = function () {
    this.container.addEventListener(
        'wheel',
        function (e) {
            e.preventDefault();
        },
        { passive: false }
    );
    this.container.addEventListener(
        'touchstart',
        function (e) {
            e.preventDefault();
        },
        { passive: false }
    );
    this.container.addEventListener(
        'touchmove',
        function (e) {
            e.preventDefault();
        },
        { passive: false }
    );
    this.container.addEventListener(
        'mousedown',
        function (e) {
            e.preventDefault();
        },
        { passive: false }
    );
};

WallpaperScroller.prototype._buildImageUrl = function (api, index) {
    return api + '?t=' + Date.now() + '_' + index;
};

WallpaperScroller.prototype._clearImageRequest = function (img) {
    img.onload = null;
    img.onerror = null;
    if (img.src) {
        img.removeAttribute('src');
    }
};

WallpaperScroller.prototype._raceLoadImage = function (index) {
    const self = this;

    return new Promise(function (resolve, reject) {
        const images = self.apis.map(function () {
            return new Image();
        });
        let done = false;
        let failureCount = 0;

        const timer = setTimeout(function () {
            if (done) return;
            done = true;
            images.forEach(function (img) {
                self._clearImageRequest(img);
            });
            reject(new Error('Timeout'));
        }, self.raceTimeout);

        function finishSuccess(img) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            images.forEach(function (candidate) {
                if (candidate !== img) {
                    self._clearImageRequest(candidate);
                }
            });
            resolve(img);
        }

        function finishFailure() {
            if (done) return;

            failureCount++;
            if (failureCount < images.length) return;

            done = true;
            clearTimeout(timer);
            images.forEach(function (img) {
                self._clearImageRequest(img);
            });
            reject(new Error('All wallpaper sources failed'));
        }

        images.forEach(function (img, i) {
            img.onload = function () {
                finishSuccess(img);
            };
            img.onerror = finishFailure;
            img.src = self._buildImageUrl(self.apis[i], index);
        });
    });
};

WallpaperScroller.prototype._loadWithRetry = function (index) {
    const self = this;
    let attempt = 0;

    function tryLoad() {
        attempt++;

        return self._raceLoadImage(index).catch(function (err) {
            logger.log('[壁纸] 加载中... (' + attempt + '/' + self.maxRetries + ')');
            if (attempt >= self.maxRetries) {
                throw err;
            }
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
            return new Promise(function (resolve) {
                setTimeout(resolve, delay);
            }).then(function () {
                return tryLoad();
            });
        });
    }

    return tryLoad();
};

WallpaperScroller.prototype._loadImageIntoPlaceholder = function (placeholder) {
    if (placeholder.dataset.loaded) return;
    if (placeholder.dataset.loading) return;

    placeholder.dataset.loading = 'true';

    this._loadWithRetry(placeholder.dataset.index)
        .then(function (img) {
            placeholder.appendChild(img);
            placeholder.dataset.loaded = 'true';
            delete placeholder.dataset.loading;
            requestAnimationFrame(function () {
                placeholder.classList.add('loaded');
            });
        })
        .catch(function () {
            delete placeholder.dataset.loading;
            logger.error('[壁纸] 懒加载失败:', placeholder.dataset.index);
        });
};

WallpaperScroller.prototype._createPlaceholder = function () {
    const div = document.createElement('div');
    div.className = 'wallpaper-image';
    return div;
};

WallpaperScroller.prototype._addPlaceholders = function (count) {
    let i;
    for (i = 0; i < count; i++) {
        const placeholder = this._createPlaceholder();
        placeholder.dataset.index = this.imageCounter++;
        this.container.appendChild(placeholder);
        this.images.push(placeholder);
        this.observer.observe(placeholder);
    }
};

WallpaperScroller.prototype._cleanup = function () {
    while (this.images.length > this.maxImages) {
        const old = this.images.shift();
        this.observer.unobserve(old);
        delete old.dataset.index;
        delete old.dataset.loaded;
        delete old.dataset.loading;
        old.remove();
    }
};

WallpaperScroller.prototype._autoScroll = function () {
    const self = this;
    const scrollBottom = this.container.scrollTop + this.container.clientHeight;

    if (this.isDestroyed) return;

    this.container.scrollTop += this.scrollSpeed;

    if (this.container.scrollHeight - scrollBottom < this.loadThreshold) {
        this._addPlaceholders(this.batchSize);
        this._cleanup();
    }

    this.autoScrollId = requestAnimationFrame(function () {
        self._autoScroll();
    });
};

WallpaperScroller.prototype._startAutoScroll = function () {
    const self = this;

    this._addPlaceholders(this.batchSize);
    this.autoScrollId = requestAnimationFrame(function () {
        self._autoScroll();
    });
};

WallpaperScroller.prototype._loadInitialImages = function () {
    const self = this;
    const loadingText = document.getElementById('loadingText');
    const loadingBar = document.getElementById('loadingBar');
    const loadingPercent = document.getElementById('loadingPercent');
    const placeholders = [];
    let loadedCount = 0;
    let i;

    if (loadingText && this.loadingTexts.length > 1) {
        this.textInterval = setInterval(function () {
            self.currentLoadingTextIndex = (self.currentLoadingTextIndex + 1) % self.loadingTexts.length;
            loadingText.textContent = self.loadingTexts[self.currentLoadingTextIndex];
        }, this.textSwitchInterval);
    }

    for (i = 0; i < this.preloadCount; i++) {
        const placeholder = this._createPlaceholder();
        placeholder.dataset.index = this.imageCounter++;
        this.container.appendChild(placeholder);
        this.images.push(placeholder);
        placeholders.push(placeholder);
    }

    function updateProgress() {
        const percent = Math.round((loadedCount / self.preloadCount) * 100);
        if (loadingBar) loadingBar.style.width = percent + '%';
        if (loadingPercent) loadingPercent.textContent = percent + '%';
    }

    return Promise.all(
        placeholders.map(function (placeholder, index) {
            return self
                ._loadWithRetry(placeholder.dataset.index)
                .then(function (img) {
                    placeholder.appendChild(img);
                    placeholder.dataset.loaded = 'true';
                    placeholder.classList.add('loaded');
                    loadedCount++;
                    updateProgress();
                })
                .catch(function () {
                    logger.error('[壁纸] 第 ' + (index + 1) + ' 张加载失败');
                    loadedCount++;
                    updateProgress();
                });
        })
    ).then(function () {
        placeholders.forEach(function (placeholder) {
            self.observer.observe(placeholder);
        });

        if (self.textInterval) {
            clearInterval(self.textInterval);
            self.textInterval = null;
        }
    });
};

export { WallpaperScroller };
