# Code Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove ~890 lines of dead code, duplicate CSS, and unused dependencies from the Wakusei homepage codebase.

**Architecture:** Systematic deletion of dead files, unused CSS selectors, duplicate CSS rules, unused npm packages, and unused store methods. Each step is independently testable.

**Tech Stack:** Astro 6, Vue 3, TypeScript, CSS, Vitest

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Delete | `src/composables/useEffects.ts` | Dead composable, never imported |
| Delete | `src/composables/useWallpaper.ts` | Dead composable, never imported |
| Delete | `src/composables/useDock.ts` | Dead re-export, never imported |
| Delete | `src/composables/useLogger.ts` | Dead passthrough, only used by dead code |
| Delete | `src/components/ClockPanel.vue` | Unused component |
| Delete | `css/` (entire directory) | Orphaned shim files |
| Delete | `src/styles/dock.css` (nav-dock rules) | Unused CSS classes |
| Modify | `src/styles/base.css` | Remove duplicate rules (lines 170-186) |
| Modify | `src/styles/components.css` | Remove dead selectors + merge duplicates |
| Modify | `src/styles/transitions.css` | Remove `.blog-content`, `.placeholder-content` |
| Modify | `src/stores/theme.ts` | Remove `syncFromStorage` |
| Modify | `src/composables/useTheme.ts` | Remove `syncFromStorage` binding |
| Modify | `package.json` | Remove 8 unused dependencies |
| Modify | `tests/logic-guardrails.test.ts` | Remove ClockPanel test assertion |
| Modify | `tests/dock-styles.test.ts` | Delete entire file (tests deleted CSS) |
| Modify | `tests/social-link-styles.test.ts` | Update regex to remove wallpaper-toggle/close-panel |

---

### Task 1: Delete dead composable files

**Files:**
- Delete: `src/composables/useEffects.ts`
- Delete: `src/composables/useWallpaper.ts`
- Delete: `src/composables/useDock.ts`
- Delete: `src/composables/useLogger.ts`

- [ ] **Step 1: Delete the 4 dead composable files**

Run:
```powershell
Remove-Item "C:\Users\wakusei\Desktop\WakuseiHomePage\src\composables\useEffects.ts"
Remove-Item "C:\Users\wakusei\Desktop\WakuseiHomePage\src\composables\useWallpaper.ts"
Remove-Item "C:\Users\wakusei\Desktop\WakuseiHomePage\src\composables\useDock.ts"
Remove-Item "C:\Users\wakusei\Desktop\WakuseiHomePage\src\composables\useLogger.ts"
```

- [ ] **Step 2: Verify no imports reference these files**

Run:
```powershell
rg "useEffects|useWallpaper|useDock|useLogger" src/
```
Expected: No matches (these are all dead, never imported outside their own files)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: delete dead composables (useEffects, useWallpaper, useDock, useLogger)"
```

---

### Task 2: Delete unused ClockPanel component

**Files:**
- Delete: `src/components/ClockPanel.vue`
- Modify: `tests/logic-guardrails.test.ts:6,24-27`

- [ ] **Step 1: Delete ClockPanel.vue**

Run:
```powershell
Remove-Item "C:\Users\wakusei\Desktop\WakuseiHomePage\src\components\ClockPanel.vue"
```

- [ ] **Step 2: Update logic-guardrails.test.ts to remove ClockPanel assertions**

The test at lines 24-27 checks ClockPanel config flags. Since the component is deleted, remove the entire test case. Also remove the `clockPanelComponent` variable at line 6.

Read `tests/logic-guardrails.test.ts`, then replace the file content. Remove:
- Line 6: `const clockPanelComponent = ...`
- Lines 24-27: the entire `it('respects clock visibility config flags', ...)` block

- [ ] **Step 3: Run tests to verify**

Run:
```powershell
npm test
```
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: delete unused ClockPanel component and related test"
```

---

### Task 3: Delete css/ shim directory

**Files:**
- Delete: `css/base.css`
- Delete: `css/components.css`
- Delete: `css/layout.css`
- Delete: `css/components.css`

- [ ] **Step 1: Delete the entire css/ directory**

Run:
```powershell
Remove-Item -Recurse "C:\Users\wakusei\Desktop\WakuseiHomePage\css"
```

- [ ] **Step 2: Verify no imports reference css/ directory**

Run:
```powershell
rg "from ['\"]css/" src/
```
Expected: No matches

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: delete orphaned css/ shim directory"
```

---

### Task 4: Remove unused npm dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove 8 unused dependencies from package.json**

Read `package.json`, then remove these from `dependencies`:
```json
"@fortawesome/fontawesome-free": "^7.2.0",
"@swup/a11y-plugin": "^5.1.0",
"@swup/astro": "^1.8.0",
"@swup/head-plugin": "^2.3.1",
"@swup/preload-plugin": "^3.2.11",
"@swup/scripts-plugin": "^2.1.0",
"@swup/scroll-plugin": "^4.0.0",
"swup": "^4.9.0"
```

- [ ] **Step 2: Verify no source code references swup or fontawesome**

Run:
```powershell
rg "swup|fontawesome" src/
```
Expected: No matches

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: remove unused swup and fontawesome dependencies"
```

---

### Task 5: Delete dock.css nav-dock rules

**Files:**
- Modify: `src/styles/dock.css`

- [ ] **Step 1: Replace dock.css with only the sidebar rules**

The entire `.nav-dock`, `.nav-dock-item`, `.nav-dock-divider` block and related theme overrides are unused. Only `.sidebar-menu-item` and `.sidebar-submenu-item` rules (lines 99-102) may still be used by MobileDockSidebar.vue.

Replace the entire content of `src/styles/dock.css` with:

```css
/* ========================================
    Sidebar Menu Items
    ======================================== */

.sidebar-menu-item,
.sidebar-submenu-item {
    cursor: pointer;
}
```

- [ ] **Step 2: Verify no template uses .nav-dock classes**

Run:
```powershell
rg "nav-dock" src/
```
Expected: No matches in .vue or .astro files

- [ ] **Step 3: Delete tests/dock-styles.test.ts**

This test file reads dock.css and checks for `.nav-dock` rules. Since those rules are being removed, delete the test file.

Run:
```powershell
Remove-Item "C:\Users\wakusei\Desktop\WakuseiHomePage\tests\dock-styles.test.ts"
```

- [ ] **Step 4: Run tests**

Run:
```powershell
npm test
```
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove dead nav-dock CSS, keep only sidebar rules"
```

---

### Task 6: Remove dead CSS selectors from components.css

**Files:**
- Modify: `src/styles/components.css`

- [ ] **Step 1: Remove the following dead selector blocks from components.css**

Delete these blocks entirely (search and remove):

1. `.wallpaper-container` in the transition group (line 14) — remove from the `.bio-container, .time-widget, .wallpaper-container` group, keep `.bio-container` only
2. `.time-widget` in the transition group (line 13) — remove from the group
3. `.wallpaper-toggle` block (lines 677-722) — entire block
4. `.close-panel` block (lines 725-767) — entire block
5. `.no-object-fit` rules (lines 786-794) — entire block
6. `.legacy-compat` block (lines 836-953) — entire block
7. `.footer-left`, `.footer-line`, `.footer-text` first definition (lines 609-636) — entire block
8. `.footer-left`, `.footer-line`, `.footer-text` second definition (lines 1085-1106) — entire block
9. `.wallpaper-toggle::before` reference in the `::before` block (line 809) — remove from the selector list
10. `[data-theme='dark'] .wallpaper-toggle` block (lines 1109-1121) — entire block
11. `[data-theme='dark'] .close-panel` block (lines 1124-1133) — entire block

- [ ] **Step 2: Update social-link-styles.test.ts**

The test at line 8-10 checks that `.wallpaper-toggle::before` and `.close-panel::before` are NOT in a grouped selector with `.avatar-box::before` and `.social-link::before`. After removal, the `::before` group will only contain `.avatar-box::before` and `.social-link::before`.

Update the regex in `tests/social-link-styles.test.ts` line 8-10 from:
```ts
expect(componentsCss).not.toMatch(
    /\.avatar-box::before,\s*\.social-link::before,\s*\.wallpaper-toggle::before,\s*\.close-panel::before/
);
```
to:
```ts
expect(componentsCss).not.toMatch(
    /\.avatar-box::before,\s*\.social-link::before/
);
```

- [ ] **Step 3: Run tests**

Run:
```powershell
npm test
```
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove dead CSS selectors (wallpaper-toggle, close-panel, legacy-compat, no-object-fit, footer-left)"
```

---

### Task 7: Merge duplicate CSS rules in base.css

**Files:**
- Modify: `src/styles/base.css`

- [ ] **Step 1: Remove duplicate rules from base.css**

Read `src/styles/base.css`. Lines 170-186 are exact duplicates of lines 152-168. Delete lines 170-186:

```css
html::-webkit-scrollbar {
    display: none;
}

body {
    font-family: 'Times New Roman', 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
    font-family: var(--font-serif, 'Times New Roman', 'Noto Serif SC', 'Songti SC', 'SimSun', serif);
    font-size: 1rem;
    line-height: 1.6;
    color: #0a0a0a;
    color: var(--fg, #0a0a0a);
    background-color: #fffef7;
    background-color: var(--bg, #fffef7);
    transition:
        background-color var(--transition-normal),
        color var(--transition-normal);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/base.css
git commit -m "style: remove duplicate scrollbar and body rules in base.css"
```

---

### Task 8: Merge duplicate CSS rules in components.css

**Files:**
- Modify: `src/styles/components.css`

- [ ] **Step 1: Merge all duplicate selectors in components.css**

For each duplicate selector, keep only the LAST definition (CSS cascade: last wins). Delete all earlier definitions.

Duplicates to merge (delete earlier occurrences, keep last):

1. `.loading-spinner` — delete lines 80-86 and 111-117, keep lines 176-186
2. `.loading-progress` — delete lines 89-97 and 145-153, keep lines 211-220
3. `.loading-bar` — delete lines 155-162, keep lines 222-230
4. `.loading-text` — delete lines 134-142, keep lines 198-208
5. `.loading-panel` — delete lines 129-131, keep lines 66-77
6. `@keyframes loading-rotate` — delete lines 119-126, keep lines 188-195
7. `.avatar-box` (first definition at lines 7-9) — delete lines 7-9, keep lines 256-285
8. `.name` — if there's a duplicate, delete the earlier one
9. `.status-bar` — delete lines 330-345 and 987-1003, keep the last definition
10. `.status-dot` — delete lines 347-354, 399-406, 408-418, keep lines 1005-1013
11. `.status-text` — delete lines 372-375 and 436-440, keep lines 1031-1034
12. `.bio-container` — delete lines 378-388 and 443-455, keep lines 1037-1046
13. `.bio` — delete lines 390-397 and 457-466, keep lines 1048-1055
14. `@keyframes pulse` — delete lines 362-370, 426-434, keep lines 1021-1029
15. `@media (prefers-reduced-motion: reduce)` — delete duplicates at 955-960 and 1135-1140, keep the last one

After this cleanup, the file should have each selector defined exactly once.

- [ ] **Step 2: Run tests**

Run:
```powershell
npm test
```
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/styles/components.css
git commit -m "style: merge duplicate CSS rules in components.css"
```

---

### Task 9: Remove dead selectors from transitions.css

**Files:**
- Modify: `src/styles/transitions.css`

- [ ] **Step 1: Remove .blog-content and .placeholder-content from transitions.css**

Read `src/styles/transitions.css`. Delete:
- `.blog-content` block (lines 40-46)
- `.placeholder-content` and `.placeholder-content h2` blocks (lines 49-61)

- [ ] **Step 2: Commit**

```bash
git add src/styles/transitions.css
git commit -m "style: remove unused blog-content and placeholder-content selectors"
```

---

### Task 10: Remove syncFromStorage from theme store and composable

**Files:**
- Modify: `src/stores/theme.ts`
- Modify: `src/composables/useTheme.ts`

- [ ] **Step 1: Remove syncFromStorage from theme store**

Read `src/stores/theme.ts`. Delete the `syncFromStorage` function and remove it from the return statement.

The return should change from:
```ts
return { isDark, init, toggle, syncFromStorage };
```
to:
```ts
return { isDark, init, toggle };
```

- [ ] **Step 2: Remove syncFromStorage from useTheme composable**

Read `src/composables/useTheme.ts`. Delete the `syncFromStorage` method binding and remove it from the return statement.

Remove from return:
```ts
syncFromStorage: () => store.syncFromStorage()
```

- [ ] **Step 3: Verify no component calls syncFromStorage**

Run:
```powershell
rg "syncFromStorage" src/
```
Expected: No matches

- [ ] **Step 4: Commit**

```bash
git add src/stores/theme.ts src/composables/useTheme.ts
git commit -m "refactor: remove unused syncFromStorage from theme store"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run full lint + format + test + typecheck + build chain**

Run:
```powershell
npm run lint; if ($?) { npm run format:check }; if ($?) { npm test }; if ($?) { npm run check }; if ($?) { npm run build }
```

Expected: All pass

- [ ] **Step 2: Final commit if any remaining changes**

```bash
git add -A
git status
```

If there are changes, commit with appropriate message.

---

## Self-Review

**1. Spec coverage check:**
- Dead composables (4 files) → Task 1 ✓
- ClockPanel.vue → Task 2 ✓
- css/ directory → Task 3 ✓
- Unused npm packages → Task 4 ✓
- dock.css nav-dock rules → Task 5 ✓
- Dead CSS selectors → Task 6 ✓
- Duplicate base.css rules → Task 7 ✓
- Duplicate components.css rules → Task 8 ✓
- Dead transitions.css selectors → Task 9 ✓
- syncFromStorage → Task 10 ✓
- Test updates → Tasks 2, 5, 6 ✓
- Final verification → Task 11 ✓

**2. Placeholder scan:** No TBD, TODO, or vague instructions. All steps have exact file paths, line references, and code blocks.

**3. Type consistency:** No type changes introduced. All deletions and removals are clean — no new types or signatures needed.
