# Wallpaper Full-Bleed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the wallpaper scroll area extend across the entire viewport (full-bleed background), with the left panel overlaying it opaquely so the wallpaper is only visible in the right panel area.

**Architecture:** Move `.wallpaper-scroll-area` from inside `.right-panel` to inside `.container` as a sibling of `.left-panel` and `.right-panel`. Reposition it to fill the entire container using `position: absolute; inset: 0`. Keep the left panel opaque at z-index 50, so it covers the wallpaper beneath. On mobile (≤900px) the wallpaper stays hidden. The wallpaper scroller's JS logic needs no functional changes — it attaches to whatever container element `wallpaperRef` points to.

**Tech Stack:** Astro 6, SolidJS, TypeScript, CSS, Node built-in tests.

---

### Task 1: Move wallpaper DOM element to container level

**Files:**
- Modify: `src/components/HomepageApp.tsx`
- Modify: `tests/wallpaper-full-bleed.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/wallpaper-full-bleed.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const homepageApp = readFileSync(join(process.cwd(), 'src', 'components', 'HomepageApp.tsx'), 'utf8');
const layoutCss = readFileSync(join(process.cwd(), 'src', 'styles', 'layout.css'), 'utf8');
const responsiveCss = readFileSync(join(process.cwd(), 'src', 'styles', 'responsive.css'), 'utf8');

describe('wallpaper full-bleed layout', () => {
    it('places wallpaper-scroll-area outside right-panel as a sibling of left-panel', () => {
        assert.match(homepageApp, /class="wallpaper-scroll-area"/);
        assert.doesNotMatch(
            homepageApp,
            /<aside[^>]*class="right-panel"[^>]*>[\s\S]*?wallpaper-scroll-area/,
            'wallpaper-scroll-area should not be inside right-panel'
        );
    });

    it('makes wallpaper-fill-area span the full container', () => {
        assert.match(
            layoutCss,
            /\.wallpaper-scroll-area\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;[\s\S]*?\}/,
            'wallpaper should be absolutely positioned with inset:0 to fill the container'
        );
    });

    it('hides wallpaper on mobile screens', () => {
        assert.match(
            responsiveCss,
            /\.wallpaper-scroll-area\s*\{[\s\S]*?display:\s*none/,
            'wallpaper should be hidden on mobile'
        );
    });

    it('keeps left-panel opaque above the wallpaper', () => {
        assert.match(
            layoutCss,
            /\.left-panel\s*\{[\s\S]*?z-index:\s*var\(--z-content,\s*50\);/,
            'left-panel must have a z-index above the wallpaper'
        );
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/wallpaper-full-bleed.test.ts`
Expected: At least the "wallpaper should not be inside right-panel" assertion fails because the wallpaper is currently nested inside right-panel.

- [ ] **Step 3: Move wallpaper-scroll-area in HomepageApp.tsx**

In `src/components/HomepageApp.tsx`, find the wallpaper div inside `<aside class="right-panel">`:

```tsx
<aside class="right-panel">
    <div class="wallpaper-scroll-area" ref={(element) => (wallpaperRef = element)}></div>
    <div class="right-panel-shadow"></div>
    ...
```

Move it out so it becomes a direct child of `.container`, before `.left-panel`:

```tsx
<div class="container" classList={{ visible: ready() }} ref={containerRef}>
    <div class="wallpaper-scroll-area" ref={(element) => (wallpaperRef = element)}></div>
    <section class="left-panel">
        ...
    </section>
    <aside class="right-panel">
        <div class="right-panel-shadow"></div>
        ...
```

The `right-panel-shadow` stays inside `right-panel`. Only the wallpaper moves out.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/wallpaper-full-bleed.test.ts`
Expected: All wallpaper DOM structure assertions PASS. The CSS assertions may still fail — that's Task 2.

---

### Task 2: Reposition wallpaper CSS to fill the viewport

**Files:**
- Modify: `src/styles/layout.css`
- Modify: `src/styles/responsive.css`

- [ ] **Step 1: Update wallpaper-scroll-area positioning in layout.css**

In `src/styles/layout.css`, change `.wallpaper-scroll-area` from:

```css
.wallpaper-scroll-area {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: var(--z-wallpaper, 0);
    ...
}
```

To:

```css
.wallpaper-scroll-area {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: var(--z-wallpaper, 0);
    ...
}
```

Remove `top`, `left`, `width`, `height` since `inset: 0` handles all four. Keep all other properties (`background-color`, `scrollbar-width`, `contain`, `pointer-events`, `touch-action`, `user-select`, `-webkit-user-select`).

- [ ] **Step 2: Update mobile responsive rule in responsive.css**

In `src/styles/responsive.css` inside the `@media (max-width: 900px)` block, change:

```css
.right-panel .wallpaper-scroll-area,
.right-panel .right-panel-shadow,
.right-panel .info-panel {
    display: none;
}
```

To:

```css
.wallpaper-scroll-area,
.right-panel .right-panel-shadow,
.right-panel .info-panel {
    display: none;
}
```

Since `.wallpaper-scroll-area` is no longer a descendant of `.right-panel`, the selector must drop the `.right-panel` prefix for the wallpaper line.

- [ ] **Step 3: Run tests to verify**

Run: `node --import tsx --test tests/wallpaper-full-bleed.test.ts`
Expected: All PASS — wallpaper is at container level, positioned `inset: 0`, hidden on mobile.

---

### Task 3: Verify build and run full test suite

**Files:**
- No new files; verify existing changes.

- [ ] **Step 1: Run full wallpaper and layout test**

Run: `node --import tsx --test tests/wallpaper-full-bleed.test.ts`

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: 0 errors (3 existing ClockPanel warnings are OK).

- [ ] **Step 3: Run Astro type check**

Run: `npm run check`
Expected: 0 errors (3 existing ClockPanel hints are OK).

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Build completes successfully.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: Only the pre-existing dock-styles test failure (`border-radius: 32px` vs `24px`). All other tests pass.