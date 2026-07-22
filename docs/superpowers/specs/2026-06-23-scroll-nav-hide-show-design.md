# 导航栏滚动方向显隐设计

## 概述

在现有 TopBar 展开动画基础上，叠加"上滑显示、下滑隐藏"行为，桌面端和移动端均生效。

## 行为

- **上滑（scroll direction = up）**：TopBar 立即滑入（translateY: 0）
- **下滑（scroll direction = down）且 scrollProgress > 0.05**：TopBar 滑出（translateY: -100%）
- **scrollProgress ≤ 0.05**：始终显示（页面顶部区域不隐藏）
- 动画通过 CSS `transition: transform 0.3s` 实现

## 变更文件

### 1. `src/stores/page-shell.ts`

新增状态：
- `scrollDirection: ref<'up' | 'down'>('up')`

新增 action：
- `setScrollDirection(dir: 'up' | 'down')`

### 2. `src/components/SiteShell.vue`

在现有 scroll handler 中记录 `lastScrollY`，每次滚动时比较当前 `scrollTop` 与上一次值，判断方向后调用 `pageShell.setScrollDirection()`。

### 3. `src/components/TopBar.vue`

新增计算属性 `navTranslateY`：
- 依赖 `pageShell.scrollDirection` 和 `pageShell.scrollProgress`
- 下滑且 `scrollProgress > 0.05` → `-100%`，否则 `0`

应用到 `.top-bar` 的 `transform: translateY(...)`，与现有 `left`/`width` 展开动画独立。

### 4. `src/styles/topbar.css`

在 `.top-bar` 上添加 `transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)`。

## 不涉及

- 不修改现有展开动画逻辑
- 不修改移动端 sidebar 行为
- 不修改 hero 区、壁纸、footer
