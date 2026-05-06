# AGENTS

## 项目结构

- Astro 5 静态站点 + SolidJS + TypeScript。入口：`src/pages/index.astro` → `src/layouts/BaseLayout.astro` → `src/components/HomepageApp.tsx`
- 组件用 SolidJS 响应式 (`createSignal/onMount/onCleanup`)，全部 `client:load` 客户端水合
- `src/data/customize.ts` 导出 `editableSiteConfig`，日常改内容只改这里
- `src/data/site.ts` 导入并 Zod 校验后导出 `siteConfig`，组件统一消费
- `src/types/site.ts` 定义全部 TS 接口，与 `src/data/schema.ts` 必须同步
- `src/data/i18n.ts` 导出翻译字符串和 `Locale` 类型
- `src/lib/`：`logger.ts`、`time.ts`、`slogan-selector.ts`、`font-awesome.ts`、`i18n.ts`、`runtime-effects.ts`、`wallpaper-scroller.ts`
- CSS 层叠顺序：`css/base.css` → `layout.css` → `components.css` → `responsive.css` → `src/styles/dock.css`
- 首页外所有路由回退到 `src/pages/404.astro`，仅现代浏览器

## 命令

- `npm run dev` 开发 / `npm run build` 构建到 `dist/` / `npm run serve` 预览
- `npm run lint`  / `npm run lint:fix` / `npm run format:check` / `npm run format`
- `npm run check` (astro check) / `npm test` (Node 内置 test + tsx)
- 验证链路：`lint → format:check → test → build`，CI 参考 `.github/workflows/ci.yml`

## 构建 & 部署

- 纯静态输出到 `dist/`，Cloudflare Pages 部署，`dist/` 已 gitignore
- SolidJS 组件打包为 ESM，Astro devToolbar 已禁用

## 代码规范

- ESLint：`no-var`、`eqeqeq`、`no-trailing-spaces`、强制分号、`@typescript-eslint/recommended`
- Prettier：4空格缩进、单引号、分号、`printWidth: 120`、`trailingComma: "none"`
- Astro 文件用 `prettier-plugin-astro`

## 配置链路

- `customize.ts`(改这里) → `site.ts`(Zod 校验) → 组件消费
- 新增配置字段：同步改 `types/site.ts`、`schema.ts`、`customize.ts`
- 新增语言：改 `i18n.ts` 翻译、`customize.ts` 的 `locales` 数组、`types/site.ts` 的 `Locale` 类型

## 组件一览

- `HomepageApp.tsx`：顶层容器，挂载壁纸滚动、i18n、内容保护、滚动动画
- `NavigationDock.tsx`：桌面底部 Dock，图标放大悬停效果，处理主题切换和语言弹窗
- `MobileDockSidebar.tsx`：移动端侧边栏（窄屏点头像触发），镜像 Dock 功能 + 语言子菜单
- `SocialLinks.tsx`：社交按钮，用 pointer 事件 + `.is-hovered` 类控制悬停（非 CSS :hover）
- `TypewriterSlogan.tsx`：打字机效果
- `ClockPanel.tsx`：右侧时间面板
- `LoadingOverlay.tsx`：加载遮罩 + 轮播文案 + 进度条

## 运行时注意

- 组件服务端渲染为静态 HTML，交互在 JS 加载后激活
- 壁纸依赖外部 API (`wallpaper.apis`)，加载失败不影响核心功能
- Font Awesome 通过 `requestIdleCallback` 延迟加载(5s 超时)
- Google Fonts 用 `rel="preload"` + `onload` 切换，`<noscript>` 兜底
- 主题在内联 `<head>` 脚本中提前应用防闪烁，`<html data-theme>` 驱动所有颜色