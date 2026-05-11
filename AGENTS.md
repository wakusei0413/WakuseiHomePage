# AGENTS

## 项目结构

- Astro 6 静态站点 + Vue 3 (Composition API + `<script setup>`) + TypeScript + Pinia。入口：`src/pages/index.astro` → `src/layouts/BaseLayout.astro` → `src/components/HomepageApp.vue`
- 组件用 Vue 3 Composition API (`ref`/`computed`/`watch`/`onMounted`)，全部 `client:load` 客户端水合
- `src/data/customize.ts` 导出 `editableSiteConfig`，日常改内容只改这里
- `src/data/site.ts` 导入并 Zod 校验后导出 `siteConfig`，组件统一消费
- `src/types/site.ts` 定义全部 TS 接口，与 `src/data/schema.ts` 必须同步
- `src/data/i18n.ts` 导出翻译字符串（zh-CN/en/ja，各 37 个 key）和 `Locale` 类型
- `src/lib/`：`logger.ts`、`time.ts`、`slogan-selector.ts`、`dock.ts`、`wallpaper-scroller.ts`
- `src/composables/`：`useTheme.ts`、`useI18n.ts`、`useHomepage.ts`、`useWallpaper.ts`、`useSlogan.ts`、`useTime.ts`、`useLogger.ts`、`useDock.ts`、`useEffects.ts`
- `src/stores/`（Pinia）：`theme.ts`、`i18n.ts`、`homepage.ts`
- CSS 层叠顺序：`src/styles/base.css` → `layout.css` → `components.css` → `responsive.css` → `dock.css` → `topbar.css` → `footer.css` → `transitions.css`（根目录 `css/` 为 shim，仅 `@import` 转发）
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
- 使用 `@swup/astro` + 多个 swup 插件实现页面过渡

## 代码规范

- ESLint：`no-var`、`eqeqeq`、`no-trailing-spaces`、强制分号、`@typescript-eslint/recommended`、`eslint-plugin-vue`
- Prettier：4空格缩进、单引号、分号、`printWidth: 120`、`trailingComma: "none"`
- Astro 文件用 `prettier-plugin-astro`，Vue 文件用 `@vue/eslint-config-prettier`

## 配置链路

- `customize.ts`(改这里) → `site.ts`(Zod 校验) → 组件消费
- 新增配置字段：同步改 `types/site.ts`、`schema.ts`、`customize.ts`
- 新增语言：改 `i18n.ts` 翻译、`customize.ts` 的 `locales` 数组、`types/site.ts` 的 `Locale` 类型

## 组件一览

- `HomepageApp.vue`：顶层容器，挂载壁纸滚动、3D 视差效果、内容保护、滚动动画、移动端头像粘性效果
- `SiteShell.vue`：跨页面持久壳（`transition:persist`），渲染噪点叠层、TopBar、Footer、MobileDockSidebar
- `TopBar.vue`：桌面顶部导航栏，滚动时从偏移位置展开为全宽，包含 Dock 图标（放大悬停效果）、主题切换、语言弹窗
- `MobileDockSidebar.vue`：移动端侧边栏（窄屏点头像触发），镜像 Dock 功能 + 语言子菜单
- `SocialLinks.vue`：社交按钮，分页（>6个时滑动切换），用 pointer 事件 + `.is-hovered` 类控制悬停
- `TypewriterSlogan.vue`：打字机效果，`requestAnimationFrame` 驱动
- `ClockPanel.vue`：右侧时间面板，locale 感知格式化
- `Icon.vue`：内联 SVG 图标组件，映射 Font Awesome 类名到内置 SVG path
- `Footer.vue`：页脚，双栏网格（链接 + 社交图标）

## 运行时注意

- 组件服务端渲染为静态 HTML，交互在 JS 加载后激活
- 壁纸依赖外部 API (`wallpaper.apis`)，多 API 竞速加载 + 指数退避重试，加载失败不影响核心功能
- 图标改为 `Icon.vue` 内联 SVG，`public/fa/` 保留为遗留资源
- Google Fonts 用 `rel="preload"` + `onload` 切换，`<noscript>` 兜底
- 主题在内联 `<head>` 脚本中提前应用防闪烁，`<html data-theme>` 驱动所有颜色
- `useTheme` composable + `theme` store 提供响应式主题状态，支持 View Transition API 切换
- `useI18n` composable + `i18n` store 提供响应式 i18n（Pinia 驱动的 `t()` 函数）
