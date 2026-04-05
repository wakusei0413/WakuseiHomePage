# 壁纸系统竞速加载计划

## 需求确认

1. ✅ **双 API 竞速**: 两个 API 同时请求，谁先成功谁显示
2. ✅ **首屏阻塞**: 第一张图片加载完成前，网页不显示
3. ✅ **超时重试**: 10秒超时后立即重新竞速，快速及时
4. ✅ **无限重试**: 直到第一张成功加载

## API 列表
- API 1: `https://www.loliapi.com/bg/`
- API 2: `https://app.zichen.zone/api/acg/api.php`

## 实现方案

### 1. 竞速加载函数（带超时和重试）

```javascript
// 竞速加载单张图片
function raceLoadImage(index, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const api1 = `https://www.loliapi.com/bg/?t=${Date.now()}_${index}`;
        const api2 = `https://app.zichen.zone/api/acg/api.php?t=${Date.now()}_${index}`;
        
        const img1 = new Image();
        const img2 = new Image();
        let resolved = false;
        
        // 超时计时器
        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                cleanup();
                reject(new Error('Timeout'));
            }
        }, timeout);
        
        function cleanup() {
            clearTimeout(timer);
            img1.onload = img1.onerror = null;
            img2.onload = img2.onerror = null;
            // 取消未完成的请求
            img1.src = '';
            img2.src = '';
        }
        
        function onSuccess(winner) {
            if (resolved) return;
            resolved = true;
            cleanup();
            resolve(winner);
        }
        
        function onError() {
            if (resolved) return;
            // 检查是否两个都失败了
            if ((img1.complete && img1.naturalWidth === 0) && 
                (img2.complete && img2.naturalWidth === 0)) {
                resolved = true;
                cleanup();
                reject(new Error('Both failed'));
            }
        }
        
        img1.onload = () => onSuccess(img1);
        img2.onload = () => onSuccess(img2);
        img1.onerror = onError;
        img2.onerror = onError;
        
        // 同时发起请求
        img1.src = api1;
        img2.src = api2;
    });
}

// 带重试的加载（直到成功）
async function loadWithRetry(index, maxRetries = 100) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const img = await raceLoadImage(index);
            return img;
        } catch (err) {
            console.log(`[壁纸] 第 ${attempt + 1} 次尝试失败，立即重试...`);
            // 立即重试，不等待
        }
    }
    throw new Error('Max retries exceeded');
}
```

### 2. 修改后的初始化流程

```javascript
async function init() {
    // 确保主容器隐藏
    const mainContainer = document.querySelector('.container');
    if (mainContainer) {
        mainContainer.classList.remove('visible');
    }
    
    // 1. 加载第一张（竞速 + 自动重试直到成功）
    console.log('[壁纸] 开始加载第一张图片...');
    const firstImg = await loadWithRetry(0);
    
    const firstPlaceholder = createPlaceholder();
    firstPlaceholder.appendChild(firstImg);
    firstPlaceholder.dataset.loaded = 'true';
    firstPlaceholder.classList.add('loaded');
    container.appendChild(firstPlaceholder);
    images.push(firstPlaceholder);
    imageObserver.observe(firstPlaceholder);
    
    console.log('[壁纸] 第一张加载完成，显示网页');
    
    // 2. 第一张成功后，显示主容器
    if (mainContainer) {
        mainContainer.classList.add('visible');
    }
    
    // 3. 继续添加其他占位符
    addImages(BATCH_SIZE * 2 - 1);
    
    // 4. 启动自动滚动
    disableInteraction();
    requestAnimationFrame(autoScroll);
}
```

### 3. 其他占位符的加载策略

其他图片仍使用单 API 懒加载（进入视野才加载），因为只有第一张需要竞速确保首屏速度。

如果需要所有图片都竞速：
```javascript
function loadImage(placeholder) {
    if (placeholder.dataset.loaded === 'true') return;
    
    const index = placeholder.dataset.index;
    
    // 对非首屏图片也使用竞速
    raceLoadImage(index, 15000).then(img => {
        placeholder.appendChild(img);
        placeholder.dataset.loaded = 'true';
        placeholder.classList.add('loaded');
    }).catch(() => {
        // 失败则显示占位背景
        placeholder.classList.add('loaded');
    });
}
```

### 4. 防止内存泄漏

```javascript
// 竞速完成后清理失败的图片
function cleanup() {
    // ... 原有清理代码
    
    // 清理竞速失败的图片对象
    setTimeout(() => {
        img1.src = '';
        img2.src = '';
    }, 100);
}
```

## 完整代码结构

```javascript
(function initWallpaperScroller() {
    const container = document.getElementById('wallpaperScrollArea');
    if (!container) return;
    
    const { infiniteScroll } = CONFIG.wallpaper;
    if (!infiniteScroll?.enabled) return;
    
    const BATCH_SIZE = infiniteScroll.batchSize || 3;
    const MAX_IMAGES = infiniteScroll.maxImages || 20;
    const SCROLL_SPEED = 1.5;
    const LOAD_THRESHOLD = 500;
    
    let imageCounter = 0;
    let images = [];
    
    // ========== 竞速加载核心函数 ==========
    function raceLoadImage(index, timeout = 10000) {
        // ... 实现见上文
    }
    
    async function loadWithRetry(index, maxRetries = 100) {
        // ... 实现见上文
    }
    
    // ========== 占位符管理 ==========
    function createPlaceholder() {
        // ... 原有代码
    }
    
    // ========== 懒加载 Observer ==========
    const imageObserver = new IntersectionObserver((entries) => {
        // ... 原有代码
    });
    
    // ========== 自动滚动 ==========
    function autoScroll() {
        // ... 原有代码
    }
    
    // ========== 禁用交互 ==========
    function disableInteraction() {
        // ... 原有代码
    }
    
    // ========== 初始化（首屏阻塞）==========
    async function init() {
        // ... 实现见上文
    }
    
    init();
})();
```

## 修改文件
- `js/main.js`: 重写壁纸模块，添加竞速加载和首屏阻塞

## 预期效果
1. 页面初始状态：黑色背景，主内容隐藏
2. 两个 API 同时请求第一张图片
3. 谁先响应快谁显示（通常 1-3 秒）
4. 如果 10 秒都没成功，立即重新竞速
5. 第一张成功后，淡入主内容
6. 其他图片进入视野时才懒加载

## 注意事项
- 竞速失败的图片对象需要在 100ms 后清理，避免内存泄漏
- 如果两个 API 都长期不可用，会一直重试（最多 100 次）
- 第一张加载期间，用户看到的是纯黑背景（或可以添加简单的 loading 动画）
