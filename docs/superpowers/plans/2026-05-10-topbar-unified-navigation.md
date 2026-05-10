# TopBar 统一导航栏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `compressed-header` 和右面板 `NavigationDock` 合并为一个固定顶部的 `TopBar` 组件，滚动时左侧渐显头像+名字，右侧 Dock 图标始终可见。

**Architecture:** 新建 `TopBar.tsx` 组件接收 `scrollProgress` accessor 和 `onMobileMenuOpen` 回调，在桌面端驱动左侧渐隐/渐显，在移动端仅显示头像+名字用于触发侧边栏。HomepageApp 移除旧的 compressed-header 和 NavigationDock 实例，改为接入 TopBar。

**Tech Stack:** SolidJS + TypeScript + CSS custom properties

---

### Task 1: Create topbar.css

**Files:**
- Create: `src/styles/topbar.css`

- [ ] **Step 1: Write the CSS file**

```css
/* ========================================
   TopBar 统一导航栏样式
   ======================================== */

.top-bar {
    position: fixed;
    top: 16px;
    left: 16px;
    right: 16px;
    height: 56px;
    background: var(--dock-bg);
    backdrop-filter: blur(30px) saturate(180%);
    -webkit-backdrop-filter: blur(30px) saturate(180%);
    border: 1px solid var(--panel-border);
    border-radius: 14px;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    box-sizing: border-box;
}

.top-bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    transition: opacity 0.3s var(--curve-delicate);
}

.top-bar-avatar {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid var(--avatar-frame-color);
    overflow: hidden;
    flex-shrink: 0;
    object-fit: cover;
    display: block;
}

.top-bar-name {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.top-bar-right {
    display: flex;
    align-items: center;
    gap: 2px;
}

.top-bar-dock-item {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--fg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transform-origin: center center;
    will-change: transform;
    transition: color 0.3s ease;
    font-size: 14px;
    position: relative;
}

.top-bar-dock-item:hover {
    color: var(--dock-item-hover-fg, #fff);
    background: var(--dock-item-hover-bg, rgba(128, 128, 128, 0.2));
}

.top-bar-dock-item.active {
    color: var(--dock-item-active-fg, #fff);
    background: var(--dock-item-active-bg, rgba(64, 128, 255, 0.3));
}

.top-bar-dock-item.disabled {
    opacity: 0.3;
    pointer-events: none;
}

/* Language popup positioned relative to top-bar button */
.top-bar-language-popup {
    position: fixed;
    background: var(--dock-bg);
    backdrop-filter: blur(40px) saturate(220%);
    -webkit-backdrop-filter: blur(40px) saturate(220%);
    border: 1px solid var(--dock-border);
    border-radius: 16px;
    padding: 8px;
    min-width: 160px;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
    z-index: 3000;
    opacity: 0;
    transform: translateX(-50%) translateY(-6px) scale(0.96);
    pointer-events: none;
    transition:
        opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
        transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.top-bar-language-popup[data-open] {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
    pointer-events: auto;
}

.top-bar-popup-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--fg);
    opacity: 0.5;
    padding: 6px 12px 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.top-bar-popup-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 10px;
    cursor: pointer;
    color: var(--fg);
    font-size: 0.9rem;
    transition: background 0.15s ease;
}

.top-bar-popup-option:hover {
    background: rgba(128, 128, 128, 0.15);
}

.top-bar-popup-option.selected {
    font-weight: 600;
}

.top-bar-popup-option .check-icon {
    width: 16px;
    opacity: 0;
    transition: opacity 0.15s ease;
}

.top-bar-popup-option.selected .check-icon {
    opacity: 1;
}

@media (max-width: 900px) {
    .top-bar {
        top: 0;
        left: 0;
        right: 0;
        border-radius: 0;
        border-top: none;
        border-left: none;
        border-right: none;
        padding: 0 20px;
    }

    .top-bar-right {
        display: none;
    }

    .top-bar-left {
        cursor: pointer;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/topbar.css
git commit -m "feat: add topbar.css styles"
```

---

### Task 2: Create TopBar.tsx component

**Files:**
- Create: `src/components/TopBar.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { createSignal, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { Accessor } from 'solid-js';
import type { Locale } from '../data/i18n';
import { getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel } from '../lib/dock';
import type { I18nContext } from '../lib/i18n';
import { applyTheme, getCurrentTheme, getStoredTheme, subscribeThemeChange } from '../lib/i18n';
import type { SiteConfig } from '../types/site';
import { Icon } from './Icon';

interface TopBarProps {
    config: SiteConfig;
    i18n: I18nContext;
    scrollProgress: Accessor<number>;
    onMobileMenuOpen: () => void;
}

export function TopBar(props: TopBarProps) {
    const { locale, setLocale, t } = props.i18n;
    const [isDark, setIsDark] = createSignal(false);
    const [activePanel, setActivePanel] = createSignal<string | null>(null);

    let barRef: HTMLDivElement | undefined;
    let popupRef: HTMLDivElement | undefined;
    let languageBtnRef: HTMLButtonElement | undefined;
    let outsideClickCleanup: (() => void) | undefined;

    const isMobile = () => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(max-width: 900px)').matches;
    };

    const leftOpacity = () => {
        if (isMobile()) return 1;
        const sp = props.scrollProgress();
        if (sp <= 0.15) return 0;
        if (sp >= 0.4) return 1;
        return (sp - 0.15) / 0.25;
    };

    onMount(() => {
        const theme = getCurrentTheme();
        setIsDark(theme === 'dark');
        applyTheme(theme);

        const unsubscribeThemeChange = subscribeThemeChange((newTheme) => {
            setIsDark(newTheme === 'dark');
        });
        onCleanup(unsubscribeThemeChange);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = (e: MediaQueryListEvent) => {
            if (!getStoredTheme()) {
                const newTheme = e.matches ? 'dark' : 'light';
                setIsDark(newTheme === 'dark');
                applyTheme(newTheme);
            }
        };
        mediaQuery.addEventListener('change', handleMediaChange);
        onCleanup(() => mediaQuery.removeEventListener('change', handleMediaChange));

        if (!isMobile()) {
            setupIconMagnifyHover();
        }
    });

    function handleAction(action: string) {
        switch (action) {
            case 'toggleTheme':
                toggleTheme();
                break;
            default:
                console.warn(`[TopBar] Unsupported action: "${action}".`);
        }
    }

    function handlePanel(panel: string) {
        switch (panel) {
            case 'language':
                toggleLanguagePanel();
                break;
            default:
                console.warn(`[TopBar] Unsupported panel: "${panel}".`);
        }
    }

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

    function isPopupOpen() {
        return popupRef?.hasAttribute('data-open') ?? false;
    }

    function toggleLanguagePanel() {
        setOpen(!isPopupOpen());
    }

    function setOpen(open: boolean) {
        if (outsideClickCleanup) {
            outsideClickCleanup();
            outsideClickCleanup = undefined;
        }

        if (open) {
            updatePopupPosition();
            popupRef?.setAttribute('data-open', '');
            setActivePanel('language');
            setupOutsideClick();
        } else {
            popupRef?.removeAttribute('data-open');
            setActivePanel(null);
        }
    }

    function updatePopupPosition() {
        if (!languageBtnRef || !popupRef) return;
        const rect = languageBtnRef.getBoundingClientRect();
        popupRef.style.left = `${rect.left + rect.width / 2}px`;
        popupRef.style.top = `${rect.bottom + 8}px`;
    }

    function selectLanguage(lang: Locale) {
        setLocale(lang);
        setOpen(false);
    }

    function setupOutsideClick() {
        window.setTimeout(() => {
            const handler = (e: MouseEvent) => {
                const target = e.target as Node;
                const clickedInsideBar = barRef?.contains(target) ?? false;
                const clickedInsidePopup = popupRef?.contains(target) ?? false;

                if (!clickedInsideBar && !clickedInsidePopup) {
                    setOpen(false);
                }
            };
            document.addEventListener('click', handler);
            outsideClickCleanup = () => document.removeEventListener('click', handler);
        }, 0);
    }

    function setupIconMagnifyHover() {
        if (!barRef) return;
        const items = barRef.querySelectorAll('.top-bar-dock-item') as NodeListOf<HTMLElement>;
        if (items.length === 0) return;

        let frameId: number | null = null;
        let latestMouseX = 0;

        const updateScales = () => {
            if (!barRef) {
                frameId = null;
                return;
            }

            const rect = barRef.getBoundingClientRect();
            items.forEach((item) => {
                const itemRect = item.getBoundingClientRect();
                const itemCenter = itemRect.left - rect.left + itemRect.width / 2;
                const distance = Math.abs(latestMouseX - itemCenter);
                const scale = 1 + 0.12 * Math.exp(-(distance * distance) / (2 * 30 * 30));
                item.style.transform = `scale(${scale})`;
            });
            frameId = null;
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = barRef!.getBoundingClientRect();
            latestMouseX = e.clientX - rect.left;

            if (frameId === null) {
                frameId = window.requestAnimationFrame(updateScales);
            }
        };

        const handleMouseLeave = () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
                frameId = null;
            }

            items.forEach((item) => {
                item.style.transform = '';
            });
        };

        barRef.addEventListener('mousemove', handleMouseMove);
        barRef.addEventListener('mouseleave', handleMouseLeave);
        onCleanup(() => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            barRef?.removeEventListener('mousemove', handleMouseMove);
            barRef?.removeEventListener('mouseleave', handleMouseLeave);
        });
    }

    onCleanup(() => {
        if (outsideClickCleanup) {
            outsideClickCleanup();
        }
    });

    const locales = () => props.config.i18n.locales;

    return (
        <>
            <div ref={barRef} class="top-bar" role="toolbar" aria-label="Top navigation">
                <div
                    class="top-bar-left"
                    style={{ opacity: leftOpacity() }}
                    onClick={() => {
                        if (isMobile()) {
                            props.onMobileMenuOpen();
                        }
                    }}
                    role={isMobile() ? 'button' : undefined}
                    aria-label={isMobile() ? 'Open menu' : undefined}
                >
                    <img
                        class="top-bar-avatar"
                        src={props.config.profile.avatar}
                        alt=""
                        width="32"
                        height="32"
                    />
                    <span class="top-bar-name">{props.config.profile.name}</span>
                </div>

                <div class="top-bar-right">
                    {props.config.dock.items.map((item) => {
                        if (item.type === 'divider') {
                            return null;
                        }

                        const display = item.display;
                        const label = () => resolveDockLabel(display, t);
                        const active = () =>
                            getDockItemActiveState(item, { isDark: isDark(), activePanel: activePanel() });
                        const iconClass = () => resolveDockIcon(display, active());

                        if (item.type === 'action') {
                            return (
                                <button
                                    class="top-bar-dock-item"
                                    classList={{ active: active() }}
                                    onClick={() => handleAction(item.action)}
                                    title={label()}
                                    aria-label={label()}
                                >
                                    <Icon name={iconClass()} />
                                </button>
                            );
                        }

                        if (item.type === 'panel') {
                            return (
                                <button
                                    ref={item.panel === 'language' ? (el) => (languageBtnRef = el) : undefined}
                                    class="top-bar-dock-item"
                                    classList={{ active: active() }}
                                    onClick={() => handlePanel(item.panel)}
                                    title={label()}
                                    aria-label={label()}
                                >
                                    <Icon name={iconClass()} />
                                </button>
                            );
                        }

                        const disabled = isDockLinkDisabled(item.href);
                        return (
                            <button
                                class="top-bar-dock-item"
                                classList={{ active: false, disabled }}
                                onClick={() => {
                                    if (disabled) return;
                                    if (item.openInNewTab) {
                                        window.open(item.href, '_blank', 'noopener,noreferrer');
                                    } else {
                                        window.location.href = item.href;
                                    }
                                }}
                                title={label()}
                                aria-label={label()}
                            >
                                <Icon name={iconClass()} />
                            </button>
                        );
                    })}
                </div>
            </div>

            <Portal>
                <div
                    ref={popupRef}
                    class="top-bar-language-popup"
                    role="dialog"
                    aria-label="Language selection"
                >
                    <div class="top-bar-popup-title">{t('dock.language')}</div>
                    {locales().map((lang) => (
                        <div
                            class="top-bar-popup-option"
                            classList={{ selected: locale() === lang }}
                            onClick={() => selectLanguage(lang)}
                            role="option"
                            aria-selected={locale() === lang}
                        >
                            <Icon name="check" class="check-icon" />
                            <span>{t(`dock.lang.${lang}`)}</span>
                        </div>
                    ))}
                </div>
            </Portal>
        </>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TopBar.tsx
git commit -m "feat: add TopBar unified navigation component"
```

---

### Task 3: Modify HomepageApp.tsx

**Files:**
- Modify: `src/components/HomepageApp.tsx`

- [ ] **Step 1: Edit imports — replace NavigationDock with TopBar**

```
oldString: import { NavigationDock } from './NavigationDock';
import { MobileDockSidebar } from './MobileDockSidebar';
import { LoadingOverlay } from './LoadingOverlay';
import { SocialLinks } from './SocialLinks';
import { TypewriterSlogan } from './TypewriterSlogan';
```

```
newString: import { MobileDockSidebar } from './MobileDockSidebar';
import { LoadingOverlay } from './LoadingOverlay';
import { SocialLinks } from './SocialLinks';
import { TopBar } from './TopBar';
import { TypewriterSlogan } from './TypewriterSlogan';
```

- [ ] **Step 2: Add heroAvatarNameOpacity signal**

```
oldString:     const [scrollProgress, setScrollProgress] = createSignal(0);

    let containerRef: HTMLElement | undefined;
```

```
newString:     const [scrollProgress, setScrollProgress] = createSignal(0);

    const heroAvatarNameOpacity = () => {
        const sp = scrollProgress();
        if (sp <= 0.15) return 1;
        if (sp >= 0.4) return 0;
        return 1 - (sp - 0.15) / 0.25;
    };

    let containerRef: HTMLElement | undefined;
```

- [ ] **Step 3: Replace compressed-header div with TopBar**

```
oldString:             <div class={`compressed-header ${scrollProgress() > 0.4 ? 'visible' : ''}`}>
                <div class="header-avatar">
                    <img src={siteConfig.profile.avatar} alt="Avatar" />
                </div>
                <div class="header-name">{siteConfig.profile.name}</div>
            </div>

            <div class="page-scroller" ref={viewportRef}>
```

```
newString:             <TopBar
                config={siteConfig}
                i18n={i18n}
                scrollProgress={scrollProgress}
                onMobileMenuOpen={() => setMobileDockOpen(true)}
            />

            <div class="page-scroller" ref={viewportRef}>
```

- [ ] **Step 4: Add opacity to avatar-box div**

```
oldString:                                     <div
                                        class="avatar-box"
                                        id="avatarBox"
                                        ref={(element) => (avatarRef = element)}
```

```
newString:                                     <div
                                        class="avatar-box"
                                        id="avatarBox"
                                        ref={(element) => (avatarRef = element)}
                                        style={{ opacity: heroAvatarNameOpacity() }}
```

- [ ] **Step 5: Add opacity to name h1**

```
oldString:                                     <h1 class="name">
```

```
newString:                                     <h1 class="name" style={{ opacity: heroAvatarNameOpacity() }}>
```

- [ ] **Step 6: Remove NavigationDock from right-panel**

```
oldString:                                 <NavigationDock config={siteConfig} i18n={i18n} />
                                <MobileDockSidebar
```

```
newString:                                 <MobileDockSidebar
```

- [ ] **Step 7: Commit**

```bash
git add src/components/HomepageApp.tsx
git commit -m "feat: integrate TopBar into HomepageApp, remove old compressed-header and NavigationDock"
```

---

### Task 4: Clean up transitions.css

**Files:**
- Modify: `src/styles/transitions.css`

- [ ] **Step 1: Remove compressed-header styles (lines 48-101)**

Remove these lines from `/* 压缩 Header */` through the last `.header-name` closing brace:

```
oldString: /* 压缩 Header */
.compressed-header {
    position: fixed;
    top: 16px;
    left: 16px;
    right: 16px;
    height: 56px;
    background: var(--dock-bg);
    backdrop-filter: blur(30px) saturate(180%);
    -webkit-backdrop-filter: blur(30px) saturate(180%);
    border: 1px solid var(--panel-border);
    border-radius: 14px;
    z-index: 2000;
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 12px;
    transform: translateY(-120%);
    opacity: 0;
    transition:
        transform 0.6s var(--curve-delicate),
        opacity 0.6s var(--curve-delicate);
}

.compressed-header.visible {
    transform: translateY(0);
    opacity: 1;
}

.header-avatar {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid var(--avatar-frame-color);
    overflow: hidden;
    flex-shrink: 0;
}

.header-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.header-name {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
```

```
newString:
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/transitions.css
git commit -m "refactor: remove compressed-header styles from transitions.css"
```

---

### Task 5: Update BaseLayout.astro

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Import topbar.css**

```
oldString: import '../styles/dock.css';
```

```
newString: import '../styles/dock.css';
import '../styles/topbar.css';
```

- [ ] **Step 2: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat: import topbar.css in BaseLayout"
```

---

### Task 6: Add tests

**Files:**
- Create: `tests/topbar-component.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const topbarComponent = readFileSync(join(import.meta.dirname, '..', 'src', 'components', 'TopBar.tsx'), 'utf-8');

describe('TopBar unified navigation component', () => {
    it('renders a fixed top bar with avatar, name, and dock items', () => {
        assert.match(topbarComponent, /class="top-bar"/);
        assert.match(topbarComponent, /class="top-bar-left"/);
        assert.match(topbarComponent, /class="top-bar-avatar"/);
        assert.match(topbarComponent, /class="top-bar-name"/);
        assert.match(topbarComponent, /class="top-bar-right"/);
    });

    it('supports theme toggle via dock action items', () => {
        assert.match(topbarComponent, /case 'toggleTheme'/);
        assert.match(topbarComponent, /toggleTheme\(\)/);
        assert.match(topbarComponent, /if \(typeof doc\.startViewTransition === 'function'\)/);
    });

    it('supports language panel with popup portal', () => {
        assert.match(topbarComponent, /case 'language'/);
        assert.match(topbarComponent, /toggleLanguagePanel\(\)/);
        assert.match(topbarComponent, /class="top-bar-language-popup"/);
        assert.match(topbarComponent, /import \{ Portal \} from 'solid-js\/web'/);
    });

    it('uses dock lib helpers for item rendering', () => {
        assert.match(topbarComponent, /getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel/);
        assert.match(topbarComponent, /resolveDockLabel\(display, t\)/);
        assert.match(topbarComponent, /resolveDockIcon\(display, active\(\)\)/);
        assert.match(topbarComponent, /getDockItemActiveState\(item, \{ isDark: isDark\(\), activePanel: activePanel\(\) \}\)/);
    });

    it('supports link items with new tab option', () => {
        assert.match(topbarComponent, /item\.openInNewTab/);
        assert.match(topbarComponent, /window\.open\(item\.href, '_blank', 'noopener,noreferrer'\)/);
    });

    it('respects disabled state for dock links', () => {
        assert.match(topbarComponent, /isDockLinkDisabled\(item\.href\)/);
        assert.match(topbarComponent, /if \(disabled\) return;/);
    });

    it('computes left opacity from scroll progress on desktop', () => {
        assert.match(topbarComponent, /const leftOpacity = \(\) => \{/);
        assert.match(topbarComponent, /const sp = props\.scrollProgress\(\);/);
        assert.match(topbarComponent, /if \(sp <= 0\.15\) return 0;/);
        assert.match(topbarComponent, /if \(sp >= 0\.4\) return 1;/);
        assert.match(topbarComponent, /return \(sp - 0\.15\) \/ 0\.25;/);
    });

    it('exposes onMobileMenuOpen callback for mobile avatar click', () => {
        assert.match(topbarComponent, /onMobileMenuOpen: \(\) => void/);
        assert.match(topbarComponent, /props\.onMobileMenuOpen\(\)/);
    });

    it('has outside click cleanup for language popup', () => {
        assert.match(topbarComponent, /let outsideClickCleanup: \(\(\) => void\) \| undefined/);
        assert.match(topbarComponent, /setupOutsideClick\(\)/);
        assert.match(topbarComponent, /document\.addEventListener\('click', handler\)/);
    });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

- [ ] **Step 3: Commit**

```bash
git add tests/topbar-component.test.ts
git commit -m "test: add TopBar component tests"
```

---

### Task 7: Run full verification pipeline

**Files:** None (verification only)

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

- [ ] **Step 2: Run format check**

```bash
npm run format:check
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

- [ ] **Step 4: Run Astro check**

```bash
npm run check
```

- [ ] **Step 5: Run build**

```bash
npm run build
```
