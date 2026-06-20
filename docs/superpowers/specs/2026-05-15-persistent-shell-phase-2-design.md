# Persistent Shell Phase 2 Design

## 目标

Phase 2 将文章页 `/posts/[...slug]` 和 404 页迁移到 Phase 1 建立的持久公共壳架构。迁移完成后，全站所有页面共享同一个 `page-scroller` 滚动上下文、同一个 SiteShell、同一个 Footer。`PageFrame.vue` 被删除。同时清理旧兼容代码：删除 `legacy` 模式、删除 `isShellPage` 字段、删除 `useHomepage` / `homepage-context` / `homepage` store、删除 `-webkit-` CSS 前缀。

## 前提

Phase 1 已完成：
- `page-scroller` 包含 SiteShell + pageTransitionSurface + Footer
- SiteShell 渲染 hero / 左面板 / TopBar / 噪点叠层
- `ShellMode = 'home' | 'blog' | 'legacy'`
- 文章页和 404 使用 `mode: 'legacy'`，BaseLayout 有条件分支

## ShellMode 重构

`ShellMode` 从 `'home' | 'blog' | 'legacy'` 改为 `'home' | 'blog' | 'article' | 'error'`：

| 模式 | 路由 | 左面板渲染 |
|------|------|------------|
| `home` | `/` | 头像 → 名字 → 状态 → slogan → 社交链接 |
| `blog` | `/posts` | 标题“博客” |
| `article` | `/posts/[...slug]` | 文章标题（来自 frontmatter） |
| `error` | `/404` | 无可见内容（hero 区域仅显示壁纸 + TopBar） |

`legacy` 模式被完全移除。`isShellPage` 字段被完全移除（所有页面都是 shell 页面，该字段恒为 `true` 无存在必要）。

## BaseLayout 简化

移除 `isShellPage` 条件分支和 `isShellPage` 计算。所有页面统一使用 `page-scroller` 结构：

```astro
<div id="pageScroller" class="page-scroller">
    <div transition:name="site-shell" transition:persist>
        <SiteShell client:load initialIsHomePage={isHomePage} />
    </div>
    <div id="pageTransitionSurface"
         data-shell-mode={shellMode}
         data-page-title={shellTitle}
         data-is-home={isHomePage ? 'true' : 'false'}
         transition:name="page-content">
        <slot />
    </div>
    <div class="page-footer" transition:name="site-footer" transition:persist>
        <Footer ... />
    </div>
</div>
```

`data-shell-page` 属性被移除（不再需要，因为 `isShellPage` 恒为 `true`）。条件页脚也移除。

### shellMode 由页面 props 决定（不从 pathname 推断）

每个页面文件显式传递 `shellMode` 和 `shellTitle` 给 BaseLayout：

```astro
// index.astro
<BaseLayout shellMode="home" shellTitle={siteConfig.profile.name}>

// posts/index.astro
<BaseLayout shellMode="blog" shellTitle="博客">

// posts/[...slug].astro
<BaseLayout shellMode="article" shellTitle={frontmatter.title}>

// 404.astro
<BaseLayout shellMode="error" shellTitle="404">
```

这比 pathname 推断更可靠，消除了边缘情况（如 `/posts/` 末尾斜杠、子路径等）。

BaseLayout 的 frontmatter 变为：

```ts
const { title = siteConfig.title, description = siteConfig.description, shellMode = 'error', shellTitle = title } = Astro.props;
const isHomePage = shellMode === 'home';
```

## SiteShell 左面板模式

SiteShell 的 `<Transition>` 从两个 v-if/v-else 分支扩展为四个：

- `mode === 'home'` → 完整 hero（头像 → 名字 → 状态 → slogan → 社交链接）
- `mode === 'blog'` → 标题“博客”
- `mode === 'article'` → 文章标题（`pageShell.title`）
- `mode === 'error'` → 不渲染左面板内容（hero-sticky 仍显示壁纸，但 `<header>` 不渲染）

SiteShell 上 `v-if="pageShell.isShellPage"` 守卫移除。hero-sticky 总是渲染，左面板内容通过 `v-if` 按 mode 切换。

壁纸加载条件简化：移除 `!pageShell.isShellPage` 检查，桌面端总是加载壁纸。

## 文章页迁移

### `[...slug].astro`

- 移除 `<PageFrame>` 包装，只保留文章内容直接放在 `<slot />` 中
- 传递 `shellMode="article"` 和 `shellTitle={frontmatter.title}` 给 BaseLayout
- 文章样式保留在 `<style scoped>` 中
- ClockPanel 不在文章页渲染

### 文章滚动行为

文章页进入后滚动进度重置到 0。SiteShell 监听 `#pageScroller` 滚动驱动 hero 视差——与首页和博客列表一致。文章滚动时同样看到 hero 3D 下沉效果。

## 404 页面迁移

### `404.astro`

- 移除 `<PageFrame>` 包装，404 卡内容直接放在 `<slot />` 中
- 传递 `shellMode="error"` 和 `shellTitle="404"` 给 BaseLayout
- 404 样式保留在 `<style scoped>` 中

## PageFrame.vue 删除

`PageFrame.vue` 所有职责已由以下组件分担：

| PageFrame 职责 | 新归属 |
|---|---|
| hero / 壁纸 / 左面板 | SiteShell |
| page-scroller | BaseLayout |
| Footer | BaseLayout（persistent footer） |
| ClockPanel | 暂不渲染（保留组件文件以备后续） |
| 内容保护 / 滚动动画 | SiteShell |
| 3D 视差 | SiteShell（通过 pageShell.scrollProgress） |
| 壁纸控制器 | SiteShell |

删除时同步清理：所有 import、测试断言、`wallpaper-full-bleed.test.ts` 中的 PageFrame 引用。

## 数据流清理

### page-shell.ts

- `ShellMode` 改为 `'home' | 'blog' | 'article' | 'error'`
- 删除 `isShellPage` 字段（从 `PageShellState` 接口、store ref、`enterPage` 参数中移除）
- `resetScrollProgress` 保留不变

### page-shell-context.ts

- `isShellMode()` 扩展识别 `'article'` 和 `'error'`
- `getPageShellStateFromElement/Document` 移除 `isShellPage` 字段
- `normalizePageShellState` 移除 `isShellPage` 字段
- `data-shell-page` 属性不再需要（BaseLayout 不再输出）

### 删除 useHomepage / homepage-context / homepage store

以下文件完全删除：

- `src/composables/useHomepage.ts`
- `src/stores/homepage.ts`
- `src/lib/homepage-context.ts`

TopBar 已在 Phase 1 改用 `pageShell`，无消费者。

### 删除 isHomePageDocument 引用

`isHomePageDocument()` 在以下位置被引用，需要清理：

- `src/stores/homepage.ts`（随文件一起删除）
- `tests/logic-guardrails.test.ts`（更新测试断言）
- `tests/loading-overlay-navigation.test.ts`（更新测试断言）

### TopBar.vue 清理

- 删除 `if (!pageShell.isShellPage) return 1` 分支（已无意义）
- `expansionProgress` 只需判断 `!pageShell.isHomePage` 和 `isMobile`

### SiteShell.vue 清理

- 删除 `v-if="pageShell.isShellPage"` 守卫
- 壁纸加载条件从 `if (mobile || !pageShell.isShellPage)` 改为 `if (mobile)`

## BaseLayout.astro 清理

- 移除 `isShellPage` 计算
- 移除 `isBlogListPage` 计算
- 移除 `pathname` 变量（不再从 pathname 推断模式）
- 移除 `data-shell-page` 属性
- 移除条件分支（`isShellPage ? (...) : (...)` 统一为单一结构）
- Props 改为 `{ title?: string; description?: string; shellMode?: string; shellTitle?: string }`
- 内联脚本中的 `getShellStateFromDocument` 不再读取 `data-shell-page`，只读 `data-shell-mode`、`data-page-title`、`data-is-home`

## 旧浏览器兼容清理

### 删除 `-webkit-` CSS 前缀

所有现代浏览器支持无前缀版本。删除以下：

- `src/styles/layout.css`：`-webkit-backdrop-filter: var(--panel-blur)` → 删除
- `src/styles/responsive.css`：`-webkit-backdrop-filter: var(--panel-blur)` → 删除
- `src/styles/topbar.css`：3 处 `-webkit-backdrop-filter: blur(...)` → 删除
- `src/styles/dock.css`：`-webkit-backdrop-filter: blur(40px) saturate(220%)` → 删除
- `src/styles/layout.css`：`-webkit-user-select: none` → 删除（`user-select: none` 已足够）

### 删除 `isHomePageDocument()` 和相关文件

- `src/lib/homepage-context.ts`：完全删除
- `src/composables/useHomepage.ts`：完全删除
- `src/stores/homepage.ts`：完全删除

## 测试策略

### 删除测试

- `tests/wallpaper-full-bleed.test.ts` 中对 `PageFrame.vue` 的引用改为检查 `SiteShell.vue` 或删除
- `tests/homepage-footer-styles.test.ts` 中对 `PageFrame.vue` 的引用同样处理

### 更新测试

- `shell-layout.test.ts`：移除 `isShellPage` 条件分支断言，添加 `article` 和 `error` 模式断言，验证所有页面无 PageFrame 引用
- `page-shell-store.test.ts`：移除 `isShellPage` 测试，添加 `article` 和 `error` 模式测试
- `page-shell-context.test.ts`：移除 `isShellPage` 解析测试，添加 `article` 和 `error` 模式解析
- `loading-overlay-navigation.test.ts`：移除 `isHomePageDocument` 相关断言，验证所有页面都走 shell-ready 路径
- `logic-guardrails.test.ts`：更新 `before-swap` 断言（不再检查 `data-shell-page`）
- `component-lifecycle-cleanup.test.ts`：移除对 SiteShell `isShellPage` 的检查（如果有）
- `topbar-component.test.ts`：移除 `isShellPage` 相关断言

### 新增测试

- 验证 BaseLayout 不再有 `isShellPage` 条件分支
- 验证 BaseLayout 输出 `data-shell-mode` 包含 `article` 和 `error`
- 验证文章页和 404 页不引用 PageFrame
- 验证 SiteShell 四种模式的左面板渲染（`home`/`blog`/`article` 渲染 header，`error` 不渲染 header）
- 验证文件删除：`useHomepage.ts`、`homepage.ts`（store）、`homepage-context.ts`、`PageFrame.vue` 不存在

## 验收标准

- `/posts/[...slug]` 左面板显示文章标题，滚动时 hero 3D 下沉
- `/404` 没有左面板内容，hero 区域显示壁纸和 TopBar
- `/` ↔ `/posts` ↔ `/posts/[...slug]` 三个页面之间切换时 SiteShell 不重建、壁纸不重载、TopBar 不重播
- 文章页和 404 页获得与首页/博客相同的 Footer
- `PageFrame.vue` 被完全删除，无残留引用
- `useHomepage.ts`、`homepage.ts`（store）、`homepage-context.ts` 被完全删除
- 没有 `-webkit-backdrop-filter` 和 `-webkit-user-select` 前缀
- 没有 `isShellPage` 字段在 store、context、或 DOM 数据属性中
- 没有 `isHomePageDocument()` 引用
- `npm test`、`npm run check`、`npm run build` 通过

## 风险与处理

| 风险 | 处理 |
|---|---|
| 文章页内容覆盖层级与首页不一致 | 复用 `pageTransitionSurface` 的 z-index，保持一致 |
| 404 页面无左面板时光效果与首页不同 | `error` 模式保留 hero-sticky 和壁纸，只隐藏左面板内容 |
| PageFrame 删除遗漏引用 | 全局搜索 `PageFrame` 并逐个清理 |
| 文章标题过长导致左面板溢出 | CSS 加 `text-overflow: ellipsis` 和 `overflow: hidden` |
| `homepage-context.ts` 删除影响其他消费者 | 已确认无其他消费者（TopBar 在 Phase 1 已改用 pageShell） |
| 旧浏览器不支持 `backdrop-filter` 无前缀 | Safari 15.4+（2022.3）已支持，可接受 |