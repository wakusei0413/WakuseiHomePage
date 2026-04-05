# 壁纸系统重构计划

## 目标
实现自动匀速滚动的壁纸墙，真正懒加载，进入视野才加载，离开视野释放。

## 需求确认
1. ✅ API: `https://www.loliapi.com/bg/`
2. ✅ 滚动速度: 1.5px/帧 (折中)
3. ✅ 无限循环: 不断加载新图片
4. ✅ 平滑滚动: requestAnimationFrame

## 修改内容

### 1. JS (main.js) - 壁纸模块完全重写

**核心逻辑:**
```javascript
// 创建占位符（不加载图片）
function createPlaceholder(index) {
    const div = document.createElement('div');
    div.className = 'wallpaper-image';
    div.dataset.url = `${API_URL}?t=${Date.now()}_${index}`;
    div.style.background = 'linear-gradient(135deg, #1a1a1a, #2d2d2d)';
    return div;
}

// 真正懒加载
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadImage(entry.target);  // 进入视野：加载
        } else {
            unloadImage(entry.target); // 离开视野：卸载释放
        }
    });
});

// 自动匀速滚动
function autoScroll() {
    container.scrollTop += 1.5; // 1.5px/帧
    requestAnimationFrame(autoScroll);
}
```

**功能点:**
- 使用 `<div>` 作为占位符，默认显示背景色
- 每个占位符独立监听 Intersection Observer
- 进入视野时才创建 `<img>` 并设置 `src`
- 离开视野时移除 `<img>` 释放内存
- 自动滚动到底部前预加载新图片
- 限制最大图片数量，移除顶部旧图片

**禁用交互:**
```javascript
container.addEventListener('wheel', (e) => e.preventDefault());
container.addEventListener('touchstart', (e) => e.preventDefault());
container.addEventListener('touchmove', (e) => e.preventDefault());
```

### 2. CSS (style.css) - 可能需要调整

确保 `.wallpaper-image` 样式支持新结构:
```css
.wallpaper-image {
    position: relative; /* 支持内部 img 绝对定位 */
    width: 100%;
    min-height: 300px;
    background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
}

.wallpaper-image img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}
```

## 预期效果
1. 页面加载时只创建占位符，不加载图片
2. 自动匀速向上滚动
3. 图片进入视野时立即加载显示
4. 图片离开视野后释放内存
5. 无法手动滑动，完全自动
6. 无限循环加载新图片

## 文件修改
- `js/main.js`: 重写壁纸模块 (176-275行)
- `css/style.css`: 可能需要调整图片样式 (538-551行)
