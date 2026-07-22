# 导航栏滚动方向显隐 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 TopBar 展开动画基础上，叠加"上滑显示、下滑隐藏"行为，桌面端和移动端均生效。

**Architecture:** 在 page-shell store 新增 `scrollDirection` 状态，SiteShell.vue 的 scroll handler 中记录方向，TopBar.vue 消费后通过 `translateY` 控制显隐，CSS transition 驱动动画。

**Tech Stack:** Vue 3 + Pinia + TypeScript + CSS

---

### Task 1: page-shell store — 新增 scrollDirection

**Files:**
- Modify: `src/stores/page-shell.ts`

- [ ] **Step 1: 新增 scrollDirection ref 和 setScrollDirection action**

在 `src/stores/page-shell.ts` 中，在 `scrollProgress` ref 之后添加 `scrollDirection` ref，在 `setScrollProgress` 之后添加 `setScrollDirection` action，并在 return 中导出。

```typescript
const scrollDirection = ref<'up' | 'down'>('up');

function setScrollDirection(value: 'up' | 'down') {
    scrollDirection.value = value;
}

return { title, mode, isHomePage, scrollProgress, scrollDirection, leftPanelKey, enterPage, setScrollProgress, setScrollDirection, resetScrollProgress };
```

- [ ] **Step 2: 验证编译**

Run: `npm run check`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add src/stores/page-shell.ts
git commit -m "feat(store): add scrollDirection to page-shell store"
```

---

### Task 2: SiteShell.vue — 跟踪滚动方向

**Files:**
- Modify: `src/components/SiteShell.vue`

- [ ] **Step 1: 在 scroll handler 中记录方向**

在 `attachScrollListener` 函数中，添加 `lastScrollY` 变量，每次滚动时比较当前 `scrollTop` 与上一次值，判断方向后调用 `pageShell.setScrollDirection()`。

```typescript
function attachScrollListener() {
    scrollCleanup?.();
    scrollCleanup = undefined;
    const scroller = document.getElementById('pageScroller');
    if (!scroller) return;
    let lastScrollY = scroller.scrollTop;
    const handleScroll = () => {
        const currentScrollTop = scroller.scrollTop;
        pageShell.setScrollProgress(Math.min(currentScrollTop / window.innerHeight, 1));
        if (currentScrollTop > lastScrollY) {
            pageShell.setScrollDirection('down');
        } else if (currentScrollTop < lastScrollY) {
            pageShell.setScrollDirection('up');
        }
        lastScrollY = currentScrollTop;
    };
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    scrollCleanup = () => {
        scroller.removeEventListener('scroll', handleScroll);
    };
}
```

- [ ] **Step 2: 验证编译**

Run: `npm run check`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add src/components/SiteShell.vue
git commit -m "feat(shell): track scroll direction in SiteShell"
```

---

### Task 3: TopBar.vue — 添加 translateY 显隐逻辑

**Files:**
- Modify: `src/components/TopBar.vue`

- [ ] **Step 1: 添加 navTranslateY 计算属性**

在 `barExpandStyle` computed 之后添加 `navTranslateY` computed：

```typescript
const navTranslateY = computed(() => {
    const sp = pageShell.scrollProgress;
    const dir = pageShell.scrollDirection;
    if (sp <= 0.05) return '0';
    if (dir === 'down') return '-100%';
    return '0';
});
```

- [ ] **Step 2: 将 navTranslateY 应用到模板的 style 中**

在模板的 `.top-bar` div 上，将 `navTranslateY` 合并到 `:style`：

```typescript
:style="`${barExpandStyle}; --nav-translate-y: ${navTranslateY}`"
```

找到：
```vue
    <div
        ref="barRef"
        :key="'bar-' + hydrateKey"
        class="top-bar"
        role="toolbar"
        aria-label="Top navigation"
        :style="barExpandStyle"
    >
```

改为：
```vue
    <div
        ref="barRef"
        :key="'bar-' + hydrateKey"
        class="top-bar"
        role="toolbar"
        aria-label="Top navigation"
        :style="`${barExpandStyle}; --nav-translate-y: ${navTranslateY}`"
    >
```

- [ ] **Step 3: 验证编译**

Run: `npm run check`
Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add src/components/TopBar.vue
git commit -m "feat(topbar): add scroll-direction-based translateY for hide/show"
```

---

### Task 4: topbar.css — 添加 transform transition

**Files:**
- Modify: `src/styles/topbar.css`

- [ ] **Step 1: 在 .top-bar 上添加 transform 和 transition**

在 `.top-bar` 的 `transition` 列表中追加 `transform`，并添加 `transform: translateY(var(--nav-translate-y, 0))`：

```css
.top-bar {
    position: fixed;
    top: 0;
    left: var(--bar-left, 0px);
    right: 0;
    height: 72px;
    background-color: rgba(255, 254, 247, 0.55);
    backdrop-filter: blur(40px) saturate(220%);
    border: none;
    border-bottom: 1px solid rgba(0, 0, 0, 0.2);
    color: #0a0a0a;
    border-radius: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    box-sizing: border-box;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transform: translateY(var(--nav-translate-y, 0));
    transition:
        left 0.35s cubic-bezier(0.16, 1, 0.3, 1),
        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        background-color var(--transition-normal),
        border-bottom-color var(--transition-normal),
        color var(--transition-normal),
        box-shadow var(--transition-normal);
    view-transition-name: top-bar;
}
```

- [ ] **Step 2: 验证编译**

Run: `npm run check`
Expected: 无类型错误

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add src/styles/topbar.css
git commit -m "feat(css): add transform transition for nav hide/show"
```
