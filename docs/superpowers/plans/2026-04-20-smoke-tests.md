# Smoke Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 2-3 minimal smoke tests to prevent regressions on config structure and typewriter slogan-selection logic.

**Architecture:** Extract `getNextSlogan` from typewriter IIFE into a pure `createSloganSelector(mode, slogans)` function in `js/slogan-selector.js`. Test it with `node:test`. Also test that config key fields exist and build output is generated. Zero new dependencies — only Node built-ins.

**Tech Stack:** `node:test`, `node:assert/strict`, `node:child_process`, `node:fs`, `node:path`

---

### Task 1: Make config.js Node-safe

**Files:**
- Modify: `config.js:229-236`

The current `config.js` crashes when `require()`d in Node because it unconditionally accesses `window.App`. Add a `typeof window !== 'undefined'` guard around the browser-only block.

- [ ] **Step 1: Edit config.js — wrap browser block in typeof guard**

Change lines 233-236 from:

```javascript
if (typeof window.App === 'undefined') {
    window.App = {};
}
window.App.config = CONFIG;
```

to:

```javascript
if (typeof window !== 'undefined') {
    if (typeof window.App === 'undefined') {
        window.App = {};
    }
    window.App.config = CONFIG;
}
```

- [ ] **Step 2: Verify it loads in Node**

Run: `node -e "const c = require('./config'); console.log(c.version, c.profile.name);"`

Expected output: `0.5.5 遊星 Wakusei`

- [ ] **Step 3: Commit**

```bash
git add config.js
git commit -m "fix: make config.js safe for Node require"
```

---

### Task 2: Add test script and directory

**Files:**
- Modify: `package.json:6-12` (scripts section)

- [ ] **Step 1: Add "test" script to package.json**

Add this line after the `"serve"` script entry:

```json
"test": "node --test tests/*.test.js"
```

The full scripts block should become:

```json
"scripts": {
    "lint": "eslint js/ config.js",
    "lint:fix": "eslint js/ config.js --fix",
    "format": "prettier --write \"js/**/*.js\" config.js css/**/*.css index.html",
    "format:check": "prettier --check \"js/**/*.js\" config.js css/**/*.css index.html",
    "build": "node build.js",
    "serve": "npx serve dist",
    "test": "node --test tests/*.test.js"
}
```

- [ ] **Step 2: Create tests/ directory**

Run: `mkdir tests`

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add test script to package.json"
```

---

### Task 3: Create slogan-selector module + tests (TDD)

**Files:**
- Create: `js/slogan-selector.js`
- Create: `tests/slogan-selector.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/slogan-selector.test.js`:

```javascript
'use strict';
/* eslint-env node */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../js/slogan-selector');

describe('createSloganSelector', () => {
    it('sequence mode: returns slogans in order and wraps', () => {
        const slogans = ['alpha', 'beta', 'gamma'];
        const selector = create('sequence', slogans);
        assert.strictEqual(selector.next().text, 'alpha');
        assert.strictEqual(selector.next().text, 'beta');
        assert.strictEqual(selector.next().text, 'gamma');
        assert.strictEqual(selector.next().text, 'alpha');
    });

    it('sequence mode: tracks index starting at 0', () => {
        const slogans = ['a', 'b', 'c'];
        const selector = create('sequence', slogans);
        assert.strictEqual(selector.next().index, 0);
        assert.strictEqual(selector.next().index, 1);
        assert.strictEqual(selector.next().index, 2);
        assert.strictEqual(selector.next().index, 0);
    });

    it('random mode: never repeats the same slogan consecutively', () => {
        const slogans = ['x', 'y', 'z'];
        const selector = create('random', slogans);
        let prev = selector.next();
        for (let i = 0; i < 50; i++) {
            const curr = selector.next();
            assert.notStrictEqual(curr.text, prev.text);
            prev = curr;
        }
    });

    it('random mode: single-item list does not infinite-loop', () => {
        const slogans = ['only'];
        const selector = create('random', slogans);
        const result = selector.next();
        assert.strictEqual(result.text, 'only');
        assert.strictEqual(result.index, 0);
    });

    it('sequence mode: single-item list always returns the same item', () => {
        const slogans = ['only'];
        const selector = create('sequence', slogans);
        assert.strictEqual(selector.next().text, 'only');
        assert.strictEqual(selector.next().text, 'only');
    });

    it('defaults to sequence mode for unknown mode values', () => {
        const slogans = ['a', 'b'];
        const selector = create('unknown', slogans);
        assert.strictEqual(selector.next().text, 'a');
        assert.strictEqual(selector.next().text, 'b');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL — `Cannot find module '../js/slogan-selector'`

- [ ] **Step 3: Create `js/slogan-selector.js`**

Create `js/slogan-selector.js`:

```javascript
/**
 * Slogan 选择器模块
 * 功能：纯函数，按随机或顺序模式从列表中选取下一条 Slogan
 * 供 typewriter.js 调用，也可独立测试
 */
(function () {
    'use strict';

    function createSloganSelector(mode, slogans) {
        var currentIndex = -1;

        function next() {
            if (mode === 'random') {
                var newIndex;
                do {
                    newIndex = Math.floor(Math.random() * slogans.length);
                } while (newIndex === currentIndex && slogans.length > 1);
                currentIndex = newIndex;
            } else {
                currentIndex = (currentIndex + 1) % slogans.length;
            }
            return { index: currentIndex, text: slogans[currentIndex] };
        }

        return { next: next };
    }

    if (typeof window !== 'undefined') {
        window.App = window.App || {};
        window.App.sloganSelector = { create: createSloganSelector };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { create: createSloganSelector };
    }
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`

Expected: All slogan-selector tests PASS.

- [ ] **Step 5: Run lint on the new file**

Run: `npm run lint`

Expected: No errors for `js/slogan-selector.js`.

- [ ] **Step 6: Commit**

```bash
git add js/slogan-selector.js tests/slogan-selector.test.js
git commit -m "feat: extract slogan selector into testable module with tests"
```

---

### Task 4: Update typewriter.js to use slogan-selector

**Files:**
- Modify: `js/typewriter.js:22-44` (remove `currentIndex` and `getNextSlogan`, add `selector`)
- Modify: `js/typewriter.js:76-81` (update `runTypewriter` to use `selector.next()`)
- Modify: `index.html:184-185` (add script tag for `slogan-selector.js`)

- [ ] **Step 1: Edit typewriter.js — remove currentIndex and getNextSlogan, add selector**

Replace in `initTypewriter()`, remove line `var currentIndex = -1;` and the entire `getNextSlogan()` function (lines 23-44). Add `var selector = App.sloganSelector.create(mode, slogans);` after line 21 (`var mode = ...`).

The relevant section in `initTypewriter()` should change from:

```javascript
        var mode = App.config.slogans.mode || 'random';

        var currentIndex = -1;

        if (container) container.style.minHeight = '100px';

        if (cursor && App.config.animation) {
```

to:

```javascript
        var mode = App.config.slogans.mode || 'random';

        var selector = App.sloganSelector.create(mode, slogans);

        if (container) container.style.minHeight = '100px';

        if (cursor && App.config.animation) {
```

And the entire `getNextSlogan` function (lines 33-44) should be removed.

- [ ] **Step 2: Edit typewriter.js — update runTypewriter to use selector**

Change the `runTypewriter` function from:

```javascript
        function runTypewriter() {
            var slogan = getNextSlogan();
            App.logger.log(
                '[Slogan ' + (currentIndex + 1) + '/' + slogans.length + ']:',
                slogan.substring(0, 30) + '...'
            );
```

to:

```javascript
        function runTypewriter() {
            var result = selector.next();
            var slogan = result.text;
            App.logger.log(
                '[Slogan ' + (result.index + 1) + '/' + slogans.length + ']:',
                slogan.substring(0, 30) + '...'
            );
```

- [ ] **Step 3: Add script tag in index.html**

In `index.html`, add a line before line 185 (`<script src="js/typewriter.js"></script>`):

```html
        <script src="js/slogan-selector.js"></script>
```

Result should be:

```html
        <!-- 功能模块 -->
        <script src="js/slogan-selector.js"></script>
        <script src="js/typewriter.js"></script>
```

- [ ] **Step 4: Run lint**

Run: `npm run lint`

Expected: No errors.

- [ ] **Step 5: Run existing tests**

Run: `npm test`

Expected: All slogan-selector tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add js/typewriter.js index.html
git commit -m "refactor: typewriter uses slogan selector module"
```

---

### Task 5: Add config-fields smoke test

**Files:**
- Create: `tests/config-fields.test.js`

- [ ] **Step 1: Write the test**

Create `tests/config-fields.test.js`:

```javascript
'use strict';
/* eslint-env node */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const CONFIG = require('../config');

describe('CONFIG key fields', () => {
    it('has version string', () => {
        assert.strictEqual(typeof CONFIG.version, 'string');
        assert.ok(CONFIG.version.length > 0);
    });

    it('has profile with name', () => {
        assert.ok(CONFIG.profile);
        assert.strictEqual(typeof CONFIG.profile.name, 'string');
        assert.ok(CONFIG.profile.name.length > 0);
    });

    it('has slogans.list as non-empty array', () => {
        assert.ok(Array.isArray(CONFIG.slogans.list));
        assert.ok(CONFIG.slogans.list.length > 0);
    });

    it('has socialLinks.links as non-empty array', () => {
        assert.ok(Array.isArray(CONFIG.socialLinks.links));
        assert.ok(CONFIG.socialLinks.links.length > 0);
    });

    it('has wallpaper.apis as non-empty array', () => {
        assert.ok(Array.isArray(CONFIG.wallpaper.apis));
        assert.ok(CONFIG.wallpaper.apis.length > 0);
    });

    it('slogans.mode is random or sequence', () => {
        assert.ok(['random', 'sequence'].includes(CONFIG.slogans.mode));
    });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test`

Expected: All config-fields tests PASS (along with slogan-selector tests).

- [ ] **Step 3: Commit**

```bash
git add tests/config-fields.test.js
git commit -m "test: add config key fields smoke test"
```

---

### Task 6: Add build-output smoke test

**Files:**
- Create: `tests/build-output.test.js`

- [ ] **Step 1: Write the test**

Create `tests/build-output.test.js`:

```javascript
'use strict';
/* eslint-env node */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

describe('Build output', () => {
    before(() => {
        execSync('node build.js', { stdio: 'inherit', cwd: ROOT });
    });

    it('generates dist/index.html', () => {
        assert.ok(fs.existsSync(path.join(DIST, 'index.html')), 'dist/index.html should exist');
    });

    it('generates dist/config.js', () => {
        assert.ok(fs.existsSync(path.join(DIST, 'config.js')), 'dist/config.js should exist');
    });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test`

Expected: build runs, both dist files exist, all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/build-output.test.js
git commit -m "test: add build output smoke test"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: All tests pass (3 suites, ~8 assertions).

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: No errors.

- [ ] **Step 3: Run format check**

Run: `npm run format:check`

Expected: All files formatted correctly.

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: Build completes without error.