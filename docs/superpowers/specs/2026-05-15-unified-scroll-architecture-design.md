# Unified Scroll Architecture (Phase 3) Design

## 目标

Phase 3 统一所有页面的滚动架构，使 home/blog/article/error 四种模式拥有完全一致的交互体验：

1. **TopBar 展开/收缩动画在所有页面都从偏移到全宽**，随 `scrollProgress` 驱动
2. **所有页面的内容区域滚动时覆盖 hero 区域**（sticky hero + z-index 叠层）
3. **唯一的滚动容器是 `.page-scroller`**，`body` 不再自己滚动
4. **移动端也统一行为**

核心感受：不是"一页一页的网站"，而是"一个完整的应用"。

## 当前问题

| 问题 | 根因 |
|------|------|
| 非 home 页面 TopBar 始终全宽，没有展开动画 | `expansionProgress` 在 `!pageShell.isHomePage` 时直接返回 1 |
| 非 home 页面 `body` 自己滚动（`padding-top: 72px; overflow: auto`） | `topbar.css` 的默认 `body` 样式 |
| 非 home 页面内容不在 sticky hero 下方滚动 | body 自己是滚动容器，page-scroller 失去意义 |
| 只有 home 页面 hero 有 3D 下沉效果 | 因为只有 home 页面 page-scroller 是实际滚动容器 |

## 变更总览

### 1. 统一 `body` 样式

**`src/styles/topbar.css`**:

删除默认 `body` 的 `padding-top: 72px; overflow: auto; height: auto;`，改为：

```css
body {
    overflow: hidden;
    height: 100vh;
    padding-top: 0;
    transition: none;
}

body.is-home {
    /* 不再需要覆盖，保留空规则或删除 */
}
```

**`src/styles/base.css`**:

`html.is-home` 和 `body.is-home` 的 `overflow: hidden; height: 100%;` 样式变为全局默认：

```css
html {
    height: 100%;
}

body {
    overflow: hidden;
    height: 100vh;
}
```

删除或清空 `html.is-home` 和 `body.is-home` 规则。

### 2. TopBar 所有模式都跟随 scrollProgress

**`src/components/TopBar.vue`**:

删除 `if (!pageShell.isHomePage) return 1`（Phase 2 已删 `isShellPage`，但 `isHomePage` 仍然在）。

当前：
```ts
const expansionProgress = computed(() => {
    if (!pageShell.isHomePage) return 1;
    if (isMobile.value) return 1;
    // ... scroll-based calculation
});
```

改为：
```ts
const expansionProgress = computed(() => {
    if (isMobile.value) return 1;
    // ... scroll-based calculation for ALL modes
});
```

### 3. TopBar `isHomePage` 分支清理

**`src/components/TopBar.vue`** 中的 `watch`:

当前：
```ts
watch([isMobile, () => pageShell.isHomePage, barRef], () => {
    // ...
    if (!barRef.value || isMobile.value || !pageShell.isHomePage) return;
    magnifyCleanup = setupIconMagnifyHover();
});
```

改为：
```ts
watch([isMobile, () => pageShell.isHomePage, barRef], () => {
    // ...
    if (!barRef.value || isMobile.value) return;
    magnifyCleanup = setupIconMagnifyHover();
});
```

Dock 图标的 magnify hover 效果现在在所有桌面端页面都启用。

### 4. 移除 `is-home` 类切换中的样式差异

**`src/layouts/BaseLayout.astro`**:

`<html>` 和 `<body>` 上的 `is-home` 类可以保留（用于 JS 判断是否是首页），但 CSS 中 `.is-home` 的特定规则全部清空或改为与默认样式相同。

导航脚本中的 `applyHomePageChromeState` 函数和 `incomingIsHomePage` 变量保留，因为它们还用于：
- loading overlay 的 `shouldWaitForHomepage()` 判断
- `waitForResources()` 中的非首页快速完成逻辑

### 5. 非 home 内容的最小高度

blog/article/error 内容区（`.page-transition-surface`）有 `min-height: 100vh`。由于现在所有页面都在 `page-scroller` 内滚动，这确保了即使内容很少，也有足够空间滚动过 hero 区域来触发 TopBar 展开。

### 6. SiteShell 壁纸加载简化

Phase 2 已将壁纸加载条件从 `if (mobile || !pageShell.isShellPage)` 简化为 `if (mobile)`。无需进一步变更。

## 不变的部分

- **`.page-scroller` DOM 结构** 不变（Phase 1 已统一）
- **SiteShell 四模式 Transition** 不变（Phase 2 已实现）
- **3D 下沉效果** 不变（`heroStyle` 计算逻辑不变）
- **导航事件生命周期** 不变
- **View Transition 动画** 不变

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `src/styles/topbar.css` | 统一 `body` 样式为 `overflow: hidden; height: 100vh; padding-top: 0`，删除 `body.is-home` 覆盖规则 |
| `src/styles/transitions.css` | `.page-transition-surface` 的 `padding` 从 `4rem 2rem` 改为 `4.5rem 2rem`（TopBar 高度匹配） |
| `src/styles/base.css` | 全局 `html { height: 100% }` 和 `body { overflow: hidden; height: 100vh }`，删除 `html.is-home` 和 `body.is-home` 规则 |
| `src/components/TopBar.vue` | 删除 `if (!pageShell.isHomePage) return 1` 和 magnify 条件 `!pageShell.isHomePage` |
| `src/components/SiteShell.vue` | 壁纸 watch 中 `isHomePage` 检查保留（只在 home 模式发 `homepage-ready` 事件），无其他变更 |
| `tests/topbar-component.test.ts` | 移除 `isHomePage` 相关断言 |

## 验收标准

- `/` 首页体验不变
- `/posts` 博客列表：滚动时 TopBar 从偏移展开到全宽，内容覆盖 hero
- `/posts/[slug]` 文章页：同上
- `/404` 错误页：同上（hero 区域为空，但有壁纸 + TopBar 展开）
- 移动端所有页面体验一致
- 页面切换时无闪烁
- `npm test`、`npm run check`、`npm run build` 通过

## 风险

| 风险 | 处理 |
|------|------|
| 统一 body 样式后，非 home 页面内容可能不够高，无法滚动过 hero 区域 | `.page-transition-surface` 已有 `min-height: 100vh`，足够触发 TopBar 展开 |
| 浮动 TopBar 在内容稀少页面可能遮挡内容 | `.page-transition-surface` 的 `padding-top` 改为 `4.5rem`（=72px = TopBar 高度），确保内容不被遮挡 |
| `is-home` 类仍然用于 JS 逻辑 | 保留类名增删逻辑，只删除 CSS 差异规则 |