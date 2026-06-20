# Navigation Progress Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a delayed top-page navigation progress bar for Astro client-side route changes so the current page remains visible while the next page is loading.

**Architecture:** Use Astro ClientRouter lifecycle events from `BaseLayout.astro` to drive one persistent DOM progress element. CSS in `src/styles/transitions.css` handles the fixed top bar, delayed visibility, completion animation, and reduced-motion behavior.

**Tech Stack:** Astro 6, View Transitions `ClientRouter`, inline browser script, CSS transitions, Vitest static guardrail tests.

---

### Task 1: Add Regression Tests

**Files:**
- Modify: `tests/loading-overlay-navigation.test.ts`

- [ ] **Step 1: Add assertions for the navigation progress element and event wiring**

Add these expectations to `tests/loading-overlay-navigation.test.ts`:

```ts
it('renders and drives a delayed top navigation progress bar', () => {
    expect(baseLayout).toMatch(/id="navigationProgress"/);
    expect(baseLayout).toMatch(/astro:before-preparation/);
    expect(baseLayout).toMatch(/astro:after-swap/);
    expect(baseLayout).toMatch(/var showDelay = 120;/);
    expect(baseLayout).toMatch(/navigation-progress--visible/);
});

it('styles the top navigation progress bar without blocking clicks', () => {
    const transitionsCss = readFileSync(join(process.cwd(), 'src', 'styles', 'transitions.css'), 'utf8');
    expect(transitionsCss).toMatch(/\.navigation-progress/);
    expect(transitionsCss).toMatch(/position:\s*fixed/);
    expect(transitionsCss).toMatch(/pointer-events:\s*none/);
    expect(transitionsCss).toMatch(/\.navigation-progress--visible/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/loading-overlay-navigation.test.ts`

Expected: FAIL because `navigationProgress`, `astro:before-preparation`, and `.navigation-progress` do not exist yet.

### Task 2: Add Markup and Navigation Event Script

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Add persistent progress markup**

Add this near the top of `<body>`, before the global loading overlay:

```astro
<div id="navigationProgress" class="navigation-progress" aria-hidden="true">
    <div id="navigationProgressBar" class="navigation-progress__bar"></div>
</div>
```

- [ ] **Step 2: Add navigation progress script**

Add an inline script near the existing Astro navigation scripts:

```astro
<script is:inline>
    (function () {
        var progress = document.getElementById('navigationProgress');
        var bar = document.getElementById('navigationProgressBar');
        var showDelay = 120;
        var showTimer;
        var trickleTimer;
        var hideTimer;
        var value = 0;

        function setValue(nextValue) {
            value = Math.max(value, Math.min(nextValue, 100));
            if (bar) bar.style.transform = 'scaleX(' + value / 100 + ')';
        }

        function reset() {
            window.clearTimeout(showTimer);
            window.clearInterval(trickleTimer);
            window.clearTimeout(hideTimer);
            value = 0;
            if (bar) bar.style.transform = 'scaleX(0)';
            if (progress) {
                progress.classList.remove('navigation-progress--visible');
                progress.classList.remove('navigation-progress--done');
            }
        }

        function start() {
            reset();
            showTimer = window.setTimeout(function () {
                if (!progress) return;
                progress.classList.add('navigation-progress--visible');
                setValue(12);
                trickleTimer = window.setInterval(function () {
                    setValue(value + Math.max(1, (88 - value) * 0.12));
                }, 180);
            }, showDelay);
        }

        function finish() {
            window.clearTimeout(showTimer);
            window.clearInterval(trickleTimer);
            if (!progress) return;
            if (!progress.classList.contains('navigation-progress--visible')) {
                reset();
                return;
            }
            setValue(100);
            progress.classList.add('navigation-progress--done');
            hideTimer = window.setTimeout(reset, 260);
        }

        document.addEventListener('astro:before-preparation', start);
        document.addEventListener('astro:after-swap', finish);
        document.addEventListener('astro:page-load', finish);
    })();
</script>
```

- [ ] **Step 3: Run test to verify script assertions pass after CSS is still missing**

Run: `npm test -- tests/loading-overlay-navigation.test.ts`

Expected: partial failure only on CSS assertions until Task 3 is complete.

### Task 3: Add Top Progress CSS

**Files:**
- Modify: `src/styles/transitions.css`

- [ ] **Step 1: Add navigation progress styles**

Append this CSS:

```css
.navigation-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    z-index: calc(var(--z-loading, 9998) + 2);
    pointer-events: none;
    opacity: 0;
    transform: translateY(-3px);
    transition:
        opacity 0.16s ease,
        transform 0.16s ease;
}

.navigation-progress--visible {
    opacity: 1;
    transform: translateY(0);
}

.navigation-progress__bar {
    width: 100%;
    height: 100%;
    transform: scaleX(0);
    transform-origin: left center;
    background: linear-gradient(90deg, var(--accent-blue, #3e59ff), var(--accent-yellow, #ffe600));
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-blue, #3e59ff) 55%, transparent);
    transition: transform 0.18s ease-out;
}

.navigation-progress--done .navigation-progress__bar {
    transition-duration: 0.12s;
}

@media (prefers-reduced-motion: reduce) {
    .navigation-progress,
    .navigation-progress__bar {
        transition: none;
    }
}
```

- [ ] **Step 2: Run targeted test**

Run: `npm test -- tests/loading-overlay-navigation.test.ts`

Expected: PASS.

### Task 4: Verify Full Site

**Files:**
- No code changes.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run Astro check**

Run: `npm run check`

Expected: 0 errors.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: static build completes and includes existing routes.

- [ ] **Step 4: Run format check**

Run: `npm run format:check`

Expected: may still report existing `src/components/HomepageApp.vue` formatting issue; no new files should be reported.
