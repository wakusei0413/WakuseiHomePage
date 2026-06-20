# Unified TopBar — Flex + Width Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the split translateX TopBar with a single cohesive flex-driven bar where the left section expands via `width`, and absorb MobileDockSidebar into TopBar.

**Architecture:** Single TopBar component renders two modes: desktop (flex bar with width-driven left expansion) and mobile (bar + sidebar drawer). MobileDockSidebar is deleted; its logic merges into TopBar. CSS switches from transform hacks to `width` + `overflow: hidden` on `.top-bar-left` and `margin-left: auto` on `.top-bar-right`.

**Tech Stack:** Vue 3 Composition API, TypeScript, CSS custom properties, Vitest

---

### Task 1: Write failing tests for new layout logic

**Files:**
- Modify: `tests/topbar-component.test.ts`

- [ ] **Step 1: Replace old transform-based assertions with flex-width assertions**

The test file currently asserts on `barStyle`/`rightStyle`/`leftStyle` computed names and translateX patterns. Replace those with assertions for `--left-width` CSS variable, no translateX on bar, and `margin-left: auto` on right section.

Replace the existing test content in `tests/topbar-component.test.ts` with:

```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const topbarComponent = readFileSync(join(process.cwd(), 'src', 'components', 'TopBar.vue'), 'utf-8');

describe('TopBar unified navigation component', () => {
    it('renders a fixed top bar with avatar, name, and dock items', () => {
        expect(topbarComponent).toMatch(/class="top-bar"/);
        expect(topbarComponent).toMatch(/class="top-bar-left"/);
        expect(topbarComponent).toMatch(/class="top-bar-avatar"/);
        expect(topbarComponent).toMatch(/class="top-bar-name"/);
        expect(topbarComponent).toMatch(/class="top-bar-right"/);
    });

    it('supports theme toggle via dock action items', () => {
        expect(topbarComponent).toMatch(/case 'toggleTheme'/);
        expect(topbarComponent).toMatch(/toggleTheme\(\)/);
        expect(topbarComponent).toMatch(/import.*useTheme.*from/);
    });

    it('supports language panel with popup', () => {
        expect(topbarComponent).toMatch(/case 'language'/);
        expect(topbarComponent).toMatch(/toggleLanguagePanel\(\)/);
        expect(topbarComponent).toMatch(/class="top-bar-language-popup"/);
    });

    it('uses dock lib helpers for item rendering', () => {
        expect(topbarComponent).toMatch(
            /getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel/
        );
        expect(topbarComponent).toMatch(/resolveDockLabel\(display, t\)/);
        expect(topbarComponent).toMatch(/resolveDockIcon\(display, active\)/);
    });

    it('supports link items with new tab option', () => {
        expect(topbarComponent).toMatch(/openInNewTab/);
        expect(topbarComponent).toMatch(/target="_blank"/);
        expect(topbarComponent).toMatch(/rel="noopener noreferrer"/);
    });

    it('respects disabled state for dock links', () => {
        expect(topbarComponent).toMatch(/isDockLinkDisabled/);
        expect(topbarComponent).toMatch(/isDockLinkDisabled\(item\.href\)/);
        expect(topbarComponent).toMatch(/e\.preventDefault\(\)/);
    });

    it('uses expansion progress to drive --left-width CSS variable', () => {
        expect(topbarComponent).toMatch(/const expansionProgress = computed\(\(\) =>/);
        expect(topbarComponent).toMatch(/--left-width/);
        expect(topbarComponent).toMatch(/var\(--left-panel-width\)/);
    });

    it('does not use translateX for bar layout', () => {
        expect(topbarComponent).not.toMatch(/barStyle/);
        expect(topbarComponent).not.toMatch(/rightStyle/);
        expect(topbarComponent).not.toMatch(/leftStyle/);
        expect(topbarComponent).not.toMatch(/translateX\(calc\(var\(--left-panel-width/);
    });

    it('opens mobile sidebar on avatar click', () => {
        expect(topbarComponent).toMatch(/openSidebar\(\)/);
    });

    it('uses anchor navigation for desktop home click to preserve transitions', () => {
        expect(topbarComponent).toMatch(/href="\/"/);
        expect(topbarComponent).not.toMatch(/window\.location\.href = '\/'/);
        expect(topbarComponent).toMatch(/const isCurrentHome = window\.location\.pathname === '\/';/);
        expect(topbarComponent).toMatch(/if \(isCurrentHome && s\) \{/);
    });

    it('scrolls the active page scroller for repeated same-route dock clicks', () => {
        expect(topbarComponent).toMatch(/function scrollCurrentPageToTop\(\)/);
        expect(topbarComponent).toMatch(/document\.querySelector\('\.page-scroller'\)/);
        expect(topbarComponent).toMatch(/s\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\)/);
        expect(topbarComponent).toMatch(/window\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\)/);
    });

    it('accepts initialIsHomePage prop for SSR snapshot', () => {
        expect(topbarComponent).toMatch(/initialIsHomePage: boolean/);
    });

    it('has outside click cleanup for language popup', () => {
        expect(topbarComponent).toMatch(/outsideClickCleanup/);
        expect(topbarComponent).toMatch(/setupOutsideClick\(\)/);
        expect(topbarComponent).toMatch(/document\.addEventListener\('click', handler\)/);
    });

    it('renders mobile sidebar mode within the same component', () => {
        expect(topbarComponent).toMatch(/class="top-bar-sidebar"/);
        expect(topbarComponent).toMatch(/class="top-bar-sidebar-overlay"/);
        expect(topbarComponent).toMatch(/isMobile/);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/topbar-component.test.ts`
Expected: FAIL — assertions for `--left-width`, no `barStyle`/`rightStyle`/`leftStyle`, `top-bar-sidebar` class don't match current code.

---

### Task 2: Rewrite TopBar.vue script — replace transform with width-driven layout

**Files:**
- Modify: `src/components/TopBar.vue`

- [ ] **Step 1: Replace barStyle/rightStyle/leftStyle with leftWidthStyle**

In the `<script setup>` section, delete the three old computed properties (`barStyle`, `rightStyle`, `leftStyle` at lines 89-109) and add one new one:

```typescript
const leftWidthStyle = computed(() => {
    const p = expansionProgress.value;
    return `--left-width: calc(${p} * var(--left-panel-width, 500px))`;
});
```

- [ ] **Step 2: Add mobile sidebar state**

After the existing refs (around line 26-31), add:

```typescript
const sidebarOpen = ref(false);
const sidebarRef = ref<HTMLDivElement>();
let sidebarOutsideClickCleanup: (() => void) | undefined;
let sidebarOutsideClickTimer: ReturnType<typeof setTimeout> | undefined;

function openSidebar() {
    sidebarOpen.value = true;
}

function closeSidebar() {
    sidebarOpen.value = false;
    activePanel.value = null;
}
```

- [ ] **Step 3: Update handleLeftClick to use openSidebar instead of custom event dispatch**

Replace the mobile branch of `handleLeftClick`:

```typescript
function handleLeftClick(e: MouseEvent) {
    if (isMobile.value) {
        e.preventDefault();
        openSidebar();
    } else {
        const isCurrentHome = window.location.pathname === '/';
        const s = document.querySelector('.page-scroller');
        if (isCurrentHome && s) {
            e.preventDefault();
            s.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}
```

(This changes `window.dispatchEvent(new CustomEvent('wakusei:open-mobile-menu'))` to `openSidebar()`.)

- [ ] **Step 4: Add sidebar outside click handler**

After `setupOutsideClick()` (around line 255), add:

```typescript
function setupSidebarOutsideClick() {
    clearTimeout(sidebarOutsideClickTimer);
    sidebarOutsideClickTimer = undefined;
    if (sidebarOutsideClickCleanup) {
        sidebarOutsideClickCleanup();
        sidebarOutsideClickCleanup = undefined;
    }
    sidebarOutsideClickTimer = setTimeout(() => {
        sidebarOutsideClickTimer = undefined;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (!sidebarRef.value?.contains(target)) closeSidebar();
        };
        document.addEventListener('click', handler);
        sidebarOutsideClickCleanup = () => document.removeEventListener('click', handler);
    }, 0);
}
```

- [ ] **Step 5: Add sidebar language select handler**

After `selectLanguage` (around line 243), add:

```typescript
function selectSidebarLanguage(lang: Locale) {
    setLocale(lang);
    activePanel.value = null;
    closeSidebar();
}
```

- [ ] **Step 6: Add sidebar panel toggle**

After `handlePanel` (around line 205), add inside the same function or as a separate function:

```typescript
function handleSidebarPanel(panel: string) {
    switch (panel) {
        case 'language':
            activePanel.value = activePanel.value === panel ? null : panel;
            break;
        default:
            console.warn(`[TopBar] Unsupported sidebar panel: "${panel}".`);
            activePanel.value = null;
    }
}
```

- [ ] **Step 7: Add sidebar dock link click handler**

After `handleDockLinkClick`, add:

```typescript
function handleSidebarDockLinkClick(e: MouseEvent, href: string) {
    if (isDockLinkDisabled(href)) {
        e.preventDefault();
        closeSidebar();
        return;
    }
    const currentPath = window.location.pathname;
    const targetPath = href;
    if (currentPath === targetPath || currentPath === targetPath + '/') {
        e.preventDefault();
        closeSidebar();
        scrollCurrentPageToTop();
    } else {
        closeSidebar();
    }
}
```

- [ ] **Step 8: Add shouldRenderTrailingDivider helper**

```typescript
function shouldRenderTrailingDivider() {
    const items = siteConfig.dock.items;
    const lastItem = items[items.length - 1];
    return items.length > 0 && lastItem?.type !== 'divider';
}
```

- [ ] **Step 9: Update onUnmounted to clean up sidebar timers**

Add to the `onUnmounted` callback (after line 169):

```typescript
clearTimeout(sidebarOutsideClickTimer);
if (sidebarOutsideClickCleanup) sidebarOutsideClickCleanup();
```

- [ ] **Step 10: Update watch to use leftWidthStyle reference instead of barRef**

The watch on line 174 uses `barRef`. It should still work since `barRef` is still used for the magnify hover. No change needed.

- [ ] **Step 11: Run tests to verify script changes compile**

Run: `npx vitest run tests/topbar-component.test.ts`
Expected: Still fails on template assertions (sidebar class, no barStyle in template) but script-related assertions like `--left-width` should now pass if template is also updated.

---

### Task 3: Rewrite TopBar.vue template — flex layout + mobile sidebar

**Files:**
- Modify: `src/components/TopBar.vue`

- [ ] **Step 1: Replace the template section**

Replace the entire `<template>` block (lines 361-478) with:

```html
<template>
    <!-- Desktop / Mobile bar -->
    <div ref="barRef" class="top-bar" role="toolbar" aria-label="Top navigation" :style="leftWidthStyle">
        <a
            class="top-bar-left"
            href="/"
            :role="isMobile ? 'button' : undefined"
            :aria-label="isMobile ? 'Open menu' : undefined"
            @click="handleLeftClick"
        >
            <img class="top-bar-avatar" :src="siteConfig.profile.avatar" alt="" width="40" height="40" />
            <span class="top-bar-name">{{ siteConfig.profile.name }}</span>
        </a>

        <div class="top-bar-right">
            <template v-for="(item, index) in siteConfig.dock.items" :key="index">
                <div v-if="item.type === 'divider'" class="top-bar-divider" />

                <template v-else>
                    <button
                        v-if="item.type === 'action'"
                        class="top-bar-dock-item"
                        :class="{ active: getActive(item), 'has-text': getMode(item.display) !== 'icon' }"
                        :title="getLabel(item.display)"
                        :aria-label="getLabel(item.display)"
                        @click="handleAction(item.action)"
                    >
                        <Icon v-if="getMode(item.display) !== 'text'" :name="getIcon(item.display, getActive(item))" />
                        <span
                            v-if="getMode(item.display) === 'text' || getMode(item.display) === 'both'"
                            class="top-bar-dock-label"
                        >
                            {{ getLabel(item.display) }}
                        </span>
                    </button>

                    <button
                        v-else-if="item.type === 'panel'"
                        class="top-bar-dock-item"
                        :class="{ active: getActive(item), 'has-text': getMode(item.display) !== 'icon' }"
                        :title="getLabel(item.display)"
                        :aria-label="getLabel(item.display)"
                        @click="
                            (event: MouseEvent) => handlePanel(item.panel, event.currentTarget as HTMLButtonElement)
                        "
                    >
                        <Icon v-if="getMode(item.display) !== 'text'" :name="getIcon(item.display, getActive(item))" />
                        <span
                            v-if="getMode(item.display) === 'text' || getMode(item.display) === 'both'"
                            class="top-bar-dock-label"
                        >
                            {{ getLabel(item.display) }}
                        </span>
                    </button>

                    <template v-else>
                        <a
                            v-if="item.openInNewTab"
                            :href="item.href"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="top-bar-dock-item"
                            :class="{ 'has-text': getMode(item.display) !== 'icon' }"
                            :title="getLabel(item.display)"
                            :aria-label="getLabel(item.display)"
                        >
                            <Icon v-if="getMode(item.display) !== 'text'" :name="getIcon(item.display, false)" />
                            <span
                                v-if="getMode(item.display) === 'text' || getMode(item.display) === 'both'"
                                class="top-bar-dock-label"
                            >
                                {{ getLabel(item.display) }}
                            </span>
                        </a>
                        <a
                            v-else
                            :href="isDockLinkDisabled(item.href) ? undefined : item.href"
                            class="top-bar-dock-item"
                            :class="{
                                disabled: isDockLinkDisabled(item.href),
                                'has-text': getMode(item.display) !== 'icon'
                            }"
                            :title="getLabel(item.display)"
                            :aria-label="getLabel(item.display)"
                            @click="(e: MouseEvent) => handleDockLinkClick(e, item.href)"
                        >
                            <Icon v-if="getMode(item.display) !== 'text'" :name="getIcon(item.display, false)" />
                            <span
                                v-if="getMode(item.display) === 'text' || getMode(item.display) === 'both'"
                                class="top-bar-dock-label"
                            >
                                {{ getLabel(item.display) }}
                            </span>
                        </a>
                    </template>
                </template>
            </template>
        </div>
    </div>

    <!-- Desktop language popup (positioned below trigger button) -->
    <div ref="popupRef" class="top-bar-language-popup" role="dialog" aria-label="Language selection">
        <div class="top-bar-popup-title">
            {{ t('dock.language') }}
        </div>
        <div
            v-for="lang in siteConfig.i18n.locales"
            :key="lang"
            class="top-bar-popup-option"
            :class="{ selected: locale === lang }"
            role="option"
            :aria-selected="locale === lang"
            @click="selectLanguage(lang)"
        >
            <Icon name="check" class="check-icon" />
            <span>{{ t(`dock.lang.${lang}`) }}</span>
        </div>
    </div>

    <!-- Mobile sidebar -->
    <div
        v-if="isMobile"
        ref="sidebarRef"
        class="top-bar-sidebar"
        :class="{ 'theme-light': !isDark, 'theme-dark': isDark }"
        :data-open="sidebarOpen ? '' : undefined"
        role="dialog"
        aria-label="Menu"
    >
        <div class="sidebar-header">
            <div class="sidebar-avatar-frame">
                <img
                    :src="siteConfig.profile.avatar"
                    alt=""
                    class="sidebar-avatar"
                    width="48"
                    height="48"
                    loading="lazy"
                    decoding="async"
                />
            </div>
            <span class="sidebar-name">{{ siteConfig.profile.name }}</span>
        </div>

        <div class="sidebar-divider" />

        <template v-for="(item, index) in siteConfig.dock.items" :key="index">
            <div v-if="item.type === 'divider'" class="sidebar-divider" />

            <template v-else>
                <div v-if="item.type === 'panel'" class="sidebar-menu-group">
                    <button
                        class="sidebar-menu-item"
                        :class="{ active: getActive(item), expanded: getActive(item) }"
                        :aria-label="getLabel(item.display)"
                        :aria-expanded="getActive(item)"
                        @click="handleSidebarPanel(item.panel)"
                    >
                        <Icon :name="getIcon(item.display, getActive(item))" class="sidebar-menu-icon" />
                        <span>{{ getLabel(item.display) }}</span>
                        <Icon name="fa-solid fa-chevron-down" class="expand-icon" />
                    </button>
                    <div
                        v-if="item.panel === 'language'"
                        class="sidebar-submenu"
                        :class="{ expanded: activePanel === item.panel }"
                    >
                        <div
                            v-for="lang in siteConfig.i18n.locales"
                            :key="lang"
                            class="sidebar-submenu-item"
                            :class="{ selected: locale === lang }"
                            role="option"
                            :aria-selected="locale === lang"
                            @click="selectSidebarLanguage(lang)"
                        >
                            <Icon name="check" class="check-icon" />
                            <span>{{ t(`dock.lang.${lang}`) }}</span>
                        </div>
                    </div>
                </div>

                <button
                    v-else-if="item.type === 'action'"
                    class="sidebar-menu-item"
                    :class="{ active: getActive(item) }"
                    :aria-label="getLabel(item.display)"
                    @click="handleAction(item.action)"
                >
                    <Icon :name="getIcon(item.display, getActive(item))" class="sidebar-menu-icon" />
                    <span>{{ getLabel(item.display) }}</span>
                </button>

                <template v-else>
                    <a
                        v-if="item.openInNewTab"
                        :href="item.href"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="sidebar-menu-item"
                        :aria-label="getLabel(item.display)"
                        @click="closeSidebar()"
                    >
                        <Icon :name="getIcon(item.display, false)" class="sidebar-menu-icon" />
                        <span>{{ getLabel(item.display) }}</span>
                    </a>
                    <a
                        v-else
                        :href="isDockLinkDisabled(item.href) ? undefined : item.href"
                        class="sidebar-menu-item"
                        :class="{ disabled: isDockLinkDisabled(item.href) }"
                        :aria-label="getLabel(item.display)"
                        @click="(e: MouseEvent) => handleSidebarDockLinkClick(e, item.href)"
                    >
                        <Icon :name="getIcon(item.display, false)" class="sidebar-menu-icon" />
                        <span>{{ getLabel(item.display) }}</span>
                    </a>
                </template>
            </template>
        </template>

        <div v-if="shouldRenderTrailingDivider()" class="sidebar-divider" />
    </div>

    <!-- Mobile sidebar overlay -->
    <div
        v-if="isMobile"
        class="top-bar-sidebar-overlay"
        :data-open="sidebarOpen ? '' : undefined"
        @click="closeSidebar()"
    />
</template>
```

Key changes from old template:
- `.top-bar` uses `:style="leftWidthStyle"` (no `barStyle`)
- `.top-bar-left` has no `:style` (no `leftStyle`)
- `.top-bar-right` has no `:style` (no `rightStyle`)
- Mobile sidebar and overlay are rendered directly (no separate component)

- [ ] **Step 2: Run tests to check template assertions**

Run: `npx vitest run tests/topbar-component.test.ts`
Expected: Some tests pass (sidebar class, no barStyle, --left-width). May still fail on CSS assertions if CSS not yet updated.

---

### Task 4: Rewrite topbar.css — flex + width layout + mobile sidebar styles

**Files:**
- Modify: `src/styles/topbar.css`

- [ ] **Step 1: Replace topbar.css with new layout**

Replace the entire content of `src/styles/topbar.css` with:

```css
/* ========================================
   TopBar 统一导航栏样式 — Flex + Width 驱动
   ======================================== */

:root {
    --left-panel-width: 500px;
}

@media (max-width: 1200px) {
    :root {
        --left-panel-width: 35%;
    }
}

body {
    padding-top: 72px;
    overflow: auto;
    height: auto;
    transition: none;
}

body.is-home {
    padding-top: 0;
    overflow: hidden;
    height: 100vh;
    transition: none;
}

.top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 72px;
    background: var(--dock-bg);
    backdrop-filter: blur(40px) saturate(220%);
    -webkit-backdrop-filter: blur(40px) saturate(220%);
    border: none;
    border-bottom: 1px solid var(--panel-border);
    border-radius: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    box-sizing: border-box;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.top-bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    width: var(--left-width, 0px);
    overflow: hidden;
    color: inherit;
    text-decoration: none;
    cursor: pointer;
    white-space: nowrap;
    transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.top-bar-left,
.top-bar-left:hover,
.top-bar-left:active,
.top-bar-left:focus,
.top-bar-left:focus-visible {
    text-decoration: none;
    border-bottom: none;
}

.top-bar-left:hover {
    opacity: 0.85;
}

.top-bar-left:active {
    opacity: 0.7;
    transition: opacity 0.08s ease-out;
}

.top-bar-right {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: auto;
}

.top-bar-avatar {
    width: 40px;
    height: 40px;
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

.top-bar-divider {
    width: 1px;
    height: 20px;
    background: var(--panel-border);
    margin: 0 6px;
    flex-shrink: 0;
}

.top-bar-dock-item {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--fg);
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transform-origin: center center;
    will-change: transform;
    transition: color 0.3s ease;
    font-size: 17px;
    position: relative;
}

.top-bar-dock-item:hover {
    color: var(--accent-blue, #5b9bf5);
    background: transparent;
}

.top-bar-dock-item.active {
    color: var(--fg);
    background: transparent;
}

.top-bar-dock-item.active:hover {
    color: var(--accent-blue, #5b9bf5);
}

.top-bar-dock-item.has-text {
    width: auto;
    padding: 0 12px;
    gap: 6px;
}

.top-bar-dock-label {
    font-size: 1.05rem;
    font-weight: 700;
    white-space: nowrap;
}

.top-bar-dock-item.disabled {
    opacity: 0.3;
    pointer-events: none;
}

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

/* ===== Mobile Sidebar (hidden on desktop) ===== */
.top-bar-sidebar,
.top-bar-sidebar-overlay {
    display: none;
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

    .top-bar-left {
        cursor: pointer;
        width: auto;
    }

    .top-bar-right {
        display: none;
    }

    /* ===== Mobile Sidebar ===== */
    .top-bar-sidebar {
        font-family: var(--font-ui, 'Inter', 'Noto Sans SC', sans-serif);
        display: flex;
        flex-direction: column;
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 72vw;
        max-width: 300px;
        z-index: calc(var(--z-dock, 10000) + 1);
        background: rgba(18, 18, 18, 0.9);
        backdrop-filter: blur(30px);
        -webkit-backdrop-filter: blur(30px);
        border-right: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 12px 0 48px rgba(0, 0, 0, 0.5);
        color: #ffffff;
        padding: 20px 0;
        transform: translateX(-100%);
        opacity: 0;
        pointer-events: none;
        transition:
            transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
            opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .top-bar-sidebar[data-open] {
        transform: translateX(0);
        opacity: 1;
        pointer-events: auto;
    }

    html:not([data-theme='dark']) .top-bar-sidebar.theme-light {
        background: rgba(255, 254, 247, 0.65);
        border-right-color: rgba(255, 255, 255, 0.5);
        box-shadow:
            4px 0 24px rgba(0, 0, 0, 0.08),
            inset -1px 0 0 rgba(255, 255, 255, 0.8);
        color: #0a0a0a;
    }

    html:not([data-theme='dark']) .sidebar-name {
        color: #0a0a0a;
    }

    html:not([data-theme='dark']) .sidebar-menu-item {
        color: #0a0a0a;
    }

    html:not([data-theme='dark']) .sidebar-menu-item:hover,
    html:not([data-theme='dark']) .sidebar-menu-item.active {
        background: rgba(0, 0, 0, 0.06);
    }

    html:not([data-theme='dark']) .sidebar-submenu-item {
        color: #333333;
    }

    html:not([data-theme='dark']) .sidebar-submenu-item:hover {
        background: rgba(0, 0, 0, 0.04);
    }

    html:not([data-theme='dark']) .sidebar-submenu-item.selected {
        background: rgba(0, 0, 0, 0.08);
    }

    html:not([data-theme='dark']) .sidebar-divider {
        background: rgba(0, 0, 0, 0.1);
    }

    html:not([data-theme='dark']) .sidebar-menu-icon,
    html:not([data-theme='dark']) .sidebar-menu-item > i:first-child {
        color: #0a0a0a;
    }

    html:not([data-theme='dark']) .expand-icon {
        color: #0a0a0a;
    }

    html:not([data-theme='dark']) .check-icon {
        color: #3e59ff;
    }

    /* Overlay */
    .top-bar-sidebar-overlay {
        display: block;
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

    .top-bar-sidebar-overlay[data-open] {
        background: rgba(0, 0, 0, 0.22);
        backdrop-filter: blur(10px) saturate(140%);
        -webkit-backdrop-filter: blur(10px) saturate(140%);
        opacity: 1;
        pointer-events: auto;
    }

    html:not([data-theme='dark']) .top-bar-sidebar-overlay[data-open] {
        background: rgba(0, 0, 0, 0.15);
    }

    /* Header */
    .sidebar-header {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 0 20px 16px;
    }

    .sidebar-avatar-frame {
        width: 48px;
        height: 48px;
        flex: 0 0 48px;
        border: 2px solid #555555;
        border-radius: 4px;
        background-color: #1a1a1a;
        box-shadow:
            0 0 12px rgba(255, 200, 80, 0.25),
            0 0 4px rgba(255, 200, 80, 0.15),
            inset 0 0 6px rgba(255, 200, 80, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }

    .sidebar-avatar {
        width: 100%;
        height: 100%;
        border: none;
        box-shadow: none;
        background: transparent;
        object-fit: cover;
        display: block;
    }

    .sidebar-name {
        font-size: 1rem;
        font-weight: 600;
        color: #ffffff;
    }

    /* Divider */
    .sidebar-divider {
        flex: 0 0 var(--dock-divider-thickness, 1px);
        height: var(--dock-divider-thickness, 1px);
        min-height: var(--dock-divider-thickness, 1px);
        background: rgba(255, 255, 255, 0.15);
        margin: 8px 16px;
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
        text-decoration: none;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.2s ease;
        text-align: left;
    }

    .sidebar-menu-item:visited {
        color: #fffef7;
    }

    .sidebar-menu-item:hover,
    .sidebar-menu-item.active {
        background: rgba(255, 255, 255, 0.12);
    }

    .sidebar-menu-icon,
    .sidebar-menu-item > i:first-child {
        width: 24px;
        height: 1rem;
        text-align: center;
        font-size: 1rem;
        color: #ffffff;
        flex-shrink: 0;
    }

    .expand-icon {
        width: 0.75rem;
        height: 0.75rem;
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
        padding: 10px 20px 10px 56px;
        cursor: pointer;
        font-size: 0.95rem;
        color: #e8e8ec;
        transition: background-color 0.2s ease;
    }

    .sidebar-submenu-item:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .sidebar-submenu-item.selected {
        background: rgba(255, 255, 255, 0.18);
    }

    .sidebar-submenu-item .check-icon {
        opacity: 0;
        width: 16px;
        color: var(--accent-blue);
        flex-shrink: 0;
        transition: opacity 0.15s ease;
    }

    .sidebar-submenu-item.selected .check-icon {
        opacity: 1;
    }

    .sidebar-menu-item.disabled {
        opacity: 0.3;
        pointer-events: none;
    }
}
```

- [ ] **Step 2: Run tests to verify CSS-related assertions**

Run: `npx vitest run tests/topbar-component.test.ts`
Expected: All TopBar component tests should now pass.

---

### Task 5: Remove MobileDockSidebar from SiteShell and delete the component

**Files:**
- Modify: `src/components/SiteShell.vue`
- Delete: `src/components/MobileDockSidebar.vue`

- [ ] **Step 1: Update SiteShell.vue**

Remove the `MobileDockSidebar` import and its template usage. The updated `SiteShell.vue`:

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { siteConfig } from '../data/site';
import { useHomepage } from '../composables/useHomepage';
import Footer from './Footer.vue';
import TopBar from './TopBar.vue';

const props = defineProps<{ initialIsHomePage: boolean }>();

const isHomePage = ref(props.initialIsHomePage);
let cleanup: (() => void) | undefined;

onMounted(() => {
    const { subscribeStateChange } = useHomepage();
    cleanup = subscribeStateChange((next) => {
        isHomePage.value = next;
    });
});

onUnmounted(() => {
    cleanup?.();
});
</script>

<template>
    <div class="noise-overlay" />
    <TopBar :initial-is-home-page="isHomePage" />
    <Footer
        v-if="!isHomePage"
        :links="siteConfig.footer.links"
        :social-links="siteConfig.socialLinks.links"
        :copyright-text="siteConfig.footer.text"
    />
</template>
```

- [ ] **Step 2: Delete MobileDockSidebar.vue**

Run: `Remove-Item -LiteralPath "src\components\MobileDockSidebar.vue"`

- [ ] **Step 3: Run tests to verify no breakage**

Run: `npx vitest run`
Expected: All tests pass. The `component-lifecycle-cleanup.test.ts` test may reference MobileDockSidebar — check and update if needed.

---

### Task 6: Clean up dock.css — remove mobile sidebar, bottom sheet, popup styles

**Files:**
- Modify: `src/styles/dock.css`

- [ ] **Step 1: Remove mobile sidebar styles from dock.css**

Delete all `.mobile-dock-sidebar`, `.mobile-dock-sidebar-overlay`, `.sidebar-*` selectors from `dock.css` (they now live in `topbar.css`). This is everything inside the `@media (max-width: 900px)` block from line ~452 to line ~706 (the `}` before `@media (max-width: 600px)`).

Also delete the base-level rules at lines 237-240:
```css
.mobile-dock-sidebar,
.mobile-dock-sidebar-overlay {
    display: none;
}
```

- [ ] **Step 2: Remove dock-bottom-sheet styles**

Delete all `.dock-bottom-sheet`, `.dock-bottom-sheet-title`, `.dock-bottom-sheet-option` selectors and their light-mode variants from the `@media (max-width: 900px)` block (lines ~227-426).

- [ ] **Step 3: Remove dock-popup styles**

Delete all `.dock-popup`, `.dock-popup-title`, `.dock-popup-option` selectors (lines ~107-226) — these have been replaced by TopBar's `top-bar-language-popup`.

- [ ] **Step 4: Remove unused dock-overlay styles**

Delete `.dock-overlay` rules inside `@media (max-width: 900px)` (lines ~427-450) and the base `display: none` rule (lines ~232-234).

- [ ] **Step 5: Verify dock.css still has .nav-dock base styles**

The remaining `dock.css` should only contain `.nav-dock`, `.nav-dock-item`, `.nav-dock-divider` base styles (lines 1-98 approximately) and the `@media (max-width: 600px)` responsive block (lines ~708-725).

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/dock-styles.test.ts`
Expected: The test asserts `.nav-dock` border-radius and border — these should still pass.

---

### Task 7: Update logic-guardrails test for removed MobileDockSidebar

**Files:**
- Modify: `tests/logic-guardrails.test.ts`

- [ ] **Step 1: Remove any reference to MobileDockSidebar**

Check if `logic-guardrails.test.ts` references MobileDockSidebar. It currently doesn't, but if the `component-lifecycle-cleanup.test.ts` does, update that too.

- [ ] **Step 2: Check component-lifecycle-cleanup.test.ts**

Run: `rg "MobileDockSidebar" tests/`
If any matches, update the test to remove those references.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All 104+ tests pass.

---

### Task 8: Run full verification chain

**Files:** None

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: 0 errors (warnings ok).

- [ ] **Step 2: Run format check**

Run: `npm run format:check`
Expected: All files pass.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Run astro check**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: 4 pages built successfully.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: unified TopBar with flex+width layout, absorb MobileDockSidebar"
```
