import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    FONT_SCALE_MIN,
    FONT_SCALE_MAX,
    FONT_SCALE_STEP,
    FONT_SCALE_DEFAULT,
    DEFAULT_LINE_HEIGHT,
    DEFAULT_WIDTH,
    clampFontScale,
    nextFontScale,
    normalizeLineHeight,
    normalizeWidth,
    normalizeSettings,
    readStoredSettings,
    persistSettings,
    readStoredFocusMode,
    persistFocusMode,
    READING_SETTINGS_STORAGE_KEY,
    FOCUS_MODE_STORAGE_KEY
} from '../src/lib/reading-settings';
import { translations } from '../src/data/i18n';

const articlePage = readFileSync(join(process.cwd(), 'src', 'pages', 'posts', '[...slug].astro'), 'utf8');
const articleCss = readFileSync(join(process.cwd(), 'src', 'styles', 'article.css'), 'utf8');
const readingControlsCss = readFileSync(join(process.cwd(), 'src', 'styles', 'reading-controls.css'), 'utf8');
const readingControlsComponent = readFileSync(join(process.cwd(), 'src', 'components', 'ReadingControls.vue'), 'utf8');
const tocCss = readFileSync(join(process.cwd(), 'src', 'styles', 'toc.css'), 'utf8');
const tocComponent = readFileSync(join(process.cwd(), 'src', 'components', 'ArticleToc.vue'), 'utf8');

describe('reading controls: font scale', () => {
    it('clamps any value into [min, max]', () => {
        expect(clampFontScale(0)).toBe(FONT_SCALE_MIN);
        expect(clampFontScale(-10)).toBe(FONT_SCALE_MIN);
        expect(clampFontScale(99)).toBe(FONT_SCALE_MAX);
        expect(clampFontScale(Number.NaN)).toBe(FONT_SCALE_DEFAULT);
        expect(clampFontScale(Number.POSITIVE_INFINITY)).toBe(FONT_SCALE_DEFAULT);
    });

    it('snaps to the configured step and stays clean at the edges', () => {
        expect(clampFontScale(0.87)).toBe(0.85);
        expect(clampFontScale(FONT_SCALE_MIN)).toBe(FONT_SCALE_MIN);
        expect(clampFontScale(FONT_SCALE_MAX)).toBe(FONT_SCALE_MAX);
        expect(FONT_SCALE_MIN).toBeGreaterThan(0);
        expect(FONT_SCALE_MAX).toBeGreaterThan(FONT_SCALE_MIN);
        expect(FONT_SCALE_STEP).toBeGreaterThan(0);
    });

    it('increments/decrements by one step and never leaves [min, max]', () => {
        expect(nextFontScale(1, 1)).toBe(1.05);
        expect(nextFontScale(1, -1)).toBe(0.95);
        expect(nextFontScale(FONT_SCALE_MAX, 1)).toBe(FONT_SCALE_MAX);
        expect(nextFontScale(FONT_SCALE_MIN, -1)).toBe(FONT_SCALE_MIN);
        expect(nextFontScale(Number.NaN, 1)).toBe(FONT_SCALE_DEFAULT + FONT_SCALE_STEP);
    });
});

describe('reading controls: line height and width normalization', () => {
    it('accepts only configured line-height levels, else falls back', () => {
        expect(normalizeLineHeight(1.6)).toBe(1.6);
        expect(normalizeLineHeight(1.8)).toBe(1.8);
        expect(normalizeLineHeight(2.0)).toBe(2.0);
        expect(normalizeLineHeight(1.5)).toBe(DEFAULT_LINE_HEIGHT);
        expect(normalizeLineHeight('junk')).toBe(DEFAULT_LINE_HEIGHT);
    });

    it('accepts only configured widths, else falls back', () => {
        expect(normalizeWidth(720)).toBe(720);
        expect(normalizeWidth(840)).toBe(840);
        expect(normalizeWidth(960)).toBe(960);
        expect(normalizeWidth(1000)).toBe(DEFAULT_WIDTH);
        expect(normalizeWidth(undefined)).toBe(DEFAULT_WIDTH);
    });

    it('normalizes a full settings object field by field', () => {
        expect(normalizeSettings(null)).toEqual({ fontScale: 1, lineHeight: 1.8, widthPx: 840 });
        expect(normalizeSettings({ fontScale: 3, lineHeight: 1.6, widthPx: 960 })).toEqual({
            fontScale: FONT_SCALE_MAX,
            lineHeight: 1.6,
            widthPx: 960
        });
    });
});

describe('reading controls: localStorage persistence (SSR-safe)', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('round-trips settings through localStorage', () => {
        expect(readStoredSettings()).toEqual({ fontScale: 1, lineHeight: 1.8, widthPx: 840 });
        const next = { fontScale: 1.1, lineHeight: 1.6, widthPx: 960 };
        persistSettings(next);
        expect(readStoredSettings()).toEqual(next);
        expect(localStorage.getItem(READING_SETTINGS_STORAGE_KEY)).toContain('"fontScale":1.1');
    });

    it('falls back to defaults on corrupt persisted JSON', () => {
        localStorage.setItem(READING_SETTINGS_STORAGE_KEY, '{not json');
        expect(readStoredSettings()).toEqual({ fontScale: 1, lineHeight: 1.8, widthPx: 840 });
    });

    it('clamps out-of-range persisted values on read', () => {
        persistSettings({ fontScale: 9, lineHeight: 1.1, widthPx: 10 });
        expect(readStoredSettings()).toEqual({ fontScale: FONT_SCALE_MAX, lineHeight: 1.8, widthPx: 840 });
    });

    it('persists and restores focus mode', () => {
        expect(readStoredFocusMode()).toBe(false);
        persistFocusMode(true);
        expect(localStorage.getItem(FOCUS_MODE_STORAGE_KEY)).toBe('true');
        expect(readStoredFocusMode()).toBe(true);
        persistFocusMode(false);
        expect(readStoredFocusMode()).toBe(false);
    });
});

describe('reading controls: wiring', () => {
    it('mounts the dock island on the article page only', () => {
        expect(articlePage).toContain('import ReadingControls');
        expect(articlePage).toContain('<ReadingControls client:idle />');
        expect(articlePage).toContain('<ArticleToc client:idle={{ timeout: 500 }} />');
    });

    it('drives .post-body font/line-height and .post-container width via CSS variables', () => {
        expect(articleCss).toContain('font-size: calc(1.0625rem * var(--article-font-scale, 1));');
        expect(articleCss).toContain('line-height: var(--article-line-height, 1.8);');
        expect(articleCss).toContain('max-width: min(var(--article-width, 840px), 100%);');
    });

    it('hides shell chrome in focus mode and widens the article column', () => {
        expect(readingControlsCss).toContain('html.is-focus-mode .top-bar');
        expect(readingControlsCss).toContain('html.is-focus-mode .hero-sticky');
        expect(readingControlsCss).toContain('html.is-focus-mode .page-footer');
        expect(readingControlsCss).toContain('html.is-focus-mode .post-container');
    });

    it('renders native buttons with aria labels, pressed state and focus-visible styles', () => {
        expect(readingControlsComponent).toContain('type="button"');
        expect(readingControlsComponent).toContain('aria-pressed');
        expect(readingControlsComponent).toContain(':aria-label=');
        expect(readingControlsComponent).toContain(':aria-expanded=');
        expect(readingControlsComponent).toContain('role="group"');
        expect(readingControlsCss).toContain('.article-dock__btn:focus-visible');
        expect(readingControlsCss).toContain('.article-dock__fab:focus-visible');
    });

    it('disables motion under prefers-reduced-motion', () => {
        expect(readingControlsCss).toContain('@media (prefers-reduced-motion: reduce)');
        expect(readingControlsCss).toContain('transition: none;');
    });

    it('owns back-to-top inside the dock and cleans up its scroll listener', () => {
        expect(readingControlsComponent).toContain('scrollToTop');
        expect(readingControlsComponent).toContain("addEventListener('scroll'");
        expect(readingControlsComponent).toContain("removeEventListener('scroll'");
        expect(readingControlsComponent).toContain('onUnmounted');
        // The whole dock (back-to-top + Aa) hides until the article starts.
        expect(readingControlsComponent).toContain('article-dock--hidden');
        // The standalone bottom-left back-to-top button is gone from the page.
        expect(articlePage).not.toContain('class="back-to-top"');
        expect(readingControlsComponent).toContain('scrollerEl.scrollTop <= 0');
    });

    it('reveals the dock and TOC capsule only after the article body is reached', () => {
        expect(readingControlsComponent).toContain('isArticleStarted');
        expect(tocComponent).toContain('ARTICLE_START_THRESHOLD');
        expect(tocComponent).toContain('capsuleVisible');
    });

    it('uses a soft shadow instead of the hard neo-brutalist offset shadow', () => {
        expect(readingControlsCss).toContain('--article-dock-shadow');
        expect(readingControlsCss).toContain('box-shadow: var(--article-dock-shadow)');
    });
});

describe('reading controls: dock consolidation', () => {
    it('stacks the TOC capsule above the article dock via shared tokens', () => {
        expect(readingControlsCss).toContain('--article-dock-height');
        expect(tocCss).toContain('--article-dock-height');
    });

    it('removes the redundant reading-progress % from the TOC capsule', () => {
        expect(tocComponent).not.toContain('capsule-progress');
        expect(tocCss).not.toContain('capsule-progress');
    });

    it('opens the Aa settings as a centered modal above the TOC (no overlap)', () => {
        expect(readingControlsComponent).toContain('<Teleport v-if="teleportReady" to="body">');
        expect(readingControlsComponent).toContain('aria-modal="true"');
        expect(readingControlsComponent).toContain('article-dock__overlay');
        expect(readingControlsCss).toContain('z-index: calc(var(--z-dock, 10000) + 20)');
    });

    it('gates the Teleport until mount so SSR and the first client render hydrate identically', () => {
        expect(readingControlsComponent).toContain('const teleportReady = ref(false);');
        expect(readingControlsComponent).toContain('teleportReady.value = true;');
        expect(readingControlsComponent).toContain('<Teleport v-if="teleportReady" to="body">');
    });
});

describe('reading controls: i18n coverage', () => {
    it('provides the new keys in zh-CN, en and ja', () => {
        const keys = [
            'article.reading.controls',
            'article.reading.fontSize',
            'article.reading.fontSize.decrease',
            'article.reading.fontSize.increase',
            'article.reading.lineHeight',
            'article.reading.lineHeight.compact',
            'article.reading.lineHeight.normal',
            'article.reading.lineHeight.loose',
            'article.reading.width',
            'article.reading.width.narrow',
            'article.reading.width.medium',
            'article.reading.width.wide',
            'article.reading.focus',
            'article.reading.focus.enable',
            'article.reading.focus.disable',
            'article.dock.backToTop'
        ];
        for (const locale of ['zh-CN', 'en', 'ja'] as const) {
            for (const key of keys) {
                expect(translations[locale][key], `${locale} missing ${key}`).toBeTruthy();
            }
        }
    });
});
