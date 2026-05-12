# Full-Width TopBar Layout Redesign

## Overview

Redesign the layout to make the TopBar span the entire width on all pages, with the wallpaper filling the full background on the homepage. Remove the right panel (ClockPanel) to simplify to a single-column layout.

## Current State

- **Homepage**: TopBar starts offset (aligned with right panel), expands to full width on scroll
- **Non-homepage**: TopBar is full width from start
- **Homepage layout**: Two-column (left panel 500px + right panel flex:1)
- **Wallpaper**: Inside container, behind right panel only

## Target State

- **All pages**: TopBar full width from start (no offset/expansion animation)
- **Homepage first screen**: Wallpaper fills entire background → TopBar at top full width → left panel content below TopBar
- **No right panel**: ClockPanel removed

## Visual Layout

```
┌─────────────────────────────────────┐
│           TopBar (全宽固定)          │ ← z-index: 2000
├─────────────────────────────────────┤
│                                     │
│    ┌──────────────┐                 │
│    │  左侧面板内容  │   壁纸背景     │ ← z-index: 0 (壁纸)
│    │  (头像/名字等) │   (全屏铺满)   │ ← z-index: 50 (内容)
│    └──────────────┘                 │
│                                     │
└─────────────────────────────────────┘
```

## Technical Changes

### 1. TopBar.vue
- Remove `expansionProgress` computed property
- Remove `barStyle` animation logic
- Simplify to always return full-width style
- Keep scroll-based opacity for mobile homepage

### 2. PageFrame.vue
- Remove `ClockPanel` import and usage
- Remove `.right-panel` HTML section
- Change `.container` from two-column to single-column
- Expand `.wallpaper-scroll-area` to fill entire viewport
- Position `.left-panel` as a floating card over wallpaper

### 3. CSS Changes

#### topbar.css
- Remove `body.is-home { padding-top: 0 }` special case
- All pages use `padding-top: 72px`
- Remove TopBar transform animations for homepage

#### layout.css
- `.container`: Change from `display: flex` to single-column
- `.left-panel`: Keep width, add background/blur for floating effect
- `.right-panel`: Remove entirely
- `.wallpaper-scroll-area`: Expand to full viewport

#### responsive.css
- Update mobile breakpoints for single-column layout
- Remove right-panel specific mobile styles

### 4. SiteShell.vue
- No changes needed (TopBar handles its own state)

## Files to Modify

1. `src/components/TopBar.vue` - Remove expansion animation
2. `src/components/PageFrame.vue` - Remove right panel, adjust layout
3. `src/styles/topbar.css` - Simplify TopBar styles
4. `src/styles/layout.css` - Single-column layout
5. `src/styles/responsive.css` - Update mobile styles

## Success Criteria

- TopBar spans full width on all pages from load
- Homepage shows wallpaper filling entire background
- Left panel content floats over wallpaper
- No right panel (ClockPanel) visible
- Mobile layout still works correctly
- No visual regressions on non-homepage pages

## Out of Scope

- Changes to blog pages (posts/index.astro, posts/[...slug].astro)
- Changes to 404 page
- Changes to SiteShell.vue structure
- Changes to wallpaper loading logic
