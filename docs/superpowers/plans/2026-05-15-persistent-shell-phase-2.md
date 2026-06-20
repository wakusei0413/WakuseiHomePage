# Persistent Shell Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate article and 404 pages to the persistent shell, delete PageFrame and legacy compat code, remove `isShellPage` and `-webkit-` prefixes.

**Architecture:** All pages now share the same `page-scroller` → SiteShell + pageTransitionSurface + Footer structure. `ShellMode = 'home' | 'blog' | 'article' | 'error'`. Each page passes `shellMode` and `shellTitle` as props to BaseLayout instead of pathname inference. `isShellPage` and `legacy` mode are completely removed. `useHomepage`, `homepage-context`, and `homepage` store are deleted.

**Tech Stack:** Astro 6, Vue 3 Composition API, Pinia, TypeScript, Vitest.

---

## 文件地图

### 删除

- `src/components/PageFrame.vue`
- `src/composables/useHomepage.ts`
- `src/stores/homepage.ts`
- `src/lib/homepage-context.ts`

### 修改

- `src/stores/page-shell.ts`: `ShellMode` 更新，删除 `isShellPage`
- `src/lib/page-shell-context.ts`: 删除 `isShellPage` 字段，`legacy` → `error` fallback，识别新模式
- `src/layouts/BaseLayout.astro`: 移除条件分支，接收 `shellMode`/`shellTitle` props，移除 `data-shell-page`
- `src/components/SiteShell.vue`: 扩展左面板到4个模式，移除 `isShellPage` 守卫
- `src/components/TopBar.vue`: 移除 `isShellPage` 分支
- `src/pages/index.astro`: 传递 `shellMode="home"`
- `src/pages/posts/index.astro`: 传递 `shellMode="blog"`
- `src/pages/posts/[...slug].astro`: 移除 PageFrame，传递 `shellMode="article"`
- `src/pages/404.astro`: 移除 PageFrame，传递 `shellMode="error"`
- `src/styles/layout.css`: 移除 `-webkit-user-select`，移除 `-webkit-backdrop-filter`
- `src/styles/responsive.css`: 移除 `-webkit-backdrop-filter`
- `src/styles/topbar.css`: 移除 `-webkit-backdrop-filter`
- `src/styles/dock.css`: 移除 `-webkit-backdrop-filter`
- `src/styles/base.css`: 移除 `-webkit-user-select`

### 测试更新

- `tests/page-shell-store.test.ts`: 删除 `isShellPage` 测试，添加 `article`/`error` 模式
- `tests/page-shell-context.test.ts`: 删除 `isShellPage` 字段测试，添加新模式解析
- `tests/shell-layout.test.ts`: 移除 legacy/PageFrame 断言，添加新模式断言
- `tests/logic-guardrails.test.ts`: 移除 `isHomePageDocument`/`homepageStore` 断言，删除 `homepage-context.ts` 引用
- `tests/loading-overlay-navigation.test.ts`: 移除 `isHomePageDocument` 断言
- `tests/wallpaper-full-bleed.test.ts`: 将 PageFrame 引用改为 SiteShell
- `tests/homepage-footer-styles.test.ts`: 将 PageFrame 引用改为 SiteShell
- `tests/component-lifecycle-cleanup.test.ts`: 移除 `isShellPage` 相关检查（如果有）

---

### 任务 1：更新 page-shell store — ShellMode 扩展，删除 isShellPage

**文件：**
- 修改：`src/stores/page-shell.ts`
- 修改：`tests/page-shell-store.test.ts`

- [ ] **Step 1: 更新 ShellMode 类型，删除 isShellPage**

将 `src/stores/page-shell.ts` 更新为：

```ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { siteConfig } from '../data/site';

export type ShellMode = 'home' | 'blog' | 'article' | 'error';

export interface PageShellState {
    title: string;
    mode: ShellMode;
    isHomePage: boolean;
}

export const usePageShellStore = defineStore('page-shell', () => {
    const title = ref(siteConfig.profile.name);
    const mode = ref<ShellMode>('home');
    const isHomePage = ref(true);
    const scrollProgress = ref(0);

    const leftPanelKey = computed(() => `${mode.value}:${title.value}`);

    function enterPage(next: PageShellState) {
        title.value = next.title;
        mode.value = next.mode;
        isHomePage.value = next.isHomePage;
    }

    function setScrollProgress(value: number) {
        if (!Number.isFinite(value)) {
            scrollProgress.value = 0;
            return;
        }

        scrollProgress.value = Math.max(0, Math.min(1, value));
    }

    function resetScrollProgress() {
        scrollProgress.value = 0;
    }

    return { title, mode, isHomePage, scrollProgress, leftPanelKey, enterPage, setScrollProgress, resetScrollProgress };
});
```

- [ ] **Step 2: 更新 store 测试**

更新 `tests/page-shell-store.test.ts`，删除 `isShellPage` 测试，添加新模式测试：

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
        expect(store.scrollProgress).toBe(0);
    });

    it('enters a blog shell page', () => {
        const store = usePageShellStore();
        store.enterPage({ title: '博客', mode: 'blog', isHomePage: false });
        expect(store.title).toBe('博客');
        expect(store.mode).toBe('blog');
        expect(store.isHomePage).toBe(false);
    });

    it('enters an article shell page', () => {
        const store = usePageShellStore();
        store.enterPage({ title: 'Hello World', mode: 'article', isHomePage: false });
        expect(store.title).toBe('Hello World');
        expect(store.mode).toBe('article');
        expect(store.isHomePage).toBe(false);
    });

    it('enters an error shell page', () => {
        const store = usePageShellStore();
        store.enterPage({ title: '404', mode: 'error', isHomePage: false });
        expect(store.title).toBe('404');
        expect(store.mode).toBe('error');
        expect(store.isHomePage).toBe(false);
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

- [ ] **Step 3: 运行测试确认通过**

Run: `npm test -- tests/page-shell-store.test.ts`

Expected: 5 passed.

- [ ] **Step 4: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/stores/page-shell.ts tests/page-shell-store.test.ts
git commit -m "refactor: expand ShellMode, remove isShellPage from store"
```

---

### 任务 2：更新 page-shell-context — 删除 isShellPage，添加新模式

**文件：**
- 修改：`src/lib/page-shell-context.ts`
- 修改：`tests/page-shell-context.test.ts`

- [ ] **Step 1: 更新 page-shell-context.ts**

将 `src/lib/page-shell-context.ts` 更新为：

```ts
import type { PageShellState, ShellMode } from '../stores/page-shell';

export const PAGE_SHELL_CHANGE_EVENT = 'wakusei:shell-page-change';

function isShellMode(value: string | undefined): value is ShellMode {
    return value === 'home' || value === 'blog' || value === 'article' || value === 'error';
}

function normalizePageShellState(value: unknown): PageShellState | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const detail = value as Record<string, unknown>;
    const mode = typeof detail.mode === 'string' && isShellMode(detail.mode) ? detail.mode : 'error';

    return {
        title: typeof detail.title === 'string' ? detail.title : '',
        mode,
        isHomePage: detail.isHomePage === true
    };
}

export function getPageShellStateFromElement(el: HTMLElement | null): PageShellState {
    if (!el) {
        return { title: '', mode: 'error', isHomePage: false };
    }

    const mode = isShellMode(el.dataset.shellMode) ? el.dataset.shellMode : 'error';
    const isHomePage = el.dataset.isHome === 'true';

    return {
        title: el.dataset.pageTitle ?? '',
        mode,
        isHomePage
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
        if (!(event instanceof CustomEvent)) {
            return;
        }

        const state = normalizePageShellState(event.detail);
        if (!state) {
            return;
        }

        callback(state);
    };
    window.addEventListener(PAGE_SHELL_CHANGE_EVENT, handler);
    return () => window.removeEventListener(PAGE_SHELL_CHANGE_EVENT, handler);
}
```

- [ ] **Step 2: 更新 context 测试**

更新 `tests/page-shell-context.test.ts`，删除 `isShellPage` 字段，添加新模式解析：

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
        el.dataset.shellMode = 'blog';
        el.dataset.pageTitle = '博客';
        el.dataset.isHome = 'false';

        expect(getPageShellStateFromElement(el)).toEqual({
            title: '博客',
            mode: 'blog',
            isHomePage: false
        });
    });

    it('reads article mode from an element', () => {
        const el = document.createElement('div');
        el.dataset.shellMode = 'article';
        el.dataset.pageTitle = 'Hello World';
        el.dataset.isHome = 'false';

        expect(getPageShellStateFromElement(el)).toEqual({
            title: 'Hello World',
            mode: 'article',
            isHomePage: false
        });
    });

    it('falls back to error mode when carrier is missing', () => {
        expect(getPageShellStateFromDocument(document)).toEqual({
            title: '',
            mode: 'error',
            isHomePage: false
        });
    });

    it('reads the pageTransitionSurface carrier from a document', () => {
        document.body.innerHTML = `
            <div id="pageTransitionSurface" data-shell-mode="home" data-page-title="遊星 Wakusei" data-is-home="true"></div>
        `;

        expect(getPageShellStateFromDocument(document)).toEqual({
            title: '遊星 Wakusei',
            mode: 'home',
            isHomePage: true
        });
    });

    it('subscribes to shell page change events', () => {
        const callback = vi.fn();
        const cleanup = subscribePageShellStateChange(callback);
        window.dispatchEvent(
            new CustomEvent(PAGE_SHELL_CHANGE_EVENT, {
                detail: { title: '博客', mode: 'blog', isHomePage: false }
            })
        );
        expect(callback).toHaveBeenCalledWith({ title: '博客', mode: 'blog', isHomePage: false });
        cleanup();
    });
});
```

- [ ] **Step 3: 运行测试确认通过**

Run: `npm test -- tests/page-shell-context.test.ts`

Expected: 5 passed.

- [ ] **Step 4: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/lib/page-shell-context.ts tests/page-shell-context.test.ts
git commit -m "refactor: add article/error modes, remove isShellPage from context"
```

---

### 任务 3：重构 BaseLayout — props 驱动 shellMode，移除条件分支

**文件：**
- 修改：`src/layouts/BaseLayout.astro`

- [ ] **Step 1: 重写 BaseLayout frontmatter 和 body**

在 `src/layouts/BaseLayout.astro` 中：

将 frontmatter 的 props interface 改为：

```ts
interface Props {
    title?: string;
    description?: string;
    shellMode?: 'home' | 'blog' | 'article' | 'error';
    shellTitle?: string;
}

const { title = siteConfig.title, description = siteConfig.description, shellMode = 'error', shellTitle = title } = Astro.props;
const isHomePage = shellMode === 'home';
```

删除 `pathname`、`isHomePage` (旧计算)、`isBlogListPage`、`shellMode` (旧计算)、`isShellPage`、`shellTitle` (旧计算)。

将 body 中的条件分支（`isShellPage ? (...) : (...)`）统一为单一结构：

```astro
<div id="pageScroller" class="page-scroller">
    <div transition:name="site-shell" transition:persist>
        <SiteShell client:load initialIsHomePage={isHomePage} />
    </div>
    <div
        id="pageTransitionSurface"
        class="page-transition-surface"
        data-shell-mode={shellMode}
        data-page-title={shellTitle}
        data-is-home={isHomePage ? 'true' : 'false'}
        transition:name="page-content"
    >
        <slot />
    </div>
    <div class="page-footer" transition:name="site-footer" transition:persist>
        <Footer
            client:load
            links={siteConfig.footer.links}
            socialLinks={siteConfig.socialLinks.links}
            copyrightText={siteConfig.footer.text}
        />
    </div>
</div>
```

移除 `data-shell-page` 属性（已不需要）。

在导航脚本中，`getShellStateFromDocument` 函数移除 `isShellPage` 字段：

```js
function getShellStateFromDocument(doc) {
    const carrier = doc.getElementById('pageTransitionSurface');
    if (!carrier) {
        return { title: '', mode: 'error', isHomePage: false };
    }
    const mode = carrier.dataset.shellMode === 'home' || carrier.dataset.shellMode === 'blog' || carrier.dataset.shellMode === 'article' || carrier.dataset.shellMode === 'error'
        ? carrier.dataset.shellMode
        : 'error';
    return {
        title: carrier.dataset.pageTitle || '',
        mode: mode,
        isHomePage: carrier.dataset.isHome === 'true'
    };
}
```

保留 `dispatchShellState` 和 `astro:before-swap` / `astro:after-swap` 监听。

- [ ] **Step 2: 更新页面文件传递 shellMode props**

`src/pages/index.astro`:
```astro
<BaseLayout shellMode="home" shellTitle={siteConfig.profile.name}>
```

`src/pages/posts/index.astro`:
```astro
<BaseLayout shellMode="blog" shellTitle="博客" title="博客">
```

`src/pages/posts/[...slug].astro`: 移除 `<PageFrame>`，改为：
```astro
<BaseLayout shellMode="article" shellTitle={frontmatter.title} title={frontmatter.title} description={frontmatter.description}>
    <article class="post-container">
        <!-- 保留文章内容结构，不含 PageFrame -->
    </article>
</BaseLayout>
```

删除 `import PageFrame from '../../components/PageFrame.vue';`。

`src/pages/404.astro`: 移除 `<PageFrame>`，改为：
```astro
<BaseLayout shellMode="error" shellTitle="404" title="404 - 页面不存在 | Page Not Found" description="This page could not be found">
    <div class="notfound-page">
        <!-- 保留 404 卡内容 -->
    </div>
</BaseLayout>
```

删除 `import PageFrame from '../components/PageFrame.vue';`。

- [ ] **Step 3: 运行 shell-layout 测试确认通过**

Run: `npm test -- tests/shell-layout.test.ts`

注意：此步骤后一些旧断言会失败（如 `isShellPage`、`PageFrame` 引用），在任务 8 中统一更新。

- [ ] **Step 4: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/layouts/BaseLayout.astro src/pages/index.astro src/pages/posts/index.astro "src/pages/posts/[...slug].astro" src/pages/404.astro
git commit -m "refactor: BaseLayout props-driven shellMode, remove isShellPage branch"
```

---

### 任务 4：更新 SiteShell — 四模式左面板，移除 isShellPage

**文件：**
- 修改：`src/components/SiteShell.vue`

- [ ] **Step 1: 移除 `isShellPage` 守卫和壁纸加载条件**

在 `src/components/SiteShell.vue` 的 `<template>` 中：

删除 `<div v-if="pageShell.isShellPage" class="hero-sticky">` 的 `v-if`，改为无条件渲染：

```html
<div class="hero-sticky">
```

在 `<script setup>` 中，将壁纸加载条件从 `if (mobile || !pageShell.isShellPage)` 改为 `if (mobile)`。

- [ ] **Step 2: 扩展左面板 Transition 到四个模式**

将 SiteShell 中现有的两分支 Transition 改为四分支：

```html
<Transition name="left-panel-content" mode="out-in">
    <header v-if="pageShell.mode === 'home'" :key="pageShell.leftPanelKey" class="hero">
        <!-- 完整 hero：头像、名字、状态、slogan、社交链接（保持现有不变） -->
    </header>

    <header v-else-if="pageShell.mode === 'blog'" :key="pageShell.leftPanelKey" class="hero hero-minimal">
        <h1 class="name" :style="{ opacity: heroOpacity }">
            <template v-for="part in splitLatinText(pageShell.title)" :key="part.text">
                <span v-if="part.isLatin" class="name-latin">{{ part.text }}</span>
                <template v-else>{{ part.text }}</template>
            </template>
        </h1>
    </header>

    <header v-else-if="pageShell.mode === 'article'" :key="pageShell.leftPanelKey" class="hero hero-minimal">
        <h1 class="name" :style="{ opacity: heroOpacity }">
            <template v-for="part in splitLatinText(pageShell.title)" :key="part.text">
                <span v-if="part.isLatin" class="name-latin">{{ part.text }}</span>
                <template v-else>{{ part.text }}</template>
            </template>
        </h1>
    </header>

    <!-- error mode: no header rendered -->
</Transition>
```

`blog` 和 `article` 模式使用相同的 `hero-minimal` 类显示标题。`error` 模式不渲染任何 header。

- [ ] **Step 3: 运行 lifecycle 和 shell-layout 测试**

Run: `npm test -- tests/component-lifecycle-cleanup.test.ts tests/shell-layout.test.ts`

注意：旧的 `v-if="pageShell.isShellPage"` 断言会失败，在任务 8 更新。

- [ ] **Step 4: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/components/SiteShell.vue
git commit -m "refactor: SiteShell four-mode left panel, remove isShellPage guard"
```

---

### 任务 5：更新 TopBar — 移除 isShellPage 分支

**文件：**
- 修改：`src/components/TopBar.vue`
- 修改：`tests/topbar-component.test.ts`

- [ ] **Step 1: 移除 `if (!pageShell.isShellPage) return 1` 分支**

在 TopBar 的 `expansionProgress` computed 中，删除 `if (!pageShell.isShellPage) return 1;` 这一行。

- [ ] **Step 2: 更新 TopBar 测试断言**

移除 `topbar-component.test.ts` 中检测 `pageShell.isShellPage` 的断言（如果有），确认测试仍通过。

Run: `npm test -- tests/topbar-component.test.ts`

- [ ] **Step 3: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/components/TopBar.vue tests/topbar-component.test.ts
git commit -m "refactor: remove isShellPage branch from TopBar"
```

---

### 任务 6：删除 legacy 代码 — PageFrame, useHomepage, homepage-context, homepage store

**文件：**
- 删除：`src/components/PageFrame.vue`
- 删除：`src/composables/useHomepage.ts`
- 删除：`src/stores/homepage.ts`
- 删除：`src/lib/homepage-context.ts`

- [ ] **Step 1: 删除文件**

```powershell
Remove-Item src/components/PageFrame.vue
Remove-Item src/composables/useHomepage.ts
Remove-Item src/stores/homepage.ts
Remove-Item src/lib/homepage-context.ts
```

- [ ] **Step 2: 运行 type check 确认没有残留 import**

Run: `npm run check`

如果有残留 import 引用报错，清理它们。

- [ ] **Step 3: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add -A
git commit -m "refactor: delete PageFrame, useHomepage, homepage-context, homepage store"
```

---

### 任务 7：删除 -webkit- CSS 前缀

**文件：**
- 修改：`src/styles/layout.css`
- 修改：`src/styles/responsive.css`
- 修改：`src/styles/topbar.css`
- 修改：`src/styles/dock.css`
- 修改：`src/styles/base.css`

- [ ] **Step 1: 删除所有 `-webkit-backdrop-filter` 行**

在以下文件中，删除包含 `-webkit-backdrop-filter` 的整个行（保留紧跟其后的无前缀 `backdrop-filter` 行）：

- `src/styles/layout.css` (1 处)
- `src/styles/responsive.css` (1 处)
- `src/styles/topbar.css` (3 处)
- `src/styles/dock.css` (1 处)

- [ ] **Step 2: 删除 `-webkit-user-select: none` 行**

在以下文件中，删除包含 `-webkit-user-select` 的整行：

- `src/styles/layout.css` (1 处，在 `.wallpaper-scroll-area` 中)
- `src/styles/base.css` (1 处，在 Users can select 文本块中)

- [ ] **Step 3: 运行 format check**

Run: `npm run format:check`

Expected: 所有文件格式正确。

- [ ] **Step 4: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add src/styles/layout.css src/styles/responsive.css src/styles/topbar.css src/styles/dock.css src/styles/base.css
git commit -m "style: remove -webkit- CSS prefixes"
```

---

### 任务 8：更新测试文件 — 移除 legacy 断言，添加新模式断言

**文件：**
- 修改：`tests/shell-layout.test.ts`
- 修改：`tests/logic-guardrails.test.ts`
- 修改：`tests/loading-overlay-navigation.test.ts`
- 修改：`tests/wallpaper-full-bleed.test.ts`
- 修改：`tests/homepage-footer-styles.test.ts`
- 修改：`tests/component-lifecycle-cleanup.test.ts`

- [ ] **Step 1: 重写 shell-layout.test.ts**

移除旧 `legacy` / `isShellPage` / `PageFrame` 断言，改为新模式断言：

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const baseLayout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
const siteShell = readFileSync('src/components/SiteShell.vue', 'utf8');
const homepageApp = readFileSync('src/components/HomepageApp.vue', 'utf8');
const indexPage = readFileSync('src/pages/index.astro', 'utf8');
const postsPage = readFileSync('src/pages/posts/index.astro', 'utf8');
const postDetailPage = readFileSync('src/pages/posts/[...slug].astro', 'utf8');
const notFoundPage = readFileSync('src/pages/404.astro', 'utf8');
const transitionsCss = readFileSync('src/styles/transitions.css', 'utf8');

describe('persistent shell layout guardrails', () => {
    it('unifies all pages in one page scroller without conditional branches', () => {
        expect(baseLayout).toContain('id="pageScroller"');
        expect(baseLayout).toContain('class="page-scroller"');
        expect(baseLayout).toContain('id="pageTransitionSurface"');
        expect(baseLayout).toContain('transition:name="site-shell"');
        expect(baseLayout).toContain('transition:persist');
        expect(baseLayout).toContain('transition:name="site-footer"');
        expect(baseLayout).not.toMatch(/isShellPage/);
    });

    it('uses props-driven shellMode instead of pathname inference', () => {
        expect(baseLayout).toContain('shellMode');
        expect(baseLayout).toContain('shellTitle');
        expect(baseLayout).not.toContain('const isShellPage');
        expect(baseLayout).not.toContain("const pathname = Astro.url.pathname");
    });

    it('orders shell, page content, and footer inside the page scroller', () => {
        const scrollerIndex = baseLayout.indexOf('id="pageScroller"');
        const surfaceIndex = baseLayout.indexOf('id="pageTransitionSurface"');
        const footerIndex = baseLayout.indexOf('transition:name="site-footer"');

        expect(scrollerIndex).toBeGreaterThanOrEqual(0);
        expect(surfaceIndex).toBeGreaterThan(scrollerIndex);
        expect(footerIndex).toBeGreaterThan(surfaceIndex);
    });

    it('exposes shell mode data on the content transition surface', () => {
        expect(baseLayout).toContain('data-shell-mode');
        expect(baseLayout).toContain('data-page-title');
        expect(baseLayout).toContain('data-is-home');
        expect(baseLayout).not.toContain('data-shell-page');
    });

    it('moves shared hero ownership into SiteShell', () => {
        expect(siteShell).toContain('wallpaper-scroll-area');
        expect(siteShell).toContain('left-panel');
        expect(siteShell).toContain('hero-sticky');
    });

    it('no page uses PageFrame', () => {
        expect(homepageApp).not.toContain('PageFrame');
        expect(indexPage).not.toContain('PageFrame');
        expect(postsPage).not.toContain('PageFrame');
        expect(postDetailPage).not.toContain('PageFrame');
        expect(notFoundPage).not.toContain('PageFrame');
    });

    it('does not gate hero by isShellPage', () => {
        expect(siteShell).not.toContain('isShellPage');
    });

    it('has transition surface with z-index and background', () => {
        expect(transitionsCss).toContain('.page-transition-surface');
        expect(transitionsCss).toMatch(/z-index:\s*var\(--z-content/);
        expect(transitionsCss).toMatch(/background:\s*var\(--bg/);
    });

    it('has hero-sticky with content z-index', () => {
        expect(transitionsCss).toContain('.hero-sticky');
        expect(transitionsCss).toMatch(/\.hero-sticky\s*\{[\s\S]*?z-index:\s*var\(--z-content/);
    });

    it('renders four shell modes in SiteShell left panel', () => {
        expect(siteShell).toContain("pageShell.mode === 'home'");
        expect(siteShell).toContain("pageShell.mode === 'blog'");
        expect(siteShell).toContain("pageShell.mode === 'article'");
    });
});
```

- [ ] **Step 2: 重写 logic-guardrails.test.ts**

移除 `isHomePageDocument` / `homepageStore` 相关断言，删除对 `homepage-context.ts` 的文件读取：

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const runtimeEffects = readFileSync(join(process.cwd(), 'src', 'lib', 'runtime-effects.ts'), 'utf-8');
const topBarComponent = readFileSync(join(process.cwd(), 'src', 'components', 'TopBar.vue'), 'utf-8');
const clockPanelComponent = readFileSync(join(process.cwd(), 'src', 'components', 'ClockPanel.vue'), 'utf-8');
const baseLayout = readFileSync(join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro'), 'utf-8');

describe('logic guardrails', () => {
    it('does not block copy and cut inside editable controls', () => {
        expect(runtimeEffects).toMatch(/const isEditableTarget = \(target: EventTarget \| null\) =>/);
        expect(runtimeEffects).toMatch(/document\.addEventListener\('copy',/);
        expect(runtimeEffects).toMatch(/document\.addEventListener\('cut',/);
        expect(runtimeEffects).toMatch(/if \(isEditableTarget\(event\.target\)\) return;/);
    });

    it('cleans up topbar magnify listeners and rebinds on homepage state changes', () => {
        expect(topBarComponent).toMatch(/let magnifyCleanup: \(\(\) => void\) \| undefined;/);
        expect(topBarComponent).toMatch(/watch\(\[isMobile, \(\) => pageShell\.isHomePage, barRef\]/);
        expect(topBarComponent).toMatch(/if \(magnifyCleanup\) \{/);
        expect(topBarComponent).toMatch(/magnifyCleanup = setupIconMagnifyHover\(\);/);
    });

    it('respects clock visibility config flags', () => {
        expect(clockPanelComponent).toMatch(/v-if="config\.showWeekday"/);
        expect(clockPanelComponent).toMatch(/v-if="config\.showDate && dateParts\.dateDisplay"/);
    });

    it('dispatches shell state before Astro swaps persisted islands', () => {
        const beforeSwapStart = baseLayout.indexOf("document.addEventListener('astro:before-swap'");
        const afterSwapStart = baseLayout.indexOf("document.addEventListener('astro:after-swap'", beforeSwapStart);
        const beforeSwapBlock = baseLayout.slice(beforeSwapStart, afterSwapStart);

        expect(beforeSwapStart).toBeGreaterThanOrEqual(0);
        expect(beforeSwapBlock).toContain('event.newDocument');
        expect(beforeSwapBlock).toContain('getShellStateFromDocument(event.newDocument)');
        expect(beforeSwapBlock).toContain('dispatchShellState');
        expect(baseLayout).toContain('pageTransitionSurface');
        expect(baseLayout).toContain('wakusei:shell-page-change');
    });

    it('resets the shared page scroller after Astro swaps content', () => {
        const afterSwapStart = baseLayout.indexOf("document.addEventListener('astro:after-swap'");
        const afterSwapBlock = baseLayout.slice(afterSwapStart);

        expect(afterSwapStart).toBeGreaterThanOrEqual(0);
        expect(afterSwapBlock).toContain("document.getElementById('pageScroller')");
        expect(afterSwapBlock).toContain('scrollTo({ top: 0 })');
    });

    it('does not use isHomePageDocument or homepage-context', () => {
        expect(topBarComponent).not.toContain('isHomePageDocument');
        expect(topBarComponent).not.toContain('useHomepage');
    });
});
```

- [ ] **Step 3: 更新 loading-overlay-navigation.test.ts**

移除对 `isHomePageDocument` 的断言。将 `it('does not make non-home direct entry loads wait on homepage readiness')` 中的 `shouldWaitForHomepage` 断言保留，但移除所有对 `isHomePageDocument` 的引用。

在文件顶部，删除 `const homepageContext = ...` 行（如果有的话）。

- [ ] **Step 4: 更新 wallpaper-full-bleed.test.ts**

将 `PageFrame.vue` 引用改为 `SiteShell.vue`：

```ts
const siteShell = readFileSync(join(process.cwd(), 'src', 'components', 'SiteShell.vue'), 'utf8');
const layoutCss = readFileSync(join(process.cwd(), 'src', 'styles', 'layout.css'), 'utf8');
const responsiveCss = readFileSync(join(process.cwd(), 'src', 'styles', 'responsive.css'), 'utf8');
```

将测试中 `pageFrame` 引用替换为 `siteShell`。

- [ ] **Step 5: 更新 homepage-footer-styles.test.ts**

同样将 `PageFrame.vue` 引用改为 `SiteShell.vue` 或直接删除对 `pageFrame` 变量的使用。

- [ ] **Step 6: 更新 component-lifecycle-cleanup.test.ts**

确认不包含 `isShellPage` 相关断言。如有则移除。

- [ ] **Step 7: 运行完整测试套件**

Run: `npm test`

Expected: 所有测试通过。

- [ ] **Step 8: Optional commit checkpoint**

Only if the user explicitly requested commits:

```powershell
git add tests/
git commit -m "test: update tests for phase 2 shellMode, remove legacy assertions"
```

---

### 任务 9：最终验证

**文件：** 所有本计划涉及的文件

- [ ] **Step 1: 运行完整测试套件**

Run: `npm test`

Expected: 所有测试通过。

- [ ] **Step 2: 运行 lint**

Run: `npm run lint`

Expected: 0 errors（warnings 可接受）。

- [ ] **Step 3: 运行 format check**

Run: `npm run format:check`

Expected: 所有文件格式正确。

- [ ] **Step 4: 运行 Astro check**

Run: `npm run check`

Expected: 0 errors。

- [ ] **Step 5: 构建**

Run: `npm run build`

Expected: 静态构建完成，所有页面生成。

- [ ] **Step 6: 确认删除文件不存在**

确认以下文件已不存在：
- `src/components/PageFrame.vue`
- `src/composables/useHomepage.ts`
- `src/stores/homepage.ts`
- `src/lib/homepage-context.ts`

- [ ] **Step 7: 确认没有残留引用**

搜索整个 `src/` 和 `tests/` 目录，确认没有对以下内容的引用：
- `PageFrame`（除了注释）
- `useHomepage`
- `isHomePageDocument`
- `homepage-context`
- `isShellPage`
- `-webkit-backdrop-filter`
- `-webkit-user-select`

- [ ] **Step 8: 手动浏览器验证**

运行 dev server：

```powershell
npm run dev
```

检查以下行为：
- `/` 显示完整 hero（头像、名字、状态、slogan、社交链接）
- `/posts` 左面板显示“博客”
- `/posts/hello-world` 左面板显示文章标题，hero 3D 下沉正常
- `/404` 没有左面板内容，壁纸 + TopBar 正常
- 三个页面之间切换时 SiteShell 不重建、壁纸不重载、TopBar 不重播
- 文章页和 404 页有 Footer

---

## 自查

- **Spec 覆盖**: ShellMode 扩展 ✓ | BaseLayout 去条件化 ✓ | props 驱动 ✓ | isShellPage 删除 ✓ | legacy 删除 ✓ | useHomepage 删除 ✓ | -webkit 删除 ✓ | PageFrame 删除 ✓ | SiteShell 四模式 ✓ | 文章页迁移 ✓ | 404 迁移 ✓ | 测试更新 ✓
- **占位符扫描**: 无 TBD/TODO。每步有完整代码和命令。
- **类型一致性**: `ShellMode = 'home' | 'blog' | 'article' | 'error'` 与 `PageShellState` 一致。`isShellPage` 完全移除。
- **范围检查**: 不包含时钟面板、不包含 Swup 回迁、不包含文章阅读体验重构。