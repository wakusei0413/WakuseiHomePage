# Browser Compatibility Design — WakuseiHomePage

**Approach**: Manual ES5 rewrite + polyfill injection + CSS graceful degradation (Scheme A)

**Target browsers**: IE11, Edge Legacy (EdgeHTML), Firefox 52+, Chrome 55+

**Strategy**: Elegant degradation — older browsers get functional pages with reasonable static fallbacks where CSS features cannot be perfectly replicated.

---

## 1. Polyfill Layer — `js/polyfills.js`

New file loaded in `<head>` after `config.js`, before all business scripts.

| Polyfill                      | For                                              | Size (approx) |
| ----------------------------- | ------------------------------------------------ | ------------- |
| `Promise`                     | wallpaper.js (`new Promise`, `Promise.all`)      | ~3KB          |
| `String.prototype.padStart`   | time.js (time formatting)                        | ~0.3KB        |
| `String.prototype.startsWith` | social.js (link detection)                       | ~0.2KB        |
| `IntersectionObserver`        | wallpaper.js, main.js (lazy load, scroll reveal) | ~5KB          |
| `NodeList.prototype.forEach`  | IE11 NodeList iteration                          | ~0.2KB        |

All polyfills use feature detection: only inject when the API is missing. No impact on modern browsers.

`Promise` polyfill uses a minimal inline implementation (no external npm dependency). `IntersectionObserver` uses the W3C polyfill inlined and minified.

### Load order in `index.html`

```html
<script src="config.js"></script>
<script src="js/polyfills.js"></script>
<!-- NEW -->
<script src="js/logger.js"></script>
<script src="js/utils.js"></script>
<script src="js/typewriter.js"></script>
<script src="js/time.js"></script>
<script src="js/social.js"></script>
<script src="js/wallpaper.js"></script>
<script src="js/main.js"></script>
```

### Additional `<meta>` tag

```html
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
```

---

## 2. JS Rewrite — `js/wallpaper.js`

The most heavily modern file. Rewrite all ES6+ syntax to ES5 while preserving identical business logic.

### Syntax mapping

| Modern                         | ES5 Replacement                                                          |
| ------------------------------ | ------------------------------------------------------------------------ |
| `class WallpaperScroller`      | Constructor function + `WallpaperScroller.prototype.method = function()` |
| Arrow functions `() => {}`     | `function() {}` with `var self = this` for `this` binding                |
| `const` / `let`                | `var`                                                                    |
| Template literals `` `${x}` `` | String concatenation `'' + x`                                            |
| `async/await`                  | Promise chains (`.then()/.catch()`)                                      |
| `classList.toggle(cls, force)` | `if (force) { el.classList.add(cls) } else { el.classList.remove(cls) }` |

### async/await rewrite strategy

- `async _loadRace(urls)` → Returns a `new Promise`, internal logic uses `.then()` chains
- `async _loadImage(url)` → Wraps image loading in `new Promise(function(resolve, reject) {...})`
- Promise rejection handling uses `.catch()` instead of try/catch

### `this` binding strategy

Use `var self = this` at the top of each method that needs it. Replace all `this` references inside nested functions (closures, callbacks) with `self`.

---

## 3. JS Rewrite — `js/main.js`

Two targeted changes:

### 3.1 `scrollTo` with options object (line 135)

```js
// Before:
window.scrollTo({ top: 0, behavior: 'smooth' });

// After:
if (typeof window.scrollTo === 'function' && 'behavior' in document.documentElement.style) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
} else {
    window.scrollTo(0, 0);
}
```

### 3.2 `classList.toggle` two-argument form (line 128)

```js
// Before:
avatarBox.classList.toggle('scrolled', scrolled);

// After:
if (scrolled) {
    avatarBox.classList.add('scrolled');
} else {
    avatarBox.classList.remove('scrolled');
}
```

### 3.3 Additional IntersectionObserver guard

Wrap `new IntersectionObserver(...)` in a feature check, provide a no-op fallback or direct execution for browsers where the polyfill also cannot work (extremely old browsers without MutationObserver).

---

## 4. CSS Graceful Degradation — `css/style.css`

### 4.1 CSS Custom Properties — fallback values

For every `var(--x)` usage, add a fallback value as the second argument:

```css
/* Pattern: */
property: <static-fallback-value>;
property: var(--variable-name, <static-fallback-value>);
```

IE11 ignores `var()` entirely and uses the preceding declaration. Modern browsers override with the variable value.

All `:root` custom properties need their computed default values documented as fallbacks.

### 4.2 `clamp()` — static fallback

```css
font-size: 2.2rem;
font-size: clamp(1.5rem, 4vw, 2.2rem);
```

IE11 and old browsers ignore `clamp()` and use the preceding `2.2rem`.

### 4.3 `inset` — expand to four properties

```css
/* Before: */
inset: 0;

/* After: */
top: 0;
right: 0;
bottom: 0;
left: 0;
inset: 0;
```

```css
/* Before: */
inset: -15px;

/* After: */
top: -15px;
right: -15px;
bottom: -15px;
left: -15px;
inset: -15px;
```

### 4.4 `backdrop-filter` — solid background fallback

```css
.info-panel {
    background: rgba(30, 30, 46, 0.95);
}

@supports (backdrop-filter: blur(1px)) {
    .info-panel {
        background: var(--panel-bg);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
    }
}
```

### 4.5 CSS Grid — Flexbox fallback for `.social-links`

```css
.social-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--social-gap, 12px);
}

@supports (display: grid) {
    .social-links {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    }
}

.social-link {
    flex: 0 0 calc(120px + 12px);
    max-width: calc(120px + 12px);
}

@supports (display: grid) {
    .social-link {
        flex: none;
        max-width: none;
    }
}
```

### 4.6 `object-fit: cover` — JS detection + fallback

For IE11, detect `object-fit` support and fall back to using `background-size: cover` on a container:

```js
// In main.js or social.js init:
if (!('objectFit' in document.documentElement.style)) {
    // Add a class to body for CSS targeting
    document.body.className += ' no-object-fit';
}
```

```css
.no-object-fit .avatar-image {
    display: none;
}
.no-object-fit .avatar-box {
    background-image: var(--avatar-url);
    background-size: cover;
    background-position: center;
}
```

### 4.7 `position: sticky` — already graceful

IE11 falls back to `position: relative`, which is acceptable for the mobile avatar use case. No change needed.

### 4.8 `contain` property — already graceful

`contain` is a performance hint. Unsupported browsers simply ignore it. No change needed.

### 4.9 `prefers-reduced-motion` — already graceful

Unsupported browsers ignore the media query entirely. Animations play normally. No change needed.

---

## 5. `index.html` Updates

1. Add `<meta http-equiv="X-UA-Compatible" content="IE=edge">` in `<head>`
2. Add `<script src="js/polyfills.js"></script>` after `config.js`, before business scripts
3. No conditional comments (IE11 dropped support for `<!--[if IE]>`)

---

## 6. Build Pipeline — `build.js`

Update the `terser` configuration for `wallpaper.js` to target ES5 output:

```js
terser.minify(code, {
    compress: { ecma: 5 },
    output: { ecma: 5 }
});
```

This is consistent — the source is ES5, the output should also be ES5.

No other build pipeline changes needed. No Babel, no PostCSS plugins added.

---

## 7. Verification Plan

1. `npm run lint` — ensure rewritten JS passes ESLint with `sourceType: "script"`
2. `npm run format:check` — ensure Prettier compliance
3. `npm run build` — ensure dist builds without errors
4. Manual browser testing in IE11, Edge Legacy, Firefox 52, Chrome 55 (or nearest available versions via BrowserStack or VMs)
5. Visual regression check: compare screenshots in modern browser before/after changes

---

## Scope Exclusions

- No new npm dependencies (polyfills are self-contained inline)
- No Babel integration
- No PostCSS plugin integration
- No automated test framework (none exists in repo)
- External wallpaper API failures in restricted networks are out of scope
