# Archives UI/UX Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the archives page (`/archives`) with a modern interactive vertical timeline, Year Navigation Rail, collapsible taxonomy chip grid, stats card hover states, image zooms, and staggered slide-in animations.

**Architecture:** Use Vue 3 `ref` and `IntersectionObserver` to track the current active year, and custom CSS animations/transitions for staggered list entry.

**Tech Stack:** Vue 3, Astro 6, CSS 3 Custom Properties, IntersectionObserver API

---

### Task 1: Update CSS Stylesheets for Year Nav Rail, Connected Timeline & Animations

**Files:**
- Modify: `src/styles/article.css` (specifically around line 1785 and onwards)

- [ ] **Step 1: Read the existing `.archives-page__inner` style section to locate integration point**
- [ ] **Step 2: Append upgraded styling for stats hover, timeline nodes, and the Year Navigation Rail**
Ensure style definitions support light/dark modes and respect `prefers-reduced-motion`.

```css
/* ===== Archives Year Navigation Rail ===== */
.year-nav-rail {
    position: fixed;
    right: 2rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 16px;
    z-index: 100;
    padding: 12px 8px;
    border-radius: 99px;
    background: var(--panel-glass);
    border: 1px solid var(--panel-border);
    backdrop-filter: var(--panel-blur);
    box-shadow: var(--panel-shadow);
}

.year-nav-item {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 600;
    transition: color 0.3s ease, transform 0.2s ease;
}

.year-nav-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--muted);
    transition: background-color 0.3s ease, transform 0.3s var(--curve-delicate);
}

.year-nav-item:hover {
    color: var(--fg);
}

.year-nav-item:hover .year-nav-dot {
    background: var(--fg);
    transform: scale(1.5);
}

.year-nav-item.is-active {
    color: var(--accent-blue);
}

.year-nav-item.is-active .year-nav-dot {
    background: var(--accent-blue);
    transform: scale(2);
    box-shadow: 0 0 8px var(--accent-blue);
}

@media (max-width: 1100px) {
    .year-nav-rail {
        display: none;
    }
}

/* ===== Collapsible Taxonomy Button ===== */
.taxonomy-expand-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 16px;
}

.taxonomy-expand-btn {
    background: var(--panel-glass);
    border: 1px solid var(--panel-border);
    padding: 8px 20px;
    border-radius: 99px;
    color: var(--fg);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    backdrop-filter: var(--panel-blur);
    transition: all 0.3s var(--curve-delicate);
}

.taxonomy-expand-btn:hover {
    transform: translateY(-2px);
    border-color: var(--accent-blue);
    background: color-mix(in srgb, var(--accent-blue) 8%, var(--panel-glass));
    box-shadow: var(--panel-shadow);
}

/* ===== Staggered Cascade Entry Animation ===== */
@keyframes staggeredFadeIn {
    from {
        opacity: 0;
        transform: translateY(16px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.staggered-item {
    opacity: 0;
    animation: staggeredFadeIn 0.6s var(--curve-delicate) forwards;
}

@media (prefers-reduced-motion: reduce) {
    .staggered-item {
        opacity: 1;
        animation: none;
    }
}

/* ===== Timeline Node upgrades ===== */
.archives-month {
    position: relative;
    padding-left: 20px;
}

.archives-month::before {
    content: '';
    position: absolute;
    left: -18px;
    top: 12px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--bg);
    border: 2px solid var(--accent-blue);
    z-index: 2;
    transition: transform 0.25s ease, background-color 0.25s ease;
}

.archives-month:hover::before {
    transform: scale(1.35);
    background: var(--accent-blue);
    box-shadow: 0 0 8px var(--accent-blue);
}

.archives-year--undated .archives-month::before {
    border-color: var(--accent-red);
}

.archives-year--undated .archives-month:hover::before {
    background: var(--accent-red);
    box-shadow: 0 0 8px var(--accent-red);
}

/* ===== Card & Stats Polish ===== */
.archives-stat {
    transition: transform 0.3s var(--curve-delicate), border-color 0.3s ease, box-shadow 0.3s ease;
}

.archives-stat:hover {
    transform: translateY(-3px);
    border-color: var(--accent-blue);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.archives-post__cover {
    overflow: hidden;
}

.archives-post__cover img {
    transition: transform 0.4s var(--curve-delicate);
}

.archives-post:hover .archives-post__cover img {
    transform: scale(1.08);
}
```

- [ ] **Step 3: Save changes to stylesheet**

---

### Task 2: Implement Advanced Logic & Navigation in ArchivesPage.vue

**Files:**
- Modify: `src/components/ArchivesPage.vue`

- [ ] **Step 1: Integrate dynamic desktop detection, taxonomy expansion controls, active year spy, and scroll handler**

In the `<script setup>` block:
1. Import `onMounted` and `onUnmounted` from 'vue'.
2. Add reactive variables:
   - `isDesktop = ref(false)` (initialized in `onMounted` to avoid SSR mismatch).
   - `isTaxonomyExpanded = ref(false)`.
   - `activeYear = ref<number | null>(null)`.
3. Create computed slices for categories and tags:
   - `displayedCategories` (returns `categories.slice(0, 8)` if not expanded).
   - `displayedTags` (returns `tags.slice(0, 15)` if not expanded).
   - `showExpandButton` (returns true if categories length > 8 or tags length > 15).
4. Create scroll spy using `IntersectionObserver`:
   - Observe elements with class `.archives-year`.
   - Update `activeYear.value` to the year matching the intersecting entry.
5. Create helper function `scrollToYear(year: number)`:
   - Finds element with id `year-${year}` and scrolls to it smoothly.

- [ ] **Step 2: Update the template block**
1. Wrap the Category/Tag chips grids to use `displayedCategories` and `displayedTags`.
2. Add the collapsible toggle button below the taxonomy chip grids.
3. Render the floating Year Navigation Rail on desktop.
4. Set `id="year-${year.year}"` on the year containers.
5. Add class `staggered-item` and inline dynamic delay styles to `.archives-post` elements to fade them in cascadingly:
   - `:style="{ 'animation-delay': (postIdx * 0.05) + 's' }"`

- [ ] **Step 3: Save changes**

---

### Task 3: Verification & Compilation

**Files:**
- Verify: Entire site

- [ ] **Step 1: Check code linting**
Run command: `npm run lint`

- [ ] **Step 2: Run all unit tests**
Run command: `npm test`

- [ ] **Step 3: Build the application to verify compiling passes**
Run command: `npm run build`
