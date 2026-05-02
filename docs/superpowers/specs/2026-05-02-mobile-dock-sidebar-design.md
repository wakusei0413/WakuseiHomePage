# 移动端 Dock 侧边栏设计

## 概要

在视口宽度 ≤ 900px 时，将现有的 `ControlDock` 底部栏和底部面板替换为**从左侧滑出的侧边栏**，通过点击头像触发。侧边栏以**图标 + 文字列表**的形式展示三个 Dock 功能（主题、语言、设置），语言列表以内联展开的方式呈现，不再单独弹出一层面板。

## 动机

当前移动端把紧凑的图标 Dock 放在右上角，在手机屏幕上显得拥挤且不易被发现。将 Dock 功能收纳到由醒目头像触发的侧边栏中，可以显著提升可发现性、触控区域大小和视觉层级。

## 范围

- **范围内**：移动端侧边栏组件、头像点击处理、移动端专属 CSS、语言列表内联展开行为。
- **范围外**：桌面端 `ControlDock`（保持不变）、设置页内容、主题过渡动画修改。

## 架构

```
HomepageApp.tsx
├── MobileDockSidebar (新增)
│   ├── props: config, i18n
│   ├── signals: isOpen, isLanguageExpanded, isDark
│   ├── render: 侧边栏面板 + 遮罩层
│   └── actions: toggleTheme, selectLanguage, navigateToSettings
├── ControlDock (桌面端，保持不变)
└── avatar-box (现有)
    └── 移动端 onClick → MobileDockSidebar.open()
```

## 组件：MobileDockSidebar

### Props

```ts
interface MobileDockSidebarProps {
    config: SiteConfig;
    i18n: I18nContext;
}
```

### 状态

- `isOpen`：侧边栏是否可见。
- `isLanguageExpanded`：语言子菜单是否展开。
- `isDark`：从 `applyTheme` / `getStoredTheme` 推导（与 `ControlDock` 相同逻辑）。

### 渲染结构

```tsx
<Portal>
    <div class="mobile-dock-sidebar" data-open={isOpen()}>
        <div class="sidebar-header">
            <img src={config.profile.avatar} alt="" class="sidebar-avatar" />
            <span class="sidebar-name">{config.profile.name}</span>
        </div>

        <div class="sidebar-divider"></div>

        <button class="sidebar-menu-item" onClick={toggleTheme}>
            <i class={isDark() ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}></i>
            <span>{t('dock.theme')}</span>
        </button>

        <div class="sidebar-menu-group">
            <button
                class="sidebar-menu-item"
                classList={{ expanded: isLanguageExpanded() }}
                onClick={() => setIsLanguageExpanded(!isLanguageExpanded())}
            >
                <i class="fa-solid fa-globe"></i>
                <span>{t('dock.language')}</span>
                <i class="fa-solid fa-chevron-down expand-icon"></i>
            </button>
            <div class="sidebar-submenu" classList={{ expanded: isLanguageExpanded() }}>
                {locales.map((lang) => (
                    <div
                        class="sidebar-submenu-item"
                        classList={{ selected: locale() === lang }}
                        onClick={() => selectLanguage(lang)}
                    >
                        <span class="check-icon">✓</span>
                        <span>{t(`dock.lang.${lang}`)}</span>
                    </div>
                ))}
            </div>
        </div>

        <button class="sidebar-menu-item" onClick={() => window.location.href = '/settings'}>
            <i class="fa-solid fa-gear"></i>
            <span>{t('dock.settings')}</span>
        </button>
    </div>

    <div class="mobile-dock-sidebar-overlay" data-open={isOpen()} onClick={() => setIsOpen(false)}></div>
</Portal>
```

### 行为

- **打开**：由 `HomepageApp` 中 `avatar-box` 的 `onClick` 触发（仅在移动端视口）。
- **关闭**：点击遮罩层、点击侧边栏外部、或选择语言后（选择完成即关闭）。
- **外部点击检测**：与 `ControlDock.setupOutsideClick` 相同模式——在下一 tick 附加监听器，关闭时移除。
- **切换到桌面端**：如果视口跨越 900px 时侧边栏处于打开状态，强制关闭侧边栏。

## HomepageApp 变更

1. 导入 `MobileDockSidebar`。
2. 在 `HomepageApp` 中创建 open signal：
   ```tsx
   const [mobileDockOpen, setMobileDockOpen] = createSignal(false);
   ```
3. 为 `avatar-box` 添加 `onClick`：
   ```tsx
   <div
       class="avatar-box"
       onClick={() => {
           if (window.matchMedia('(max-width: 900px)').matches) {
               setMobileDockOpen(true);
           }
       }}
   >
   ```
4. 与现有的 `<ControlDock />` 并排渲染：
   ```tsx
   <MobileDockSidebar
       config={siteConfig}
       i18n={i18n}
       open={mobileDockOpen()}
       onClose={() => setMobileDockOpen(false)}
   />
   ```

## MobileDockSidebar 接口

```ts
interface MobileDockSidebarProps {
    config: SiteConfig;
    i18n: I18nContext;
    open: boolean;          // 受控的打开状态
    onClose: () => void;    // 关闭回调
}
```

组件采用受控组件模式，使用 `props.open` 和 `props.onClose`，与现有 `ControlDock` 的弹窗/底部面板行为保持一致。

## runtime-effects.ts 变更

- 从 `initMobileStickyAvatar` 中移除 `handleClick` 的头像点击回顶逻辑。头像点击现在完全由 `HomepageApp` / `MobileDockSidebar` 接管。
- 保留 `handleScroll` 的缩小逻辑（`.scrolled` 类）不变。

## CSS 设计

所有规则放在 `src/styles/dock.css` 的 `@media (max-width: 900px)` 内部。

### 隐藏现有移动端 Dock

```css
@media (max-width: 900px) {
    .control-dock,
    .dock-bottom-sheet,
    .dock-overlay {
        display: none !important;
    }
}
```

### 侧边栏面板

```css
.mobile-dock-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 72vw;
    max-width: 300px;
    z-index: calc(var(--z-dock, 10000) + 1);
    background: rgba(10, 10, 22, 0.72);
    backdrop-filter: blur(48px) saturate(240%);
    -webkit-backdrop-filter: blur(48px) saturate(240%);
    border-right: 1px solid rgba(255, 255, 255, 0.28);
    box-shadow:
        4px 0 24px rgba(0, 0, 0, 0.3),
        inset -1px 0 0 rgba(255, 255, 255, 0.15);
    color: #e8e8ec;
    display: flex;
    flex-direction: column;
    padding: 20px 0;
    /* 关闭状态 */
    transform: translateX(-100%);
    opacity: 0;
    pointer-events: none;
    transition:
        transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
        opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.mobile-dock-sidebar[data-open] {
    transform: translateX(0);
    opacity: 1;
    pointer-events: auto;
}
```

### 遮罩层

```css
.mobile-dock-sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0);
    z-index: var(--z-dock, 10000);
    opacity: 0;
    pointer-events: none;
    transition:
        background-color 0.35s ease,
        opacity 0.35s ease;
}

.mobile-dock-sidebar-overlay[data-open] {
    background: rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    opacity: 1;
    pointer-events: auto;
}
```

### 头部

```css
.sidebar-header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 20px 16px;
}

.sidebar-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
}

.sidebar-name {
    font-size: 1rem;
    font-weight: 600;
    color: #ffffff;
}
```

### 分隔线

```css
.sidebar-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.15);
    margin: 0 16px 12px;
}
```

### 菜单项

```css
.sidebar-menu-item {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 12px 20px;
    background: transparent;
    border: none;
    color: #fffef7;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
    text-align: left;
}

.sidebar-menu-item:hover {
    background: rgba(255, 255, 255, 0.12);
}

.sidebar-menu-item > i:first-child {
    width: 24px;
    text-align: center;
    font-size: 1rem;
    color: #ffffff;
    flex-shrink: 0;
}

.expand-icon {
    margin-left: auto;
    font-size: 0.75rem;
    transition: transform 0.25s ease;
}

.sidebar-menu-item.expanded .expand-icon {
    transform: rotate(180deg);
}
```

### 子菜单（语言列表）

```css
.sidebar-submenu {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition:
        max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1),
        opacity 0.25s ease;
}

.sidebar-submenu.expanded {
    max-height: 200px;
    opacity: 1;
}

.sidebar-submenu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px 10px 56px; /* 缩进以与父级图标对齐 */
    cursor: pointer;
    font-size: 0.95rem;
    color: #e8e8ec;
    transition: background-color 0.2s ease;
}

.sidebar-submenu-item:hover {
    background: rgba(255, 255, 255, 0.10);
}

.sidebar-submenu-item.selected {
    background: rgba(255, 255, 255, 0.18);
}

.check-icon {
    opacity: 0;
    width: 16px;
    color: #4fc3f7;
    flex-shrink: 0;
    transition: opacity 0.15s ease;
}

.sidebar-submenu-item.selected .check-icon {
    opacity: 1;
}
```

## 错误处理

- **头像图片加载失败**：`sidebar-avatar` 使用与首页头像相同的 `src`；浏览器会显示破损图片图标。可接受——无需额外回退。
- **遮罩层 z-index 冲突**：侧边栏面板使用 `z-dock + 1`，遮罩层使用 `z-dock`。与现有弹窗/底部面板的层级体系一致。

## 测试计划

1. **视口切换**：在移动端宽度打开侧边栏，然后调整到桌面端（>900px）。侧边栏应自动关闭，桌面 Dock 应出现。
2. **语言展开**：点击“语言”→ 子菜单以滑入方式展开。再次点击 → 折叠。选择语言后关闭整个侧边栏。
3. **主题切换**：点击主题行 → 主题立即切换（如果支持，使用与桌面端相同的 `startViewTransition`）。
4. **设置导航**：点击设置行 → 导航到 `/settings`。
5. **遮罩层点击**：点击侧边栏外的暗色区域 → 侧边栏关闭。
6. **头像点击**：侧边栏关闭时点击头像 → 侧边栏打开。侧边栏打开时再次点击头像 → 无特殊行为（遮罩层会处理外部点击，但头像在页面内部；可以让点击冒泡或显式关闭）。

## 关键决策

- **为什么从左滑入？** 符合常见的移动端导航模式（汉堡菜单通常从左侧滑出）。头像位于粘性标题的左侧，因此左滑入在空间感知上更连贯。
- **为什么内联语言列表？** 避免第二层遮罩/面板。单层结构更简单、更快速。
- **为什么移除头像回顶功能？** 现有的 `handleClick` 仅在 `scrollTop > 50` 时触发。在默认视口（scrollTop ≤ 50）时它什么都不做，这正是用户当前体验到的。用侧边栏打开替换它是在功能上的净增益。
- **为什么 72vw / 最大 300px？** 足够宽以容纳文字 + 图标，又足够窄以保持遮罩层背后的上下文可见。

## 受影响文件

| 文件 | 变更 |
|------|--------|
| `src/components/MobileDockSidebar.tsx` | **新增** — 侧边栏组件 |
| `src/components/HomepageApp.tsx` | 导入并渲染 `MobileDockSidebar`；为 `avatar-box` 添加 `onClick` |
| `src/styles/dock.css` | 添加移动端侧边栏样式；隐藏现有移动端 Dock 元素 |
| `src/lib/runtime-effects.ts` | 移除头像点击回顶处理程序 |

## 回滚

如果出现问题，回滚上述四个文件即可。桌面端体验不受影响，将继续正常工作。
