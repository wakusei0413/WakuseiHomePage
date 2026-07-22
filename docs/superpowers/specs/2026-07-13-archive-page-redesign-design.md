# Archive Page Redesign - Design Spec

## Overview

Redesign the `/archives` page with a magazine editorial aesthetic, leveraging the existing serif display + glass morphism design language to create a visually striking archive experience.

## Design Direction

**Magazine Editorial Style** — Large typography, asymmetric layout, glass panel cards, colored accent borders, staggered entrance animations.

## Design System References

- Fonts: `--font-display` (serif), `--font-ui` (sans), `--font-mono`
- Colors: `--accent-blue` (#3e59ff), `--accent-red` (#ff3e3e), `--accent-yellow` (#ffe600)
- Panels: `--panel-glass`, `--panel-border`, `--panel-shadow`, `--panel-blur`
- Curves: `--curve-delicate` (cubic-bezier(0.1, 0.9, 0.2, 1))

---

## Section 1: Header

### Structure
- Eyebrow: `Archive index` in mono, uppercase, letter-spacing 0.14em
- Title: `写作索引` in font-display, clamp(3rem, 8vw, 6rem), letter-spacing -0.06em, font-weight 700
- Summary line: `共 N 篇文章 · YYYY—YYYY · 跨 N 个月`
- Stats row: 3 glass panel cards in a row

### Stats Cards
Each card:
- `--panel-glass` background, `--panel-border` border, 8px radius
- Value: font-display, 2rem, font-weight 700
- Label: `--muted`, 0.85rem, font-weight 600
- Hover: translateY(-3px), border-color accent-blue, box-shadow lift
- Content: 文章总数 / 年份跨度 / 分类数

### Responsive
- \>768px: 3 columns
- ≤768px: 2+1 grid
- ≤520px: single column

---

## Section 2: Topic Browsing

### Section Heading
- Eyebrow: `Browse by subject` (mono, uppercase)
- Title: `按主题浏览` (font-display, clamp(1.75rem, 4vw, 2.6rem))
- Hint: `分类与标签可以组合筛选` (muted, 0.82rem)

### Category Cards
- Grid: `repeat(auto-fit, minmax(180px, 1fr))`, gap 16px
- Each card:
  - `--panel-glass` background, 1px border, 8px radius
  - Left: colored vertical bar (4px, cycling accent-blue/red/yellow)
  - Category name: font-display, 1.15rem, font-weight 700
  - Count: font-mono, 0.7rem, muted
  - Hover: translateY(-2px), border-color matches accent bar, subtle glow
  - is-active: background color-mix(accent 8%, transparent), border-color accent

### Tag Pills
- Flex wrap, gap 8px
- Each pill:
  - border: 1px solid panel-border, border-radius 999px
  - padding: 6px 16px
  - font-size: 0.85rem, font-weight 600
  - Hover: background color-mix(fg 6%, transparent)
  - is-active: background accent-red, color white, border-color accent-red

### Expand Button
- Keep current underline style

---

## Section 3: Filter Bar & Year Index

### Filter Bar
- Keep current structure, adjust spacing
- Active filter chips: pill style with × button

### Year Index
- Sticky top: 68px
- `--panel-glass` background with blur(12px)
- Year buttons: font-mono, 0.8rem, font-weight 700
- Active: color fg, bottom 2px accent-blue indicator line
- Separator: `年份` label in muted mono

---

## Section 4: Timeline (Core Visual)

### Year Marker
- Sticky, top: 126px
- Year number: font-display, clamp(3.5rem, 8vw, 6rem), font-weight 700, letter-spacing -0.06em
- Count: `N 篇`, font-mono, 0.78rem, muted
- Grid: 180px (year) + 1fr (content), gap 42px
- ≤900px: single column, year static, flex row with space-between

### Month Header
- Top border: 1px solid fg (strong separator)
- Month name: font-display, 1.45rem
- Count: font-mono, 0.75rem, muted
- Padding: 10px 2px 12px

### Post Card (Redesigned)
Structure:
```
┌─────────────────────────────────────────┐
│ 文章标题                    07/12  🖼️   │
│ 阅读 5 分钟 · 分类                      │
│ 描述文字...                             │
│ #tag1 #tag2                             │
└─────────────────────────────────────────┘
```

- Layout: single row, no left date column
- Date: positioned top-right, font-mono, 0.72rem, muted
- Title: font-display, clamp(1.2rem, 2vw, 1.5rem), font-weight 700
- Meta: font-mono, 0.72rem, muted, `/` separator
- Description: 2-line clamp, 0.88rem, muted
- Tags: font-mono, 0.68rem, muted, no background
- Cover: 96×64px, border-radius 2px, right side
- Hover effect:
  - Left 2px inset border in accent-blue
  - Background: color-mix(accent-blue 5%, transparent)
  - Title color: accent-blue
  - Cover: saturate(1) + scale(1.035)
- Border: 1px solid panel-border (bottom only between cards)
- Padding: 18px 12px

### Scroll Entrance Animation
- Use IntersectionObserver on `.archives-post` elements
- Apply staggered fade-in: translateY(16px) → 0, opacity 0 → 1
- Stagger: 60ms per item
- Duration: 0.6s, curve-delicate
- Respect prefers-reduced-motion

---

## Section 5: Empty States

### No Posts (with filters)
- Border top/bottom: 1px solid panel-border
- Padding: 32px 0
- Reset button: underline style

### No Posts (at all)
- Same border style
- Muted text

---

## Section 6: Dark Mode

- Stats cards: border rgba(255,255,255,0.12), bg rgba(18,18,18,0.9)
- Category cards: same dark panel treatment
- Post hover: bg color-mix(accent-blue 8%, transparent)
- Month separator: rgba(255,255,255,0.15)
- Cover: bg rgba(255,255,255,0.06)

---

## Section 7: Responsive Breakpoints

| Breakpoint | Adjustments |
|------------|-------------|
| >1100px | Full layout, sticky year markers |
| 900-1100px | Year static, timeline single column |
| 768-900px | Stats 2-col, posts simplified |
| <768px | Single column, tags wrap |
| <600px | Category grid 2-col, filter bar stacks |
| <420px | No horizontal padding, smaller title |

---

## Implementation Scope

### Files to Modify
1. `src/components/ArchivesPage.vue` — Template restructure
2. `src/styles/article.css` — CSS redesign (~lines 2463-3258)

### Files to Keep
- `src/pages/archives.astro` — No changes needed
- `src/lib/archive.ts` — No changes needed
- `src/lib/posts.ts` — No changes needed

### No New Files
All CSS stays in article.css. No new components needed.

---

## Acceptance Criteria

- [ ] Header displays large serif title + 3 stats cards
- [ ] Category cards show colored accent bars and hover effects
- [ ] Tag pills have proper active/hover states
- [ ] Year markers are sticky with large serif typography
- [ ] Post cards have new layout (date top-right, title prominent)
- [ ] Post hover shows left blue border + title color change
- [ ] Scroll entrance animation works (staggered fade-in)
- [ ] Dark mode renders correctly
- [ ] Responsive at all breakpoints (420px to 1400px+)
- [ ] Existing functionality preserved (filtering, year jump, URL sync)
