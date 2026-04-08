# Wakusei HomePage

一个采用粗放主义（Brutalist）设计风格的个人主页，具有磨砂玻璃效果、动态壁纸轮播、打字机 Slogan 展示等功能。

![版本](https://img.shields.io/badge/version-0.2.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)

本项目在 [LINUX DO](https://linux.do) 社区进行开源推广

## ✨ 特性

- 🎨 **粗放主义设计** - 大胆的边框、阴影和几何形状
- 🖼️ **动态壁纸** - 支持 Pixiv 随机图片和 Picsum 备用源
- ⌨️ **打字机效果** - 循环展示个性化 Slogan
- 📱 **响应式布局** - 移动端优化，支持面板滑动切换
- 🔗 **可配置社交链接** - 通过配置文件轻松添加/修改链接
- 🎯 **Font Awesome 图标** - 丰富的图标库支持
- 🔧 **开发工具链** - ESLint + Prettier + 构建脚本

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/wakusei0413/WakuseiHomePage.git
cd WakuseiHomePage
```

### 2. 配置

编辑 `config.js` 文件，根据你的需求进行个性化设置（详见下方[配置指南](#-配置指南)）。

### 3. 部署

#### 本地预览

```bash
# 使用 Python 简单服务器
python -m http.server 8080

# 或使用 Node.js
npx serve .
```

然后访问 `http://localhost:8080`

#### 构建生产版本

```bash
# 安装依赖
npm install

# 代码检查
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format

# 构建压缩版本到 dist/
npm run build

# 预览
npm run serve
```

#### GitHub Pages 部署

1. 将代码推送到 GitHub 仓库
2. 进入仓库 Settings → Pages
3. 选择 Source 为 "Deploy from a branch"
4. 选择分支（通常是 `main` 或 `master`）和根目录 `/`
5. 保存后等待几分钟，访问 `https://你的用户名.github.io/仓库名`

## 📋 配置指南

所有配置都在 `config.js` 文件中完成，**无需修改任何 HTML 或 JavaScript 代码**。

### 基本结构

```javascript
const CONFIG = {
    profile: { ... },      // 个人信息
    socialLinks: { ... },  // 社交链接
    footer: { ... },       // 底部版权
    slogans: { ... },      // Slogan/简介
    time: { ... },         // 时间组件
    loading: { ... },      // 加载界面
    wallpaper: { ... },    // 壁纸配置
    animation: { ... },    // 动画配置
    debug: { ... },        // 调试配置
    effects: { ... },      // 交互特效
};
```

---

### 👤 个人信息配置 (`profile`)

```javascript
profile: {
    // 显示名称（支持中文）
    name: '遊星 Wakusei',

    // 状态栏文字
    status: '正在过大关.jpg',

    // 头像路径（相对于项目根目录）
    avatar: 'res/img/logo.png',
}
```

| 字段     | 类型   | 说明                 | 示例                      |
| -------- | ------ | -------------------- | ------------------------- |
| `name`   | string | 显示在页面中央的名称 | `'遊星 Wakusei'`          |
| `status` | string | 状态栏文字           | `'OPEN TO OPPORTUNITIES'` |
| `avatar` | string | 头像图片路径         | `'res/img/avatar.png'`    |

---

### 🔗 社交链接配置 (`socialLinks`)

这是最重要的配置部分，可以自定义显示任意数量的社交链接按钮。

```javascript
socialLinks: {
    // 颜色分配策略
    // 'cycle' - 循环使用 yellow → red → blue
    // 'same'  - 全部使用同一种颜色
    colorScheme: 'cycle',

    // 链接列表数组
    links: [
        {
            name: 'GITHUB',                    // 按钮显示文字
            url: 'https://github.com/xxx',     // 跳转链接
            icon: 'fab fa-github',             // Font Awesome 图标类
            color: 'yellow'                    // 颜色（可选）
        },
        {
            name: 'BILIBILI',
            url: 'https://space.bilibili.com/xxx',
            icon: 'fab fa-bilibili',
            color: '#FF6B6B'                   // 支持自定义 HEX 颜色
        },
        // 添加更多链接...
    ]
}
```

#### 链接对象字段说明

| 字段    | 类型   | 必填 | 说明                                                       |
| ------- | ------ | ---- | ---------------------------------------------------------- |
| `name`  | string | ✅   | 按钮上显示的文字，如 `'GITHUB'`、`'哔哩哔哩'`              |
| `url`   | string | ✅   | 点击跳转的链接，支持 `https://` 或 `mailto:`               |
| `icon`  | string | ✅   | Font Awesome 图标类，如 `fab fa-github`、`fas fa-envelope` |
| `color` | string | ❌   | 按钮颜色，支持预设值或 HEX 格式                            |

#### 颜色配置方式

**方式一：使用预设颜色（推荐）**

```javascript
color: 'yellow'; // 黄色边框和阴影
color: 'red'; // 红色边框和阴影
color: 'blue'; // 蓝色边框和阴影
```

**方式二：使用自定义 HEX 颜色**

```javascript
color: '#FF6B6B'; // 珊瑚红
color: '#4ECDC4'; // 青绿色
color: '#A8E6CF'; // 薄荷绿
color: '#FFD93D'; // 明黄色
```

#### 常用 Font Awesome 图标参考

| 平台      | 图标类             |
| --------- | ------------------ |
| GitHub    | `fab fa-github`    |
| Twitter/X | `fab fa-x-twitter` |
| Bilibili  | `fab fa-bilibili`  |
| 微博      | `fab fa-weibo`     |
| 知乎      | `fab fa-zhihu`     |
| QQ        | `fab fa-qq`        |
| 微信      | `fab fa-weixin`    |
| 邮箱      | `fas fa-envelope`  |
| 个人网站  | `fas fa-globe`     |
| 博客      | `fas fa-blog`      |
| RSS       | `fas fa-rss`       |

> 更多图标请访问：[Font Awesome 图标库](https://fontawesome.com/icons)

#### 添加新链接示例

```javascript
links: [
    // 已有链接...
    {
        name: '知乎',
        url: 'https://www.zhihu.com/people/xxx',
        icon: 'fab fa-zhihu',
        color: '#0084FF' // 知乎蓝
    },
    {
        name: '个人博客',
        url: 'https://myblog.com',
        icon: 'fas fa-blog',
        color: 'yellow'
    }
];
```

---

### 📝 Slogan 配置 (`slogans`)

配置打字机效果循环展示的 Slogan。

```javascript
slogans: {
    // Slogan 列表数组
    list: [
        '第一句 Slogan',
        '第二句 Slogan',
        '第三句 Slogan',
    ],

    // 切换模式
    // 'random'   - 随机选择（避免连续重复）
    // 'sequence' - 按顺序循环
    mode: 'random',

    // 打字速度（毫秒/字）
    typeSpeed: 60,

    // 打完后的停留时间（毫秒）
    pauseDuration: 5000,

    // 是否循环播放
    loop: true,
}
```

---

### 🕐 时间组件配置 (`time`)

```javascript
time: {
    // 时间格式：'24h' 或 '12h'
    format: '24h',

    // 是否显示星期
    showWeekday: true,

    // 是否显示日期
    showDate: true,

    // 更新间隔（毫秒）
    updateInterval: 1000,
}
```

---

### 🖼️ 壁纸配置 (`wallpaper`)

```javascript
wallpaper: {
    // 壁纸源 API 列表（竞速加载，首个成功的生效）
    apis: [
        'https://www.loliapi.com/bg/',
        'https://www.dmoe.cc/random.php'
    ],

    // 竞速超时（毫秒）
    raceTimeout: 10000,

    // 最大重试次数
    maxRetries: 100,

    // 预加载数量（首页必须加载完成才显示）
    preloadCount: 3,

    // 无限滚动配置（瀑布流模式）
    infiniteScroll: {
        enabled: true,              // 启用无限加载
        speed: 1.5,                 // 滚动速度（像素/帧，建议 0.5-3）
        batchSize: 5,               // 每次滚动到底部加载的数量
        maxImages: 50,              // 最大保留图片数量（超出后删除最旧的）
    }
}
```

**瀑布流特性：**

- **多 API 竞速**：支持配置多个壁纸源，同时请求，首个成功的生效
- **预加载等待**：前 3 张（可配置）图片完全加载后才隐藏加载界面
- **无限加载**：向下滚动到底部时自动加载更多图片
- **自动滚动**：壁纸自动向下滚动，速度可配置（`speed` 参数）
- **瀑布流展示**：持续向下追加新图片，不是循环播放
- **内存管理**：超过 50 张时自动清理最旧的图片

---

### ⏳ 加载界面配置 (`loading`)

配置首页加载时显示的提示文字和切换间隔。

```javascript
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
    textSwitchInterval: 2000,
}
```

**配置说明：**

| 配置项               | 类型   | 说明                                       |
| -------------------- | ------ | ------------------------------------------ |
| `texts`              | array  | 加载时显示的提示文字数组，会按顺序循环显示 |
| `textSwitchInterval` | number | 文字切换的时间间隔（毫秒），默认 2000ms    |

---

### 🐛 调试配置 (`debug`)

```javascript
debug: {
    // 是否在控制台输出日志
    consoleLog: true,
}
```

---

## 📝 底部版权配置 (`footer`)

```javascript
footer: {
    // 版权文字（年份自动获取当前年份）
    text: '咕咕嘎嘎',
}
// 最终显示：咕咕嘎嘎 • 2026
```

---

## ✨ 交互特效配置 (`effects`)

### 滚动触发动画 (`scrollReveal`)

页面元素进入视口时，从下方淡入并错开显示。

```javascript
effects: {
    scrollReveal: {
        enabled: true,              // 是否启用
        offset: 50,                 // 触发偏移量（像素）
        delay: 50,                  // 元素间错开延迟（毫秒）
    }
}
```

## 🎨 自定义样式

如需进一步自定义样式，可以编辑 `css/style.css` 文件。主要 CSS 变量定义在 `:root` 中：

```css
:root {
    /* 颜色 */
    --fg: #000000; /* 前景色（文字、边框） */
    --bg: #ffffff; /* 背景色 */

    /* 阴影偏移 */
    --shadow-offset: 6px; /* 大阴影 */
    --shadow-offset-sm: 4px; /* 小阴影 */

    /* 强调色 */
    --accent-yellow: #ffe600;
    --accent-red: #ff0000;
    --accent-blue: #00bcd4;
}
```

---

## 📁 项目结构

```
WakuseiHomePage/
├── index.html              # 主页面
├── config.js               # 配置文件（所有可配置项）
├── package.json            # Node.js 项目配置（开发工具链）
├── build.js                # 构建脚本（压缩 JS/CSS）
├── .eslintrc.json          # ESLint 配置
├── .prettierrc             # Prettier 配置
├── .gitignore               # Git 忽略规则
├── README.md               # 本文件
├── css/
│   └── style.css           # 样式文件
├── js/
│   ├── main.js             # 主脚本入口
│   ├── wallpaper.js         # 壁纸滚动模块
│   ├── typewriter.js        # 打字机效果模块
│   ├── time.js              # 时间组件模块
│   ├── social.js            # 社交链接 & 个人信息模块
│   ├── logger.js            # 日志工具
│   └── utils.js             # 工具函数（debounce 等）
└── res/
    └── img/
        └── logo.png         # 默认头像
```

---

## 🔧 更新日志

### v0.2.1

- **🏗️ 代码质量重构**
    - `main.js` 拆分为 3 个独立模块：`typewriter.js`、`time.js`、`social.js`
    - 新增 `logger.js` — 统一日志工具，消除 9 处重复 debug 判断
    - 新增 `utils.js` — `debounce` 防抖函数，3 处 resize 监听已应用
- **⚡ 性能优化**
    - CSS `will-change` 改为 hover 时才启用，减少持续内存占用
    - 壁纸模块：竞速失败时彻底取消请求（`removeAttribute('src')`）
    - 壁纸模块：`destroy()` 清理 `cancelAnimationFrame`，防止泄漏
    - 壁纸模块：`_cleanup()` 清理 dataset 属性，协助 GC
    - 添加 CSS Containment（`contain: layout style paint`）到关键容器
    - 壁纸占位改用 `aspect-ratio: 16/9` 替代 `min-height`，布局更稳定
- **🧹 CSS 清理**
    - 删除 `.info-panel` 的重复 CSS 定义（约 40 行）
    - 合并 `html` 选择器的重复规则
    - 统一所有硬编码 z-index 为 CSS 变量（新增 `--z-loading`）
    - 合并 3 处 scrollbar 隐藏规则为一处
    - 去除深色模式下多余的 `!important`
- **🔐 主题持久化**
    - 从 Cookie 迁移到 localStorage（保留 Cookie 降级）
    - 防闪烁脚本同步更新为 localStorage 优先
- **🌐 加载性能**
    - 添加 `<link rel="preconnect" href="https://cdn.jsdelivr.net">` 预连接
    - 添加 OG meta 标签（`og:title`、`og:description`、`og:type`）
    - 添加 favicon 声明
- **🔧 开发工具链**
    - 新增 `package.json` — 项目配置 + npm scripts
    - 新增 `.eslintrc.json` — ESLint 代码检查规则
    - 新增 `.prettierrc` — Prettier 格式化配置
    - 新增 `build.js` — 构建脚本（terser 压缩 JS、cssnano 压缩 CSS）
    - 新增 `.gitignore` — 忽略 node_modules 和 dist

### v0.2.0

- **🏗️ 架构重构：壁纸模块解耦**
    - 将壁纸滚动功能拆分为独立模块 `js/wallpaper.js`（WallpaperScroller 类）
    - 主脚本 `main.js` 精简为调用代码，职责分离更清晰
    - 支持模块销毁和清理，便于内存管理
- **🎨 UI 层级重构**
    - 左侧面板宽度从百分比改为固定 500px，布局更稳定
    - 右侧面板使用 `flex: 1` 自适应延申至屏幕边缘，避免宽屏留白
    - 新增 `.right-panel-shadow` 独立阴影层，营造"透过玻璃/画框观看"的视觉效果
    - 阴影层与壁纸模块完全解耦，即使壁纸被替换或移除效果依然存在
- **🧹 代码清理与优化**
    - 删除未使用的 `wallpaper.infiniteScroll.initialLoad` 配置项（实际使用 `preloadCount`）
    - 删除未使用的 `effects.pixelPet.type` 配置项（当前仅支持猫咪）
    - 删除过时的"天气功能"相关注释
    - 删除无用的壁纸滚动条 CSS 样式（用户交互已被禁用）
- **📚 文档更新**
    - 更新项目结构说明（删除不存在的 `loading.js`，新增 `wallpaper.js`）
    - 修正壁纸配置文档（移除 `initialLoad` 参数）
    - 更新版本号徽章至 0.2.0

### v0.1.1

- **🐛 紧急修复**
    - 修复生产环境（Vercel）壁纸无限滚动功能失效的问题
    - 修复 `loadImageLazy` 和 `retryLazy` 函数中引用未定义变量 `API1` 和 `API2` 的问题
    - 更新为使用配置化的 `APIS` 数组（`APIS[0]` 和 `APIS[1]`）

### v0.1.0

- **配置优化**
    - 删除未使用的 `weather` 配置节
    - 删除未使用的 `wallpaper.source`、`wallpaper.tags`、`wallpaper.r18`、`wallpaper.count` 配置项
    - 新增 `wallpaper.apis` 支持多 API 源配置化（可配置任意数量的壁纸源）
    - 新增 `wallpaper.preloadCount` 预加载数量配置
    - 新增 `wallpaper.raceTimeout` 和 `wallpaper.maxRetries` 竞速参数配置
    - 新增 `loading.texts` 加载文字配置（可自定义加载提示文案）
    - 新增 `loading.textSwitchInterval` 文字切换间隔配置
- **代码重构**
    - 壁纸 API 地址从硬编码改为配置化
    - 加载提示文字从硬编码改为配置化
    - 支持任意数量的 API 竞速加载（不再限制为2个）

### v0.0.9

- **瀑布流无限加载壁纸**
- 预加载机制：前5张图片完全加载后才显示主页面
- 无限加载：向下滚动到底部时自动加载更多图片
- 瀑布流展示：持续向下追加新图片，不是循环播放
- 内存管理：超过50张时自动清理最旧的10张图片
- 支持鼠标滚轮和触摸滑动自由浏览
- 所有功能可通过 `config.js` 配置

### v0.0.8

- 新增滚动触发动画（元素进入视口时淡入）

- 所有特效可通过 `config.js` 独立开关和配置

### v0.0.6

- 社交链接支持自定义 HEX 颜色（如 `#FF6B6B`）
- 手机端右侧面板添加滑入动画效果
- 修复 Font Awesome CDN，改用 jsdelivr

### v0.0.5

- 社交链接配置化，支持 Font Awesome 图标
- 手机端社交链接双列布局
- 头像和名称左对齐

### v0.0.4

- 手机端首页支持滚动
- 添加移动端壁纸切换面板

---

## 📄 许可证

[MIT License](LICENSE)

---

## 💡 常见问题

### Q: 修改 config.js 后没有生效？

A:

1. 检查浏览器控制台是否有红色报错
2. 强制刷新页面：`Ctrl + F5`
3. 确保 `config.js` 在 `index.html` 中正确引入（在 `main.js` 之前）

### Q: GitHub Pages 上社交链接不显示？

A:

1. 检查 GitHub 仓库里的 `config.js` 是否与本地一致
2. GitHub Pages 有缓存，等待几分钟或加随机参数访问：`?t=123`
3. 检查文件名大小写（Linux 服务器区分大小写）

### Q: 如何添加更多社交链接？

A: 在 `config.js` 的 `socialLinks.links` 数组中添加新对象，参考上方[社交链接配置](#-社交链接配置-sociallinks)部分。

### Q: Font Awesome 图标不显示？

A:

1. 检查图标类名是否正确（如 `fab fa-github` 不是 `fa fa-github`）
2. 检查网络是否能访问 CDN（`cdn.jsdelivr.net`）
3. 在控制台执行 `FontAwesome` 查看是否加载成功

---

**修改 README 时请注意：** 如果代码有更新（如新增配置项、修改配置结构），请同步更新本文档中对应的配置说明部分。
