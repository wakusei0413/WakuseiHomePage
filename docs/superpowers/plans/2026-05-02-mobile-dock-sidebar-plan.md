# 移动端 Dock 侧边栏实现计划

> **面向智能体开发者：** 推荐子技能：superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 按任务逐步执行。步骤使用复选框（`- [ ]`）语法以便追踪。

**目标：** 在 ≤900px 视口下用左侧滑出侧边栏替代移动端 Dock，通过点击头像触发，内含图标+文字菜单及内联展开的语言列表。

**架构：** 新建 `MobileDockSidebar` 受控组件（props: open/onClose），通过 SolidJS Portal 挂载到 body。`HomepageApp` 管理 `mobileDockOpen` signal 并将头像 `onClick` 与之连接。桌面端 `ControlDock` 不受影响。`runtime-effects.ts` 移除旧的头像点击回顶逻辑。

**技术栈：** SolidJS (TypeScript), Portal, CSS transitions, `backdrop-filter`

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/components/MobileDockSidebar.tsx` | **新建** — 移动端侧边栏组件，含主题切换、语言展开、设置导航 |
| `src/components/HomepageApp.tsx` | **修改** — 添加头像 `onClick` handler，渲染 `MobileDockSidebar` |
| `src/styles/dock.css` | **修改** — 隐藏移动端 `.control-dock`/`.dock-bottom-sheet`/`.dock-overlay`，添加 `.mobile-dock-sidebar` 及子元素样式 |
| `src/lib/runtime-effects.ts` | **修改** — 从 `initMobileStickyAvatar` 中移除 `handleClick` 回顶逻辑 |

---

## 任务 1：从 `runtime-effects.ts` 中移除头像点击回顶逻辑

**文件：**
- 修改：`src/lib/runtime-effects.ts`

- [ ] **步骤 1：编辑 `initMobileStickyAvatar`，移除 `handleClick` 及其事件监听**

  ```typescript
  export function initMobileStickyAvatar(container: HTMLElement, avatarBox: HTMLElement) {
      let isMobile = window.matchMedia('(max-width: 900px)').matches;

      const handleScroll = () => {
          if (!isMobile) {
              return;
          }

          if (container.scrollTop > 50) {
              avatarBox.classList.add('scrolled');
          } else {
              avatarBox.classList.remove('scrolled');
          }
      };

      const handleResize = () => {
          isMobile = window.matchMedia('(max-width: 900px)').matches;

          if (!isMobile) {
              avatarBox.classList.remove('scrolled');
          }
      };

      container.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);

      return () => {
          container.removeEventListener('scroll', handleScroll);
          window.removeEventListener('resize', handleResize);
      };
  }
  ```

  说明：仅移除 `handleClick` 函数及其 `avatarBox.addEventListener('click', handleClick)` 与清理代码。保留 `handleScroll` 和 `handleResize` 逻辑。

- [ ] **步骤 2：运行 lint 检查**

  ```bash
  npm run lint
  ```

  预期：无错误。

- [ ] **步骤 3：提交**

  ```bash
  git add src/lib/runtime-effects.ts
  git commit -m "refactor: remove avatar click scroll-to-top from mobile sticky avatar"
  ```

---

## 任务 2：创建 `MobileDockSidebar.tsx` 组件

**文件：**
- 创建：`src/components/MobileDockSidebar.tsx`

- [ ] **步骤 1：编写组件**

  ```tsx
  import { createSignal, onCleanup, onMount } from 'solid-js';
  import { Portal } from 'solid-js/web';
  import type { I18nContext } from '../lib/i18n';
  import { applyTheme, getStoredTheme, getSystemTheme } from '../lib/i18n';
  import type { SiteConfig } from '../types/site';
  import type { Locale } from '../data/i18n';

  interface MobileDockSidebarProps {
      config: SiteConfig;
      i18n: I18nContext;
      open: boolean;
      onClose: () => void;
  }

  export function MobileDockSidebar(props: MobileDockSidebarProps) {
      const { locale, setLocale, t } = props.i18n;
      const [isDark, setIsDark] = createSignal(false);
      const [isLanguageExpanded, setIsLanguageExpanded] = createSignal(false);

      let sidebarRef: HTMLDivElement | undefined;
      let outsideClickCleanup: (() => void) | undefined;

      onMount(() => {
          const storedTheme = getStoredTheme();
          const theme = storedTheme ?? getSystemTheme();
          setIsDark(theme === 'dark');

          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleMediaChange = (e: MediaQueryListEvent) => {
              if (!getStoredTheme()) {
                  setIsDark(e.matches);
              }
          };
          mediaQuery.addEventListener('change', handleMediaChange);
          onCleanup(() => mediaQuery.removeEventListener('change', handleMediaChange));
      });

      /* ===== Theme Toggle ===== */
      function toggleTheme() {
          const newTheme = isDark() ? 'light' : 'dark';
          setIsDark(newTheme === 'dark');

          const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown };
          if (typeof doc.startViewTransition === 'function') {
              doc.startViewTransition(() => {
                  applyTheme(newTheme);
              });
          } else {
              applyTheme(newTheme);
          }
      }

      /* ===== Language ===== */
      function selectLanguage(lang: Locale) {
          setLocale(lang);
          setIsLanguageExpanded(false);
          props.onClose();
      }

      /* ===== Outside Click ===== */
      function setupOutsideClick() {
          window.setTimeout(() => {
              const handler = (e: MouseEvent) => {
                  const target = e.target as Node;
                  const clickedInsideSidebar = sidebarRef?.contains(target) ?? false;
                  if (!clickedInsideSidebar) {
                      props.onClose();
                  }
              };
              document.addEventListener('click', handler);
              outsideClickCleanup = () => document.removeEventListener('click', handler);
          }, 0);
      }

      /* ===== Open/Close Side Effects ===== */
      onMount(() => {
          // Watch for prop changes to handle open/close side effects
          const checkOpen = () => {
              if (props.open) {
                  setupOutsideClick();
              } else {
                  if (outsideClickCleanup) {
                      outsideClickCleanup();
                      outsideClickCleanup = undefined;
                  }
              }
          };
          checkOpen();
      });

      onCleanup(() => {
          if (outsideClickCleanup) {
              outsideClickCleanup();
          }
      });

      const locales = () => props.config.i18n.locales;

      return (
          <Portal>
              <div
                  ref={sidebarRef}
                  class="mobile-dock-sidebar"
                  classList={{ 'data-open': props.open }}
                  role="dialog"
                  aria-label="Menu"
              >
                  <div class="sidebar-header">
                      <img
                          src={props.config.profile.avatar}
                          alt=""
                          class="sidebar-avatar"
                          decoding="async"
                      />
                      <span class="sidebar-name">{props.config.profile.name}</span>
                  </div>

                  <div class="sidebar-divider"></div>

                  <button class="sidebar-menu-item" onClick={toggleTheme}>
                      <i class={isDark() ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} aria-hidden="true"></i>
                      <span>{t('dock.theme')}</span>
                  </button>

                  <div class="sidebar-menu-group">
                      <button
                          class="sidebar-menu-item"
                          classList={{ expanded: isLanguageExpanded() }}
                          onClick={() => setIsLanguageExpanded(!isLanguageExpanded())}
                      >
                          <i class="fa-solid fa-globe" aria-hidden="true"></i>
                          <span>{t('dock.language')}</span>
                          <i class="fa-solid fa-chevron-down expand-icon" aria-hidden="true"></i>
                      </button>
                      <div class="sidebar-submenu" classList={{ expanded: isLanguageExpanded() }}>
                          {locales().map((lang) => (
                              <div
                                  class="sidebar-submenu-item"
                                  classList={{ selected: locale() === lang }}
                                  onClick={() => selectLanguage(lang)}
                                  role="option"
                                  aria-selected={locale() === lang}
                              >
                                  <span class="check-icon">✓</span>
                                  <span>{t(`dock.lang.${lang}`)}</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  <button
                      class="sidebar-menu-item"
                      onClick={() => {
                          window.location.href = '/settings';
                      }}
                  >
                      <i class="fa-solid fa-gear" aria-hidden="true"></i>
                      <span>{t('dock.settings')}</span>
                  </button>
              </div>

              <div
                  class="mobile-dock-sidebar-overlay"
                  classList={{ 'data-open': props.open }}
                  onClick={() => props.onClose()}
              ></div>
          </Portal>
      );
  }
  ```

  关键说明：
  - `classList={{ 'data-open': props.open }}` — 当 `props.open` 为 true 时添加 `data-open` 属性，CSS 用 `[data-open]` 选择器匹配。
  - `setupOutsideClick` 模式与 `ControlDock` 一致：setTimeout 延迟绑定避免立即触发。
  - `selectLanguage` 选择语言后自动关闭侧边栏。

- [ ] **步骤 2：运行 lint**

  ```bash
  npm run lint
  ```

  预期：无错误。

- [ ] **步骤 3：运行类型检查**

  ```bash
  npm run check
  ```

  预期：无 TypeScript 错误。

- [ ] **步骤 4：提交**

  ```bash
  git add src/components/MobileDockSidebar.tsx
  git commit -m "feat: add MobileDockSidebar component for mobile sidebar menu"
  ```

---

## 任务 3：修改 `HomepageApp.tsx` 集成侧边栏

**文件：**
- 修改：`src/components/HomepageApp.tsx`

- [ ] **步骤 1：添加导入和 signal**

  在现有导入下方添加：
  ```tsx
  import { MobileDockSidebar } from './MobileDockSidebar';
  ```

  在 `HomepageApp` 函数体内，在现有 signals 之后添加：
  ```tsx
  const [mobileDockOpen, setMobileDockOpen] = createSignal(false);
  ```

- [ ] **步骤 2：为 `avatar-box` 添加点击处理**

  修改现有的 `avatar-box` div：

  ```tsx
  <div
      class="avatar-box"
      id="avatarBox"
      ref={(element) => (avatarRef = element)}
      onClick={() => {
          if (window.matchMedia('(max-width: 900px)').matches) {
              setMobileDockOpen(true);
          }
      }}
  >
  ```

  注意：保留 `ref` 和现有子元素（`img`）不变。

- [ ] **步骤 3：在 JSX 中渲染 `MobileDockSidebar`**

  在 `</main>` 标签之前（即与 `ControlDock` 同一层级但放在 `main` 外部或内部视实现而定），添加：

  ```tsx
  <MobileDockSidebar
      config={siteConfig}
      i18n={i18n}
      open={mobileDockOpen()}
      onClose={() => setMobileDockOpen(false)}
  />
  ```

  放置位置：放在 `ControlDock` 旁边即可，因为两者都使用 Portal 挂载到 body，在 DOM 中的相对位置不影响最终渲染位置。

  完整 JSX 在 `right-panel` 内的结构：
  ```tsx
  <aside class="right-panel">
      <div class="wallpaper-scroll-area" ref={(element) => (wallpaperRef = element)}></div>
      <div class="right-panel-shadow"></div>
      <div class="info-panel">
          <ClockPanel config={siteConfig.time} i18n={i18n} />
      </div>
      <ControlDock config={siteConfig} i18n={i18n} />
  </aside>
  ```

  注意：`MobileDockSidebar` 由于使用 Portal，可以放在组件返回值的任何位置（甚至放在 `main` 外部）。为了代码组织清晰，建议直接放在 `ControlDock` 后面（仍在 `</>` fragment 内）：
  ```tsx
      <ControlDock config={siteConfig} i18n={i18n} />
      <MobileDockSidebar
          config={siteConfig}
          i18n={i18n}
          open={mobileDockOpen()}
          onClose={() => setMobileDockOpen(false)}
      />
  ```

- [ ] **步骤 4：运行 lint**

  ```bash
  npm run lint
  ```

- [ ] **步骤 5：运行类型检查**

  ```bash
  npm run check
  ```

- [ ] **步骤 6：提交**

  ```bash
  git add src/components/HomepageApp.tsx
  git commit -m "feat: wire avatar click to MobileDockSidebar on mobile"
  ```

---

## 任务 4：修改 `dock.css` 添加移动端侧边栏样式

**文件：**
- 修改：`src/styles/dock.css`

- [ ] **步骤 1：在 `@media (max-width: 900px)` 内隐藏现有移动端 Dock 元素**

  找到文件底部的 `@media (max-width: 900px)` 块。在其内部已有 `.control-dock` 规则的位置，添加隐藏规则（如果已有，确认它们不会影响桌面端）。

  在 `@media (max-width: 900px)` 开头添加：

  ```css
@media (max-width: 900px) {
    /* 隐藏桌面端 Dock 和移动端 bottom sheet */
    .control-dock,
    .dock-bottom-sheet,
    .dock-overlay {
        display: none !important;
    }
  ```

  说明：确保此规则在 `@media (max-width: 900px)` 内，且不影响桌面端。

- [ ] **步骤 2：在 `@media (max-width: 900px)` 底部添加侧边栏样式**

  在 `@media (max-width: 900px)` 块的末尾（`}` 之前），追加以下全部 CSS：

  ```css
    /* ===== Mobile Sidebar ===== */
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

    /* Overlay */
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

    /* Header */
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

    /* Divider */
    .sidebar-divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.15);
        margin: 0 16px 12px;
    }

    /* Menu item */
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

    /* Submenu (language list) */
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

  注意：确保所有新增规则都在 `@media (max-width: 900px) { ... }` 内部。

- [ ] **步骤 3：运行 lint 和格式检查**

  ```bash
  npm run lint
  npm run format:check
  ```

- [ ] **步骤 4：运行 build**

  ```bash
  npm run build
  ```

  预期：构建成功。

- [ ] **步骤 5：提交**

  ```bash
  git add src/styles/dock.css
  git commit -m "style: add mobile dock sidebar styles and hide mobile dock elements"
  ```

---

## 任务 5：验证与最终检查

- [ ] **步骤 1：运行完整验证**

  ```bash
  npm run lint
  npm run format:check
  npm run check
  npm run build
  ```

  预期：全部通过。

- [ ] **步骤 2：手动测试检查清单**

  使用浏览器开发者工具模拟移动端（≤900px）：
  1. 点击头像 → 侧边栏从左侧滑入，遮罩层出现。
  2. 点击遮罩层 → 侧边栏滑出。
  3. 点击"语言"→ 语言列表向下展开，箭头图标旋转 180°。
  4. 选择一种语言 → 侧边栏关闭，页面语言切换。
  5. 点击主题 → 主题立即切换。
  6. 点击设置 → 导航到 `/settings`。
  7. 切换到桌面端（>900px）→ Dock 正常显示在右下角，侧边栏不可见。

- [ ] **步骤 3：最终提交（如有未提交的变更）**

  ```bash
  git status
  ```

  如有剩余变更：
  ```bash
  git add .
  git commit -m "feat: mobile dock sidebar ready"
  ```

---

## 自我审查

### 规格覆盖检查

| 规格要求 | 对应任务 |
|----------|----------|
| 左侧滑出侧边栏 | 任务 2 (`MobileDockSidebar.tsx`) + 任务 4 (CSS transform) |
| 头像点击触发 | 任务 3 (`HomepageApp.tsx` `onClick`) |
| 图标 + 文字菜单 | 任务 2 (JSX 结构) + 任务 4 (`.sidebar-menu-item`) |
| 语言列表内联展开 | 任务 2 (`isLanguageExpanded` + `sidebar-submenu`) + 任务 4 (max-height transition) |
| 遮罩层点击关闭 | 任务 2 (overlay `onClick`) + 任务 4 (`.mobile-dock-sidebar-overlay`) |
| 桌面端不受影响 | 任务 4 (`@media` 包裹) + 任务 1 (仅移除移动端 click) |
| 主题切换 | 任务 2 (`toggleTheme`) |
| 设置导航 | 任务 2 (`window.location.href`) |
| 深色模式样式 | 任务 4 (背景色 `rgba(10,10,22,0.72)` 与 Dock popup 一致) |

无遗漏。

### 占位符扫描

计划中无 "TBD"、"TODO"、"implement later"、"similar to Task N"。所有代码块均包含完整实现。

### 类型一致性

- `MobileDockSidebarProps` 使用与 `ControlDockProps` 相同的 `SiteConfig` 和 `I18nContext` 类型。
- `locale()`、`setLocale` 调用与 `ControlDock` 完全一致。
- `selectLanguage` 使用 `Locale` 类型。

无类型不一致。

---

**计划完成，保存至 `docs/superpowers/plans/2026-05-02-mobile-dock-sidebar-plan.md`。**

## 执行选项

**1. 子智能体驱动（推荐）** — 每个任务分配一个独立的子智能体，任务间审查，快速迭代

**2. 内联执行** — 在当前会话中使用 executing-plans 技能按顺序执行，批量处理并设置检查点

**请选择您偏好的执行方式？**
