import type { SiteConfig } from '../types/site';

// Edit this file for nearly all everyday homepage changes.
// Sections are grouped by what usually gets customized together.
export const editableSiteConfig: SiteConfig = {
    version: '2.0.0',

    // Browser and SEO metadata.
    title: '遊星Wakusei的个人小屋',
    description: 'Wakusei - 个人主页',
    lang: 'zh-CN',
    themeColor: '#fffef7',

    // Hero/profile block.
    profile: {
        name: '遊星 Wakusei',
        status: '正在武装保卫开源社区！',
        avatar: '/res/img/logo.png'
    },

    // Social links shown under the intro text.
    socialLinks: {
        colorScheme: 'cycle',
        links: [
            {
                name: 'GitHub',
                url: 'https://github.com/wakusei0413',
                icon: 'fab fa-github',
                color: '#fff700'
            },
            {
                name: 'Linux.Do',
                url: 'https://linux.do/u/wakusei/summary',
                icon: 'fa-solid fa-bars-staggered',
                color: '#ff2a00'
            },
            {
                name: 'Email',
                url: 'mailto:wakusei0413@outlook.com',
                icon: 'fas fa-envelope',
                color: '#0022ff'
            },
            {
                name: 'Bilibili',
                url: 'https://space.bilibili.com/438168974',
                icon: 'fab fa-bilibili',
                color: '#ff7676'
            },
            {
                name: 'Blog',
                url: 'https://blog.wakusei.top/',
                icon: 'fa-solid fa-blog',
                color: '#ff8800'
            },
            {
                name: 'Status',
                url: 'https://status.wakusei.top/',
                icon: 'fa-solid fa-arrow-up-right-dots',
                color: '#ddff00'
            },
            {
                name: 'Testing',
                url: 'https://testing.wakusei.top/',
                icon: 'fa-solid fa-flask',
                color: '#16deca'
            }
        ]
    },

    footer: {
        text: '© 2026 遊星 Wakusei',
        links: [
            { name: '博客', href: '/posts' },
            { name: 'Status', href: 'https://status.wakusei.top/' },
            { name: 'Testing', href: 'https://testing.wakusei.top/' },
            { name: 'GitHub', href: 'https://github.com/wakusei0413' }
        ]
    },

    // Typewriter text block.
    slogans: {
        list: [
            '安静，我在用锤子TNT vibe coding！',
            '武装保卫开源社区！',
            '说得好！我完全同意。',
            '已经切换至Cloudflare！',
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
        consoleLog: true
    },

    // Small page effects.
    effects: {
        scrollReveal: {
            enabled: true,
            offset: 50,
            delay: 50
        }
    },
    // Control dock: define items, order, icons, links and behaviour.
    // type: 'action' | 'panel' | 'link' | 'divider'
    //   action: internal handler (e.g. 'toggleTheme' toggles light/dark)
    //   panel: opens a popup sheet (e.g. 'language' shows language selector)
    //   link: href navigation (openInNewTab optional)
    //   divider: visual separator, no display needed
    // display.icon: Font Awesome icon class
    // display.iconActive: optional icon shown when the action is active
    // display.text: optional hard-coded label text
    // display.i18nKey: key into src/data/i18n.ts, preferred if present
    // Reserved actions that always have a handler:
    //   'toggleTheme' — built-in
    // Reserved panels that always have a handler:
    //   'language'    — built-in
    // Any other action / panel key falls through to a no-op with a console.warn,
    // providing a hook for custom extensions.
    dock: {
        items: [
            {
                type: 'link',
                href: '/',
                display: {
                    icon: 'fa-solid fa-house',
                    i18nKey: 'dock.home',
                    renderMode: 'text'
                }
            },
            {
                type: 'link',
                href: '/posts',
                display: {
                    icon: 'fa-solid fa-newspaper',
                    i18nKey: 'dock.blog',
                    renderMode: 'text'
                }
            },
            { type: 'divider' },
            {
                type: 'action',
                action: 'toggleTheme',
                display: {
                    icon: 'fa-solid fa-moon',
                    iconActive: 'fa-solid fa-sun',
                    i18nKey: 'dock.theme'
                }
            },
            {
                type: 'panel',
                panel: 'language',
                display: {
                    icon: 'fa-solid fa-globe',
                    i18nKey: 'dock.language'
                }
            },
            {
                type: 'link',
                href: '#',
                display: {
                    icon: 'fa-solid fa-gear',
                    i18nKey: 'dock.settings'
                }
            }
        ]
    },
    // Translations are in src/data/i18n.ts — edit there for dock label customisation.
    i18n: {
        defaultLocale: 'zh-CN',
        locales: ['zh-CN', 'en', 'ja']
    }
};

export const quickEditSections = {
    i18n: editableSiteConfig.i18n,
    profile: editableSiteConfig.profile,
    socialLinks: editableSiteConfig.socialLinks,
    slogans: editableSiteConfig.slogans,
    wallpaper: editableSiteConfig.wallpaper,
    time: editableSiteConfig.time,
    dock: editableSiteConfig.dock
};
