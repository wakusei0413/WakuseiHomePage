# Wakusei HomePage

![Version](https://img.shields.io/badge/version-1.8.5-9a0a0a?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-ffe600?style=for-the-badge)
![Astro](https://img.shields.io/badge/Astro-5-ff5d01?style=for-the-badge&logo=astro&logoColor=white)
![SolidJS](https://img.shields.io/badge/SolidJS-1.9-2c4f7c?style=for-the-badge&logo=solid&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-static-f38020?style=for-the-badge&logo=cloudflarepages&logoColor=white)

这是一个基于 `Astro + SolidJS + TypeScript` 的单页静态个人主页，继续以纯静态资源方式部署到 `Cloudflare Pages`。

![主页截图](docs/assets/screenshots/homepage-01.png)

## 1.8.5 更新

`1.8.5` 将导航栏 (NavigationDock) 完全配置化。

主要变化：

- **NavigationDock 配置化**：导航栏图标、顺序、行为全部从 `src/data/customize.ts` 读取，不再硬编码
- 新增 `dock` 配置区域：支持 `action`（主题切换）、`panel`（语言选择）、`link`（任意链接）和 `divider`（分隔线）四种元素
- 每种元素可自定义图标（`icon` / `iconActive`）、文案（`text` / `i18nKey`）、链接（`href`）等
- 内置保留功能：`toggleTheme`（主题切换）、`language`（语言面板），未知 `action` / `panel` 提供 `console.warn` 预留扩展接口
- `settings` 页面已移除并替换为 404 页面，所有不存在路由自动 fallback 到 404
- 根目录 `README.md` 即为唯一说明文档，`src/data/README.md` 已合并删除
- **多语言支持**：新增日语 (`ja`) 语言选项，日语日期采用汉字大写数字格式（如「五月二日」「土曜日」）

## 技术栈

- `Astro 5`
- `SolidJS`
- `TypeScript`
- `Zod`
- `ESLint`
- `Prettier`

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:4321
```

## 常用命令

```bash
npm run lint
npm run format:check
npm test
npm run check
npm run build
npm run serve
```

- `npm run dev`：启动 Astro 开发服务器
- `npm run lint`：检查 TypeScript、Solid 组件和配置文件
- `npm run format:check`：检查代码格式
- `npm test`：运行单元测试和样式回归测试
- `npm run check`：运行 Astro 类型检查
- `npm run build`：构建静态产物到 `dist/`
- `npm run serve`：预览 `dist/` 静态产物

## 部署说明

Cloudflare Pages 仍然按静态站点方式部署：

- 构建命令：`npm run build`
- 输出目录：`dist`

当前项目不依赖 `Astro SSR`、`Cloudflare Functions` 或额外后端服务。

## 配置指南

日常改内容主要编辑 `src/data/customize.ts`。以下按配置区域逐一说明，每个区域均附完整示例。

---

### `profile` — 头像、名字、状态

```typescript
profile: {
    name: '遨星 Wakusei',
    status: '正在武装保卫开源社区！',
    avatar: '/res/img/logo.png'
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | `string` | 主页显示的名字 |
| `status` | `string` | 名字下方的状态文案 |
| `avatar` | `string` | 头像图片路径（放在 `public/` 下，如 `/res/img/logo.png`） |

头像建议尺寸：正方形、透明背景 PNG，显示时保持 1:1 比例。

---

### `socialLinks` — 社交按钮

```typescript
socialLinks: {
    colorScheme: 'cycle',  // 'cycle' 每个按钮颜色不同；'same' 全部统一
    links: [
        {
            name: 'GITHUB',
            url: 'https://github.com/wakusei0413',
            icon: 'fab fa-github',
            color: '#ffe600'
        },
        {
            name: 'EMAIL',
            url: 'mailto:wakusei0413@outlook.com',
            icon: 'fas fa-envelope',
            color: '#3e59ff'
        }
    ]
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `colorScheme` | `'cycle' \| 'same'` | `cycle` 每个按钮独立颜色；`same` 用统一颜色 |
| `links[].name` | `string` | 按钮上显示的名称 |
| `links[].url` | `string` | 跳转链接（支持 `mailto:`） |
| `links[].icon` | `string` | Font Awesome 图标类，如 `fab fa-github` |
| `links[].color` | `string` | 按钮背景色，CSS 色值如 `#3e59ff` |

---

### `slogans` — 打字机文案

```typescript
slogans: {
    list: [
        '安静，我在用锤子TNT vibe coding！',
        '武装保卫开源社区！',
        '说得好！我完全同意。'
    ],
    mode: 'sequence',        // 'sequence' 顺序播放；'random' 随机
    typeSpeed: 60,           // 每个字符输入间隔（毫秒）
    pauseDuration: 5000,     // 打完一条后停顿多久（毫秒）
    loop: true               // 是否循环播放
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `list` | `string[]` | 所有可播放的文案 |
| `mode` | `'random' \| 'sequence'` | 播放顺序：随机或顺序 |
| `typeSpeed` | `number` | 打字速度，越小越快 |
| `pauseDuration` | `number` | 每条文案打完后停留时间 |
| `loop` | `boolean` | 是否循环播放列表 |

---

### `time` — 时间面板

```typescript
time: {
    format: '24h',         // '12h' 或 '24h'
    showWeekday: true,     // 是否显示星期
    showDate: true,        // 是否显示日期
    updateInterval: 1000   // 刷新间隔（毫秒）
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `format` | `'12h' \| '24h'` | 时间显示格式 |
| `showWeekday` | `boolean` | 是否显示星期几 |
| `showDate` | `boolean` | 是否显示月-日 |
| `updateInterval` | `number` | 刷新周期（毫秒），默认 1000 |

星期和月份的翻译自动根据当前语言切换。翻译文件在 `src/data/i18n.ts`。

---

### `loading` — 加载页文案

```typescript
loading: {
    texts: [
        '少女祈祷中...',
        '正在给服务器喂猫粮...',
        '正在连接异次元...'
    ],
    textSwitchInterval: 2000   // 文案轮换间隔（毫秒）
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `texts` | `string[]` | 加载页轮播的文案列表 |
| `textSwitchInterval` | `number` | 每条文案显示多久后切换 |

---

### `wallpaper` — 壁纸轮播

```typescript
wallpaper: {
    apis: [
        'https://www.loliapi.com/bg/',
        'https://www.dmoe.cc/random.php'
    ],
    raceTimeout: 10000,     // 单次请求超时（毫秒）
    maxRetries: 5,          // 最大重试次数
    preloadCount: 3,      // 预加载图片数量
    infiniteScroll: {
        enabled: true,    // 是否启用无限滚动
        speed: 2,         // 滚动速度（像素/帧）
        batchSize: 5,     // 每次加载多少张
        maxImages: 50     // 页面最多保留多少张
    }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `apis` | `string[]` | 壁纸图片来源接口，可配置多个并行加载 |
| `raceTimeout` | `number` | 单次请求超时时间 |
| `maxRetries` | `number` | 接口失败时的最大重试次数 |
| `preloadCount` | `number` | 提前加载多少张图片到内存 |
| `infiniteScroll.enabled` | `boolean` | 是否启用无限滚动 |
| `infiniteScroll.speed` | `number` | 滚动速度，越大越快 |
| `infiniteScroll.batchSize` | `number` | 每批加载图片数量 |
| `infiniteScroll.maxImages` | `number` | DOM 中最大保留图片数，超出自动清理 |

---

### `animation` — 打字机光标

```typescript
animation: {
    cursorStyle: 'block'   // 'block' 或 'line'
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `cursorStyle` | `'block' \| 'line'` | 打字机光标样式：方块或竖线 |

---

### `contentProtection` — 交互限制

```typescript
contentProtection: {
    preventCopyAndDrag: true   // 是否禁止复制和拖拽
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `preventCopyAndDrag` | `boolean` | `true` 时拦截右键菜单、文本选中、图片拖拽 |

---

### `effects` — 页面动效

```typescript
effects: {
    scrollReveal: {
        enabled: true,    // 是否启用滚动浮现效果
        offset: 50,       // 元素进入视口前多少像素开始触发动画
        delay: 50          // 元素间动画延迟（毫秒）
    }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `scrollReveal.enabled` | `boolean` | 是否启用滚动浮现效果 |
| `scrollReveal.offset` | `number` | 触发动画的视口偏移量 |
| `scrollReveal.delay` | `number` | 多元素依次浮现的间隔 |

---

### `i18n` — 国际化

```typescript
i18n: {
    defaultLocale: 'zh-CN',     // 默认语言
    locales: ['zh-CN', 'en']    // 支持的语言列表
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `defaultLocale` | `'zh-CN' \| 'en'` | 首次访问时使用的语言 |
| `locales` | `('zh-CN' \| 'en')[]` | 支持切换的语言列表 |

所有翻译内容在 `src/data/i18n.ts` 中维护。新增语言时需要同时更新此处的 `locales` 和 `i18n.ts`。

---

### `dock` — 导航栏（1.8.5+）

导航栏（页面底部 Dock）的所有内容都在 `dock.items` 数组中定义，数组顺序即为导航栏从左到右的渲染顺序：

```typescript
dock: {
    items: [
        // action：执行内置行为
        {
            type: 'action',
            action: 'toggleTheme',           // 内置：切换明暗主题
            display: {
                icon: 'fa-solid fa-moon',  // 默认图标
                iconActive: 'fa-solid fa-sun', // 激活时图标（可选，如主题切换后显示太阳）
                i18nKey: 'dock.theme'        // 从 src/data/i18n.ts 读取标签
            }
        },

        // divider：视觉分隔线
        { type: 'divider' },

        // panel：打开弹出面板
        {
            type: 'panel',
            panel: 'language',                // 内置：语言选择面板
            display: {
                icon: 'fa-solid fa-globe',
                i18nKey: 'dock.language'
            }
        },

        // link：跳转链接
        {
            type: 'link',
            href: 'https://example.com',
            openInNewTab: true,              // 可选，默认 false
            display: {
                icon: 'fa-solid fa-link',
                i18nKey: 'dock.settings'     // 或直接用 text: '设置'
            }
        }
    ]
}
```

**四种 `type`：**

| type | 说明 | 必填字段 |
|---|---|---|
| `action` | 执行内置或自定义行为 | `action`（行为 ID） |
| `panel` | 打开弹出面板 | `panel`（面板 ID） |
| `link` | 页面跳转 | `href`（目标地址） |
| `divider` | 垂直分隔线 | 无 |

**`display` 字段：**

| 字段 | 说明 | 优先级 |
|---|---|---|
| `icon` | Font Awesome 图标类（如 `fa-solid fa-moon`） | 必填 |
| `iconActive` | 激活态图标（如主题高亮后切到太阳） | 可选 |
| `text` | 硬编码文案文字 | 次选（无 `i18nKey` 时生效） |
| `i18nKey` | `src/data/i18n.ts` 中的翻译键 | **优先** |

**内置保留行为：**

| 类型 | 键值 | 说明 |
|---|---|---|
| `action` | `toggleTheme` | 切换浅/深色主题，自动保存到 localStorage |
| `panel` | `language` | 打开语言选择面板（桌面端 popup / 移动端 bottom sheet） |

任何未知的 `action` 或 `panel` 不会 crash，而是输出 `console.warn`，并保留为扩展接口。

---

### 配置运行链路

- `src/data/customize.ts`：主要人工编辑入口
- `src/data/site.ts`：应用实际读取的校验后配置
- `src/data/schema.ts`：`Zod` 配置结构校验
- `src/types/site.ts`：配置类型定义

### 修改建议

- 改文案、链接、颜色、壁纸接口时，优先只改 `src/data/customize.ts`
- 改 dock 标签翻译、星期月份翻译时，编辑 `src/data/i18n.ts`
- 改字段结构时，同时更新 `src/data/schema.ts` 和 `src/types/site.ts`
- 改页面表现或交互时，优先看 `src/components/` 和 `src/lib/`
- 改社交按钮弹起手感时，看 `src/components/SocialLinks.tsx` 和 `css/components.css`

## 页面结构

主要入口和组件：

- `src/pages/index.astro`：首页入口
- `src/layouts/BaseLayout.astro`：基础 HTML、SEO、字体和全局样式入口
- `src/components/HomepageApp.tsx`：主页主交互容器
- `src/components/NavigationDock.tsx`：导航栏（主题、语言、设置）
- `src/components/SocialLinks.tsx`：社交导航按钮
- `src/components/TypewriterSlogan.tsx`：打字机文案
- `src/components/ClockPanel.tsx`：右侧时间面板
- `src/components/LoadingOverlay.tsx`：加载遮罩

主要逻辑工具：

- `src/lib/wallpaper-scroller.ts`：壁纸加载、预加载、滚动和清理
- `src/lib/i18n.ts`：国际化运行时（语言/主题切换）
- `src/lib/runtime-effects.ts`：页面运行时交互效果
- `src/lib/font-awesome.ts`：图标字体延迟加载
- `src/lib/slogan-selector.ts`：标语顺序和随机选择
- `src/lib/time.ts`：时间格式化（支持多语言）

## 样式说明

样式集中在 `css/` 目录：

- `css/base.css`：变量、重置、全局基础样式
- `css/layout.css`：左右面板和壁纸区域布局
- `css/components.css`：头像、社交按钮、加载页、时间面板等组件样式
- `css/responsive.css`：移动端和窄屏适配
- `src/styles/dock.css`：导航栏（NavigationDock）完整样式

社交导航按钮的弹起手感主要由这两处控制：

- `src/components/SocialLinks.tsx`：通过指针事件切换即时悬浮状态
- `css/components.css`：控制按钮上浮方向、阴影和颜色

当前社交按钮保持“碰到后向左上弹起”的视觉方向，同时用固定按钮槽位避免鼠标位于按钮缝隙时反复闪烁。

## 静态资源

静态资源放在：

- `public/res/`

头像路径保持为：

```text
/res/img/logo.png
```

这样部署后的公开访问路径不会因为迁移到 Astro 而改变。

## 测试覆盖

当前测试位于 `tests/`：

- 配置结构校验
- 标语选择逻辑
- 时间格式化
- 壁纸滚动和图片属性
- Font Awesome 延迟加载
- 社交按钮样式和即时指针交互
- i18n 配置校验、翻译数据完整性和运行时切换

完整验证建议使用：

```bash
npm run lint
npm run format:check
npm test
npm run check
npm run build
```

## 开源协议

本项目使用 `MIT License`，详见 [LICENSE](LICENSE)。
