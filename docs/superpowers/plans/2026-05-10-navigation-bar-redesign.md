# Navigation Bar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Transform the floating capsule dock into a full-width integrated top navigation bar.

**Architecture:** Update CSS for .nav-dock to span 100% width and align to the top. Adjust component logic to ensure icons stay right-aligned.

**Tech Stack:** SolidJS, CSS.

---

### Task 1: CSS Layout Transformation

**Files:**
- Modify: src/styles/dock.css

- [ ] **Step 1: Update .nav-dock styles**
Modify .nav-dock to remove the floating capsule look and make it a full-width bar.

`css
/* Old styles around line 10 */
.nav-dock {
    position: absolute;
    right: 0;
    top: 0;
    left: 0;
    width: 100%;
    z-index: var(--z-dock, 10000);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end; /* Right align icons */
    padding: 0 24px;
    background: var(--dock-bg);
    backdrop-filter: blur(40px) saturate(220%);
    -webkit-backdrop-filter: blur(40px) saturate(220%);
    border-radius: 0;
    border: none;
    border-bottom: 1px solid var(--dock-border);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    /* ... transition ... */
}
`

- [ ] **Step 2: Adjust .nav-dock-item margins**
Ensure items look good in a bar layout.

`css
.nav-dock-item {
    /* ... */
    margin: 8px 6px;
    /* ... */
}
`

- [ ] **Step 3: Handle Responsive Overrides**
Ensure the mobile view doesn't break. The existing @media (max-width: 900px) hides .nav-dock and shows the bottom sheet or mobile sidebar. I need to make sure the desktop-specific full-width style doesn't interfere.

### Task 2: Component Logic & Cleanup

**Files:**
- Modify: src/components/NavigationDock.tsx

- [ ] **Step 1: Check popup positioning**
The updatePopupPosition function calculates the position of the language popup based on the button's bounding rect. Since the button moved but is still in the DOM flow, this *should* still work, but I need to verify.

- [ ] **Step 2: Commit changes**
`ash
git add src/styles/dock.css src/components/NavigationDock.tsx
git commit -m "feat: redesign navigation dock to full-width top bar"
`

### Task 3: Verification

- [ ] **Step 1: Run dev server**
Run: 
pm run dev
Expected: View the site and confirm the top bar is full-width and icons are right-aligned.

- [ ] **Step 2: Verify Magnify effect**
Confirm the icons still enlarge on hover smoothly.
