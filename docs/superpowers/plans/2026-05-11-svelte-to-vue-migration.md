# Svelte 5 → Vue 3 全量迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 WakuseiHomePage 从 Astro 6 + Svelte 5 完整迁移到 Astro 6 + Vue 3 (Composition API + Pinia + Vitest)

**Architecture:** 1:1 翻译所有 Svelte 组件为 Vue SFC，Svelte 5 runes 映射为 Vue 3 ref/computed/watchEffect，共享状态从 Svelte 模块级 $state 迁移到 Pinia stores，测试从 Node test runner 迁移到 Vitest。CSS 和数据层完全不动。

**Tech Stack:** Astro 6, Vue 3.5, Pinia 3, Vitest 3, @vue/test-utils 2, TypeScript

---

## 文件变更总览

### 新增文件（17 个）
- `src/pages/_app.ts` — Vue app 入口，注册 Pinia
- `vitest.config.ts` — Vitest 配置
- `src/stores/theme.ts` — 主题 Pinia store
- `src/stores/i18n.ts` — 国际化 Pinia store
- `src/stores/homepage.ts` — 首页状态 Pinia store
- `src/composables/useTheme.ts` — 主题 composable
- `src/composables/useI18n.ts` — 国际化 composable
- `src/composables/useHomepage.ts` — 首页检测 composable
- `src/composables/useWallpaper.ts` — 壁纸 composable
- `src/composables/useSlogan.ts` — 打字机 composable
- `src/composables/useTime.ts` — 时钟 composable
- `src/composables/useLogger.ts` — 日志 composable
- `src/composables/useDock.ts` — Dock 工具 composable
- `src/composables/useEffects.ts` — 效果 composable
- `src/components/*.vue` — 9 个 Vue SFC 组件

### 修改文件（7 个）
- `astro.config.mjs` — svelte() → vue()
- `package.json` — 依赖替换
- `.eslintrc.json` — svelte → vue plugin
- `.prettierrc` — svelte → vue plugin
- `tsconfig.json` — 添加 Vue 类型
- `src/env.d.ts` — 添加 .vue 模块声明
- `src/pages/*.astro`、`src/layouts/*.astro` — .svelte → .vue 引用

### 删除文件（12 个）
- `svelte.config.js`
- `src/components/*.svelte`（9 个）
- `src/lib/i18n.svelte.ts`
- `src/lib/theme.svelte.ts`
- `src/lib/homepage-context.ts`
- `src/lib/runtime-effects.ts`
- `src/lib/font-awesome.ts`

### 不变文件
- `src/data/`（customize.ts, site.ts, schema.ts, i18n.ts）
- `src/types/site.ts`
- `src/styles/`（全部 8 个 CSS）
- `src/lib/`（time.ts, slogan-selector.ts, wallpaper-scroller.ts, dock.ts, logger.ts）
- `public/`
- `src/content/blog/`

---

## Task 1: 基础设施 — 依赖和配置

**Files:**
- Modify: `package.json`
- Modify: `astro.config.mjs`
- Modify: `.eslintrc.json`
- Modify: `.prettierrc`
- Modify: `tsconfig.json`
- Modify: `src/env.d.ts`
- Create: `src/pages/_app.ts`
- Create: `vitest.config.ts`
- Delete: `svelte.config.js`

- [ ] **Step 1.1: 更新 package.json — 移除 Svelte 依赖，添加 Vue 依赖**

```jsonc
// package.json — 替换 dependencies 和 devDependencies 中的相关包
// 移除:
//   "@astrojs/svelte", "svelte" 从 dependencies
//   "eslint-plugin-svelte", "prettier-plugin-svelte" 从 devDependencies
// 新增:
//   dependencies: "@astrojs/vue": "^6.0.1", "vue": "^3.5.13", "pinia": "^3.0.2"
//   devDependencies: "vitest": "^3.1.1", "@vue/test-utils": "^2.4.6", "jsdom": "^26.1.0",
//                    "eslint-plugin-vue": "^10.1.0", "@vue/eslint-config-typescript": "^14.5.0"
// 修改 scripts:
//   "test": "vitest run"
```

- [ ] **Step 1.2: 运行 npm install**

Run: `npm install`
Expected: 成功安装所有依赖

- [ ] **Step 1.3: 更新 astro.config.mjs**

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
    site: 'https://www.wakusei.top',
    integrations: [
        vue({
            appEntrypoint: '/src/pages/_app',
            devtools: true
        })
    ],
    output: 'static',
    outDir: './dist',
    devToolbar: {
        enabled: false
    }
});
```

- [ ] **Step 1.4: 创建 src/pages/_app.ts**

```typescript
// src/pages/_app.ts
import type { App } from 'vue';
import { createPinia } from 'pinia';

const pinia = createPinia();

export default (app: App) => {
    app.use(pinia);
};
```

- [ ] **Step 1.5: 更新 .eslintrc.json**

```json
{
    "env": {
        "browser": true,
        "es2022": true,
        "node": true
    },
    "parser": "@typescript-eslint/parser",
    "plugins": ["@typescript-eslint"],
    "parserOptions": {
        "ecmaVersion": 2022,
        "sourceType": "module",
        "ecmaFeatures": {
            "jsx": true
        },
        "extraFileExtensions": [".vue"]
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:vue/vue3-recommended"
    ],
    "overrides": [
        {
            "files": ["*.vue"],
            "parser": "vue-eslint-parser",
            "parserOptions": {
                "parser": "@typescript-eslint/parser"
            },
            "rules": {
                "no-inner-declarations": "off",
                "prefer-const": "off",
                "no-undef": "off",
                "vue/multi-word-component-names": "off"
            }
        }
    ],
    "rules": {
        "no-undef": "off",
        "no-console": "off",
        "prefer-const": "warn",
        "no-var": "error",
        "eqeqeq": ["error", "always"],
        "no-trailing-spaces": "error",
        "no-multiple-empty-lines": ["error", { "max": 1 }],
        "semi": ["error", "always"],
        "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
    },
    "ignorePatterns": ["dist", "public", "node_modules"]
}
```

- [ ] **Step 1.6: 更新 .prettierrc**

```json
{
    "plugins": ["prettier-plugin-astro"],
    "semi": true,
    "singleQuote": true,
    "tabWidth": 4,
    "trailingComma": "none",
    "printWidth": 120,
    "htmlWhitespaceSensitivity": "ignore",
    "overrides": [
        {
            "files": ["*.css"],
            "options": {
                "tabWidth": 4
            }
        },
        {
            "files": ["*.astro"],
            "options": {
                "parser": "astro"
            }
        },
        {
            "files": ["*.vue"],
            "options": {
                "parser": "vue"
            }
        }
    ]
}
```

- [ ] **Step 1.7: 更新 tsconfig.json**

```json
{
    "extends": "astro/tsconfigs/strict",
    "compilerOptions": {
        "baseUrl": ".",
        "types": ["node"],
        "jsx": "preserve"
    },
    "include": [".astro/types.d.ts", "src/**/*", "tests/**/*.ts", "astro.config.mjs", "vitest.config.ts"]
}
```

- [ ] **Step 1.8: 更新 src/env.d.ts**

```typescript
/// <reference types="astro/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
    export default component;
}
```

- [ ] **Step 1.9: 创建 vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.test.ts']
    }
});
```

- [ ] **Step 1.10: 删除 svelte.config.js**

Run: `Remove-Item svelte.config.js`

- [ ] **Step 1.11: 验证构建不报错（预期：会报组件找不到，但配置本身无误）**

Run: `npm run build 2>&1 | Select-Object -First 20`
Expected: 报错信息中不包含配置相关错误，只有组件 import 错误

- [ ] **Step 1.12: Commit**

```bash
git add -A
git commit -m "chore: migrate infrastructure from Svelte to Vue (deps, configs, vitest)"
```

---

## Task 2: 创建 Pinia Stores

**Files:**
- Create: `src/stores/theme.ts`
- Create: `src/stores/i18n.ts`
- Create: `src/stores/homepage.ts`

- [ ] **Step 2.1: 创建 src/stores/theme.ts**

```typescript
// src/stores/theme.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getCurrentTheme, applyTheme, getStoredTheme } from '@/lib/i18n';

export const useThemeStore = defineStore('theme', () => {
    const isDark = ref(getCurrentTheme() === 'dark');
    let _mediaListenerAttached = false;

    function init() {
        const theme = getCurrentTheme();
        isDark.value = theme === 'dark';

        if (!_mediaListenerAttached && typeof window !== 'undefined') {
            _mediaListenerAttached = true;
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e: MediaQueryListEvent) => {
                if (!getStoredTheme()) {
                    const newTheme = e.matches ? 'dark' : 'light';
                    isDark.value = newTheme === 'dark';
                    applyTheme(newTheme);
                }
            });
        }
    }

    function toggle() {
        const newTheme = isDark.value ? 'light' : 'dark';
        isDark.value = newTheme === 'dark';
        const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown };
        if (typeof doc.startViewTransition === 'function') {
            doc.startViewTransition(() => applyTheme(newTheme));
        } else {
            applyTheme(newTheme);
        }
    }

    function syncFromStorage() {
        const theme = getCurrentTheme();
        isDark.value = theme === 'dark';
    }

    return { isDark, init, toggle, syncFromStorage };
});
```

- [ ] **Step 2.2: 创建 src/stores/i18n.ts**

```typescript
// src/stores/i18n.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Locale } from '@/data/i18n';
import { translations } from '@/data/i18n';
import { siteConfig } from '@/data/site';
import { getStoredLang, persistLang } from '@/lib/i18n';

export const useI18nStore = defineStore('i18n', () => {
    const locale = ref<Locale>(
        typeof document !== 'undefined'
            ? (getStoredLang(siteConfig.i18n) as Locale) || siteConfig.i18n.defaultLocale
            : siteConfig.i18n.defaultLocale
    );

    function t(key: string): string {
        const entry = translations[locale.value];
        if (entry && key in entry) return entry[key];
        const fallback = translations[siteConfig.i18n.defaultLocale];
        if (fallback && key in fallback) return fallback[key];
        return key;
    }

    function setLocale(newLocale: Locale) {
        locale.value = newLocale;
        persistLang(newLocale);
    }

    return { locale, t, setLocale };
});
```

- [ ] **Step 2.3: 创建 src/stores/homepage.ts**

```typescript
// src/stores/homepage.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

const HOMEPAGE_SCROLLER_SELECTOR = '.page-scroller';

export const useHomepageStore = defineStore('homepage', () => {
    const isReady = ref(false);
    const isHomePage = ref(false);

    function isHomePageDocument(root: ParentNode = document) {
        return root.querySelector(HOMEPAGE_SCROLLER_SELECTOR) !== null;
    }

    function setReady() {
        isReady.value = true;
        window.dispatchEvent(new CustomEvent('wakusei:homepage-ready'));
    }

    function checkHomePage() {
        isHomePage.value = isHomePageDocument();
    }

    function subscribeStateChange(callback: (isHome: boolean) => void) {
        const notify = () => {
            isHomePage.value = isHomePageDocument();
            callback(isHomePage.value);
        };

        notify();
        window.addEventListener('wakusei:homepage-mounted', notify);
        document.addEventListener('astro:after-swap', notify);

        return () => {
            window.removeEventListener('wakusei:homepage-mounted', notify);
            document.removeEventListener('astro:after-swap', notify);
        };
    }

    return { isReady, isHomePage, setReady, checkHomePage, subscribeStateChange };
});
```

- [ ] **Step 2.4: 验证 store 类型正确**

Run: `npx tsc --noEmit src/stores/*.ts 2>&1`
Expected: 无类型错误（可能有 module 找不到的警告，正常）

- [ ] **Step 2.5: Commit**

```bash
git add src/stores/
git commit -m "feat: create Pinia stores (theme, i18n, homepage)"
```

---

## Task 3: 创建 Composables

**Files:**
- Create: `src/composables/useTheme.ts`
- Create: `src/composables/useI18n.ts`
- Create: `src/composables/useHomepage.ts`
- Create: `src/composables/useLogger.ts`
- Create: `src/composables/useDock.ts`
- Create: `src/composables/useEffects.ts`
- Create: `src/composables/useTime.ts`
- Create: `src/composables/useSlogan.ts`
- Create: `src/composables/useWallpaper.ts`

- [ ] **Step 3.1: 创建 src/composables/useTheme.ts**

```typescript
// src/composables/useTheme.ts
import { useThemeStore } from '@/stores/theme';

export function useTheme() {
    const store = useThemeStore();
    store.init();
    return {
        isDark: store.isDark,
        toggle: () => store.toggle(),
        syncFromStorage: () => store.syncFromStorage()
    };
}
```

- [ ] **Step 3.2: 创建 src/composables/useI18n.ts**

```typescript
// src/composables/useI18n.ts
import { useI18nStore } from '@/stores/i18n';
import type { Locale } from '@/data/i18n';

export function useI18n() {
    const store = useI18nStore();
    return {
        locale: store.locale,
        t: (key: string) => store.t(key),
        setLocale: (lang: Locale) => store.setLocale(lang)
    };
}
```

- [ ] **Step 3.3: 创建 src/composables/useHomepage.ts**

```typescript
// src/composables/useHomepage.ts
import { useHomepageStore } from '@/stores/homepage';

export function useHomepage() {
    const store = useHomepageStore();
    return {
        isReady: store.isReady,
        isHomePage: store.isHomePage,
        setReady: () => store.setReady(),
        checkHomePage: () => store.checkHomePage(),
        subscribeStateChange: (cb: (isHome: boolean) => void) => store.subscribeStateChange(cb)
    };
}
```

- [ ] **Step 3.4: 创建 src/composables/useLogger.ts**

```typescript
// src/composables/useLogger.ts
import { createLogger } from '@/lib/logger';

export function useLogger(enabled: boolean) {
    return createLogger(enabled);
}
```

- [ ] **Step 3.5: 创建 src/composables/useDock.ts**

```typescript
// src/composables/useDock.ts
export { resolveDockLabel, resolveDockIcon, getDockItemActiveState, isDockLinkDisabled } from '@/lib/dock';
```

- [ ] **Step 3.6: 创建 src/composables/useEffects.ts**

```typescript
// src/composables/useEffects.ts
import { onUnmounted } from 'vue';
import { enableContentProtection, initScrollAnimations, initMobileStickyAvatar } from '@/lib/runtime-effects';

export function useEffects() {
    const cleanups: Array<() => void> = [];

    onUnmounted(() => {
        cleanups.forEach((fn) => fn());
        cleanups.length = 0;
    });

    function initContentProtection(enabled: boolean) {
        if (enabled) {
            cleanups.push(enableContentProtection(true));
        }
    }

    function initScrollReveal(delay: number, offset: number) {
        cleanups.push(initScrollAnimations(delay, offset));
    }

    function initMobileSticky(container: HTMLElement, avatarBox: HTMLElement) {
        cleanups.push(initMobileStickyAvatar(container, avatarBox));
    }

    return { initContentProtection, initScrollReveal, initMobileSticky };
}
```

- [ ] **Step 3.7: 创建 src/composables/useTime.ts**

```typescript
// src/composables/useTime.ts
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { formatDateParts, formatTimeString } from '@/lib/time';
import { useI18nStore } from '@/stores/i18n';
import type { TimeConfig } from '@/types/site';

export function useTime(config: TimeConfig) {
    const i18n = useI18nStore();
    const now = ref(new Date());
    let timer: ReturnType<typeof setInterval> | null = null;

    const timeString = computed(() => formatTimeString(now.value, config.format));
    const dateParts = computed(() => formatDateParts(now.value, i18n.locale));

    onMounted(() => {
        timer = setInterval(() => {
            now.value = new Date();
        }, config.updateInterval);
    });

    onUnmounted(() => {
        if (timer) clearInterval(timer);
    });

    return { now, timeString, dateParts };
}
```

- [ ] **Step 3.8: 创建 src/composables/useSlogan.ts**

```typescript
// src/composables/useSlogan.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { createSloganSelector } from '@/lib/slogan-selector';
import type { SlogansConfig } from '@/types/site';

export function useSlogan(config: SlogansConfig) {
    const text = ref('');
    const cursorDimmed = ref(false);
    const isIdle = ref(false);
    let frameId: number | undefined;
    let isActive = true;

    function schedule(delay: number, task: () => void) {
        const targetTime = performance.now() + delay;
        const tick = (now: number) => {
            if (!isActive) return;
            if (now >= targetTime) {
                frameId = undefined;
                task();
                return;
            }
            frameId = requestAnimationFrame(tick);
        };
        frameId = requestAnimationFrame(tick);
    }

    onMounted(() => {
        const selector = createSloganSelector(config.mode, config.list);

        const runCycle = () => {
            const next = selector.next().text;
            let charIndex = 0;

            const typeNext = () => {
                if (!isActive) return;
                if (charIndex < next.length) {
                    charIndex += 1;
                    text.value = next.slice(0, charIndex);
                    schedule(config.typeSpeed, typeNext);
                    return;
                }
                if (!config.loop) {
                    cursorDimmed.value = true;
                    isIdle.value = true;
                    return;
                }
                isIdle.value = true;
                schedule(config.pauseDuration, deleteNext);
            };

            const deleteNext = () => {
                if (!isActive) return;
                isIdle.value = false;
                if (charIndex > 0) {
                    charIndex -= 1;
                    text.value = next.slice(0, charIndex);
                    schedule(20, deleteNext);
                    return;
                }
                schedule(300, runCycle);
            };

            isIdle.value = false;
            typeNext();
        };

        runCycle();
    });

    onUnmounted(() => {
        isActive = false;
        if (frameId !== undefined) cancelAnimationFrame(frameId);
    });

    return { text, cursorDimmed, isIdle };
}
```

- [ ] **Step 3.9: 创建 src/composables/useWallpaper.ts**

```typescript
// src/composables/useWallpaper.ts
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { WallpaperScrollerController } from '@/lib/wallpaper-scroller';
import { useLogger } from './useLogger';
import type { WallpaperConfig, LoadingConfig } from '@/types/site';

export function useWallpaper(
    wallpaperConfig: WallpaperConfig,
    loadingConfig: LoadingConfig,
    isMobile: () => boolean
) {
    const logger = useLogger(true);
    const wallpaperRef = ref<HTMLDivElement | null>(null);
    const ready = ref(false);
    let controller: WallpaperScrollerController | null = null;

    function teardown() {
        if (controller) {
            controller.destroy();
            controller = null;
        }
    }

    function startLoading() {
        const el = wallpaperRef.value;
        if (!el) {
            logger.warn('Wallpaper ref not available');
            ready.value = true;
            return;
        }
        controller = new WallpaperScrollerController(wallpaperConfig, loadingConfig, {
            onReady: () => {
                logger.log('Wallpaper ready - showing homepage content');
                ready.value = true;
            }
        });
        controller.attach(el);
        controller.init();
    }

    onMounted(() => {
        watch(
            isMobile,
            (mobile) => {
                teardown();
                if (mobile) {
                    logger.log('Mobile layout detected - skipping wallpaper loading');
                    ready.value = true;
                } else {
                    logger.log('Desktop layout detected - starting wallpaper loading');
                    ready.value = false;
                    startLoading();
                }
            },
            { immediate: true }
        );
    });

    onUnmounted(() => {
        teardown();
    });

    return { wallpaperRef, ready };
}
```

- [ ] **Step 3.10: 验证 composable 类型**

Run: `npx tsc --noEmit src/composables/*.ts 2>&1`
Expected: 无类型错误

- [ ] **Step 3.11: Commit**

```bash
git add src/composables/
git commit -m "feat: create Vue composables (theme, i18n, homepage, logger, dock, effects, time, slogan, wallpaper)"
```

---

## Task 4: 迁移简单组件 — Icon, Footer, ClockPanel, TypewriterSlogan

**Files:**
- Create: `src/components/Icon.vue`
- Create: `src/components/Footer.vue`
- Create: `src/components/ClockPanel.vue`
- Create: `src/components/TypewriterSlogan.vue`

- [ ] **Step 4.1: 创建 src/components/Icon.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue';

type IconDefinition = {
    viewBox: string;
    path: string;
};

const icons: Record<string, IconDefinition> = {
    github: {
        viewBox: '0 0 512 512',
        path: 'M173.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM252.8 8c-138.7 0-244.8 105.3-244.8 244 0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1 100-33.2 167.8-128.1 167.8-239 0-138.7-112.5-244-251.2-244zM105.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9s4.3 3.3 5.6 2.3c1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z'
    },
    'bars-staggered': {
        viewBox: '0 0 512 512',
        path: 'M0 96C0 78.3 14.3 64 32 64l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 128C14.3 128 0 113.7 0 96zM64 256c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L96 288c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32L32 448c-17.7 0-32-14.3-32-32s14.3-32 32-32l384 0c17.7 0 32 14.3 32 32z'
    },
    envelope: {
        viewBox: '0 0 512 512',
        path: 'M48 64c-26.5 0-48 21.5-48 48 0 15.1 7.1 29.3 19.2 38.4l208 156c17.1 12.8 40.5 12.8 57.6 0l208-156c12.1-9.1 19.2-23.3 19.2-38.4 0-26.5-21.5-48-48-48L48 64zM0 196L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-188-198.4 148.8c-34.1 25.6-81.1 25.6-115.2 0L0 196z'
    },
    bilibili: {
        viewBox: '0 0 512 512',
        path: 'M488.6 104.1c16.7 18.1 24.4 39.7 23.3 65.7l0 202.4c-.4 26.4-9.2 48.1-26.5 65.1-17.2 17-39.1 25.9-65.5 26.7L92 464c-26.4-.8-48.2-9.8-65.3-27.2-17.1-17.4-26-40.3-26.7-68.6L0 169.8c.8-26 9.7-47.6 26.7-65.7 17.1-16.3 38.8-25.3 65.3-26.1l29.4 0-25.4-25.8c-5.7-5.7-8.6-13-8.6-21.8s2.9-16.1 8.6-21.8 13-8.6 21.9-8.6 16.1 2.9 21.9 8.6l73.3 69.4 88 0 74.5-69.4C381.7 2.9 389.2 0 398 0s16.1 2.9 21.9 8.6c5.7 5.7 8.6 13 8.6 21.8s-2.9 16.1-8.6 21.8L394.6 78 423.9 78c26.4 .8 48 9.8 64.7 26.1zm-38.8 69.7c-.4-9.6-3.7-17.4-10.7-23.5-5.2-6.1-14-9.4-22.7-9.8l-320.4 0c-9.6 .4-17.4 3.7-23.6 9.8-6.1 6.1-9.4 13.9-9.8 23.5l0 194.4c0 9.2 3.3 17 9.8 23.5s14.4 9.8 23.6 9.8l320.4 0c9.2 0 17-3.3 23.3-9.8s9.7-14.3 10.1-23.5l0-194.4zM185.5 216.5c6.3 6.3 9.7 14.1 10.1 23.2l0 33.3c-.4 9.2-3.7 16.9-9.8 23.2-6.2 6.3-14 9.5-23.6 9.5s-17.5-3.2-23.6-9.5-9.4-14-9.8-23.2l0-33.3c.4-9.1 3.8-16.9 10.1-23.2s13.2-9.6 23.3-10c9.2 .4 17 3.7 23.3 10zm191.5 0c6.3 6.3 9.7 14.1 10.1 23.2l0 33.3c-.4 9.2-3.7 16.9-9.8 23.2s-14 9.5-23.6 9.5-17.4-3.2-23.6-9.5c-7-6.3-9.4-14-9.7-23.2l0-33.3c.3-9.1 3.7-16.9 10-23.2s14.1-9.6 23.3-10c9.2 .4 17 3.7 23.3 10z'
    },
    blog: {
        viewBox: '0 0 512 512',
        path: 'M224 24c0-13.3 10.7-24 24-24 145.8 0 264 118.2 264 264 0 13.3-10.7 24-24 24s-24-10.7-24-24c0-119.3-96.7-216-216-216-13.3 0-24-10.7-24-24zM80 96c26.5 0 48 21.5 48 48l0 224c0 26.5 21.5 48 48 48s48-21.5 48-48-21.5-48-48-48c-8.8 0-16-7.2-16-16l0-64c0-8.8 7.2-16 16-16 79.5 0 144 64.5 144 144S255.5 512 176 512 32 447.5 32 368l0-224c0-26.5 21.5-48 48-48zm168 0c92.8 0 168 75.2 168 168 0 13.3-10.7 24-24 24s-24-10.7-24-24c0-66.3-53.7-120-120-120-13.3 0-24-10.7-24-24s10.7-24 24-24z'
    },
    'arrow-up-right-dots': {
        viewBox: '0 0 512 512',
        path: 'M96 32C78.3 32 64 46.3 64 64S78.3 96 96 96L114.7 96 9.4 201.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.3 160 160c0 17.7 14.3 32 32 32s32-14.3 32-32l0-96c0-17.7-14.3-32-32-32L96 32zM403.8 70.1a38.1 38.1 0 1 0 76.2 0 38.1 38.1 0 1 0 -76.2 0zM279.7 194.2a38.1 38.1 0 1 0 76.2 0 38.1 38.1 0 1 0 -76.2 0zm162.2-38.1a38.1 38.1 0 1 0 0 76.2 38.1 38.1 0 1 0 0-76.2zM156.2 317.8a38.1 38.1 0 1 0 76.2 0 38.1 38.1 0 1 0 -76.2 0zm161.6-38.1a38.1 38.1 0 1 0 0 76.2 38.1 38.1 0 1 0 0-76.2zm86.1 38.1a38.1 38.1 0 1 0 76.2 0 38.1 38.1 0 1 0 -76.2 0zM70.1 403.8a38.1 38.1 0 1 0 0 76.2 38.1 38.1 0 1 0 0-76.2zm86.1 38.1a38.1 38.1 0 1 0 76.2 0 38.1 38.1 0 1 0 -76.2 0zm161.6-38.1a38.1 38.1 0 1 0 0 76.2 38.1 38.1 0 1 0 0-76.2zm86.1 38.1a38.1 38.1 0 1 0 76.2 0 38.1 38.1 0 1 0 -76.2 0z'
    },
    flask: {
        viewBox: '0 0 448 512',
        path: 'M288 0L128 0C110.3 0 96 14.3 96 32s14.3 32 32 32L128 215.5 7.5 426.3C2.6 435 0 444.7 0 454.7 0 486.4 25.6 512 57.3 512l333.4 0c31.6 0 57.3-25.6 57.3-57.3 0-10-2.6-19.8-7.5-28.4L320 215.5 320 64c17.7 0 32-14.3 32-32S337.7 0 320 0L288 0zM192 215.5l0-151.5 64 0 0 151.5c0 11.1 2.9 22.1 8.4 31.8l41.6 72.7-164 0 41.6-72.7c5.5-9.7 8.4-20.6 8.4-31.8z'
    },
    moon: {
        viewBox: '0 0 512 512',
        path: 'M256 0C114.6 0 0 114.6 0 256S114.6 512 256 512c68.8 0 131.3-27.2 177.3-71.4 7.3-7 9.4-17.9 5.3-27.1s-13.7-14.9-23.8-14.1c-4.9 .4-9.8 .6-14.8 .6-101.6 0-184-82.4-184-184 0-72.1 41.5-134.6 102.1-164.8 9.1-4.5 14.3-14.3 13.1-24.4S322.6 8.5 312.7 6.3C294.4 2.2 275.4 0 256 0z'
    },
    sun: {
        viewBox: '0 0 576 512',
        path: 'M288-32c8.4 0 16.3 4.4 20.6 11.7L364.1 72.3 468.9 46c8.2-2 16.9 .4 22.8 6.3S500 67 498 75.1l-26.3 104.7 92.7 55.5c7.2 4.3 11.7 12.2 11.7 20.6s-4.4 16.3-11.7 20.6L471.7 332.1 498 436.8c2 8.2-.4 16.9-6.3 22.8S477 468 468.9 466l-104.7-26.3-55.5 92.7c-4.3 7.2-12.2 11.7-20.6 11.7s-16.3-4.4-20.6-11.7L211.9 439.7 107.2 466c-8.2 2-16.8-.4-22.8-6.3S76 445 78 436.8l26.2-104.7-92.6-55.5C4.4 272.2 0 264.4 0 256s4.4-16.3 11.7-20.6L104.3 179.9 78 75.1c-2-8.2 .3-16.8 6.3-22.8S99 44 107.2 46l104.7 26.2 55.5-92.6 1.8-2.6c4.5-5.7 11.4-9.1 18.8-9.1zm0 144a144 144 0 1 0 0 288 144 144 0 1 0 0-288zm0 240a96 96 0 1 1 0-192 96 96 0 1 1 0 192z'
    },
    globe: {
        viewBox: '0 0 512 512',
        path: 'M351.9 280l-190.9 0c2.9 64.5 17.2 123.9 37.5 167.4 11.4 24.5 23.7 41.8 35.1 52.4 11.2 10.5 18.9 12.2 22.9 12.2s11.7-1.7 22.9-12.2c11.4-10.6 23.7-28 35.1-52.4 20.3-43.5 34.6-102.9 37.5-167.4zM160.9 232l190.9 0C349 167.5 334.7 108.1 314.4 64.6 303 40.2 290.7 22.8 279.3 12.2 268.1 1.7 260.4 0 256.4 0s-11.7 1.7-22.9 12.2c-11.4 10.6-23.7 28-35.1 52.4-20.3 43.5-34.6 102.9-37.5 167.4zm-48 0C116.4 146.4 138.5 66.9 170.8 14.7 78.7 47.3 10.9 131.2 1.5 232l111.4 0zM1.5 280c9.4 100.8 77.2 184.7 169.3 217.3-32.3-52.2-54.4-131.7-57.9-217.3L1.5 280zm398.4 0c-3.5 85.6-25.6 165.1-57.9 217.3 92.1-32.7 159.9-116.5 169.3-217.3l-111.4 0zm111.4-48C501.9 131.2 434.1 47.3 342 14.7 374.3 66.9 396.4 146.4 399.9 232l111.4 0z'
    },
    gear: {
        viewBox: '0 0 512 512',
        path: 'M195.1 9.5C198.1-5.3 211.2-16 226.4-16l59.8 0c15.2 0 28.3 10.7 31.3 25.5L332 79.5c14.1 6 27.3 13.7 39.3 22.8l67.8-22.5c14.4-4.8 30.2 1.2 37.8 14.4l29.9 51.8c7.6 13.2 4.9 29.8-6.5 39.9L447 233.3c.9 7.4 1.3 15 1.3 22.7s-.5 15.3-1.3 22.7l53.4 47.5c11.4 10.1 14 26.8 6.5 39.9l-29.9 51.8c-7.6 13.1-23.4 19.2-37.8 14.4l-67.8-22.5c-12.1 9.1-25.3 16.7-39.3 22.8l-14.4 69.9c-3.1 14.9-16.2 25.5-31.3 25.5l-59.8 0c-15.2 0-28.3-10.7-31.3-25.5l-14.4-69.9c-14.1-6-27.2-13.7-39.3-22.8L73.5 432.3c-14.4 4.8-30.2-1.2-37.8-14.4L5.8 366.1c-7.6-13.2-4.9-29.8 6.5-39.9l53.4-47.5c-.9-7.4-1.3-15-1.3-22.7s.5-15.3 1.3-22.7L12.3 185.8c-11.4-10.1-14-26.8-6.5-39.9L35.7 94.1c7.6-13.2 23.4-19.2 37.8-14.4l67.8 22.5c12.1-9.1 25.3-16.7 39.3-22.8L195.1 9.5zM256.3 336a80 80 0 1 0 -.6-160 80 80 0 1 0 .6 160z'
    },
    'chevron-down': {
        viewBox: '0 0 448 512',
        path: 'M201.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 338.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z'
    },
    check: {
        viewBox: '0 0 448 512',
        path: 'M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z'
    }
};

const props = withDefaults(defineProps<{
    name: string;
    class?: string;
    title?: string;
    size?: string;
}>(), {
    class: '',
    title: undefined,
    size: '1em'
});

function resolveIconName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const iconClass = [...parts].reverse().find((part) => {
        return part.startsWith('fa-') && !['fa-solid', 'fa-regular', 'fa-brands'].includes(part);
    });
    return (iconClass ?? name).replace(/^fa-/, '');
}

const definition = computed(() => icons[resolveIconName(props.name)]);
</script>

<template>
    <svg
        v-if="definition"
        :class="props.class ? `svg-icon ${props.class}` : 'svg-icon'"
        :viewBox="definition.viewBox"
        :width="props.size"
        :height="props.size"
        :role="props.title ? 'img' : undefined"
        :aria-hidden="props.title ? undefined : 'true'"
        style="display: inline-block; flex-shrink: 0; pointer-events: none; vertical-align: -0.125em"
    >
        <title v-if="props.title">{{ props.title }}</title>
        <path fill="currentColor" :d="definition.path" />
    </svg>
</template>
```

- [ ] **Step 4.2: 创建 src/components/Footer.vue**

```vue
<script setup lang="ts">
import Icon from './Icon.vue';
import type { FooterLink, SocialLink } from '../types/site';

defineProps<{
    links: FooterLink[];
    socialLinks: SocialLink[];
    copyrightText: string;
}>();
</script>

<template>
    <footer class="site-footer">
        <div class="footer-main">
            <div class="footer-links-section">
                <h3 class="footer-section-title">Links</h3>
                <ul class="footer-links">
                    <li v-for="link in links" :key="link.href">
                        <a :href="link.href" target="_blank" rel="noopener noreferrer">{{ link.name }}</a>
                    </li>
                </ul>
            </div>

            <div class="footer-socials">
                <h3 class="footer-section-title">Socials</h3>
                <div class="footer-social-icons">
                    <a
                        v-for="link in socialLinks"
                        :key="link.url"
                        :href="link.url"
                        class="footer-social-icon"
                        :aria-label="link.name"
                        target="_blank"
                        rel="noopener noreferrer"
                        :title="link.name"
                    >
                        <Icon v-if="link.icon" :name="link.icon" size="1.25rem" />
                        <template v-else>{{ link.name.charAt(0) }}</template>
                    </a>
                </div>
            </div>
        </div>

        <div class="footer-divider"></div>

        <div class="footer-bottom">
            <span class="footer-copyright">{{ copyrightText }}</span>
            <span class="footer-tagline">Stay hydrated</span>
        </div>
    </footer>
</template>
```

- [ ] **Step 4.3: 创建 src/components/ClockPanel.vue**

```vue
<script setup lang="ts">
import { useTime } from '../composables/useTime';
import type { TimeConfig } from '../types/site';

const props = defineProps<{
    config: TimeConfig;
}>();

const { timeString, dateParts } = useTime(props.config);
</script>

<template>
    <div class="clock">{{ timeString }}</div>
    <div v-if="config.showWeekday" class="weekday">{{ dateParts.weekday }}</div>
    <div v-if="config.showDate && dateParts.dateDisplay" class="date-display">{{ dateParts.dateDisplay }}</div>
</template>
```

- [ ] **Step 4.4: 创建 src/components/TypewriterSlogan.vue**

```vue
<script setup lang="ts">
import { useSlogan } from '../composables/useSlogan';
import type { CursorStyle, SlogansConfig } from '../types/site';

const props = defineProps<{
    config: SlogansConfig;
    cursorStyle: CursorStyle;
}>();

const { text, cursorDimmed, isIdle } = useSlogan(props.config);
</script>

<template>
    <p class="bio">
        <span class="typewriter-text">{{ text }}</span>
        <span
            class="typewriter-cursor"
            :class="{ 'cursor-idle': isIdle }"
            :style="{ opacity: cursorDimmed ? '0.5' : '1' }"
        >
            {{ cursorStyle === 'line' ? '|' : '█' }}
        </span>
    </p>
</template>
```

- [ ] **Step 4.5: 验证组件类型**

Run: `npx tsc --noEmit 2>&1 | Select-String "components/(Icon|Footer|ClockPanel|TypewriterSlogan)" | Select-Object -First 10`
Expected: 无错误

- [ ] **Step 4.6: Commit**

```bash
git add src/components/Icon.vue src/components/Footer.vue src/components/ClockPanel.vue src/components/TypewriterSlogan.vue
git commit -m "feat: migrate simple components to Vue (Icon, Footer, ClockPanel, TypewriterSlogan)"
```

---

## Task 5: 迁移核心组件 — SocialLinks, MobileDockSidebar, TopBar

**Files:**
- Create: `src/components/SocialLinks.vue`
- Create: `src/components/MobileDockSidebar.vue`
- Create: `src/components/TopBar.vue`

- [ ] **Step 5.1: 创建 src/components/SocialLinks.vue**

从 `src/components/SocialLinks.svelte` 翻译。关键映射：
- `$state` → `ref()`
- `$derived` / `$derived.by` → `computed()`
- `onMount` → `onMounted()`
- `bind:this` → `ref()` + template `ref`
- `onpointerenter` → `@pointerenter`
- `class:foo={expr}` → `:class="{ foo: expr }"`
- `{#each ... as item}` → `v-for="item in ..."`
- `{#if ...}` → `v-if`

完整代码参照 Svelte 源码翻译，保持所有交互逻辑（分页、pointer 悬停、swipe/wheel 导航）不变。

- [ ] **Step 5.2: 创建 src/components/MobileDockSidebar.vue**

从 `src/components/MobileDockSidebar.svelte` 翻译。关键映射：
- `$effect` → `watch()` 或 `watchEffect()`
- `$state` → `ref()`
- `$derived` → `computed()`
- `class:expanded={active}` → `:class="{ expanded: active }"`
- `data-open={open ? '' : undefined}` → `:data-open="open ? '' : undefined"`
- `onclick={() => ...}` → `@click="..."`

- [ ] **Step 5.3: 创建 src/components/TopBar.vue**

从 `src/components/TopBar.svelte` 翻译。这是最复杂的组件，关键映射：
- 所有 `$state` → `ref()`
- 所有 `$derived.by` → `computed()`
- `$effect` → `watch()` 或 `watchEffect()`
- `onMount` → `onMounted()`
- `bind:this` → template ref
- `style={barStyle}` → `:style="barStyle"`
- `class:active` → `:class="{ active: ... }"`
- Icon magnify hover 逻辑完整保留

- [ ] **Step 5.4: 验证组件类型**

Run: `npx tsc --noEmit 2>&1 | Select-String "components/(SocialLinks|MobileDockSidebar|TopBar)" | Select-Object -First 10`
Expected: 无错误

- [ ] **Step 5.5: Commit**

```bash
git add src/components/SocialLinks.vue src/components/MobileDockSidebar.vue src/components/TopBar.vue
git commit -m "feat: migrate core components to Vue (SocialLinks, MobileDockSidebar, TopBar)"
```

---

## Task 6: 迁移顶层组件 — SiteShell, HomepageApp

**Files:**
- Create: `src/components/SiteShell.vue`
- Create: `src/components/HomepageApp.vue`

- [ ] **Step 6.1: 创建 src/components/SiteShell.vue**

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { siteConfig } from '../data/site';
import { useHomepage } from '../composables/useHomepage';
import Footer from './Footer.vue';
import MobileDockSidebar from './MobileDockSidebar.vue';
import TopBar from './TopBar.vue';

const props = defineProps<{
    initialIsHomePage: boolean;
}>();

const homepage = useHomepage();
const isHomePage = ref(props.initialIsHomePage);
let cleanup: (() => void) | undefined;

onMounted(() => {
    cleanup = homepage.subscribeStateChange((next) => {
        isHomePage.value = next;
    });
});

onUnmounted(() => {
    cleanup?.();
});
</script>

<template>
    <div class="noise-overlay"></div>
    <TopBar :initial-is-home-page="isHomePage" />
    <Footer
        v-if="!isHomePage"
        :links="siteConfig.footer.links"
        :social-links="siteConfig.socialLinks.links"
        :copyright-text="siteConfig.footer.text"
    />
    <MobileDockSidebar />
</template>
```

- [ ] **Step 6.2: 创建 src/components/HomepageApp.vue**

从 `src/components/HomepageApp.svelte` 翻译。关键逻辑：
- 壁纸加载 → `useWallpaper()`
- 内容保护/滚动动画/移动端头像 → `useEffects()`
- 3D 视差 scroll progress → `ref()` + `computed()`
- `splitLatinText()` 函数保持不变
- `heroStyle` → `computed()`
- `$effect(() => { container.classList.toggle('visible', ready) })` → `watch(ready, ...)`

- [ ] **Step 6.3: 验证类型**

Run: `npx tsc --noEmit 2>&1 | Select-String "components/(SiteShell|HomepageApp)" | Select-Object -First 10`
Expected: 无错误

- [ ] **Step 6.4: Commit**

```bash
git add src/components/SiteShell.vue src/components/HomepageApp.vue
git commit -m "feat: migrate top-level components to Vue (SiteShell, HomepageApp)"
```

---

## Task 7: 更新 Astro 页面和布局

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/404.astro`
- Modify: `src/pages/posts/index.astro`
- Modify: `src/pages/posts/[...slug].astro`

- [ ] **Step 7.1: 更新 src/pages/index.astro**

```astro
---
import HomepageApp from '../components/HomepageApp.vue';
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout>
    <HomepageApp client:load />
</BaseLayout>
```

- [ ] **Step 7.2: 更新 src/layouts/BaseLayout.astro**

将第 12 行的 `import SiteShell from '../components/SiteShell.svelte'` 改为：
```astro
import SiteShell from '../components/SiteShell.vue';
```

其余不变（CSS imports、ClientRouter、loading overlay、inline scripts 全部保持原样）。

- [ ] **Step 7.3: 验证 404.astro 和 posts/ 不需要改动**

`404.astro` 没有引用任何 Svelte 组件，不需要改动。
`posts/index.astro` 和 `posts/[...slug].astro` 只使用 BaseLayout，不需要改动。

- [ ] **Step 7.4: 验证构建**

Run: `npm run build 2>&1`
Expected: 构建成功，输出到 dist/

- [ ] **Step 7.5: Commit**

```bash
git add src/pages/ src/layouts/
git commit -m "feat: update Astro pages/layouts to import Vue components"
```

---

## Task 8: 迁移测试到 Vitest

**Files:**
- Modify: `tests/*.test.ts`（18 个文件）

- [ ] **Step 8.1: 更新测试 import 语法**

所有测试文件中：
- `import { describe, it, test } from 'node:test'` → 删除（Vitest globals）
- `import assert from 'node:assert/strict'` → `import { describe, it, expect } from 'vitest'`
- `assert.strictEqual(a, b)` → `expect(a).toBe(b)`
- `assert.deepStrictEqual(a, b)` → `expect(a).toEqual(b)`
- `assert.ok(a)` → `expect(a).toBeTruthy()`
- `assert.throws(fn)` → `expect(fn).toThrow()`
- `assert.doesNotThrow(fn)` → `expect(fn).not.toThrow()`

- [ ] **Step 8.2: 迁移纯逻辑测试（无需 DOM）**

这些测试只需更新 import 和断言语法：
- `tests/site-config.test.ts` — Zod schema 校验
- `tests/slogan-selector.test.ts` — 打字机选择器
- `tests/time-format.test.ts` — 时间格式化
- `tests/time-i18n.test.ts` — 时间 i18n
- `tests/i18n-config.test.ts` — i18n 配置结构
- `tests/i18n-data.test.ts` — 翻译数据完整性
- `tests/i18n-runtime.test.ts` — 运行时 i18n（需改用 Pinia store）
- `tests/dock.test.ts` — Dock 工具函数
- `tests/wallpaper-scroller.test.ts` — 壁纸控制器
- `tests/wallpaper-full-bleed.test.ts` — 壁纸显示
- `tests/logic-guardrails.test.ts` — 逻辑不变量
- `tests/font-awesome.test.ts` — 可能需要删除或重写（font-awesome 已废弃）

- [ ] **Step 8.3: 迁移组件/样式测试（需要 DOM）**

这些测试需要 `@vue/test-utils` 的 `mount`：
- `tests/social-link-component.test.ts` — 用 `mount(SocialLinks, ...)` 测试
- `tests/social-link-styles.test.ts` — 用 jsdom 测试 CSS 类
- `tests/dock-styles.test.ts` — 用 jsdom 测试 CSS 类
- `tests/topbar-component.test.ts` — 用 `mount(TopBar, ...)` 测试
- `tests/loading-overlay-navigation.test.ts` — 测试 loading overlay 行为
- `tests/homepage-footer-styles.test.ts` — 测试 footer 样式

- [ ] **Step 8.4: 运行所有测试**

Run: `npm test 2>&1`
Expected: 所有测试通过

- [ ] **Step 8.5: Commit**

```bash
git add tests/
git commit -m "feat: migrate all tests from Node test runner to Vitest"
```

---

## Task 9: 清理 — 删除 Svelte 文件和更新文档

**Files:**
- Delete: `src/components/*.svelte`（9 个）
- Delete: `src/lib/i18n.svelte.ts`
- Delete: `src/lib/theme.svelte.ts`
- Delete: `src/lib/homepage-context.ts`
- Delete: `src/lib/runtime-effects.ts`
- Delete: `src/lib/font-awesome.ts`
- Modify: `AGENTS.md`

- [ ] **Step 9.1: 删除所有 .svelte 组件文件**

```powershell
Remove-Item src/components/Icon.svelte
Remove-Item src/components/Footer.svelte
Remove-Item src/components/ClockPanel.svelte
Remove-Item src/components/TypewriterSlogan.svelte
Remove-Item src/components/SocialLinks.svelte
Remove-Item src/components/MobileDockSidebar.svelte
Remove-Item src/components/TopBar.svelte
Remove-Item src/components/SiteShell.svelte
Remove-Item src/components/HomepageApp.svelte
```

- [ ] **Step 9.2: 删除已替换的 Svelte lib 文件**

```powershell
Remove-Item src/lib/i18n.svelte.ts
Remove-Item src/lib/theme.svelte.ts
Remove-Item src/lib/homepage-context.ts
Remove-Item src/lib/runtime-effects.ts
Remove-Item src/lib/font-awesome.ts
```

- [ ] **Step 9.3: 更新 AGENTS.md**

将所有 Svelte 引用更新为 Vue 引用（参考设计文档中的描述）。

- [ ] **Step 9.4: Commit**

```bash
git add -A
git commit -m "chore: remove Svelte files, update AGENTS.md for Vue"
```

---

## Task 10: 最终验证

- [ ] **Step 10.1: 运行 lint**

Run: `npm run lint 2>&1`
Expected: 无错误（可能有 warning）

- [ ] **Step 10.2: 运行 format check**

Run: `npm run format:check 2>&1`
Expected: 所有文件格式正确

- [ ] **Step 10.3: 运行测试**

Run: `npm test 2>&1`
Expected: 所有测试通过

- [ ] **Step 10.4: 运行 astro check**

Run: `npm run check 2>&1`
Expected: 无类型错误

- [ ] **Step 10.5: 运行构建**

Run: `npm run build 2>&1`
Expected: 构建成功，输出到 dist/

- [ ] **Step 10.6: 本地预览**

Run: `npm run serve`
Expected: 浏览器打开 http://localhost:3000，首页正常显示，所有交互功能正常

- [ ] **Step 10.7: 验证清单**

- [ ] 首页壁纸加载正常
- [ ] 打字机动画正常
- [ ] 时钟显示正常
- [ ] 社交链接悬停效果正常
- [ ] 主题切换正常（包括 View Transition）
- [ ] 语言切换正常（zh-CN/en/ja）
- [ ] 移动端侧边栏正常
- [ ] TopBar 滚动展开正常
- [ ] 博客页面正常
- [ ] 404 页面正常
- [ ] 页面过渡（swup）正常
- [ ] Loading overlay 正常

- [ ] **Step 10.8: Final Commit**

```bash
git add -A
git commit -m "chore: complete Svelte to Vue migration, all checks pass"
```
