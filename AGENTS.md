# AGENTS

## 项目结构

- Astro 6 静态站点 + Vue 3 (Composition API + `<script setup>`) + TypeScript + Pinia。入口：`src/pages/index.astro` → `src/layouts/BaseLayout.astro` → `src/components/HomepageApp.vue`
- 组件用 Vue 3 Composition API (`ref`/`computed`/`watch`/`onMounted`)，全部 `client:load` 客户端水合
- `src/pages/_app.ts`：Vue app 入口，注册 Pinia（Astro Vue 集成约定文件）
- `src/data/customize.ts` 导出 `editableSiteConfig`，日常改内容只改这里
- `src/data/site.ts` 导入并 Zod 校验后导出 `siteConfig`，组件统一消费
- `src/types/site.ts` 定义全部 TS 接口，与 `src/data/schema.ts` 必须同步
- `src/data/i18n.ts` 导出翻译字符串（zh-CN/en/ja，各 37 个 key）和 `Locale` 类型
- `src/lib/`：`logger.ts`、`time.ts`、`slogan-selector.ts`、`dock.ts`、`wallpaper-scroller.ts`、`runtime-effects.ts`（内容保护/滚动动画/移动端粘性头像，原 `useEffects` composable 迁移而来）、`i18n.ts`（主题/i18n 纯函数：`getStoredLang`/`getStoredTheme`/`applyTheme`/`persistLang`）、`page-shell-context.ts`（跨页面壳状态读取/派发，配合 `page-shell` store）
- `src/composables/`：`useTheme.ts`、`useI18n.ts`、`useSlogan.ts`、`useTime.ts`（已删除 `useHomepage`/`useWallpaper`/`useLogger`/`useDock`/`useEffects`，逻辑并入 `lib/` 与 `SiteShell.vue`）
- `src/stores/`（Pinia）：`theme.ts`、`i18n.ts`、`page-shell.ts`（跨页面壳状态：`title`/`mode`/`isHomePage`/`scrollProgress`，替代原 `homepage.ts`）
- `src/scripts/`：`copy-code.ts`（文章页代码块复制按钮，监听 `astro:page-load` 重新装饰）
- CSS 层叠顺序（`BaseLayout.astro` import 顺序）：`base.css` → `layout.css` → `transitions.css` → `components.css` → `responsive.css` → `dock.css` → `topbar.css` → `footer.css` → `article.css`
- `base.css` 定义字体 token：`--font-serif`、`--font-ui`、`--font-mono`、`--font-display`（=serif）、`--font-sans`（=ui）；已移除 `--bg-card`/`--border-heavy`/`--shadow-offset`/`--shadow-offset-sm`，卡片统一用 `--panel-glass`/`--panel-border`/`--panel-shadow`/`--panel-blur`/`--glass-*`
- 路由：`/`（首页）、`/posts`（博客列表）、`/posts/[...slug]`（文章页）、`/404`
- 博客内容在 `src/content/blog/`，用 `import.meta.glob` 加载 markdown，支持 draft 过滤

## 命令

- `npm run dev` 开发 / `npm run build` 构建到 `dist/` / `npm run serve` 预览
- `npm run lint`  / `npm run lint:fix` / `npm run format:check` / `npm run format`
- `npm run check` (astro check) / `npm test` (Vitest)
- 验证链路：`lint → format:check → test → check → build`，CI 参考 `.github/workflows/ci.yml`

## 构建 & 部署

- 纯静态输出到 `dist/`，Cloudflare Pages 部署，`dist/` 已 gitignore
- Vue 组件打包为 ESM，Astro devToolbar 已禁用
- 使用 Astro 内置 `ClientRouter`（`astro:transitions`）实现页面过渡（已移除 `@swup/astro` 依赖）
- Markdown 用 Shiki 双主题高亮（`github-light`/`github-dark`），`rehype-slug` + `rehype-autolink-headings` 给标题加锚点

## 代码规范

- ESLint：`no-var`、`eqeqeq`、`no-trailing-spaces`、强制分号、`@typescript-eslint/recommended`、`eslint-plugin-vue`
- Prettier：4空格缩进、单引号、分号、`printWidth: 120`、`trailingComma: "none"`
- Astro 文件用 `prettier-plugin-astro`，Vue 文件用 `@vue/eslint-config-prettier`

## 配置链路

- `customize.ts`(改这里) → `site.ts`(Zod 校验) → 组件消费
- 新增配置字段：同步改 `types/site.ts`、`schema.ts`、`customize.ts`
- 新增语言：改 `i18n.ts` 翻译、`customize.ts` 的 `locales` 数组、`types/site.ts` 的 `Locale` 类型
- 博客文章 frontmatter 新增字段：同步改 `src/pages/posts/index.astro` 的 `MarkdownModule` 接口（无 Zod 校验）

## 组件一览

- `HomepageApp.vue`：首页第二屏内容容器（静态占位结构，后续放最新文章/卡片/媒体）
- `PostCard.vue`：博客列表卡片组件，支持 `coverLayout` 的 overlay/below 两种布局，内部管理滚动淡入动画
- `SiteShell.vue`：跨页面持久壳（`transition:persist`），渲染噪点叠层、hero 区（头像/名字/状态/打字机/社交链接，按 `page-shell` 的 `mode` 切换 home/blog/article 布局）、TopBar；内部驱动壁纸加载、滚动监听（写入 `scrollProgress`）、滚动动画、移动端粘性头像、内容保护
- `TopBar.vue`：桌面顶部导航栏，滚动时从偏移位置展开为全宽，包含 Dock 图标（放大悬停效果）、主题切换、语言弹窗
- `SocialLinks.vue`：社交按钮，分页（>6个时滑动切换），用 pointer 事件 + `.is-hovered` 类控制悬停
- `TypewriterSlogan.vue`：打字机效果，`requestAnimationFrame` 驱动
- `Icon.vue`：内联 SVG 图标组件，映射 Font Awesome 类名到内置 SVG path
- `Footer.vue`：页脚，双栏网格（链接 + 社交图标）

（已删除：`MobileDockSidebar.vue`、`ClockPanel.vue` 及其相关 composable/store）

## 运行时注意

- 组件服务端渲染为静态 HTML，交互在 JS 加载后激活
- 壁纸依赖外部 API (`wallpaper.apis`)，多 API 竞速加载 + 指数退避重试，加载失败不影响核心功能
- 图标改为 `Icon.vue` 内联 SVG，`public/fa/` 保留为遗留资源
- Google Fonts 用 `rel="preload"` + `onload` 切换，`<noscript>` 兜底
- 主题在内联 `<head>` 脚本中提前应用防闪烁，`<html data-theme>` 驱动所有颜色
- `useTheme` composable + `theme` store 提供响应式主题状态，支持 View Transition API 切换
- `useI18n` composable + `i18n` store 提供响应式 i18n（Pinia 驱动的 `t()` 函数）
