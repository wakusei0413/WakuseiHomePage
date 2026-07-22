# Archive Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/archives` page with magazine editorial aesthetics — large serif typography, glass panel cards, colored accent borders, and staggered scroll animations.

**Architecture:** CSS-only redesign in `article.css` + minor template tweaks in `ArchivesPage.vue` for stats cards and scroll animation hooks. No new files, no logic changes.

**Tech Stack:** Vue 3 Composition API, CSS custom properties, IntersectionObserver API

---

## File Map

| File | Changes |
|------|---------|
| `src/components/ArchivesPage.vue` | Add stats cards section, add `.staggered-item` class to posts, add IntersectionObserver for scroll animation |
| `src/styles/article.css` | Rewrite `/* ===== 编辑式归档索引 ===== */` section (~lines 2463-3258), update earlier archive styles |

---

### Task 1: Stats Cards in Header

**Files:**
- Modify: `src/components/ArchivesPage.vue:186-195` (header template)
- Modify: `src/styles/article.css:2463-2510` (header CSS)

- [ ] **Step 1: Add stats data to script**

In `ArchivesPage.vue` `<script setup>`, add computed properties after line 51:

```typescript
const statsCards = computed(() => [
    { value: String(props.archive.totalPosts), label: '篇文章' },
    { value: yearRange.value, label: '年份跨度' },
    { value: String(props.categories.length), label: '个分类' }
]);
```

- [ ] **Step 2: Update header template**

Replace the `<header class="archives-index-header">` block (lines 190-194) with:

```html
<header class="archives-index-header">
    <p class="archives-index-header__eyebrow">Archive index</p>
    <h2 id="archives-index-title">写作索引</h2>
    <p class="archives-index-header__summary">{{ archiveSummary }}</p>
    <div class="archives-stats-row">
        <div v-for="(stat, idx) in statsCards" :key="idx" class="archives-stat-card">
            <span class="archives-stat-card__value">{{ stat.value }}</span>
            <span class="archives-stat-card__label">{{ stat.label }}</span>
        </div>
    </div>
</header>
```

- [ ] **Step 3: Write CSS for stats cards**

In `article.css`, add after `.archives-index-header__summary` (around line 2508):

```css
.archives-stats-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 16px;
}

.archives-stat-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 72px;
    justify-content: center;
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    background: var(--panel-glass);
    padding: 14px 16px;
    box-shadow: var(--panel-shadow);
    backdrop-filter: var(--panel-blur);
    transition:
        transform 0.3s var(--curve-delicate),
        border-color 0.3s ease,
        box-shadow 0.3s ease;
}

.archives-stat-card:hover {
    transform: translateY(-3px);
    border-color: var(--accent-blue);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.archives-stat-card__value {
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1;
}

.archives-stat-card__label {
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 600;
}

@media (max-width: 768px) {
    .archives-stats-row {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 420px) {
    .archives-stats-row {
        grid-template-columns: 1fr;
    }
}

[data-theme='dark'] .archives-stat-card {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(18, 18, 18, 0.9);
}

[data-theme='dark'] .archives-stat-card:hover {
    border-color: rgba(125, 180, 255, 0.46);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

@media (prefers-reduced-motion: reduce) {
    .archives-stat-card {
        transition: none;
    }
    .archives-stat-card:hover {
        transform: none;
    }
}
```

- [ ] **Step 4: Remove old summary line**

Delete the separate `<p class="archives-result-summary">` and the `archiveSummary` display that's now redundant (the summary is already shown in the header).

- [ ] **Step 5: Verify**

Run `npm run dev`, navigate to `/archives`, check:
- 3 stat cards render below the title
- Cards have glass background and hover lift
- Dark mode renders correctly
- Responsive at 768px and 420px

- [ ] **Step 6: Commit**

```bash
git add src/components/ArchivesPage.vue src/styles/article.css
git commit -m "feat(archives): add stats cards to header"
```

---

### Task 2: Category Cards with Accent Bars

**Files:**
- Modify: `src/components/ArchivesPage.vue:205-224` (category template)
- Modify: `src/styles/article.css:2577-2629` (category CSS)

- [ ] **Step 1: Update category template**

Replace the `archives-category-index` block (lines 210-223) with:

```html
<div class="archives-category-grid" aria-label="按分类筛选">
    <button
        v-for="(term, idx) in displayedCategories"
        :key="term.name"
        type="button"
        class="archives-category-card"
        :class="{ 'is-active': activeCategory === term.name }"
        :style="{ '--card-accent': ['var(--accent-blue)', 'var(--accent-red)', 'var(--accent-yellow)'][idx % 3] }"
        :aria-pressed="activeCategory === term.name"
        @click="toggleCategory(term.name)"
    >
        <span class="archives-category-card__bar" aria-hidden="true"></span>
        <span class="archives-category-card__name">{{ term.name }}</span>
        <span class="archives-category-card__count">{{ term.count }}</span>
    </button>
</div>
```

- [ ] **Step 2: Write CSS for category cards**

Replace `.archives-category-index` and `.archives-category-term` CSS (lines 2577-2629) with:

```css
.archives-category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
}

.archives-category-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 52px;
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    background: var(--panel-glass);
    padding: 12px 14px 12px 20px;
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    transition:
        transform 0.3s var(--curve-delicate),
        border-color 0.3s ease,
        background-color 0.3s ease,
        box-shadow 0.3s var(--curve-delicate);
}

.archives-category-card__bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--card-accent, var(--accent-blue));
    transition: width 0.25s ease, box-shadow 0.25s ease;
}

.archives-category-card__name {
    flex: 1;
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.archives-category-card__count {
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
}

.archives-category-card:hover {
    transform: translateY(-2px);
    border-color: var(--card-accent, var(--accent-blue));
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.archives-category-card:hover .archives-category-card__bar {
    width: 6px;
    box-shadow: 0 0 12px var(--card-accent, var(--accent-blue));
}

.archives-category-card.is-active {
    border-color: var(--card-accent, var(--accent-blue));
    background: color-mix(in srgb, var(--card-accent, var(--accent-blue)) 8%, transparent);
}

.archives-category-card.is-active .archives-category-card__bar {
    width: 6px;
    box-shadow: 0 0 12px var(--card-accent, var(--accent-blue));
}

[data-theme='dark'] .archives-category-card {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(18, 18, 18, 0.9);
}

[data-theme='dark'] .archives-category-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

@media (max-width: 600px) {
    .archives-category-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (prefers-reduced-motion: reduce) {
    .archives-category-card,
    .archives-category-card__bar {
        transition: none;
    }
    .archives-category-card:hover {
        transform: none;
    }
}
```

- [ ] **Step 3: Verify**

Check `/archives`:
- Category cards show with colored left bars
- Bars cycle blue/red/yellow
- Hover lifts card and glows the bar
- Active state fills with accent color

- [ ] **Step 4: Commit**

```bash
git add src/components/ArchivesPage.vue src/styles/article.css
git commit -m "feat(archives): redesign category cards with accent bars"
```

---

### Task 3: Tag Pills Restyle

**Files:**
- Modify: `src/styles/article.css:2631-2651` (tag CSS)

- [ ] **Step 1: Update tag pill CSS**

Replace `.archives-tag-index` and `.archives-tag-term` CSS with:

```css
.archives-tag-index {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.archives-tag-term {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    background: transparent;
    padding: 6px 16px;
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 600;
    transition:
        color 0.2s ease,
        background-color 0.2s ease,
        border-color 0.2s ease,
        transform 0.2s ease;
}

.archives-tag-term span {
    font-family: var(--font-mono);
    font-size: 0.78rem;
}

.archives-tag-term sup {
    display: none;
}

.archives-tag-term:hover {
    color: var(--fg);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    transform: translateY(-1px);
}

.archives-tag-term.is-active {
    color: #fff;
    background: var(--accent-red);
    border-color: var(--accent-red);
}

[data-theme='dark'] .archives-tag-term {
    border-color: rgba(255, 255, 255, 0.12);
}

[data-theme='dark'] .archives-tag-term:hover {
    background: rgba(255, 255, 255, 0.06);
}

@media (prefers-reduced-motion: reduce) {
    .archives-tag-term {
        transition: none;
    }
    .archives-tag-term:hover {
        transform: none;
    }
}
```

- [ ] **Step 2: Verify**

- Tags render as pill buttons with borders
- Hover shows subtle background fill
- Active tag has red background with white text
- Dark mode border is subtle

- [ ] **Step 3: Commit**

```bash
git add src/styles/article.css
git commit -m "feat(archives): restyle tag pills with border style"
```

---

### Task 4: Year Marker & Timeline Typography

**Files:**
- Modify: `src/styles/article.css:2785-2840` (year/timeline CSS)

- [ ] **Step 1: Update year marker CSS**

Replace the `.archives-year` and `.archives-year__marker` CSS (lines 2790-2829) with:

```css
.archives-year {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    gap: 42px;
    align-items: start;
}

.archives-year__marker {
    position: sticky;
    top: 126px;
    display: grid;
    gap: 6px;
    border: 0;
    padding: 0;
}

.archives-year__marker span {
    font-family: var(--font-display);
    font-size: clamp(3.5rem, 8vw, 6rem);
    font-weight: 700;
    letter-spacing: -0.06em;
    line-height: 0.88;
}

.archives-year__marker small {
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
}
```

- [ ] **Step 2: Update month header CSS**

Replace `.archives-month__header` CSS (lines 2847-2868) with:

```css
.archives-month__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    border-top: 1.5px solid var(--fg);
    border-bottom: 0;
    padding: 10px 2px 12px;
}

.archives-month__header h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1;
}

.archives-month__header span {
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
}
```

- [ ] **Step 3: Verify**

- Year numbers are huge serif with tight letter-spacing
- Year marker sticks while scrolling
- Month headers have bold top border
- Month counts use mono font

- [ ] **Step 4: Commit**

```bash
git add src/styles/article.css
git commit -m "feat(archives): update year/month typography"
```

---

### Task 5: Post Card Redesign

**Files:**
- Modify: `src/components/ArchivesPage.vue:318-361` (post template)
- Modify: `src/styles/article.css:2875-3028` (post CSS)

- [ ] **Step 1: Update post card template**

Replace the `archives-post` `<a>` block (lines 319-361) with:

```html
<a
    v-for="post in month.posts"
    :key="post.slug"
    class="archives-post"
    :class="{
        'archives-post--has-cover': post.data.cover && !coverErrors[post.slug]
    }"
    :href="postHref(post.slug)"
>
    <div class="archives-post__body">
        <div class="archives-post__meta">
            <time :datetime="post.archiveIso">{{ post.archiveDayLabel }}/{{ String(post.archiveMonth).padStart(2, '0') }}</time>
            <span>{{ readingLabel(post.wordCount) }}</span>
            <span v-if="post.data.category">{{ post.data.category }}</span>
        </div>
        <h4>{{ post.data.title }}</h4>
        <p>{{ post.data.description }}</p>
        <div
            v-if="post.data.tags?.length"
            class="archives-post__tags"
            aria-label="文章标签"
        >
            <span v-for="tag in post.data.tags" :key="tag">#{{ tag }}</span>
        </div>
    </div>
    <div
        v-if="post.data.cover && !coverErrors[post.slug]"
        class="archives-post__cover"
        aria-hidden="true"
    >
        <img
            :src="post.data.cover"
            alt=""
            loading="lazy"
            decoding="async"
            fetchpriority="low"
            @error="markCoverFailed(post.slug)"
        />
    </div>
</a>
```

- [ ] **Step 2: Update post card CSS**

Replace `.archives-post` and related CSS (lines 2875-3028) with:

```css
.archives-post,
.archives-post--has-cover {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
    align-items: start;
    border: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--panel-border) 60%, transparent);
    border-radius: 0;
    background: transparent;
    padding: 18px 4px;
    color: inherit;
    text-decoration: none;
    box-shadow: none;
    backdrop-filter: none;
    transition:
        background-color 0.25s ease,
        box-shadow 0.25s ease;
}

.archives-post--has-cover {
    grid-template-columns: minmax(0, 1fr) 96px;
    gap: 16px;
}

.archives-post:hover,
.archives-post--undated:hover {
    border-color: color-mix(in srgb, var(--panel-border) 60%, transparent);
    background: color-mix(in srgb, var(--accent-blue) 5%, transparent);
    box-shadow: inset 2px 0 0 var(--accent-blue);
    transform: none;
}

.archives-post__body {
    display: grid;
    min-width: 0;
    gap: 6px;
}

.archives-post__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 5px 10px;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.4;
}

.archives-post__meta time {
    color: var(--muted);
}

.archives-post__meta span:not(:first-child)::before {
    content: '·';
    margin-right: 10px;
    color: color-mix(in srgb, var(--muted) 50%, transparent);
}

.archives-post__body h4 {
    margin: 0;
    color: var(--fg);
    font-family: var(--font-display);
    font-size: clamp(1.15rem, 2vw, 1.45rem);
    font-weight: 700;
    line-height: 1.25;
    overflow-wrap: anywhere;
    transition: color 0.2s ease;
}

.archives-post:hover .archives-post__body h4 {
    color: var(--accent-blue);
}

.archives-post__body p {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    margin: 0;
    color: var(--muted);
    font-size: 0.88rem;
    line-height: 1.55;
}

.archives-post__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
}

.archives-post__tags span {
    border: 0;
    border-radius: 0;
    background: transparent;
    padding: 0;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-weight: 600;
}

.archives-post__cover {
    width: 96px;
    height: 64px;
    overflow: hidden;
    border-radius: 2px;
    background: color-mix(in srgb, var(--fg) 5%, transparent);
}

.archives-post__cover img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(0.85);
    transition:
        filter 0.25s ease,
        transform 0.35s var(--curve-delicate);
}

.archives-post:hover .archives-post__cover img {
    filter: saturate(1);
    transform: scale(1.04);
}
```

- [ ] **Step 3: Remove old date column CSS**

Delete `.archives-post__date` CSS block (lines 2907-2936) — the date is now in the meta row.

- [ ] **Step 4: Verify**

- Post cards show meta row with date/reading time/category
- Title is large serif, turns blue on hover
- Hover shows left blue border
- Cover image on right with saturation transition
- Tags in mono font

- [ ] **Step 5: Commit**

```bash
git add src/components/ArchivesPage.vue src/styles/article.css
git commit -m "feat(archives): redesign post cards with new layout"
```

---

### Task 6: Scroll Entrance Animation

**Files:**
- Modify: `src/components/ArchivesPage.vue` (add IntersectionObserver)
- Modify: `src/styles/article.css` (animation CSS)

- [ ] **Step 1: Add staggered-item class to post cards**

In the post card template, add `archives-post--entering` class conditionally (we'll use a simpler approach — add the class to all posts and let the observer handle visibility).

Actually, let's use a simpler approach: add `ref` to the timeline container and set up observer in `onMounted`.

- [ ] **Step 2: Add scroll animation setup**

In `ArchivesPage.vue` `<script setup>`, add after the existing `setupYearObserver` function:

```typescript
let scrollAnimObserver: IntersectionObserver | null = null;

function setupScrollAnimations() {
    scrollAnimObserver?.disconnect();
    scrollAnimObserver = null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const scroller = document.getElementById('pageScroller') ?? document.querySelector('.page-scroller');
    const posts = archivesRoot.value?.querySelectorAll<HTMLElement>('.archives-post') ?? [];

    scrollAnimObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const el = entry.target as HTMLElement;
                    const delay = Number(el.dataset.animDelay) || 0;
                    setTimeout(() => el.classList.add('is-visible'), delay);
                    scrollAnimObserver?.unobserve(el);
                }
            });
        },
        {
            root: scroller instanceof Element ? scroller : null,
            rootMargin: '0px 0px -10% 0px',
            threshold: 0.1
        }
    );

    posts.forEach((post, idx) => {
        post.dataset.animDelay = String(Math.min(idx * 60, 300));
        post.classList.add('archives-post--animated');
        scrollAnimObserver?.observe(post);
    });
}
```

- [ ] **Step 3: Call scroll animation setup**

In the `onMounted` hook, add after `setupYearObserver()`:

```typescript
nextTick(() => setupScrollAnimations());
```

Also add cleanup in `onUnmounted`:

```typescript
scrollAnimObserver?.disconnect();
scrollAnimObserver = null;
```

- [ ] **Step 4: Add animation CSS**

In `article.css`, add after the post styles:

```css
.archives-post--animated {
    opacity: 0;
    transform: translateY(16px);
    transition:
        opacity 0.5s var(--curve-delicate),
        transform 0.5s var(--curve-delicate);
}

.archives-post--animated.is-visible {
    opacity: 1;
    transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
    .archives-post--animated {
        opacity: 1;
        transform: none;
        transition: none;
    }
}
```

- [ ] **Step 5: Verify**

- Scroll down the page
- Posts should fade in from below as they enter viewport
- No animation if `prefers-reduced-motion: reduce`
- No jank or layout shift

- [ ] **Step 6: Commit**

```bash
git add src/components/ArchivesPage.vue src/styles/article.css
git commit -m "feat(archives): add scroll entrance animation"
```

---

### Task 7: Dark Mode & Responsive Polish

**Files:**
- Modify: `src/styles/article.css` (dark mode + media queries)

- [ ] **Step 1: Add dark mode overrides**

Add at the end of the dark mode section:

```css
/* Archives dark mode */
[data-theme='dark'] .archives-post,
[data-theme='dark'] .archives-empty {
    border-color: rgba(255, 255, 255, 0.08);
    background: transparent;
    box-shadow: none;
}

[data-theme='dark'] .archives-post:hover,
[data-theme='dark'] .archives-post--undated:hover {
    border-color: rgba(255, 255, 255, 0.08);
    background: color-mix(in srgb, var(--accent-blue) 8%, transparent);
    box-shadow: inset 2px 0 0 var(--accent-blue);
}

[data-theme='dark'] .archives-post__cover {
    background: rgba(255, 255, 255, 0.06);
}

[data-theme='dark'] .archives-month__header {
    border-top-color: rgba(255, 255, 255, 0.3);
}
```

- [ ] **Step 2: Add responsive overrides**

```css
@media (max-width: 900px) {
    .archives-year {
        grid-template-columns: 1fr;
        gap: 22px;
    }

    .archives-year__marker {
        position: static;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 16px;
    }

    .archives-year__marker span {
        font-size: clamp(2.5rem, 10vw, 4rem);
    }
}

@media (max-width: 768px) {
    .archives-page__inner {
        padding: 0 12px 48px;
    }

    .archives-post,
    .archives-post--has-cover {
        grid-template-columns: 1fr;
        padding: 16px 0;
    }

    .archives-post__cover {
        width: 100%;
        height: 120px;
        border-radius: 4px;
    }
}

@media (max-width: 420px) {
    .archives-page__inner {
        padding-inline: 0;
    }

    .archives-index-header h2 {
        font-size: 2.5rem;
    }

    .archives-post__body h4 {
        font-size: 1.05rem;
    }

    .archives-post__body p {
        font-size: 0.82rem;
    }
}
```

- [ ] **Step 3: Verify all breakpoints**

Test at: 1400px, 1100px, 900px, 768px, 600px, 420px, 375px
- Dark mode at each breakpoint
- No horizontal scrollbar
- No text overflow
- Cover images scale properly

- [ ] **Step 4: Commit**

```bash
git add src/styles/article.css
git commit -m "feat(archives): dark mode and responsive polish"
```

---

### Task 8: Final Cleanup & Lint

**Files:**
- Modify: `src/styles/article.css`
- Modify: `src/components/ArchivesPage.vue`

- [ ] **Step 1: Remove dead CSS**

Search for and remove any CSS classes that are no longer used in the template:
- `.archives-post__date` (replaced by meta time)
- `.archives-post--undated` (keep if still used)
- `.year-nav-rail` and related (unused)
- `.taxonomy-expand-wrapper` / `.taxonomy-expand-btn` (unused)
- `.staggered-item` / `.staggeredFadeIn` (replaced by new animation)

- [ ] **Step 2: Run lint & format**

```bash
npm run lint:fix
npm run format
```

- [ ] **Step 3: Run type check**

```bash
npm run check
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(archives): cleanup dead CSS and lint"
```
