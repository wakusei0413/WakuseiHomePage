# Wakusei HomePage

一个采用粗放主义（Brutalist）设计风格的个人主页，具有磨砂玻璃效果、动态壁纸轮播、打字机 Slogan 展示等功能。

![版本](https://img.shields.io/badge/version-0.0.8-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 特性

- 🎨 **粗放主义设计** - 大胆的边框、阴影和几何形状
- 🖼️ **动态壁纸** - 支持 Pixiv 随机图片和 Picsum 备用源
- ⌨️ **打字机效果** - 循环展示个性化 Slogan
- 🌓 **深色/浅色模式** - 支持手动切换和系统偏好自动检测
- 📱 **响应式布局** - 移动端优化，支持面板滑动切换
- 🔗 **可配置社交链接** - 通过配置文件轻松添加/修改链接
- 🎯 **Font Awesome 图标** - 丰富的图标库支持

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
    weather: { ... },      // 天气配置
    wallpaper: { ... },    // 壁纸轮播
    animation: { ... },    // 动画配置
    debug: { ... },        // 调试配置
    theme: { ... },        // 主题配置
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

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `name` | string | 显示在页面中央的名称 | `'遊星 Wakusei'` |
| `status` | string | 状态栏文字 | `'OPEN TO OPPORTUNITIES'` |
| `avatar` | string | 头像图片路径 | `'res/img/avatar.png'` |

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

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 按钮上显示的文字，如 `'GITHUB'`、`'哔哩哔哩'` |
| `url` | string | ✅ | 点击跳转的链接，支持 `https://` 或 `mailto:` |
| `icon` | string | ✅ | Font Awesome 图标类，如 `fab fa-github`、`fas fa-envelope` |
| `color` | string | ❌ | 按钮颜色，支持预设值或 HEX 格式 |

#### 颜色配置方式

**方式一：使用预设颜色（推荐）**

```javascript
color: 'yellow'  // 黄色边框和阴影
color: 'red'     // 红色边框和阴影  
color: 'blue'    // 蓝色边框和阴影
```

**方式二：使用自定义 HEX 颜色**

```javascript
color: '#FF6B6B'    // 珊瑚红
color: '#4ECDC4'    // 青绿色
color: '#A8E6CF'    // 薄荷绿
color: '#FFD93D'    // 明黄色
```

#### 常用 Font Awesome 图标参考

| 平台 | 图标类 |
|------|--------|
| GitHub | `fab fa-github` |
| Twitter/X | `fab fa-x-twitter` |
| Bilibili | `fab fa-bilibili` |
| 微博 | `fab fa-weibo` |
| 知乎 | `fab fa-zhihu` |
| QQ | `fab fa-qq` |
| 微信 | `fab fa-weixin` |
| 邮箱 | `fas fa-envelope` |
| 个人网站 | `fas fa-globe` |
| 博客 | `fas fa-blog` |
| RSS | `fas fa-rss` |

> 更多图标请访问：[Font Awesome 图标库](https://fontawesome.com/icons)

#### 添加新链接示例

```javascript
links: [
    // 已有链接...
    {
        name: '知乎',
        url: 'https://www.zhihu.com/people/xxx',
        icon: 'fab fa-zhihu',
        color: '#0084FF'  // 知乎蓝
    },
    {
        name: '个人博客',
        url: 'https://myblog.com',
        icon: 'fas fa-blog',
        color: 'yellow'
    }
]
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
    // 切换间隔（毫秒）
    interval: 10000,
    
    // 数据源：'pixiv' | 'unsplash' | 'picsum'
    source: 'pixiv',
    
    // Pixiv 标签过滤器（仅 source: 'pixiv' 时有效）
    tags: ['少女', '风景', '插画', '动漫'],
    
    // R18 过滤：0 全年龄 | 1 R18
    r18: 0,
    
    // 预加载图片数量
    count: 5,
}
```

---

### 🎨 主题配置 (`theme`)

```javascript
theme: {
    // 默认主题：'light' | 'dark' | 'system'
    default: 'system',
    
    // Cookie 名称
    cookieName: 'theme',
    
    // Cookie 有效期（秒），1年 = 31536000
    cookieExpire: 31536000,
    
    // 过渡动画时长（毫秒）
    transitionDuration: 300,
}
```

---

### 🐛 调试配置 (`debug`)

```javascript
debug: {
    // 是否在控制台输出日志
    consoleLog: true,
    
    // 是否显示性能信息
    showPerfInfo: false,
}
```

---

### 🌤️ 天气配置 (`weather`)

```javascript
weather: {
    // 默认城市（获取失败时使用）
    defaultCity: 'Beijing',
    
    // 更新间隔（毫秒，10分钟 = 600000）
    updateInterval: 600000,
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

### 彩纸特效 (`confetti`)

点击社交链接按钮时，从点击位置飞散出随机颜色的彩纸碎片。

```javascript
effects: {
    confetti: {
        enabled: true,              // 是否启用
        count: 25,                  // 彩纸数量（默认 25）
        colors: [                   // 彩纸颜色（支持 CSS 变量或 HEX）
            '--accent-yellow',
            '--accent-red',
            '--accent-blue',
            '#FF6B6B',
            '#4ECDC4'
        ],
        duration: 1500,             // 动画时长（毫秒）
        spread: 150,                // 扩散范围（像素）
    }
}
```

### 滚动触发动画 (`scrollReveal`)

页面元素进入视口时，从下方淡入并错开显示。

```javascript
effects: {
    scrollReveal: {
        enabled: true,              // 是否启用
        offset: 50,                 // 触发偏移量（像素）
        delay: 50,                  // 元素间错开延迟（毫秒）
        duration: 600,              // 动画时长（毫秒）
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',  // 缓动函数
    }
}
```

### 像素小宠物 (`pixelPet`)

页面右下角有一个像素风格的小猫，在屏幕边缘悠闲散步。

```javascript
effects: {
    pixelPet: {
        enabled: true,              // 是否启用
        type: 'cat',                // 宠物类型：'cat'（猫）| 'dog'（预留）
        speed: 0.5,                 // 移动速度（像素/帧）
        size: 32,                   // 显示尺寸（像素）
        interactions: true,         // 是否允许点击互动（点击会跳跃+显示爱心）
    }
}
```

**互动效果：** 点击小猫会触发跳跃动画并显示爱心 ❤️

---

## 🎨 自定义样式

如需进一步自定义样式，可以编辑 `css/style.css` 文件。主要 CSS 变量定义在 `:root` 中：

```css
:root {
    /* 颜色 */
    --fg: #000000;           /* 前景色（文字、边框） */
    --bg: #FFFFFF;           /* 背景色 */
    
    /* 阴影偏移 */
    --shadow-offset: 6px;           /* 大阴影 */
    --shadow-offset-sm: 4px;        /* 小阴影 */
    
    /* 强调色 */
    --accent-yellow: #FFE600;
    --accent-red: #FF0000;
    --accent-blue: #00BCD4;
}

/* 深色模式 */
[data-theme="dark"] {
    --fg: #FFFFFF;
    --bg: #000000;
}
```

---

## 📁 项目结构

```
WakuseiHomePage/
├── index.html          # 主页面
├── config.js           # 配置文件（所有可配置项）
├── README.md           # 本文件
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── main.js         # 主脚本（社交链接生成、主题切换等）
│   └── loading.js      # 加载界面管理
└── res/
    └── img/
        └── logo.png    # 默认头像
```

---

## 🔧 更新日志

### v0.0.8
- 新增点击彩纸特效（点击社交链接时触发）
- 新增滚动触发动画（元素进入视口时淡入）
- 新增像素小宠物（右下角像素猫咪，可点击互动）
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
