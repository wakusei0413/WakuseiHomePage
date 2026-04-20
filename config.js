/**
 * 个人主页 - 配置文件
 * 在此编辑所有可配置项
 *
 * 模块结构：
 *   js/logger.js       — 统一日志工具
 *   js/utils.js         — debounce 等工具函数
 *   js/typewriter.js    — 打字机效果
 *   js/time.js           — 时间组件
 *   js/social.js         — 社交链接 & 个人信息
 *   js/wallpaper.js      — 壁纸滚动模块
 *   js/main.js           — 主脚本入口
 *
 * 可用命令：
 *   npm run lint          — ESLint 代码检查
 *   npm run lint:fix      — ESLint 自动修复
 *   npm run format        — Prettier 格式化
 *   npm run format:check  — Prettier 检查
 *   npm run build         — 构建压缩版本到 dist/
 */

var CONFIG = {
    version: '0.5.5',
    // ============================================================
    // 个人信息配置
    // ============================================================
    profile: {
        // 显示名称
        name: '遊星 Wakusei',

        // 状态栏文字
        status: '正在过大关.jpg',

        // 头像路径
        avatar: 'res/img/logo.png'
    },

    // ============================================================
    // 社交链接配置
    // ============================================================
    socialLinks: {
        // 颜色分配策略: 'cycle' (循环 #ffe600→#ff3e3e→#3e59ff) | 'same' (全部使用同色系)
        // 如果某个链接设置了 color 属性，则优先使用该颜色
        colorScheme: 'cycle',

        // 链接列表（可自由添加、删除、修改）
        links: [
            {
                name: 'GITHUB',
                url: 'https://github.com/wakusei0413',
                icon: 'fab fa-github', // Font Awesome 图标类
                color: '#ffe600' // HEX 格式颜色
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
        text: '咕!咕!嘎!嘎!-"罗德岛"有限公司出品'
    },

    // ============================================================
    // Slogan / 简介配置
    // ============================================================
    slogans: {
        // Slogan 列表（可添加多个，随机播放）
        list: [
            '安静，吵到我用使用锤子的TNT vibe coding了！',
            '武装保卫开源社区！',
            '说的好！我完全同意。',
            '正在测试中...',
            '以真诚待人为荣，以虚伪欺人为耻；以友善热心为荣，以傲慢冷漠为耻；以团结协作为荣，以孤立对抗为耻；以专业敬业为荣，以敷衍了事为耻。',
            '用冰冷的理性温暖世界。',
            '“天下为公”是出自《礼记·礼运》的经典儒家政治理念，意指天下是天下人的天下，而非一人一姓所有。它描述了一个选贤与能、讲信修睦的“大同”理想社会。孙中山先生一生致力于践行此理念，并将其作为其三民主义思想的核心精神。'
        ],

        // 切换模式：'random' 随机 | 'sequence' 顺序
        mode: 'random',

        // 打字速度（毫秒/字）
        typeSpeed: 60,

        // 打字完成后停留时间（毫秒）
        pauseDuration: 5000,

        // 循环播放：true 开启 | false 仅显示一个
        loop: true
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
        updateInterval: 1000
    },

    // ============================================================
    // 加载界面配置
    // ============================================================
    loading: {
        // 加载提示文字列表（随机循环显示）
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

        // 文字切换间隔（毫秒）
        textSwitchInterval: 2000
    },

    // ============================================================
    // 壁纸配置
    // ============================================================
    wallpaper: {
        // 壁纸源 API 列表（竞速加载，首个成功的生效）
        apis: ['https://www.loliapi.com/bg/', 'https://www.dmoe.cc/random.php'],

        // 竞速超时（毫秒）
        raceTimeout: 10000,

        // 最大重试次数（指数退避，最大延迟8秒）
        maxRetries: 5,

        // 预加载数量（首页必须加载完成才显示）
        preloadCount: 3,

        // 无限滚动配置
        infiniteScroll: {
            enabled: true, // 启用无限滚动
            speed: 1.5, // 滚动速度（像素/帧，建议 0.5-3）
            batchSize: 5, // 每次滚动到底部加载的数量
            maxImages: 50 // 最大保留图片数量（超出后删除最旧的）
        }
    },

    // ============================================================
    // 动画配置
    // ============================================================
    animation: {
        // 打字机光标样式：'block' █ | 'line' |
        cursorStyle: 'block'
    },

    // ============================================================
    // 调试配置
    // ============================================================
    debug: {
        // 控制台输出日志
        consoleLog: true
    },

    // ============================================================
    // 交互特效配置
    // ============================================================
    effects: {
        // 滚动触发动画
        scrollReveal: {
            enabled: true,
            offset: 50, // 触发偏移量
            delay: 50 // 错开延迟（毫秒）
        }
    }
};

// 导出配置（供其他脚本使用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
