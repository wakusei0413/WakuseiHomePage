/**
 * 个人主页 - 配置文件
 * 在此编辑所有可配置项
 */

const CONFIG = {
    // ============================================================
    // 个人信息配置
    // ============================================================
    profile: {
        // 显示名称
        name: '遊星 Wakusei',
        
        // 状态栏文字
        status: '正在过大关.jpg',
        
        // 头像路径
        avatar: 'res/img/logo.png',
    },

    // ============================================================
    // 社交链接配置
    // ============================================================
    socialLinks: {
        // 颜色分配策略: 'cycle' (循环 yellow→red→blue) | 'same' (全部使用同色系)
        // 如果某个链接设置了 color 属性，则优先使用该颜色
        colorScheme: 'cycle',
        
        // 链接列表（可自由添加、删除、修改）
        links: [
            {
                name: 'GITHUB',
                url: 'https://github.com/wakusei0413',
                icon: 'fab fa-github',        // Font Awesome 图标类
                color: 'yellow'               // 可选：预设值 'yellow' | 'red' | 'blue'，或 HEX 格式如 '#FF6B6B'
            },
            {
                name: 'TWITTER',
                url: 'https://x.com/ChinaMilBugle',
                icon: 'fab fa-x-twitter',
                // 不设置 color，将按 colorScheme 自动分配
            },
            {
                name: 'EMAIL',
                url: 'mailto:wakusei0413@outlook.com',
                icon: 'fas fa-envelope',
                color: 'blue'
            },
            {
                name: 'BILIBILI',
                url: 'https://space.bilibili.com/438168974',
                icon: 'fab fa-bilibili',
                color: '#ffa69e'
            },
            // 示例：添加更多链接
            // {
            //     name: 'BILIBILI',
            //     url: 'https://space.bilibili.com/xxxx',
            //     icon: 'fab fa-bilibili',
            // },
        ]
    },

    // ============================================================
    // 底部版权配置
    // ============================================================
    footer: {
        // 版权文字（年份自动获取）
        text: '咕咕嘎嘎',
    },

    // ============================================================
    // Slogan / 简介配置
    // ============================================================
    slogans: {
        // Slogan 列表（可添加多个，随机播放）
        list: [
            '嘘！别烦我，我在使用使用锤子的TNT vibe coding呢！',
            '武装保卫开源社区！',
            '说的好！我完全同意。',
            '正在测试中',
            '以真诚待人为荣，以虚伪欺人为耻；以友善热心为荣，以傲慢冷漠为耻；以团结协作为荣，以孤立对抗为耻；以专业敬业为荣，以敷衍了事为耻。',
            '保持对未知的好奇心，用创造力突破边界，在技术浪潮中找到属于自己的航向',
            '软件工程师 / 创意设计师 / 终身学习者 - 用技术改变世界',
        ],
        
        // 切换模式：'random' 随机 | 'sequence' 顺序
        mode: 'random',
        
        // 打字速度（毫秒/字）
        typeSpeed: 60,
        
        // 打字完成后停留时间（毫秒）
        pauseDuration: 5000,
        
        // 循环播放：true 开启 | false 仅显示一个
        loop: true,
    },

    // ============================================================
    // 时间组件配置
    // ============================================================
    time: {
        // 时间格式：'24h' | '12h'
        format: '24h',
        
        // 是否显示星期
        showWeekday: true,
        
        // 是否显示日期
        showDate: true,
        
        // 更新间隔（毫秒）
        updateInterval: 1000,
    },

    // ============================================================
    // 天气配置
    // ============================================================
    weather: {
        // 默认城市（获取失败时使用）
        defaultCity: 'Beijing',
        
        // 更新间隔（毫秒，10分钟 = 600000）
        updateInterval: 600000,
    },

    // ============================================================
    // 壁纸轮播配置
    // ============================================================
    wallpaper: {
        // 数据源：'pixiv' | 'unsplash' | 'picsum'
        source: 'pixiv',
        
        // Pixiv 标签过滤器（仅 source: 'pixiv' 时有效）
        tags: ['少女', '风景', '插画', '动漫'],
        
        // R18 过滤：0 全年龄 | 1 R18
        r18: 0,
        
        // 图片数量（预加载）
        count: 5,
        
        // 无限滚动配置
        infiniteScroll: {
            enabled: true,              // 启用无限滚动
            speed: 1.5,                 // 滚动速度（像素/帧，建议 0.5-3）
            
            // 用户交互配置
            pauseOnHover: true,         // 鼠标悬停暂停
            pauseOnTouch: true,         // 触摸暂停
            resumeDelay: 3000,          // 交互后恢复延迟（毫秒）
            wheelControl: true,         // 滚轮控制
        }
    },

    // ============================================================
    // 动画配置
    // ============================================================
    animation: {
        // 打字机光标样式：'block' █ | 'line' |
        cursorStyle: 'block',
        
        // 光标闪烁速度（毫秒）
        cursorBlinkSpeed: 800,
    },

    // ============================================================
    // 调试配置
    // ============================================================
    debug: {
        // 控制台输出日志
        consoleLog: true,
        
        // 显示性能信息
        showPerfInfo: false,
    },

    // ============================================================
    // 主题配置
    // ============================================================
    theme: {
        // 默认主题：'light' | 'dark' | 'system'（跟随系统）
        default: 'system',
        
        // Cookie 名称
        cookieName: 'theme',
        
        // Cookie 有效期（秒），1年 = 31536000
        cookieExpire: 31536000,
        
        // 过渡动画时长（毫秒）
        transitionDuration: 300,
    },

    // ============================================================
    // 交互特效配置
    // ============================================================
    effects: {
        // 点击彩纸特效
        confetti: {
            enabled: true,
            count: 25,              // 彩纸数量
            colors: ['--accent-yellow', '--accent-red', '--accent-blue', '#FF6B6B', '#4ECDC4'],
            duration: 1500,         // 动画时长（毫秒）
            spread: 150,            // 扩散范围（像素）
        },
        
        // 滚动触发动画
        scrollReveal: {
            enabled: true,
            offset: 50,             // 触发偏移量
            delay: 50,              // 错开延迟（毫秒）
            duration: 600,          // 动画时长（毫秒）
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
        
        // 像素小宠物
        pixelPet: {
            enabled: true,
            type: 'cat',            // 'cat' | 'dog'（预留）
            speed: 0.5,             // 移动速度
            size: 32,               // 显示尺寸（像素）
            interactions: true,     // 是否允许点击互动
        }
    }
};

// 导出配置（供其他脚本使用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}