# Unified Scroll Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify scroll behavior across all pages — TopBar expansion animation, hero parallax, and content-over-hero on every mode (home/blog/article/error).

**Architecture:** Remove `body.is-home` CSS differences so all pages use `overflow: hidden; height: 100vh` with `page-scroller` as the sole scroll container. Delete the `isHomePage` early-return branch in TopBar's `expansionProgress` so all desktop pages get scroll-driven TopBar expansion. Bump `page-transition-surface` padding-top to 4.5rem to match TopBar height.

**Tech Stack:** Astro 6, Vue 3 Composition API, Pinia, TypeScript, Vitest, CSS.

---

## 文件地图

### 修改

- `src/styles/topbar.css`: 统一 body 样式，删除 `body.is-home` 覆盖规则
- `src/styles/base.css`: `html`/`body` 统一滚动架构，删除 `html.is-home`/`body.is-home` 规则
- `src/styles/transitions.css`: `.page-transition-surface` padding 从 `4rem 2rem` 改为 `4.5rem 2rem`
- `src/components/TopBar.vue`: 删除 `expansionProgress` 中的 `!pageShell.isHomePage` 早返回，删除 magnify watch 中的 `!pageShell.isHomePage` 条件
- `tests/topbar-component.test.ts`: 更新断言反映 expansionProgress 不再区分 isHomePage

---

### 任务 1：统一 body 样式 — topbar.css + base.css

**文件：**
- 修改：`src/styles/topbar.css`
- 修改：`src/styles/base.css`

- [ ] **Step 1: 修改 `src/styles/topbar.css` 的 body 规则**

将开头的两段 body 规则从：

```css
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
```

改为：

```css
body {
    overflow: hidden;
    height: 100vh;
    transition: none;
}
```

删除 `body.is-home` 规则，删除 `padding-top: 72px`（TopBar 是 fixed 定位不需要 padding），删除 `overflow: auto` 和 `height: auto`。

- [ ] **Step 2: 修改 `src/styles/base.css` 的 html 和 body 规则**

在 `html` 规则中添加 `height: 100%`，在 `body` 规则中确保 `overflow: hidden; height: 100vh;`。

删除 `html.is-home` 和 `body.is-home` 的特殊规则（`overflow: hidden; height: 100%` 等已移到全局规则中）。

具体改动：

找到现有的：

```css
html.is-home {
    height: 100%;
}
```

在 `html` 的默认规则中添加 `height: 100%;`，然后删除 `html.is-home` 规则。

找到：

```css
html.is-home {
    height: 100%;
    overflow: hidden;
}

body.is-home {
    height: 100%;
    overflow: hidden;
}
```

将这两段规则完全删除（它们的效果现在由全局 `html { height: 100% }` 和 `body { overflow: hidden; height: 100vh }` 覆盖）。

- [ ] **Step 3: 修改 `src/styles/base.css` 中 `body` 默认规则**

确保 `body` 的默认规则包含 `overflow: hidden; height: 100vh;`。当前 body 规则大约在 base.css 的 177-189 行区域。不改变其他属性（font-family, line-height, color, background-color, transition），只确保没有 `overflow: auto` 和 `height: auto`。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test`

Expected: 所有测试通过。

---

### 任务 2：统一 page-transition-surface padding-top

**文件：**
- 修改：`src/styles/transitions.css`

- [ ] **Step 1: 修改 `.page-transition-surface` 的 padding**

将 `src/styles/transitions.css` 中：

```css
.page-transition-surface {
    min-height: 100vh;
    padding: 4rem 2rem;
    background: var(--bg, #fffef7);
    position: relative;
    z-index: var(--z-content, 50);
}
```

改为：

```css
.page-transition-surface {
    min-height: 100vh;
    padding: 4.5rem 2rem;
    background: var(--bg, #fffef7);
    position: relative;
    z-index: var(--z-content, 50);
}
```

4.5rem = 72px（16px × 4.5），正好等于 TopBar 高度，确保内容不被 TopBar 遮挡。

- [ ] **Step 2: 检查 responsive.css 中移动端的 padding 覆盖**

确认 `src/styles/responsive.css` 中是否有 `.page-transition-surface` 的移动端 padding 覆盖。如果有 `padding: 2rem 1rem` 之类的值，将 `2rem` 改为 `2.5rem`（移动端 TopBar 也是 72px 高）。

实际上移动端 TopBar 也是全宽的，所以移动端的 padding-top 也应该足够。检查现有值：

```css
.page-transition-surface {
    padding: 2rem 1rem;
}
```

改为：

```css
.page-transition-surface {
    padding: 2.5rem 1rem;
}
```

仅在 `@media (max-width: 900px)` 块内。

- [ ] **Step 3: 运行格式检查**

Run: `npm run format:check`

Expected: 通过。

---

### 任务 3：TopBar 删除 isHomePage 分支

**文件：**
- 修改：`src/components/TopBar.vue`

- [ ] **Step 1: 删除 expansionProgress 中的 isHomePage 早返回**

在 `src/components/TopBar.vue` 中，当前：

```ts
const expansionProgress = computed(() => {
    if (!pageShell.isHomePage) return 1;
    if (isMobile.value) return 1;
    const sp = pageShell.scrollProgress;
    if (sp <= 0.02) return 0;
    if (sp >= 0.45) return 1;
    const raw = (sp - 0.02) / 0.43;
    return 1 - Math.pow(1 - raw, 4);
});
```

删除 `if (!pageShell.isHomePage) return 1;` 这一行，改为：

```ts
const expansionProgress = computed(() => {
    if (isMobile.value) return 1;
    const sp = pageShell.scrollProgress;
    if (sp <= 0.02) return 0;
    if (sp >= 0.45) return 1;
    const raw = (sp - 0.02) / 0.43;
    return 1 - Math.pow(1 - raw, 4);
});
```

- [ ] **Step 2: 删除 magnify watch 中的 isHomePage 条件**

当前：

```ts
watch([isMobile, () => pageShell.isHomePage, barRef], () => {
    if (magnifyCleanup) {
        magnifyCleanup();
        magnifyCleanup = undefined;
    }

    if (!barRef.value || isMobile.value || !pageShell.isHomePage) return;
    magnifyCleanup = setupIconMagnifyHover();
});
```

将 `!pageShell.isHomePage` 条件删除，同时从 watch 源数组中移除 `() => pageShell.isHomePage`：

```ts
watch([isMobile, barRef], () => {
    if (magnifyCleanup) {
        magnifyCleanup();
        magnifyCleanup = undefined;
    }

    if (!barRef.value || isMobile.value) return;
    magnifyCleanup = setupIconMagnifyHover();
});
```

- [ ] **Step 3: 运行测试**

Run: `npm test`

Expected: 所有测试通过（topbar-component.test.ts 可能需要更新断言，见任务 4）。

---

### 任务 4：更新测试文件

**文件：**
- 修改：`tests/topbar-component.test.ts`
- 修改：`tests/shell-layout.test.ts`

- [ ] **Step 1: 更新 topbar-component.test.ts**

检查 `tests/topbar-component.test.ts` 中是否有断言 `expansionProgress` 在非 homepage 时返回 1 的语句。如果有，删除或修改。

检查是否有断言 Dock 图标的 magnify hover 只在 homepage 启用的语句。如果有，删除或修改。

- [ ] **Step 2: 在 shell-layout.test.ts 中添加统一滚动架构断言**

在 `tests/shell-layout.test.ts` 中添加断言验证：

```ts
it('unifies body styles across all pages', () => {
    expect(baseLayout).not.toContain('padding-top: 72px');
});

it('uses page-scroller as the sole scroll container', () => {
    expect(baseLayout).toContain('id="pageScroller"');
    expect(baseLayout).toContain('class="page-scroller"');
});

it('applies TopBar expansion animation to all desktop modes', () => {
    const topBar = readFileSync('src/components/TopBar.vue', 'utf8');
    expect(topBar).not.toContain('if (!pageShell.isHomePage) return 1');
    expect(topBar).toContain('expansionProgress');
});
```

注意：需要在文件顶部添加 `readFileSync` 导入（如果还没有的话），以及 `topBarComponent` 变量。检查现有导入。

- [ ] **Step 3: 运行完整测试套件**

Run: `npm test`

Expected: 所有测试通过。

---

### 任务 5：最终验证

**文件：** 所有本计划涉及的文件

- [ ] **Step 1: 运行完整测试套件**

Run: `npm test`

Expected: 所有测试通过。

- [ ] **Step 2: 运行 lint**

Run: `npm run lint`

Expected: 0 errors（warnings 可接受）。

- [ ] **Step 3: 运行 format check**

Run: `npm run format:check`

Expected: 所有文件格式正确。如果失败，运行 `npm run format`。

- [ ] **Step 4: 运行 Astro check**

Run: `npm run check`

Expected: 0 errors。

- [ ] **Step 5: 构建**

Run: `npm run build`

Expected: 静态构建完成，所有页面生成。

- [ ] **Step 6: 确认 CSS 中不再有 `body.is-home` 和 `html.is-home` 样式差异**

搜索 `src/styles/` 中不再有 `.is-home` 的样式差异规则（`topbar.css`、`base.css`、`responsive.css` 等）。保留 JS 中的 `is-home` 类判断逻辑。

- [ ] **Step 7: 确认 TopBar 不再有 `isHomePage` 早期返回**

搜索 `src/components/TopBar.vue` 确认不包含 `if (!pageShell.isHomePage) return 1` 或 `!pageShell.isHomePage` 在 magnify watch 中。

---

## 自查

- **Spec 覆盖**: 统一 body 样式 ✓ | TopBar 展开动画全覆盖 ✓ | magnify hover 全覆盖 ✓ | padding-top 4.5rem ✓ | is-home CSS 差异删除 ✓ | 测试更新 ✓
- **占位符扫描**: 无 TBD/TODO。每步有完整代码和命令。
- **类型一致性**: `expansionProgress` 返回类型不变（`number`），watch 源数组元素类型兼容。
- **范围检查**: 不包含首页内容布局重构、不包含 Swup 回迁、不包含时钟面板变更。