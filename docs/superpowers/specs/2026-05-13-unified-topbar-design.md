# Unified TopBar — Flex + Width Expansion

## Problem

Current TopBar uses a "whole-bar translateX + right-side reverse translateX" hack to animate the left section (avatar+name) into view. This visually splits the bar into two independent floating layers instead of one cohesive component. Additionally, `MobileDockSidebar.vue` duplicates nearly all dock rendering logic (action/panel/link items, language selection) from TopBar.

## Design

### Layout Architecture

**Desktop:** A single `position: fixed` bar spanning full width. Left section uses `width` driven by a CSS variable; right section uses `margin-left: auto` to stay right-aligned. No transforms on either side.

```
--left-width = calc(expansionProgress * var(--left-panel-width))

.top-bar-left  { width: var(--left-width); overflow: hidden; }
.top-bar-right { margin-left: auto; }
```

- `expansionProgress` ranges 0→1, driven by scroll progress on homepage, forced to 1 on non-home pages.
- At progress 0, left section is 0px wide (content hidden by overflow). At progress 1, left section is `--left-panel-width` (~500px or 35% on narrow screens).
- Right section naturally shifts right as left expands, since flex + `margin-left: auto`.

**Mobile (same component, `v-if` switch):**

- TopBar renders in sidebar mode: bar shows only avatar button (triggers sidebar open).
- Sidebar slides in from left with overlay backdrop.
- Sidebar content: avatar+name header + dock items list (action/panel/link) + language submenu.
- All dock item rendering and interaction logic lives once in TopBar.

### Component Changes

#### TopBar.vue

- **Delete** `barStyle`, `rightStyle`, `leftStyle` computed properties.
- **Add** `leftWidthStyle` computed: returns `--left-width: calc(${expansionProgress.value} * var(--left-panel-width))`.
- **Template:** `.top-bar` gets `:style="leftWidthStyle"`; remove `:style` from `.top-bar-left` and `.top-bar-right`.
- **Add** mobile sidebar DOM (`v-if="isMobile"`): sidebar container, overlay, header (avatar+name), dock items list, language submenu.
- **Merge** MobileDockSidebar logic: `open`/`close` refs, `setupOutsideClick`, sidebar-specific `handlePanel`/`selectLanguage`.
- **Dock items** rendered once — desktop uses the existing horizontal row, mobile sidebar renders the same `siteConfig.dock.items` as a vertical list.

#### MobileDockSidebar.vue — DELETE

#### SiteShell.vue — Remove `<MobileDockSidebar />`

### CSS Changes

#### topbar.css

- `.top-bar`: remove `will-change: transform`, `transform-style: preserve-3d`, `backface-visibility: hidden`.
- `.top-bar-left`: remove `will-change: transform`, `perspective`, transition on `transform`; add `transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1)`, `overflow: hidden`, remove hover `translateZ` effects (replace with subtle scale or opacity).
- `.top-bar-right`: remove `will-change: transform`; add `margin-left: auto`.
- Mobile `@media (max-width: 900px)`: add `.top-bar-sidebar`, `.top-bar-sidebar-overlay`, `.sidebar-header`, `.sidebar-menu-item`, `.sidebar-submenu`, etc. (migrated from dock.css).

#### dock.css

- Delete `.mobile-dock-sidebar` / `.mobile-dock-sidebar-overlay` and all child styles (~200 lines).
- Delete `.dock-bottom-sheet` and all related styles (~150 lines, unused).
- Delete `.dock-popup` related styles (replaced by TopBar language popup).
- Keep `.nav-dock` base styles only if referenced elsewhere.

### Data Flow

```
scrollProgress (scrollTop / innerHeight)
    │
    ▼
expansionProgress (0→1, eased)
    │
    ▼
--left-width: calc(p * var(--left-panel-width))
    │
    ├─► .top-bar-left: width absorbs variable, content slides in/out
    └─► .top-bar-right: margin-left:auto, auto right-shift
```

### Interaction Behavior (unchanged)

- Homepage desktop: `expansionProgress` driven by `scrollProgress`.
- Non-homepage: `expansionProgress = 1`, left fully expanded.
- Mobile: avatar click → open sidebar; sidebar dock items behave identically to current MobileDockSidebar.
- `handleLeftClick`: mobile → dispatch sidebar open; desktop home → scroll to top; desktop non-home → normal `<a>` navigation.
- `handleDockLinkClick`: same route → scroll to top; different route → normal navigation.

### Files Modified

| File | Action |
|------|--------|
| `src/components/TopBar.vue` | Rewrite layout logic, add mobile sidebar mode |
| `src/styles/topbar.css` | Rewrite layout CSS, add mobile sidebar styles |
| `src/styles/dock.css` | Remove mobile sidebar/bottom-sheet/popup styles |
| `src/components/MobileDockSidebar.vue` | DELETE |
| `src/components/SiteShell.vue` | Remove `<MobileDockSidebar />` |
| `css/dock.css` | Update shim if needed |
| `tests/topbar-component.test.ts` | Update assertions for new layout |
| `tests/dock-styles.test.ts` | Update if affected |

### Out of Scope

- TopBar bar background/blur/glass styling — unchanged.
- Language popup positioning logic — unchanged (still uses `popupRef` + `updatePopupPosition`).
- Icon magnify hover effect — unchanged (still bound to desktop homepage bar).
- Scroll binding (`bindScroll`) — unchanged.
- `homepage-context.ts` / `homepage.ts` store — unchanged.
