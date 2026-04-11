/**
 * 壁纸滚动模块 - 独立封装
 * 功能：无限滚动壁纸、竞速加载、懒加载、自动滚动
 */

(function () {
    'use strict';

    function WallpaperScroller(containerId, wallpaperConfig, loadingConfig, onReady) {
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

    WallpaperScroller.prototype.init = function () {
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

        var self = this;
        this._loadInitialImages()
            .then(function () {
                self.onReady();
                self._startAutoScroll();
            })
            .catch(function (err) {
                Logger.error('[壁纸] 初始化失败:', err);
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
        var self = this;
        this.observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        self._loadImageLazy(entry.target);
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
        this.container.addEventListener('mousedown', function (e) {
            e.preventDefault();
        });
    };

    WallpaperScroller.prototype._raceLoadImage = function (index) {
        var self = this;
        return new Promise(function (resolve, reject) {
            var ts = Date.now();
            var images = self.apis.map(function () {
                return new Image();
            });
            var urls = self.apis.map(function (api) {
                return api + '?t=' + ts + '_' + index;
            });
            var done = false;

            var timer = setTimeout(function () {
                if (!done) {
                    done = true;
                    images.forEach(function (img) {
                        img.onload = img.onerror = null;
                        if (img.src) img.removeAttribute('src');
                    });
                    reject(new Error('Timeout'));
                }
            }, self.raceTimeout);

            var finish = function (img) {
                if (done) return;
                done = true;
                clearTimeout(timer);
                images.forEach(function (i) {
                    i.onload = i.onerror = null;
                    if (i !== img) {
                        if (i.src) i.removeAttribute('src');
                    }
                });
                resolve(img);
            };

            images.forEach(function (img, i) {
                img.onload = function () {
                    finish(img);
                };
                img.onerror = function () {
                    if (done) return;
                };
                img.src = urls[i];
            });
        });
    };

    WallpaperScroller.prototype._loadWithRetry = function (index) {
        var self = this;
        var attempt = 1;

        function tryOnce() {
            return self._raceLoadImage(index).then(
                function (result) {
                    return result;
                },
                function (err) {
                    Logger.log('[壁纸] 加载中... (' + attempt + '/' + self.maxRetries + ')');
                    attempt++;
                    if (attempt <= self.maxRetries) {
                        return tryOnce();
                    }
                    throw new Error('Max retries exceeded');
                }
            );
        }

        return tryOnce();
    };

    WallpaperScroller.prototype._loadImageLazy = function (placeholder) {
        var self = this;
        if (placeholder.dataset.loaded) return;
        if (placeholder.dataset.loading) return;
        placeholder.dataset.loading = 'true';

        var index = placeholder.dataset.index;
        var img = new Image();

        img.onload = function () {
            placeholder.appendChild(img);
            placeholder.dataset.loaded = 'true';
            delete placeholder.dataset.loading;
            requestAnimationFrame(function () {
                placeholder.classList.add('loaded');
            });
        };

        img.onerror = function () {
            delete placeholder.dataset.loading;
            self._retryLazy(placeholder);
        };

        img.src = self.apis[0] + '?t=' + Date.now() + '_' + index;
    };

    WallpaperScroller.prototype._retryLazy = function (placeholder) {
        var self = this;
        if (placeholder.dataset.loaded) return;
        if (placeholder.dataset.retried) return;
        placeholder.dataset.retried = 'true';
        placeholder.dataset.loading = 'true';

        var index = placeholder.dataset.index;
        var img = new Image();

        img.onload = function () {
            placeholder.appendChild(img);
            placeholder.dataset.loaded = 'true';
            delete placeholder.dataset.loading;
            requestAnimationFrame(function () {
                placeholder.classList.add('loaded');
            });
        };

        img.onerror = function () {
            delete placeholder.dataset.loading;
        };

        if (self.apis.length > 1) {
            img.src = self.apis[1] + '?t=' + Date.now() + '_' + index;
        }
    };

    WallpaperScroller.prototype._createPlaceholder = function () {
        var div = document.createElement('div');
        div.className = 'wallpaper-image';
        return div;
    };

    WallpaperScroller.prototype._addPlaceholders = function (count) {
        for (var i = 0; i < count; i++) {
            var placeholder = this._createPlaceholder();
            placeholder.dataset.index = this.imageCounter++;
            this.container.appendChild(placeholder);
            this.images.push(placeholder);
            this.observer.observe(placeholder);
        }
    };

    WallpaperScroller.prototype._cleanup = function () {
        while (this.images.length > this.maxImages) {
            var old = this.images.shift();
            this.observer.unobserve(old);
            delete old.dataset.index;
            delete old.dataset.loaded;
            delete old.dataset.loading;
            delete old.dataset.retried;
            old.remove();
        }
    };

    WallpaperScroller.prototype._autoScroll = function () {
        if (this.isDestroyed) return;

        this.container.scrollTop += this.scrollSpeed;

        var scrollBottom = this.container.scrollTop + this.container.clientHeight;
        if (this.container.scrollHeight - scrollBottom < this.loadThreshold) {
            this._addPlaceholders(this.batchSize);
            this._cleanup();
        }

        var self = this;
        this.autoScrollId = requestAnimationFrame(function () {
            self._autoScroll();
        });
    };

    WallpaperScroller.prototype._startAutoScroll = function () {
        this._addPlaceholders(this.batchSize);
        var self = this;
        this.autoScrollId = requestAnimationFrame(function () {
            self._autoScroll();
        });
    };

    WallpaperScroller.prototype._loadInitialImages = function () {
        var self = this;
        var loadingText = document.getElementById('loadingText');
        var loadingBar = document.getElementById('loadingBar');
        var loadingPercent = document.getElementById('loadingPercent');

        if (loadingText && self.loadingTexts.length > 1) {
            self.textInterval = setInterval(function () {
                self.currentLoadingTextIndex = (self.currentLoadingTextIndex + 1) % self.loadingTexts.length;
                loadingText.textContent = self.loadingTexts[self.currentLoadingTextIndex];
            }, self.textSwitchInterval);
        }

        var placeholders = [];
        for (var i = 0; i < self.preloadCount; i++) {
            var p = self._createPlaceholder();
            p.dataset.index = self.imageCounter++;
            self.container.appendChild(p);
            self.images.push(p);
            placeholders.push(p);
        }

        var loadedCount = 0;

        var loadPromises = placeholders.map(function (p, i) {
            return self
                ._loadWithRetry(p.dataset.index)
                .then(function (img) {
                    p.appendChild(img);
                    p.dataset.loaded = 'true';
                    p.classList.add('loaded');

                    loadedCount++;
                    var percent = Math.round((loadedCount / self.preloadCount) * 100);
                    if (loadingBar) loadingBar.style.width = percent + '%';
                    if (loadingPercent) loadingPercent.textContent = percent + '%';
                })
                .catch(function () {
                    Logger.error('[壁纸] 第 ' + (i + 1) + ' 张加载失败');
                    loadedCount++;
                    var percent = Math.round((loadedCount / self.preloadCount) * 100);
                    if (loadingBar) loadingBar.style.width = percent + '%';
                    if (loadingPercent) loadingPercent.textContent = percent + '%';
                });
        });

        return Promise.all(loadPromises).then(function () {
            if (self.textInterval) {
                clearInterval(self.textInterval);
                self.textInterval = null;
            }

            placeholders.forEach(function (p) {
                self.observer.observe(p);
            });
        });
    };

    window.WallpaperScroller = WallpaperScroller;
})();
