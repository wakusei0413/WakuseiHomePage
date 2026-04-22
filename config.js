/**
 * 个人主页 - 配置文件
 * 在此编辑所有可配置项
 */

export const CONFIG = {
    version: '1.0.0',
    // ============================================================
    // 个人信息配置
    // ============================================================
    profile: {
        name: '遊星 Wakusei',
        status: '正在武装保卫开源社区！',
        avatar: 'res/img/logo.png'
    },

    // ============================================================
    // 社交链接配置
    // ============================================================
    socialLinks: {
        colorScheme: 'cycle',
        links: [
            {
                name: 'GITHUB',
                url: 'https://github.com/wakusei0413',
                icon: 'fab fa-github',
                color: '#ffe600'
            },
            {
                name: 'Linux.Do',
                url: 'https://linux.do/u/wakusei/summary',
                icon: 'fa-solid fa-bars-staggered',
                color: '#f2411d'
            },
            {
                name: 'EMAIL',
                url: 'mailto:wakusei0413@outlook.com',
                icon: 'fas fa-envelope',
                color: '#3e59ff'
            },
            {
                name: 'BILIBILI',
                url: 'https://space.bilibili.com/438168974',
                icon: 'fab fa-bilibili',
                color: '#ffa69e'
            },
            {
                name: 'BLOG',
                url: 'https://blog.wakusei.top/',
                icon: 'fa-solid fa-blog',
                color: '#f58f1a'
            },
            {
                name: 'STATUS',
                url: 'https://status.wakusei.top/',
                icon: 'fa-solid fa-arrow-up-right-dots',
                color: '#caa62e'
            },
            {
                name: 'TESTING',
                url: 'https://testing.wakusei.top/',
                icon: 'fa-solid fa-flask',
                color: '#16deca'
            }
        ]
    },

    // ============================================================
    // 底部版权配置
    // ============================================================
    footer: {
        text: '咕!咕!嘎!嘎!-遊星 Wakusei'
    },

    // ============================================================
    // Slogan / 简介配置
    // ============================================================
    slogans: {
        list: [
            '安静，吵到我用使用锤子的TNT vibe coding了！',
            '武装保卫开源社区！',
            '说的好！我完全同意。',
            '正在切换至cloudflare中',
            '用冰冷的理性温暖世界。'
        ],
        mode: 'sequence',
        typeSpeed: 60,
        pauseDuration: 5000,
        loop: true
    },

    // ============================================================
    // 时间组件配置
    // ============================================================
    time: {
        format: '24h',
        showWeekday: true,
        showDate: true,
        updateInterval: 1000
    },

    // ============================================================
    // 加载界面配置
    // ============================================================
    loading: {
        texts: [
            '少女祈祷中...',
            '正在给服务器喂猫粮...',
            '正在数像素...114...514...',
            '正在和404谈判...',
            '正在召唤服务器精灵...',
            '正在给图片上色...',
            '正在连接异次元...',
            '正在偷取你的带宽...（开玩笑的）',
            '正在加载大量萌要素...',
            '服务器正在喝茶...'
        ],
        textSwitchInterval: 2000
    },

    // ============================================================
    // 壁纸配置
    // ============================================================
    wallpaper: {
        apis: ['https://www.loliapi.com/bg/', 'https://www.dmoe.cc/random.php'],
        raceTimeout: 10000,
        maxRetries: 5,
        preloadCount: 3,
        infiniteScroll: {
            enabled: true,
            speed: 2,
            batchSize: 5,
            maxImages: 50
        }
    },

    // ============================================================
    // 动画配置
    // ============================================================
    animation: {
        cursorStyle: 'block'
    },

    // ============================================================
    // 调试配置
    // ============================================================
    debug: {
        consoleLog: false
    },

    // ============================================================
    // 交互特效配置
    // ============================================================
    effects: {
        scrollReveal: {
            enabled: true,
            offset: 50,
            delay: 50
        }
    }
};
