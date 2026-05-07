# Wakusei Homepage UI/UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the existing Wakusei homepage with detailed cursor feedback, theme-aware glass surfaces, micro-interactions, and CSS hygiene — all while preserving Brutalist identity.

**Architecture:** Low-risk polish pass on existing components. No new components created. Changes span CSS (transitions, colors, shadows, keyframes) and minimal TSX (cursor classes, icon swaps, animation triggers).

**Tech Stack:** Astro 5 + SolidJS (TSX), vanilla CSS (no Tailwind), inlined SVG icons via `Icon.tsx`.

---

## File Impact Map

| File | Change Responsibility |
|------|----------------------|
| `css/components.css` | Social link breathe keyframes, avatar soft shadow, loading shimmer & bounce, prefers-reduced-motion |
| `css/layout.css` | Right-panel shadow softening, container transition fix |
| `css/base.css` | Noise overlay z-index during loading |
| `src/styles/dock.css` | Theme-aware Dock/popup/sidebar colors, cursor pointers, hover states, dividers |
| `src/components/Icon.tsx` | Add `check` icon to inlined icon registry |
| `src/components/NavigationDock.tsx` | Replace `'✓'` with `<Icon name="check">` |
| `src/components/MobileDockSidebar.tsx` | Replace `'✓'` with `<Icon name="check">` + theme-aware class |
| `src/components/TypewriterSlogan.tsx` | Idle cursor class toggle |
| `src/components/ClockPanel.tsx` | Entrance animation class toggle |
| `src/components/SocialLinks.tsx` | One-shot breathe class trigger on mount |
| `src/components/HomepageApp.tsx` | Pass CSS class for light/dock coordination |

---

### Task 1: Add `check` SVG Icon to Icon Registry

**Files:**
- Modify: `src/components/Icon.tsx`

- [ ] **Step 1: Open `src/components/Icon.tsx`**

Read the file and locate the `icons` record.

- [ ] **Step 2: Append the check icon entry**

Add this entry to the `icons` object (anywhere inside the `{}`):

```typescript
check: {
    viewBox: '0 0 448 512',
    path: 'M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z'
},
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run check` (astro check)  
Expected: No TS errors in `src/components/Icon.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/Icon.tsx
git commit -m "feat(icon): add checkmark SVG icon for language selectors"
```

---

### Task 2: NavigationDock — Replace Text Check with Icon Component

**Files:**
- Modify: `src/components/NavigationDock.tsx`

- [ ] **Step 1: Open `src/components/NavigationDock.tsx`**

Locate line 387 where the check icon lives inside the popup map.

- [ ] **Step 2: Replace `'✓'` with `<Icon name="check" class="check-icon" />`**

Find:
```tsx
<span class="check-icon">{'\u2713'}</span>
```
Replace with:
```tsx
<Icon name="check" class="check-icon" />
```

There are two places: inside the popup map (line ~387) and inside the bottom-sheet map (line ~407). Replace both.

- [ ] **Step 3: Add `Icon` import if not present**

Ensure this import exists at the top:
```tsx
import { Icon } from './Icon';
```

- [ ] **Step 4: Verify build**

Run: `npm run check`

- [ ] **Step 5: Commit**

```bash
git add src/components/NavigationDock.tsx
git commit -m "refactor(dock): replace text checkmark with SVG icon"
```

---

### Task 3: MobileDockSidebar — Replace Text Check with Icon Component + Theme Coordination

**Files:**
- Modify: `src/components/MobileDockSidebar.tsx`

- [ ] **Step 1: Open `src/components/MobileDockSidebar.tsx`**

Locate the check icon inside `sidebar-submenu-item` (around line 182).

- [ ] **Step 2: Replace `'✓'` with `<Icon name="check" class="check-icon" />`**

Find:
```tsx
<span class="check-icon">✓</span>
```
Replace with:
```tsx
<Icon name="check" class="check-icon" />
```

- [ ] **Step 3: Ensure `Icon` import exists**

```tsx
import { Icon } from './Icon';
```

- [ ] **Step 4: Add theme-aware class to sidebar root**

Inside the `return` function, locate the root `div` at line ~254. Add a class that signals light vs dark for CSS targeting:

Find:
```tsx
<div
    ref={sidebarRef}
    class="mobile-dock-sidebar"
```
Replace with:
```tsx
<div
    ref={sidebarRef}
    class="mobile-dock-sidebar"
    classList={{ 'theme-light': !isDark(), 'theme-dark': isDark() }}
```

- [ ] **Step 5: Verify build**

Run: `npm run check`

- [ ] **Step 6: Commit**

```bash
git add src/components/MobileDockSidebar.tsx
git commit -m "refactor(sidebar): replace text checkmark with SVG icon and add theme classes"
```

---

### Task 4: TypewriterSlogan — Idle Cursor Calm State

**Files:**
- Modify: `src/components/TypewriterSlogan.tsx`

- [ ] **Step 1: Open `src/components/TypewriterSlogan.tsx`**

- [ ] **Step 2: Add idle state signal**

After `cursorDimmed`, add:
```tsx
const [isIdle, setIsIdle] = createSignal(false);
```

- [ ] **Step 3: Toggle idle state during cycle**

In `typeNext()`, when a string finishes typing (before `schedule` for pause or `deleteNext`):

Add `setIsIdle(true)` at the end of the `if (charIndex >= next.length)` block, before the `schedule` calls.

Then, in `deleteNext()`, add `setIsIdle(false)` at the top before the deletion logic.

Also in the initial `runCycle` before calling `typeNext`, add `setIsIdle(false)`.

The key locations:

At end of `typeNext()` (before the schedule to `deleteNext`):
```tsx
// After charIndex >= next.length
if (!props.config.loop) {
    setCursorDimmed(true);
    setIsIdle(true);
    return;
}
setIsIdle(true);
schedule(props.config.pauseDuration, deleteNext);
```

At top of `deleteNext()`:
```tsx
const deleteNext = () => {
    if (!isActive) return;
    setIsIdle(false);
    // ... existing logic
```

- [ ] **Step 4: Apply CSS class to cursor**

In the return JSX, add the conditional class to the cursor span:

Find:
```tsx
<span class="typewriter-cursor" style={{ opacity: cursorDimmed() ? '0.5' : '1' }}>
```
Replace with:
```tsx
<span class="typewriter-cursor" classList={{ 'cursor-idle': isIdle() }} style={{ opacity: cursorDimmed() ? '0.5' : '1' }}>
```

- [ ] **Step 5: Verify build**

Run: `npm run check`  
Expected: No TS errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/TypewriterSlogan.tsx
git commit -m "feat(typewriter): slow cursor blink during idle between slogans"
```

---

### Task 5: ClockPanel — Subtle Entrance Animation

**Files:**
- Modify: `src/components/ClockPanel.tsx`

- [ ] **Step 1: Open `src/components/ClockPanel.tsx`**

- [ ] **Step 2: Track "first mount" flag**

After the `now` signal, add:
```tsx
const [hasEntered, setHasEntered] = createSignal(false);
```

Import `createSignal` is already present.

- [ ] **Step 3: Trigger entrance on mount**

Inside `onMount`, after setting the interval timer, add:
```tsx
window.setTimeout(() => setHasEntered(true), 100);
```
This gives the panel a tiny delay so the CSS transition is visible.

- [ ] **Step 4: Apply class to clock**

In the return JSX, add `classList` to the clock `div`:

Find:
```tsx
<div class="clock">{formatTimeString(now(), props.config.format)}</div>
```
Replace with:
```tsx
<div class="clock" classList={{ 'clock--entered': hasEntered() }}>
    {formatTimeString(now(), props.config.format)}
</div>
```

Also add it to `.weekday` and `.date-display` for a staggered group entrance:

```tsx
<div class="weekday" classList={{ 'clock--entered': hasEntered() }}>{dateParts().weekday}</div>
<div class="date-display" classList={{ 'clock--entered': hasEntered() }}>{dateParts().dateDisplay}</div>
```

- [ ] **Step 5: Verify build**

Run: `npm run check`

- [ ] **Step 6: Commit**

```bash
git add src/components/ClockPanel.tsx
git commit -m "feat(clock): add subtle entrance animation on mount"
```

---

### Task 6: SocialLinks — One-Shot Ambient Breath on Mount

**Files:**
- Modify: `src/components/SocialLinks.tsx`

- [ ] **Step 1: Open `src/components/SocialLinks.tsx`**

- [ ] **Step 2: Import SolidJS helpers**

At the top, add:
```tsx
import { createSignal, onMount } from 'solid-js';
```

- [ ] **Step 3: Add one-shot breath class state**

Inside the `SocialLinks` function, before the return, add:
```tsx
const [breathe, setBreathe] = createSignal(true);

onMount(() => {
    window.setTimeout(() => setBreathe(false), 3200);
});
```

- [ ] **Step 4: Apply class to the nav container**

Find:
```tsx
<nav class="social-links" id="socialLinks">
```
Replace with:
```tsx
<nav class="social-links" id="socialLinks" classList={{ 'breathe-once': breathe() }}>
```

- [ ] **Step 5: Verify build**

Run: `npm run check`

- [ ] **Step 6: Commit**

```bash
git add src/components/SocialLinks.tsx
git commit -m "feat(social-links): add one-shot ambient breath on page load"
```

---

### Task 7: CSS — Components Layer Changes (Avatar, Social, Loading)

**Files:**
- Modify: `css/components.css`

- [ ] **Step 1: Open `css/components.css`**

- [ ] **Step 2: Add loading shimmer keyframe and rule**

After `.loading-bar` (around line 165), add:

```css
.loading-bar {
    height: 100%;
    background: #0a0a0a;
    background: var(--fg, #0a0a0a);
    width: 0%;
    transition: width 0.3s ease-out;
    position: relative;
    overflow: hidden;
}

.loading-bar::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
    transform: translateX(-100%);
    animation: loading-shimmer 1.5s infinite;
}

@keyframes loading-shimmer {
    100% {
        transform: translateX(100%);
    }
}
```

- [ ] **Step 3: Soften loading bounce**

Find `@keyframes loading-bounce` and change to:

```css
@keyframes loading-bounce {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-6px);
    }
}
```

Also update the `.loading-panel` animation duration:
Find:
```css
animation: loading-bounce 1.5s ease-in-out infinite;
```
Replace with:
```css
animation: loading-bounce 2s ease-in-out infinite;
```

- [ ] **Step 4: Add social-link breathe keyframes**

After the existing `.link-label` block (around line 430), add:

```css
@keyframes social-breathe {
    0%, 100% {
        box-shadow: 6px 6px 0 var(--custom-color, #ffe600);
    }
    50% {
        box-shadow: 8px 8px 0 var(--custom-color, #ffe600);
    }
}

.social-links.breathe-once .social-link--custom {
    animation: social-breathe 2s ease-in-out 1;
}

.social-link-slot.is-hovered .social-link--custom,
.social-link-slot:hover .social-link--custom,
.social-link-slot:focus-within .social-link--custom,
.social-link-slot:active .social-link--custom {
    animation: social-breathe 2s ease-in-out infinite;
}
```

- [ ] **Step 5: Soften avatar hover shadow**

Find `.avatar-box:hover, .avatar-box:active`:

Replace the existing block with:

```css
.avatar-box:hover,
.avatar-box:active {
    transform: translate(-5px, -5px);
    box-shadow:
        calc(var(--avatar-frame-shadow-offset, 10px) + 5px) calc(var(--avatar-frame-shadow-offset, 10px) + 5px)
            0 var(--avatar-frame-color, var(--fg)),
        0 0 20px rgba(0, 0, 0, 0.15);
}
```

- [ ] **Step 6: Dark mode — enhance social glow**

Find the existing dark mode social link hover block (around line 817–823) and replace with:

```css
[data-theme='dark'] .social-link-slot:hover .social-link--custom,
[data-theme='dark'] .social-link-slot:focus-within .social-link--custom,
[data-theme='dark'] .social-link-slot:active .social-link--custom {
    transform: translate3d(-2px, -2px, 0);
    box-shadow: 0 0 20px var(--custom-color);
    filter: brightness(1.1);
    background-color: var(--custom-color);
}
```

- [ ] **Step 7: Dark mode loading shimmer inversion**

After the existing `[data-theme='dark'] .loading-bar` block, add:

```css
[data-theme='dark'] .loading-bar::after {
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
}
```

- [ ] **Step 8: Add prefers-reduced-motion overrides**

At the very end of the file (after all existing styles), add:

```css
@media (prefers-reduced-motion: reduce) {
    .loading-bar::after,
    .social-links.breathe-once .social-link--custom,
    .social-link-slot.is-hovered .social-link--custom,
    .social-link-slot:hover .social-link--custom,
    .social-link-slot:focus-within .social-link--custom,
    .social-link-slot:active .social-link--custom,
    .typewriter-cursor.cursor-idle {
        animation: none !important;
    }
}
```

- [ ] **Step 9: Verify lint**

Run: `npm run lint`  
Expected: Clean (no CSS errors we introduced).

- [ ] **Step 10: Commit**

```bash
git add css/components.css
git commit -m "style(css): soften shadows, add loading shimmer, social breathe, reduced-motion"
```

---

### Task 8: CSS — Layout Layer Changes (Panel Shadow, Container Transition Fix)

**Files:**
- Modify: `css/layout.css`

- [ ] **Step 1: Open `css/layout.css`**

- [ ] **Step 2: Replace right-panel-shadow with soft gradient**

Find `.right-panel-shadow` block (around line 162) and replace entirely:

```css
.right-panel-shadow {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    pointer-events: none;
    z-index: 10;
    background: linear-gradient(
        90deg,
        rgba(0, 0, 0, 0.25) 0%,
        rgba(0, 0, 0, 0.05) 8%,
        transparent 15%,
        transparent 85%,
        rgba(0, 0, 0, 0.05) 92%,
        rgba(0, 0, 0, 0.25) 100%
    );
}
```

- [ ] **Step 3: Fix invalid container transition declaration**

Find `.container` transition block:

```css
.container {
    display: flex;
    flex-wrap: nowrap;
    height: 100vh;
    overflow: hidden;
    transition:
        grid-template-columns var(--transition-normal),
        filter 0.5s ease-out;
    opacity: 1;
    visibility: visible;
    filter: blur(30px);
    pointer-events: none;
}
```

Replace with:

```css
.container {
    display: flex;
    flex-wrap: nowrap;
    height: 100vh;
    overflow: hidden;
    transition:
        filter 0.5s ease-out,
        opacity 0.5s ease-out;
    opacity: 1;
    visibility: visible;
    filter: blur(30px);
    pointer-events: none;
}
```

- [ ] **Step 4: Verify lint**

Run: `npm run lint`

- [ ] **Step 5: Commit**

```bash
git add css/layout.css
git commit -m "style(layout): soften right-panel shadow, remove invalid grid transition"
```

---

### Task 9: CSS — Base Layer Changes (Noise Overlay Z-Index + Clock Idle)

**Files:**
- Modify: `css/base.css`

- [ ] **Step 1: Open `css/base.css`**

- [ ] **Step 2: Add noise overlay loading suppression**

After the existing `.noise-overlay` block (around line 153), add:

```css
/* When loading overlay is visible, push noise behind it */
.loading-overlay:not(.hidden) ~ .noise-overlay {
    z-index: 9997;
    opacity: 0.01;
}
```

- [ ] **Step 3: Add clock idle cursor style + clock entrance**

After the existing `.typewriter-cursor` block (if present; otherwise add near end before `prefers-reduced-motion`), add:

```css
/* Cursor idle calm */
.typewriter-cursor.cursor-idle {
    animation-duration: 2s;
}

/* Clock entrance */
.clock,
.weekday,
.date-display {
    opacity: 0;
    transform: translateY(4px);
    transition:
        opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
        transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.clock--entered,
.clock--entered.clock,
.clock--entered.weekday,
.clock--entered.date-display {
    opacity: 1;
    transform: translateY(0);
}
```

- [ ] **Step 4: Verify lint**

Run: `npm run lint`

- [ ] **Step 5: Commit**

```bash
git add css/base.css
git commit -m "style(base): noise overlay z-index fix, clock entrance, cursor idle state"
```

---

### Task 10: CSS — Dock Layer Changes (Theme-Aware Glass + Cursors + Hover)

**Files:**
- Modify: `src/styles/dock.css`

- [ ] **Step 1: Open `src/styles/dock.css`**

- [ ] **Step 2: Add cursor-pointer to interactive dock elements**

Add these cursor rules after the existing `.nav-dock-divider` block:

```css
.dock-popup-option,
.dock-bottom-sheet-option,
.sidebar-menu-item,
.sidebar-submenu-item {
    cursor: pointer;
}
```

- [ ] **Step 3: Light mode Dock glass override**

After `.nav-dock` base styles and before the media queries, add:

```css
/* Light mode Dock — opaque cream so icons remain readable */
html:not([data-theme='dark']) .nav-dock {
    background: rgba(255, 254, 247, 0.92);
    border-color: rgba(10, 10, 10, 0.08);
    box-shadow:
        0 8px 40px rgba(0, 0, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.9),
        inset 0 -1px 0 rgba(0, 0, 0, 0.06);
}

html:not([data-theme='dark']) .nav-dock-item {
    color: #0a0a0a;
}

html:not([data-theme='dark']) .nav-dock-item:hover {
    background: rgba(0, 0, 0, 0.06);
}

html:not([data-theme='dark']) .nav-dock-divider {
    background: rgba(0, 0, 0, 0.12);
}
```

- [ ] **Step 4: Light mode popup override**

Add after the `[data-theme='dark'] .dock-popup` block:

```css
/* Light mode popup */
html:not([data-theme='dark']) .dock-popup {
    background: rgba(255, 254, 247, 0.95);
    border-color: rgba(0, 0, 0, 0.1);
    box-shadow:
        0 12px 48px rgba(0, 0, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.9),
        inset 0 -1px 0 rgba(0, 0, 0, 0.06);
    color: #0a0a0a;
}

html:not([data-theme='dark']) .dock-popup-title {
    color: #3e59ff;
}

html:not([data-theme='dark']) .dock-popup-option {
    color: #0a0a0a;
}

html:not([data-theme='dark']) .dock-popup-option:hover {
    background: rgba(0, 0, 0, 0.06);
}

html:not([data-theme='dark']) .dock-popup-option.selected {
    background: rgba(0, 0, 0, 0.1);
}
```

- [ ] **Step 5: Light mode bottom sheet override**

Add after `[data-theme='dark'] .dock-bottom-sheet` block:

```css
/* Light mode bottom sheet */
html:not([data-theme='dark']) .dock-bottom-sheet {
    background: rgba(255, 254, 247, 0.95);
    border-color: rgba(0, 0, 0, 0.1);
    box-shadow:
        0 -12px 48px rgba(0, 0, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.9),
        inset 0 -1px 0 rgba(0, 0, 0, 0.06);
    color: #0a0a0a;
}

html:not([data-theme='dark']) .dock-bottom-sheet-title {
    color: #3e59ff;
}

html:not([data-theme='dark']) .dock-bottom-sheet-option {
    color: #0a0a0a;
}

html:not([data-theme='dark']) .dock-bottom-sheet-option:hover {
    background: rgba(0, 0, 0, 0.06);
}

html:not([data-theme='dark']) .dock-bottom-sheet-option.selected {
    background: rgba(0, 0, 0, 0.1);
}
```

- [ ] **Step 6: Light mode mobile sidebar override**

Inside the `@media (max-width: 900px)` section, after `.mobile-dock-sidebar[data-open]` and before `.mobile-dock-sidebar-overlay`, add:

```css
html:not([data-theme='dark']) .mobile-dock-sidebar {
    background: rgba(255, 254, 247, 0.95);
    border-right-color: rgba(0, 0, 0, 0.1);
    box-shadow:
        4px 0 24px rgba(0, 0, 0, 0.08),
        inset -1px 0 0 rgba(255, 255, 255, 0.8);
    color: #0a0a0a;
}

html:not([data-theme='dark']) .sidebar-name {
    color: #0a0a0a;
}

html:not([data-theme='dark']) .sidebar-menu-item {
    color: #0a0a0a;
}

html:not([data-theme='dark']) .sidebar-menu-item:hover,
html:not([data-theme='dark']) .sidebar-menu-item.active {
    background: rgba(0, 0, 0, 0.06);
}

html:not([data-theme='dark']) .sidebar-submenu-item {
    color: #333333;
}

html:not([data-theme='dark']) .sidebar-submenu-item:hover {
    background: rgba(0, 0, 0, 0.04);
}

html:not([data-theme='dark']) .sidebar-submenu-item.selected {
    background: rgba(0, 0, 0, 0.08);
}

html:not([data-theme='dark']) .sidebar-divider {
    background: rgba(0, 0, 0, 0.1);
}
```

- [ ] **Step 7: Light mode overlay override**

Inside the same `@media (max-width: 900px)` section, after the overlay styles, add:

```css
html:not([data-theme='dark']) .mobile-dock-sidebar-overlay[data-open] {
    background: rgba(0, 0, 0, 0.15);
}
```

- [ ] **Step 8: Verify lint**

Run: `npm run lint`

- [ ] **Step 9: Commit**

```bash
git add src/styles/dock.css
git commit -m "style(dock): theme-aware glass panels for light mode, cursor feedback"
```

---

### Task 11: Self-Review — Ensure No Placeholders, All Tasks Covered

- [ ] **Step 1: Spec coverage scan**

Check every requirement in `docs/superpowers/specs/2026-05-07-ui-polish-design.md` maps to a task:

| Requirement | Task |
|---|---|
| 3.1.1 Cursor pointers | Task 10 (cursor rules) |
| 3.1.2 Dock hover bg | Task 10 (light mode + hover) |
| 3.1.3 Social breathe | Task 7 (keyframes) + Task 6 (trigger) |
| 3.1.4 Avatar soft shadow | Task 7 (avatar hover) |
| 3.1.5 Unified easing | Handled in Task 9 (clock entrance uses new cubic-bezier) |
| 3.2.1 Light Dock | Task 10 |
| 3.2.2 Light sidebar | Task 10 |
| 3.2.3 Dark social glow | Task 7 (dark mode section) |
| 3.3.1 Check icon | Task 1 + Task 2 + Task 3 |
| 3.3.2 Loading polish | Task 7 (bounce + shimmer) |
| 3.3.3 Panel shadow | Task 8 |
| 3.4.1 Social breath | Task 6 + Task 7 |
| 3.4.2 Clock entrance | Task 5 + Task 9 |
| 3.4.3 Idle cursor | Task 4 + Task 9 |
| 3.5.1 Fix invalid transition | Task 8 |
| 3.5.2 Noise z-index | Task 9 |
| 3.5.3 prefers-reduced-motion | Task 7 |

No gaps. No placeholders.

- [ ] **Step 2: Final full build & preview**

Run the full validation chain:

```bash
npm run lint
npm run format:check
npm run check
npm run test
npm run build
```

Expected: All pass. If any fail, fix in place and amend the last commit.

---

## Done

All changes are minimal, targeted edits to existing files. No new components. No new dependencies.
