# 架构设计 (Architecture)

## 页面入口与生命周期

每个页面路由均经过 `BaseLayout.astro` 注入通用槽位。`BaseLayout` 负责：
1. 全局 CSS 导入顺序管控（决定浏览器层叠样式优先级）。
2. SEO 与 OpenGraph 元标签注入。
3. 主题防闪烁内联脚本（在 HTML 渲染前读取 `localStorage.theme`）。
4. Astro 7 原生 `ClientRouter`（View Transitions）注入。

## 常驻 Shell (Persistent Shell)

- `SiteShell` 与 `Footer` 通过 `#pageScroller` 容器上的 `transition:persist` 属性实现跨页面常驻，页面跳转时组件实例不销毁，壁纸与播放状态不中断。
- Shell 模式为 **props 驱动**，不做脆弱的 URL 路径推断：由各页面向 `BaseLayout` 传递明确的 `shellMode` + `shellTitle`（`home` | `blog` | `article` | `error`）。

## Pinia 与 Vue 运行时单例保障

- **入口**：`src/pages/_app.ts`（Astro Vue `appEntrypoint`），统一注册 Pinia。
- **核心 Stores**：`theme`（主题）、`i18n`（国际化）、`page-shell`（跨页壳状态）、`search`（搜索状态）。
- **Vue 单例去重机制**：
  - Astro 在页面中混合使用多个 Vue island 时，各 island 默认可能打包独立的 Vue 运行时副本，导致 Pinia 上下文脱钩与控制台告警。
  - 本项目在 `astro.config.mjs` 中将 `@astrojs/vue/client.js` 重定向到 `src/lib/astro-vue-client.ts`，并使用 Vite `dedupe` 强制统一 Vue 与 Pinia 的运行时包引用，彻底保障了多 island 间的单例状态同步。

## 跨页面 Shell 状态分发

- 数据流：`page-shell` store + `src/lib/page-shell-context.ts` + `#pageTransitionSurface` 容器上的 `data-shell-mode` 与 `data-page-title` 属性。
- `navigation-runtime.ts` 在 View Transitions 页面交换（`astro:before-swap`）前分发即将进入的页面状态；常驻的 `SiteShell` 在交换后重新校验并同步状态。

## Islands 水合策略

- 默认采用 **`client:idle`**：避免主线程阻塞。
- 仅当首屏交互必须立即就绪时才使用 **`client:load`**（如搜索弹窗挂载）。
- 文章目录（TOC）使用带 500ms 超时的 `client:idle`，阅读控制面板使用普通 `client:idle`，确保跨页切页时不被大组件水合拖慢。

## 站内导航

- 采用 Astro 7 原生 `astro:transitions/client` 的 `navigate` 方法，禁止整页硬刷新。
- **严禁重新引入 `@swup/astro`**。

## 客户端安全助手

各业务关注点遵循单一职责原则，严禁在不同组件内重复编写：

| 关注点 | 模块路径 | 职责 |
|---|---|---|
| 点击行为判定 | `src/lib/navigation-click.ts` | 识别同源站内链接、外链、锚点与功能按钮 |
| 锚点导航滚动 | `src/lib/section-nav.ts` | 首页 `#posts` 平滑滚动定位 |
| 剪贴板兼容回退 | `src/lib/clipboard.ts` | 现代 Clipboard API 与 `document.execCommand` 智能回退 |
| 混合文本分段 | `src/lib/text.ts` | 中西文、数字混排时的优雅折行与间隙处理 |

## 文章 DOM 增强与阅读控制

- 由 `src/scripts/article-runtime.ts` 集中管理文章页面的功能挂载与生命周期绑定：
  - 代码一键复制与语言标牌。
  - 标题链接锚点与 TOC 目录高亮联动。
  - 图片画廊灯箱（Lightbox）缩放预览。
  - 顶部细致阅读进度条与回到顶部按钮。
  - 浮动阅读控制弹出层（字号调节、版面宽度自适应调节、沉浸阅读模式）。
- 所有事件监听均在 `astro:page-load` 时重新绑定，并在页面离开前规范清理。

## 首屏直出与动效平滑接管

- 首页标语及核心组件采用 `html.is-entering` 错峰入场机制，首屏在浏览器首帧即可见，无需等待 Vue 水合完毕。
- 壁纸缩放采用 Web Animations API（`src/scripts/wallpaper-scroller.ts`），切换页面或更换图片时新图无缝接管旧图的缩放相位，杜绝画面突兀跳变。

## Cloudflare Pages 生产部署防护

- 在 `astro.config.mjs` 中配置了专用 Vite 插件，为构建输出的内嵌脚本添加 `data-cfasync="false"` 属性，有效绕过 Cloudflare Rocket Loader 对脚本执行顺序的破坏，确保 View Transitions 正常工作。
