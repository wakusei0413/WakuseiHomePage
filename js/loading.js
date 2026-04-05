/**
 * 加载界面管理 - 简化版
 * 等待关键资源加载后显示主页面
 */

(function() {
    'use strict';
    
    // 元素引用
    let loadingScreen, mainContent, loadingBar, loadingStatus;
    
    // 配置
    const TIMEOUT = 8000;  // 8秒超时
    const MIN_DISPLAY = 800;  // 最少显示800ms
    
    let startTime = Date.now();
    let completed = false;
    
    // 更新进度
    function updateProgress(percent, status) {
        if (loadingBar) loadingBar.style.width = percent + '%';
        if (loadingStatus) loadingStatus.textContent = status;
    }
    
    // 显示主页面
    function showMainContent() {
        if (completed) return;
        completed = true;
        
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, MIN_DISPLAY - elapsed);
        
        setTimeout(() => {
            updateProgress(100, '完成！');
            
            setTimeout(() => {
                if (loadingScreen) loadingScreen.classList.add('loaded');
                if (mainContent) mainContent.classList.add('visible');
            }, 200);
        }, delay);
    }
    
    // 超时处理
    function handleTimeout() {
        if (!completed) {
            console.warn('[加载] 超时，强制显示主页面');
            showMainContent();
        }
    }
    
    // 初始化
    function init() {
        loadingScreen = document.getElementById('loadingScreen');
        mainContent = document.getElementById('mainContent');
        loadingBar = document.getElementById('loadingBar');
        loadingStatus = document.getElementById('loadingStatus');
        
        startTime = Date.now();
        updateProgress(0, '初始化...');
        
        // 设置超时
        setTimeout(handleTimeout, TIMEOUT);
        
        // 监听壁纸加载事件
        window.addEventListener('wallpapers-loaded', () => {
            updateProgress(90, '加载壁纸...');
            setTimeout(showMainContent, 100);
        });
        
        window.addEventListener('wallpapers-failed', () => {
            updateProgress(90, '加载壁纸...');
            setTimeout(showMainContent, 100);
        });
        
        // 等待字体加载
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                updateProgress(30, '加载字体...');
            });
        } else {
            updateProgress(30, '加载字体...');
        }
    }
    
    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();