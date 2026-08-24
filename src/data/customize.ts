import type { SiteConfig } from '../types/site';

// 日常站点配置的唯一入口；site.ts 会通过 schema.ts 校验后再暴露给运行时。
// 新增字段时同步更新 types/site.ts 与 schema.ts，不要建立第二套快捷配置映射。
export const editableSiteConfig: SiteConfig = {
    version: '2.0.0',

    // 浏览器与 SEO 元数据。
    title: '遊星Wakusei的个人小屋',
    description: 'Wakusei - 个人主页',
    lang: 'zh-CN',
    themeColor: '#fffef7',

    // 首屏个人信息。
    profile: {
        name: '遊星 Wakusei',
        status: '正在武装保卫开源社区！',
        avatar: '/res/img/logo.png'
    },

    // 首屏社交链接。
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
                name: 'Status',
                url: 'https://status.wakusei.top/',
                icon: 'fa-solid fa-arrow-up-right-dots',
                color: '#ddff00'
            }
        ]
    },

    // GitHub 贡献图（左侧面板格子图的数据与跳转目标）。
    // 数据在 npm run build 时同步为 /github-contributions.json，客户端不再实时请求。
    github: {
        username: 'wakusei0413',
        url: 'https://github.com/wakusei0413'
    },

    footer: {
        text: '© 2026 遊星 Wakusei'
    },

    // 打字机与首页速览文案。
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

    // 首页速览时钟。
    time: {
        format: '24h',
        showWeekday: true,
        showDate: true,
        updateInterval: 1000
    },

    // 预留加载文案契约；默认布局不再渲染阻塞式 loading overlay。
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

    // 桌面壁纸源、失败重试与轮换。
    wallpaper: {
        // 本地图负责首帧兜底，外部 API 失败不得阻断页面。
        defaultImage: '/res/img/wallpaper/default.webp',
        apis: ['https://www.loliapi.com/bg/'],
        raceTimeout: 10000,
        maxRetries: 5,
        rotation: {
            enabled: true,
            interval: 8000
        }
    },

    // 打字机光标。
    animation: {
        cursorStyle: 'block'
    },

    // 可选的内容交互限制。
    contentProtection: {
        preventCopyAndDrag: false
    },

    debug: {
        consoleLog: true
    },

    // 页面轻量动效。
    effects: {
        scrollReveal: {
            enabled: true,
            offset: 50,
            delay: 50
        }
    },
    // 顶栏与移动菜单共用此顺序。类型：link / action / panel / divider。
    // 内置 action：toggleTheme、openSearch；内置 panel：language。
    // 文案优先使用 i18nKey；设置入口当前保持 href: '#' 占位。
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
                href: '/#posts',
                display: {
                    icon: 'fa-solid fa-newspaper',
                    i18nKey: 'dock.blog',
                    renderMode: 'text'
                }
            },
            {
                type: 'link',
                href: '/archives',
                display: {
                    icon: 'fa-solid fa-layer-group',
                    i18nKey: 'dock.topics',
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
                type: 'action',
                action: 'openSearch',
                display: {
                    icon: 'fa-solid fa-magnifying-glass',
                    i18nKey: 'dock.search'
                }
            }
        ]
    },
    // 翻译正文统一维护在 src/data/i18n.ts。
    i18n: {
        defaultLocale: 'zh-CN',
        locales: ['zh-CN', 'en', 'ja']
    }
};
