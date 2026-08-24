# 架构

## 页面入口

每个页面都经过 `BaseLayout.astro` → slot 内容。`BaseLayout` 负责 CSS 导入、SEO、主题 FOUC 脚本、`ClientRouter`。

## 常驻 Shell

- `SiteShell` + `Footer` 通过 `#pageScroller` 里的 `transition:persist` 常驻。
- Shell 模式是 **props 驱动**，不做路径推断：给 `BaseLayout` 传 `shellMode` + `shellTitle`（`home` | `blog` | `article` | `error`）。

## Pinia

- 入口：`src/pages/_app.ts`（Vue `appEntrypoint`）。
- Stores：`theme`、`i18n`、`page-shell`、`search`。

## 跨页面 Shell 状态

- `page-shell` store + `src/lib/page-shell-context.ts` + `#pageTransitionSurface` 上的 `data-shell-mode` / `data-page-title`。
- `navigation-runtime.ts` 在交换（swap）前分发传入的状态；常驻的 `SiteShell` 在交换后也会重新读取载体。

## Islands

- 默认 **`client:idle`**；只有首屏交互确实依赖同步水合的地方才用 **`client:load`**（搜索路径）。文章目录使用带 500ms 上限的 `client:idle`，阅读控制使用普通 `client:idle`，避免两者阻塞跨页交换。
- 拿不准时跟邻居保持一致。

## 站内导航

- 用 `astro:transitions/client` 的 `navigate`（不做整页刷新）。
- **不要重新引入 `@swup/astro`。**

## 客户端安全助手

每个关注点只有一个负责人——复用它们，别把逻辑复制进组件或脚本：

| 关注点 | 负责人 |
|---------|-------|
| 点击策略 | `lib/navigation-click.ts` |
| 锚点导航 | `lib/section-nav.ts` |
| 剪贴板回退 | `lib/clipboard.ts` |
| 混合脚本文本切分 | `lib/text.ts` |

## 文章 DOM 增强

- `src/scripts/*`：代码复制、标题链接、灯箱、阅读进度、回到顶部——由 `article-runtime.ts` 统一接入，在 `astro:page-load` 时重新绑定。
- 复制功能必须用 `lib/clipboard.ts`。

## 动态时钟

- 文本由 SSR 渲染，挂载后更新。
- `data-allow-mismatch="text"` 只作用在时钟文本上，而不是屏蔽整个 island 的水合。
