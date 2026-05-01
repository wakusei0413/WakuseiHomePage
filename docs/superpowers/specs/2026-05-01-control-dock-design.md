# ControlDock 设计规格

## 概述

在网站右侧面板中间（PC端）和底部居中（手机端）添加一个胶囊形状、玻璃材质的 Dock 控制栏，支持黑夜模式切换、多语言切换和可扩展的设置入口。

## 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 架构方案 | CSS变量 + 内联i18n | 符合现有架构，无外部依赖，改动最小 |
| Dock交互 | 混合模式 | 开关型直接点击切换，选择型展开面板 |
| 布局方向 | 自适应旋转 | PC竖向+手机横向，两端各取最优 |
| 暗色风格 | Glassmorphism Dark | 去重阴影+微光+毛玻璃，与dock玻璃材质呼应 |
| 展开面板 | PC浮动卡片/手机Bottom Sheet | 符合各平台操作习惯 |
| 图标 | Font Awesome 7（本地资源） | 项目已有，风格统一 |
| i18n范围 | 中英+可扩展框架 | 初始双语，框架可随时添加语言 |
| 初始选项 | 黑夜模式+语言+设置(占位) | 最小可用集+预留扩展 |

## 1. ControlDock 组件

**文件**：`src/components/ControlDock.tsx`

### 视觉规格

**PC端（>900px）**：
- 方向：竖向胶囊（flex-direction: column）
- 定位方案：在右侧面板内部使用 `position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)`，右侧面板需设 `position: relative`。这样 dock 始终相对于右面板定位，无论面板宽度如何变化。
- 尺寸：宽 60px，圆角 30px
- 位置：右侧面板水平中心、垂直居中

**手机端（≤900px）**：
- 方向：横向胶囊（flex-direction: row）
- 定位：`position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%)`
- 尺寸：高 52px，圆角 26px
- 位置：画面底部居中

**玻璃材质**：
```css
background: rgba(0, 0, 0, 0.25);
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.18);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
```

**z-index**：`10000`（高于 --z-noise: 9999；noise overlay 调整为 10001，因为 noise 是纯装饰层不影响交互）

### 按钮项

| 按钮 | Font Awesome图标 | 交互类型 | 行为 |
|------|-----------------|---------|------|
| 黑夜模式 | `fa-moon`（暗色开启）/ `fa-sun`（亮色模式） | 开关型 | 点击直接切换 `data-theme` 属性 |
| 语言切换 | `fa-globe` | 选择型 | PC: 浮动卡片；手机: Bottom Sheet |
| 设置 | `fa-gear` | 预留 | 点击无操作或显示"即将推出" toast |

### 浮动卡片（PC端语言选择）

- 定位：`position: absolute; right: calc(100% + 12px)`，从 dock 左侧弹出
- 样式：同玻璃材质，`border-radius: 12px; padding: 10px 16px`
- 内容：语言列表，当前语言高亮（`background: rgba(79,195,247,0.2)`）
- 关闭：点击外部区域或选择语言后关闭

### Bottom Sheet（手机端）

- 定位：`position: fixed; bottom: 0; left: 0; right: 0`
- 最大高度：`40vh`
- 圆角：`16px 16px 0 0`
- 背景：`background: var(--glass-bg); backdrop-filter: blur(24px)`
- 遮罩：半透明遮罩层，点击关闭
- 动画：`transform: translateY(100%)` → `translateY(0)`，`transition: transform 0.3s ease`

### 状态持久化

- `localStorage` key `theme`：`'light'` | `'dark'`
- `localStorage` key `lang`：`'zh-CN'` | `'en'` | ...
- 组件 `onMount` 时读取恢复

## 2. 黑夜模式（Glassmorphism Dark）

### 切换机制

在 `<html>` 元素上设置 `data-theme="dark"` 属性。CSS 变量在 `[data-theme='dark']` 选择器下重新定义。

### 暗色变量集（新增于 css/base.css）

```css
[data-theme='dark'] {
  --bg: #0a0a1a;
  --bg-card: rgba(255, 255, 255, 0.06);
  --fg: #e8e8ec;
  --muted: #8888a0;
  --accent-yellow: #ffd700;
  --accent-red: #ff6b6b;
  --accent-blue: #4fc3f7;
  --shadow-offset: 0;
  --shadow-offset-sm: 0;
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
```

### 视觉风格转变规则

| 元素 | 亮色模式（当前） | 暗色模式 |
|------|----------------|---------|
| 阴影 | `10px 10px 0 var(--fg)` | `0 4px 24px rgba(0,0,0,0.4)` |
| 边框 | `4px solid var(--fg)` (纯黑) | `1px solid var(--glass-border)` (半透明白) |
| `.left-panel` | 奶油色实色背景 | `rgba(10,10,26,0.85); backdrop-filter: blur(24px)` |
| `.info-panel` | 暗色半透明+blur | 同上，毛玻璃加强 |
| `.social-link` hover | 重偏移阴影+填充 | `0 0 12px var(--custom-color)` 微弱发光 |
| `.avatar-box` | `10px 10px 0` 重阴影 | `0 0 20px rgba(255,215,0,0.15)` 金色光晕 |
| Noise overlay | 3% 不透明度 | 1.5% 不透明度 |

### 过渡

- `body`: `transition: background-color 0.3s, color 0.3s`
- 各组件已有的 `transition` 变量自动处理属性变化

### 系统偏好检测

- 页面加载时检查 `prefers-color-scheme: dark`，若用户无 `localStorage` 偏好则跟随系统
- 监听 `matchMedia('(prefers-color-scheme: dark)')` 变化事件

## 3. i18n 系统

### 数据层

**新增文件**：`src/data/i18n.ts`
- 导出 `translations` 翻译表（Record<Locale, Record<string, string>>）
- 导出 `Locale` 类型（联合类型，初始 `'zh-CN' | 'en'`）
- 导出 `TranslationKeys` 类型

**配置节**（新增于 `src/data/customize.ts`）：
```ts
i18n: {
  defaultLocale: 'zh-CN',
  locales: ['zh-CN', 'en']
}
```

**类型**（新增于 `src/types/site.ts`）：
```ts
interface I18nConfig {
  defaultLocale: Locale;
  locales: Locale[];
}
```

**Zod schema**（新增于 `src/data/schema.ts`）：
- `defaultLocale: z.string().min(1)`
- `locales: z.array(z.string().min(1)).min(1)`

### 运行时

**新增文件**：`src/lib/i18n.ts`
- `createI18n(config)`: 创建 i18n 上下文，返回 `{ locale, setLocale, t }`
- `locale()`: 响应式 signal，当前语言
- `setLocale(locale)`: 切换语言，同步写 `localStorage`
- `t(key)`: 查找 `translations[locale()][key]`，缺失时 fallback 到 defaultLocale，再缺失返回 key 本身

### 组件集成

| 组件 | 改动 |
|------|------|
| `HomepageApp.tsx` | 创建 i18n 上下文，传给子组件；渲染 `<ControlDock>` |
| `ClockPanel.tsx` | 用 `t()` 获取星期/月份文案（代替硬编码中文） |
| `TypewriterSlogan.tsx` | slogan 列表从 `t()` 获取 |
| `SocialLinks.tsx` | 链接名从 `t()` 获取 |
| `LoadingOverlay.tsx` | 加载文字从 `t()` 获取 |

### 时间格式化适配

`src/lib/time.ts` 中的 `WEEKDAYS`、`MONTHS` 等硬编码中文数组，需要根据 locale 切换：
- 英文：`['Sunday', 'Monday', ...]`、`['January', 'February', ...]`
- 中文：保持现有

### 扩展新语言

1. 在 `src/data/i18n.ts` 的 `translations` 中添加新 locale key 和翻译
2. 在 `src/types/site.ts` 的 `Locale` 联合类型中添加新成员
3. 在 `src/data/customize.ts` 的 `i18n.locales` 中添加
4. 在 `src/lib/time.ts` 中添加对应的时间格式化文案

## 4. 响应式与 Dock 位置

| 断点 | Dock 形态 | 面板展开方式 |
|------|----------|-------------|
| >900px | 竖向胶囊，右侧面板水平中心垂直居中 | 浮动卡片，从dock左侧弹出 |
| ≤900px | 横向胶囊，底部居中 (bottom: 20px) | Bottom Sheet，底部滑入+遮罩 |

CSS 实现使用 `flex-direction` 切换 + `@media (max-width: 900px)` 断点。

## 5. 新增文件清单

| 文件 | 用途 |
|------|------|
| `src/components/ControlDock.tsx` | Dock 组件 |
| `src/lib/i18n.ts` | i18n 运行时（signals + t()） |
| `src/data/i18n.ts` | 翻译表数据 |

## 6. 修改文件清单

| 文件 | 改动 |
|------|------|
| `src/types/site.ts` | 新增 `I18nConfig`、`Locale` 类型 |
| `src/data/schema.ts` | 新增 i18n Zod schema |
| `src/data/customize.ts` | 新增 i18n 配置节 |
| `src/data/site.ts` | re-export i18n 配置 |
| `src/components/HomepageApp.tsx` | 创建 i18n 上下文，渲染 ControlDock |
| `src/components/ClockPanel.tsx` | 使用 t() + locale-aware 时间格式化 |
| `src/components/TypewriterSlogan.tsx` | slogan 从 i18n 获取 |
| `src/components/SocialLinks.tsx` | 链接名从 i18n 获取 |
| `src/components/LoadingOverlay.tsx` | 加载文字从 i18n 获取（优先使用 i18n 翻译表的 `loading.N` key，fallback 到 config 中的 `loading.texts`） |
| `src/lib/time.ts` | locale-aware 星期/月份/日期格式化 |
| `css/base.css` | 新增 `[data-theme='dark']` 变量集 + glass 变量；调整 `--z-noise` 为 `10001` |
| `css/layout.css` | `.right-panel` 添加 `position: relative`（dock 定位锚点） |
| `css/components.css` | 新增 `.control-dock` 样式 + dark mode 覆盖 |
| `css/responsive.css` | Dock 响应式断点 + Bottom Sheet 样式；手机端 dock 切换为 `position: fixed` |

## 7. 不在范围

- 设置面板的具体功能（仅预留入口）
- 第三种及以上语言（仅框架支持，初始中英双语）
- 暗色模式下的壁纸适配（壁纸为外部图片，不处理）