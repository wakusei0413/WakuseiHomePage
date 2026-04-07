/**
 * 壁纸滚动模块 - 独立封装
 * 功能：无限滚动壁纸、竞速加载、懒加载、自动滚动
 */

(function() {
    'use strict';
    
    class WallpaperScroller {
        /**
         * @param {string} containerId - 壁纸容器 DOM ID
         * @param {Object} wallpaperConfig - 壁纸配置 (CONFIG.wallpaper)
         * @param {Object} loadingConfig - 加载界面配置 (CONFIG.loading)
         * @param {Function} onReady - 首屏加载完成回调
         */
        constructor(containerId, wallpaperConfig, loadingConfig, onReady) {
            this.containerId = containerId;
            this.container = null;
            this.wallpaperConfig = wallpaperConfig || {};
            this.loadingConfig = loadingConfig || {};
            this.onReady = onReady || function() {};
            
            // 状态
            this.imageCounter = 0;
            this.images = [];
            this.observer = null;
            this.currentLoadingTextIndex = 0;
            this.textInterval = null;
            this.isDestroyed = false;
            
            // 配置参数（带默认值）
            this.apis = this.wallpaperConfig.apis || [
                'https://www.loliapi.com/bg/',
                'https://www.dmoe.cc/random.php'
            ];
            this.raceTimeout = this.wallpaperConfig.raceTimeout || 10000;
            this.maxRetries = this.wallpaperConfig.maxRetries || 100;
            this.preloadCount = this.wallpaperConfig.preloadCount || 3;
            
            // 无限滚动配置
            const infiniteScroll = this.wallpaperConfig.infiniteScroll || {};
            this.infiniteScrollEnabled = infiniteScroll.enabled !== false;
            this.batchSize = infiniteScroll.batchSize || 3;
            this.maxImages = infiniteScroll.maxImages || 20;
            this.scrollSpeed = infiniteScroll.speed || 1.5;
            this.loadThreshold = 500;
            
            // 加载文字配置
            this.loadingTexts = this.loadingConfig.texts || ['少女祈祷中...'];
            this.textSwitchInterval = this.loadingConfig.textSwitchInterval || 2000;
        }
        
        /**
         * 初始化壁纸模块
         */
        init() {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                console.warn('[壁纸] 容器元素未找到:', this.containerId);
                return;
            }
            
            if (!this.infiniteScrollEnabled) {
                console.log('[壁纸] 无限滚动已禁用');
                return;
            }
            
            // 设置 IntersectionObserver
            this._setupObserver();
            
            // 禁用用户交互
            this._disableInteraction();
            
            // 开始加载
            this._loadInitialImages().then(() => {
                // 首屏加载完成，通知回调
                this.onReady();
                
                // 开始自动滚动
                this._startAutoScroll();
            }).catch(err => {
                console.error('[壁纸] 初始化失败:', err);
                // 即使失败也显示页面
                this.onReady();
            });
        }
        
        /**
         * 销毁模块（清理资源）
         */
        destroy() {
            this.isDestroyed = true;
            
            if (this.textInterval) {
                clearInterval(this.textInterval);
                this.textInterval = null;
            }
            
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            
            // 清理 DOM
            if (this.container) {
                this.container.innerHTML = '';
            }
            
            this.images = [];
        }
        
        // ==================== 私有方法 ====================
        
        /**
         * 设置 IntersectionObserver
         */
        _setupObserver() {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this._loadImageLazy(entry.target);
                    }
                });
            }, {
                root: this.container,
                rootMargin: '400px 0px',
                threshold: 0.01
            });
        }
        
        /**
         * 禁用用户交互
         */
        _disableInteraction() {
            this.container.addEventListener('wheel', e => e.preventDefault(), { passive: false });
            this.container.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
            this.container.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
            this.container.addEventListener('mousedown', e => e.preventDefault());
        }
        
        /**
         * 竞速加载单张图片
         */
        _raceLoadImage(index) {
            return new Promise((resolve, reject) => {
                const ts = Date.now();
                const images = this.apis.map(api => new Image());
                const urls = this.apis.map((api, i) => `${api}?t=${ts}_${index}`);
                let done = false;
                
                const timer = setTimeout(() => {
                    if (!done) {
                        done = true;
                        images.forEach(img => {
                            img.onload = img.onerror = null;
                            img.src = '';
                        });
                        reject(new Error('Timeout'));
                    }
                }, this.raceTimeout);
                
                const finish = (img) => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    images.forEach(i => {
                        i.onload = i.onerror = null;
                        if (i !== img) i.src = '';
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
        
        /**
         * 带重试的加载
         */
        async _loadWithRetry(index) {
            for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
                try {
                    return await this._raceLoadImage(index);
                } catch (err) {
                    console.log(`[壁纸] 加载中... (${attempt}/${this.maxRetries})`);
                }
            }
            throw new Error('Max retries exceeded');
        }
        
        /**
         * 懒加载（进入视野时）
         */
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
        
        /**
         * 懒加载失败时切换 API 重试
         */
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
        
        /**
         * 创建占位符
         */
        _createPlaceholder() {
            const div = document.createElement('div');
            div.className = 'wallpaper-image';
            return div;
        }
        
        /**
         * 添加更多占位符
         */
        _addPlaceholders(count) {
            for (let i = 0; i < count; i++) {
                const placeholder = this._createPlaceholder();
                placeholder.dataset.index = this.imageCounter++;
                this.container.appendChild(placeholder);
                this.images.push(placeholder);
                this.observer.observe(placeholder);
            }
        }
        
        /**
         * 清理旧图片
         */
        _cleanup() {
            while (this.images.length > this.maxImages) {
                const old = this.images.shift();
                this.observer.unobserve(old);
                old.remove();
            }
        }
        
        /**
         * 自动滚动
         */
        _autoScroll() {
            if (this.isDestroyed) return;
            
            this.container.scrollTop += this.scrollSpeed;
            
            const scrollBottom = this.container.scrollTop + this.container.clientHeight;
            if (this.container.scrollHeight - scrollBottom < this.loadThreshold) {
                this._addPlaceholders(this.batchSize);
                this._cleanup();
            }
            
            requestAnimationFrame(() => this._autoScroll());
        }
        
        /**
         * 开始自动滚动
         */
        _startAutoScroll() {
            this._addPlaceholders(this.batchSize);
            requestAnimationFrame(() => this._autoScroll());
        }
        
        /**
         * 加载首屏图片
         */
        async _loadInitialImages() {
            const overlay = document.getElementById('loadingOverlay');
            const loadingText = document.getElementById('loadingText');
            const loadingBar = document.getElementById('loadingBar');
            const loadingPercent = document.getElementById('loadingPercent');
            
            // 文字切换定时器
            if (loadingText && this.loadingTexts.length > 1) {
                this.textInterval = setInterval(() => {
                    this.currentLoadingTextIndex = (this.currentLoadingTextIndex + 1) % this.loadingTexts.length;
                    loadingText.textContent = this.loadingTexts[this.currentLoadingTextIndex];
                }, this.textSwitchInterval);
            }
            
            // 创建占位符
            const placeholders = [];
            for (let i = 0; i < this.preloadCount; i++) {
                const p = this._createPlaceholder();
                p.dataset.index = this.imageCounter++;
                this.container.appendChild(p);
                this.images.push(p);
                placeholders.push(p);
            }
            
            let loadedCount = 0;
            
            // 并行加载前 preloadCount 张，带进度跟踪
            const loadPromises = placeholders.map((p, i) => 
                this._loadWithRetry(p.dataset.index).then(img => {
                    p.appendChild(img);
                    p.dataset.loaded = 'true';
                    p.classList.add('loaded');
                    
                    // 更新进度
                    loadedCount++;
                    const percent = Math.round((loadedCount / this.preloadCount) * 100);
                    if (loadingBar) loadingBar.style.width = `${percent}%`;
                    if (loadingPercent) loadingPercent.textContent = `${percent}%`;
                }).catch(() => {
                    console.error(`[壁纸] 第 ${i + 1} 张加载失败`);
                    loadedCount++;
                    const percent = Math.round((loadedCount / this.preloadCount) * 100);
                    if (loadingBar) loadingBar.style.width = `${percent}%`;
                    if (loadingPercent) loadingPercent.textContent = `${percent}%`;
                })
            );
            
            await Promise.all(loadPromises);
            
            // 清除文字切换定时器
            if (this.textInterval) {
                clearInterval(this.textInterval);
                this.textInterval = null;
            }
            
            // 开始观察占位符
            placeholders.forEach(p => this.observer.observe(p));
        }
    }
    
    // 导出到全局
    window.WallpaperScroller = WallpaperScroller;
})();