# Full-Width TopBar Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the TopBar span the entire width on all pages, with wallpaper filling the full background on homepage, and remove the right panel (ClockPanel).

**Architecture:** Simplify from two-column to single-column layout. Remove TopBar expansion animation. Wallpaper becomes full-viewport background. Left panel floats over wallpaper.

**Tech Stack:** Vue 3 Composition API, Astro, CSS

---

## File Structure

### Files to Modify
1. `src/styles/topbar.css` - Remove homepage-specific TopBar animation styles
2. `src/styles/layout.css` - Change to single-column layout, expand wallpaper
3. `src/styles/responsive.css` - Update mobile breakpoints
4. `src/components/PageFrame.vue` - Remove right panel, adjust layout
5. `src/components/TopBar.vue` - Remove expansion animation logic

### Files to Reference (read-only)
- `src/styles/base.css` - CSS variables
- `src/components/SiteShell.vue` - TopBar integration

---

## Task 1: Update topbar.css - Remove Homepage Animation

**Files:**
- Modify: `src/styles/topbar.css:15-27`

- [ ] **Step 1: Remove body.is-home special case**

Current code at lines 15-27:
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

Replace with:
```css
body {
    padding-top: 72px;
    overflow: auto;
    height: auto;
    transition: none;
}
```

- [ ] **Step 2: Verify TopBar styles remain correct**

The `.top-bar` class at line 29 already has:
```css
.top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    /* ... other styles ... */
}
```

This is already correct for full-width. No changes needed to `.top-bar` itself.

- [ ] **Step 3: Commit**

```bash
git add src/styles/topbar.css
git commit -m "style: remove homepage TopBar special case"
```

---

## Task 2: Update layout.css - Single Column Layout

**Files:**
- Modify: `src/styles/layout.css:6-15` (container)
- Modify: `src/styles/layout.css:25-49` (left-panel)
- Modify: `src/styles/layout.css:57-67` (right-panel)
- Modify: `src/styles/layout.css:111-128` (wallpaper-scroll-area)

- [ ] **Step 1: Update .container to single-column**

Current code at lines 6-15:
```css
.container {
    display: flex;
    flex-wrap: nowrap;
    height: 100vh;
    overflow: hidden;
    opacity: 1;
    visibility: visible;
    filter: none;
    pointer-events: auto;
}
```

Replace with:
```css
.container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    opacity: 1;
    visibility: visible;
    filter: none;
    pointer-events: auto;
    position: relative;
}
```

- [ ] **Step 2: Update .left-panel for floating effect**

Current code at lines 25-49:
```css
.left-panel {
    width: 500px;
    flex-shrink: 0;
    min-width: 320px;
    padding: var(--space-xl, 3rem);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    border-right: 1px solid var(--panel-border);
    background-color: var(--panel-bg);
    backdrop-filter: var(--panel-blur);
    -webkit-backdrop-filter: var(--panel-blur);
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    z-index: var(--z-content, 50);
    contain: layout style;
    box-shadow: none;
    transition:
        width var(--transition-normal),
        padding var(--transition-normal),
        border-right-width var(--transition-normal),
        background-color var(--transition-normal);
}
```

Replace with:
```css
.left-panel {
    width: 500px;
    flex-shrink: 0;
    min-width: 320px;
    padding: var(--space-xl, 3rem);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    border-right: 1px solid var(--panel-border);
    background-color: var(--panel-bg);
    backdrop-filter: var(--panel-blur);
    -webkit-backdrop-filter: var(--panel-blur);
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    z-index: var(--z-content, 50);
    contain: layout style;
    box-shadow: none;
    transition:
        width var(--transition-normal),
        padding var(--transition-normal),
        border-right-width var(--transition-normal),
        background-color var(--transition-normal);
}
```

- [ ] **Step 3: Remove .right-panel styles**

Current code at lines 57-67:
```css
.right-panel {
    flex: 1;
    min-width: 300px;
    display: flex;
    flex-direction: column;
    background-color: transparent;
    color: #fffef7;
    position: relative;
    z-index: 1;
}
```

Replace with:
```css
.right-panel {
    display: none;
}
```

- [ ] **Step 4: Update .wallpaper-scroll-area to full viewport**

Current code at lines 111-128:
```css
.wallpaper-scroll-area {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: var(--z-wallpaper, 0);
    background-color: #fffef7;
    background-color: var(--bg, #fffef7);
    scrollbar-width: none;
    contain: layout style paint;
    pointer-events: none;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
}
```

Replace with:
```css
.wallpaper-scroll-area {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: var(--z-wallpaper, 0);
    background-color: #fffef7;
    background-color: var(--bg, #fffef7);
    scrollbar-width: none;
    pointer-events: none;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/styles/layout.css
git commit -m "style: convert to single-column layout"
```

---

## Task 3: Update responsive.css - Mobile Styles

**Files:**
- Modify: `src/styles/responsive.css:17-154` (mobile breakpoint)

- [ ] **Step 1: Update mobile container styles**

Current code at lines 17-32:
```css
@media (max-width: 900px) {
    html,
    body {
        overflow-y: auto;
        height: auto;
    }

    .container {
        flex-direction: column;
        overflow-y: auto;
        overflow-x: hidden;
        height: auto;
        min-height: 100vh;
    }
```

Replace with:
```css
@media (max-width: 900px) {
    html,
    body {
        overflow-y: auto;
        height: auto;
    }

    .container {
        flex-direction: column;
        overflow-y: auto;
        overflow-x: hidden;
        height: auto;
        min-height: 100vh;
    }
```

- [ ] **Step 2: Remove right-panel mobile styles**

Current code at lines 104-126:
```css
    .right-panel {
        display: block;
        position: fixed;
        top: 0;
        right: 0;
        z-index: var(--z-dock);
        width: 100vw;
        min-width: 0;
        height: 0;
        flex: 0 0 0;
        overflow: visible;
        pointer-events: none;
    }

    .right-panel .nav-dock {
        pointer-events: auto;
    }

    .wallpaper-scroll-area,
    .right-panel .right-panel-shadow,
    .right-panel .info-panel {
        display: none;
    }
```

Replace with:
```css
    .right-panel {
        display: none;
    }
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/responsive.css
git commit -m "style: simplify mobile layout styles"
```

---

## Task 4: Update PageFrame.vue - Remove Right Panel

**Files:**
- Modify: `src/components/PageFrame.vue:1-11` (imports)
- Modify: `src/components/PageFrame.vue:233-238` (right-panel template)
- Modify: `src/components/PageFrame.vue:257-271` (scoped styles)

- [ ] **Step 1: Remove ClockPanel import**

Current code at lines 7-8:
```typescript
import ClockPanel from './ClockPanel.vue';
```

Remove this line.

- [ ] **Step 2: Remove right-panel template**

Current code at lines 233-238:
```html
                    <aside class="right-panel">
                        <div class="right-panel-shadow" />
                        <div class="info-panel">
                            <ClockPanel :config="siteConfig.time" />
                        </div>
                    </aside>
```

Remove this entire block.

- [ ] **Step 3: Verify scoped styles**

The scoped styles at lines 257-271 should remain as they are (they handle `.page-content` and `.page-footer`).

- [ ] **Step 4: Commit**

```bash
git add src/components/PageFrame.vue
git commit -m "refactor: remove right panel from PageFrame"
```

---

## Task 5: Update TopBar.vue - Remove Expansion Animation

**Files:**
- Modify: `src/components/TopBar.vue:79-101` (expansionProgress, barStyle, rightStyle, leftStyle)

- [ ] **Step 1: Remove expansionProgress computed**

Current code at lines 79-87:
```typescript
const expansionProgress = computed(() => {
    if (!isHomePage.value) return 1;
    if (isMobile.value) return 1;
    const sp = scrollProgress.value;
    if (sp <= 0.02) return 0;
    if (sp >= 0.45) return 1;
    const raw = (sp - 0.02) / 0.43;
    return 1 - Math.pow(1 - raw, 4);
});
```

Remove this computed property.

- [ ] **Step 2: Simplify barStyle computed**

Current code at lines 89-94:
```typescript
const barStyle = computed(() => {
    if (!isHomePage.value) return 'opacity: 1; transform: translateX(0)';
    if (isMobile.value) return `opacity: ${topBarOpacity.value}; transform: translateX(0)`;
    const p = expansionProgress.value;
    return `opacity: 1; transform: translateX(calc(var(--left-panel-width, 500px) * ${1 - p}))`;
});
```

Replace with:
```typescript
const barStyle = computed(() => {
    if (!isHomePage.value) return 'opacity: 1; transform: translateX(0)';
    if (isMobile.value) return `opacity: ${topBarOpacity.value}; transform: translateX(0)`;
    return 'opacity: 1; transform: translateX(0)';
});
```

- [ ] **Step 3: Remove rightStyle computed**

Current code at lines 96-101:
```typescript
const rightStyle = computed(() => {
    if (!isHomePage.value) return 'transform: translateX(0)';
    if (isMobile.value) return 'transform: translateX(0)';
    const p = expansionProgress.value;
    return `transform: translateX(calc(var(--left-panel-width, 500px) * ${p - 1}))`;
});
```

Replace with:
```typescript
const rightStyle = computed(() => {
    return 'transform: translateX(0)';
});
```

- [ ] **Step 4: Remove leftStyle computed**

Current code at lines 103-109:
```typescript
const leftStyle = computed(() => {
    if (!isHomePage.value || isMobile.value) return '';
    const p = expansionProgress.value;
    const x = (1 - expansionProgress.value) * 18;
    if (p >= 1 && x <= 0.01) return '';
    return `opacity: ${p}; transform: translateX(${-x}px)`;
});
```

Replace with:
```typescript
const leftStyle = computed(() => {
    return '';
});
```

- [ ] **Step 5: Commit**

```bash
git add src/components/TopBar.vue
git commit -m "refactor: remove TopBar expansion animation"
```

---

## Task 6: Verification

**Files:**
- None (testing only)

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: No errors

- [ ] **Step 2: Run format check**

```bash
npm run format:check
```

Expected: No errors

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Run dev server and verify visually**

```bash
npm run dev
```

Verify:
- TopBar spans full width on homepage
- TopBar spans full width on /posts page
- Wallpaper fills entire background on homepage
- Left panel content visible over wallpaper
- No right panel (ClockPanel) visible
- Mobile layout works correctly

- [ ] **Step 5: Commit final state**

```bash
git add -A
git commit -m "feat: implement full-width TopBar layout"
```

---

## Summary

This plan converts the layout from two-column to single-column, removes the TopBar expansion animation, and makes the wallpaper fill the entire viewport. The changes are primarily CSS-focused with minimal Vue component modifications.

Total tasks: 6
Total steps: 18
