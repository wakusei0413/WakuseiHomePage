# Svelte 5 → Vue 3 全量迁移设计文档

**日期**: 2026-05-11
**状态**: 已批准
**策略**: 全量重写（方案 C）

## 背景

项目 WakuseiHomePage 当前使用 Astro 6 + Svelte 5 (runes) + TypeScript。用户决定迁移至 Vue 3，原因：
1. Vue 社区更大，后续维护/招聘更容易
2. Svelte 5 runes (`$state/$derived/$effect`) 用起来不习惯
3. 需要 Vue 生态的库（如 Pinia、VueUse 等）

## 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| Vue API 风格 | Composition API + `<script setup>` | Vue 官方推荐，TypeScript 友好，逻辑复用好 |
| 状态管理 | Pinia | 结构化全局状态管理 |
| 测试框架 | Vitest + @vue/test-utils | Vue 生态标配，与 Vite 深度集成 |
| 迁移策略 | 全量重写 | 趁机用 Vue 思维重新设计组件和数据流 |
| CSS 策略 | 完全不动 | 2900 行 CSS 已验证，无需改动 |
| 数据层 | 完全不动 | customize.ts/site.ts/schema.ts/i18n.ts 保持不变 |

## 目标目录结构

```
src/
├── components/          # Vue SFC (.vue) — 9 个组件
│   ├── HomepageApp.vue
│   ├── SiteShell.vue
│   ├── TopBar.vue
│   ├── MobileDockSidebar.vue
│   ├── SocialLinks.vue
│   ├── TypewriterSlogan.vue
│   ├── ClockPanel.vue
│   ├── Icon.vue
│   └── Footer.vue
├── composables/         # Vue composables — 9 个
│   ├── useTheme.ts
│   ├── useI18n.ts
│   ├── useHomepage.ts
│   ├── useWallpaper.ts
│   ├── useSlogan.ts
│   ├── useTime.ts
│   ├── useLogger.ts
│   ├── useDock.ts
│   └── useEffects.ts
├── stores/              # Pinia stores — 3 个
│   ├── theme.ts
│   ├── i18n.ts
│   └── homepage.ts
├── lib/                 # 纯工具函数（保持不变）
│   ├── time.ts
│   ├── slogan-selector.ts
│   ├── wallpaper-scroller.ts
│   ├── dock.ts
│   └── logger.ts
├── data/                # 配置 + i18n 数据（保持不变）
│   ├── customize.ts
│   ├── site.ts
│   ├── schema.ts
│   └── i18n.ts
├── types/               # 类型定义（保持不变）
│   └── site.ts
├── styles/              # CSS（保持不变）
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── responsive.css
│   ├── dock.css
│   ├── topbar.css
│   ├── footer.css
│   └── transitions.css
├── pages/               # Astro 页面（改为引入 .vue）
│   ├── index.astro
│   ├── 404.astro
│   └── posts/
│       ├── index.astro
│       └── [...slug].astro
├── layouts/
│   └── BaseLayout.astro
├── content/
│   └── blog/            # 博客内容（保持不变）
├── pages/_app.ts        # Vue app 入口（注册 Pinia）
└── env.d.ts             # 添加 *.vue 模块声明
```

## Pinia Stores 设计

### stores/theme.ts

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCurrentTheme, applyTheme, getSystemTheme } from '@/lib/i18n'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(getCurrentTheme() === 'dark')

  function toggle() {
    const newTheme = isDark.value ? 'light' : 'dark'
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        applyTheme(newTheme)
        isDark.value = newTheme === 'dark'
      })
    } else {
      applyTheme(newTheme)
      isDark.value = newTheme === 'dark'
    }
  }

  function syncFromStorage() {
    const theme = getCurrentTheme()
    isDark.value = theme === 'dark'
  }

  // 监听系统主题变化
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => syncFromStorage())
  }

  return { isDark, toggle, syncFromStorage }
})
```

### stores/i18n.ts

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Locale } from '@/types/site'
import { translations } from '@/data/i18n'
import { siteConfig } from '@/data/site'
import { getStoredLang, persistLang } from '@/lib/i18n'

export const useI18nStore = defineStore('i18n', () => {
  const locale = ref<Locale>(getStoredLang(siteConfig) || siteConfig.i18n.defaultLocale)

  function t(key: string): string {
    const dict = translations[locale.value] || translations[siteConfig.i18n.defaultLocale]
    return dict[key] ?? key
  }

  function setLocale(lang: Locale) {
    locale.value = lang
    persistLang(lang)
  }

  return { locale, t, setLocale }
})
```

### stores/homepage.ts

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useHomepageStore = defineStore('homepage', () => {
  const isReady = ref(false)
  const isHomePage = ref(false)

  function setReady() {
    isReady.value = true
    window.dispatchEvent(new CustomEvent('wakusei:homepage-ready'))
  }

  function checkHomePage() {
    isHomePage.value = !!document.querySelector('.page-scroller')
  }

  function subscribeStateChange(callback: (isHome: boolean) => void) {
    const handler = () => {
      checkHomePage()
      callback(isHomePage.value)
    }
    window.addEventListener('wakusei:homepage-mounted', handler)
    window.addEventListener('astro:after-swap', handler)
    return () => {
      window.removeEventListener('wakusei:homepage-mounted', handler)
      window.removeEventListener('astro:after-swap', handler)
    }
  }

  return { isReady, isHomePage, setReady, checkHomePage, subscribeStateChange }
})
```

## Composables 设计

### useTheme.ts
- 初始化：读取当前主题，附加 media query 监听
- 代理 `useThemeStore()` 的 `isDark` 和 `toggle()`

### useI18n.ts
- 暴露 `t(key)` 和 `locale`
- 代理 `useI18nStore()`

### useHomepage.ts
- 检测当前页面是否首页
- 监听 `wakusei:homepage-mounted` 和 `astro:after-swap` 事件
- 代理 `useHomepageStore()`

### useWallpaper.ts
- `onMounted` 创建 `WallpaperScrollerController`
- 管理壁纸竞速加载、无限滚动、重试
- `onUnmounted` 清理
- 暴露 `wallpaperRef` (template ref) 和 `ready` 状态

### useSlogan.ts
- 接收配置参数
- `onMounted` 启动 rAF 打字循环
- `onUnmounted` 清理 rAF
- 暴露 `displayText`、`cursorVisible`

### useTime.ts
- `onMounted` 启动 `setInterval`
- `onUnmounted` 清理定时器
- 暴露 `timeString`、`weekday`、`dateDisplay`

### useLogger.ts
- 接收 `enabled` 参数
- 返回 `{ log, warn, error }` 函数

### useEffects.ts
- `initScrollReveal(delay, offset)` — IntersectionObserver 滚动动画
- `initContentProtection(enabled)` — 右键/复制/拖拽保护
- `initMobileStickyAvatar(container, avatarBox)` — 移动端头像粘性

### useDock.ts
- `resolveDockLabel(display, translate)` — 解析 i18n 标签
- `resolveDockIcon(display, active)` — 解析图标
- `getDockItemActiveState(item, context)` — 主题/面板激活状态
- 注意：这些是纯函数，可直接从 `lib/dock.ts` import，不一定需要 composable 封装

## 组件设计

### HomepageApp.vue
- 顶层容器，挂载壁纸、3D 视差、内容保护、滚动动画
- 使用 `useWallpaper()`、`useEffects()`、`useHomepageStore()`
- `onMounted` 初始化所有效果
- 暴露 `wakusei:homepage-ready` 事件

### SiteShell.vue
- `transition:persist="site-shell"` 保持跨页面持久
- 渲染噪点叠层、TopBar、Footer、MobileDockSidebar
- 使用 `useHomepageStore()` 订阅状态变化

### TopBar.vue
- 桌面顶部导航栏
- 滚动展开：从 `useWindowScroll()` 或 `@scroll` 事件获取进度
- `computed` 推导 `barStyle`、`leftStyle`、`rightStyle`
- Dock 图标放大悬停：`@mousemove` 距离计算
- 语言弹窗：`v-if` + `@click.outside`
- 移动端：头像点击触发 `open-mobile-menu` 事件

### MobileDockSidebar.vue
- 移动端侧边栏
- 监听 `wakusei:open-mobile-menu` 自定义事件
- 语言子菜单：`v-model` accordion
- `@click.outside` 关闭

### SocialLinks.vue
- 分页社交按钮
- `ref(currentPage)` + `computed(paginatedLinks)`
- `@pointerenter`/`@pointerleave` 控制 `.is-hovered` class
- 分页指示器（>6 个链接时）

### TypewriterSlogan.vue
- `requestAnimationFrame` 驱动打字/删除循环
- `onMounted` 启动，`onUnmounted` 清理
- 暴露 `displayText`、`cursorVisible` 到模板

### ClockPanel.vue
- `setInterval` 更新时间
- `computed` 格式化（12h/24h、weekday、date）
- 使用 `useI18nStore()` 获取 locale

### Icon.vue
- Props: `name: string`
- 内联 SVG path 映射
- `<svg>` + `fill="currentColor"`

### Footer.vue
- 纯展示组件
- 消费 `siteConfig.footer`
- 双栏网格：链接 + 社交图标

## 测试策略

### 框架迁移
- Node test runner + tsx → Vitest + @vue/test-utils + jsdom
- `package.json` scripts.test: `"vitest run"`

### 测试分类

| 类型 | 文件 | 工具 |
|------|------|------|
| 纯逻辑 | `time.test.ts`、`slogan-selector.test.ts`、`dock.test.ts` | Vitest 直接 import |
| 配置校验 | `site-config.test.ts`、`i18n-data.test.ts`、`i18n-config.test.ts` | Vitest + Zod |
| Composables | `useTheme.test.ts`、`useI18n.test.ts`、`useTime.test.ts` | Vitest |
| 组件 | `TopBar.test.ts`、`SocialLinks.test.ts`、`Footer.test.ts` 等 | Vitest + @vue/test-utils mount |
| 样式 | `dock-styles.test.ts`、`social-link-styles.test.ts` | Vitest + jsdom |
| 壁纸 | `wallpaper-scroller.test.ts`、`wallpaper-full-bleed.test.ts` | Vitest |

### 新增配置文件
- `vitest.config.ts` — 从 astro.config.mjs 读取别名

## 依赖变更

### 移除
```
@astrojs/svelte
svelte
svelte.config.js
prettier-plugin-svelte
eslint-plugin-svelte
```

### 新增
```
vue                   ^3.5
@astrojs/vue          ^6.0
pinia                 ^3.0
vitest                ^3.x
@vue/test-utils       ^2.x
jsdom                 ^26.x
prettier-plugin-vue   (或 eslint-plugin-vue)
```

### 修改的文件
| 文件 | 变更 |
|------|------|
| `astro.config.mjs` | `svelte()` → `vue({ appEntrypoint: '/src/pages/_app' })` |
| `package.json` | 依赖替换，scripts.test 改为 `vitest run` |
| `.eslintrc.json` | 移除 svelte parser，添加 vue plugin |
| `.prettierrc` | 移除 svelte plugin，添加 vue plugin |
| `tsconfig.json` | 添加 Vue 类型声明 |
| `src/env.d.ts` | 添加 `*.vue` 模块声明 |

### 新增文件
| 文件 | 内容 |
|------|------|
| `src/pages/_app.ts` | Vue app 入口，注册 Pinia |
| `vitest.config.ts` | Vitest 配置 |
| `src/stores/theme.ts` | 主题 store |
| `src/stores/i18n.ts` | 国际化 store |
| `src/stores/homepage.ts` | 首页状态 store |
| `src/composables/useTheme.ts` | 主题 composable |
| `src/composables/useI18n.ts` | 国际化 composable |
| `src/composables/useHomepage.ts` | 首页检测 composable |
| `src/composables/useWallpaper.ts` | 壁纸 composable |
| `src/composables/useSlogan.ts` | 打字机 composable |
| `src/composables/useTime.ts` | 时钟 composable |
| `src/composables/useLogger.ts` | 日志 composable |
| `src/composables/useDock.ts` | Dock 工具 composable |
| `src/composables/useEffects.ts` | 效果 composable |

### 删除的文件
| 文件 | 原因 |
|------|------|
| `svelte.config.js` | 不再需要 |
| `src/components/*.svelte` | 替换为 .vue |
| `src/lib/i18n.svelte.ts` | 替换为 stores/i18n.ts + composables/useI18n.ts |
| `src/lib/theme.svelte.ts` | 替换为 stores/theme.ts + composables/useTheme.ts |
| `src/lib/homepage-context.ts` | 替换为 stores/homepage.ts + composables/useHomepage.ts |
| `src/lib/font-awesome.ts` | 已废弃 |
| `src/lib/runtime-effects.ts` | 替换为 composables/useEffects.ts |

### 不变的文件
- `src/data/customize.ts`、`site.ts`、`schema.ts`、`i18n.ts`
- `src/types/site.ts`
- `src/styles/` 全部 8 个 CSS 文件
- `src/lib/time.ts`、`slogan-selector.ts`、`wallpaper-scroller.ts`、`dock.ts`、`logger.ts`
- `public/` 静态资源
- `src/content/blog/` 博客内容
- `src/pages/` Astro 页面（模板不变，引入的组件从 .svelte 改为 .vue）
- `src/layouts/BaseLayout.astro`（同上）

## Astro 集成

### astro.config.mjs
```javascript
import { defineConfig } from 'astro/config'
import vue from '@astrojs/vue'

export default defineConfig({
  site: 'https://www.wakusei.top',
  integrations: [
    vue({
      appEntrypoint: '/src/pages/_app',
      devtools: true
    })
  ],
  output: 'static',
  outDir: './dist',
  devToolbar: { enabled: false }
})
```

### src/pages/_app.ts
```typescript
import type { App } from 'vue'
import { createPinia } from 'pinia'

const pinia = createPinia()

export default (app: App) => {
  app.use(pinia)
}
```

### Astro 页面中的组件引用
```astro
---
import HomepageApp from '../components/HomepageApp.vue'
---
<HomepageApp client:load />
```

## swup 页面过渡

`@swup/astro` 是 Astro 层面的集成，与 UI 框架无关。保持不变：
- `@swup/astro` + 插件继续工作
- `transition:persist` 在 Astro 组件中使用
- Vue 组件内部不需要关心页面过渡

## 迁移顺序

建议按以下顺序执行（详见实施计划）：

1. **基础设施**：安装依赖、配置 astro/vue/vitest、创建 _app.ts
2. **Stores**：创建 3 个 Pinia stores
3. **Composables**：创建 9 个 composables
4. **简单组件**：Icon → Footer → ClockPanel → TypewriterSlogan
5. **核心组件**：SocialLinks → MobileDockSidebar → TopBar
6. **顶层组件**：SiteShell → HomepageApp
7. **页面更新**：更新 Astro 页面引入方式
8. **测试迁移**：所有 18 个测试文件迁移到 Vitest
9. **清理**：删除 Svelte 文件、更新配置、更新文档
10. **验证**：lint → format:check → test → check → build
