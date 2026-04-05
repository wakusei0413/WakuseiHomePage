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

// ========== 壁纸加载（垂直滚动）==========
(function initWallpaper() {
    const container = document.getElementById('wallpaperScrollArea');
    
    if (!container) return;
    
    const config = CONFIG.wallpaper;
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
        img.alt = `Wallpaper ${index + 1}`;
        img.loading = index === 0 ? 'eager' : 'lazy';
        
        // 模糊到清晰的过渡效果
        img.onload = function() {
            this.classList.add('loaded');
        };
        
        img.src = url;
        return img;
    }
    
    function loadImages(urls) {
        // 清空容器
        container.innerHTML = '';
        
        // 添加图片
        urls.forEach((url, index) => {
            const img = createImageElement(url, index);
            container.appendChild(img);
        });
        
        // 触发壁纸加载完成事件
        window.dispatchEvent(new CustomEvent('wallpapers-loaded'));
        
        if (CONFIG.debug && CONFIG.debug.consoleLog) {
            console.log(`[壁纸] 已加载 ${urls.length} 张图片`);
        }
    }
    
    function useFallbackImages() {
        if (CONFIG.debug && CONFIG.debug.consoleLog) {
            console.log('[壁纸] 使用备用图片');
        }
        loadImages(fallbackImages);
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
        
        // 尝试使用 Pixiv 随机图片
        try {
            if (CONFIG.debug && CONFIG.debug.consoleLog) {
                console.log('[壁纸] 尝试加载 Pixiv 随机图片...');
            }
            
            const apiUrl = 'https://i.mukyu.ru/random';
            const urls = Array.from({ length: count }, (_, i) => 
                `${apiUrl}?seed=${Date.now()}-${i}`
            );
            
            // 预加载第一张图片检测是否可用
            const testImg = new Image();
            testImg.onload = () => {
                loadImages(urls);
                if (CONFIG.debug && CONFIG.debug.consoleLog) {
                    console.log('[壁纸] Pixiv 图片加载成功');
                }
            };
            testImg.onerror = () => {
                if (CONFIG.debug && CONFIG.debug.consoleLog) {
                    console.warn('[壁纸] Pixiv 图片加载失败，切换备用图片');
                }
                useFallbackImages();
                window.dispatchEvent(new CustomEvent('wallpapers-failed'));
            };
            testImg.src = urls[0];
            
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
    
    // 社交链接 - 动态生成
    if (CONFIG.socialLinks && CONFIG.socialLinks.links) {
        const socialContainer = document.getElementById('socialLinks');
        if (socialContainer) {
            const links = CONFIG.socialLinks.links;
            const colorScheme = CONFIG.socialLinks.colorScheme || 'cycle';
            const colors = ['yellow', 'red', 'blue'];
            
            // 清空容器
            socialContainer.innerHTML = '';
            
            // 生成链接
            links.forEach((link, index) => {
                // 确定颜色
                let color = link.color;
                let isHexColor = false;
                
                // 检查是否是 HEX 颜色格式
                if (color && color.startsWith('#')) {
                    isHexColor = true;
                } else if (!color) {
                    // 未设置颜色，按 colorScheme 分配
                    if (colorScheme === 'same') {
                        color = colors[0];
                    } else {
                        color = colors[index % colors.length];
                    }
                }
                
                // 创建链接元素
                const a = document.createElement('a');
                a.href = link.url;
                a.setAttribute('aria-label', link.name);
                a.target = link.url.startsWith('mailto:') ? '_self' : '_blank';
                a.rel = link.url.startsWith('mailto:') ? '' : 'noopener noreferrer';
                
                // 图标
                const icon = document.createElement('i');
                icon.className = link.icon;
                icon.setAttribute('aria-hidden', 'true');
                
                // 标签
                const label = document.createElement('span');
                label.className = 'link-label';
                label.textContent = link.name;
                
                // 应用颜色样式
                if (isHexColor) {
                    // HEX 颜色：使用内联样式
                    a.className = 'social-link';
                    a.style.borderColor = 'var(--fg)';
                    a.style.boxShadow = `var(--shadow-offset-sm) var(--shadow-offset-sm) 0 ${color}`;
                    
                    // 添加 hover 效果
                    a.addEventListener('mouseenter', () => {
                        a.style.backgroundColor = color;
                        a.style.boxShadow = `10px 10px 0 ${color}`;
                    });
                    a.addEventListener('mouseleave', () => {
                        a.style.backgroundColor = 'var(--bg)';
                        a.style.boxShadow = `var(--shadow-offset-sm) var(--shadow-offset-sm) 0 ${color}`;
                    });
                } else {
                    // 预设颜色：使用 CSS 类
                    a.className = `social-link social-link--${color}`;
                }
                
                // 组装
                a.appendChild(icon);
                a.appendChild(label);
                socialContainer.appendChild(a);
            });
            
            if (CONFIG.debug && CONFIG.debug.consoleLog) {
                console.log(`[配置] 已生成 ${links.length} 个社交链接`);
            }
        }
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

// ========== 移动端粘性头像 ==========
(function initMobileStickyAvatar() {
    const container = document.querySelector('.container');
    const leftPanel = document.querySelector('.left-panel');
    const avatarBox = document.getElementById('avatarBox');
    
    if (!container || !avatarBox) return;
    
    // 检测是否为移动端
    function isMobile() {
        return window.innerWidth <= 900;
    }
    
    // 获取滚动容器（移动端用 container，桌面端用 leftPanel）
    function getScrollContainer() {
        return isMobile() ? container : leftPanel;
    }
    
    // 滚动监听
    function handleScroll() {
        if (!isMobile()) return;
        
        const scrollContainer = getScrollContainer();
        const scrolled = scrollContainer.scrollTop > 50;
        avatarBox.classList.toggle('scrolled', scrolled);
    }
    
    // 点击回到顶部
    avatarBox.addEventListener('click', () => {
        if (!isMobile()) return;
        
        const scrollContainer = getScrollContainer();
        if (scrollContainer.scrollTop > 50) {
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    // 监听滚动
    container.addEventListener('scroll', handleScroll);
    leftPanel.addEventListener('scroll', handleScroll);
    
    // 窗口大小变化时重置状态
    window.addEventListener('resize', () => {
        if (!isMobile()) {
            avatarBox.classList.remove('scrolled');
        }
    });
    
    if (CONFIG.debug && CONFIG.debug.consoleLog) {
        console.log('[粘性头像] 已初始化');
    }
})();

// ========== 手机端壁纸面板切换 ==========
(function initMobileWallpaperToggle() {
    const toggleBtn = document.getElementById('wallpaperToggle');
    const closeBtn = document.getElementById('closePanel');
    const rightPanel = document.querySelector('.right-panel');
    
    if (!toggleBtn || !closeBtn || !rightPanel) return;
    
    function isMobile() {
        return window.innerWidth <= 900;
    }
    
    function showPanel() {
        rightPanel.classList.add('active');
        toggleBtn.classList.add('active');
        closeBtn.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function hidePanel() {
        rightPanel.classList.remove('active');
        toggleBtn.classList.remove('active');
        closeBtn.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // 展开按钮点击
    toggleBtn.addEventListener('click', () => {
        if (rightPanel.classList.contains('active')) {
            hidePanel();
        } else {
            showPanel();
        }
    });
    
    // 关闭按钮点击
    closeBtn.addEventListener('click', hidePanel);
    
    // 窗口大小变化时重置
    window.addEventListener('resize', () => {
        if (!isMobile()) {
            hidePanel();
        }
    });
    
    if (CONFIG.debug && CONFIG.debug.consoleLog) {
        console.log('[壁纸面板] 已初始化');
    }
})();