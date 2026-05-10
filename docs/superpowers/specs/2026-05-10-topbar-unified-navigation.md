# TopBar 统一导航栏

## 概述

将现有的 `compressed-header` 和右面板内 `NavigationDock` 合并为一个 `TopBar` 组件，固定在页面顶部。滚动时左侧头像+名字渐显，右侧 Dock 图标始终可见，视觉上形成统一导航栏。

## 桌面端行为

| scrollProgress | TopBar 左侧 | 左面板头像+名字 |
|---|---|---|
| 0~0.15 | opacity: 0 | opacity: 1 |
| 0.15~0.4 | opacity 0->1 | opacity 1->0 |
| 0.4+ | opacity: 1 | opacity: 0 |

右侧 Dock 图标（主题/语言/Blog/GitHub）始终可见，不受滚动影响。

## 移动端行为

窄屏（≤900px）：
- TopBar 左侧：头像 + 名字始终可见
- TopBar 右侧：无 Dock 图标（已存在于 MobileDockSidebar）
- 点击左侧头像+名字 -> 展开 MobileDockSidebar

## 组件设计

### TopBar.tsx（新建）

Props:
- `config: SiteConfig` — profile（头像/名字）、dock.items（右侧图标）
- `i18n: I18nContext` — 翻译、主题/语言切换
- `scrollProgress: Accessor<number>` — 0~1，驱动左侧渐显
- `onMobileMenuOpen: () => void` — 移动端点击头像触发

结构：
```
<div class="top-bar" (fixed, z-index: 2000)>
  <div class="top-bar-left" (opacity 随 scrollProgress)>
    <img class="top-bar-avatar" />  <!-- 32px -->
    <span class="top-bar-name" />
  </div>
  <div class="top-bar-right">
    <!-- dock.items 驱动的按钮 -->
    <!-- 语言 popup 通过 Portal 渲染，位置相对语言按钮 -->
  </div>
</div>
```

### 改动清单

| 文件 | 改动 |
|---|---|
| `TopBar.tsx` | 新建 |
| `topbar.css` | 新建 |
| `HomepageApp.tsx` | 移除 compressed-header JSX、移除 right-panel 中的 NavigationDock、接入 TopBar、左面板头像+名字 opacity 绑定 scrollProgress |
| `transitions.css` | 移除 compressed-header 样式 |
| `BaseLayout.astro` | 引入 topbar.css |
| `NavigationDock.tsx` | 不改 |
| `MobileDockSidebar.tsx` | 不改 |

## CSS

- `position: fixed; top: 16px; left: 16px; right: 16px; height: 56px`
- 玻璃质感（复用 --dock-bg、--panel-border）
- `backdrop-filter: blur(30px) saturate(180%)`
- `border-radius: 14px`
- flex: space-between
