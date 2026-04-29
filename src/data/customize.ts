import type { SiteConfig } from '../types/site';

// Edit this file for nearly all everyday homepage changes.
// Sections are grouped by what usually gets customized together.
export const editableSiteConfig: SiteConfig = {
    version: '1.0.0',

    // Browser and SEO metadata.
    title: 'WAKUSEI - 个人主页',
    description: 'wakusei - 个人主页',
    lang: 'zh-CN',
    themeColor: '#fffef7',

    // Hero/profile block.
    profile: {
        name: '遨星 Wakusei',
        status: '正在武装保卫开源社区！',
        avatar: '/res/img/logo.png'
    },

    // Social links shown under the intro text.
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

    footer: {
        text: '咕?咕?嘎?嘎?-遨星 Wakusei'
    },

    // Typewriter text block.
    slogans: {
        list: [
            '安静，听到我使用锤子的TNT vibe coding了吗！',
            '武装保卫开源社区！',
            '说得好！我完全同意。',
            '正在切换至 Cloudflare 中...',
            '用冰冷的理性温暖世界。'
        ],
        mode: 'sequence',
        typeSpeed: 60,
        pauseDuration: 5000,
        loop: true
    },

    // Right-side time card.
    time: {
        format: '24h',
        showWeekday: true,
        showDate: true,
        updateInterval: 1000
    },

    // Loading overlay text rotation.
    loading: {
        texts: [
            '少女祈祷中...',
            '正在给服务器喂猫粮...',
            '正在数像素...114...514...',
            '正在和 o4 谈判...',
            '正在召唤服务器精灵...',
            '正在给图片上色...',
            '正在连接异次元...',
            '正在偷取你的带宽...（开玩笑的）',
            '正在加载大量萌要素...',
            '服务器正在喝茶...'
        ],
        textSwitchInterval: 2000
    },

    // Wallpaper sources and scrolling behavior.
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

    // Typewriter cursor style.
    animation: {
        cursorStyle: 'block'
    },

    // Runtime interaction guards.
    contentProtection: {
        preventCopyAndDrag: true
    },

    debug: {
        consoleLog: false
    },

    // Small page effects.
    effects: {
        scrollReveal: {
            enabled: true,
            offset: 50,
            delay: 50
        }
    }
};

export const quickEditSections = {
    profile: editableSiteConfig.profile,
    socialLinks: editableSiteConfig.socialLinks,
    slogans: editableSiteConfig.slogans,
    wallpaper: editableSiteConfig.wallpaper,
    time: editableSiteConfig.time
};
