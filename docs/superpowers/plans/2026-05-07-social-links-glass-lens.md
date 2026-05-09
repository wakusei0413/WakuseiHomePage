# Social Links Glass Lens Refraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Thicken `.social-link` borders to 3px and replace the flat hover color-fill with a layered glass / lens caustic effect using multiple inset box-shadows, radial gradients, and dual-direction light streaks.

**Architecture:** Pure CSS enhancement within `src/styles/components.css`. No JS/TS changes, no new files. Six targeted edits to existing selectors.

**Tech Stack:** CSS (`color-mix`, `box-shadow`, `radial-gradient`, `@keyframes`).

---

### Task 1: Default state — `.social-link` border + base box-shadow

**Files:**
- Modify: `src/styles/components.css:391-422` (`.social-link` selector)

- [ ] **Step 1: Thicken `border` to `3px` and raise mix ratio**

Replace this block:
```css
    border: 1px solid
        color-mix(
            in srgb,
            var(--custom-color, #ffe600) var(--interactive-card-border-mix, 34%),
            transparent
        );
```
With:
```css
    border: 3px solid
        color-mix(
            in srgb,
            var(--custom-color, #ffe600) 40%,
            transparent
        );
```

- [ ] **Step 2: Add `inset` edge reflection to base `box-shadow` in `.social-link--custom`**

Replace the `.social-link--custom` block (`.social-link--custom { ... }`, around line 457-467) from:
```css
.social-link--custom {
    --custom-color: #ffe600;
    box-shadow:
        var(--interactive-card-shadow, 0 6px 18px rgba(0, 0, 0, 0.08)),
        0 0 0 1px color-mix(in srgb, var(--custom-color, #ffe600) 12%, transparent),
        0 5px 16px color-mix(
            in srgb,
            var(--custom-color, #ffe600) var(--interactive-card-line-glow-mix, 22%),
            transparent
        );
}
```
To:
```css
.social-link--custom {
    --custom-color: #ffe600;
    box-shadow:
        var(--interactive-card-shadow, 0 6px 18px rgba(0, 0, 0, 0.08)),
        0 0 0 3px color-mix(in srgb, var(--custom-color, #ffe600) 12%, transparent),
        0 5px 16px color-mix(
            in srgb,
            var(--custom-color, #ffe600) var(--interactive-card-line-glow-mix, 22%),
            transparent
        ),
        inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/components.css
git commit -m "feat: thicken social-link border and add default inset shadow"
```

---

### Task 2: Glass lens hover fill — `::before` caustic addition

**Files:**
- Modify: `src/styles/components.css:478-506` (`.social-link--custom::before`)

- [ ] **Step 1: Insert radial caustic layer between existing Layer 2 and the final base gradient**

Replace the `background:` inside `.social-link--custom::before` from:
```css
    background:
        linear-gradient(
            118deg,
            transparent 0%,
            transparent 21%,
            rgba(255, 255, 255, 0.34) 34%,
            rgba(255, 255, 255, 0.12) 42%,
            transparent 56%,
            transparent 100%
        ),
        radial-gradient(
            ellipse at 50% 112%,
            rgba(255, 255, 255, 0.22) 0%,
            color-mix(in srgb, var(--custom-color, #ffe600) 36%, transparent) 34%,
            transparent 72%
        ),
        linear-gradient(
            180deg,
            color-mix(in srgb, var(--custom-color, #ffe600) 78%, var(--interactive-card-bg, #fffef7)) 0%,
            color-mix(in srgb, var(--custom-color, #ffe600) 96%, var(--interactive-card-bg, #fffef7)) 100%
        );
```
With:
```css
    background:
        linear-gradient(
            118deg,
            transparent 0%,
            transparent 21%,
            rgba(255, 255, 255, 0.34) 34%,
            rgba(255, 255, 255, 0.12) 42%,
            transparent 56%,
            transparent 100%
        ),
        radial-gradient(
            ellipse at 50% 112%,
            rgba(255, 255, 255, 0.22) 0%,
            color-mix(in srgb, var(--custom-color, #ffe600) 36%, transparent) 34%,
            transparent 72%
        ),
        radial-gradient(
            ellipse at 50% 50%,
            rgba(255, 255, 255, 0.18) 0%,
            transparent 55%
        ),
        linear-gradient(
            180deg,
            color-mix(in srgb, var(--custom-color, #ffe600) 78%, var(--interactive-card-bg, #fffef7)) 0%,
            color-mix(in srgb, var(--custom-color, #ffe600) 96%, var(--interactive-card-bg, #fffef7)) 100%
        );
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/components.css
git commit -m "feat: add radial caustic layer to social-link hover fill"
```

---

### Task 3: Dual-direction light streak — `::after` enhancement

**Files:**
- Modify: `src/styles/components.css:508-522` (`.social-link--custom::after`)

- [ ] **Step 1: Replace single streak with two opposing streaks**

Replace the `background:` inside `.social-link--custom::after` from:
```css
    background: linear-gradient(
        110deg,
        transparent 0%,
        transparent 36%,
        rgba(255, 255, 255, 0.26) 46%,
        transparent 58%,
        transparent 100%
    );
```
With:
```css
    background:
        linear-gradient(
            110deg,
            transparent 0%,
            transparent 36%,
            rgba(255, 255, 255, 0.32) 46%,
            transparent 58%,
            transparent 100%
        ),
        linear-gradient(
            290deg,
            transparent 0%,
            transparent 40%,
            rgba(255, 255, 255, 0.14) 50%,
            transparent 60%,
            transparent 100%
        );
```

- [ ] **Step 2: Increase hover opacity for `::after`**

In the hover rule block (`.social-link-slot.is-hovered .social-link--custom::after` etc., around line 555-558), replace:
```css
    opacity: var(--interactive-card-light-opacity, 0.62);
```
With:
```css
    opacity: var(--interactive-card-light-opacity, 0.82);
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/components.css
git commit -m "feat: dual-direction light streak on social-link hover"
```

---

### Task 4: Hover state — border intensity + multi-layer inset shadows

**Files:**
- Modify: `src/styles/components.css:524-541` (`.social-link-slot.is-hovered .social-link--custom`)

- [ ] **Step 1: Raise hover border-color opacity**

Replace:
```css
    border-color: color-mix(in srgb, var(--custom-color, #ffe600) 58%, rgba(255, 255, 255, 0.34));
```
With:
```css
    border-color: color-mix(in srgb, var(--custom-color, #ffe600) 72%, rgba(255, 255, 255, 0.34));
```

- [ ] **Step 2: Expand hover `box-shadow` to 6 layers (external + internal thickness)**

Replace:
```css
    box-shadow:
        var(--interactive-card-hover-shadow, 0 18px 34px rgba(0, 0, 0, 0.16)),
        0 0 0 1px color-mix(in srgb, var(--custom-color, #ffe600) 22%, transparent),
        0 10px 30px color-mix(in srgb, var(--custom-color, #ffe600) 28%, transparent),
        inset 0 -1px 0 rgba(255, 255, 255, 0.24);
```
With:
```css
    box-shadow:
        var(--interactive-card-hover-shadow, 0 18px 34px rgba(0, 0, 0, 0.16)),
        0 0 0 3px color-mix(in srgb, var(--custom-color, #ffe600) 22%, transparent),
        0 10px 30px color-mix(in srgb, var(--custom-color, #ffe600) 28%, transparent),
        inset 0 0 16px rgba(255, 255, 255, 0.22),
        inset 0 0 4px rgba(255, 255, 255, 0.45),
        inset 0 -2px 4px color-mix(in srgb, var(--custom-color, #ffe600) 20%, transparent);
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/components.css
git commit -m "feat: multi-layer inset shadows for glass thickness on hover"
```

---

### Task 5: Animation punch-up — `@keyframes social-prism-fill`

**Files:**
- Modify: `src/styles/components.css:570-583` (`@keyframes social-prism-fill`)

- [ ] **Step 1: Increase peak `scaleY` from `1.04` to `1.08`**

Replace:
```css
    48% {
        opacity: 1;
        transform: translate3d(0, -2%, 0) scaleY(1.04) skewY(1deg);
    }
```
With:
```css
    48% {
        opacity: 1;
        transform: translate3d(0, -2%, 0) scaleY(1.08) skewY(1deg);
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/components.css
git commit -m "feat: increase prism-fill peak scaleY for snappier lens animation"
```

---

### Task 6: Verification

**Files:**
- Modify: none

- [ ] **Step 1: Run lint**

```bash
npm run lint
```
Expected: no ESLint errors (CSS-only change, should be clean).

- [ ] **Step 2: Run format check**

```bash
npm run format:check
```
Expected: Prettier passes. If it fails, run `npm run format` and amend.

- [ ] **Step 3: Run build**

```bash
npm run build
```
Expected: Astro static build succeeds, `dist/` generated.

- [ ] **Step 4: Commit (if formatting fixes were applied)**

```bash
git add src/styles/components.css
git commit -m "style: format social-link glass-lens CSS"
```

---

## Self-Review

1. **Spec coverage:**
   - Default border 3px → Task 1 ✔
   - Default inset shadow → Task 1 ✔
   - `::before` radial caustic → Task 2 ✔
   - `::after` dual streaks + opacity 0.82 → Task 3 ✔
   - Hover border 72% opacity → Task 4 ✔
   - Hover 6-layer box-shadow → Task 4 ✔
   - Animation scaleY 1.08 → Task 5 ✔
   - Verification → Task 6 ✔

2. **Placeholder scan:** None found. All CSS values concrete.

3. **Type consistency:** N/A (CSS only).
