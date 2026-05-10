# Social Links Unified Interaction Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the paginated social links feel like one unified part of the left panel, using discrete page animation instead of a visible horizontal strip.

**Architecture:** Keep the existing `SocialLinks` component and page size, but render only the current page. Page changes update state and trigger a slide-in animation; the wrapper receives wheel and drag input, while invisible placeholder slots preserve the two-row hit area on sparse pages. The wrapper remains transparent so the module reads as part of the left panel rather than a separate carousel box.

**Tech Stack:** Astro 6, SolidJS, TypeScript, CSS, Node built-in tests.

---

### Task 1: Convert To Discrete Page State

**Files:**
- Modify: `tests/social-link-component.test.ts`
- Modify: `src/components/SocialLinks.tsx`

- [ ] **Step 1: Write the failing test**

Add assertions that the component renders `currentLinks()` instead of `pages().map(...)`, uses stable `currentPage() * ITEMS_PER_PAGE + index` color indexes, and does not reference `scrollLeft`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/social-link-component.test.ts`
Expected: FAIL until discrete page rendering exists.

- [ ] **Step 3: Write minimal implementation**

Add `currentLinks()`, `showPage(target)`, `transitionDirection`, and `animationKey`. Render only `currentLinks().map(...)` and append invisible placeholder slots for `ITEMS_PER_PAGE - currentLinks().length`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/social-link-component.test.ts`
Expected: PASS.

### Task 2: Keep The Wrapper Transparent And Animated

**Files:**
- Modify: `tests/social-link-styles.test.ts`
- Modify: `src/styles/components.css`

- [ ] **Step 1: Write the failing test**

Add assertions that there is no `.social-links-viewport`, no `overflow-x: auto`, and no `scroll-snap-type`. Assert that `.social-links-wrapper` has no background/border/shadow, `.social-links-page` is an open grid, placeholders are invisible, and slide keyframes exist.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/social-link-styles.test.ts`
Expected: FAIL until discrete animation CSS is present.

- [ ] **Step 3: Write minimal CSS**

Set `.social-links-wrapper` as a transparent interaction surface with `position: relative`, `overflow: visible`, and drag cursors. Set `.social-links-page` as the 3-column grid with visible overflow and negative margin/padding breathing room. Add `.social-link-slot--placeholder` and `social-page-slide-next/prev` keyframes.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/social-link-styles.test.ts`
Expected: PASS.

### Task 3: Verify Integration

**Files:**
- Verify: `src/components/SocialLinks.tsx`
- Verify: `src/styles/components.css`

- [ ] **Step 1: Run affected tests**

Run: `node --import tsx --test tests/social-link-component.test.ts tests/social-link-styles.test.ts`
Expected: all affected tests pass.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: static build completes.

- [ ] **Step 3: Note known unrelated warnings**

If running `npm run lint` or `npm run check`, existing `ClockPanel.tsx` unused-variable warnings may remain unrelated to this work.
