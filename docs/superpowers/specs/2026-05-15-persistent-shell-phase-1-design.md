# Persistent Shell Phase 1 Design

## 目标

Phase 1 先把首页 `/` 和博客列表 `/posts` 迁移到新的公共页面骨架：壁纸、左面板、TopBar、滚动视差逻辑作为持久公共壳存在；页面正文作为第二屏内容全宽上浮覆盖 hero。文章页和 404 暂时保留旧结构，等 Phase 2 再迁移。

这次设计的核心不是一次性重写全站，而是先做一个可验证闭环：确认公共壳不重建、壁纸不重载、TopBar 不重播、左面板标题可过渡、第二屏内容能正常覆盖第一屏。

## 参考经验：Fuwari

Fuwari 的关键经验是“结构性持久化”：导航栏、侧栏、banner 等公共元素放在 Swup 替换容器外，只有 `main` 内容被替换。公共结构不参与页面替换，因此不会重建，也不会重新播放初始化动画。

本项目继续使用 Astro `ClientRouter`，不在 Phase 1 回迁 Swup。对应策略是：

- `SiteShell` 继续用 `transition:persist` 持久存在。
- 首页和博客列表的公共壳逻辑上移到 `SiteShell`。
- `pageTransitionSurface` 继续作为页面正文替换区。
- 页面状态通过 `data-*` 和自定义事件同步给持久壳，而不是依赖持久组件重新接收 props。

## Phase 1 范围

### 包含

- 首页 `/` 迁移到新公共壳。
- 博客列表 `/posts` 迁移到新公共壳。
- 首页左面板保留当前视觉顺序：头像、名字、状态、slogan、社交链接。
- 博客列表左面板只显示页面标题“博客”。
- 壁纸放入持久公共壳，切换 `/` 和 `/posts` 时不重载。
- TopBar 放入同一个持久壳，切页时不重建，只根据页面状态和滚动进度平滑变形。
- 内容区是全宽实色背景，从下方自然上浮，覆盖左面板和壁纸。
- 左面板内容切换需要互动动画，不能直接硬替换。

### 不包含

- 文章页 `/posts/[...slug]` 迁移。
- 404 页面迁移。
- 时钟面板重新摆放。
- Swup 回迁。
- 复杂 TOC、文章阅读布局、文章页阅读体验重构。
- 一次性全站所有页面改造。

## 目标结构

```text
BaseLayout
├─ page-scroller 全局滚动容器
│  ├─ SiteShell 持久公共壳
│  │  ├─ hero-sticky
│  │  │  ├─ wallpaper-scroll-area
│  │  │  └─ left-panel
│  │  │     ├─ home 模式：头像 → 名字 → 状态 → slogan → 社交链接
│  │  │     └─ blog 模式：标题“博客”
│  │  ├─ noise-overlay
│  │  ├─ TopBar
│  │  └─ 滚动/视差状态
│  │
│  ├─ pageTransitionSurface 可替换内容区
│  │  ├─ 首页第二屏内容
│  │  └─ 博客列表内容
│  │
│  └─ site-footer 持久页脚
```

`page-scroller` 是同一个滚动上下文，公共 hero、页面正文和页脚都在它里面。`SiteShell` 负责背景、左面板、TopBar 和滚动状态；`pageTransitionSurface` 负责当前页面自己的正文；`site-footer` 负责公共页脚。内容区和页脚一起构成第二屏，仍然在正常文档流里，是全宽块，滚动时覆盖第一屏。

## 视觉行为

### 第一屏

首页第一屏保留当前左侧/右侧结构。左侧是玻璃左面板，首页模式显示头像、名字、状态、slogan 和社交链接；博客模式只显示“博客”。右侧结构保留，但时钟面板暂时不渲染。

壁纸作为公共背景显示在 hero 区域，不因首页和博客列表切换而重新初始化。

### 滚动中

滚动进度继续使用当前 PageFrame 的核心公式：

```text
scrollProgress = min(scrollTop / window.innerHeight, 1)
```

这个进度同时驱动 hero 和 TopBar：

```text
hero:
- translateZ(-600 * progress)
- rotateX(15 * progress)
- scale(1 - 0.3 * progress)
- opacity(1 - progress * 1.2)
- blur(progress * 8px)

TopBar:
- progress = 0：左边缘避让左面板
- progress = 1：左边缘扩展到 0，成为全宽
```

第二屏内容区是全宽实色背景，`z-index` 高于 hero 和壁纸。它从视口下方自然上浮，覆盖左面板和壁纸，不做只填左侧的特殊布局。

第二屏由两部分组成：当前页面正文和公共页脚。Phase 1 中首页正文和博客列表正文会替换，页脚作为公共元素持久存在。

### 切换页面

首页和博客列表切换时：

- SiteShell 不重建。
- 壁纸不重载。
- TopBar 不重新播放挂载动画。
- 左面板内容通过过渡动画切换。
- 页面内容区淡出旧内容，淡入新内容。
- 新页面滚动位置重置到顶部。

## 左面板动画

左面板内容切换不能硬替换。Phase 1 使用轻量 Vue transition：

```text
旧内容：轻微上移 + opacity 0 + blur
新内容：从下方轻微浮入 + opacity 1 + blur 归零
```

首页模式的动画作用于整个首页左面板内容组。博客模式的动画作用于“博客”标题。滚动时的 3D 视差仍由 hero 容器统一负责；标题切换动画只负责页面切换时的内容变化。

## 页面状态数据流

新增轻量页面状态层，用来让持久壳知道当前页面是哪种模式。

```text
ShellMode = 'home' | 'blog' | 'legacy'

state:
- title: 当前左面板标题
- mode: 当前壳模式
- isHomePage: 是否首页
- isShellPage: 是否启用新公共壳
- scrollProgress: 当前滚动进度

actions:
- enterPage(payload)
- setScrollProgress(value)
- resetScrollProgress()
```

`BaseLayout` 在 `pageTransitionSurface` 上输出页面 shell 信息：

```astro
data-shell-page="true"
data-shell-mode="home"
data-page-title="遊星 Wakusei"
data-is-home="true"
```

博客列表页对应：

```astro
data-shell-page="true"
data-shell-mode="blog"
data-page-title="博客"
data-is-home="false"
```

legacy 页面对应：

```astro
data-shell-page="false"
data-shell-mode="legacy"
```

客户端在 `astro:before-swap` 读取 `event.newDocument` 里的下一页 `data-*`，提前触发 `wakusei:shell-page-change` 事件。持久壳收到事件后更新 store，让 TopBar 和左面板在内容替换前开始过渡。

不依赖持久 Vue 组件重新接收 props，因为 `transition:persist` 下组件不会按普通页面加载流程重新挂载。

## legacy 页面处理

文章页和 404 在 Phase 1 仍然是 legacy 模式。

legacy 模式下：

- SiteShell 保留 TopBar 和 noise overlay。
- SiteShell 不渲染新的公共 hero 左面板。
- 旧 PageFrame 继续负责文章页和 404 的页面结构。
- 避免新旧两套左面板同时出现。

这保证 Phase 1 不会扩大到文章阅读布局和 404 样式。

## 组件职责

### `SiteShell.vue`

负责公共持久壳：hero-sticky、wallpaper、left-panel、noise overlay、TopBar、滚动状态、视差状态。它作为 `page-scroller` 的第一个内容块存在，让后面的 `pageTransitionSurface` 能在同一个滚动上下文中上浮覆盖 hero。Phase 1 可以先在此组件中迁移 PageFrame 的必要逻辑；如果文件变得过大，后续再抽 `ShellHero.vue`。

### `TopBar.vue`

继续作为独立组件存在，但页面模式和滚动状态由统一 shell/page 状态驱动，不再自己通过 DOM 猜测页面类型。TopBar 的 `--bar-left` 和 `--left-width` 继续用于真实变形，不能退回视觉假象。

### `PageFrame.vue`

首页和博客列表不再依赖它。文章页和 404 暂时继续使用它，直到 Phase 2。Phase 1 不删除 PageFrame。

### `HomepageApp.vue`

Phase 1 后只负责首页第二屏内容，不再包完整 PageFrame。首页左面板的头像、名字、状态、slogan、社交链接由 SiteShell 在 home 模式渲染。

### 博客列表内容

博客列表页只负责文章列表内容，不再包完整 PageFrame。它的第二屏内容仍然在 `pageTransitionSurface` 中正常替换。

### `Footer.vue`

页脚作为第二屏的一部分，但不是每个页面单独重建的正文内容。Phase 1 将公共页脚放在 `page-scroller` 末尾的持久 footer 区域中，首页和博客列表共享同一个 Footer。

## CSS 层级

Phase 1 明确层级，避免内容覆盖错乱：

```text
wallpaper: 最底层
hero / left-panel: 高于 wallpaper
pageTransitionSurface / page content: 高于 hero，滚动时覆盖 hero
TopBar: 高于 page content
noise overlay: 视觉叠层，不拦截点击
```

内容区必须是全宽实色背景，不能只在左侧或右侧覆盖。

## 无障碍和 reduced motion

`prefers-reduced-motion: reduce` 下：

- 禁用或弱化 hero 的 3D transform。
- 左面板内容切换改为简单 opacity。
- TopBar 仍可改变布局，但减少复杂缓动。

切页后焦点不应停留在旧链接上。Phase 1 至少保证内容区有可聚焦入口或页面标题可被辅助技术识别。

## 测试策略

### 更新现有测试

`topbar-component.test.ts`：

- TopBar 由 shell/page 状态驱动。
- `--bar-left` 和 `--left-width` 仍存在。
- 页面模式变化和滚动进度都能影响 TopBar 展开。

`logic-guardrails.test.ts`：

- `isHomePageDocument()` 仍然只信任 route class。
- `BaseLayout` 输出 `data-shell-page`、`data-shell-mode`、`data-page-title`。
- `before-swap` 读取 `newDocument` 的 shell data。

`component-lifecycle-cleanup.test.ts`：

- SiteShell 持久后仍清理 scroll、media、wallpaper listeners。
- 首页和博客列表不再引用 PageFrame。

### 新增测试

`shell-layout.test.ts`：

- SiteShell 包含 wallpaper、left-panel、TopBar。
- BaseLayout 中 `page-scroller` 同时包含 SiteShell、`pageTransitionSurface` 和 footer。
- 首页和博客列表使用新公共壳。
- `pageTransitionSurface` 仍是唯一页面内容替换区。
- legacy 页面不会启用新 hero，避免双壳。

## 验收标准

Phase 1 完成后必须满足：

- `/` 到 `/posts` 切换时 TopBar 不重建，壁纸不重载。
- `/posts` 到 `/` 切换时 TopBar 从全宽/当前状态平滑收回到首页首屏状态。
- 首页首屏左面板视觉顺序与现有顺序一致。
- 博客列表首屏左面板只显示“博客”。
- 首页和博客列表滚动时第二屏内容全宽覆盖 hero。
- 文章页和 404 在 legacy 模式下仍可正常访问。
- `npm test`、`npm run check`、`npm run build` 通过。

## 风险与处理

| 风险 | 处理 |
|---|---|
| SiteShell 变大 | Phase 1 只迁移必要逻辑，后续可抽 `ShellHero.vue` |
| legacy 页面双壳冲突 | `mode === 'legacy'` 时不渲染新公共 hero |
| 页面状态更新太晚 | 在 `astro:before-swap` 读取下一页状态 |
| 内容区覆盖层级错乱 | 固定 z-index 顺序，内容区全宽实色背景 |
| 滚动绑定丢失 | 切页后重新绑定 `.page-scroller` 并重置进度 |
| 标题切换动画和滚动动画冲突 | 页面切换动画作用于内容块，滚动 3D 作用于 hero 容器 |
| 动效过强 | reduced motion 下弱化 |

## 后续阶段

Phase 2 再迁移文章页和 404，并决定时钟面板的新位置。Phase 1 不对这些问题做提前实现，避免扩大风险。
