# Persistent Shell Phase 1 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 将首页 `/` 和博客列表 `/posts` 迁移到“持久公共壳 + 全宽内容区”的 Phase 1 架构，公共壳不重建，内容区正常替换。

**架构：** 采用 Fuwari 式结构持久化：`page-scroller` 是全局滚动容器，内部依次包含持久 `SiteShell`、可替换 `pageTransitionSurface`、持久 shell footer。`SiteShell` 渲染 hero、壁纸、左面板、TopBar 和滚动视差状态；首页和博客列表只负责第二屏正文内容。页面状态通过 `data-*` carrier 和 `wakusei:shell-page-change` 事件同步给 Pinia store。

**技术栈：** Astro 6 `ClientRouter`、Vue 3 `<script setup>`、Pinia、TypeScript、Vitest、CSS view transitions。

---

## 范围

本计划只实现 Phase 1：

- 迁移 `/` 和 `/posts`。
- 保留 `/posts/[...slug]` 和 `/404` 的旧 `PageFrame` 路径。
- 不处理时钟面板重新摆放。
- 不切回 Swup。
- 不删除 `PageFrame.vue`。

如果执行期间用户要求提交，才运行本计划中的 commit 命令。否则只做代码修改与验证，不自动 commit。

## 文件地图

### 新增

- `src/stores/page-shell.ts`：Pinia store，保存 shell 页面状态和滚动进度。
- `src/lib/page-shell-context.ts`：从 DOM `data-*` 读取 shell state、派发/订阅 `wakusei:shell-page-change`。
- `tests/page-shell-store.test.ts`：测试 store 的默认值、页面进入、滚动进度。
- `tests/page-shell-context.test.ts`：测试 DOM carrier 解析和事件订阅。
- `tests/shell-layout.test.ts`：测试 BaseLayout/SiteShell/PageFrame 的结构边界。

### 修改

- `src/layouts/BaseLayout.astro`：生成 shell data attributes；把 `SiteShell`、`pageTransitionSurface`、shell footer 放进同一个 `page-scroller`；在导航脚本中提前派发 shell state。
- `src/components/SiteShell.vue`：吸收 PageFrame 的公共 hero、壁纸、左面板、滚动视差逻辑；legacy 模式只保留 TopBar/noise。
- `src/components/TopBar.vue`：改为读取 `page-shell` store 的 `isHomePage` / `isShellPage` / `scrollProgress`，并保留真实 `--bar-left` / `--left-width` 变形。
- `src/components/HomepageApp.vue`：从完整 PageFrame wrapper 改成首页第二屏内容组件。
- `src/pages/posts/index.astro`：不再使用 PageFrame，只输出博客列表内容。
- `src/styles/layout.css`：承接新的 `page-scroller`、shell hero、content 覆盖层级。
- `src/styles/responsive.css`：移动端保持现有体验并避免双滚动容器。
- `src/styles/topbar.css`：必要时补充 legacy/shell 模式样式。
- `tests/topbar-component.test.ts`、`tests/logic-guardrails.test.ts`、`tests/component-lifecycle-cleanup.test.ts`：更新 guardrails。

---

### 任务 1：新增 Page Shell Store

**文件：**
- 新增：`src/stores/page-shell.ts`
- 新增：`tests/page-shell-store.test.ts`

- [ ] **Step 1: Write the failing store test**

Add `tests/page-shell-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePageShellStore } from '../src/stores/page-shell';

describe('page shell store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('starts in home shell mode by default', () => {
        const store = usePageShellStore();
        expect(store.title).toBe('遊星 Wakusei');
        expect(store.mode).toBe('home');
        expect(store.isHomePage).toBe(true);
        expect(store.isShellPage).toBe(true);
        expect(store.scrollProgress).toBe(0);
    });

    it('enters a blog shell page', () => {
        const store = usePageShellStore();
        store.enterPage({ title: '博客', mode: 'blog', isHomePage: false, isShellPage: true });
        expect(store.title).toBe('博客');
        expect(store.mode).toBe('blog');
        expect(store.isHomePage).toBe(false);
        expect(store.isShellPage).toBe(true);
    });

    it('enters legacy mode without enabling the shared hero', () => {
        const store = usePageShellStore();
        store.enterPage({ title: '文章', mode: 'legacy', isHomePage: false, isShellPage: false });
        expect(store.mode).toBe('legacy');
        expect(store.isShellPage).toBe(false);
    });

    it('clamps scroll progress between 0 and 1', () => {
        const store = usePageShellStore();
        store.setScrollProgress(-1);
        expect(store.scrollProgress).toBe(0);
        store.setScrollProgress(0.5);
        expect(store.scrollProgress).toBe(0.5);
        store.setScrollProgress(2);
        expect(store.scrollProgress).toBe(1);
        store.resetScrollProgress();
        expect(store.scrollProgress).toBe(0);
    });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
npm test -- tests/page-shell-store.test.ts
```

Expected: fails because `src/stores/page-shell.ts` does not exist.

- [ ] **Step 3: Implement the store**

Create `src/stores/page-shell.ts`:

```ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { siteConfig } from '../data/site';

export type ShellMode = 'home' | 'blog' | 'legacy';

export interface PageShellState {
    title: string;
    mode: ShellMode;
    isHomePage: boolean;
    isShellPage: boolean;
}

export const usePageShellStore = defineStore('page-shell', () => {
    const title = ref(siteConfig.profile.name);
    const mode = ref<ShellMode>('home');
    const isHomePage = ref(true);
    const isShellPage = ref(true);
    const scrollProgress = ref(0);

    const leftPanelKey = computed(() => `${mode.value}:${title.value}`);

    function enterPage(next: PageShellState) {
        title.value = next.title;
        mode.value = next.mode;
        isHomePage.value = next.isHomePage;
        isShellPage.value = next.isShellPage;
    }

    function setScrollProgress(value: number) {
        scrollProgress.value = Math.max(0, Math.min(1, value));
    }

    function resetScrollProgress() {
        scrollProgress.value = 0;
    }

    return { title, mode, isHomePage, isShellPage, scrollProgress, leftPanelKey, enterPage, setScrollProgress, resetScrollProgress };
});
```

- [ ] **Step 4: Verify the store test passes**

Run:

```powershell
npm test -- tests/page-shell-store.test.ts
```

Expected: `4 passed`.

- [ ] **Step 5: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/stores/page-shell.ts tests/page-shell-store.test.ts
git commit -m "feat: add page shell state store"
```

---

### 任务 2：新增 DOM Shell Context 辅助函数

**文件：**
- 新增：`src/lib/page-shell-context.ts`
- 新增：`tests/page-shell-context.test.ts`

- [ ] **Step 1: Write the failing context tests**

Add `tests/page-shell-context.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    PAGE_SHELL_CHANGE_EVENT,
    getPageShellStateFromDocument,
    getPageShellStateFromElement,
    subscribePageShellStateChange
} from '../src/lib/page-shell-context';

describe('page shell context helpers', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        document.documentElement.className = '';
    });

    it('reads shell page data attributes from an element', () => {
        const el = document.createElement('div');
        el.dataset.shellPage = 'true';
        el.dataset.shellMode = 'blog';
        el.dataset.pageTitle = '博客';
        el.dataset.isHome = 'false';

        expect(getPageShellStateFromElement(el)).toEqual({
            title: '博客',
            mode: 'blog',
            isHomePage: false,
            isShellPage: true
        });
    });

    it('falls back to legacy mode when carrier is missing', () => {
        expect(getPageShellStateFromDocument(document)).toEqual({
            title: '',
            mode: 'legacy',
            isHomePage: false,
            isShellPage: false
        });
    });

    it('reads the pageTransitionSurface carrier from a document', () => {
        document.body.innerHTML = `
            <div id="pageTransitionSurface" data-shell-page="true" data-shell-mode="home" data-page-title="遊星 Wakusei" data-is-home="true"></div>
        `;

        expect(getPageShellStateFromDocument(document)).toEqual({
            title: '遊星 Wakusei',
            mode: 'home',
            isHomePage: true,
            isShellPage: true
        });
    });

    it('subscribes to shell page change events', () => {
        const callback = vi.fn();
        const cleanup = subscribePageShellStateChange(callback);
        window.dispatchEvent(
            new CustomEvent(PAGE_SHELL_CHANGE_EVENT, {
                detail: { title: '博客', mode: 'blog', isHomePage: false, isShellPage: true }
            })
        );
        expect(callback).toHaveBeenCalledWith({ title: '博客', mode: 'blog', isHomePage: false, isShellPage: true });
        cleanup();
    });
});
```

- [ ] **Step 2: Run the failing context test**

Run:

```powershell
npm test -- tests/page-shell-context.test.ts
```

Expected: fails because `src/lib/page-shell-context.ts` does not exist.

- [ ] **Step 3: Implement DOM helpers**

Create `src/lib/page-shell-context.ts`:

```ts
import type { PageShellState, ShellMode } from '../stores/page-shell';

export const PAGE_SHELL_CHANGE_EVENT = 'wakusei:shell-page-change';

function isShellMode(value: string | undefined): value is ShellMode {
    return value === 'home' || value === 'blog' || value === 'legacy';
}

export function getPageShellStateFromElement(el: HTMLElement | null): PageShellState {
    if (!el) {
        return { title: '', mode: 'legacy', isHomePage: false, isShellPage: false };
    }

    const mode = isShellMode(el.dataset.shellMode) ? el.dataset.shellMode : 'legacy';
    const isShellPage = el.dataset.shellPage === 'true';
    const isHomePage = el.dataset.isHome === 'true';

    return {
        title: el.dataset.pageTitle ?? '',
        mode,
        isHomePage,
        isShellPage
    };
}

export function getPageShellStateFromDocument(root: Document = document): PageShellState {
    return getPageShellStateFromElement(root.getElementById('pageTransitionSurface'));
}

export function dispatchPageShellStateChange(next: PageShellState) {
    window.dispatchEvent(new CustomEvent<PageShellState>(PAGE_SHELL_CHANGE_EVENT, { detail: next }));
}

export function subscribePageShellStateChange(callback: (state: PageShellState) => void) {
    const handler = (event: Event) => {
        callback((event as CustomEvent<PageShellState>).detail);
    };
    window.addEventListener(PAGE_SHELL_CHANGE_EVENT, handler);
    return () => window.removeEventListener(PAGE_SHELL_CHANGE_EVENT, handler);
}
```

- [ ] **Step 4: Verify context tests pass**

Run:

```powershell
npm test -- tests/page-shell-context.test.ts
```

Expected: `4 passed`.

- [ ] **Step 5: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/lib/page-shell-context.ts tests/page-shell-context.test.ts
git commit -m "feat: add page shell context helpers"
```

---

### 任务 3：给 BaseLayout 增加 Shell Carrier 和滚动骨架

**文件：**
- 修改：`src/layouts/BaseLayout.astro`
- 新增/修改：`tests/shell-layout.test.ts`
- 修改：`tests/logic-guardrails.test.ts`

- [ ] **Step 1: Write layout guardrail tests**

Add or extend `tests/shell-layout.test.ts` with source tests:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const baseLayout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
const siteShell = readFileSync('src/components/SiteShell.vue', 'utf8');
const indexPage = readFileSync('src/pages/index.astro', 'utf8');
const postsPage = readFileSync('src/pages/posts/index.astro', 'utf8');

describe('persistent shell layout guardrails', () => {
    it('keeps SiteShell, page content, and footer in one page scroller', () => {
        expect(baseLayout).toContain('id="pageScroller"');
        expect(baseLayout).toContain('class="page-scroller"');
        expect(baseLayout).toContain('id="pageTransitionSurface"');
        expect(baseLayout).toContain('transition:name="site-shell"');
        expect(baseLayout).toContain('transition:persist');
        expect(baseLayout).toContain('transition:name="site-footer"');
    });

    it('exposes shell data on the content transition surface', () => {
        expect(baseLayout).toContain('data-shell-page');
        expect(baseLayout).toContain('data-shell-mode');
        expect(baseLayout).toContain('data-page-title');
        expect(baseLayout).toContain('data-is-home');
    });

    it('moves shared hero ownership into SiteShell', () => {
        expect(siteShell).toContain('wallpaper-scroll-area');
        expect(siteShell).toContain('left-panel');
        expect(siteShell).toContain('hero-sticky');
    });

    it('does not use PageFrame on home and blog list pages', () => {
        expect(indexPage).not.toContain('PageFrame');
        expect(postsPage).not.toContain('PageFrame');
    });
});
```

Extend `tests/logic-guardrails.test.ts` with:

```ts
it('dispatches shell page change before swap', () => {
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
    expect(layout).toContain('astro:before-swap');
    expect(layout).toContain('pageTransitionSurface');
    expect(layout).toContain('wakusei:shell-page-change');
});
```

- [ ] **Step 2: Run failing layout tests**

Run:

```powershell
npm test -- tests/shell-layout.test.ts tests/logic-guardrails.test.ts
```

Expected: fails because BaseLayout/SiteShell do not yet expose the new structure.

- [ ] **Step 3: Compute shell state in BaseLayout**

In `src/layouts/BaseLayout.astro`, replace the existing `const isHomePage = Astro.url.pathname === '/';` section with:

```astro
const pathname = Astro.url.pathname;
const isHomePage = pathname === '/';
const isBlogListPage = pathname === '/posts' || pathname === '/posts/';
const shellMode = isHomePage ? 'home' : isBlogListPage ? 'blog' : 'legacy';
const isShellPage = shellMode !== 'legacy';
const shellTitle = isHomePage ? siteConfig.profile.name : isBlogListPage ? '博客' : title;
```

- [ ] **Step 4: Restructure the body into one scroller**

In `src/layouts/BaseLayout.astro`, replace the current sibling structure:

```astro
<div id="pageTransitionSurface" class="page-transition-surface" transition:name="page-content">
    <slot />
</div>
<div transition:name="site-shell" transition:persist>
    <SiteShell client:load initialIsHomePage={isHomePage} />
</div>
```

with:

```astro
<div id="pageScroller" class="page-scroller">
    <div transition:name="site-shell" transition:persist>
        <SiteShell client:load initialIsHomePage={isHomePage} />
    </div>
    <div
        id="pageTransitionSurface"
        class="page-transition-surface"
        data-shell-page={isShellPage ? 'true' : 'false'}
        data-shell-mode={shellMode}
        data-page-title={shellTitle}
        data-is-home={isHomePage ? 'true' : 'false'}
        transition:name="page-content"
    >
        <slot />
    </div>
    {
        isShellPage && (
            <div class="page-footer" transition:name="site-footer" transition:persist>
                <Footer
                    client:load
                    links={siteConfig.footer.links}
                    socialLinks={siteConfig.socialLinks.links}
                    copyrightText={siteConfig.footer.text}
                />
            </div>
        )
    }
</div>
```

Add the Footer import at the top:

```astro
import Footer from '../components/Footer.vue';
```

- [ ] **Step 5: Dispatch shell state before swap**

In the existing inline navigation script in `src/layouts/BaseLayout.astro`, add helpers near `applyHomePageChromeState`:

```js
function getShellStateFromDocument(doc) {
    const carrier = doc.getElementById('pageTransitionSurface');
    if (!carrier) {
        return { title: '', mode: 'legacy', isHomePage: false, isShellPage: false };
    }
    const mode = carrier.dataset.shellMode === 'home' || carrier.dataset.shellMode === 'blog' ? carrier.dataset.shellMode : 'legacy';
    return {
        title: carrier.dataset.pageTitle || '',
        mode: mode,
        isHomePage: carrier.dataset.isHome === 'true',
        isShellPage: carrier.dataset.shellPage === 'true'
    };
}

function dispatchShellState(nextState) {
    window.dispatchEvent(new CustomEvent('wakusei:shell-page-change', { detail: nextState }));
}
```

Inside `document.addEventListener('astro:before-swap', (event) => { ... })`, after computing `incomingIsHomePage`, add:

```js
dispatchShellState(getShellStateFromDocument(event.newDocument));
```

Inside `document.addEventListener('astro:after-swap', () => { ... })`, after `applyHomePageChromeState(incomingIsHomePage);`, add:

```js
const scroller = document.getElementById('pageScroller');
if (scroller) scroller.scrollTo({ top: 0 });
```

- [ ] **Step 6: Verify layout tests pass**

Run:

```powershell
npm test -- tests/shell-layout.test.ts tests/logic-guardrails.test.ts
```

Expected: layout/source guardrails pass or only fail on later SiteShell/PageFrame expectations that will be completed in Task 4/6.

- [ ] **Step 7: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/layouts/BaseLayout.astro tests/shell-layout.test.ts tests/logic-guardrails.test.ts
git commit -m "feat: add persistent shell layout carrier"
```

---

### 任务 4：把共享 Hero 迁入 SiteShell

**文件：**
- 修改：`src/components/SiteShell.vue`
- 修改：`src/styles/layout.css`
- 修改：`src/styles/responsive.css`
- 测试：`tests/shell-layout.test.ts`

- [ ] **Step 1: Extend lifecycle cleanup tests before editing**

In `tests/component-lifecycle-cleanup.test.ts`, add assertions for SiteShell cleanup:

```ts
it('SiteShell cleans up persistent hero resources', () => {
    const siteShell = readFileSync('src/components/SiteShell.vue', 'utf8');
    expect(siteShell).toContain('onUnmounted');
    expect(siteShell).toContain('teardownWallpaper');
    expect(siteShell).toContain('pageCleanups.forEach');
    expect(siteShell).toContain('subscribePageShellStateChange');
});
```

- [ ] **Step 2: Run failing shell tests**

Run:

```powershell
npm test -- tests/shell-layout.test.ts tests/component-lifecycle-cleanup.test.ts
```

Expected: fails until SiteShell owns hero/wallpaper cleanup.

- [ ] **Step 3: Replace SiteShell script with persistent hero logic**

In `src/components/SiteShell.vue`, keep the existing imports for `siteConfig`, `Footer`, `TopBar`, then add imports from PageFrame:

```ts
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { siteConfig } from '../data/site';
import { createLogger } from '../lib/logger';
import { enableContentProtection, initMobileStickyAvatar, initScrollAnimations } from '../lib/runtime-effects';
import { WallpaperScrollerController } from '../lib/wallpaper-scroller';
import { getPageShellStateFromDocument, subscribePageShellStateChange } from '../lib/page-shell-context';
import { usePageShellStore } from '../stores/page-shell';
import SocialLinks from './SocialLinks.vue';
import TopBar from './TopBar.vue';
import TypewriterSlogan from './TypewriterSlogan.vue';
```

Use this state structure:

```ts
const props = defineProps<{ initialIsHomePage: boolean }>();

const pageShell = usePageShellStore();
const logger = createLogger(siteConfig.debug.consoleLog);

const containerRef = ref<HTMLElement>();
const avatarRef = ref<HTMLDivElement>();
const wallpaperRef = ref<HTMLDivElement>();
const ready = ref(false);
const isMobile = ref(typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches);

let wallpaperController: WallpaperScrollerController | null = null;
let watchStop: (() => void) | null = null;
let shellCleanup: (() => void) | undefined;
const pageCleanups: Array<() => void> = [];

const heroOpacity = computed(() => {
    const sp = pageShell.scrollProgress;
    if (sp <= 0.15) return 1;
    if (sp >= 0.4) return 0;
    return 1 - (sp - 0.15) / 0.25;
});

const heroStyle = computed(() => {
    const sp = pageShell.scrollProgress;
    return (
        'transform: ' +
        `translateZ(${-600 * sp}px) ` +
        `rotateX(${15 * sp}deg) ` +
        `scale(${1 - 0.3 * sp}); ` +
        `opacity: ${Math.max(1 - sp * 1.2, 0)}; ` +
        `filter: brightness(${1 - sp * 0.6}) blur(${sp * 8}px)`
    );
});
```

Add `splitLatinText`, wallpaper setup, and cleanup copied from `PageFrame.vue`, with one change: dispatch `wakusei:shell-ready` and `wakusei:homepage-ready` when ready:

```ts
function startWallpaperLoading() {
    const wref = wallpaperRef.value;
    if (!wref) {
        logger.warn('Wallpaper ref not available');
        ready.value = true;
        return;
    }

    wallpaperController = new WallpaperScrollerController(siteConfig.wallpaper, siteConfig.loading, {
        onReady: () => {
            ready.value = true;
        }
    });

    wallpaperController.attach(wref);
    wallpaperController.init();
}

function teardownWallpaper() {
    if (wallpaperController) {
        wallpaperController.destroy();
        wallpaperController = null;
    }
}

function splitLatinText(text: string) {
    return text
        .split(/([A-Za-z][A-Za-z0-9'.-]*)/g)
        .filter(Boolean)
        .map((part) => ({ text: part, isLatin: /^[A-Za-z]/.test(part) }));
}
```

In `onMounted`, initialize state and scroll binding:

```ts
onMounted(() => {
    pageShell.enterPage(getPageShellStateFromDocument());
    shellCleanup = subscribePageShellStateChange((next) => {
        pageShell.enterPage(next);
        pageShell.resetScrollProgress();
    });

    const scroller = document.getElementById('pageScroller');
    const handleScroll = () => {
        if (!scroller) return;
        pageShell.setScrollProgress(Math.min(scroller.scrollTop / window.innerHeight, 1));
    };
    scroller?.addEventListener('scroll', handleScroll, { passive: true });
    pageCleanups.push(() => scroller?.removeEventListener('scroll', handleScroll));

    if (siteConfig.contentProtection.preventCopyAndDrag) {
        pageCleanups.push(enableContentProtection(true));
    }

    if (siteConfig.effects.scrollReveal.enabled) {
        pageCleanups.push(initScrollAnimations(siteConfig.effects.scrollReveal.delay, siteConfig.effects.scrollReveal.offset));
    }

    const container = containerRef.value;
    const avatar = avatarRef.value;
    if (container && avatar) {
        pageCleanups.push(initMobileStickyAvatar(document.getElementById('pageScroller') || container, avatar));
    }

    const mql = window.matchMedia('(max-width: 900px)');
    const handleMediaChange = (event: MediaQueryListEvent) => {
        isMobile.value = event.matches;
    };
    mql.addEventListener('change', handleMediaChange);
    pageCleanups.push(() => mql.removeEventListener('change', handleMediaChange));

    watchStop = watch(
        isMobile,
        (mobile) => {
            teardownWallpaper();
            if (mobile || !pageShell.isShellPage) {
                ready.value = true;
            } else {
                ready.value = false;
                startWallpaperLoading();
            }
        },
        { immediate: true }
    );
});

onUnmounted(() => {
    shellCleanup?.();
    watchStop?.();
    teardownWallpaper();
    pageCleanups.forEach((cleanup) => cleanup());
});
```

Watch ready:

```ts
watch(ready, (isReady) => {
    const container = containerRef.value;
    if (!container) return;
    container.classList.toggle('visible', isReady);
    if (isReady) {
        window.dispatchEvent(new CustomEvent('wakusei:shell-ready'));
        if (pageShell.isHomePage || props.initialIsHomePage) {
            window.dispatchEvent(new CustomEvent('wakusei:homepage-ready'));
        }
    }
});
```

- [ ] **Step 4: Replace SiteShell template**

Use this structure in `src/components/SiteShell.vue`:

```vue
<template>
    <div class="noise-overlay" />

    <div v-if="pageShell.isShellPage" class="hero-sticky">
        <div class="hero-content" :style="heroStyle">
            <main ref="containerRef" class="container">
                <div ref="wallpaperRef" class="wallpaper-scroll-area" />

                <section class="left-panel">
                    <Transition name="left-panel-content" mode="out-in">
                        <header v-if="pageShell.mode === 'home'" :key="pageShell.leftPanelKey" class="hero">
                            <div id="avatarBox" ref="avatarRef" class="avatar-box" :style="{ opacity: heroOpacity }">
                                <img
                                    :src="siteConfig.profile.avatar"
                                    alt="Avatar"
                                    class="avatar-image"
                                    width="150"
                                    height="150"
                                    loading="eager"
                                    decoding="async"
                                    fetchpriority="high"
                                />
                            </div>

                            <h1 class="name" :style="{ opacity: heroOpacity }">
                                <template v-for="part in splitLatinText(pageShell.title)" :key="part.text">
                                    <span v-if="part.isLatin" class="name-latin">{{ part.text }}</span>
                                    <template v-else>{{ part.text }}</template>
                                </template>
                            </h1>

                            <div class="status-bar">
                                <span class="status-dot" />
                                <span class="status-text">{{ siteConfig.profile.status }}</span>
                            </div>

                            <div id="bioContainer" class="bio-container">
                                <TypewriterSlogan
                                    :config="siteConfig.slogans"
                                    :cursor-style="siteConfig.animation.cursorStyle"
                                />
                            </div>

                            <SocialLinks :config="siteConfig.socialLinks" />
                        </header>

                        <header v-else :key="pageShell.leftPanelKey" class="hero hero-minimal">
                            <h1 class="name" :style="{ opacity: heroOpacity }">
                                <template v-for="part in splitLatinText(pageShell.title)" :key="part.text">
                                    <span v-if="part.isLatin" class="name-latin">{{ part.text }}</span>
                                    <template v-else>{{ part.text }}</template>
                                </template>
                            </h1>
                        </header>
                    </Transition>
                </section>
            </main>
        </div>
    </div>

    <TopBar :initial-is-home-page="pageShell.isHomePage" />
</template>
```

- [ ] **Step 5: Add left panel transition CSS**

Append to `src/styles/transitions.css`:

```css
.left-panel-content-enter-active,
.left-panel-content-leave-active {
    transition:
        opacity 0.22s ease,
        transform 0.22s ease,
        filter 0.22s ease;
}

.left-panel-content-enter-from {
    opacity: 0;
    transform: translateY(0.75rem);
    filter: blur(8px);
}

.left-panel-content-leave-to {
    opacity: 0;
    transform: translateY(-0.75rem);
    filter: blur(8px);
}

@media (prefers-reduced-motion: reduce) {
    .left-panel-content-enter-active,
    .left-panel-content-leave-active {
        transition: opacity 0.12s ease;
    }

    .left-panel-content-enter-from,
    .left-panel-content-leave-to {
        transform: none;
        filter: none;
    }
}
```

- [ ] **Step 6: Verify shell tests**

Run:

```powershell
npm test -- tests/shell-layout.test.ts tests/component-lifecycle-cleanup.test.ts
```

Expected: tests pass after SiteShell owns hero/wallpaper and cleanup.

- [ ] **Step 7: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/components/SiteShell.vue src/styles/transitions.css tests/shell-layout.test.ts tests/component-lifecycle-cleanup.test.ts
git commit -m "feat: move shared hero into persistent shell"
```

---

### 任务 5：让 TopBar 读取 Shell Store 状态

**文件：**
- 修改：`src/components/TopBar.vue`
- 修改：`tests/topbar-component.test.ts`

- [ ] **Step 1: Update TopBar tests first**

In `tests/topbar-component.test.ts`, add assertions:

```ts
it('uses page shell store instead of owning route state', () => {
    expect(topbarComponent).toContain("usePageShellStore");
    expect(topbarComponent).toContain("pageShell.isHomePage");
    expect(topbarComponent).toContain("pageShell.scrollProgress");
});

it('keeps real bar expansion CSS variables', () => {
    expect(topbarComponent).toMatch(/--bar-left/);
    expect(topbarComponent).toMatch(/--left-width/);
    expect(topbarComponent).not.toMatch(/rightStyle/);
    expect(topbarComponent).not.toMatch(/translateX\(/);
});
```

- [ ] **Step 2: Run failing TopBar tests**

Run:

```powershell
npm test -- tests/topbar-component.test.ts
```

Expected: fails until TopBar imports and reads `usePageShellStore`.

- [ ] **Step 3: Update TopBar script**

In `src/components/TopBar.vue`, add:

```ts
import { usePageShellStore } from '../stores/page-shell';
```

After existing composables:

```ts
const pageShell = usePageShellStore();
```

Replace the `expansionProgress` computed with:

```ts
const expansionProgress = computed(() => {
    if (!pageShell.isShellPage) return 1;
    if (!pageShell.isHomePage) return 1;
    if (isMobile.value) return 1;
    const sp = pageShell.scrollProgress;
    if (sp <= 0.02) return 0;
    if (sp >= 0.45) return 1;
    const raw = (sp - 0.02) / 0.43;
    return 1 - Math.pow(1 - raw, 4);
});
```

Keep `barExpandStyle` unchanged:

```ts
const barExpandStyle = computed(() => {
    const p = expansionProgress.value;
    return `--bar-left: calc(var(--left-panel-width, 500px) * ${1 - p}); --left-width: calc(${p} * var(--left-panel-width, 500px))`;
});
```

Remove `scrollProgress`, `isHomePage`, `subscribeStateChange`, `bindScroll`, `animateScrollProgressTo`, `stopProgressAnimation`, `scrollerEl`, and `scrollHandler` from TopBar. The scroll source now lives in SiteShell/page store.

- [ ] **Step 4: Keep legacy click behavior**

Update `handleLeftClick` to use current pathname and existing scroller:

```ts
function handleLeftClick(e: MouseEvent) {
    if (isMobile.value) {
        e.preventDefault();
        openSidebar();
        return;
    }

    const isCurrentHome = window.location.pathname === '/';
    const s = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    if (isCurrentHome && s) {
        e.preventDefault();
        s.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
```

Update `scrollCurrentPageToTop` similarly:

```ts
function scrollCurrentPageToTop() {
    const s = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    if (s) {
        s.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

- [ ] **Step 5: Verify TopBar tests**

Run:

```powershell
npm test -- tests/topbar-component.test.ts
```

Expected: all TopBar tests pass.

- [ ] **Step 6: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/components/TopBar.vue tests/topbar-component.test.ts
git commit -m "refactor: drive topbar from shell state"
```

---

### 任务 6：把首页和博客列表改成内容页

**文件：**
- 修改：`src/components/HomepageApp.vue`
- 修改：`src/pages/index.astro`
- 修改：`src/pages/posts/index.astro`
- 测试：`tests/shell-layout.test.ts`

- [ ] **Step 1: Tighten page usage tests**

Ensure `tests/shell-layout.test.ts` contains:

```ts
it('keeps legacy pages on PageFrame while home and blog list use shell content', () => {
    const indexPage = readFileSync('src/pages/index.astro', 'utf8');
    const postsPage = readFileSync('src/pages/posts/index.astro', 'utf8');
    const postPage = readFileSync('src/pages/posts/[...slug].astro', 'utf8');
    const notFoundPage = readFileSync('src/pages/404.astro', 'utf8');

    expect(indexPage).not.toContain('PageFrame');
    expect(postsPage).not.toContain('PageFrame');
    expect(postPage).toContain('PageFrame');
    expect(notFoundPage).toContain('PageFrame');
});
```

- [ ] **Step 2: Run failing page structure test**

Run:

```powershell
npm test -- tests/shell-layout.test.ts
```

Expected: fails until `/posts` no longer imports PageFrame.

- [ ] **Step 3: Make HomepageApp content-only**

Replace `src/components/HomepageApp.vue` with a content-only shell page. Keep it minimal for Phase 1:

```vue
<template>
    <section class="homepage-content" aria-labelledby="homepage-content-title">
        <div class="homepage-content-inner">
            <h2 id="homepage-content-title" class="homepage-section-title">最新动态</h2>
            <p class="homepage-section-lead">这里是首页第二屏内容区域，后续可以放最新文章、介绍卡片或媒体模块。</p>
        </div>
    </section>
</template>
```

This removes the `PageFrame` dependency from homepage. The home left panel is now rendered by `SiteShell`.

- [ ] **Step 4: Keep index page simple**

Keep `src/pages/index.astro` as:

```astro
---
import HomepageApp from '../components/HomepageApp.vue';
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout>
    <HomepageApp client:load />
</BaseLayout>
```

- [ ] **Step 5: Remove PageFrame from blog list page**

In `src/pages/posts/index.astro`, remove:

```astro
import PageFrame from '../../components/PageFrame.vue';
```

Replace the wrapper:

```astro
<BaseLayout title="博客">
    <PageFrame client:load pageTitle="博客" showSlogan={false} showSocialLinks={false}>
        <template #content>
            ...blog content...
        </template>
    </PageFrame>
</BaseLayout>
```

with:

```astro
<BaseLayout title="博客">
    <div class="blog-container">
        <h2 class="blog-title">博客文章</h2>
        <ul class="post-list">
            {
                posts.map((post) => (
                    <li class="post-item">
                        <a href={`/posts/${post.slug}`} class="post-link">
                            <div class="post-card">
                                {post.data.cover && (
                                    <img
                                        src={post.data.cover}
                                        alt={post.data.title}
                                        class="post-cover"
                                        loading="lazy"
                                    />
                                )}
                                <div class="post-info">
                                    <h3>{post.data.title}</h3>
                                    <p class="post-desc">{post.data.description}</p>
                                    {post.data.tags && (
                                        <div class="post-meta">
                                            <span class="post-tags">{post.data.tags.join(', ')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </a>
                    </li>
                ))
            }
        </ul>
        <a href="/" class="back-link">← 返回首页</a>
    </div>
</BaseLayout>
```

Keep the existing blog page `<style>` block, but remove selectors that assume `PageFrame` slot nesting if any appear.

- [ ] **Step 6: Verify page structure tests**

Run:

```powershell
npm test -- tests/shell-layout.test.ts
```

Expected: page structure tests pass.

- [ ] **Step 7: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/components/HomepageApp.vue src/pages/index.astro src/pages/posts/index.astro tests/shell-layout.test.ts
git commit -m "refactor: make home and blog list content-only"
```

---

### 任务 7：更新全局滚动容器和全宽内容覆盖样式

**文件：**
- 修改：`src/styles/layout.css`
- 修改：`src/styles/responsive.css`
- 必要时修改：`src/styles/components.css`
- 测试：`tests/wallpaper-full-bleed.test.ts`、`tests/shell-layout.test.ts`

- [ ] **Step 1: Add CSS guardrail tests**

Extend `tests/wallpaper-full-bleed.test.ts` or `tests/shell-layout.test.ts`:

```ts
it('keeps page content above hero and wallpaper', () => {
    const layoutCss = readFileSync('src/styles/layout.css', 'utf8');
    expect(layoutCss).toContain('.page-transition-surface');
    expect(layoutCss).toMatch(/z-index:\s*var\(--z-content/);
    expect(layoutCss).toMatch(/background:\s*var\(--bg/);
});
```

- [ ] **Step 2: Run failing CSS tests**

Run:

```powershell
npm test -- tests/wallpaper-full-bleed.test.ts tests/shell-layout.test.ts
```

Expected: may fail until CSS contains new selectors.

- [ ] **Step 3: Move PageFrame scoped content styles to global layout CSS**

In `src/styles/layout.css`, ensure these selectors exist:

```css
.page-scroller {
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    perspective: 1000px;
    background: var(--bg, #fffef7);
    scrollbar-width: none;
}

.page-scroller::-webkit-scrollbar {
    display: none;
}

.hero-sticky {
    position: sticky;
    top: 0;
    min-height: 100vh;
    z-index: var(--z-content, 50);
    transform-style: preserve-3d;
}

.hero-content {
    min-height: 100vh;
    transform-style: preserve-3d;
    transform-origin: center center;
    will-change: transform, opacity, filter;
}

.page-transition-surface {
    min-height: 100vh;
    padding: 4rem 2rem;
    background: var(--bg, #fffef7);
    position: relative;
    z-index: var(--z-content, 50);
}

.homepage-content {
    min-height: 60vh;
    display: grid;
    place-items: center;
}

.homepage-content-inner {
    width: min(960px, 100%);
    margin: 0 auto;
}

.homepage-section-title {
    margin: 0 0 1rem;
    font-size: clamp(2rem, 5vw, 4rem);
}

.homepage-section-lead {
    margin: 0;
    color: var(--text-secondary);
    font-size: 1.125rem;
}
```

If `.page-scroller`, `.hero-sticky`, or `.hero-content` already exist, merge rather than duplicate selectors.

- [ ] **Step 4: Update mobile CSS**

In `src/styles/responsive.css`, ensure mobile content remains full-width:

```css
@media (max-width: 900px) {
    .page-transition-surface {
        padding: 2rem 1rem;
    }

    .hero-sticky {
        min-height: auto;
    }
}
```

- [ ] **Step 5: Verify CSS tests**

Run:

```powershell
npm test -- tests/wallpaper-full-bleed.test.ts tests/shell-layout.test.ts
```

Expected: CSS guardrails pass.

- [ ] **Step 6: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/styles/layout.css src/styles/responsive.css src/styles/components.css tests/wallpaper-full-bleed.test.ts tests/shell-layout.test.ts
git commit -m "style: support persistent shell content cover"
```

---

### 任务 8：保留 legacy 页面且避免双壳

**文件：**
- 修改：`src/components/SiteShell.vue`
- 修改：`src/layouts/BaseLayout.astro`
- 测试：`tests/shell-layout.test.ts`

- [ ] **Step 1: Add legacy guardrail test**

In `tests/shell-layout.test.ts`, add:

```ts
it('legacy pages keep PageFrame and shell hero is gated by isShellPage', () => {
    const siteShell = readFileSync('src/components/SiteShell.vue', 'utf8');
    const postPage = readFileSync('src/pages/posts/[...slug].astro', 'utf8');
    const notFoundPage = readFileSync('src/pages/404.astro', 'utf8');

    expect(siteShell).toContain('v-if="pageShell.isShellPage"');
    expect(postPage).toContain('PageFrame');
    expect(notFoundPage).toContain('PageFrame');
});
```

- [ ] **Step 2: Run legacy guardrail test**

Run:

```powershell
npm test -- tests/shell-layout.test.ts
```

Expected: passes if Task 4 included the `v-if` gate.

- [ ] **Step 3: Ensure Footer is not duplicated on legacy pages**

In `src/layouts/BaseLayout.astro`, keep the shell footer conditional on `isShellPage`:

```astro
{isShellPage && <div class="page-footer" transition:name="site-footer" transition:persist>...</div>}
```

Do not add a persistent shell footer for legacy routes because legacy `PageFrame` already renders its own footer.

- [ ] **Step 4: Verify legacy behavior with type check**

Run:

```powershell
npm run check
```

Expected: `0 errors`.

- [ ] **Step 5: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/components/SiteShell.vue src/layouts/BaseLayout.astro tests/shell-layout.test.ts
git commit -m "fix: gate shared shell for legacy pages"
```

---

### 任务 9：更新 loading 和 ready 事件

**文件：**
- 修改：`src/layouts/BaseLayout.astro`
- 修改：`tests/loading-overlay-navigation.test.ts`

- [ ] **Step 1: Add ready event tests**

In `tests/loading-overlay-navigation.test.ts`, add or update expectations:

```ts
it('waits for shell-ready on shell pages and keeps homepage-ready compatibility', () => {
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
    expect(layout).toContain('wakusei:shell-ready');
    expect(layout).toContain('wakusei:homepage-ready');
    expect(layout).toContain('shouldWaitForShell');
});
```

- [ ] **Step 2: Run failing loading tests**

Run:

```powershell
npm test -- tests/loading-overlay-navigation.test.ts
```

Expected: fails until loader script knows shell-ready.

- [ ] **Step 3: Update loader wait logic**

In `src/layouts/BaseLayout.astro`, update the inline loading script to track shell readiness:

```js
var shellReady = false;

function shouldWaitForShell() {
    var surface = document.getElementById('pageTransitionSurface');
    return !!surface && surface.dataset.shellPage === 'true' && !shellReady;
}

function shouldWaitForHomepage() {
    return !!document.querySelector('.page-scroller') && !homepageReady && !shellReady;
}
```

Add listener:

```js
window.addEventListener('wakusei:shell-ready', function () {
    shellReady = true;
    maybeHideOverlay();
});
```

Update `maybeHideOverlay`:

```js
function maybeHideOverlay() {
    if (!pageLoaded || shouldWaitForShell() || shouldWaitForHomepage()) return;
    hideOverlay();
}
```

- [ ] **Step 4: Update navigation resource wait**

In the navigation progress script's `waitForResources`, listen for both shell and homepage ready:

```js
window.addEventListener('wakusei:shell-ready', onReady, { once: true });
window.addEventListener('wakusei:homepage-ready', onReady, { once: true });
```

And cleanup both in the timeout:

```js
window.removeEventListener('wakusei:shell-ready', onReady);
window.removeEventListener('wakusei:homepage-ready', onReady);
```

- [ ] **Step 5: Verify loading tests**

Run:

```powershell
npm test -- tests/loading-overlay-navigation.test.ts
```

Expected: loading overlay tests pass.

- [ ] **Step 6: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/layouts/BaseLayout.astro tests/loading-overlay-navigation.test.ts
git commit -m "fix: wait for persistent shell readiness"
```

---

### 任务 10：最终验证和手动检查

**文件：**
- 所有本计划涉及的文件

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
npm test -- tests/page-shell-store.test.ts tests/page-shell-context.test.ts tests/shell-layout.test.ts tests/topbar-component.test.ts tests/loading-overlay-navigation.test.ts tests/component-lifecycle-cleanup.test.ts
```

Expected: all targeted tests pass.

- [ ] **Step 2: Run full test suite**

Run:

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Run lint**

Run:

```powershell
npm run lint
```

Expected: `0 errors`. Existing warnings are acceptable only if they were already present.

- [ ] **Step 4: Run format check**

Run:

```powershell
npm run format:check
```

Expected: Prettier reports all files formatted.

- [ ] **Step 5: Run Astro check**

Run:

```powershell
npm run check
```

Expected: `0 errors`.

- [ ] **Step 6: Build**

Run:

```powershell
npm run build
```

Expected: static build completes and emits all pages.

- [ ] **Step 7: Manual browser verification**

Run dev server:

```powershell
npm run dev
```

Check these behaviors manually:

- `/` first screen shows homepage left panel with avatar → name → status → slogan → social links.
- `/` scroll shows hero 3D fade/blur and content area full-width covering wallpaper and left panel.
- `/posts` first screen shows left panel title “博客” only.
- `/posts` scroll shows blog list content full-width covering wallpaper and left panel.
- `/` ↔ `/posts` navigation does not visually recreate TopBar.
- `/` ↔ `/posts` navigation does not visibly reload wallpaper.
- `/posts/hello-world` still renders with legacy PageFrame and no double left panel.
- `/404` still renders with legacy PageFrame and no double left panel.

- [ ] **Step 8: Optional final commit**

Only if the user explicitly requested commits:

```powershell
git add src tests docs/superpowers/plans/2026-05-15-persistent-shell-phase-1.md
git commit -m "feat: add persistent shell phase 1"
```

---

## 自查

- Spec coverage: The plan covers Phase 1 scope, Fuwari-style structure, page shell state, left panel animation, legacy handling, content cover behavior, loading readiness, tests, and verification.
- 占位符扫描：没有未完成占位语句或未指定任务。每个任务都包含文件、具体代码片段、命令和预期结果。
- Type consistency: `ShellMode`, `PageShellState`, `usePageShellStore`, `PAGE_SHELL_CHANGE_EVENT`, and `wakusei:shell-page-change` are consistently named across tasks.
- Scope check: The plan intentionally excludes article page migration, 404 migration, clock relocation, Swup migration, and Phase 2 work.
