/**
 * 个人主页 - 主脚本
 * 功能：打字机效果 + 时间 + 天气 + 壁纸轮播
 * 配置：config.js
 */

// ========== 等待配置加载 ==========
(function() {
    if (typeof CONFIG === 'undefined') {
        console.error('配置文件未加载！请确保 config.js 在 main.js 之前引入');
        return;
    }
    
    if (CONFIG.debug && CONFIG.debug.consoleLog) {
        console.log('%c配置已加载 ✓', 'color: #FFE600; font-size: 12px;');
        console.log('Slogan 数量:', CONFIG.slogans.list.length);
    }
})();

// ========== 打字机效果（带 Slogan 循环）==========
(function initTypewriter() {
    const textEl = document.getElementById('typewriterText');
    const cursor = document.getElementById('cursor');
    const container = document.getElementById('bioContainer');
    
    if (!textEl) return;
    
    const slogans = CONFIG.slogans.list;
    const typeSpeed = CONFIG.slogans.typeSpeed || 60;
    const pauseDuration = CONFIG.slogans.pauseDuration || 5000;
    const loop = CONFIG.slogans.loop !== false;
    const mode = CONFIG.slogans.mode || 'random';
    
    let currentIndex = 0;
    let isTyping = false;
    
    // 设置容器高度
    if (container) container.style.minHeight = '100px';
    
    // 获取下一个 slogan
    function getNextSlogan() {
        if (mode === 'random') {
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * slogans.length);
            } while (newIndex === currentIndex && slogans.length > 1);
            currentIndex = newIndex;
        } else {
            currentIndex = (currentIndex + 1) % slogans.length;
        }
        return slogans[currentIndex];
    }
    
    // 打字效果
    function typeText(text, callback) {
        isTyping = true;
        textEl.textContent = '';
        let i = 0;
        
        function type() {
            if (i < text.length) {
                textEl.textContent += text.charAt(i);
                i++;
                setTimeout(type, typeSpeed);
            } else {
                isTyping = false;
                if (callback) callback();
            }
        }
        type();
    }
    
    // 清除文本
    function clearText(callback) {
        const currentText = textEl.textContent;
        let i = currentText.length;
        
        function clear() {
            if (i > 0) {
                textEl.textContent = currentText.substring(0, i - 1);
                i--;
                setTimeout(clear, 20);
            } else {
                if (callback) callback();
            }
        }
        clear();
    }
    
    // 主循环
    function runTypewriter() {
        const slogan = getNextSlogan();
        
        if (CONFIG.debug && CONFIG.debug.consoleLog) {
            console.log(`[Slogan ${currentIndex + 1}/${slogans.length}]:`, slogan.substring(0, 30) + '...');
        }
        
        typeText(slogan, () => {
            if (loop) {
                setTimeout(() => {
                    clearText(() => {
                        setTimeout(runTypewriter, 300);
                    });
                }, pauseDuration);
            } else {
                // 不循环，光标变慢
                if (cursor) {
                    cursor.style.animation = 'blink 1.5s step-end infinite';
                    cursor.style.opacity = '0.5';
                }
            }
        });
    }
    
    // 启动
    setTimeout(runTypewriter, CONFIG.slogans.typeSpeed * 5);
    
    // 设置光标样式
    if (cursor && CONFIG.animation) {
        if (CONFIG.animation.cursorStyle === 'line') {
            cursor.textContent = '|';
        }
    }
})();

// ========== 时间组件 ==========
(function initTime() {
    const weekdayEl = document.getElementById('weekday');
    const dateEl = document.getElementById('dateDisplay');
    const clockEl = document.getElementById('clock');
    
    const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const NUMBERS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '二十一', '二十二', '二十三', '二十四', '二十五', '二十六', '二十七', '二十八', '二十九', '三十', '三十一'];
    
    function numberToChinese(num) {
        return NUMBERS[num] || num.toString();
    }
    
    function updateTime() {
        const now = new Date();
        const config = CONFIG.time;
        
        // 星期
        if (weekdayEl && config.showWeekday !== false) {
            weekdayEl.textContent = WEEKDAYS[now.getDay()];
        }
        
        // 日期
        if (dateEl && config.showDate !== false) {
            const month = MONTHS[now.getMonth()];
            const day = numberToChinese(now.getDate());
            dateEl.textContent = `${month}${day}日`;
        }
        
        // 时间
        if (clockEl) {
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            
            if (config.format === '12h') {
                const period = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                clockEl.textContent = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${period}`;
            } else {
                clockEl.textContent = `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
            }
        }
    }
    
    updateTime();
    setInterval(updateTime, CONFIG.time.updateInterval || 1000);
})();

// ========== 壁纸轮播 ==========
(function initWallpaper() {
    const container = document.getElementById('wallpaperContainer');
    const authorEl = document.getElementById('wallpaperAuthor');
    
    if (!container) return;
    
    let currentIndex = 0;
    let wallpapers = [];
    let images = [];
    
    const config = CONFIG.wallpaper;
    const interval = config.interval || 10000;
    const count = config.count || 5;
    
    // 备用图片
    const fallbackImages = Array.from({ length: count }, (_, i) => 
        `https://picsum.photos/1920/1080?random=${i + 1}`
    );
    
    function showLoading() {
        container.innerHTML = `
            <div class="wallpaper-placeholder">
                <div class="loading-spinner"></div>
                <span>加载壁纸中...</span>
            </div>
        `;
    }
    
    function createImageElement(url, index) {
        const img = document.createElement('img');
        img.className = 'wallpaper-image';
        img.src = url;
        img.alt = `Wallpaper ${index + 1}`;
        img.loading = 'lazy';
        return img;
    }
    
    function nextWallpaper() {
        if (images.length === 0) return;
        
        images[currentIndex]?.classList.remove('active');
        currentIndex = (currentIndex + 1) % images.length;
        images[currentIndex]?.classList.add('active');
        
        if (authorEl && wallpapers[currentIndex]) {
            const wp = wallpapers[currentIndex];
            authorEl.textContent = wp.author ? `${wp.author}` : `#${currentIndex + 1}`;
        }
    }
    
    function useFallbackImages() {
        if (CONFIG.debug && CONFIG.debug.consoleLog) {
            console.log('[壁纸] 使用备用图片');
        }
        
        fallbackImages.forEach((url, index) => {
            const img = createImageElement(url, index);
            container.appendChild(img);
            images.push(img);
            wallpapers.push({ title: `壁纸 ${index + 1}`, url: url, author: 'Picsum' });
        });
        
        setTimeout(() => {
            if (images[0]) {
                images[0].classList.add('active');
                const placeholder = container.querySelector('.wallpaper-placeholder');
                if (placeholder) placeholder.style.display = 'none';
            }
            setInterval(nextWallpaper, interval);
            
            // 触发壁纸加载完成事件
            window.dispatchEvent(new CustomEvent('wallpapers-loaded'));
        }, 500);
        
        if (authorEl) authorEl.textContent = 'Picsum Photos';
    }
    
    async function fetchWallpapers() {
        showLoading();
        
        // 检测运行环境
        const isLocalFile = window.location.protocol === 'file:';
        
        // 如果是 file:// 协议，直接使用备用图片
        if (isLocalFile) {
            if (CONFIG.debug && CONFIG.debug.consoleLog) {
                console.warn('[壁纸] 检测到 file:// 协议，无法访问外部 API');
                console.log('[提示] 请使用本地服务器: python -m http.server 8080');
            }
            useFallbackImages();
            return;
        }
        
        // 触发壁纸开始加载事件
        window.dispatchEvent(new CustomEvent('wallpapers-loading'));
        
        // 尝试使用 Pixiv 随机图片（直接加载图片，绑过 CORS）
        try {
            if (CONFIG.debug && CONFIG.debug.consoleLog) {
                console.log('[壁纸] 尝试加载 Pixiv 随机图片...');
            }
            
            // 使用直接图片链接，不经过 fetch（绑过 CORS）
            const apiUrls = [
                'https://i.mukyu.ru/random',
                'https://pic1.pixiv.net/img-original/img/',  // 备用
            ];
            
            for (let i = 0; i < count; i++) {
                const imgUrl = `${apiUrls[0]}?seed=${Date.now()}-${i}`;
                const img = createImageElement(imgUrl, i);
                container.appendChild(img);
                images.push(img);
                wallpapers.push({
                    title: `Pixiv 作品 ${i + 1}`,
                    author: 'Pixiv',
                    url: imgUrl
                });
            }
            
            // 监听第一张图片加载
            let loadedCount = 0;
            const checkLoaded = () => {
                loadedCount++;
                if (loadedCount === 1) {
                    images[0].classList.add('active');
                    const placeholder = container.querySelector('.wallpaper-placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                    setInterval(nextWallpaper, interval);
                    
                    if (CONFIG.debug && CONFIG.debug.consoleLog) {
                        console.log('[壁纸] Pixiv 图片加载成功');
                    }
                    
                    // 触发壁纸加载完成事件
                    window.dispatchEvent(new CustomEvent('wallpapers-loaded'));
                }
            };
            
            images[0].onload = checkLoaded;
            images[0].onerror = () => {
                if (CONFIG.debug && CONFIG.debug.consoleLog) {
                    console.warn('[壁纸] Pixiv 图片加载失败，切换备用图片');
                }
                // 清空已添加的图片
                container.innerHTML = '';
                images.length = 0;
                wallpapers.length = 0;
                useFallbackImages();
                
                // 触发壁纸加载失败事件
                window.dispatchEvent(new CustomEvent('wallpapers-failed'));
            };
            
            if (authorEl) {
                authorEl.textContent = 'Pixiv 随机';
            }
            
        } catch (error) {
            if (CONFIG.debug && CONFIG.debug.consoleLog) {
                console.warn('[壁纸] 图片加载异常:', error.message);
                console.log('[壁纸] 切换到 Picsum 备用图片源');
            }
            useFallbackImages();
        }
    }
    
    fetchWallpapers();
})();

// ========== 应用个人信息配置 ==========
(function applyProfileConfig() {
    const config = CONFIG.profile;
    
    // 名称
    const nameEl = document.querySelector('.name');
    if (nameEl && config.name) {
        nameEl.textContent = config.name;
    }
    
    // 加载界面名称
    const loadingNameEl = document.getElementById('loadingName');
    if (loadingNameEl && config.name) {
        loadingNameEl.textContent = config.name;
    }
    
    // 状态栏
    const statusTextEl = document.querySelector('.status-text');
    if (statusTextEl && config.status) {
        statusTextEl.textContent = config.status;
    }
    
    // 头像
    const avatarImg = document.querySelector('.avatar-image');
    if (avatarImg && config.avatar) {
        avatarImg.src = config.avatar;
    }
    
    // 社交链接
    if (config.social) {
        const links = document.querySelectorAll('.social-link');
        if (links[0] && config.social.github) links[0].href = config.social.github;
        if (links[1] && config.social.twitter) links[1].href = config.social.twitter;
        if (links[2] && config.social.email) links[2].href = config.social.email;
    }
    
    // 底部版权
    const footerTextEl = document.getElementById('footerText');
    if (footerTextEl && CONFIG.footer) {
        const text = CONFIG.footer.text || 'BUILT WITH PASSION';
        const year = new Date().getFullYear();
        footerTextEl.textContent = `${text} • ${year}`;
    }

    if (CONFIG.debug && CONFIG.debug.consoleLog) {
        console.log('[配置] 个人信息已应用');
    }
})();

// ========== 初始化完成 ==========
if (CONFIG.debug && CONFIG.debug.consoleLog) {
    console.log('%c个人主页已加载 ✓', 'color: #FFE600; font-size: 14px; font-weight: bold;');
    console.log('功能：打字机效果 (Slogan 循环) | 时间显示 | 天气获取 | 壁纸轮播 | 主题切换');
}

// ========== 主题切换 ==========
(function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const config = CONFIG.theme;
    const cookieName = config.cookieName || 'theme';
    const cookieExpire = config.cookieExpire || 31536000; // 1 year
    const transitionDuration = config.transitionDuration || 300;
    
    // 读取 Cookie
    function getCookieTheme() {
        const match = document.cookie.match(new RegExp('(^| )' + cookieName + '=(light|dark)(;|$)'));
        return match ? match[2] : null;
    }
    
    // 写入 Cookie
    function setCookieTheme(theme) {
        document.cookie = `${cookieName}=${theme};path=/;max-age=${cookieExpire}`;
    }
    
    // 检测系统偏好
    function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // 获取当前主题
    function getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }
    
    // 应用主题
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // 更新按钮 aria-label
        const label = theme === 'dark' ? '切换到浅色模式' : '切换到深色模式';
        themeToggle.setAttribute('aria-label', label);
        
        if (CONFIG.debug && CONFIG.debug.consoleLog) {
            console.log('[主题] 已应用:', theme);
        }
    }
    
    // 切换主题
    function toggleTheme() {
        const currentTheme = getCurrentTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        applyTheme(newTheme);
        setCookieTheme(newTheme);
        
        if (CONFIG.debug && CONFIG.debug.consoleLog) {
            console.log('[主题] 切换至:', newTheme);
        }
    }
    
    // 初始化按钮状态
    function init() {
        const currentTheme = getCurrentTheme();
        const label = currentTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式';
        themeToggle.setAttribute('aria-label', label);
        
        // 监听系统偏好变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // 仅当用户没有手动设置时才跟随系统
            if (!getCookieTheme()) {
                const newTheme = e.matches ? 'dark' : 'light';
                applyTheme(newTheme);
            }
        });
    }
    
    // 监听按钮点击
    themeToggle.addEventListener('click', toggleTheme);
    
    // 键盘支持
    themeToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleTheme();
        }
    });
    
    // 启动
    init();
    
    // 添加过渡效果（防止首屏闪烁）
    setTimeout(() => {
        document.documentElement.style.transition = `background-color ${transitionDuration}ms ease, color ${transitionDuration}ms ease`;
    }, 100);
    
    if (CONFIG.debug && CONFIG.debug.consoleLog) {
        console.log('[主题] 初始化完成，当前主题:', getCurrentTheme());
    }
})();