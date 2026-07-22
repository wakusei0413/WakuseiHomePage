# Design Specification: Archives Page UI/UX Upgrade

This document outlines the detailed plan to upgrade the Archives page (`/archives`) of the Wakusei Home Page. It focuses on visual polish, time-centric interactions, structured taxonomy discovery, and performance/accessibility improvements.

## 1. Goal & Requirements
- **Goal**: Make the `/archives` page visually outstanding, modern, and highly interactive while maintaining the established glassmorphic Brutalism/Minimalism hybrid of the website.
- **Scope**:
  1. Header statistics block update with modern glassy styling, larger serif typography, and subtle micro-interactions.
  2. Taxonomy (Categories & Tags) section collapsible accordion or tag clouds with smooth transition animations.
  3. Interactive, connected timeline track with modern visual connectors, timeline path gradients, nodes, and neon pulse glows.
  4. Floating sticky Year Navigation Rail (desktop) that auto-highlights the current active year as the user scrolls.
  5. Enhanced article card listing: richer card hovers, image zoom-on-hover, metadata separation, and staggered slide-in animations.
- **Constraints**: Standard Astro + Vue 3 client-side transitions. Respect user reduced-motion options. Use absolute cursor-pointers. Do not break mobile responsiveness.

---

## 2. Architecture & Design Details

### A. Header Statistics Block (`.archives-stats`)
- **Structure**: Maintain 5 card blocks (`.archives-stat`), but restructure the inner layout.
- **Style**:
  - Light mode: High-contrast glassy borders, white translucent panel backdrop with a thin linear glow.
  - Dark mode: Transparent black backdrops with standard white/gray translucent borders.
  - Micro-interaction: Hovering over card triggers a scale up (1.03x) and a transition of the card border color to the primary theme color.
  - Typography: Stat count in large elegant serif, labels in capitalized mono-spaced/sans font.

### B. Taxonomy section (`.archives-taxonomy`)
- **Interaction**: Add an expand/collapse toggle for Category and Tag groups. By default, they will show up to 10 popular terms, with a "Show All" toggle button, preventing page clutter.
- **Animation**: Use Vue `<Transition>` or native max-height transitions for smooth folding.
- **Chips Styling**: Elegant rounded pill shapes, accent color background mixtures, clear tag counts.

### C. Years Navigation Rail (Sticky Year Anchors)
- **Positioning**: A floating sticky rail fixed to the left or right of the screen (visible only on viewports > 1100px).
- **Structure**: Rendered in Vue, a simple list of year tags (`2026`, `2025`, `2024`, etc.) linked to respective year elements.
- **Scroll Spy**: An intersection observer will listen to `.archives-year` sections. The year currently viewport-prominent will receive `.is-active` class in the navigation rail, showing a glowing line highlight.
- **Interaction**: Click on year in rail triggers a smooth scroll to that year's marker.

### D. The Connected Timeline (`.archives-timeline`)
- **Timeline Path**: A gradient vertical track running through the years and months. Instead of a boring left border, we construct a standalone absolute line:
  - Gradient transition from theme colors (e.g. `--accent-blue` to `--accent-yellow`).
  - Active nodes at month/year boundaries (represented as colored glass circles with inner solid nodes).
- **Staggered Entry**: Add CSS keyframe or Vue-based delay inline transitions so that elements fade and slide in from bottom sequentially.

### E. Advanced Card Hover & Images
- **Card**: Glassmorphic cards with sharp corners (rough-brutalist styling) but smooth, soft drop-shadows on hover. Hover shifts card 4px up, slightly offsets shadow, and adds a color border-glow.
- **Image**: Overlap layouts with scale-up transitions (`scale-105` inside an overflow-hidden cover wrapper) on card hover.

---

## 3. Implementation Plan

### Step 1: Update CSS Stylesheets (`src/styles/article.css`)
We will rewrite or supplement the `.archives-page` styling rules around line 1785 of `src/styles/article.css` with the upgraded styles for:
- Year navigation rail styling (`.year-nav-rail`).
- Connected timeline connectors, nodes, month headers.
- New card and stats container variables/glass cards.
- Mobile overrides to hide Year Nav Rail on screen sizes < 1100px and fall back to clean native sticky markers.

### Step 2: Rewrite `src/components/ArchivesPage.vue`
- Integrate Year Navigation Rail logic with `IntersectionObserver` or scroll-event tracking.
- Add collapsible state for categories/tags with dynamic text change.
- Add smooth scrolling triggers to years.
- Add dynamic list items with keyframes/transition classes.

### Step 3: Verify & Compile
- Run ASTRO checks, linter, tests, and static page builds to ensure no degradation.
