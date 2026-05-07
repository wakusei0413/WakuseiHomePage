# Wakusei Homepage UI/UX Polish Design Spec

**Date:** 2026-05-07<br>
**Status:** Draft (Pending Review)<br>
**Scope:** Detail-level visual & interaction polish while preserving Brutalism / Neo-Brutalism identity.

---

## 1. Executive Summary

This design spec outlines a focused, low-risk polish pass on the existing Wakusei homepage. All changes keep the current Brutalist visual identity (bold borders, stark shadows, warm cream `#fffef7` base, vibrant accent colors) and avoid structural rewrites. Instead, we refine spacing ratios, transition easing, color harmony between light/dark modes, cursor affordances, micro-interactions, and CSS hygiene so the site feels **handsome, durable, comfortable, convenient, attractive, and inviting to explore**.

---

## 2. Design Principles

| Principle | How it is expressed |
|-----------|---------------------|
| **Keep Brutalism** | No new design language (no glass-morphism heavy rewrites, no minimalism). Shadows, borders, and bold typography stay. |
| **Polish, don't redesign** | Only existing components are touched. No new components. No layout changes. |
| **Consistency across themes** | Any element visible in both light and dark must feel native to both, not forced. |
| **Motion with purpose** | Every animation answers a user question: "Is this clickable?", "What changed?", "Where should I look?". |
| **Reduce visual fatigue** | Softer easing, slower ambient motion, and `prefers-reduced-motion` coverage. |

---

## 3. Detailed Changes

### 3.1 Interaction Feedback System (Convenient + Comfortable)

#### 3.1.1 Cursor Feedback
- **Every interactive surface receives `cursor: pointer`.**
- **Affected selectors:**
  - `.dock-popup-option`
  - `.dock-bottom-sheet-option`
  - `.sidebar-menu-item`
  - `.sidebar-submenu-item`
- **Rationale:** Users should never be uncertain whether something is clickable. Current absence of cursor on language options is a friction point.

#### 3.1.2 Dock Hover States
- **Current behavior:** desktop Dock icons only scale on hover via JS (`setupIconMagnifyHover`).
- **New behavior:** add a complementary `background-color` transition on hover.
  - Light mode: `rgba(255, 255, 255, 0.12)` → `rgba(255, 255, 255, 0.22)`
  - Dark mode: keep current subtle white overlay, but increase opacity slightly.
- **CSS:**
  ```css
  .nav-dock-item:hover {
      background: rgba(255, 255, 255, 0.22);
  }
  ```
- **Rationale:** Scale alone is subtle on small icons; color feedback reinforces affordance without shifting layout.

#### 3.1.3 Social Link Hover Breathing
- **Current behavior:** social links snap from `box-shadow: 6px 6px 0 var(--custom-color)` to `12px 12px 0 var(--custom-color)` on hover.
- **New behavior:** introduce a subtle ambient "breath" keyframe only on the **first 3 seconds after page load** (or on `:hover`).
  - Shadow expands/contracts by ±2px over 2s ease-in-out loop.
  - Color brightness pulses slightly via `<filter>` or `filter: brightness(1.05)`.
- **CSS (static, no JS):**
  ```css
  @keyframes social-breathe {
    0%, 100% { box-shadow: 6px 6px 0 var(--custom-color); }
    50% { box-shadow: 8px 8px 0 var(--custom-color); }
  }
  .social-link-slot:hover .social-link--custom,
  .social-link-slot.is-hovered .social-link--custom {
    animation: social-breathe 2s ease-in-out infinite;
  }
  ```
- **Rationale:** draws attention to interactive tiles; the small rhythmic motion says "click me" without being intrusive.

#### 3.1.4 Avatar Hover — Softened Shadow
- **Current behavior:** hard offset shadow jumps by `+5px` on hover with `translate(-5px, -5px)`.
- **New behavior:** keep the displacement but soften the shadow edge.
  - Old: `box-shadow: calc(10px + 5px) calc(10px + 5px) 0 var(--avatar-frame-color)`
  - New: add a secondary soft shadow layer `0 0 20px rgba(0,0,0,0.15)` that appears only on hover, creating a "lifted paper" feel rather than a stamped block.
- **Rationale:** current jump is very Brutalist but can feel harsh after repeated visits; a soft secondary shadow adds depth without diluting the style.

#### 3.1.5 Global Transition Easing Curve
- **Replace** multiple ad-hoc easings with a curated family:
  - **Interactive (click/hover):** `cubic-bezier(0.34, 1.56, 0.64, 1)` — slight overshoot/spring for tactile satisfaction.
  - **Ambient (loading/spinner):** `cubic-bezier(0.16, 1, 0.3, 1)` — smooth ease-out.
  - **State (theme toggle, panel open):** `cubic-bezier(0.4, 0, 0.2, 1)` — Material-standard, predictable.
- **Affected files:** `components.css` (`.avatar-box`, `.social-link`, `.wallpaper-toggle`, `.close-panel`), `dock.css` (`.nav-dock-item`).
- **Rationale:** current mix of `cubic-bezier(0.2, 0, 0, 1)` and plain `ease` feels disjointed; unified curves make the UI feel designed by one hand.

---

### 3.2 Light/Dark Theme Consistency (Handsome + Durable)

#### 3.2.1 Desktop Dock & Popups
- **Problem:** In light mode, the Dock and language popup are dark-tinted glass (`rgba(0,0,0,0.42)`) while the left panel is warm cream `#fffef7`. The contrast is jarring.
- **New behavior:**
  - Light mode Dock becomes **light translucent**: `rgba(255, 255, 255, 0.72)` background, `rgba(0, 0, 0, 0.08)` border, `box-shadow` shifted to a cooler tone.
  - Icon color switches from `#ffffff` to `var(--fg, #0a0a0a)`.
  - Language popup and bottom sheet follow the same light-glass rule.
- **Dark mode:** keep existing dark glass — it already works perfectly.
- **Rationale:** the Dock belongs to the *page*, not the *wallpaper*. In light mode the wallpaper may not always be dark, so a dark Dock looks like a foreign object. Light glass keeps it contextual.

#### 3.2.2 Mobile Sidebar
- **Problem:** `.mobile-dock-sidebar` is always dark glass regardless of theme.
- **New behavior:**
  - Light mode: `background: rgba(255, 254, 247, 0.95)`, `border-right-color: rgba(0,0,0,0.1)`, text `color: var(--fg)`.
  - Submenu items and menu items hover accordingly.
- **Rationale:** sidebar slides out from a warm left panel; a pitch-black panel is visually hostile in light mode.

#### 3.2.3 Social Link Glow in Dark Mode
- **Current:** dark mode social links only get a faint `0 0 12px var(--custom-color)` on active/hover.
- **New:** increase glow radius to `0 0 20px` and add a soft `filter: brightness(1.1)` on hover.
- **Rationale:** dark mode can swallow subtle colors; stronger glow makes each link feel alive.

---

### 3.3 Icon & Visual Details (Durable + Professional)

#### 3.3.1 Replace `'✓'` with FontAwesome Check Icon
- **Problem:** `NavigationDock.tsx` uses `{'✓'}` (text character) for the selected-language indicator. `MobileDockSidebar.tsx` uses the literal `✓` emoji.
- **New behavior:** use a dedicated `svg-icon` or FontAwesome class `fa-solid fa-check`.
- **Rationale:** text characters are not icons; they scale badly, render inconsistently across OS fonts, and break the icon-system contract.

#### 3.3.2 Loading Overlay Animation Polish
- **Current:** `loading-bounce` animation has `translateY(-10px)` and repeats every `1.5s`; `loading-spinner` combines `rotate` + `pulse` scale.
- **New behavior:**
  - Reduce bounce amplitude to `-6px`.
  - Slow period to `2s`.
  - Add a **shimmer** to the progress bar: a diagonal white gradient stripe that sweeps left-to-right every `1.5s`.
- **CSS:**
  ```css
  .loading-bar::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
    transform: translateX(-100%);
    animation: loading-shimmer 1.5s infinite;
  }
  ```
- **Rationale:** loading is the user's first impression. A calmer bounce + a "working" shimmer reduces perceived wait time and anxiety.

#### 3.3.3 Right-Panel Shadow Softening
- **Current:** `.right-panel-shadow` uses four `inset` hard shadows with `30px` spread.
- **New behavior:** replace with a single vertical gradient overlay:
  ```css
  .right-panel-shadow {
    background: linear-gradient(
      90deg,
      rgba(0,0,0,0.25) 0%,
      rgba(0,0,0,0.05) 8%,
      transparent 15%,
      transparent 85%,
      rgba(0,0,0,0.05) 92%,
      rgba(0,0,0,0.25) 100%
    );
  }
  ```
- **Rationale:** four inset box-shadows create a "frame inside a frame" look that competes with the wallpaper. A gradient shadow is softer, less brutal, and lets the wallpaper breathe while still separating the panels.

---

### 3.4 Exploratory Micro-Interactions (Attractive + Inviting)

#### 3.4.1 Social Link — Ambient Breath (First Visit Only)
- **Behavior:** on page load, all social links briefly "exhale" (shadow grows 2px then returns to normal) over `1.2s`.
- **Implementation:** add a one-shot class via JS in `HomepageApp.tsx` when `ready()` becomes true, removed after animation.
- **Rationale:** a subtle invitation to explore. Because it happens once, it does not become noise.

#### 3.4.2 Clock — Subtle Digit Entrance
- **Behavior:** when `.info-panel` first becomes visible, the `.clock` digits do a very short `translateY(4px) → translateY(0)` + `opacity: 0 → 1` stagger over `0.4s`.
- **Implementation:** add a `.clock--entered` utility class toggled by a tiny `MutationObserver` or `onMount` in `ClockPanel.tsx`.
- **Rationale:** the large clock is a visual anchor; a dignified entrance makes the page feel "booted" and intentional.

#### 3.4.3 Typewriter Cursor — Idle Calm
- **Current:** cursor blinks at `0.8s` step-end forever.
- **New behavior:** when the typewriter is between slogans (idle state), blink slows to `2s`. When actively typing, stays at `0.8s`.
- **Implementation:** `TypewriterSlogan.tsx` toggles a `.cursor-idle` class based on internal state.
- **Rationale:** fast blinking when nothing is happening creates subconscious urgency; a slower idle pulse is calmer.

---

### 3.5 CSS Engineering & Hygiene (Durable + Stable)

#### 3.5.1 Fix Invalid Transition Declaration
- **Current:** `.container` declares `transition: grid-template-columns …` but `display: flex`.
- **Fix:** remove `grid-template-columns` from transition declaration; keep `filter` and `opacity` transitions only.

#### 3.5.2 Z-Index Fix During Loading
- **Current:** `.noise-overlay` (`z-index: 10001`) sits above `.loading-overlay` (`z-index: 9998`) while loading.
- **Fix:** while `.loading-overlay` is visible, `.noise-overlay` should temporarily lower to `z-index: 9997` (or fade its opacity to `0.01` during load).
- **Implementation:** add a sibling selector in CSS:
  ```css
  .loading-overlay:not(.hidden) ~ .noise-overlay {
    z-index: 9997;
    opacity: 0.01;
  }
  ```
- **Rationale:** grain/noise over a loading spinner makes the spinner harder to read; it should be visually silent until content appears.

#### 3.5.3 prefers-reduced-motion Coverage
- **Current:** `responsive.css` has a `@media (prefers-reduced-motion: reduce)` block that zeroes out animation durations, but it does not cover the new ambient animations (`social-breathe`, `loading-shimmer`, clock entrance).
- **Fix:** wrap all new keyframes with the same media query, or add explicit `animation: none` overrides.

---

## 4. File Impact Map

| File | Change Type | Sections Affected |
|------|-------------|-------------------|
| `css/components.css` | Edit | 3.1.4, 3.1.5, 3.3.2, 3.4.1, 3.5.3 |
| `css/layout.css` | Edit | 3.3.3, 3.5.1 |
| `css/base.css` | Edit | 3.5.2 |
| `src/styles/dock.css` | Edit | 3.1.2, 3.1.5, 3.2.1, 3.2.2 |
| `src/components/NavigationDock.tsx` | Edit | 3.3.1 (icon) |
| `src/components/MobileDockSidebar.tsx` | Edit | 3.3.1 (icon), 3.2.2 (theme) |
| `src/components/HomepageApp.tsx` | Edit | 3.4.1 (one-shot class) |
| `src/components/ClockPanel.tsx` | Edit | 3.4.2 (entrance animation) |
| `src/components/TypewriterSlogan.tsx` | Edit | 3.4.3 (idle cursor) |
| `src/components/SocialLinks.tsx` | Edit | 3.1.3 (breathe animation class) |

---

## 5. Open Questions / TBD

1. **FontAwesome `fa-solid fa-check` availability:** Need to confirm this icon class is already loaded by `lib/font-awesome.ts` or if a fallback SVG is preferred.
2. **Light-mode Dock text color:** should it switch to pure `#0a0a0a` or a slightly softer `#1a1a1a` for visual comfort?
3. **Avatar secondary shadow color in light mode:** warm cream pages with cool gray shadow may look muddy. Should it be a warm offset shadow or stay neutral?

> These can be resolved during implementation; no blockers for spec approval.

---

## 6. Success Criteria

After implementation, the site should feel:
- **Convenient:** every clickable element is discoverable via cursor + hover states.
- **Comfortable:** transitions are smooth, loading is calm, theme switching is cohesive.
- **Handsome:** light and dark modes each feel complete, not patched-together.
- **Durable:** no invalid CSS, full `prefers-reduced-motion` support, no layout thrash.
- **Attractive:** subtle micro-interactions reward attention without demanding it.
- **Inviting to explore:** social links and Dock items have just enough life to suggest interactivity.
